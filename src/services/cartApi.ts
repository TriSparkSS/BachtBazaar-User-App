import { API_ENDPOINTS, CART_API_BASE_URL } from '../config/api';
import { apiRequest } from './apiClient';

export type AddToCartItem = {
  productId: string;
  merchantId: string;
  quantity: number;
};

export type AddToCartResponse = {
  success?: boolean;
  message?: string;
  data?: unknown;
};

export type CartItem = {
  id: string;
  productId?: string;
  productName: string;
  quantity: number;
  /** Formatted unit price, e.g. ₹499 */
  price?: string;
  unitPrice?: number;
  itemTotal?: number;
  itemDiscount?: number;
  variantInfo?: string;
  merchantId?: string;
  merchantName?: string;
  shopName?: string;
  /** Relative or absolute thumbnail path from API */
  image?: string;
};

export type CartSummary = {
  subtotal: number;
  totalDiscount: number;
  totalAmount: number;
  totalItemsCount: number;
  totalUniqueProducts: number;
  /** Present when cart API returns a delivery fee; otherwise UI uses Request Delivery demo fee. */
  deliveryFee?: number;
  /** Present when cart API returns a platform fee; otherwise UI uses Request Delivery demo fee. */
  platformFee?: number;
  couponCode?: string;
  couponDiscount?: number;
};

export type FetchCartResult = {
  items: CartItem[];
  summary: CartSummary;
  message?: string;
  raw?: unknown;
};

const EMPTY_SUMMARY: CartSummary = {
  subtotal: 0,
  totalDiscount: 0,
  totalAmount: 0,
  totalItemsCount: 0,
  totalUniqueProducts: 0,
};

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

const asArray = (value: unknown): unknown[] | null =>
  Array.isArray(value) ? value : null;

const pickString = (...candidates: unknown[]): string | undefined => {
  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim()) {
      return candidate.trim();
    }
    if (typeof candidate === 'number' && Number.isFinite(candidate)) {
      return String(candidate);
    }
  }
  return undefined;
};

