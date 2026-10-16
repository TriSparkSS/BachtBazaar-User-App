import AsyncStorage from '@react-native-async-storage/async-storage';
import { ShopProduct, ShopWithOffers } from '../types/shop';
import { quoteFromShopProduct } from '../utils/productPrice';

const STORAGE_KEY = '@bachatbazaar/cart_product_quotes';

export type CachedCartProduct = {
  productId: string;
  title?: string;
  saleAmount: number;
  originalAmount?: number;
  shopId?: string;
  merchantId?: string;
  shopName?: string;
};

const normalizeKey = (value?: string | null) => value?.trim().toLowerCase() || '';

const readMap = async (): Promise<Record<string, CachedCartProduct>> => {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {};
    }
    const parsed = JSON.parse(raw) as Record<string, CachedCartProduct>;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
};

const writeMap = async (map: Record<string, CachedCartProduct>) => {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(map));
};

export const cartProductCache = {
  async rememberFromShop(product: ShopProduct, shop: ShopWithOffers): Promise<void> {
    const productId = product.id?.trim();
    if (!productId) {
      return;
    }
    const quote = quoteFromShopProduct(product);
    const entry: CachedCartProduct = {
      productId,
      title: product.title,
      saleAmount: quote.saleAmount,
      originalAmount: quote.originalAmount,
      shopId: shop.id?.trim() || product.shopId?.trim(),
      merchantId: shop.merchantId?.trim(),
      shopName: shop.name?.trim() || shop.merchantName?.trim(),
    };
    const map = await readMap();
    map[productId] = entry;
    const titleKey = normalizeKey(product.title);
    if (titleKey) {
      map[`title:${titleKey}`] = entry;
    }
    await writeMap(map);
  },

  async readAll(): Promise<CachedCartProduct[]> {
    const map = await readMap();
    const seen = new Set<string>();
    const list: CachedCartProduct[] = [];
    for (const entry of Object.values(map)) {
      const id = entry.productId?.trim();
      if (!id || seen.has(id)) {
        continue;
      }
      seen.add(id);
      list.push(entry);
    }
    return list;
  },

  find(
    cache: CachedCartProduct[],
    item: { productId?: string; productName?: string },
  ): CachedCartProduct | undefined {
    const productId = item.productId?.trim();
    if (productId) {
      const byId = cache.find(entry => entry.productId === productId);
      if (byId) {
        return byId;
      }
    }
    const titleKey = normalizeKey(item.productName);
    if (!titleKey) {
      return undefined;
    }
    return cache.find(entry => normalizeKey(entry.title) === titleKey);
  },
};
