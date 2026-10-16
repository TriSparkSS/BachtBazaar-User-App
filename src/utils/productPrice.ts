import { ShopProduct } from '../types/shop';

export const formatRupeeAmount = (amount: number) =>
  `₹${Math.max(0, Math.round(amount)).toLocaleString('en-IN')}`;

const unwrapMoneyObject = (value: Record<string, unknown>): unknown[] => [
  value.$numberDecimal,
  value.$numberInt,
  value.$numberDouble,
  value.discounted_price,
  value.discountedPrice,
  value.value,
  value.amount,
];

export const parseMoneyAmount = (...values: unknown[]): number | undefined => {
  for (const value of values) {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === 'string' && value.trim()) {
      const parsed = Number(value.replace(/[^\d.]/g, ''));
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      const nested = parseMoneyAmount(...unwrapMoneyObject(value as Record<string, unknown>));
      if (nested != null) {
        return nested;
      }
    }
  }
  return undefined;
};

export type ProductPriceQuote = {
  /** Payable / discounted unit price. */
  saleAmount: number;
  /** MRP / original unit price when a discount exists. */
  originalAmount?: number;
  discountAmount: number;
};

export const resolveProductPriceQuote = (input: {
  saleAmount?: number;
  originalAmount?: number;
  price?: string | number | null;
  originalPrice?: string | number | null;
  discountedPrice?: string | number | null;
}): ProductPriceQuote => {
  const discounted = parseMoneyAmount(input.discountedPrice);
  const saleHint = parseMoneyAmount(input.saleAmount);
  const base = parseMoneyAmount(input.originalAmount, input.originalPrice, input.price);

  // Prefer discounted_price whenever the API sent one; otherwise use base/MRP.
  let saleAmount: number;
  if (discounted != null) {
    saleAmount = discounted;
  } else if (saleHint != null && base != null && saleHint < base) {
    saleAmount = saleHint;
  } else {
    saleAmount = saleHint ?? base ?? 0;
  }

  const originalAmount = base != null && base > saleAmount ? base : undefined;

  return {
    saleAmount: Math.max(0, saleAmount),
    originalAmount,
    discountAmount: originalAmount != null ? originalAmount - saleAmount : 0,
  };
};

/** Same rule as Request Delivery: discounted/sale amount if present, otherwise base. */
export const quoteFromShopProduct = (product: ShopProduct): ProductPriceQuote =>
  resolveProductPriceQuote({
    saleAmount: product.priceAmount,
    originalAmount: product.originalPriceAmount,
    price: product.price,
    originalPrice: product.originalPrice,
  });

const normalizeMatchKey = (value?: string | null) =>
  value?.trim().toLowerCase().replace(/\s+/g, ' ') || '';

export const matchShopProduct = (
  products: ShopProduct[] | undefined,
  item: { productId?: string; productName?: string },
): ShopProduct | undefined => {
  const list = products ?? [];
  if (!list.length) {
    return undefined;
  }

  const productId = item.productId?.trim();
  if (productId) {
    const byId = list.find(product => product.id === productId);
    if (byId) {
      return byId;
    }
    const idKey = normalizeMatchKey(productId);
    const byIdLoose = list.find(product => normalizeMatchKey(product.id) === idKey);
    if (byIdLoose) {
      return byIdLoose;
    }
  }

  const nameKey = normalizeMatchKey(item.productName);
  if (nameKey) {
    const byName = list.find(product => normalizeMatchKey(product.title) === nameKey);
    if (byName) {
      return byName;
    }
    const byNameIncludes = list.find(product => {
      const title = normalizeMatchKey(product.title);
      return title.includes(nameKey) || nameKey.includes(title);
    });
    if (byNameIncludes) {
      return byNameIncludes;
    }
  }

  if (list.length === 1) {
    return list[0];
  }

  return undefined;
};
