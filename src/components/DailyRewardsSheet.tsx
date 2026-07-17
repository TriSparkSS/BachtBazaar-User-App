import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { colors, fonts } from '../helpers/styles';
import { DailyCalendarDay, DailyRewardEntry, DailyRewardsCalendar } from '../types/dailyRewards';

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');
const QR_GRID_SIZE = 21;
const ACTIVE_BLUE = '#366FE0';
const DAY_COLUMN_WIDTH = 56;
const DAY_COLUMN_GAP = 14;
const REWARD_THUMB_SIZE = 48;

type DailyRewardsSheetProps = {
  visible: boolean;
  rewards: DailyRewardsCalendar | null;
  calendarDays: DailyCalendarDay[];
  selectedDate: string;
  rewardPreviewByDate: Record<string, string | undefined>;
  isLoading: boolean;
  error: string | null;
  onClose: () => void;
  onRetry: () => void;
  onDateSelect: (date: string) => void;
  resolveImageUrl: (path?: string | null) => string | undefined;
};

const GIFT_PALETTE = [
  { bg: '#FFF3E0', icon: '#F59E0B' },
  { bg: '#F3E8FF', icon: '#9333EA' },
  { bg: '#E0F2FE', icon: '#0284C7' },
  { bg: '#FCE7F3', icon: '#DB2777' },
  { bg: '#ECFDF5', icon: '#059669' },
  { bg: '#FEF3C7', icon: '#D97706' },
  { bg: '#EEF2FF', icon: '#4F46E5' },
] as const;

const formatClaimedDate = (value?: string) => {
  if (!value) {
    return undefined;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
  });
};

const formatApiDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const buildFullMonthDays = (anchorDate: string): DailyCalendarDay[] => {
  const baseDate = new Date(`${anchorDate}T00:00:00`);
  if (Number.isNaN(baseDate.getTime())) {
    return buildFullMonthDays(formatApiDate(new Date()));
  }

  const year = baseDate.getFullYear();
  const month = baseDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days: DailyCalendarDay[] = [];

  for (let day = 1; day <= daysInMonth; day += 1) {
    const nextDate = new Date(year, month, day);
    days.push({
      date: formatApiDate(nextDate),
      dayLabel: nextDate.toLocaleDateString('en-US', { weekday: 'short' }),
      dayNumber: String(day),
    });
  }

  return days;
};

const buildQrPattern = (seed: string) => {
  const values: boolean[] = [];
  let hash = 0;

  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) >>> 0;
  }

  for (let row = 0; row < QR_GRID_SIZE; row += 1) {
    for (let col = 0; col < QR_GRID_SIZE; col += 1) {
      const isFinder =
        (row < 7 && col < 7) ||
        (row < 7 && col >= QR_GRID_SIZE - 7) ||
        (row >= QR_GRID_SIZE - 7 && col < 7);

      if (isFinder) {
        const localRow = row % 7;
        const localCol = col % 7;
        const isBorder = localRow === 0 || localRow === 6 || localCol === 0 || localCol === 6;
        const isCenter = localRow >= 2 && localRow <= 4 && localCol >= 2 && localCol <= 4;
        values.push(isBorder || isCenter);
        continue;
      }

      hash = (hash * 1664525 + 1013904223) >>> 0;
      values.push((hash & 3) === 0);
    }
  }

  return values;
};

const RewardQrVisual = ({ value }: { value: string }) => {
  const pattern = useMemo(() => buildQrPattern(value), [value]);

  return (
    <View style={styles.qrOuter}>
      <View style={styles.qrGrid}>
        {pattern.map((filled, index) => (
          <View key={`${value}-${index}`} style={[styles.qrCell, filled && styles.qrCellFilled]} />
        ))}
      </View>
    </View>
  );
};

const CalendarRewardThumb = ({
  imageUri,
  dayIndex,
  showLock,
}: {
  imageUri?: string;
  dayIndex: number;
  showLock: boolean;
}) => {
  const palette = GIFT_PALETTE[dayIndex % GIFT_PALETTE.length];

  return (
    <View style={styles.rewardThumbWrap}>
      {imageUri ? (
        <Image source={{ uri: imageUri }} style={styles.rewardThumbImage} />
      ) : (
        <View style={[styles.rewardThumbFallback, { backgroundColor: palette.bg }]}>
          <MaterialCommunityIcons name="gift" size={22} color={palette.icon} />
        </View>
      )}

      {showLock ? (
        <View style={styles.lockOverlay}>
          <View style={styles.lockBadge}>
            <MaterialCommunityIcons name="lock" size={14} color={colors.white} />
          </View>
        </View>
      ) : null}
    </View>
  );
};