const pickNumber = (...candidates: unknown[]): number | undefined => {
  for (const candidate of candidates) {
    if (typeof candidate === 'number' && Number.isFinite(candidate)) {
      return candidate;
    }
    if (typeof candidate === 'string' && candidate.trim()) {
      const parsed = Number(candidate.trim());
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }
  return undefined;
};

export const formatCartPrice = (value: unknown): string | undefined => {
  if (value == null) {
    return undefined;
  }
  if (typeof value === 'string' && value.trim()) {
    const trimmed = value.trim();
    if (trimmed.startsWith('₹') || trimmed.startsWith('Rs')) {
      return trimmed;
    }
    const num = Number(trimmed.replace(/,/g, ''));
    if (Number.isFinite(num)) {
      return `₹${num.toLocaleString('en-IN')}`;
    }
    return trimmed;
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return `₹${value.toLocaleString('en-IN')}`;
  }
  return undefined;
};

/** Pull items array from flexible cart response shapes. */
const extractItemsArray = (payload: unknown): unknown[] => {
  if (!payload) {
    return [];
  }

  const direct = asArray(payload);
  if (direct) {
    return direct;
  }

  const root = asRecord(payload);
  if (!root) {
    return [];
  }

  const candidates: unknown[] = [
    root.items,
    root.cartItems,
    root.cart_items,
    asRecord(root.data)?.items,
    asRecord(root.data)?.cartItems,
    asRecord(root.data)?.cart_items,
    asArray(root.data),
    asRecord(asRecord(root.data)?.cart)?.items,
    asRecord(root.cart)?.items,
    asRecord(root.cart)?.cartItems,
  ];

  for (const candidate of candidates) {
    const arr = asArray(candidate);
    if (arr) {
      return arr;
    }
  }

  return [];
};

const extractCartData = (payload: unknown): Record<string, unknown> | null => {
  const root = asRecord(payload);
  if (!root) {
    return null;
  }
  return asRecord(root.data) ?? asRecord(root.cart) ?? root;
};

const parseCartItem = (raw: unknown, index: number): CartItem | null => {
  const item = asRecord(raw);
  if (!item) {
    return null;
  }

  // GET /api/cart nests product_id / merchant_id as objects.
  const product =
    asRecord(item.product_id) ??
    asRecord(item.productId) ??
    asRecord(item.product) ??
    null;
  const merchant =
    asRecord(item.merchant_id) ??
    asRecord(item.merchantId) ??
    asRecord(item.merchant) ??
    asRecord(item.shop) ??
    null;

  const productId = pickString(
    typeof item.product_id === 'string' ? item.product_id : undefined,
    typeof item.productId === 'string' ? item.productId : undefined,
    product?._id,
    product?.id,
  );
  const id =
    pickString(item._id, item.id, item.cartItemId, productId) ?? `cart-item-${index}`;

  const productName =
    pickString(
      item.product_name,
      item.productName,
      item.name,
      item.title,
      item.customItemName,
      product?.name,
      product?.title,
      product?.productName,
    ) ?? 'Product';

  const quantity = pickNumber(item.quantity, item.qty, item.count) ?? 1;

  const unitPrice = pickNumber(
    item.unit_price,
    item.unitPrice,
    item.price,
    item.itemPrice,
    product?.price,
    product?.salePrice,
    product?.mrp,
  );

  const itemTotal = pickNumber(
    item.item_total,
    item.itemTotal,
    item.lineTotal,
    item.line_total,
    unitPrice != null ? unitPrice * quantity : undefined,
  );

  const itemDiscount = pickNumber(item.item_discount, item.itemDiscount) ?? 0;

  const price = formatCartPrice(unitPrice);

  const merchantId = pickString(
    typeof item.merchant_id === 'string' ? item.merchant_id : undefined,
    typeof item.merchantId === 'string' ? item.merchantId : undefined,
    merchant?._id,
    merchant?.id,
    merchant?.merchantId,
  );

  const merchantName = pickString(
    item.merchant_name,
    item.merchantName,
    merchant?.name,
    merchant?.storeName,
    merchant?.merchantName,
  );

  const shopName = pickString(
    item.shopName,
    item.shop_name,
    item.storeName,
    asRecord(item.shop)?.name,
    asRecord(item.shop)?.storeName,
    merchantName,
  );

  const image = pickString(
    item.product_thumbnail,
    item.productThumbnail,
    item.thumbnail,
    item.image,
    item.imageUrl,
    product?.thumbnail,
    product?.image,
    product?.imageUrl,
  );

  const variantInfo = pickString(item.variant_info, item.variantInfo, item.variant);

  return {
    id,
    productId,
    productName,
    quantity,
    price,
    unitPrice,
    itemTotal,
    itemDiscount,
    variantInfo,
    merchantId,
    merchantName,
    shopName,
    image,
  };
};

const parseCartSummary = (
  data: Record<string, unknown> | null,
  items: CartItem[],
): CartSummary => {
  const coupon = asRecord(data?.applied_coupon) ?? asRecord(data?.appliedCoupon);

  const subtotal =
    pickNumber(data?.subtotal, data?.sub_total) ??
    items.reduce((sum, item) => sum + (item.itemTotal ?? (item.unitPrice ?? 0) * item.quantity), 0);

  const couponDiscount = pickNumber(coupon?.discount_amount, coupon?.discountAmount) ?? 0;
  const totalDiscount =
    pickNumber(data?.total_discount, data?.totalDiscount, data?.discount) ?? couponDiscount;

  const totalAmount =
    pickNumber(data?.total_amount, data?.totalAmount, data?.total, data?.grandTotal) ??
    Math.max(0, subtotal - totalDiscount);

  const totalItemsCount =
    pickNumber(data?.total_items_count, data?.totalItemsCount, data?.itemCount) ??
    items.reduce((sum, item) => sum + item.quantity, 0);

  const totalUniqueProducts =
    pickNumber(data?.total_unique_products, data?.totalUniqueProducts) ?? items.length;

  const deliveryFee = pickNumber(
    data?.delivery_fee,
    data?.deliveryFee,
    data?.delivery_charge,
    data?.deliveryCharge,
  );
  const platformFee = pickNumber(
    data?.platform_fee,
    data?.platformFee,
    data?.service_fee,
    data?.serviceFee,
  );

  return {
    subtotal,
    totalDiscount,
    totalAmount,
    totalItemsCount,
    totalUniqueProducts,
    deliveryFee,
    platformFee,
    couponCode: pickString(coupon?.coupon_code, coupon?.couponCode),
    couponDiscount,
  };
};

export const parseCartResponse = (payload: unknown): FetchCartResult => {
  const root = asRecord(payload);
  const data = extractCartData(payload);
  const items = extractItemsArray(payload)
    .map((raw, index) => parseCartItem(raw, index))
    .filter((item): item is CartItem => Boolean(item));

  return {
    items,
    summary: parseCartSummary(data, items),
    message: pickString(root?.message),
    raw: payload,
  };
};

export type CartMutationResponse = {
  success?: boolean;
  message?: string;
  data?: unknown;
};

/**
 * Build application/x-www-form-urlencoded body as a plain string.
 * RN fetch historically drops URLSearchParams instances; a string body is reliable.
 */
const encodeFormBody = (fields: Record<string, string>) => {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(fields)) {
    params.append(key, value);
  }
  return params.toString();
};

