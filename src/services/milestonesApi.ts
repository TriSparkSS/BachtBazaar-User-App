import { API_BASE_URL, API_ENDPOINTS } from '../config/api';
import { Milestone } from '../types/milestone';
import { apiRequest } from './apiClient';

const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const;

const ACTION_TYPE_LABELS: Record<string, string> = {
  STORE_FOOTFALL: 'Store Footfall',
  OFFER_CLAIMS: 'Offer Claims',
  OFFER_CLAIM: 'Offer Claims',
  CLAIM: 'Offer Claims',
  REDEEM: 'Offer Claims',
  PRODUCT: 'Product',
  BANNER: 'Banner',
};

export type MilestoneBucket = 'active' | 'done' | 'cancelled' | 'expired';

export type MilestoneFilter = 'all' | MilestoneBucket;

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

const unwrapMilestoneRecord = (value: unknown): Record<string, unknown> | undefined => {
  if (!isRecord(value)) {
    return undefined;
  }
  if (isRecord(value.data) && (value.data._id || value.data.id || value.data.title)) {
    return value.data;
  }
  if (isRecord(value.milestone) && (value.milestone._id || value.milestone.id)) {
    return value.milestone;
  }
  if (isRecord(value.userGoal) && (value.userGoal._id || value.userGoal.id)) {
    return value.userGoal;
  }
  if (isRecord(value.goal) && (value.goal._id || value.goal.id)) {
    return value.goal;
  }
  return value;
};

