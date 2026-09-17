// Danh sách mọi registry mà Owner Console có thể quản lý. Thêm một loại
// nội dung mới = thêm một file schema rồi import + thêm vào mảng dưới đây.
// Không có giới hạn cứng về số lượng bản ghi cho bất kỳ registry nào.
import cropsSchema from './crops.js';
import seedsSchema from './seeds.js';
import shopItemsSchema from './shop-items.js';
import tarotDeckSchema from './tarot-deck.js';
import gamesSchema from './games.js';
import eventsSchema from './events.js';
import botsSchema from './bots.js';
import questsSchema from './quests.js';
import achievementsSchema from './achievements.js';

export const ADMIN_SCHEMAS = [
  gamesSchema,
  cropsSchema,
  seedsSchema,
  shopItemsSchema,
  tarotDeckSchema,
  eventsSchema,
  botsSchema,
  questsSchema,
  achievementsSchema,
];
