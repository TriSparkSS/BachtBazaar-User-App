import { API_ENDPOINTS, DELIVERY_API_BASE_URL } from '../config/api';
import { apiRequest } from './apiClient';

export type CreateDeliveryOrderPayload = {
  merchantId: string;
  productId: string;
  customItemName: string;
  quantity: number | string;
  itemPrice: number | string;
  note?: string;
  deliveryAddress: string;
  phone: string;
};

export type DeliveryOrderData = {
  _id?: string;
  id?: string;
  orderId?: string;
  status?: string;
  [key: string]: unknown;
};

export type CreateDeliveryOrderResponse = {
  success?: boolean;
  message?: string;
  data?: DeliveryOrderData | null;
  order?: DeliveryOrderData | null;
  _id?: string;
  id?: string;
  orderId?: string;
};

export type CancelDeliveryOrderResponse = {
  success?: boolean;
  message?: string;
  data?: DeliveryOrderData | null;
};

export type DeliveryOrderListItem = {
  id: string;
  status?: string;
  address?: string;
  productName?: string;
  productThumbnail?: string;
  merchantName?: string;
  merchantId?: string;
  productId?: string;
  quantity?: string;
  itemPrice?: string;
  deliveryFee?: string;
  totalAmount?: string;
  createdAt?: string;
  updatedAt?: string;
  phone?: string;
  note?: string;
  raw: Record<string, unknown>;
};

/**
 * True when a delivery order is still waiting for merchant acceptance.
 * Matches flexibly (pending / waiting / requested / awaiting_acceptance / …)
 * while excluding accepted, cancelled, delivered, and other terminal states.
 */
const normalizeDeliveryStatus = (status?: string | null): string =>
  String(status ?? '')
    .toLowerCase()
    .trim()
    .replace(/[\s-]+/g, '_');

export const isWaitingDeliveryStatus = (status?: string | null): boolean => {
  const normalized = normalizeDeliveryStatus(status);

  if (!normalized) {
    return false;
  }

  // Check waiting patterns first — "awaiting_acceptance" also contains "accept".
  if (
    normalized.includes('await') ||
    normalized.includes('waiting') ||
    normalized.includes('pending') ||
    normalized.includes('requested') ||
    normalized === 'request' ||
    normalized.includes('waiting_for_acceptance') ||
    normalized.includes('awaiting_acceptance') ||
    normalized.includes('sent') ||
    normalized === 'open' ||
    normalized === 'created' ||
    normalized === 'new' ||
    normalized === 'placed'
  ) {
    if (
      normalized.includes('cancel') ||
      normalized.includes('reject') ||
      normalized.includes('declin')
    ) {
      return false;
    }
    return true;
  }

  if (
    normalized.includes('accept') ||
    normalized.includes('assign') ||
    normalized.includes('deliver') ||
    normalized.includes('complete') ||
    normalized.includes('success') ||
    normalized.includes('cancel') ||
    normalized.includes('reject') ||
    normalized.includes('fail') ||
    normalized.includes('declin')
  ) {
    return false;
  }

  return false;
};

/** Merchant has accepted / confirmed; order is in progress but not delivered. */
export const isAcceptedDeliveryStatus = (status?: string | null): boolean => {
  const normalized = normalizeDeliveryStatus(status);
  if (!normalized || isWaitingDeliveryStatus(normalized)) {
    return false;
  }
  if (
    normalized.includes('cancel') ||
    normalized.includes('reject') ||
    normalized.includes('declin') ||
    normalized.includes('fail') ||
    normalized.includes('complete') ||
    normalized.includes('success') ||
    (normalized.includes('deliver') && !normalized.includes('out_for'))
  ) {
    return false;
  }
  return (
    normalized === 'accepted' ||
    normalized === 'confirmed' ||
    normalized === 'assigned' ||
    normalized.includes('accept') ||
    normalized.includes('confirm') ||
    normalized.includes('assign')
  );
};

