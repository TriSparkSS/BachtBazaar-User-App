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
import QRCode from 'react-native-qrcode-svg';
import ScratchToReveal from './ScratchToReveal';
import { useAppContext } from '../context/AppContext';
import { colors, fonts } from '../helpers/styles';
import { resolveOfferQrValue } from '../helpers/offerQrCode';
import { DailyCalendarDay, DailyRewardEntry, DailyRewardHistoryItem, DailyRewardsCalendar } from '../types/dailyRewards';
import { showAppAlert } from '../services/appAlert';

type ClaimModalPhase = 'details' | 'scratch' | 'revealed';

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');
const ACTIVE_BLUE = '#366FE0';
const HEART_RED = '#E11D48';
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
  togglingOfferId?: string | null;
  onClose: () => void;
  onRetry: () => void;
  onDateSelect: (date: string) => void;
  onClaimReward: (reward: DailyRewardEntry) => Promise<string | void>;
  onToggleWishlist?: (reward: DailyRewardEntry) => void | Promise<void>;
  onOpenHistory: () => void;
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

const QR_SIZE = 168;
const QR_FRAME = 188;

const RewardQrVisual = ({ value, framed = true }: { value: string; framed?: boolean }) =>
  framed ? (
    <View style={styles.qrOuter}>
      <QRCode value={value} size={QR_SIZE} backgroundColor={colors.white} color="#111827" />
    </View>
  ) : (
    <QRCode value={value} size={QR_SIZE} backgroundColor={colors.white} color="#111827" />
  );

