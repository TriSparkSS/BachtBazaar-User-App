import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import MerchantBidsView from './MerchantBidsView';
import { useAppContext } from '../../../context/AppContext';
import { MainStackParamList } from '../../../navigation/types';
import { MerchantBidData, bestRequestApi } from '../../../services/bestRequestApi';
import { showAppAlert } from '../../../services/appAlert';
import { colors, fonts } from '../../../helpers/styles';

const CreateRequestOffers = () => {
  const navigation =
    useNavigation<StackNavigationProp<MainStackParamList, 'CreateRequestOffers'>>();
  const route = useRoute();
  const params = route.params as MainStackParamList['CreateRequestOffers'];
  const { authToken } = useAppContext();

  const [bids, setBids] = useState<MerchantBidData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadBids = useCallback(async () => {
    if (!authToken?.trim()) {
      setBids([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const result = await bestRequestApi.fetchBidsForRequest(params.requestId, authToken);
      setBids(result);
    } catch (error) {
      showAppAlert(
        'Could not load offers',
        error instanceof Error ? error.message : 'Please try again.',
      );
      setBids([]);
    } finally {
      setIsLoading(false);
    }
  }, [authToken, params.requestId]);

  useEffect(() => {
    loadBids();
  }, [loadBids]);

  const priceSummary = useMemo(() => {
    const prices = bids
      .map(item => item.bidAmount ?? item.price ?? item.offerPrice)
      .filter((value): value is number => typeof value === 'number' && Number.isFinite(value));

    if (!prices.length) {
      if (params.budget != null) {
        return `Budget ₹${params.budget.toLocaleString('en-IN')}`;
      }
      return `${bids.length} offers received`;
    }

    const min = Math.min(...prices);
    const max = Math.max(...prices);
    if (min === max) {
      return `Best ₹${min.toLocaleString('en-IN')}`;
    }
    return `₹${min.toLocaleString('en-IN')} - ₹${max.toLocaleString('en-IN')}`;
  }, [bids, params.budget]);

  return (
    <View style={styles.root}>
      <SafeAreaView edges={['top']} style={styles.headerSafe}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
            activeOpacity={0.85}>
            <MaterialCommunityIcons name="arrow-left" size={22} color={colors.white} />
          </TouchableOpacity>
          <View style={styles.headerCopy}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {params.title}
            </Text>
            <Text style={styles.headerSub}>{priceSummary}</Text>
          </View>
          <View style={styles.backBtn} />
        </View>

        {params.budget != null || params.timeframe ? (
          <View style={styles.summaryCard}>
            <View style={styles.summaryCol}>
              <Text style={styles.summaryLabel}>Budget</Text>
              <Text style={styles.summaryValue}>
                {params.budget != null ? `₹${params.budget.toLocaleString('en-IN')}` : '—'}
              </Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryCol}>
              <Text style={styles.summaryLabel}>Needed</Text>
              <Text style={[styles.summaryValue, styles.summaryNeed]}>
                {params.timeframe || 'Flexible'}
              </Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryCol}>
              <Text style={styles.summaryLabel}>Offers</Text>
              <Text style={[styles.summaryValue, styles.summaryOffers]}>{bids.length}</Text>
            </View>
          </View>
        ) : null}
      </SafeAreaView>

      <View style={styles.body}>
        <MerchantBidsView bids={bids} isLoading={isLoading} onRefresh={loadBids} />
      </View>
    </View>
  );
};

export default CreateRequestOffers;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.primary,
  },
  headerSafe: {
    backgroundColor: colors.primary,
    paddingBottom: 12,
  },
  header: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  backBtn: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCopy: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  headerTitle: {
    fontSize: 17,
    color: colors.white,
    fontFamily: fonts.BOLD,
  },
  headerSub: {
    marginTop: 2,
    fontSize: 12,
    color: 'rgba(255,255,255,0.9)',
    fontFamily: fonts.BOLD,
  },
  summaryCard: {
    marginHorizontal: 16,
    marginTop: 4,
    backgroundColor: colors.white,
    borderRadius: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryCol: {
    flex: 1,
    alignItems: 'center',
  },
  summaryDivider: {
    width: 1,
    height: 34,
    backgroundColor: '#E8ECF3',
  },
  summaryLabel: {
    fontSize: 11,
    color: colors.mutedText,
    fontFamily: fonts.BOLD,
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 13,
    color: colors.text,
    fontFamily: fonts.BOLD,
    textTransform: 'capitalize',
  },
  summaryNeed: {
    color: colors.primary,
  },
  summaryOffers: {
    color: '#1B8A3E',
  },
  body: {
    flex: 1,
    backgroundColor: '#F4F6FA',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
    paddingTop: 8,
  },
});