const RewardClaimModal = ({
  reward,
  visible,
  onClose,
  resolveImageUrl,
}: {
  reward: DailyRewardEntry | null;
  visible: boolean;
  onClose: () => void;
  resolveImageUrl: (path?: string | null) => string | undefined;
}) => {
  if (!reward) {
    return null;
  }

  const rewardImage = resolveImageUrl(reward.image) ?? reward.image;

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.claimBackdrop}>
        <View style={styles.claimCard}>
          <View style={styles.claimHeader}>
            <TouchableOpacity style={styles.claimCloseButton} onPress={onClose} activeOpacity={0.85}>
              <MaterialCommunityIcons name="close" size={20} color={colors.white} />
            </TouchableOpacity>
            <RewardQrVisual value={reward.qrValue || reward.id} />
            <Text style={styles.claimScanText}>Scan to claim</Text>
          </View>

          <View style={styles.claimInfoCard}>
            {rewardImage ? <Image source={{ uri: rewardImage }} style={styles.claimThumb} /> : null}
            <View style={styles.claimInfoBody}>
              <Text style={styles.claimMerchant}>{reward.subtitle || 'Partner Offer'}</Text>
              <Text style={styles.claimTitle}>{reward.title}</Text>
              <Text style={styles.claimValidity}>{reward.validText || 'Valid today only'}</Text>
            </View>
          </View>

          <TouchableOpacity style={styles.claimButton} activeOpacity={0.88} onPress={onClose}>
            <Text style={styles.claimButtonText}>{reward.isClaimed ? 'Claimed' : 'Claim Now'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const DailyRewardsSheet: React.FC<DailyRewardsSheetProps> = ({
  visible,
  rewards,
  calendarDays,
  selectedDate,
  rewardPreviewByDate,
  isLoading,
  error,
  onClose,
  onRetry,
  onDateSelect,
  resolveImageUrl,
}) => {
  const insets = useSafeAreaInsets();
  const calendarScrollRef = useRef<ScrollView>(null);
  const [selectedReward, setSelectedReward] = useState<DailyRewardEntry | null>(null);
  const todayKey = useMemo(() => formatApiDate(new Date()), []);

  const entries = rewards?.entries ?? [];
  const history = rewards?.history ?? [];
  const primaryReward = entries[0] ?? null;

  const visibleCalendarDays = useMemo(() => {
    const monthDays = buildFullMonthDays(selectedDate || todayKey);
    const metaByDate = new Map<string, DailyCalendarDay>();

    calendarDays.forEach(day => {
      metaByDate.set(day.date, day);
    });

    return monthDays.map(day => {
      const meta = metaByDate.get(day.date);
      return {
        ...day,
        image: meta?.image ?? rewardPreviewByDate[day.date] ?? day.image,
        isLocked: meta?.isLocked ?? day.date < todayKey,
        isClaimed: meta?.isClaimed ?? day.date < todayKey,
      };
    });
  }, [calendarDays, rewardPreviewByDate, selectedDate, todayKey]);

  useEffect(() => {
    if (!visible) {
      setSelectedReward(null);
    }
  }, [visible]);

  const scrollCalendarToSelected = (animated = true) => {
    const selectedIndex = visibleCalendarDays.findIndex(item => item.date === selectedDate);
    if (selectedIndex < 0) {
      return;
    }

    const itemStride = DAY_COLUMN_WIDTH + DAY_COLUMN_GAP;
    const targetX = Math.max(
      0,
      selectedIndex * itemStride - (SCREEN_WIDTH / 2 - DAY_COLUMN_WIDTH / 2 - 20),
    );
    calendarScrollRef.current?.scrollTo({ x: targetX, animated });
  };

  useEffect(() => {
    if (!visible) {
      return;
    }

    const timer = setTimeout(() => scrollCalendarToSelected(true), 180);
    return () => clearTimeout(timer);
  }, [visible, selectedDate, visibleCalendarDays]);

  const isPastSelectedDate = selectedDate < todayKey;
  const isFutureOrToday = selectedDate >= todayKey;

  const resolveOfferStatusLabel = (rawStatus?: string, isClaimed?: boolean) => {
    if (isClaimed || rawStatus?.toLowerCase() === 'claimed') {
      return 'Claimed';
    }

    // Past dates: show Expired (never Available)
    if (isPastSelectedDate) {
      return 'Expired';
    }

    // Today / future: Available
    if (isFutureOrToday) {
      return rawStatus?.toLowerCase() === 'available' || !rawStatus ? 'Available' : rawStatus;
    }

    return undefined;
  };

  const renderHistoryItem = (
    key: string,
    title: string,
    subtitle: string | undefined,
    dateLabel: string | undefined,
    statusLabel: string | undefined,
    imageUri: string | undefined,
    onPress?: () => void,
  ) => {
    const normalizedStatus = statusLabel?.toLowerCase();
    const isClaimed = normalizedStatus === 'claimed';
    const isExpired = normalizedStatus === 'expired';

    const content = (
      <View style={styles.historyCard}>
        <View style={styles.historyImageWrap}>
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.historyImage} />
          ) : (
            <View style={styles.historyImageFallback}>
              <MaterialCommunityIcons name="store-outline" size={20} color="#B0B8C4" />
            </View>
          )}
        </View>

        <View style={styles.historyTextBlock}>
          <Text style={styles.historyTitle} numberOfLines={1}>
            {title}
          </Text>
          {subtitle ? (
            <Text style={styles.historySubtitle} numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
          {dateLabel ? <Text style={styles.historyDate}>{dateLabel}</Text> : null}
        </View>

        {statusLabel ? (
          <Text
            style={[
              styles.historyStatus,
              isClaimed && styles.historyStatusClaimed,
              isExpired && styles.historyStatusExpired,
              !isClaimed && !isExpired && styles.historyStatusPending,
            ]}>
            {statusLabel}
          </Text>
        ) : null}
      </View>
    );

    if (onPress) {
      return (
        <TouchableOpacity key={key} activeOpacity={0.85} onPress={onPress}>
          {content}
        </TouchableOpacity>
      );
    }

    return <View key={key}>{content}</View>;
  };

  const openClaimQrIfAllowed = (reward: DailyRewardEntry) => {
    // Past offers are expired — do not open QR claim screen
    if (isPastSelectedDate || reward.date < todayKey) {
      return;
    }

    setSelectedReward(reward);
  };

  const renderHistoryBody = () => {
    if (isLoading) {
      return (
        <View style={styles.historyState}>
          <ActivityIndicator size="small" color={ACTIVE_BLUE} />
          <Text style={styles.historyStateText}>Loading rewards...</Text>
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.historyState}>
          <MaterialCommunityIcons name="alert-circle-outline" size={24} color="#D84B4B" />
          <Text style={styles.historyStateTitle}>Could not load rewards</Text>
          <Text style={styles.historyStateText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={onRetry} activeOpacity={0.85}>
            <Text style={styles.retryButtonText}>Try again</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (history.length > 0) {
      return history.map(item => {
        const imageUri = resolveImageUrl(item.image) ?? item.image;
        const statusLabel = resolveOfferStatusLabel(
          item.statusLabel,
          item.statusLabel?.toLowerCase() === 'claimed',
        );
        return renderHistoryItem(
          item.id,
          item.title,
          item.subtitle,
          formatClaimedDate(item.claimedAt),
          statusLabel,
          imageUri,
          // History / past items never open QR
          undefined,
        );
      });
    }

    if (primaryReward) {
      const rewardImage = resolveImageUrl(primaryReward.image) ?? primaryReward.image;
      const statusLabel = resolveOfferStatusLabel(
        primaryReward.isClaimed ? 'Claimed' : 'Available',
        primaryReward.isClaimed,
      );
      return renderHistoryItem(
        primaryReward.id,
        primaryReward.title,
        primaryReward.subtitle,
        formatClaimedDate(primaryReward.claimedAt) ||
          (selectedDate === todayKey ? 'Today' : formatClaimedDate(selectedDate)),
        statusLabel,
        rewardImage,
        isPastSelectedDate ? undefined : () => openClaimQrIfAllowed(primaryReward),
      );
    }

    if (isPastSelectedDate && entries.length > 0) {
      return entries.map(entry => {
        const rewardImage = resolveImageUrl(entry.image) ?? entry.image;
        return renderHistoryItem(
          entry.id,
          entry.title,
          entry.subtitle,
          formatClaimedDate(entry.claimedAt) || formatClaimedDate(entry.date),
          entry.isClaimed ? 'Claimed' : 'Expired',
          rewardImage,
          // Past offers: no QR screen on tap
          undefined,
        );
      });
    }

    return (
      <View style={styles.historyState}>
        <Text style={styles.historyStateText}>No rewards available for this day yet.</Text>
      </View>
    );
  };

  return (
    <>
      <Modal
        visible={visible}
        animationType="slide"
        transparent
        statusBarTranslucent
        onRequestClose={onClose}>
        <View style={styles.backdrop}>
          <Pressable style={styles.backdropPress} onPress={onClose} />
          <View
            style={[
              styles.sheet,
              {
                height: SCREEN_HEIGHT * 0.78,
                paddingBottom: Math.max(insets.bottom, 16),
              },
            ]}>
            <View style={styles.grabber} />

            <View style={styles.headerRow}>
              <Text style={styles.title}>{rewards?.title || 'Daily Rewards'}</Text>
              <TouchableOpacity onPress={onClose} style={styles.closeButton} activeOpacity={0.8}>
                <MaterialCommunityIcons name="close" size={22} color="#9AA3B2" />
              </TouchableOpacity>
            </View>

            <ScrollView
              ref={calendarScrollRef}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.daysRow}
              style={styles.calendarScroll}
              onContentSizeChange={() => {
                if (visible) {
                  scrollCalendarToSelected(false);
                }
              }}>
              {visibleCalendarDays.map((day, index) => {
                const isSelected = selectedDate === day.date;
                const isPast = day.date < todayKey;
                const isToday = day.date === todayKey;
                // Lock only past days — never today or future
                const showLock = isPast || Boolean(day.isLocked && !isToday);
                const imageUri = resolveImageUrl(day.image) ?? day.image;

                return (
                  <TouchableOpacity
                    key={day.date}
                    style={styles.dayColumn}
                    activeOpacity={0.85}
                    onPress={() => onDateSelect(day.date)}>
                    <Text
                      style={[
                        styles.dayLabel,
                        isPast && styles.dayLabelPast,
                        isSelected && styles.dayLabelSelected,
                      ]}>
                      {day.dayLabel}
                    </Text>
                    <Text
                      style={[
                        styles.dayNumber,
                        isPast && styles.dayNumberPast,
                        isSelected && styles.dayNumberSelected,
                      ]}>
                      {day.dayNumber}
                    </Text>
                    <CalendarRewardThumb
                      imageUri={imageUri}
                      dayIndex={index}
                      showLock={showLock}
                    />
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <Text style={styles.sectionTitle}>Claim History</Text>

            <ScrollView
              style={styles.historyScroll}
              contentContainerStyle={styles.historyContent}
              showsVerticalScrollIndicator={false}
              nestedScrollEnabled>
              {renderHistoryBody()}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <RewardClaimModal
        reward={selectedReward}
        visible={Boolean(selectedReward)}
        onClose={() => setSelectedReward(null)}
        resolveImageUrl={resolveImageUrl}
      />
    </>
  );
};

export default DailyRewardsSheet;

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    justifyContent: 'flex-end',
  },
  backdropPress: {
    ...StyleSheet.absoluteFillObject,
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    backgroundColor: colors.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: 'hidden',
    elevation: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
  },
  grabber: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 999,
    backgroundColor: '#D1D5DB',
    marginTop: 10,
    marginBottom: 14,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 18,
    color: '#1F2937',
    fontFamily: fonts.BOLD,
    letterSpacing: -0.3,
  },
  closeButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendarScroll: {
    marginBottom: 6,
    flexGrow: 0,
  },
  daysRow: {
    paddingHorizontal: 20,
    gap: DAY_COLUMN_GAP,
    alignItems: 'flex-start',
  },
  dayColumn: {
    width: DAY_COLUMN_WIDTH,
    alignItems: 'center',
  },
  dayLabel: {
    fontSize: 12,
    lineHeight: 16,
    color: '#6B7280',
    fontFamily: fonts.BOLD,
    textTransform: 'capitalize',
  },
  dayLabelPast: {
    color: '#9CA3AF',
  },
  dayLabelSelected: {
    color: ACTIVE_BLUE,
  },
  dayNumber: {
    marginTop: 2,
    marginBottom: 8,
    fontSize: 18,
    lineHeight: 22,
    color: '#111827',
    fontFamily: fonts.BOLD,
  },
  dayNumberPast: {
    color: '#9CA3AF',
  },
  dayNumberSelected: {
    color: ACTIVE_BLUE,
  },
  rewardThumbWrap: {
    width: REWARD_THUMB_SIZE,
    height: REWARD_THUMB_SIZE,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#F3F4F6',
  },
  rewardThumbImage: {
    width: '100%',
    height: '100%',
  },
  rewardThumbFallback: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(17, 24, 39, 0.38)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(17, 24, 39, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    marginTop: 20,
    marginBottom: 8,
    paddingHorizontal: 20,
    fontSize: 16,
    color: '#1F2937',
    fontFamily: fonts.BOLD,
    letterSpacing: -0.2,
  },
  historyScroll: {
    flex: 1,
  },
  historyContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  historyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E7EB',
    gap: 12,
  },
  historyImageWrap: {
    width: 48,
    height: 48,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#E5E7EB',
  },
  historyImage: {
    width: '100%',
    height: '100%',
  },
  historyImageFallback: {
    width: '100%',
    height: '100%',
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyTextBlock: {
    flex: 1,
    gap: 2,
  },
  historyTitle: {
    fontSize: 14,
    color: '#111827',
    fontFamily: fonts.BOLD,
  },
  historySubtitle: {
    fontSize: 12,
    color: '#6B7280',
    fontFamily: fonts.BOLD,
  },
  historyDate: {
    marginTop: 1,
    fontSize: 11,
    color: '#9CA3AF',
    fontFamily: fonts.BOLD,
  },
  historyStatus: {
    fontSize: 13,
    fontFamily: fonts.BOLD,
  },
  historyStatusClaimed: {
    color: '#22C55E',
  },
  historyStatusExpired: {
    color: '#EF4444',
  },
  historyStatusPending: {
    color: ACTIVE_BLUE,
  },
  historyState: {
    minHeight: 120,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    paddingHorizontal: 20,
    gap: 8,
  },
  historyStateTitle: {
    fontSize: 14,
    color: colors.text,
    fontFamily: fonts.BOLD,
  },
  historyStateText: {
    fontSize: 13,
    color: '#9CA3AF',
    textAlign: 'center',
    fontFamily: fonts.BOLD,
    lineHeight: 18,
  },
  retryButton: {
    marginTop: 8,
    borderRadius: 999,
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  retryButtonText: {
    color: colors.white,
    fontSize: 13,
    fontFamily: fonts.BOLD,
  },
  claimBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  claimCard: {
    width: '100%',
    maxWidth: 320,
    borderRadius: 24,
    backgroundColor: ACTIVE_BLUE,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
  },
  claimHeader: {
    alignItems: 'center',
  },
  claimCloseButton: {
    alignSelf: 'flex-end',
    marginBottom: 8,
  },
  qrOuter: {
    width: 150,
    height: 150,
    borderRadius: 14,
    backgroundColor: colors.white,
    padding: 10,
  },
  qrGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: '100%',
    height: '100%',
  },
  qrCell: {
    width: `${100 / QR_GRID_SIZE}%`,
    height: `${100 / QR_GRID_SIZE}%`,
    backgroundColor: colors.white,
  },
  qrCellFilled: {
    backgroundColor: '#121826',
  },
  claimScanText: {
    marginTop: 12,
    color: colors.white,
    fontSize: 13,
    fontFamily: fonts.BOLD,
  },
  claimInfoCard: {
    marginTop: 18,
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  claimThumb: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#EEF2F7',
  },
  claimInfoBody: {
    flex: 1,
  },
  claimMerchant: {
    fontSize: 11,
    color: '#667085',
    fontFamily: fonts.BOLD,
  },
  claimTitle: {
    marginTop: 2,
    fontSize: 16,
    color: colors.text,
    fontFamily: fonts.BOLD,
  },
  claimValidity: {
    marginTop: 3,
    fontSize: 11,
    color: '#B42318',
    fontFamily: fonts.BOLD,
  },
  claimButton: {
    marginTop: 18,
    alignSelf: 'center',
    backgroundColor: colors.white,
    borderRadius: 999,
    paddingHorizontal: 32,
    paddingVertical: 13,
  },
  claimButtonText: {
    fontSize: 15,
    color: ACTIVE_BLUE,
    fontFamily: fonts.BOLD,
  },
});
