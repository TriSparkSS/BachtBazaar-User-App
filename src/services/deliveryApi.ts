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
};
