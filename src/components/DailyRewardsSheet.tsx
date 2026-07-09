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

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const QR_GRID_SIZE = 21;
const SELECTED_PURPLE = '#5D55E6';

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

const buildFallbackDates = (anchorDate: string): DailyCalendarDay[] => {
  const baseDate = new Date(`${anchorDate}T00:00:00`);
  const dates: DailyCalendarDay[] = [];

  for (let offset = -7; offset <= 7; offset += 1) {
    const nextDate = new Date(baseDate);
    nextDate.setDate(baseDate.getDate() + offset);
    dates.push({
      date: formatApiDate(nextDate),
      dayLabel: nextDate.toLocaleDateString('en-US', { weekday: 'short' }),
      dayNumber: nextDate.toLocaleDateString('en-US', { day: 'numeric' }),
    });
  }

  return dates;
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
    const dayMap = new Map<string, DailyCalendarDay>();

    const seedDays = calendarDays.length > 0 ? calendarDays : buildFallbackDates(todayKey);
    seedDays.forEach(day => {
      dayMap.set(day.date, day);
    });

    return Array.from(dayMap.values())
      .map(day => ({
        ...day,
        image: day.image ?? rewardPreviewByDate[day.date],
      }))
      .sort((left, right) => left.date.localeCompare(right.date));
  }, [calendarDays, rewardPreviewByDate, todayKey]);

  useEffect(() => {
    if (!visible) {
      setSelectedReward(null);
    }
  }, [visible]);

  useEffect(() => {
    if (!visible) {
      return;
    }

    const selectedIndex = visibleCalendarDays.findIndex(item => item.date === selectedDate);
    if (selectedIndex < 0) {
      return;
    }

    const timer = setTimeout(() => {
      calendarScrollRef.current?.scrollTo({
        x: Math.max(0, selectedIndex * 72 - 100),
        animated: true,
      });
    }, 120);

    return () => clearTimeout(timer);
  }, [visible, selectedDate, visibleCalendarDays]);

  const renderCalendarThumb = (day: DailyCalendarDay, isSelected: boolean) => {
    const imageUri = resolveImageUrl(day.image) ?? day.image;

    if (imageUri) {
      return (
        <View style={styles.thumbImageWrap}>
          <Image source={{ uri: imageUri }} style={styles.calendarThumbImage} />
          {day.isLocked ? (
            <View style={styles.lockOverlay}>
              <MaterialCommunityIcons name="lock" size={14} color={colors.white} />
            </View>
          ) : null}
        </View>
      );
    }

    if (day.isLocked || day.date < todayKey) {
      return (
        <View style={styles.thumbImageWrap}>
          <View style={styles.emptyThumb}>
            <MaterialCommunityIcons name="circle" size={16} color="#D4A017" />
          </View>
          <View style={styles.lockOverlay}>
            <MaterialCommunityIcons name="lock" size={14} color={colors.white} />
          </View>
        </View>
      );
    }

    return (
      <View style={styles.emptyThumb}>
        <MaterialCommunityIcons
          name="gift-outline"
          size={18}
          color={isSelected ? '#E8A317' : '#C9A227'}
        />
      </View>
    );
  };

  const renderHistoryBody = () => {
    if (isLoading) {
      return (
        <View style={styles.historyState}>
          <ActivityIndicator size="small" color={SELECTED_PURPLE} />
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

        return (
          <View key={item.id} style={styles.historyCard}>
            <View style={styles.historyLeft}>
              {imageUri ? (
                <Image source={{ uri: imageUri }} style={styles.historyImage} />
              ) : (
                <View style={styles.historyImageFallback} />
              )}
              <View style={styles.historyBody}>
                <Text style={styles.historyTitle}>{item.title}</Text>
                {item.subtitle ? (
                  <Text style={styles.historySubtitle} numberOfLines={1}>
                    {item.subtitle}
                  </Text>
                ) : null}
                {item.claimedAt ? (
                  <Text style={styles.historyDate}>{formatClaimedDate(item.claimedAt)}</Text>
                ) : null}
              </View>
            </View>
            <Text style={styles.historyStatus}>{item.statusLabel}</Text>
          </View>
        );
      });
    }

    if (primaryReward) {
      const rewardImage = resolveImageUrl(primaryReward.image) ?? primaryReward.image;

      return (
        <TouchableOpacity
          style={styles.todayRewardCard}
          activeOpacity={0.88}
          onPress={() => setSelectedReward(primaryReward)}
        >
          {rewardImage ? (
            <Image source={{ uri: rewardImage }} style={styles.historyImage} />
          ) : (
            <View style={styles.historyImageFallback} />
          )}
          <View style={styles.historyBody}>
            <Text style={styles.historyTitle}>{primaryReward.title}</Text>
            {primaryReward.subtitle ? (
              <Text style={styles.historySubtitle} numberOfLines={1}>
                {primaryReward.subtitle}
              </Text>
            ) : null}
            <Text style={styles.historyDate}>Tap to claim today&apos;s reward</Text>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={20} color={SELECTED_PURPLE} />
        </TouchableOpacity>
      );
    }

    return (
      <View style={styles.historyState}>
        <Text style={styles.historyStateText}>No rewards available for this day yet.</Text>
      </View>
    );
  };

  return (
    <>
      <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
        <View style={styles.backdrop}>
          <Pressable style={styles.dismissArea} onPress={onClose} />
          <View
            style={[
              styles.sheet,
              {
                minHeight: SCREEN_HEIGHT * 0.68,
                maxHeight: SCREEN_HEIGHT * 0.92,
                paddingBottom: Math.max(insets.bottom, 8),
              },
            ]}
          >
            <ScrollView
              showsVerticalScrollIndicator={false}
              bounces
              contentContainerStyle={styles.sheetScrollContent}
            >
              <View style={styles.grabber} />

              <View style={styles.headerRow}>
                <Text style={styles.title}>{rewards?.title || 'Daily Rewards'}</Text>
                <TouchableOpacity onPress={onClose} style={styles.closeButton} activeOpacity={0.8}>
                  <MaterialCommunityIcons name="close" size={20} color="#9AA3B2" />
                </TouchableOpacity>
              </View>

              <ScrollView
                ref={calendarScrollRef}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.daysRow}
                style={styles.calendarScroll}
              >
                {visibleCalendarDays.map(day => {
                  const isSelected = selectedDate === day.date;
                  return (
                    <TouchableOpacity
                      key={day.date}
                      style={[styles.dayCard, isSelected && styles.dayCardSelected]}
                      activeOpacity={0.9}
                      onPress={() => onDateSelect(day.date)}
                    >
                      <Text style={[styles.dayLabel, isSelected && styles.dayLabelSelected]}>
                        {day.dayLabel}
                      </Text>
                      <Text style={[styles.dayNumber, isSelected && styles.dayNumberSelected]}>
                        {day.dayNumber}
                      </Text>
                      <View style={[styles.calendarThumb, isSelected && styles.calendarThumbSelected]}>
                        {renderCalendarThumb(day, isSelected)}
                      </View>
                      <View style={[styles.selectionBar, isSelected && styles.selectionBarActive]} />
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              <View style={styles.historySection}>
                <Text style={styles.sectionTitle}>Claim History</Text>
                {renderHistoryBody()}
              </View>
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
    backgroundColor: 'rgba(15, 23, 42, 0.35)',
    justifyContent: 'flex-end',
  },
  dismissArea: {
    flex: 1,
  },
  sheet: {
    width: '100%',
    backgroundColor: colors.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: 'hidden',
  },
  sheetScrollContent: {
    flexGrow: 1,
    paddingBottom: 12,
  },
  grabber: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 999,
    backgroundColor: '#D1D5DB',
    marginTop: 8,
    marginBottom: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
    paddingHorizontal: 16,
  },
  title: {
    fontSize: 17,
    color: colors.text,
    fontFamily: fonts.BOLD,
    letterSpacing: -0.2,
  },
  closeButton: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendarScroll: {
    marginBottom: 4,
  },
  daysRow: {
    paddingLeft: 16,
    paddingRight: 16,
    gap: 8,
  },
  dayCard: {
    width: 64,
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 8,
    borderRadius: 14,
    backgroundColor: 'transparent',
  },
  dayCardSelected: {
    backgroundColor: '#EEF2FF',
  },
  dayLabel: {
    fontSize: 11,
    color: '#9CA3AF',
    fontFamily: fonts.BOLD,
    textTransform: 'capitalize',
  },
  dayLabelSelected: {
    color: SELECTED_PURPLE,
  },
  dayNumber: {
    marginTop: 2,
    fontSize: 20,
    lineHeight: 24,
    color: '#1F2937',
    fontFamily: fonts.BOLD,
  },
  dayNumberSelected: {
    color: SELECTED_PURPLE,
  },
  calendarThumb: {
    width: 48,
    height: 48,
    borderRadius: 10,
    marginTop: 6,
    backgroundColor: '#ECEFF3',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E6EC',
  },
  calendarThumbSelected: {
    backgroundColor: colors.white,
    borderColor: '#DDE3F3',
  },
  thumbImageWrap: {
    width: '100%',
    height: '100%',
  },
  calendarThumbImage: {
    width: '100%',
    height: '100%',
  },
  emptyThumb: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ECEFF3',
  },
  lockOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.42)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectionBar: {
    marginTop: 8,
    width: 26,
    height: 3,
    borderRadius: 999,
    backgroundColor: 'transparent',
  },
  selectionBarActive: {
    backgroundColor: SELECTED_PURPLE,
  },
  historySection: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  sectionTitle: {
    marginBottom: 6,
    fontSize: 16,
    color: colors.text,
    fontFamily: fonts.BOLD,
  },
  historyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    gap: 10,
  },
  todayRewardCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    gap: 10,
  },
  historyLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  historyImage: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#E5E7EB',
  },
  historyImageFallback: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#E5E7EB',
  },
  historyBody: {
    flex: 1,
  },
  historyTitle: {
    fontSize: 13,
    color: colors.text,
    fontFamily: fonts.BOLD,
  },
  historySubtitle: {
    marginTop: 2,
    fontSize: 12,
    color: '#6B7280',
    fontFamily: fonts.BOLD,
  },
  historyDate: {
    marginTop: 3,
    fontSize: 11,
    color: '#9CA3AF',
    fontFamily: fonts.BOLD,
  },
  historyStatus: {
    color: '#22A06B',
    fontSize: 12,
    fontFamily: fonts.BOLD,
  },
  historyState: {
    minHeight: 100,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    paddingHorizontal: 16,
  },
  historyStateTitle: {
    marginTop: 8,
    fontSize: 14,
    color: colors.text,
    fontFamily: fonts.BOLD,
  },
  historyStateText: {
    marginTop: 6,
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
    fontFamily: fonts.BOLD,
  },
  retryButton: {
    marginTop: 12,
    borderRadius: 999,
    backgroundColor: colors.primary,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  retryButtonText: {
    color: colors.white,
    fontSize: 12,
    fontFamily: fonts.BOLD,
  },
  claimBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  claimCard: {
    width: '100%',
    maxWidth: 320,
    borderRadius: 22,
    backgroundColor: '#6B3CF0',
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 18,
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
    borderRadius: 12,
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
    marginTop: 10,
    color: colors.white,
    fontSize: 12,
    fontFamily: fonts.BOLD,
  },
  claimInfoCard: {
    marginTop: 16,
    backgroundColor: colors.white,
    borderRadius: 14,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  claimThumb: {
    width: 44,
    height: 44,
    borderRadius: 10,
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
    marginTop: 2,
    fontSize: 11,
    color: '#B42318',
    fontFamily: fonts.BOLD,
  },
  claimButton: {
    marginTop: 16,
    alignSelf: 'center',
    backgroundColor: colors.white,
    borderRadius: 999,
    paddingHorizontal: 26,
    paddingVertical: 12,
  },
  claimButtonText: {
    fontSize: 14,
    color: '#5E34E7',
    fontFamily: fonts.BOLD,
  },
});