/** Unique merchant ids present in the cart (normalized, non-empty). */
export const getCartMerchantIds = (items: CartItem[]): string[] => {
  const ids = new Set<string>();
  for (const item of items) {
    const id = item.merchantId?.trim();
    if (id) {
      ids.add(id);
    }
  }
  return Array.from(ids);
};

/**
 * Returns true when the cart already has items from a different merchant
 * than the one the user is trying to add from.
 */
export const hasDifferentMerchantInCart = (
  items: CartItem[],
  merchantId: string,
): boolean => {
  const target = merchantId.trim();
  if (!target) {
    return false;
  }
  const existing = getCartMerchantIds(items);
  return existing.some(id => id !== target);
};

export const cartApi = {
  addToCart(items: AddToCartItem[], token: string): Promise<AddToCartResponse> {
    const normalized = items.map(item => ({
      productId: String(item.productId).trim(),
      merchantId: String(item.merchantId).trim(),
      quantity: Number(item.quantity) > 0 ? Number(item.quantity) : 1,
    }));

    if (!normalized.length) {
      return Promise.reject(new Error('No items to add to cart.'));
    }
    if (normalized.some(item => !item.productId || !item.merchantId)) {
      return Promise.reject(new Error('Product and merchant are required to add to cart.'));
    }

    return apiRequest<AddToCartResponse>(API_ENDPOINTS.cartAdd, {
      method: 'POST',
      token,
      baseUrl: CART_API_BASE_URL,
      body: { items: normalized },
    });
  },

  async fetchCart(token: string): Promise<FetchCartResult> {
    const payload = await apiRequest<unknown>(API_ENDPOINTS.cart, {
      method: 'GET',
      token,
      baseUrl: CART_API_BASE_URL,
    });
    return parseCartResponse(payload);
  },

  updateItemQuantity(
    itemId: string,
    quantity: number,
    token: string,
  ): Promise<CartMutationResponse> {
    const id = itemId.trim();
    const qty = Math.floor(Number(quantity));
    if (!id) {
      return Promise.reject(new Error('Cart item id is required.'));
    }
    if (!Number.isFinite(qty) || qty < 1) {
      return Promise.reject(new Error('Quantity must be at least 1.'));
    }

    return apiRequest<CartMutationResponse>(API_ENDPOINTS.cartItem(id), {
      method: 'PATCH',
      token,
      baseUrl: CART_API_BASE_URL,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
      },
      body: encodeFormBody({ quantity: String(qty) }),
    });
  },

  deleteItem(itemId: string, token: string): Promise<CartMutationResponse> {
    const id = itemId.trim();
    if (!id) {
      return Promise.reject(new Error('Cart item id is required.'));
    }

    return apiRequest<CartMutationResponse>(API_ENDPOINTS.cartItem(id), {
      method: 'DELETE',
      token,
      baseUrl: CART_API_BASE_URL,
    });
  },

  clearCart(token: string): Promise<CartMutationResponse> {
    return apiRequest<CartMutationResponse>(API_ENDPOINTS.cartClear, {
      method: 'DELETE',
      token,
      baseUrl: CART_API_BASE_URL,
    });
  },
};
