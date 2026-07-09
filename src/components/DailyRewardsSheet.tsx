import React, { useEffect, useMemo, useState } from 'react';
import {
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { colors, fonts } from '../helpers/styles';
import { DailyRewardEntry, DailyRewardsCalendar } from '../types/dailyRewards';

type DailyRewardsSheetProps = {
  visible: boolean;
  rewards: DailyRewardsCalendar | null;
  selectedDate: string;
  rewardPreviewByDate: Record<string, string | undefined>;
  isLoading: boolean;
  error: string | null;
  onClose: () => void;
  onRetry: () => void;
  onDateSelect: (date: string) => void;
};

const QR_GRID_SIZE = 21;

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

const buildVisibleDates = (selectedDate: string) => {
  const baseDate = new Date(`${selectedDate}T00:00:00`);
  const dates: Array<{ key: string; label: string; dayNumber: string }> = [];

  for (let offset = -2; offset <= 4; offset += 1) {
    const nextDate = new Date(baseDate);
    nextDate.setDate(baseDate.getDate() + offset);
    dates.push({
      key: formatApiDate(nextDate),
      label: nextDate.toLocaleDateString('en-US', { weekday: 'short' }),
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
}: {
  reward: DailyRewardEntry | null;
  visible: boolean;
  onClose: () => void;
}) => {
  if (!reward) {
    return null;
  }

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
            {reward.image ? <Image source={{ uri: reward.image }} style={styles.claimThumb} /> : null}
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
  selectedDate,
  rewardPreviewByDate,
  isLoading,
  error,
  onClose,
  onRetry,
  onDateSelect,
}) => {
  const [selectedReward, setSelectedReward] = useState<DailyRewardEntry | null>(null);

  useEffect(() => {
    if (!visible) {
      setSelectedReward(null);
    }
  }, [visible]);

  const entries = rewards?.entries ?? [];
  const history = rewards?.history ?? [];
  const visibleDates = useMemo(() => buildVisibleDates(selectedDate), [selectedDate]);
  const primaryReward = entries[0] ?? null;
  const showEmptyState = !isLoading && !error && entries.length === 0;

  return (
    <>
      <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
        <View style={styles.backdrop}>
          <Pressable style={styles.dismissArea} onPress={onClose} />
          <View style={styles.sheet}>
            <View style={styles.grabber} />

            <View style={styles.headerRow}>
              <Text style={styles.title}>{rewards?.title || 'Daily Rewards'}</Text>
              <TouchableOpacity onPress={onClose} style={styles.closeButton} activeOpacity={0.8}>
                <MaterialCommunityIcons name="close" size={18} color="#7E8798" />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.sheetScroll}
              contentContainerStyle={styles.sheetScrollContent}
              showsVerticalScrollIndicator={false}
            >
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.daysRow}
              >
                {visibleDates.map(dateItem => {
                  const isSelected = selectedDate === dateItem.key;
                  const rewardPreview = rewardPreviewByDate[dateItem.key];
                  return (
                    <TouchableOpacity
                      key={dateItem.key}
                      style={styles.dayCardWrap}
                      activeOpacity={0.9}
                      onPress={() => onDateSelect(dateItem.key)}
                    >
                      <Text style={styles.dayLabel}>{dateItem.label}</Text>
                      <Text style={[styles.dayNumber, isSelected && styles.dayNumberToday]}>
                        {dateItem.dayNumber}
                      </Text>
                      <View
                        style={[
                          styles.rewardThumbCard,
                          isSelected && primaryReward?.isClaimed && styles.rewardThumbCardClaimed,
                        ]}
                      >
                        {rewardPreview ? (
                          <Image source={{ uri: rewardPreview }} style={styles.rewardThumbImage} />
                        ) : (
                          <MaterialCommunityIcons name="gift-outline" size={16} color="#D1A13B" />
                        )}
                      </View>
                      <View style={[styles.selectionBar, isSelected && styles.selectionBarActive]} />
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {isLoading ? (
                <View style={styles.stateCard}>
                  <MaterialCommunityIcons name="gift-outline" size={28} color={colors.primary} />
                  <Text style={styles.stateTitle}>Loading rewards...</Text>
                </View>
              ) : error ? (
                <View style={styles.stateCard}>
                  <MaterialCommunityIcons name="alert-circle-outline" size={28} color="#D84B4B" />
                  <Text style={styles.stateTitle}>Could not load rewards</Text>
                  <Text style={styles.stateText}>{error}</Text>
                  <TouchableOpacity style={styles.retryButton} onPress={onRetry} activeOpacity={0.85}>
                    <Text style={styles.retryButtonText}>Try again</Text>
                  </TouchableOpacity>
                </View>
              ) : showEmptyState ? (
                <View style={styles.emptyStateBlock}>
                  <Text style={styles.historyEmptyText}>No rewards available for this day yet.</Text>
                </View>
              ) : (
                <>
                  <Text style={styles.sectionTitle}>Claim History</Text>
                  <View style={styles.historyList}>
                    {history.length > 0 ? (
                      history.map(item => (
                        <View key={item.id} style={styles.historyCard}>
                          <View style={styles.historyLeft}>
                            {item.image ? (
                              <Image source={{ uri: item.image }} style={styles.historyImage} />
                            ) : (
                              <View style={styles.historyImageFallback}>
                                <MaterialCommunityIcons name="gift-outline" size={18} color={colors.primary} />
                              </View>
                            )}
                            <View style={styles.historyBody}>
                              <Text style={styles.historyStoreTitle}>{item.title}</Text>
                              {item.subtitle ? (
                                <Text style={styles.historyRewardTitle} numberOfLines={1}>
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
                      ))
                    ) : (
                      <View style={styles.historyEmptyCardCompact}>
                        <Text style={styles.historyEmptyText}>No claimed rewards yet.</Text>
                      </View>
                    )}
                  </View>
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <RewardClaimModal reward={selectedReward} visible={Boolean(selectedReward)} onClose={() => setSelectedReward(null)} />
    </>
  );
};

export default DailyRewardsSheet;

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.18)',
    justifyContent: 'flex-end',
  },
  dismissArea: {
    flex: 1,
  },
  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 8,
    paddingHorizontal: 16,
    paddingBottom: 14,
    minHeight: 300,
    maxHeight: '46%',
  },
  grabber: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 999,
    backgroundColor: '#E6EAF2',
    marginBottom: 8,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  title: {
    fontSize: 18,
    color: colors.text,
    fontFamily: fonts.BOLD,
  },
  closeButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetScroll: {
    flexGrow: 0,
  },
  sheetScrollContent: {
    paddingBottom: 4,
  },
  daysRow: {
    gap: 10,
    paddingBottom: 8,
    paddingRight: 12,
  },
  dayCardWrap: {
    width: 46,
    alignItems: 'center',
  },
  dayLabel: {
    fontSize: 10,
    color: '#97A0B1',
    fontFamily: fonts.BOLD,
    textTransform: 'capitalize',
  },
  dayNumber: {
    marginTop: 2,
    fontSize: 18,
    color: colors.text,
    fontFamily: fonts.BOLD,
  },
  dayNumberToday: {
    color: colors.primaryDark,
  },
  rewardThumbCard: {
    width: 34,
    height: 34,
    borderRadius: 9,
    marginTop: 6,
    backgroundColor: '#F4F5F8',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#ECEFF4',
  },
  rewardThumbCardClaimed: {
    backgroundColor: '#FFF8EB',
  },
  rewardThumbCardLocked: {
    opacity: 0.55,
  },
  rewardThumbImage: {
    width: '100%',
    height: '100%',
  },
  selectionBar: {
    marginTop: 7,
    width: 18,
    height: 3,
    borderRadius: 999,
    backgroundColor: 'transparent',
  },
  selectionBarActive: {
    backgroundColor: '#5D55E6',
  },
  sectionTitle: {
    marginTop: 6,
    marginBottom: 8,
    fontSize: 15,
    color: colors.text,
    fontFamily: fonts.BOLD,
  },
  historyList: {
    borderTopWidth: 1,
    borderTopColor: '#EFF2F7',
  },
  historyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#EFF2F7',
    gap: 10,
  },
  historyLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  historyImage: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#F4F7FC',
  },
  historyImageFallback: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyBody: {
    flex: 1,
  },
  historyStoreTitle: {
    fontSize: 12,
    color: colors.text,
    fontFamily: fonts.BOLD,
  },
  historyRewardTitle: {
    marginTop: 2,
    fontSize: 11,
    color: '#475467',
    fontFamily: fonts.BOLD,
  },
  historyDate: {
    marginTop: 3,
    fontSize: 11,
    color: '#98A2B3',
    fontFamily: fonts.BOLD,
  },
  historyStatus: {
    color: '#2F9E63',
    fontSize: 11,
    fontFamily: fonts.BOLD,
  },
  historyEmptyCard: {
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyEmptyCardCompact: {
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyEmptyText: {
    fontSize: 13,
    color: '#98A2B3',
    fontFamily: fonts.BOLD,
  },
  emptyStateBlock: {
    minHeight: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stateCard: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 28,
    paddingHorizontal: 18,
  },
  stateTitle: {
    marginTop: 12,
    fontSize: 15,
    color: colors.text,
    fontFamily: fonts.BOLD,
  },
  stateText: {
    marginTop: 6,
    fontSize: 12,
    lineHeight: 18,
    color: colors.mutedText,
    textAlign: 'center',
    fontFamily: fonts.BOLD,
  },
  retryButton: {
    marginTop: 14,
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
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
    paddingBottom: 170,
  },
  claimCard: {
    width: '100%',
    borderRadius: 22,
    backgroundColor: '#6B3CF0',
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 16,
  },
  claimHeader: {
    alignItems: 'center',
  },
  claimCloseButton: {
    alignSelf: 'flex-end',
    marginBottom: 6,
  },
  qrOuter: {
    width: 128,
    height: 128,
    borderRadius: 12,
    backgroundColor: colors.white,
    padding: 8,
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
    marginTop: 14,
    backgroundColor: colors.white,
    borderRadius: 14,
    padding: 10,
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
    fontSize: 15,
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
    marginTop: 14,
    alignSelf: 'center',
    backgroundColor: colors.white,
    borderRadius: 999,
    paddingHorizontal: 24,
    paddingVertical: 11,
  },
  claimButtonText: {
    fontSize: 14,
    color: '#5E34E7',
    fontFamily: fonts.BOLD,
  },
});
