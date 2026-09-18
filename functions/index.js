// Cloud Functions cho SECURITY_MODE = "secure" (js/config/app-config.js).
// Thư mục này HOÀN TOÀN TUỲ CHỌN — ở chế độ "simple" (mặc định), toàn bộ
// site chạy được không cần deploy Functions. Bật "secure" khi bạn muốn các
// hành động nhạy cảm (nhận thưởng, ăn trộm, rút Tarot) được server tính
// toán thay vì tin vào transaction phía client.
//
// Deploy: cd functions && npm install && firebase deploy --only functions
// KHÔNG BAO GIỜ đặt API key trực tiếp trong file này — dùng:
//   firebase functions:secrets:set GEMINI_API_KEY
'use strict';

const { onCall, onRequest, HttpsError } = require('firebase-functions/v2/https');
const { setGlobalOptions } = require('firebase-functions/v2');
const { defineSecret } = require('firebase-functions/params');
const admin = require('firebase-admin');

admin.initializeApp();
const db = admin.firestore();

setGlobalOptions({ region: 'asia-southeast1', maxInstances: 10 });

const GEMINI_API_KEY = defineSecret('GEMINI_API_KEY');

// ---------------- Cấu hình kinh tế mặc định (bản sao gọn của js/config/economy.js) ----------------
const DEFAULT_ECONOMY = {
  energy: { max: 100, regenMinutesPerPoint: 3, costByDifficulty: { de: 6, thuong: 8, kho: 10 } },
  exp: { base: 10, maxBonus: 30, difficultyMultiplier: { de: 0.8, thuong: 1, kho: 1.3 } },
  coinPerRun: { difficultyMultiplier: { de: 0.8, thuong: 1, kho: 1.4 }, capByDifficulty: { de: 120, thuong: 150, kho: 200 } },
  gemPerRun: { base: { de: 5, thuong: 10, kho: 15 }, perStar: 2, minStars: 1, dailyCap: 300 },
  ticket: { perThreeStarRun: 1, dailyCap: 3 },
  dailyRewardedRunsPerGame: 25,
};

function requireAuth(request) {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Cần đăng nhập.');
  return request.auth.uid;
}

async function getEconomySettings() {
  const snap = await db.doc('settings/balance').get();
  const overrides = snap.exists ? snap.data().economy || {} : {};
  return deepMerge(DEFAULT_ECONOMY, overrides);
}

function deepMerge(base, override) {
  const out = Array.isArray(base) ? [...base] : { ...base };
  for (const key of Object.keys(override || {})) {
    const bv = base?.[key];
    const ov = override[key];
    out[key] = bv && typeof bv === 'object' && ov && typeof ov === 'object' && !Array.isArray(ov) ? deepMerge(bv, ov) : ov;
  }
  return out;
}

function todayVietnamKey() {
  const now = new Date();
  const vn = new Date(now.getTime() + 7 * 60 * 60 * 1000);
  return vn.toISOString().slice(0, 10);
}

// ---------------- claimGameReward ----------------
exports.claimGameReward = onCall(async (request) => {
  const uid = requireAuth(request);
  const { runId } = request.data || {};
  if (!runId) throw new HttpsError('invalid-argument', 'Thiếu runId.');

  const economy = await getEconomySettings();
  const runRef = db.doc(`gameRuns/${runId}`);
  const userRef = db.doc(`users/${uid}`);
  const dateKey = todayVietnamKey();
  const statsRef = db.doc(`users/${uid}/dailyStats/${dateKey}`);
  const ledgerRef = db.collection(`users/${uid}/honeyLedger`).doc();

  return db.runTransaction(async (tx) => {
    const runSnap = await tx.get(runRef);
    if (!runSnap.exists) throw new HttpsError('not-found', 'Không tìm thấy lượt chơi.');
    const run = runSnap.data();
    if (run.uid !== uid) throw new HttpsError('permission-denied', 'Lượt chơi không thuộc về bạn.');
    if (run.status !== 'finished') throw new HttpsError('failed-precondition', 'Lượt chơi đã nhận thưởng hoặc chưa kết thúc.');

    const statsSnap = await tx.get(statsRef);
    const stats = statsSnap.exists ? statsSnap.data() : { gemEarned: 0, ticketEarned: 0, rewardedRunsByGame: {} };
    const runsToday = stats.rewardedRunsByGame?.[run.gameId] || 0;
    const overDailyLimit = economy.dailyRewardedRunsPerGame !== 0 && runsToday >= economy.dailyRewardedRunsPerGame;

    let coin = 0, gem = 0, ticket = 0, exp = 0;
    if (!overDailyLimit && !run.test) {
      const mult = economy.coinPerRun.difficultyMultiplier[run.difficulty] ?? 1;
      const cap = economy.coinPerRun.capByDifficulty[run.difficulty] ?? 999999;
      coin = Math.min(cap, Math.round((run.score || 0) * 0.5 * mult));
      const expMult = economy.exp.difficultyMultiplier[run.difficulty] ?? 1;
      exp = Math.round((economy.exp.base + Math.min(economy.exp.maxBonus, Math.round((run.score || 0) / 10))) * expMult);
      if ((run.stars || 0) >= economy.gemPerRun.minStars) {
        const rawGem = (economy.gemPerRun.base[run.difficulty] ?? 0) + economy.gemPerRun.perStar * (run.stars || 0);
        const capLeft = economy.gemPerRun.dailyCap === 0 ? rawGem : Math.max(0, economy.gemPerRun.dailyCap - (stats.gemEarned || 0));
        gem = Math.min(rawGem, capLeft);
      }
      if ((run.stars || 0) >= 3) {
        const capLeft = economy.ticket.dailyCap === 0 ? economy.ticket.perThreeStarRun : Math.max(0, economy.ticket.dailyCap - (stats.ticketEarned || 0));
        ticket = Math.min(economy.ticket.perThreeStarRun, capLeft);
      }
    }

    tx.update(runRef, { status: 'claimed', claimedAt: admin.firestore.FieldValue.serverTimestamp(), reward: { coin, gem, ticket, exp } });
    tx.set(userRef, {
      wallet: { coin: admin.firestore.FieldValue.increment(coin), gem: admin.firestore.FieldValue.increment(gem), ticket: admin.firestore.FieldValue.increment(ticket) },
      exp: admin.firestore.FieldValue.increment(exp),
    }, { merge: true });
    tx.set(statsRef, {
      gemEarned: admin.firestore.FieldValue.increment(gem),
      ticketEarned: admin.firestore.FieldValue.increment(ticket),
      rewardedRunsByGame: { [run.gameId]: admin.firestore.FieldValue.increment(1) },
    }, { merge: true });
    tx.set(ledgerRef, { uid, runId, gameId: run.gameId, coin, gem, ticket, exp, createdAt: admin.firestore.FieldValue.serverTimestamp() });

    return { coin, gem, ticket, exp, overDailyLimit };
  });
});

