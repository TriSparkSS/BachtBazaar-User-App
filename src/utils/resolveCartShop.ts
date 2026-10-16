import { areaRadiusStorage } from '../services/areaRadiusStorage';
import { logApiEvent } from '../services/apiClient';
import { shopApi } from '../services/shopApi';
import { ShopProduct } from '../types/shop';
import { matchShopProduct } from './productPrice';

export type CartShopRef = {
  shopId?: string;
  merchantId?: string;
  shopName?: string;
  city?: string;
  productId?: string;
  productName?: string;
};

const isUsableShopId = (shopId?: string, merchantId?: string) => {
  const id = shopId?.trim();
  const merchant = merchantId?.trim();
  return Boolean(id && id !== merchant);
};

export const resolveShopIdFromCartContext = async (
  ref: CartShopRef,
  token: string,
): Promise<string | null> => {
  const shopId = ref.shopId?.trim();
  const merchantId = ref.merchantId?.trim();
  const shopName = ref.shopName?.trim();
  const city = ref.city?.trim();
  const productId = ref.productId?.trim();
  const productName = ref.productName?.trim();

  if (isUsableShopId(shopId, merchantId)) {
    return shopId as string;
  }

  if (merchantId) {
    try {
      const resolved = await shopApi.resolveShopIdByMerchantId(
        { merchantId, shopName, city },
        token,
      );
      if (resolved) {
        logApiEvent('Cart shop via merchant lookup', { merchantId, shopId: resolved });
        return resolved;
      }
    } catch {
      // Fall through to nearby shops / search.
    }
  }

  try {
    const radiusKm = await areaRadiusStorage.getRadiusKm();
    const shops = await shopApi.fetchHomeShops('all', token, radiusKm);
    const byMerchant = merchantId
      ? shops.find(shop => shop.merchantId?.trim() === merchantId)
      : undefined;
    if (byMerchant?.id?.trim()) {
      logApiEvent('Cart shop via nearby merchantId', {
        merchantId,
        shopId: byMerchant.id,
      });
      return byMerchant.id.trim();
    }
    const nameKey = shopName?.toLowerCase();
    if (nameKey) {
      const byName = shops.find(shop => {
        const n = shop.name.trim().toLowerCase();
        const merchantName = shop.merchantName?.trim().toLowerCase();
        return n === nameKey || merchantName === nameKey || n.includes(nameKey);
      });
      if (byName?.id?.trim() && byName.id.trim() !== merchantId) {
        logApiEvent('Cart shop via nearby name', {
          shopName,
          shopId: byName.id,
        });
        return byName.id.trim();
      }
    }
  } catch {
    // Search fallback below.
  }

  const queries = [productId, productName, shopName].filter(
    (value): value is string => Boolean(value),
  );
  for (const query of queries) {
    try {
      const search = await shopApi.searchShopsProductsAndOffers(query, token);
      if (merchantId) {
        const shop = search.shops.find(candidate => candidate.merchantId?.trim() === merchantId);
        if (shop?.id?.trim() && shop.id.trim() !== merchantId) {
          return shop.id.trim();
        }
      }
      const product = matchShopProduct(search.products, { productId, productName });
      if (isUsableShopId(product?.shopId, merchantId)) {
        return product?.shopId?.trim() || null;
      }
      const namedShop = shopName
        ? search.shops.find(
            candidate => candidate.name.trim().toLowerCase() === shopName.toLowerCase(),
          )
        : undefined;
      if (isUsableShopId(namedShop?.id, merchantId)) {
        return namedShop?.id?.trim() || null;
      }
    } catch {
      // Try the next query.
    }
  }

  logApiEvent('Cart shop resolve miss', {
    shopId,
    merchantId,
    shopName,
    city,
    productId,
    productName,
  });
  return null;
};

export const loadCartShopProducts = async (
  ref: CartShopRef,
  token: string,
): Promise<{ shopId: string | null; products: ShopProduct[] }> => {
  const shopId = await resolveShopIdFromCartContext(ref, token);
  if (!shopId) {
    return { shopId: null, products: [] };
  }
  try {
    const shop = await shopApi.fetchShopByIdWithOffers(shopId, token);
    return { shopId, products: shop.products ?? [] };
  } catch {
    return { shopId, products: [] };
  }
};
