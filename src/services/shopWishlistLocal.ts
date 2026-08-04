import AsyncStorage from '@react-native-async-storage/async-storage';
import { WishlistShopItem } from '../types/wishlist';

const storageKey = (userId: string) => `@bachatbazaar/shop-wishlist:${userId.trim()}`;

const readList = async (userId: string): Promise<WishlistShopItem[]> => {
  if (!userId.trim()) {
    return [];
  }

  try {
    const raw = await AsyncStorage.getItem(storageKey(userId));
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as WishlistShopItem[]) : [];
  } catch {
    return [];
  }
};

const writeList = async (userId: string, items: WishlistShopItem[]) => {
  await AsyncStorage.setItem(storageKey(userId), JSON.stringify(items));
};

export const shopWishlistLocal = {
  async list(userId: string) {
    return readList(userId);
  },

  async add(userId: string, item: WishlistShopItem) {
    const list = await readList(userId);
    const shopId = item.shopId.trim();
    if (!shopId) {
      throw new Error('Shop id is required.');
    }

    if (list.some(entry => entry.shopId === shopId)) {
      return list;
    }

    const next = [
      {
        ...item,
        id: item.id || shopId,
        shopId,
        createdAt: item.createdAt || new Date().toISOString(),
      },
      ...list,
    ];
    await writeList(userId, next);
    return next;
  },

  async remove(userId: string, shopId: string) {
    const normalized = shopId.trim();
    const next = (await readList(userId)).filter(entry => entry.shopId !== normalized);
    await writeList(userId, next);
    return next;
  },

  async clear(userId: string) {
    await writeList(userId, []);
  },

  async isSaved(userId: string, shopId: string) {
    const normalized = shopId.trim();
    const list = await readList(userId);
    return list.some(entry => entry.shopId === normalized || entry.id === normalized);
  },
};