// ---------------- tarotDrawDaily ----------------
exports.tarotDrawDaily = onCall(async (request) => {
  const uid = requireAuth(request);
  const deckSnap = await db.collection('tarotDeck').get();
  if (deckSnap.empty) throw new HttpsError('failed-precondition', 'Bộ bài Tarot chưa có dữ liệu.');
  const deck = deckSnap.docs.map((d) => d.id);

  const dateKey = todayVietnamKey();
  const readingRef = db.doc(`tarotReadings/${uid}_${dateKey}`);

  return db.runTransaction(async (tx) => {
    const existing = await tx.get(readingRef);
    if (existing.exists) {
      const data = existing.data();
      return { cardId: data.cardId, orientation: data.orientation, alreadyDrawn: true };
    }
    const cardId = deck[Math.floor(Math.random() * deck.length)];
    const orientation = Math.random() < 0.5 ? 'reversed' : 'upright';
    tx.set(readingRef, { uid, cardId, orientation, kind: 'daily', drawnAt: admin.firestore.FieldValue.serverTimestamp() });
    return { cardId, orientation, alreadyDrawn: false };
  });
});

// ---------------- stealAttempt ----------------
exports.stealAttempt = onCall(async (request) => {
  const uid = requireAuth(request);
  const { targetUid } = request.data || {};
  if (!targetUid || targetUid === uid) throw new HttpsError('invalid-argument', 'Mục tiêu không hợp lệ.');

  const balanceSnap = await db.doc('settings/balance').get();
  const stealCfg = balanceSnap.exists ? balanceSnap.data().steal || {} : {};
  if (stealCfg.enabled === false) throw new HttpsError('failed-precondition', 'Tính năng ăn trộm đang tắt.');
  const successRate = (stealCfg.successRate ?? 30) / 100;
  const reward = stealCfg.reward ?? 20;
  const penalty = stealCfg.penalty ?? 10;

  const attackerRef = db.doc(`users/${uid}`);
  const targetRef = db.doc(`users/${targetUid}`);
  const success = Math.random() < successRate;

  return db.runTransaction(async (tx) => {
    const targetSnap = await tx.get(targetRef);
    if (!targetSnap.exists) throw new HttpsError('not-found', 'Không tìm thấy mục tiêu.');
    const targetWallet = targetSnap.data().wallet || {};
    const amount = success ? Math.min(reward, targetWallet.coin || 0) : penalty;

    if (success) {
      tx.set(targetRef, { wallet: { coin: admin.firestore.FieldValue.increment(-amount) } }, { merge: true });
      tx.set(attackerRef, { wallet: { coin: admin.firestore.FieldValue.increment(amount) } }, { merge: true });
    } else {
      tx.set(attackerRef, { wallet: { coin: admin.firestore.FieldValue.increment(-amount) } }, { merge: true });
    }
    tx.set(db.collection('stealHistory').doc(), {
      attackerUid: uid, targetUid, success, amount, at: admin.firestore.FieldValue.serverTimestamp(),
    });
    return { success, amount };
  });
});

// ---------------- aiProxy: luận giải Tarot / thư hằng ngày qua Gemini ----------------
exports.aiProxy = onRequest({ secrets: [GEMINI_API_KEY], cors: true }, async (req, res) => {
  if (req.method !== 'POST') { res.status(405).send('Method not allowed'); return; }
  const apiKey = GEMINI_API_KEY.value();
  if (!apiKey) { res.status(501).json({ error: 'Chưa cấu hình GEMINI_API_KEY trên server.' }); return; }

  const { type, cardName, orientation } = req.body || {};
  let prompt = 'Hãy viết một đoạn văn ngắn, ấm áp, bằng tiếng Việt.';
  if (type === 'tarot') {
    prompt = `Viết một đoạn luận giải Tarot ngắn (3-4 câu), giọng văn ấm áp, tiếng Việt, cho lá bài "${cardName}" ở chiều ${orientation === 'reversed' ? 'ngược' : 'xuôi'}.`;
  }

  try {
    const resp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
      },
    );
    const data = await resp.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error('Không có phản hồi từ Gemini.');
    res.json({ text });
  } catch (err) {
    res.status(502).json({ error: String(err) });
  }
});