/**
 * Orders that should drive the floating delivery chip:
 * waiting for acceptance, or accepted (in progress) — not delivered/cancelled.
 */
export const isBannerTrackableDeliveryStatus = (
  status?: string | null,
): boolean =>
  isWaitingDeliveryStatus(status) || isAcceptedDeliveryStatus(status);

export type DeliveryOrderItemDetail = {
  id?: string;
  productId?: string;
  productName?: string;
  quantity?: string;
  unitPrice?: string;
  unitPriceRaw?: number;
  itemTotal?: string;
  itemTotalRaw?: number;
  productThumbnail?: string;
  variantInfo?: string;
};

/** Enriched detail payload for the order detail screen. */
export type DeliveryOrderDetail = DeliveryOrderListItem & {
  productImage?: string;
  merchantPhone?: string;
  merchantLogo?: string;
  merchantAddress?: string;
  platformFee?: string;
  itemPriceRaw?: number;
  deliveryFeeRaw?: number;
  platformFeeRaw?: number;
  totalAmountRaw?: number;
  cancelReason?: string;
  eta?: string;
  orderNumber?: string;
  paymentStatus?: string;
  expectedDeliveryAt?: string;
  contactPhone?: string;
  userName?: string;
  userPhone?: string;
  userId?: string;
  items?: DeliveryOrderItemDetail[];
  /** Optional progress / stage payload from the API when present. */
  trackingMeta?: unknown;
};

export type ListDeliveryOrdersResponse = {
  success?: boolean;
  message?: string;
  data?: unknown;
  orders?: unknown;
  deliveryOrders?: unknown;
};

export type DeliveryOrderDetailResponse = {
  success?: boolean;
  message?: string;
  data?: unknown;
  order?: unknown;
  deliveryOrder?: unknown;
};

/**
 * Build application/x-www-form-urlencoded body as a plain string.
 * RN fetch historically drops URLSearchParams instances; a string body is reliable.
 */
const encodeFormBody = (fields: Record<string, string>) => {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(fields)) {
    // Always append literal keys — including empty strings — so Express sees the field names.
    params.append(key, value);
  }
  return params.toString();
};

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

const asString = (value: unknown): string | undefined => {
  if (typeof value === 'string' && value.trim()) {
    return value.trim();
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }
  return undefined;
};

const pickString = (
  record: Record<string, unknown> | null,
  keys: string[],
): string | undefined => {
  if (!record) {
    return undefined;
  }
  for (const key of keys) {
    const found = asString(record[key]);
    if (found) {
      return found;
    }
  }
  return undefined;
};

const pickNestedName = (
  record: Record<string, unknown> | null,
  keys: string[],
): string | undefined => {
  if (!record) {
    return undefined;
  }
  for (const key of keys) {
    const nested = asRecord(record[key]);
    const name = pickString(nested, [
      'name',
      'shopName',
      'merchantName',
      'title',
      'productName',
      'customItemName',
    ]);
    if (name) {
      return name;
    }
    const direct = asString(record[key]);
    if (direct && key.toLowerCase().includes('name')) {
      return direct;
    }
  }
  return undefined;
};

