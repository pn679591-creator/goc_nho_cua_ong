// Lớp truy cập dữ liệu Firestore dùng chung. Tên collection và tên field
// giữ ổn định vì có thể đã có dữ liệu người chơi thật.
import { db, fbStore } from './firebase.js';
import { getCurrentUser, isOwner } from './auth.js';
import { DEFAULT_ECONOMY } from '../config/economy.js';
import { GAME_BALANCE } from '../config/game-balance.js';

const {
  doc, getDoc, setDoc, updateDoc, deleteDoc, onSnapshot,
  collection, query, where, orderBy, limit, getDocs,
  runTransaction, writeBatch, serverTimestamp, increment,
  Timestamp,
} = fbStore;

export { doc, collection, query, where, orderBy, limit, getDocs, serverTimestamp, increment };

// ---------- Cấu hình cân bằng (settings/balance), có cache + realtime ----------
let balanceCache = null;
let balanceListenerStarted = false;
const balanceSubscribers = new Set();

function startBalanceListener() {
  if (balanceListenerStarted) return;
  balanceListenerStarted = true;
  onSnapshot(doc(db, 'settings', 'balance'), (snap) => {
    balanceCache = snap.exists() ? snap.data() : {};
    for (const fn of balanceSubscribers) fn(balanceCache);
  }, () => {
    balanceCache = balanceCache || {};
  });
}

export function onBalanceChange(fn) {
  startBalanceListener();
  if (balanceCache) fn(balanceCache);
  balanceSubscribers.add(fn);
  return () => balanceSubscribers.delete(fn);
}

export function getEconomySettings() {
  const overrides = balanceCache?.economy || {};
  return deepMerge(DEFAULT_ECONOMY, overrides);
}

export function getGameBalanceSettings(gameId) {
  const overrides = balanceCache?.games?.[gameId] || {};
  return deepMerge(GAME_BALANCE[gameId] || {}, overrides);
}

function deepMerge(base, override) {
  const out = Array.isArray(base) ? [...base] : { ...(base || {}) };
  for (const key of Object.keys(override || {})) {
    const bv = base?.[key];
    const ov = override[key];
    if (bv && typeof bv === 'object' && ov && typeof ov === 'object' && !Array.isArray(ov)) {
      out[key] = deepMerge(bv, ov);
    } else {
      out[key] = ov;
    }
  }
  return out;
}

// ---------- Cờ khẩn cấp (settings/public) ----------
let flagsCache = null;
let flagsListenerStarted = false;
const flagsSubscribers = new Set();

function startFlagsListener() {
  if (flagsListenerStarted) return;
  flagsListenerStarted = true;
  onSnapshot(doc(db, 'settings', 'public'), (snap) => {
    flagsCache = snap.exists() ? (snap.data().flags || {}) : {};
    for (const fn of flagsSubscribers) fn(flagsCache);
  }, () => {
    flagsCache = flagsCache || {};
  });
}

export function onFlagsChange(fn) {
  startFlagsListener();
  if (flagsCache) fn(flagsCache);
  flagsSubscribers.add(fn);
  return () => flagsSubscribers.delete(fn);
}

export function getFlags() {
  return flagsCache || {};
}

// ---------- Ví & năng lượng ----------
export function subscribeUserDoc(uid, fn) {
  return onSnapshot(doc(db, 'users', uid), (snap) => fn(snap.exists() ? snap.data() : null));
}

/** Tính năng lượng hiện tại từ mốc thời gian, không dùng bộ đếm thời gian phía client. */
export function computeCurrentEnergy(userData, economy) {
  if (!userData) return 0;
  const eco = economy || getEconomySettings();
  const max = eco.energy.max;
  const stored = userData.wallet?.energy ?? max;
  const updatedAt = userData.energyUpdatedAt?.toDate ? userData.energyUpdatedAt.toDate() : new Date();
  const minutesPassed = (Date.now() - updatedAt.getTime()) / 60000;
  const regen = Math.floor(minutesPassed / eco.energy.regenMinutesPerPoint);
  return Math.min(max, stored + Math.max(0, regen));
}

