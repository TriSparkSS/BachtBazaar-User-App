import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { RouteProp, useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAppContext } from '../../../context/AppContext';
import { colors, fonts } from '../../../helpers/styles';
import { MainStackParamList } from '../../../navigation/types';
import { showAppAlert } from '../../../services/appAlert';
import {
  formatActionTypeLabel,
  formatMilestoneDate,
  formatMilestoneDateTime,
  formatMilestoneStatusLabel,
  formatMilestoneTimeLeft,
  getMerchantDisplayName,
  getMilestoneBucket,
  milestonesApi,
} from '../../../services/milestonesApi';
import { Milestone } from '../../../types/milestone';

const PAGE_BG = '#F4F6FA';

const statusTone = (item: Milestone) => {
  switch (getMilestoneBucket(item)) {
    case 'done':
      return { bg: colors.pastelGreen, text: colors.darkgreen };
    case 'cancelled':
      return { bg: '#FFE5E5', text: colors.red };
    case 'expired':
      return { bg: colors.searchBg, text: colors.mutedText };
    default:
      return { bg: colors.primarySoft, text: colors.primary };
  }
};

const DetailRow = ({ label, value }: { label: string; value: string }) => (
  <View style={styles.detailRow}>
    <Text style={styles.detailLabel}>{label}</Text>
    <Text style={styles.detailValue}>{value}</Text>
  </View>
);

