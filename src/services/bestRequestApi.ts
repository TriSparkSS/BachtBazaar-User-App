import { API_ENDPOINTS } from '../config/api';
import { apiRequest } from './apiClient';
import { RequestUrgency } from '../types/createRequest';

export type CreateBestRequestPayload = {
  title: string;
  categoryId: string;
  description?: string;
  budget?: string;
  urgency: RequestUrgency;
  formattedAddress: string;
};

export type BestRequestData = {
  _id: string;
  userId: string;
  title: string;
  description?: string;
  categoryId: string;
  budget?: number;
  timeframe: string;
  latitude?: number;
  longitude?: number;
  formattedAddress?: string;
  city?: string;
  status?: string;
  bidCount?: number;
  expiresAt?: string;
  createdAt?: string;
  updatedAt?: string;
};

type CreateBestRequestResponse = {
  success: boolean;
  message?: string;
  data: BestRequestData;
};

export const mapUrgencyToTimeframe = (urgency: RequestUrgency): string => {
  switch (urgency) {
    case 'today':
      return 'today';
    case 'soon':
      return 'within 2 days';
    case 'flexible':
    default:
      return 'flexible';
  }
};

const encodeFormBody = (fields: Record<string, string>) =>
  Object.entries(fields)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join('&');

export const bestRequestApi = {
  create(payload: CreateBestRequestPayload, token: string): Promise<CreateBestRequestResponse> {
    const budgetValue = String(payload.budget ?? '').replace(/[^\d.]/g, '') || '0';

    const body = encodeFormBody({
      title: payload.title.trim(),
      categoryId: payload.categoryId.trim(),
      description: (
        payload.description?.trim() || `Looking for best offers on ${payload.title.trim()}`
      ).trim(),
      budget: budgetValue,
      timeframe: mapUrgencyToTimeframe(payload.urgency),
      formattedAddress: payload.formattedAddress.trim(),
    });

    return apiRequest<CreateBestRequestResponse>(API_ENDPOINTS.createBestRequest, {
      method: 'POST',
      token,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body,
    });
  },
};