function todayVietnamKey() {
  const now = new Date();
  const vnOffsetMs = 7 * 60 * 60 * 1000;
  const vn = new Date(now.getTime() + vnOffsetMs - now.getTimezoneOffset() * 60000);
  return vn.toISOString().slice(0, 10);
}

export function dailyStatsRef(uid, dateKey = todayVietnamKey()) {
  return doc(db, 'users', uid, 'dailyStats', dateKey);
}

// ---------- Vòng đời một lượt chơi game (đảm bảo thưởng chỉ nhận đúng một lần) ----------
export async function startGameRun({ gameId, difficulty, test = false }) {
  const user = getCurrentUser();
  if (!user) throw new Error('Chưa đăng nhập');
  const runId = crypto.randomUUID();
  const ref = doc(db, 'gameRuns', runId);
  await setDoc(ref, {
    runId,
    uid: user.uid,
    gameId,
    difficulty,
    status: 'playing',
    test: !!test,
    startedAt: serverTimestamp(),
    score: null,
    stars: null,
  });
  return runId;
}

export async function finishGameRun(runId, { score, stars, durationMs }) {
  const ref = doc(db, 'gameRuns', runId);
  await updateDoc(ref, {
    status: 'finished',
    score,
    stars,
    durationMs,
    finishedAt: serverTimestamp(),
  });
}

function computeCoinReward(gameId, score, difficulty, economy) {
  const rate = 0.5;
  const mult = economy.coinPerRun.difficultyMultiplier[difficulty] ?? 1;
  const cap = economy.coinPerRun.capByDifficulty[difficulty] ?? 999999;
  return Math.min(cap, Math.round(score * rate * mult));
}

function computeGemReward(stars, difficulty, economy) {
  if (!stars || stars < economy.gemPerRun.minStars) return 0;
  const base = economy.gemPerRun.base[difficulty] ?? 0;
  return base + economy.gemPerRun.perStar * stars;
}

function computeExpReward(score, difficulty, economy) {
  const bonus = Math.min(economy.exp.maxBonus, Math.round(score / 10));
  const mult = economy.exp.difficultyMultiplier[difficulty] ?? 1;
  return Math.round((economy.exp.base + bonus) * mult);
}

/**
 * Nhận thưởng cho một lượt chơi đã kết thúc. Dùng transaction để đảm bảo
 * không thể nhận thưởng 2 lần: trạng thái phải là "finished", sau khi nhận
 * chuyển thành "claimed". Firestore Security Rules chặn client tự sửa
 * trạng thái/điểm số/hoặc claim lần 2 (xem firebase/firestore.rules).
 */