const RewardDetailScreen = () => {
  const navigation =
    useNavigation<StackNavigationProp<MainStackParamList, 'RewardDetail'>>();
  const route = useRoute<RouteProp<MainStackParamList, 'RewardDetail'>>();
  const { authToken } = useAppContext();

  const [milestone, setMilestone] = useState<Milestone | undefined>(route.params.milestone);
  const [loading, setLoading] = useState(!route.params.milestone);

  const load = useCallback(async () => {
    const token = authToken?.trim();
    const id = route.params.milestoneId?.trim();
    if (!token || !id) {
      setLoading(false);
      return;
    }

    try {
      const fresh = await milestonesApi.fetchMilestone(token, id);
      if (fresh) {
        setMilestone(fresh);
      } else if (!route.params.milestone) {
        showAppAlert('Reward not found', 'This reward may have been removed.');
      }
    } catch (error) {
      if (!route.params.milestone) {
        showAppAlert(
          'Could not load reward',
          error instanceof Error ? error.message : 'Please try again.',
        );
      }
    } finally {
      setLoading(false);
    }
  }, [authToken, route.params.milestone, route.params.milestoneId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const tone = useMemo(() => (milestone ? statusTone(milestone) : null), [milestone]);
  const timeLeft = milestone ? formatMilestoneTimeLeft(milestone.expiresAt) : '';

  const openMerchant = () => {
    if (!milestone?.shopId) {
      return;
    }
    navigation.navigate('StoreDetail', { shopId: milestone.shopId });
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.85}
        >
          <MaterialCommunityIcons name="arrow-left" size={22} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerCopy}>
          <Text style={styles.headerTitle}>Reward Detail</Text>
          {milestone?.title ? (
            <Text style={styles.headerSub} numberOfLines={1}>
              {milestone.title}
            </Text>
          ) : null}
        </View>
      </View>

      {loading && !milestone ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : !milestone ? (
        <View style={styles.center}>
          <Text style={styles.emptyText}>This reward is not available.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.card}>
            <View style={styles.topRow}>
              <Text style={styles.goalTitle}>{milestone.title}</Text>
              {tone ? (
                <View style={[styles.badge, { backgroundColor: tone.bg }]}>
                  <Text style={[styles.badgeText, { color: tone.text }]}>
                    {formatMilestoneStatusLabel(milestone)}
                  </Text>
                </View>
              ) : null}
            </View>
            <Text style={styles.meta}>
              {formatActionTypeLabel(milestone.actionType)} · {milestone.currentCount}/
              {milestone.targetCount}
            </Text>
            <View style={styles.progressTrack}>
              <View
                style={[styles.progressFill, { width: `${milestone.progressPercentage}%` }]}
              />
            </View>
            <Text style={styles.percent}>{milestone.progressPercentage}% complete</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Merchant</Text>
            <TouchableOpacity
              style={styles.merchantRow}
              activeOpacity={milestone.shopId ? 0.85 : 1}
              onPress={openMerchant}
              disabled={!milestone.shopId}
            >
              <View style={styles.merchantAvatar}>
                <MaterialCommunityIcons name="storefront-outline" size={22} color={colors.white} />
              </View>
              <View style={styles.merchantCopy}>
                <Text style={styles.merchantName}>{getMerchantDisplayName(milestone)}</Text>
                {milestone.merchantPhone ? (
                  <Text style={styles.merchantPhone}>{milestone.merchantPhone}</Text>
                ) : null}
              </View>
              {milestone.shopId ? (
                <MaterialCommunityIcons name="chevron-right" size={22} color={colors.mutedText} />
              ) : null}
            </TouchableOpacity>
          </View>

          {milestone.rewardDescription ? (
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Reward</Text>
              <View style={styles.rewardBox}>
                <MaterialCommunityIcons name="gift" size={20} color="#B45309" />
                <Text style={styles.rewardText}>{milestone.rewardDescription}</Text>
              </View>
            </View>
          ) : null}

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Goal Details</Text>
            <DetailRow label="Action Type" value={formatActionTypeLabel(milestone.actionType)} />
            <DetailRow label="Target Count" value={String(milestone.targetCount)} />
            <DetailRow label="Current Count" value={String(milestone.currentCount)} />
            <DetailRow
              label="Expires"
              value={formatMilestoneDate(milestone.expiresAt) || '—'}
            />
            <DetailRow label="Time Left" value={timeLeft || '—'} />
            <DetailRow
              label="Created"
              value={formatMilestoneDateTime(milestone.createdAt) || '—'}
            />
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

export default RewardDetailScreen;

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: PAGE_BG,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 14,
    gap: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderGray,
  },
  headerCopy: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: fonts.BOLD,
    color: colors.text,
  },
  headerSub: {
    marginTop: 2,
    fontSize: 13,
    color: colors.mutedText,
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 28,
    gap: 12,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 16,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  goalTitle: {
    flex: 1,
    fontSize: 20,
    fontFamily: fonts.BOLD,
    color: colors.text,
  },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: {
    fontSize: 12,
    fontFamily: fonts.BOLD,
  },
  meta: {
    marginTop: 8,
    fontSize: 14,
    color: colors.mutedText,
  },
  progressTrack: {
    marginTop: 14,
    height: 8,
    borderRadius: 999,
    backgroundColor: colors.searchBg,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: colors.primary,
  },
  percent: {
    marginTop: 8,
    fontSize: 13,
    color: colors.mutedText,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: fonts.BOLD,
    color: colors.text,
    marginBottom: 12,
  },
  merchantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  merchantAvatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  merchantCopy: {
    flex: 1,
  },
  merchantName: {
    fontSize: 16,
    fontFamily: fonts.BOLD,
    color: colors.text,
  },
  merchantPhone: {
    marginTop: 2,
    fontSize: 13,
    color: colors.mutedText,
  },
  rewardBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFF6E5',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  rewardText: {
    flex: 1,
    fontSize: 15,
    fontFamily: fonts.BOLD,
    color: '#B45309',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderGray,
    gap: 12,
  },
  detailLabel: {
    fontSize: 14,
    color: colors.mutedText,
  },
  detailValue: {
    flex: 1,
    textAlign: 'right',
    fontSize: 14,
    fontFamily: fonts.BOLD,
    color: colors.text,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  emptyText: {
    fontSize: 14,
    color: colors.mutedText,
    textAlign: 'center',
  },
});
