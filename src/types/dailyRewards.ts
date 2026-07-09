export interface DailyRewardEntry {
  id: string;
  shopId?: string;
  offerId?: string;
  date: string;
  dayLabel: string;
  dayNumber: string;
  monthLabel?: string;
  title: string;
  subtitle?: string;
  image?: string;
  qrValue?: string;
  qrImage?: string;
  isClaimed: boolean;
  isToday: boolean;
  isLocked: boolean;
  isAvailable: boolean;
  claimedAt?: string;
  validText?: string;
}

export interface DailyRewardHistoryItem {
  id: string;
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