const RewardQrPlaceholder = () => (
  <View style={styles.qrPlaceholder}>
    <View style={styles.qrPlaceholderInner}>
      <MaterialCommunityIcons name="gift-outline" size={42} color={ACTIVE_BLUE} />
      <Text style={styles.qrPlaceholderText}>Claim to unlock QR</Text>
    </View>
  </View>
);

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
  phase,
  onClose,
  onClaim,
  onScratchRevealed,
  isClaiming,
  resolveImageUrl,
  userId,
}: {
  reward: DailyRewardEntry | null;
  visible: boolean;
  phase: ClaimModalPhase;
  onClose: () => void;
  onClaim: (reward: DailyRewardEntry) => Promise<void>;
  onScratchRevealed: () => void;
  isClaiming: boolean;
  resolveImageUrl: (path?: string | null) => string | undefined;
  userId?: string;
}) => {
  if (!reward) {
    return null;
  }

  const rewardImage = resolveImageUrl(reward.image) ?? reward.image;
  const qrValue = resolveOfferQrValue(
    {
      id: reward.offerId || reward.id,
      offerId: reward.offerId || reward.id,
      userId,
      merchantId: reward.merchantId,
      shopId: reward.shopId,
      title: reward.title,
      description: reward.description,
      discountBadge: reward.discountBadge,
      minimumPurchaseAmount: reward.minimumPurchaseAmount,
      startDate: reward.startDate,
      endDate: reward.endDate,
      thumbnail: reward.image,
      offerType: reward.offerType || reward.displayType || 'offer',
      displayType: reward.displayType,
      shopName: reward.shopName,
      isActive: true,
    },
    reward.qrValue,
  );

  const showScratch = phase === 'scratch';
  const showQr = phase === 'revealed' || showScratch;
  const headerCaption =
    phase === 'details'
      ? 'Claim your reward'
      : phase === 'scratch'
        ? 'Scratch to reveal QR'
        : 'Scan to redeem';

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.claimBackdrop}>
        <View style={styles.claimCard}>
          <View style={styles.claimHeader}>
            <TouchableOpacity style={styles.claimCloseButton} onPress={onClose} activeOpacity={0.85}>
              <MaterialCommunityIcons name="close" size={20} color={colors.white} />
            </TouchableOpacity>

            {phase === 'details' ? (
              <RewardQrPlaceholder />
            ) : showScratch ? (
              <ScratchToReveal
                key={`${reward.id}-scratch`}
                width={QR_FRAME}
                height={QR_FRAME}
                hint="Scratch to reveal"
                onRevealed={onScratchRevealed}>
                <RewardQrVisual value={qrValue} framed={false} />
              </ScratchToReveal>
            ) : showQr ? (
              <RewardQrVisual value={qrValue} />
            ) : null}

            <Text style={styles.claimScanText}>{headerCaption}</Text>
          </View>

          <View style={styles.claimInfoCard}>
            {rewardImage ? <Image source={{ uri: rewardImage }} style={styles.claimThumb} /> : null}
            <View style={styles.claimInfoBody}>
              <Text style={styles.claimMerchant}>{reward.shopName || reward.subtitle || 'Partner Offer'}</Text>
              <Text style={styles.claimTitle}>{reward.title}</Text>
              {reward.description ? (
                <Text style={styles.claimDescription} numberOfLines={2}>
                  {reward.description}
                </Text>
              ) : null}
              <Text style={styles.claimValidity}>{reward.validText || 'Valid today only'}</Text>
              <View style={styles.claimMetaRow}>
                {reward.discountBadge ? (
                  <View style={styles.claimMetaChip}>
                    <Text style={styles.claimMetaChipText}>{reward.discountBadge}</Text>
                  </View>
                ) : null}
                {reward.minimumPurchaseAmount != null ? (
                  <View style={styles.claimMetaChip}>
                    <Text style={styles.claimMetaChipText}>
                      Min. Rs. {reward.minimumPurchaseAmount.toLocaleString('en-IN')}
                    </Text>
                  </View>
                ) : null}
                {reward.distanceKm != null ? (
                  <View style={styles.claimMetaChip}>
                    <Text style={styles.claimMetaChipText}>{reward.distanceKm.toFixed(1)} km</Text>
                  </View>
                ) : null}
              </View>
            </View>
          </View>

          {phase === 'details' ? (
            <TouchableOpacity
              style={[styles.claimButton, (reward.isClaimed || isClaiming) && styles.claimButtonDisabled]}
              activeOpacity={0.88}
              disabled={reward.isClaimed || isClaiming}
              onPress={() => onClaim(reward)}>
              {isClaiming ? (
                <ActivityIndicator size="small" color={ACTIVE_BLUE} />
              ) : (
                <Text style={styles.claimButtonText}>
                  {reward.isClaimed ? 'Already Redeemed' : 'Claim Now'}
                </Text>
              )}
            </TouchableOpacity>
          ) : phase === 'revealed' ? (
            <TouchableOpacity style={styles.claimButton} activeOpacity={0.88} onPress={onClose}>
              <Text style={styles.claimButtonText}>Done</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.scratchHintButton}>
              <Text style={styles.scratchHintButtonText}>Keep scratching to unlock</Text>
            </View>
          )}
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
  togglingOfferId,
  onClose,
  onRetry,
  onDateSelect,
  onClaimReward,
  onToggleWishlist,
  onOpenHistory,
  resolveImageUrl,
}) => {
  const insets = useSafeAreaInsets();
  const { currentUser } = useAppContext();
  const calendarScrollRef = useRef<ScrollView>(null);
  const [selectedReward, setSelectedReward] = useState<DailyRewardEntry | null>(null);
  const [claimPhase, setClaimPhase] = useState<ClaimModalPhase>('details');
  const [isClaimingReward, setIsClaimingReward] = useState(false);
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
      setClaimPhase('details');
    }
  }, [visible]);

  useEffect(() => {
    if (!selectedReward) {
      return;
    }

    const refreshed =
      entries.find(
        entry =>
          entry.id === selectedReward.id ||
          (entry.offerId &&
            selectedReward.offerId &&
            entry.offerId === selectedReward.offerId),
      ) ?? null;

    if (!refreshed) {
      return;
    }

    if (
      refreshed.isClaimed !== selectedReward.isClaimed ||
      refreshed.statusLabel !== selectedReward.statusLabel ||
      refreshed.qrValue !== selectedReward.qrValue
    ) {
      setSelectedReward(refreshed);
      if (refreshed.isClaimed && claimPhase === 'details') {
        setClaimPhase('revealed');
      }
    }
  }, [entries, selectedReward, claimPhase]);

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
    const normalized = (rawStatus || '').toLowerCase();
    // Prefer explicit history/API status: claimed | redeem | expire
    if (normalized.includes('claim')) {
      return 'Claimed';
    }
    if (normalized.includes('redeem')) {
      return 'Redeem';
    }
    if (normalized.includes('expir')) {
      return 'Expire';
    }
    if (isClaimed) {
      return 'Redeem';
    }

    // Past dates / expired endDate: Expire (never Available)
    if (isPastSelectedDate) {
      return 'Expire';
    }

    // Today / future: Available
    if (isFutureOrToday) {
      return normalized === 'available' || !rawStatus ? 'Available' : rawStatus;
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
    wishlist?: {
      isWishlisted: boolean;
      isToggling: boolean;
      onToggle?: () => void;
    },
  ) => {
    const normalizedStatus = statusLabel?.toLowerCase();
    const isClaimed =
      normalizedStatus === 'claimed' ||
      normalizedStatus === 'redeem' ||
      normalizedStatus === 'redeemed';
    const isExpired =
      normalizedStatus === 'expired' || normalizedStatus === 'expire';

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
          {wishlist?.onToggle ? (
            <TouchableOpacity
              style={styles.historyHeartButton}
              activeOpacity={0.85}
              disabled={wishlist.isToggling}
              onPress={event => {
                event.stopPropagation?.();
                wishlist.onToggle?.();
              }}>
              {wishlist.isToggling ? (
                <ActivityIndicator size="small" color={HEART_RED} />
              ) : (
                <MaterialCommunityIcons
                  name={wishlist.isWishlisted ? 'heart' : 'heart-outline'}
                  size={16}
                  color={wishlist.isWishlisted ? HEART_RED : '#667085'}
                />
              )}
            </TouchableOpacity>
          ) : null}
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

  const wishlistPropsFor = (entry: DailyRewardEntry) => {
    if (!onToggleWishlist) {
      return undefined;
    }
    const offerId = entry.offerId?.trim() || entry.id.trim();
    return {
      isWishlisted: Boolean(entry.isWishlisted),
      isToggling: Boolean(offerId && togglingOfferId === offerId),
      onToggle: () => onToggleWishlist(entry),
    };
  };

  const openClaimQrIfAllowed = (reward: DailyRewardEntry) => {
    // Past offers are expired — do not open claim screen
    if (isPastSelectedDate || reward.date < todayKey) {
      return;
    }

    // Already redeemed → open QR directly (skip claim/scratch).
    setClaimPhase(reward.isClaimed ? 'revealed' : 'details');
    setSelectedReward(reward);
  };

  const openHistoryOffer = (item: DailyRewardHistoryItem) => {
    const status = (item.statusLabel || '').toLowerCase();
    const isRedeemed =
      status.includes('redeem') || status.includes('claim') || status.includes('used');
    if (!isRedeemed) {
      return;
    }

    const matched =
      entries.find(
        entry =>
          (item.offerId && (entry.offerId === item.offerId || entry.id === item.offerId)) ||
          entry.id === item.id ||
          entry.offerId === item.id,
      ) ?? null;

    const reward: DailyRewardEntry =
      matched ??
      ({
        id: item.offerId || item.id,
        offerId: item.offerId || item.id,
        date: selectedDate,
        dayLabel: '',
        dayNumber: '',
        title: item.title,
        subtitle: item.subtitle,
        image: item.image,
        isClaimed: true,
        isToday: selectedDate === todayKey,
        isLocked: false,
        isAvailable: false,
        claimedAt: item.claimedAt,
        statusLabel: 'Redeem',
      } as DailyRewardEntry);

    setClaimPhase('revealed');
    setSelectedReward(reward);
  };

  const closeClaimModal = () => {
    setSelectedReward(null);
    setClaimPhase('details');
  };

  const handleClaimReward = async (reward: DailyRewardEntry) => {
    try {
      setIsClaimingReward(true);
      await onClaimReward(reward);
      // Optimistically mark as redeemed while parent refreshes calendar API.
      setSelectedReward(prev =>
        prev
          ? {
              ...prev,
              isClaimed: true,
              isAvailable: false,
              statusLabel: 'Redeem',
              claimedAt: prev.claimedAt || new Date().toISOString(),
            }
          : prev,
      );
      setClaimPhase('scratch');
    } catch (error) {
      showAppAlert(
        'Claim failed',
        error instanceof Error ? error.message : 'Could not claim this reward.',
      );
    } finally {
      setIsClaimingReward(false);
    }
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

    // Prefer calendar offers for the selected day (status already merged from history).
    if (entries.length > 0) {
      return entries.map(entry => {
        const rewardImage = resolveImageUrl(entry.image) ?? entry.image;
        const statusLabel = resolveOfferStatusLabel(
          entry.statusLabel || (entry.isClaimed ? 'Redeem' : 'Available'),
          entry.isClaimed,
        );
        const canOpenQr =
          !isPastSelectedDate &&
          (statusLabel === 'Claimed' ||
            statusLabel === 'Redeem' ||
            statusLabel === 'Available');
        return renderHistoryItem(
          entry.id,
          entry.title,
          entry.subtitle || entry.shopName,
          formatClaimedDate(entry.claimedAt) ||
            (selectedDate === todayKey ? 'Today' : formatClaimedDate(selectedDate)),
          statusLabel,
          rewardImage,
          canOpenQr ? () => openClaimQrIfAllowed(entry) : undefined,
          wishlistPropsFor(entry),
        );
      });
    }

    if (history.length > 0) {
      return history.map(item => {
        const imageUri = resolveImageUrl(item.image) ?? item.image;
        const statusLabel = resolveOfferStatusLabel(
          item.statusLabel,
          item.statusLabel?.toLowerCase().includes('claim') ||
            item.statusLabel?.toLowerCase().includes('redeem'),
        );
        const canOpenQr =
          statusLabel?.toLowerCase() === 'redeem' ||
          statusLabel?.toLowerCase() === 'redeemed' ||
          statusLabel?.toLowerCase() === 'claimed';
        return renderHistoryItem(
          item.id,
          item.title,
          item.subtitle,
          formatClaimedDate(item.claimedAt),
          statusLabel,
          imageUri,
          canOpenQr ? () => openHistoryOffer(item) : undefined,
        );
      });
    }

    if (primaryReward) {
      const rewardImage = resolveImageUrl(primaryReward.image) ?? primaryReward.image;
      const statusLabel = resolveOfferStatusLabel(
        primaryReward.statusLabel || (primaryReward.isClaimed ? 'Redeem' : 'Available'),
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
        wishlistPropsFor(primaryReward),
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

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Claim History</Text>
              <TouchableOpacity activeOpacity={0.8} onPress={onOpenHistory}>
                <Text style={styles.sectionAction}>View All</Text>
              </TouchableOpacity>
            </View>

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
        phase={claimPhase}
        onClose={closeClaimModal}
        onClaim={handleClaimReward}
        onScratchRevealed={() => setClaimPhase('revealed')}
        isClaiming={isClaimingReward}
        resolveImageUrl={resolveImageUrl}
        userId={currentUser?._id}
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
  sectionHeader: {
    marginTop: 20,
    marginBottom: 8,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontSize: 16,
    color: '#1F2937',
    fontFamily: fonts.BOLD,
    letterSpacing: -0.2,
  },
  sectionAction: {
    fontSize: 12,
    color: ACTIVE_BLUE,
    fontFamily: fonts.BOLD,
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
  historyHeartButton: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
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
    width: QR_FRAME,
    height: QR_FRAME,
    borderRadius: 16,
    backgroundColor: colors.white,
    padding: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrPlaceholder: {
    width: QR_FRAME,
    height: QR_FRAME,
    borderRadius: 16,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  qrPlaceholderInner: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  qrPlaceholderText: {
    fontSize: 13,
    color: '#64748B',
    fontFamily: fonts.BOLD,
    textAlign: 'center',
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
  claimDescription: {
    marginTop: 4,
    fontSize: 11,
    lineHeight: 16,
    color: '#667085',
    fontFamily: fonts.BOLD,
  },
  claimValidity: {
    marginTop: 3,
    fontSize: 11,
    color: '#B42318',
    fontFamily: fonts.BOLD,
  },
  claimMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  claimMetaChip: {
    backgroundColor: '#EEF4FF',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  claimMetaChipText: {
    fontSize: 10,
    color: ACTIVE_BLUE,
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
  claimButtonDisabled: {
    opacity: 0.65,
  },
  claimButtonText: {
    fontSize: 15,
    color: ACTIVE_BLUE,
    fontFamily: fonts.BOLD,
  },
  scratchHintButton: {
    marginTop: 18,
    alignSelf: 'center',
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  scratchHintButtonText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.9)',
    fontFamily: fonts.BOLD,
  },
});
