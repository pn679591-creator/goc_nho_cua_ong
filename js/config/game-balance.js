// Thông số cân bằng độ khó cho từng minigame. Chủ nhà có thể ghi đè qua
// settings/balance.games.<id> trên Firestore (xem js/core/db.js).
// Mục tiêu cân bằng chung: một lượt chơi bình thường kéo dài 60-180 giây;
// tỉ lệ thắng lần đầu ~80% ở Dễ, ~50% ở Thường, ~20% ở Khó (spec/BALANCE.md).

export const GAME_BALANCE = {
  'san-hat': {
    label: 'Hamster Săn Hạt',
    speed: { de: 6, thuong: 8, kho: 10 },
    speedStepPerSeeds: 5,
    speedStep: 0.25,
    speedMax: { de: 12, thuong: 15, kho: 18 },
    powerUpEverySeconds: { de: 10, thuong: 8, kho: 6 },
    durationSeconds: 60,
  },
  'hung-qua-roi': {
    label: 'Hứng Quả Rơi',
    spawnEverySeconds: { de: 1.2, thuong: 0.9, kho: 0.65 },
    fallSpeedScreenPerSec: { de: 0.30, thuong: 0.42, kho: 0.55 },
    badItemChance: { de: 0.10, thuong: 0.18, kho: 0.28 },
    lives: { de: 5, thuong: 3, kho: 2 },
  },
  'lat-the': {
    label: 'Lật Thẻ Ghép Đôi',
    grid: { de: [4, 4], thuong: [6, 6], kho: [6, 6] },
    timeLimitSeconds: { de: 0, thuong: 120, kho: 80 },
    shuffleOnMismatch: { de: false, thuong: false, kho: true },
  },
  'nhay-may': {
    label: 'Hamster Nhảy Mây',
    breakingCloudChance: { de: 0.05, thuong: 0.15, kho: 0.25 },
    movingCloudChance: { de: 0.10, thuong: 0.20, kho: 0.35 },
    cloudGapRatioOfMaxJump: { de: 0.60, thuong: 0.75, kho: 0.90 },
  },
  'ghep-hat': {
    label: 'Ghép Hạt Ngọt',
    movesDelta: { de: 5, thuong: 0, kho: -4 },
    obstacleDensity: { de: 0.15, thuong: 0.30, kho: 0.45 },
  },
  'dap-sau': {
    label: 'Đập Sâu Vườn',
    bugVisibleSeconds: { de: 1.1, thuong: 0.8, kho: 0.55 },
    babyHamsterChance: { de: 0.05, thuong: 0.12, kho: 0.20 },
    roundSeconds: 60,
  },
  'cau-ca': {
    label: 'Câu Cá Ao Hồng',
    catchZoneRatio: { de: 0.40, thuong: 0.28, kho: 0.18 },
    fishSpeedMultiplier: { de: 0.7, thuong: 1, kho: 1.4 },
    roundSeconds: 60,
  },
  'chay-banh-xe': {
    label: 'Hamster Chạy Bánh Xe',
    startSpeedMultiplier: { de: 0.8, thuong: 1, kho: 1.25 },
    speedIncreasePer100m: 0.02,
    minObstacleGapSeconds: { de: 1.4, thuong: 1.1, kho: 0.85 },
  },
  'caro-hat-dua': {
    label: 'Caro Hạt Dưa',
    aiBlockThreatChance: { de: 0.5, thuong: 1, kho: 1 },
    aiSearchPly: { de: 1, thuong: 2, kho: 3 },
    aiOpenFourDetection: { de: false, thuong: false, kho: true },
    moveTimerSeconds: { de: 45, thuong: 30, kho: 20 },
    boardSize: 9,
    winLength: 5,
  },
  'dua-hamster': {
    label: 'Đua Hamster',
    aiSpeedMultiplier: { de: 0.8, thuong: 1, kho: 1.15 },
    raceDistance: 100,
  },
  'do-vui': {
    label: 'Đố Vui Nhà Ong',
    secondsPerQuestion: { de: 20, thuong: 15, kho: 10 },
    questionCount: 10,
  },
};

export function getGameBalance(gameId, overrides) {
  const base = GAME_BALANCE[gameId];
  if (!base) return null;
  if (!overrides) return base;
  return deepMerge(base, overrides);
}

function deepMerge(base, override) {
  const out = Array.isArray(base) ? [...base] : { ...base };
  for (const key of Object.keys(override || {})) {
    const bv = base[key];
    const ov = override[key];
    if (bv && typeof bv === 'object' && ov && typeof ov === 'object' && !Array.isArray(ov)) {
      out[key] = deepMerge(bv, ov);
    } else {
      out[key] = ov;
    }
  }
  return out;
}
