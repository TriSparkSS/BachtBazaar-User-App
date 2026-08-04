export interface DailyRewardEntry {
  id: string;
  shopId?: string;
  offerId?: string;
  merchantId?: string;
  date: string;
  dayLabel: string;
  dayNumber: string;
  monthLabel?: string;
  title: string;
  subtitle?: string;
  description?: string;
  image?: string;
  qrValue?: string;
  qrImage?: string;
  isClaimed: boolean;
  isToday: boolean;
  isLocked: boolean;
  isAvailable: boolean;
  claimedAt?: string;
  validText?: string;
  discountBadge?: string;
  minimumPurchaseAmount?: number;
  distanceKm?: number;
  startDate?: string;
  endDate?: string;
  shopName?: string;
  shopAddress?: string;
  shopCity?: string;
  shopLatitude?: number;
  shopLongitude?: number;
  offerType?: string;
  displayType?: string;
  statusLabel?: string;
  isWishlisted?: boolean;
}

export interface DailyRewardHistoryItem {
  id: string;
  offerId?: string;
  title: string;
  subtitle?: string;
  claimedAt?: string;
  image?: string;
  statusLabel: string;
}

export interface DailyCalendarDay {
  date: string;
  dayLabel: string;
  dayNumber: string;
  image?: string;
  isLocked?: boolean;
  isClaimed?: boolean;
}

export interface DailyRewardsCalendar {
  title: string;
  selectedDate: string;
  calendarDays: DailyCalendarDay[];
  entries: DailyRewardEntry[];
  history: DailyRewardHistoryItem[];
}
