import { API_BASE_URL, API_ENDPOINTS } from '../config/api';
import { ReferralCodeInfo, ReferralListItem } from '../types/referral';
import { apiRequest } from './apiClient';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value && typeof value === 'object' && !Array.isArray(value));

const pickString = (...values: unknown[]): string | undefined => {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
    if (typeof value === 'number' && !Number.isNaN(value)) {
      return String(value);
    }
  }
  return undefined;
};

const pickNumber = (...values: unknown[]): number | undefined => {
  for (const value of values) {
    if (typeof value === 'number' && !Number.isNaN(value)) {
      return value;
    }
    if (typeof value === 'string' && value.trim() && !Number.isNaN(Number(value))) {
      return Number(value);
    }
  }
  return undefined;
};

const unwrapData = (payload: unknown): unknown => {
  if (isRecord(payload) && 'data' in payload) {
    return payload.data;
  }
  return payload;
};

const parseReferralItem = (value: unknown): ReferralListItem | undefined => {
  if (!isRecord(value)) {
    return undefined;
  }

  const referred = isRecord(value.referredUser)
    ? value.referredUser
    : isRecord(value.user)
      ? value.user
      : value;

  const id =
    pickString(value._id, value.id, referred._id, referred.id) ||
    pickString(referred.phone, value.phone) ||
    '';
  if (!id) {
    return undefined;
  }

  const name =
    pickString(referred.name, value.name, value.fullName) ||
    pickString(referred.phone, value.phone) ||
    'Referral';

  return {
    id,
    name,
    phone: pickString(referred.phone, value.phone),
    status: pickString(value.status),
    joinedAt: pickString(
      value.joinedAt,
      value.joined_at,
      value.createdAt,
      value.created_at,
    ),
  };
};

export const referralsApi = {
  async fetchMyCode(token: string): Promise<ReferralCodeInfo> {
    const payload = await apiRequest<unknown>(API_ENDPOINTS.referralsMyCode, {
      method: 'GET',
      token,
      baseUrl: API_BASE_URL,
    });

    const data = unwrapData(payload);
    if (!isRecord(data)) {
      throw new Error('Could not load referral code.');
    }

    const referralCode = pickString(data.referralCode, data.referral_code, data.code);
    if (!referralCode) {
      throw new Error('Referral code not available.');
    }

    return {
      referralCode,
      totalReferrals: pickNumber(data.totalReferrals, data.total_referrals) ?? 0,
    };
  },

  async fetchList(token: string): Promise<ReferralListItem[]> {
    const payload = await apiRequest<unknown>(API_ENDPOINTS.referralsList, {
      method: 'GET',
      token,
      baseUrl: API_BASE_URL,
    });

    if (payload == null) {
      return [];
    }

    const data = unwrapData(payload);
    if (data == null) {
      return [];
    }

    const list = Array.isArray(data)
      ? data
      : isRecord(data) && Array.isArray(data.referrals)
        ? data.referrals
        : isRecord(payload) && Array.isArray(payload.data)
          ? payload.data
          : [];

    return list
      .map(parseReferralItem)
      .filter((item): item is ReferralListItem => Boolean(item));
  },
};
