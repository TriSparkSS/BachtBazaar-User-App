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
            ) : (
              <>
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
                        onPress={() => {
                          if (isSelected && primaryReward) {
                            setSelectedReward(primaryReward);
                            return;
                          }

                          onDateSelect(dateItem.key);
                        }}
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
                            <MaterialCommunityIcons
                              name="gift-outline"
                              size={16}
                              color="#D1A13B"
                            />
                          )}
                        </View>
                        <View style={[styles.selectionBar, isSelected && styles.selectionBarActive]} />
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>

                <Text style={styles.sectionTitle}>Claim History</Text>
                <ScrollView
                  style={styles.historyScroll}
                  contentContainerStyle={styles.historyContent}
                  showsVerticalScrollIndicator={false}
                >
                  {history.length > 0 ? (
                    history.map(item => (
                      <View key={item.id} style={styles.historyCard}>
                        <View style={styles.historyLeft}>
                          {item.image ? (
                            <Image source={{ uri: item.image }} style={styles.historyImage} />
                          ) : (
                            <View style={styles.historyImageFallback}>
                              <MaterialCommunityIcons name="gift-outline" size={16} color={colors.primary} />
                            </View>
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
                    ))
                  ) : entries.length === 0 ? (
                    <View style={styles.historyEmptyCard}>
                      <Text style={styles.historyEmptyText}>No rewards available for this day yet.</Text>
                    </View>
                  ) : (
                    <View style={styles.historyEmptyCard}>
                      <Text style={styles.historyEmptyText}>No claimed rewards yet.</Text>
                    </View>
                  )}
                </ScrollView>
              </>
            )}
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
    backgroundColor: 'rgba(15, 23, 42, 0.28)',
    justifyContent: 'flex-end',
  },
  dismissArea: {
    flex: 1,
  },
  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingTop: 6,
    paddingHorizontal: 16,
    paddingBottom: 24,
    minHeight: 470,
    maxHeight: '74%',
  },
  grabber: {
    alignSelf: 'center',
    width: 34,
    height: 3,
    borderRadius: 999,
    backgroundColor: '#E5E7EB',
    marginBottom: 10,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    color: colors.text,
    fontFamily: fonts.BOLD,
  },
  closeButton: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  daysRow: {
    gap: 10,
    paddingBottom: 14,
    paddingRight: 10,
  },
  dayCardWrap: {
    width: 48,
    alignItems: 'center',
  },
  dayLabel: {
    fontSize: 10,
    color: '#A0A8B8',
    fontFamily: fonts.BOLD,
    textTransform: 'capitalize',
  },
  dayNumber: {
    marginTop: 3,
    fontSize: 18,
    color: colors.text,
    fontFamily: fonts.BOLD,
  },
  dayNumberToday: {
    color: colors.primaryDark,
  },
  rewardThumbCard: {
    width: 32,
    height: 32,
    borderRadius: 8,
    marginTop: 8,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#EEF1F5',
  },
  rewardThumbCardClaimed: {
    backgroundColor: '#FFF8EB',
  },
  rewardThumbImage: {
    width: '100%',
    height: '100%',
  },
  selectionBar: {
    marginTop: 7,
    width: 20,
    height: 3,
    borderRadius: 999,
    backgroundColor: 'transparent',
  },
  selectionBarActive: {
    backgroundColor: '#5D55E6',
  },
  sectionTitle: {
    marginTop: 2,
    marginBottom: 8,
    fontSize: 15,
    color: colors.text,
    fontFamily: fonts.BOLD,
  },
  historyScroll: {
    flex: 1,
  },
  historyContent: {
    paddingBottom: 8,
  },
  historyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 11,
    borderTopWidth: 1,
    borderTopColor: '#EFF2F7',
    gap: 10,
  },
  historyLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  historyImage: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#F4F7FC',
  },
  historyImageFallback: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyBody: {
    flex: 1,
  },
  historyTitle: {
    fontSize: 12,
    color: colors.text,
    fontFamily: fonts.BOLD,
  },
  historySubtitle: {
    marginTop: 2,
    fontSize: 11,
    color: '#475467',
    fontFamily: fonts.BOLD,
  },
  historyDate: {
    marginTop: 2,
    fontSize: 10,
    color: '#98A2B3',
    fontFamily: fonts.BOLD,
  },
  historyStatus: {
    color: '#2F9E63',
    fontSize: 11,
    fontFamily: fonts.BOLD,
  },
  historyEmptyCard: {
    flex: 1,
    minHeight: 160,
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyEmptyText: {
    fontSize: 12,
    color: '#98A2B3',
    fontFamily: fonts.BOLD,
  },
  stateCard: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 42,
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
