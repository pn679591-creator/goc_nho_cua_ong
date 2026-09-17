// Cấu hình kinh tế mặc định. Chủ nhà có thể ghi đè từng giá trị trong
// tài liệu Firestore settings/balance — xem js/core/db.js#getBalanceSettings().
// Các con số dưới đây là mặc định khi Firestore chưa có settings/balance.

export const CURRENCIES = {
  coin: { id: 'coin', icon: '🌻', name: 'Hạt Hướng Dương' },
  gem: { id: 'gem', icon: '🍯', name: 'Mật Ong' },
  ticket: { id: 'ticket', icon: '🎟️', name: 'Vé' },
  energy: { id: 'energy', icon: '⚡', name: 'Năng lượng' },
};

export const DEFAULT_ECONOMY = {
  energy: {
    max: 100,
    regenMinutesPerPoint: 3,
    costByDifficulty: { de: 6, thuong: 8, kho: 10 },
  },
  exp: {
    base: 10,
    maxBonus: 30,
    difficultyMultiplier: { de: 0.8, thuong: 1, kho: 1.3 },
  },
  coinPerRun: {
    difficultyMultiplier: { de: 0.8, thuong: 1, kho: 1.4 },
    capByDifficulty: { de: 120, thuong: 150, kho: 200 },
  },
  gemPerRun: {
    base: { de: 5, thuong: 10, kho: 15 },
    perStar: 2,
    minStars: 1,
    dailyCap: 300,
  },
  ticket: {
    perThreeStarRun: 1,
    dailyCap: 3,
  },
  cooldownSecondsSameGame: 15,
  dailyRewardedRunsPerGame: 25,
  multiplayer: {
    winnerGem: 10,
    loserGem: 3,
    dailyCapPerOpponent: 5,
  },
  // 0 = không giới hạn
  isUnlimited(value) {
    return value === 0;
  },
};

export const DIFFICULTIES = ['de', 'thuong', 'kho'];

export const DIFFICULTY_LABELS = {
  de: 'Dễ',
  thuong: 'Thường',
  kho: 'Khó',
};
