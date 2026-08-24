import { API_BASE_URL, API_ENDPOINTS } from '../config/api';
import { Milestone } from '../types/milestone';
import { apiRequest } from './apiClient';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value && typeof value === 'object' && !Array.isArray(value));

const pickString = (...values: unknown[]): string | undefined => {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
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

const parseMilestone = (value: unknown): Milestone | undefined => {
  if (!isRecord(value)) {
    return undefined;
  }

  const id = pickString(value._id, value.id);
  const title = pickString(value.title);
  if (!id || !title) {
    return undefined;
  }

  const currentCount = pickNumber(value.currentCount, value.current_count) ?? 0;
  const targetCount = pickNumber(value.targetCount, value.target_count) ?? 0;
  const progressPercentage =
    pickNumber(value.progressPercentage, value.progress_percentage) ??
    (targetCount > 0 ? Math.round((currentCount / targetCount) * 100) : 0);

  const shop = isRecord(value.shop) ? value.shop : undefined;

  return {
    id,
    title,
    actionType: pickString(value.actionType, value.action_type) || 'CLAIM',
    rewardDescription:
      pickString(value.rewardDescription, value.reward_description) || '',
    rewardClaimCode: pickString(value.rewardClaimCode, value.reward_claim_code) ?? null,
    currentCount,
    targetCount,
    progressPercentage: Math.max(0, Math.min(100, Math.round(progressPercentage))),
    isCompleted: Boolean(value.isCompleted ?? value.is_completed),
    status: pickString(value.status) || 'IN_PROGRESS',
    expiresAt: pickString(value.expiresAt, value.expires_at),
    shopId: pickString(shop?._id, shop?.id, value.shopId) ?? null,
  };
};

export const formatMilestoneTimeLeft = (expiresAt?: string): string => {
  if (!expiresAt) {
    return '';
  }
  const end = new Date(expiresAt).getTime();
  if (Number.isNaN(end)) {
    return '';
  }
  const ms = end - Date.now();
  if (ms <= 0) {
    return 'Expired';
  }
  const days = Math.floor(ms / (1000 * 60 * 60 * 24));
  if (days >= 1) {
    return days === 1 ? '1 day left' : `${days} days left`;
  }
  const hours = Math.ceil(ms / (1000 * 60 * 60));
  if (hours <= 1) {
    return '1 hour left';
  }
  return `${hours} hours left`;
};

export const milestonesApi = {
  async fetchMilestones(token?: string): Promise<Milestone[]> {
    if (!token?.trim()) {
      return [];
    }

    const payload = await apiRequest<unknown>(API_ENDPOINTS.userMilestones, {
      method: 'GET',
      token,
      baseUrl: API_BASE_URL,
    });

    if (payload == null) {
      return [];
    }

    const data =
      isRecord(payload) && 'data' in payload ? payload.data : payload;

    if (data == null) {
      return [];
    }

    const list = Array.isArray(data)
      ? data
      : isRecord(data) && Array.isArray(data.milestones)
        ? data.milestones
        : [];

    return list
      .map(parseMilestone)
      .filter((item): item is Milestone => Boolean(item));
  },
};
