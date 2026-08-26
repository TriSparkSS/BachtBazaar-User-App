import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAppContext } from '../../../context/AppContext';
import { colors, fonts } from '../../../helpers/styles';
import { MainStackParamList } from '../../../navigation/types';
import { showAppAlert } from '../../../services/appAlert';
import {
  MilestoneFilter,
  getMilestoneBucket,
  milestonesApi,
} from '../../../services/milestonesApi';
import { Milestone } from '../../../types/milestone';
import GoalCard from './GoalCard';

const PAGE_BG = '#F4F6FA';

const FILTERS: { id: MilestoneFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'active', label: 'Active' },
  { id: 'done', label: 'Done' },
  { id: 'cancelled', label: 'Cancelled' },
  { id: 'expired', label: 'Expired' },
];

const RewardsScreen = () => {
  const navigation =
    useNavigation<StackNavigationProp<MainStackParamList, 'Rewards'>>();
  const insets = useSafeAreaInsets();
  const { authToken } = useAppContext();

  const [items, setItems] = useState<Milestone[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<MilestoneFilter>('all');

  const load = useCallback(async () => {
    const token = authToken?.trim();
    if (!token) {
      setItems([]);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      setItems(await milestonesApi.fetchMilestones(token));
    } catch (error) {
      showAppAlert(
        'Could not load rewards',
        error instanceof Error ? error.message : 'Please try again.',
      );
      setItems([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [authToken]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      void load();
    }, [load]),
  );

  const stats = useMemo(() => {
    const buckets = items.map(getMilestoneBucket);
    return {
      total: items.length,
      active: buckets.filter(bucket => bucket === 'active').length,
      done: buckets.filter(bucket => bucket === 'done').length,
      cancelled: buckets.filter(bucket => bucket === 'cancelled').length,
    };
  }, [items]);

  const filtered = useMemo(() => {
    if (filter === 'all') {
      return items;
    }
    return items.filter(item => getMilestoneBucket(item) === filter);
  }, [filter, items]);

  const bottomPad = Math.max(insets.bottom, 16) + 24;

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
          <Text style={styles.headerTitle}>Rewards</Text>
          <Text style={styles.headerSub}>Milestone tasks assigned by merchants</Text>
        </View>
      </View>

      {loading && items.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
          <Text style={styles.centerText}>Loading rewards...</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.list, { paddingBottom: bottomPad }]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                void load();
              }}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
          ListHeaderComponent={
            <View>
              <View style={styles.statsRow}>
                <View style={styles.statBox}>
                  <Text style={styles.statValue}>{stats.total}</Text>
                  <Text style={styles.statLabel}>Total</Text>
                </View>
                <View style={styles.statBox}>
                  <Text style={styles.statValue}>{stats.active}</Text>
                  <Text style={styles.statLabel}>Active</Text>
                </View>
                <View style={styles.statBox}>
                  <Text style={styles.statValue}>{stats.done}</Text>
                  <Text style={styles.statLabel}>Done</Text>
                </View>
                <View style={styles.statBox}>
                  <Text style={styles.statValue}>{stats.cancelled}</Text>
                  <Text style={styles.statLabel}>Cancelled</Text>
                </View>
              </View>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.filters}
              >
                {FILTERS.map(item => {
                  const selected = filter === item.id;
                  return (
                    <TouchableOpacity
                      key={item.id}
                      style={[styles.chip, selected && styles.chipActive]}
                      onPress={() => setFilter(item.id)}
                      activeOpacity={0.85}
                    >
                      <Text style={[styles.chipText, selected && styles.chipTextActive]}>
                        {item.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          }
          ListEmptyComponent={
            <View style={styles.emptyCard}>
              <View style={styles.emptyIcon}>
                <MaterialCommunityIcons name="gift-outline" size={28} color={colors.primary} />
              </View>
              <Text style={styles.emptyTitle}>
                {items.length === 0 ? 'No rewards yet' : 'Nothing in this filter'}
              </Text>
              <Text style={styles.emptyText}>
                {items.length === 0
                  ? 'Merchants will assign milestone tasks here. Complete them to unlock rewards.'
                  : 'Try another status to see more rewards.'}
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <GoalCard
              item={item}
              onPress={() =>
                navigation.navigate('RewardDetail', {
                  milestoneId: item.id,
                  milestone: item,
                })
              }
            />
          )}
        />
      )}
    </SafeAreaView>
  );
};

export default RewardsScreen;

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
    fontSize: 22,
    fontFamily: fonts.BOLD,
    color: colors.text,
  },
  headerSub: {
    marginTop: 2,
    fontSize: 13,
    color: colors.mutedText,
  },
  list: {
    paddingHorizontal: 16,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  statBox: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderGray,
  },
  statValue: {
    fontSize: 18,
    fontFamily: fonts.BOLD,
    color: colors.text,
  },
  statLabel: {
    marginTop: 2,
    fontSize: 11,
    color: colors.mutedText,
  },
  filters: {
    gap: 8,
    paddingBottom: 14,
  },
  chip: {
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.borderGray,
  },
  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: {
    fontSize: 13,
    fontFamily: fonts.BOLD,
    color: colors.primary,
  },
  chipTextActive: {
    color: colors.white,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  centerText: {
    fontSize: 13,
    color: colors.mutedText,
  },
  emptyCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 28,
    alignItems: 'center',
  },
  emptyIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontFamily: fonts.BOLD,
    color: colors.text,
  },
  emptyText: {
    marginTop: 6,
    fontSize: 13,
    color: colors.mutedText,
    textAlign: 'center',
    lineHeight: 18,
  },
});
