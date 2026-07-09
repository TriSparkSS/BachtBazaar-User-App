import {
  DailyRewardEntry,
  DailyRewardHistoryItem,
  DailyRewardsCalendar,
} from '../types/dailyRewards';
import { resolveShopMediaFromApiValue } from './shopResponseParser';

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

const pickBoolean = (...values: unknown[]): boolean | undefined => {
  for (const value of values) {
    if (typeof value === 'boolean') {
      return value;
    }

    if (typeof value === 'number') {
      return value !== 0;
    }

    if (typeof value === 'string') {
      const normalized = value.trim().toLowerCase();
      if (['true', '1', 'yes', 'claimed', 'active', 'available'].includes(normalized)) {
        return true;
      }

      if (['false', '0', 'no', 'locked', 'inactive', 'unavailable'].includes(normalized)) {
        return false;
      }
    }
  }

  return undefined;
};

const formatDayLabel = (date: Date) =>
  date.toLocaleDateString('en-US', { weekday: 'short' });

const formatDayNumber = (date: Date) =>
  date.toLocaleDateString('en-US', { day: 'numeric' });

const normalizeDate = (value: unknown, fallbackDate: string): string => {
  const rawValue = pickString(value);
  if (!rawValue) {
    return fallbackDate;
  }

  const parsed = new Date(rawValue);
  if (Number.isNaN(parsed.getTime())) {
    return fallbackDate;
  }

  return parsed.toISOString().slice(0, 10);
};

const parseDate = (value: string) => {
  const parsed = new Date(`${value}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
};

const resolveRewardImage = (value: Record<string, unknown>) =>
  resolveShopMediaFromApiValue(
    value.image ??
      value.thumbnail ??
      value.icon ??
      value.photo ??
      value.offerImage ??
      value.offer_image,
  );

const normalizeRewardEntry = (
  value: unknown,
  selectedDate: string,
  index: number,
): DailyRewardEntry | null => {
  if (!isRecord(value)) {
    return null;
  }

  const entryDate = normalizeDate(
    value.date ?? value.rewardDate ?? value.reward_date ?? value.dayDate ?? value.day_date,
    selectedDate,
  );
  const parsedDate = parseDate(entryDate);
  const title =
    pickString(
      value.title,
      value.offerTitle,
      value.offer_title,
      value.rewardTitle,
      value.reward_title,
      value.name,
      value.shopName,
      value.shop_name,
    ) ?? `Reward ${index + 1}`;
  const subtitle = pickString(
    value.subtitle,
    value.description,
    value.offerDescription,
    value.offer_description,
    value.shopName,
    value.shop_name,
  );
  const claimedAt = pickString(value.claimedAt, value.claimed_at, value.historyDate, value.history_date);
  const isClaimed = pickBoolean(
    value.isClaimed,
    value.is_claimed,
    value.claimed,
    value.status,
  ) ?? false;
  const isLocked = pickBoolean(value.isLocked, value.is_locked, value.locked) ?? false;
  const isToday =
    pickBoolean(value.isToday, value.is_today, value.today, value.current) ?? entryDate === selectedDate;
  const isAvailable =
    pickBoolean(value.isAvailable, value.is_available, value.available, value.canClaim, value.can_claim) ??
    (!isLocked && !isClaimed);

  return {
    id: pickString(value._id, value.id, value.offerId, value.offer_id, `${entryDate}-${index}`)!,
    shopId: pickString(value.shopId, value.shop_id),
    offerId: pickString(value.offerId, value.offer_id, value._id, value.id),
    date: entryDate,
    dayLabel:
      pickString(value.dayLabel, value.day_label, value.dayName, value.day_name) ??
      formatDayLabel(parsedDate),
    dayNumber:
      pickString(value.dayNumber, value.day_number, value.dateNumber, value.date_number) ??
      formatDayNumber(parsedDate),
    monthLabel: pickString(value.monthLabel, value.month_label),
    title,
    subtitle,
    image: resolveRewardImage(value),
    qrValue: pickString(value.qrValue, value.qr_value, value.code, value.offerCode, value.offer_code),
    qrImage: pickString(value.qrImage, value.qr_image),
    isClaimed,
    isToday,
    isLocked,
    isAvailable,
    claimedAt,
    validText:
      pickString(value.validText, value.valid_text, value.validity, value.validityText) ??
      'Valid today only',
  };
};

const normalizeHistoryItem = (value: unknown): DailyRewardHistoryItem | null => {
  if (!isRecord(value)) {
    return null;
  }

  const title = pickString(
    value.title,
    value.offerTitle,
    value.offer_title,
    value.rewardTitle,
    value.reward_title,
    value.shopName,
    value.shop_name,
  );

  if (!title) {
    return null;
  }

  return {
    id: pickString(value._id, value.id, value.offerId, value.offer_id, title)!,
    title,
    subtitle: pickString(value.subtitle, value.description, value.offerDescription, value.offer_description),
    claimedAt: pickString(value.claimedAt, value.claimed_at, value.date, value.historyDate, value.history_date),
    image: resolveRewardImage(value),
    statusLabel: pickString(value.statusLabel, value.status_label, value.status) ?? 'Claimed',
  };
};

const unwrapEntryList = (payload: unknown): unknown[] => {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (!isRecord(payload)) {
    return [];
  }

  for (const key of [
    'data',
    'entries',
    'calendar',
    'offers',
    'rewards',
    'items',
    'result',
  ]) {
    const value = payload[key];
    if (Array.isArray(value)) {
      return value;
    }

    if (isRecord(value)) {
      for (const nestedKey of ['entries', 'offers', 'rewards', 'items', 'days', 'calendar']) {
        const nested = value[nestedKey];
        if (Array.isArray(nested)) {
          return nested;
        }
      }
    }
  }

  return [];
};

const unwrapHistoryList = (payload: unknown): unknown[] => {
  if (!isRecord(payload)) {
    return [];
  }

  for (const key of ['history', 'claimHistory', 'claim_history', 'claimed', 'claimedRewards']) {
    const value = payload[key];
    if (Array.isArray(value)) {
      return value;
    }

    if (isRecord(value)) {
      for (const nestedKey of ['history', 'items', 'list']) {
        const nested = value[nestedKey];
        if (Array.isArray(nested)) {
          return nested;
        }
      }
    }
  }

  return [];
};

export const parseDailyRewardsCalendarResponse = (
  payload: unknown,
  selectedDate: string,
): DailyRewardsCalendar => {
  const root = isRecord(payload) && isRecord(payload.data) ? payload.data : payload;
  const entries = unwrapEntryList(root)
    .map((item, index) => normalizeRewardEntry(item, selectedDate, index))
    .filter((entry): entry is DailyRewardEntry => Boolean(entry));
  const history = unwrapHistoryList(root)
    .map(item => normalizeHistoryItem(item))
    .filter((item): item is DailyRewardHistoryItem => Boolean(item));

  const derivedHistory =
    history.length > 0
      ? history
      : entries
          .filter(entry => entry.isClaimed)
          .map(entry => ({
            id: `${entry.id}-history`,
            title: entry.subtitle || entry.title,
            subtitle: entry.title,
            claimedAt: entry.claimedAt || entry.date,
            image: entry.image,
            statusLabel: 'Claimed',
          }));

  return {
    title: pickString(
      isRecord(root) ? root.title : undefined,
      isRecord(root) ? root.heading : undefined,
    ) ?? 'Daily Rewards',
    selectedDate,
    entries,
    history: derivedHistory,
  };
};