export async function claimGameReward(runId) {
  const user = getCurrentUser();
  if (!user) throw new Error('Chưa đăng nhập');
  const economy = getEconomySettings();
  const runRef = doc(db, 'gameRuns', runId);
  const userRef = doc(db, 'users', user.uid);
  const dateKey = todayVietnamKey();
  const statsRef = doc(db, 'users', user.uid, 'dailyStats', dateKey);
  const ledgerRef = doc(collection(db, 'users', user.uid, 'honeyLedger'));

  return runTransaction(db, async (tx) => {
    const runSnap = await tx.get(runRef);
    if (!runSnap.exists()) throw new Error('Không tìm thấy lượt chơi');
    const run = runSnap.data();
    if (run.uid !== user.uid) throw new Error('Lượt chơi không thuộc về bạn');
    if (run.status !== 'finished') throw new Error('Lượt chơi này đã được nhận thưởng hoặc chưa kết thúc');

    const userSnap = await tx.get(userRef);
    const userData = userSnap.data() || {};
    const statsSnap = await tx.get(statsRef);
    const stats = statsSnap.exists() ? statsSnap.data() : { gemEarned: 0, ticketEarned: 0, rewardedRunsByGame: {} };

    const runsToday = stats.rewardedRunsByGame?.[run.gameId] || 0;
    const dailyLimit = economy.dailyRewardedRunsPerGame;
    const overDailyLimit = dailyLimit !== 0 && runsToday >= dailyLimit;

    let coin = 0, gem = 0, ticket = 0, exp = 0;
    if (!overDailyLimit && !run.test) {
      coin = computeCoinReward(run.gameId, run.score || 0, run.difficulty, economy);
      exp = computeExpReward(run.score || 0, run.difficulty, economy);
      const rawGem = computeGemReward(run.stars || 0, run.difficulty, economy);
      const gemCapLeft = economy.gemPerRun.dailyCap === 0 ? rawGem : Math.max(0, economy.gemPerRun.dailyCap - (stats.gemEarned || 0));
      gem = Math.min(rawGem, gemCapLeft);
      if ((run.stars || 0) >= 3) {
        const ticketCapLeft = economy.ticket.dailyCap === 0 ? economy.ticket.perThreeStarRun : Math.max(0, economy.ticket.dailyCap - (stats.ticketEarned || 0));
        ticket = Math.min(economy.ticket.perThreeStarRun, ticketCapLeft);
      }
    }

    tx.update(runRef, { status: 'claimed', claimedAt: serverTimestamp(), reward: { coin, gem, ticket, exp } });
    tx.set(userRef, {
      wallet: {
        coin: increment(coin),
        gem: increment(gem),
        ticket: increment(ticket),
      },
      exp: increment(exp),
    }, { merge: true });
    tx.set(statsRef, {
      gemEarned: increment(gem),
      ticketEarned: increment(ticket),
      rewardedRunsByGame: { [run.gameId]: increment(1) },
    }, { merge: true });
    tx.set(ledgerRef, {
      uid: user.uid,
      runId,
      gameId: run.gameId,
      coin, gem, ticket, exp,
      createdAt: serverTimestamp(),
    });

    return { coin, gem, ticket, exp, overDailyLimit };
  });
}

// ---------- Generic registry helpers (dùng chung cho các trang & Owner Console) ----------
export function subscribeCollection(name, fn, { orderByField, whereClauses = [] } = {}) {
  let q = collection(db, name);
  const clauses = [...whereClauses];
  if (orderByField) clauses.push(orderBy(orderByField));
  if (clauses.length) q = query(collection(db, name), ...clauses);
  return onSnapshot(q, (snap) => fn(snap.docs.map((d) => ({ id: d.id, ...d.data() }))), (err) => {
    console.error(`[db] lỗi lắng nghe "${name}"`, err);
    fn([]);
  });
}

export async function writeAuditLog(batchOrTx, { action, target, oldValue, newValue }) {
  const user = getCurrentUser();
  const ref = doc(collection(db, 'auditLogs'));
  const payload = {
    timestamp: serverTimestamp(),
    adminId: user?.uid || 'unknown',
    action,
    target,
    oldValue: oldValue ?? null,
    newValue: newValue ?? null,
  };
  if (batchOrTx?.set) batchOrTx.set(ref, payload);
  else await setDoc(ref, payload);
  return ref;
}

export async function upsertRegistryDoc(registry, docId, data, { action = 'upsert', oldValue = null } = {}) {
  if (!isOwner()) throw new Error('Chỉ chủ nhà mới có quyền này');
  const batch = writeBatch(db);
  const id = docId || crypto.randomUUID();
  const ref = doc(db, registry, id);
  batch.set(ref, { ...data, updatedAt: serverTimestamp() }, { merge: true });
  await writeAuditLog(batch, { action, target: `${registry}/${id}`, oldValue, newValue: data });
  await batch.commit();
  return id;
}

export async function deleteRegistryDoc(registry, docId, oldValue = null) {
  if (!isOwner()) throw new Error('Chỉ chủ nhà mới có quyền này');
  const batch = writeBatch(db);
  batch.delete(doc(db, registry, docId));
  await writeAuditLog(batch, { action: 'delete', target: `${registry}/${docId}`, oldValue, newValue: null });
  await batch.commit();
}

export { getDoc, setDoc, updateDoc, deleteDoc, onSnapshot, runTransaction, writeBatch, Timestamp };