export const parseMilestone = (value: unknown): Milestone | undefined => {
  const record = unwrapMilestoneRecord(value);
  if (!record) {
    return undefined;
  }

  const id = pickString(record._id, record.id);
  const title = pickString(record.title, record.name, record.goalTitle);
  if (!id || !title) {
    return undefined;
  }

  const currentCount = pickNumber(record.currentCount, record.current_count) ?? 0;
  const targetCount = pickNumber(record.targetCount, record.target_count) ?? 0;
  const progressPercentage =
    pickNumber(record.progressPercentage, record.progress_percentage) ??
    (targetCount > 0 ? Math.round((currentCount / targetCount) * 100) : 0);

  const shop = isRecord(record.shop) ? record.shop : undefined;
  const merchant = isRecord(record.merchant)
    ? record.merchant
    : isRecord(shop?.merchant)
      ? shop.merchant
      : undefined;
  const assignedBy = isRecord(record.assignedBy) ? record.assignedBy : undefined;

  const shopName =
    pickString(
      shop?.shopName,
      shop?.shop_name,
      shop?.name,
      shop?.title,
      record.shopName,
      record.shop_name,
      merchant?.shopName,
      assignedBy?.shopName,
    ) ?? null;

  const merchantName =
    pickString(
      merchant?.name,
      merchant?.fullName,
      assignedBy?.name,
      record.merchantName,
      record.merchant_name,
      shopName,
    ) ?? null;

  const merchantPhone =
    pickString(
      merchant?.phone,
      merchant?.mobile,
      shop?.phone,
      assignedBy?.phone,
      record.merchantPhone,
      record.merchant_phone,
      record.phone,
    ) ?? null;

  return {
    id,
    title,
    actionType: pickString(record.actionType, record.action_type, record.type) || 'CLAIM',
    rewardDescription:
      pickString(
        record.rewardDescription,
        record.reward_description,
        record.reward,
        record.rewardText,
      ) || '',
    rewardClaimCode: pickString(record.rewardClaimCode, record.reward_claim_code) ?? null,
    currentCount,
    targetCount,
    progressPercentage: Math.max(0, Math.min(100, Math.round(progressPercentage))),
    isCompleted: Boolean(record.isCompleted ?? record.is_completed),
    status: pickString(record.status) || 'IN_PROGRESS',
    expiresAt: pickString(record.expiresAt, record.expires_at, record.expiryDate),
    createdAt: pickString(record.createdAt, record.created_at),
    shopId: pickString(shop?._id, shop?.id, record.shopId, record.shop_id) ?? null,
    shopName,
    merchantId:
      pickString(
        merchant?._id,
        merchant?.id,
        assignedBy?._id,
        assignedBy?.id,
        record.merchantId,
        record.merchant_id,
      ) ?? null,
    merchantName,
    merchantPhone,
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

export const formatActionTypeLabel = (actionType: string): string => {
  const raw = actionType.trim();
  if (!raw) {
    return 'Task';
  }
  const key = raw.toUpperCase().replace(/[\s-]+/g, '_');
  if (ACTION_TYPE_LABELS[key]) {
    return ACTION_TYPE_LABELS[key];
  }
  return raw
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, char => char.toUpperCase());
};

export const getMilestoneBucket = (milestone: Milestone): MilestoneBucket => {
  const status = (milestone.status || '').toUpperCase();
  if (status.includes('CANCEL')) {
    return 'cancelled';
  }
  if (status.includes('COMPLETE') || status.includes('DONE') || milestone.isCompleted) {
    return 'done';
  }
  if (status.includes('EXPIRE')) {
    return 'expired';
  }
  if (milestone.expiresAt) {
    const end = new Date(milestone.expiresAt).getTime();
    if (!Number.isNaN(end) && end <= Date.now()) {
      return 'expired';
    }
  }
  return 'active';
};

export const formatMilestoneStatusLabel = (milestone: Milestone): string => {
  switch (getMilestoneBucket(milestone)) {
    case 'done':
      return 'Done';
    case 'cancelled':
      return 'Cancelled';
    case 'expired':
      return 'Expired';
    default:
      return 'In Progress';
  }
};

export const formatMilestoneDate = (value?: string): string => {
  if (!value) {
    return '';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  const day = String(date.getDate()).padStart(2, '0');
  return `${day}-${MONTHS[date.getMonth()]}-${date.getFullYear()}`;
};

export const formatMilestoneDateTime = (value?: string): string => {
  if (!value) {
    return '';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  const datePart = formatMilestoneDate(value);
  let hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const suffix = hours >= 12 ? 'pm' : 'am';
  hours = hours % 12 || 12;
  return `${datePart}, ${hours}:${minutes} ${suffix}`;
};

export const getMerchantDisplayName = (milestone: Milestone): string =>
  milestone.shopName?.trim() || milestone.merchantName?.trim() || 'Merchant';

const extractMilestoneList = (payload: unknown): unknown[] => {
  if (payload == null) {
    return [];
  }

  const data = isRecord(payload) && 'data' in payload ? payload.data : payload;

  if (data == null) {
    return [];
  }

  if (Array.isArray(data)) {
    return data;
  }

  if (!isRecord(data)) {
    return [];
  }

  if (Array.isArray(data.milestones)) {
    return data.milestones;
  }
  if (Array.isArray(data.userGoals)) {
    return data.userGoals;
  }
  if (Array.isArray(data.goals)) {
    return data.goals;
  }
  if (Array.isArray(data.items)) {
    return data.items;
  }

  return [];
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

    return extractMilestoneList(payload)
      .map(parseMilestone)
      .filter((item): item is Milestone => Boolean(item));
  },

  async fetchMilestone(token: string, id: string): Promise<Milestone | undefined> {
    const milestoneId = id.trim();
    if (!milestoneId) {
      return undefined;
    }

    try {
      const payload = await apiRequest<unknown>(
        API_ENDPOINTS.userMilestoneById(milestoneId),
        {
          method: 'GET',
          token,
          baseUrl: API_BASE_URL,
        },
      );
      const parsed = parseMilestone(payload);
      if (parsed) {
        return parsed;
      }
    } catch {
      // Fall back to the list endpoint when a dedicated detail route is unavailable.
    }

    const list = await this.fetchMilestones(token);
    return list.find(item => item.id === milestoneId);
  },
};