const formatMoney = (value: unknown): string | undefined => {
  const raw = asString(value);
  if (!raw) {
    return undefined;
  }
  const num = Number(raw);
  if (!Number.isFinite(num)) {
    return raw;
  }
  return `₹${num.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
};

const parseMoneyNumber = (value: unknown): number | undefined => {
  const raw = asString(value);
  if (!raw) {
    return undefined;
  }
  const num = Number(String(raw).replace(/[^\d.-]/g, ''));
  return Number.isFinite(num) ? num : undefined;
};

const pickImagePath = (
  record: Record<string, unknown> | null,
  keys: string[],
): string | undefined => {
  if (!record) {
    return undefined;
  }
  for (const key of keys) {
    const direct = asString(record[key]);
    if (direct) {
      return direct;
    }
    const nested = asRecord(record[key]);
    const nestedUrl = pickString(nested, [
      'url',
      'uri',
      'path',
      'src',
      'secure_url',
      'thumbnail',
    ]);
    if (nestedUrl) {
      return nestedUrl;
    }
  }
  return undefined;
};

const pickNestedId = (
  record: Record<string, unknown> | null,
  keys: string[],
): string | undefined => {
  if (!record) {
    return undefined;
  }
  for (const key of keys) {
    const nested = asRecord(record[key]);
    const nestedId = pickString(nested, ['_id', 'id']);
    if (nestedId) {
      return nestedId;
    }
    const direct = asString(record[key]);
    if (direct) {
      return direct;
    }
  }
  return undefined;
};

const formatEta = (value: unknown): string | undefined => {
  if (!value) {
    return undefined;
  }
  if (typeof value === 'string' || typeof value === 'number') {
    return asString(value);
  }
  const record = asRecord(value);
  if (!record) {
    return undefined;
  }
  const amount = asString(record.value ?? record.amount ?? record.duration);
  const unit = asString(record.unit ?? record.units);
  if (amount && unit) {
    return `${amount} ${unit}`;
  }
  return (
    pickString(record, ['label', 'text', 'formatted', 'display']) ||
    amount ||
    unit
  );
};

const formatDeliveryAddress = (value: unknown): string | undefined => {
  if (typeof value === 'string' && value.trim()) {
    return value.trim();
  }
  const addressObj = asRecord(value);
  if (!addressObj) {
    return undefined;
  }
  const parts = [
    pickString(addressObj, [
      'street',
      'line1',
      'address1',
      'addressLine1',
      'fullAddress',
      'formatted',
      'full',
      'text',
      'label',
    ]),
    pickString(addressObj, ['landmark']),
    pickString(addressObj, ['city']),
    pickString(addressObj, ['state']),
    pickString(addressObj, ['pincode', 'zip', 'postalCode']),
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(', ') : undefined;
};

const parseDeliveryOrderItem = (
  raw: Record<string, unknown>,
  index = 0,
): DeliveryOrderItemDetail => {
  const product = asRecord(raw.productId) ?? asRecord(raw.product) ?? asRecord(raw.item);
  const unitPriceRaw = parseMoneyNumber(
    raw.unitPrice ?? raw.price ?? raw.itemPrice ?? product?.price,
  );
  const itemTotalRaw = parseMoneyNumber(
    raw.itemTotal ?? raw.total ?? raw.lineTotal ?? raw.amount,
  );
  const quantity = pickString(raw, ['quantity', 'qty']) || '1';

  return {
    id:
      pickString(raw, ['_id', 'id']) ||
      pickNestedId(raw, ['productId', 'product', 'item']) ||
      `item-${index}`,
    productId:
      pickNestedId(raw, ['productId', 'product', 'item']) ||
      pickString(raw, ['productId', 'itemId']),
    productName:
      pickString(raw, [
        'productName',
        'customItemName',
        'itemName',
        'title',
        'name',
      ]) ||
      pickString(product, ['productName', 'title', 'name', 'customItemName']),
    quantity,
    unitPrice: formatMoney(unitPriceRaw ?? raw.unitPrice ?? raw.price),
    unitPriceRaw,
    itemTotal: formatMoney(
      itemTotalRaw ??
        (unitPriceRaw != null && Number.isFinite(Number(quantity))
          ? unitPriceRaw * Number(quantity)
          : undefined) ??
        raw.itemTotal,
    ),
    itemTotalRaw,
    productThumbnail:
      pickImagePath(raw, [
        'productThumbnail',
        'thumbnail',
        'image',
        'photo',
        'productImage',
      ]) ||
      pickImagePath(product, [
        'thumbnail',
        'image',
        'photo',
        'productImage',
        'imageUrl',
      ]),
    variantInfo: pickString(raw, ['variantInfo', 'variant', 'variants']),
  };
};

const extractOrderItems = (
  raw: Record<string, unknown>,
): DeliveryOrderItemDetail[] => {
  const candidates: unknown[] = [
    raw.items,
    raw.orderItems,
    raw.products,
    asRecord(raw.order)?.items,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate) && candidate.length > 0) {
      return candidate
        .filter(
          (item): item is Record<string, unknown> =>
            Boolean(item) && typeof item === 'object' && !Array.isArray(item),
        )
        .map((item, index) => parseDeliveryOrderItem(item, index));
    }
  }

  return [];
};

/** Pull an array of order-like objects from common list response shapes. */
export const extractDeliveryOrdersList = (payload: unknown): Record<string, unknown>[] => {
  if (Array.isArray(payload)) {
    return payload.filter(
      (item): item is Record<string, unknown> =>
        Boolean(item) && typeof item === 'object' && !Array.isArray(item),
    );
  }

  const root = asRecord(payload);
  if (!root) {
    return [];
  }

  const candidates: unknown[] = [
    root.data,
    root.orders,
    root.deliveryOrders,
    root.results,
    root.items,
    asRecord(root.data)?.orders,
    asRecord(root.data)?.deliveryOrders,
    asRecord(root.data)?.data,
    asRecord(root.data)?.results,
    asRecord(root.data)?.items,
    asRecord(root.orders)?.data,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate.filter(
        (item): item is Record<string, unknown> =>
          Boolean(item) && typeof item === 'object' && !Array.isArray(item),
      );
    }
  }

  // Single order object under data
  const single = asRecord(root.data);
  if (single && (single._id || single.id || single.orderId)) {
    return [single];
  }

  return [];
};

export const parseDeliveryOrderListItem = (
  raw: Record<string, unknown>,
  index = 0,
): DeliveryOrderListItem => {
  const merchant =
    asRecord(raw.merchantId) ??
    asRecord(raw.merchant) ??
    asRecord(raw.shop) ??
    asRecord(raw.store);
  const product =
    asRecord(raw.productId) ??
    asRecord(raw.product) ??
    asRecord(raw.item) ??
    asRecord(raw.offer);
  const items = extractOrderItems(raw);
  const firstItem = items[0];
  const address =
    formatDeliveryAddress(raw.deliveryAddress) ||
    formatDeliveryAddress(raw.address) ||
    formatDeliveryAddress(raw.shippingAddress) ||
    pickString(raw, [
      'deliveryAddress',
      'address',
      'fullAddress',
      'shippingAddress',
      'userAddress',
    ]);

  const id =
    pickString(raw, ['_id', 'id', 'orderId', 'deliveryOrderId', 'requestId']) ||
    `order-${index}`;

  const productThumbnail =
    pickImagePath(raw, [
      'productThumbnail',
      'thumbnail',
      'productImage',
      'itemImage',
      'image',
      'photo',
    ]) ||
    firstItem?.productThumbnail ||
    pickImagePath(product, [
      'thumbnail',
      'image',
      'photo',
      'productImage',
      'imageUrl',
    ]);

  return {
    id,
    status: pickString(raw, ['status', 'orderStatus', 'deliveryStatus', 'state']),
    address,
    productName:
      pickString(raw, [
        'customItemName',
        'productName',
        'itemName',
        'title',
        'name',
      ]) ||
      firstItem?.productName ||
      pickNestedName(raw, ['product', 'item', 'offer']) ||
      pickString(product, ['customItemName', 'title', 'name', 'productName']),
    productThumbnail,
    merchantName:
      pickString(raw, ['merchantName', 'shopName', 'storeName', 'sellerName']) ||
      pickString(merchant, ['name', 'shopName', 'merchantName', 'title']) ||
      pickNestedName(raw, ['merchantId', 'merchant', 'shop', 'store']),
    merchantId:
      pickNestedId(raw, ['merchantId', 'merchant', 'shop', 'store']) ||
      pickString(raw, ['merchantId', 'shopId', 'storeId']) ||
      pickString(merchant, ['_id', 'id', 'merchantId', 'shopId']),
    productId:
      pickNestedId(raw, ['productId', 'product', 'item']) ||
      firstItem?.productId ||
      pickString(raw, ['productId', 'itemId']) ||
      pickString(product, ['_id', 'id', 'productId']),
    quantity:
      pickString(raw, ['quantity', 'qty']) || firstItem?.quantity,
    itemPrice: formatMoney(
      raw.itemPrice ??
        raw.price ??
        raw.productPrice ??
        firstItem?.unitPriceRaw ??
        firstItem?.itemTotalRaw,
    ),
    deliveryFee: formatMoney(raw.deliveryFee ?? raw.deliveryCharge ?? raw.shippingFee),
    totalAmount: formatMoney(
      raw.totalAmount ?? raw.total ?? raw.grandTotal ?? raw.amount,
    ),
    createdAt: pickString(raw, ['createdAt', 'created_at', 'placedAt', 'requestedAt']),
    updatedAt: pickString(raw, ['updatedAt', 'updated_at']),
    phone: pickString(raw, ['phone', 'mobile', 'contactPhone', 'userPhone']),
    note: pickString(raw, ['note', 'notes', 'remark', 'comments']),
    raw,
  };
};

/** Pull a single order object from common detail response shapes. */
export const extractDeliveryOrderDetail = (
  payload: unknown,
): Record<string, unknown> | null => {
  const root = asRecord(payload);
  if (!root) {
    return null;
  }

  const candidates: unknown[] = [
    root.data,
    root.order,
    root.deliveryOrder,
    asRecord(root.data)?.order,
    asRecord(root.data)?.deliveryOrder,
    asRecord(root.data)?.data,
    root,
  ];

  for (const candidate of candidates) {
    const record = asRecord(candidate);
    if (record && (record._id || record.id || record.orderId || record.status)) {
      return record;
    }
  }

  return null;
};

export const parseDeliveryOrderDetail = (
  raw: Record<string, unknown>,
): DeliveryOrderDetail => {
  const base = parseDeliveryOrderListItem(raw);
  const merchant =
    asRecord(raw.merchantId) ??
    asRecord(raw.merchant) ??
    asRecord(raw.shop) ??
    asRecord(raw.store);
  const user =
    asRecord(raw.userId) ??
    asRecord(raw.user) ??
    asRecord(raw.customer);
  const product =
    asRecord(raw.product) ?? asRecord(raw.item) ?? asRecord(raw.offer);
  const items = extractOrderItems(raw);
  const firstItem = items[0];

  const itemPriceRaw =
    parseMoneyNumber(raw.itemPrice ?? raw.price ?? raw.productPrice ?? raw.subtotal) ??
    firstItem?.itemTotalRaw ??
    firstItem?.unitPriceRaw ??
    parseMoneyNumber(base.itemPrice);
  const deliveryFeeRaw =
    parseMoneyNumber(raw.deliveryFee ?? raw.deliveryCharge ?? raw.shippingFee) ??
    parseMoneyNumber(base.deliveryFee);
  const platformFeeRaw = parseMoneyNumber(
    raw.platformFee ?? raw.serviceFee ?? raw.appFee ?? raw.convenienceFee,
  );
  const totalAmountRaw =
    parseMoneyNumber(raw.totalAmount ?? raw.total ?? raw.grandTotal ?? raw.amount) ??
    parseMoneyNumber(base.totalAmount);

  const merchantPhone =
    pickString(merchant, ['phone', 'mobile', 'contactPhone', 'contact']) ||
    pickString(raw, ['merchantPhone', 'shopPhone', 'storePhone', 'sellerPhone']);

  const merchantAddress =
    pickString(merchant, ['address', 'fullAddress', 'location']) ||
    pickString(raw, ['merchantAddress', 'shopAddress', 'storeAddress']);

  const contactPhone =
    pickString(raw, ['contactPhone', 'phone', 'mobile', 'userPhone']) ||
    pickString(user, ['phone', 'mobile', 'contactPhone']);

  const userName =
    pickString(user, ['name', 'fullName', 'userName', 'customerName']) ||
    pickString(raw, ['userName', 'customerName', 'customer']);

  const userPhone = pickString(user, ['phone', 'mobile', 'contactPhone']) || contactPhone;

  const eta =
    formatEta(raw.estimatedDeliveryTime) ||
    formatEta(raw.eta) ||
    formatEta(raw.estimatedDelivery) ||
    formatEta(raw.deliveryEta) ||
    pickString(raw, ['eta', 'estimatedDelivery', 'deliveryEta']);

  const productImage =
    firstItem?.productThumbnail ||
    pickImagePath(raw, [
      'productImage',
      'itemImage',
      'image',
      'thumbnail',
      'photo',
      'productThumbnail',
    ]) ||
    pickImagePath(product, [
      'image',
      'thumbnail',
      'photo',
      'productImage',
      'imageUrl',
      'logo',
    ]);

  return {
    ...base,
    productName: base.productName || firstItem?.productName,
    productId: base.productId || firstItem?.productId,
    quantity: base.quantity || firstItem?.quantity,
    merchantName:
      base.merchantName ||
      pickString(merchant, ['name', 'shopName', 'merchantName', 'title']),
    merchantId:
      base.merchantId ||
      pickString(merchant, ['_id', 'id', 'merchantId', 'shopId']),
    productImage,
    merchantPhone,
    merchantLogo:
      pickImagePath(merchant, ['logo', 'avatar', 'image', 'thumbnail', 'photo']) ||
      pickImagePath(raw, ['merchantLogo', 'shopLogo', 'storeLogo']),
    merchantAddress,
    platformFee: formatMoney(
      raw.platformFee ?? raw.serviceFee ?? raw.appFee ?? raw.convenienceFee,
    ),
    itemPrice: formatMoney(itemPriceRaw) || base.itemPrice,
    itemPriceRaw,
    deliveryFeeRaw,
    platformFeeRaw,
    totalAmountRaw,
    cancelReason: pickString(raw, ['cancelReason', 'cancellationReason', 'reason']),
    eta,
    orderNumber: pickString(raw, ['orderNumber', 'orderNo', 'orderCode', 'deliveryOrderNumber']),
    paymentStatus: pickString(raw, ['paymentStatus', 'payment_status', 'paymentState']),
    expectedDeliveryAt: pickString(raw, [
      'expectedDeliveryAt',
      'expectedDelivery',
      'estimatedDeliveryAt',
      'deliveryAt',
    ]),
    contactPhone,
    userName,
    userPhone,
    userId: pickNestedId(raw, ['userId', 'user', 'customer']) || pickString(user, ['_id', 'id']),
    items,
    trackingMeta:
      raw.trackingMeta ??
      raw.tracking_meta ??
      raw.progressMeta ??
      raw.deliveryProgress ??
      raw.tracking ??
      undefined,
    // Prefer contactPhone / user phone for delivery contact display.
    phone: contactPhone || base.phone || userPhone,
  };
};

/** Best-effort order id from common delivery-order response shapes. */
export const extractDeliveryOrderId = (
  response: CreateDeliveryOrderResponse | null | undefined,
): string | undefined => {
  if (!response) {
    return undefined;
  }

  const data = asRecord(response.data) ?? asRecord(response.order);
  const candidates = [
    response._id,
    response.id,
    response.orderId,
    data?._id,
    data?.id,
    data?.orderId,
    asRecord(data?.order)?._id,
    asRecord(data?.order)?.id,
  ];

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

export const deliveryApi = {
  createOrder(
    payload: CreateDeliveryOrderPayload,
    token: string,
  ): Promise<CreateDeliveryOrderResponse> {
    const deliveryAddress = String(payload.deliveryAddress ?? '').trim();

    if (!deliveryAddress) {
      return Promise.reject(new Error('Delivery address is required.'));
    }

    const fields: Record<string, string> = {
      merchantId: String(payload.merchantId).trim(),
      productId: String(payload.productId).trim(),
      customItemName: String(payload.customItemName).trim(),
      quantity: String(payload.quantity),
      itemPrice: String(payload.itemPrice),
      note: payload.note?.trim() || '',
      street: 'Sahibzada Ajit Singh Nagar',
      city: 'mohali',
      deliveryAddress,
      phone: String(payload.phone).trim(),
    };

    console.log('[API] delivery-orders body', {
      street: fields.street,
      city: fields.city,
      deliveryAddress: fields.deliveryAddress,
      merchantId: fields.merchantId,
      productId: fields.productId,
      customItemName: fields.customItemName,
      quantity: fields.quantity,
      itemPrice: fields.itemPrice,
      note: fields.note ? '[set]' : '',
      phone: fields.phone ? `[len=${fields.phone.length}]` : '',
      keys: Object.keys(fields),
    });

    const body = encodeFormBody(fields);

    return apiRequest<CreateDeliveryOrderResponse>(API_ENDPOINTS.createDeliveryOrder, {
      method: 'POST',
      token,
      baseUrl: DELIVERY_API_BASE_URL,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
      },
      body,
    });
  },

  cancelOrder(
    orderId: string,
    cancelReason: string,
    token: string,
  ): Promise<CancelDeliveryOrderResponse> {
    const trimmedId = String(orderId ?? '').trim();
    if (!trimmedId) {
      return Promise.reject(new Error('Delivery order id is required.'));
    }

    return apiRequest<CancelDeliveryOrderResponse>(
      API_ENDPOINTS.cancelDeliveryOrder(trimmedId),
      {
        method: 'PATCH',
        token,
        baseUrl: DELIVERY_API_BASE_URL,
        body: {
          cancelReason: cancelReason.trim() || 'Order placed by mistake.',
        },
      },
    );
  },

  async fetchDeliveryOrders(token: string): Promise<DeliveryOrderListItem[]> {
    const trimmed = String(token ?? '').trim();
    if (!trimmed) {
      return Promise.reject(new Error('Login required to load delivery orders.'));
    }

    const response = await apiRequest<ListDeliveryOrdersResponse>(
      API_ENDPOINTS.listDeliveryOrders,
      {
        method: 'GET',
        token: trimmed,
        baseUrl: DELIVERY_API_BASE_URL,
      },
    );

    return extractDeliveryOrdersList(response).map((item, index) =>
      parseDeliveryOrderListItem(item, index),
    );
  },

  /**
   * GET /api/delivery/user/delivery-orders/:orderId
   * Same base as list: DELIVERY_API_BASE_URL (…/api).
   */
  async fetchDeliveryOrderDetail(
    orderId: string,
    token: string,
  ): Promise<DeliveryOrderDetail> {
    const trimmedId = String(orderId ?? '').trim();
    const trimmedToken = String(token ?? '').trim();
    if (!trimmedId) {
      return Promise.reject(new Error('Delivery order id is required.'));
    }
    if (!trimmedToken) {
      return Promise.reject(new Error('Login required to load delivery order detail.'));
    }

    const response = await apiRequest<DeliveryOrderDetailResponse>(
      API_ENDPOINTS.deliveryOrderDetail(trimmedId),
      {
        method: 'GET',
        token: trimmedToken,
        baseUrl: DELIVERY_API_BASE_URL,
      },
    );

    const raw = extractDeliveryOrderDetail(response);
    if (!raw) {
      throw new Error('Delivery order detail was empty or unrecognized.');
    }

    return parseDeliveryOrderDetail(raw);
  },
};
