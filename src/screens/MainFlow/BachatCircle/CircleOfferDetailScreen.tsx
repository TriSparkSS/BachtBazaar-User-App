import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Image,
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
import { fonts } from '../../../helpers/styles';
import { MainStackParamList } from '../../../navigation/types';
import { showAppAlert } from '../../../services/appAlert';
import {
  CIRCLE_REACTIONS,
  CircleReactionKey,
  SharedCircleOfferDto,
  bachatCircleApi,
} from '../../../services/bachatCircleApi';
import { circleColors, circleShadow } from './theme';

const formatDate = (value?: string) => {
  if (!value) {
    return '—';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
};

const CircleOfferDetailScreen = () => {
  const navigation =
    useNavigation<
      StackNavigationProp<MainStackParamList, 'BachatCircleOfferDetail'>
    >();
  const route =
    useRoute<RouteProp<MainStackParamList, 'BachatCircleOfferDetail'>>();
  const { authToken } = useAppContext();
  const { sharedOfferId, circleId } = route.params;

  const [offer, setOffer] = useState<SharedCircleOfferDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [reacting, setReacting] = useState(false);

  const load = useCallback(async () => {
    const token = authToken?.trim();
    if (!token) {
      return;
    }
    try {
      const list = await bachatCircleApi.listOffers(token, circleId);
      const match = list.find(item => item.id === sharedOfferId) || list[0];
      setOffer(match || null);
    } catch (error) {
      showAppAlert(
        'Could not load offer',
        error instanceof Error ? error.message : 'Please try again.',
      );
    }
  }, [authToken, circleId, sharedOfferId]);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      (async () => {
        setLoading(true);
        await load();
        if (alive) {
          setLoading(false);
        }
      })();
      return () => {
        alive = false;
      };
    }, [load]),
  );

  const onReact = async (reaction: CircleReactionKey) => {
    const token = authToken?.trim();
    if (!token || !offer) {
      return;
    }
    setReacting(true);
    try {
      await bachatCircleApi.reactToOffer(token, circleId, offer.id, reaction);
      setOffer(prev => {
        if (!prev) {
          return prev;
        }
        const prevCounts = { ...(prev.reactionCounts || {}) };
        if (prev.myReaction && prevCounts[prev.myReaction]) {
          prevCounts[prev.myReaction] = Math.max(
            0,
            (prevCounts[prev.myReaction] || 0) - 1,
          );
        }
        prevCounts[reaction] = (prevCounts[reaction] || 0) + 1;
        return {
          ...prev,
          myReaction: reaction,
          reactionCounts: prevCounts,
          totalReactions: Object.values(prevCounts).reduce(
            (sum, n) => sum + (n || 0),
            0,
          ),
        };
      });
    } catch (error) {
      showAppAlert(
        'Reaction failed',
        error instanceof Error ? error.message : 'Please try again.',
      );
    } finally {
      setReacting(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.safe, styles.center]} edges={['top']}>
        <ActivityIndicator color={circleColors.green} />
      </SafeAreaView>
    );
  }

  if (!offer) {
    return (
      <SafeAreaView style={[styles.safe, styles.center]} edges={['top']}>
        <Text style={styles.empty}>Offer not found in this circle.</Text>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.link}>Go back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
          <MaterialCommunityIcons name="arrow-left" size={22} color={circleColors.green} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Offer Details</Text>
        <View style={styles.iconBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {offer.thumbnail ? (
          <Image source={{ uri: offer.thumbnail }} style={styles.hero} />
        ) : (
          <View style={[styles.hero, styles.heroFallback]}>
            <MaterialCommunityIcons name="storefront" size={40} color={circleColors.green} />
          </View>
        )}

        <Text style={styles.merchant}>{offer.merchantName || 'Merchant'}</Text>
        <Text style={styles.title}>{offer.title}</Text>
        {offer.discountLabel ? (
          <Text style={styles.discount}>{offer.discountLabel}</Text>
        ) : null}
        {offer.description ? (
          <Text style={styles.description}>{offer.description}</Text>
        ) : null}

        <View style={styles.metaCard}>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>Valid Till</Text>
            <Text style={styles.metaValue}>{formatDate(offer.endDate)}</Text>
          </View>
          <View style={styles.metaDivider} />
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>Shared by</Text>
            <Text style={styles.metaValue}>{offer.sharedByName || 'Member'}</Text>
          </View>
        </View>

        {offer.minimumPurchaseAmount != null ? (
          <Text style={styles.minPurchase}>
            Min. purchase: ₹{offer.minimumPurchaseAmount}
          </Text>
        ) : null}

        <Text style={styles.sectionTitle}>Reactions</Text>
        <Text style={styles.sectionHint}>
          One reaction per member. Tap to update your reaction.
        </Text>
        <View style={styles.reactionRow}>
          {CIRCLE_REACTIONS.map(item => {
            const count = offer.reactionCounts?.[item.key] || 0;
            const selected = offer.myReaction === item.key;
            return (
              <TouchableOpacity
                key={item.key}
                style={[styles.reactionChip, selected && styles.reactionChipActive]}
                disabled={reacting}
                onPress={() => {
                  void onReact(item.key);
                }}
              >
                <Text style={styles.reactionEmoji}>{item.emoji}</Text>
                <Text style={styles.reactionLabel}>{item.label}</Text>
                {count > 0 ? (
                  <Text style={styles.reactionCount}>{count}</Text>
                ) : null}
              </TouchableOpacity>
            );
          })}
        </View>
        {(offer.totalReactions || 0) > 0 ? (
          <Text style={styles.total}>
            {offer.totalReactions} total reaction
            {(offer.totalReactions || 0) === 1 ? '' : 's'}
          </Text>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
};

export default CircleOfferDetailScreen;

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: circleColors.cream },
  center: { alignItems: 'center', justifyContent: 'center' },
  empty: { color: circleColors.muted, marginBottom: 8 },
  link: { color: circleColors.green, fontFamily: fonts.BOLD },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: circleColors.white,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 17,
    fontFamily: fonts.BOLD,
    color: circleColors.text,
  },
  content: { padding: 16, paddingBottom: 40 },
  hero: {
    width: '100%',
    height: 180,
    borderRadius: 16,
    backgroundColor: circleColors.page,
    marginBottom: 14,
  },
  heroFallback: { alignItems: 'center', justifyContent: 'center' },
  merchant: {
    fontSize: 13,
    color: circleColors.muted,
    fontFamily: fonts.BOLD,
  },
  title: {
    fontSize: 22,
    fontFamily: fonts.BOLD,
    color: circleColors.text,
    marginTop: 4,
  },
  discount: {
    marginTop: 6,
    color: circleColors.orange,
    fontFamily: fonts.BOLD,
    fontSize: 15,
  },
  description: {
    marginTop: 10,
    fontSize: 14,
    lineHeight: 21,
    color: circleColors.muted,
  },
  metaCard: {
    marginTop: 16,
    flexDirection: 'row',
    backgroundColor: circleColors.greenSoft,
    borderRadius: 14,
    paddingVertical: 12,
  },
  metaItem: { flex: 1, alignItems: 'center' },
  metaDivider: { width: 1, backgroundColor: circleColors.greenBorder },
  metaLabel: { fontSize: 11, color: circleColors.muted },
  metaValue: {
    marginTop: 4,
    fontSize: 13,
    fontFamily: fonts.BOLD,
    color: circleColors.text,
  },
  minPurchase: {
    marginTop: 12,
    fontSize: 13,
    color: circleColors.text,
  },
  sectionTitle: {
    marginTop: 20,
    fontSize: 16,
    fontFamily: fonts.BOLD,
    color: circleColors.text,
  },
  sectionHint: {
    marginTop: 4,
    marginBottom: 10,
    fontSize: 12,
    color: circleColors.muted,
  },
  reactionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  reactionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: circleColors.border,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: circleColors.white,
  },
  reactionChipActive: {
    borderColor: circleColors.green,
    backgroundColor: circleColors.greenSoft,
  },
  reactionEmoji: { fontSize: 16 },
  reactionLabel: {
    fontSize: 12,
    fontFamily: fonts.BOLD,
    color: circleColors.text,
  },
  reactionCount: {
    fontSize: 11,
    color: circleColors.muted,
    fontFamily: fonts.BOLD,
  },
  total: { marginTop: 12, color: circleColors.muted, fontSize: 12 },
});
