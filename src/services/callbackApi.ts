import { API_ENDPOINTS, HELP_API_BASE_URL } from '../config/api';
import { apiRequest } from './apiClient';

export type UserCallbackRequest = {
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  topic: string;
  message: string;
  preferredCallTime: string;
};

export const PREFERRED_CALL_TIMES = [
  '10:00 AM - 12:00 PM',
  '12:00 PM - 2:00 PM',
  '2:00 PM - 4:00 PM',
  '4:00 PM - 6:00 PM',
] as const;

export const callbackApi = {
  requestCall(token: string, payload: UserCallbackRequest) {
    return apiRequest<{ success?: boolean; message?: string }>(
      API_ENDPOINTS.userCallback,
      {
        method: 'POST',
        token,
        baseUrl: HELP_API_BASE_URL,
        headers: { 'Content-Type': 'application/json' },
        body: payload,
      },
    );
  },
};
