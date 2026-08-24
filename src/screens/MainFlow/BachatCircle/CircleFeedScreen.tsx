import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAppContext } from '../../../context/AppContext';
import { fonts } from '../../../helpers/styles';
import { MainStackParamList } from '../../../navigation/types';
import { showAppAlert } from '../../../services/appAlert';
import {
  BachatCircleDto,
  CIRCLE_REACTIONS,
  CircleReactionKey,
  SharedCircleOfferDto,
  bachatCircleApi,
} from '../../../services/bachatCircleApi';
import MemberAvatar from './components/MemberAvatar';
import { circleStorage } from './circleStorage';
import { circleColors, circleShadow } from './theme';

const formatDate = (value?: string) => {
  if (!value) {
    return undefined;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

const CircleFeedScreen = () => {
  const navigation =
    useNavigation<StackNavigationProp<MainStackParamList, 'BachatCircleFeed'>>();
  const route = useRoute<RouteProp<MainStackParamList, 'BachatCircleFeed'>>();
  const { authToken } = useAppContext();

  const [circle, setCircle] = useState<BachatCircleDto | null>(null);
  const [offers, setOffers] = useState<SharedCircleOfferDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [reactingId, setReactingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const token = authToken?.trim();
    if (!token) {
      showAppAlert('Login required', 'Please log in to open Bachat Circle.');
      navigation.replace('BachatCircle');
      return;
    }

    const stored = await circleStorage.load();
    const circleId = route.params?.circleId || stored.circleId;
    if (!circleId) {
      navigation.replace('BachatCircle');
      return;
    }

    try {
      const [detail, feed] = await Promise.all([
        bachatCircleApi.getCircle(token, circleId),
        bachatCircleApi.listOffers(token, circleId),
      ]);
      setCircle(detail);
      setOffers(feed);
      await circleStorage.save({
        created: true,
        circleId: detail.id,
        name: detail.name,
        category: stored.category || 'Family',
        description: detail.description,
        memberIds: detail.members.map(m => m.userId),
        pendingInviteIds: detail.pendingInvitations.map(i => i.id),
      });
    } catch (error) {
      showAppAlert(
        'Could not load circle',
        error instanceof Error ? error.message : 'Please try again.',
      );
      navigation.replace('BachatCircle');
    }
  }, [authToken, navigation, route.params?.circleId]);

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

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const onReact = async (offer: SharedCircleOfferDto, reaction: CircleReactionKey) => {
    const token = authToken?.trim();
    if (!token || !circle) {
      return;
    }
    setReactingId(offer.id);
    try {
      await bachatCircleApi.reactToOffer(token, circle.id, offer.id, reaction);
      setOffers(prev =>
        prev.map(item => {
          if (item.id !== offer.id) {
            return item;
          }
          const prevCounts = { ...(item.reactionCounts || {}) };
          if (item.myReaction && prevCounts[item.myReaction]) {
            prevCounts[item.myReaction] = Math.max(
              0,
              (prevCounts[item.myReaction] || 0) - 1,
            );
          }
          prevCounts[reaction] = (prevCounts[reaction] || 0) + 1;
          const total = Object.values(prevCounts).reduce(
            (sum, n) => sum + (n || 0),
            0,
          );
          return {
            ...item,
            myReaction: reaction,
            reactionCounts: prevCounts,
            totalReactions: total,
          };
        }),
      );
    } catch (error) {
      showAppAlert(
        'Reaction failed',
        error instanceof Error
          ? error.message
          : 'Reactions API may not be enabled yet.',
      );
    } finally {
      setReactingId(null);
    }
  };

  if (loading || !circle) {
    return (
      <SafeAreaView style={[styles.safe, styles.center]} edges={['top']}>
        <ActivityIndicator color={circleColors.green} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.navigate('BottomStack')}
          style={styles.iconBtn}
        >
          <MaterialCommunityIcons name="arrow-left" size={22} color={circleColors.green} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {circle.name}
          </Text>
          <Text style={styles.memberCount}>{circle.memberCount} Members</Text>
        </View>
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={() =>
            navigation.navigate('BachatCircleMembers', { circleId: circle.id })
          }
        >
          <MaterialCommunityIcons name="cog-outline" size={22} color={circleColors.green} />
        </TouchableOpacity>
      </View>

      <View style={styles.membersStrip}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.membersRow}
          style={styles.membersScroll}
        >
          {circle.members.map(m => (
            <View key={m.userId} style={styles.memberItem}>
              <MemberAvatar
                name={m.name}
                initial={m.name.slice(0, 1).toUpperCase()}
                color={circleColors.greenSoft}
                size={54}
                ringColor={circleColors.greenSoft}
              />
              <Text style={styles.memberName} numberOfLines={1}>
                {m.name.split(' ')[0]}
              </Text>
            </View>
          ))}
          <TouchableOpacity
            style={styles.memberItem}
            onPress={() =>
              navigation.navigate('BachatCircleAddMembers', {
                circleName: circle.name,
                category: 'Friends',
                circleId: circle.id,
                description: circle.description,
              })
            }
          >
            <View style={styles.addAvatar}>
              <MaterialCommunityIcons name="plus" size={24} color={circleColors.green} />
            </View>
            <Text style={styles.memberName}>Add</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} />
        }
      >
        <View style={styles.privacyBanner}>
          <MaterialCommunityIcons name="shield-check" size={18} color={circleColors.green} />
          <Text style={styles.privacyText}>
            Only circle members can see shared offers.
          </Text>
        </View>

        <Text style={styles.sectionTitle}>Shared Offers</Text>
        {offers.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>
              No offers shared yet. Open an offer and tap Share to Bachat Circle.
            </Text>
          </View>
        ) : (
          offers.map(offer => (
            <TouchableOpacity
              key={offer.id}
              style={[styles.offerCard, circleShadow.card]}
              activeOpacity={0.9}
              onPress={() =>
                navigation.navigate('BachatCircleOfferDetail', {
                  sharedOfferId: offer.id,
                  circleId: circle.id,
                })
              }
            >
              <View style={styles.offerTop}>
                {offer.thumbnail ? (
                  <Image source={{ uri: offer.thumbnail }} style={styles.offerImage} />
                ) : (
                  <View style={[styles.offerImage, styles.offerImageFallback]}>
                    <MaterialCommunityIcons
                      name="tag-outline"
                      size={28}
                      color={circleColors.orange}
                    />
                  </View>
                )}
                <View style={styles.offerInfo}>
                  <Text style={styles.brand} numberOfLines={1}>
                    {offer.merchantName || 'Merchant'}
                  </Text>
                  <Text style={styles.offerTitle} numberOfLines={2}>
                    {offer.title}
                  </Text>
                  <Text style={styles.meta}>
                    {offer.discountLabel || 'Special offer'}
                    {offer.endDate ? ` · Till ${formatDate(offer.endDate)}` : ''}
                  </Text>
                  <Text style={styles.sharedBy}>
                    Shared by {offer.sharedByName || 'member'}
                  </Text>
                </View>
              </View>

              <View style={styles.reactionRow}>
                {CIRCLE_REACTIONS.map(item => {
                  const count = offer.reactionCounts?.[item.key] || 0;
                  const selected = offer.myReaction === item.key;
                  return (
                    <TouchableOpacity
                      key={item.key}
                      style={[styles.reactionChip, selected && styles.reactionChipActive]}
                      disabled={reactingId === offer.id}
                      onPress={() => {
                        void onReact(offer, item.key);
                      }}
                    >
                      <Text style={styles.reactionEmoji}>{item.emoji}</Text>
                      {count > 0 ? (
                        <Text style={styles.reactionCount}>{count}</Text>
                      ) : null}
                    </TouchableOpacity>
                  );
                })}
              </View>
              {(offer.totalReactions || 0) > 0 ? (
                <Text style={styles.totalReactions}>
                  {offer.totalReactions} reaction
                  {(offer.totalReactions || 0) === 1 ? '' : 's'}
                </Text>
              ) : null}
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default CircleFeedScreen;

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: circleColors.cream },
  center: { alignItems: 'center', justifyContent: 'center' },
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
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: {
    fontSize: 17,
    fontFamily: fonts.BOLD,
    color: circleColors.text,
  },
  memberCount: { fontSize: 12, color: circleColors.muted, marginTop: 2 },
  membersStrip: {
    height: 90,
  },
  membersScroll: {
    flexGrow: 0,
  },
  membersRow: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: 'center',
    gap: 10,
  },
  memberItem: { width: 64, alignItems: 'center' },
  memberName: {
    marginTop: 4,
    fontSize: 11,
    color: circleColors.text,
    maxWidth: 64,
    textAlign: 'center',
  },
  addAvatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: circleColors.green,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: circleColors.greenSoft,
  },
  content: { padding: 16, paddingBottom: 40 },
  privacyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: circleColors.greenSoft,
    borderRadius: 12,
    padding: 10,
    marginBottom: 14,
  },
  privacyText: { flex: 1, fontSize: 12, color: circleColors.text },
  sectionTitle: {
    fontSize: 16,
    fontFamily: fonts.BOLD,
    color: circleColors.text,
    marginBottom: 10,
  },
  emptyCard: {
    backgroundColor: circleColors.white,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: circleColors.border,
  },
  emptyText: { color: circleColors.muted, fontSize: 13, lineHeight: 19 },
  offerCard: {
    backgroundColor: circleColors.white,
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
  },
  offerTop: { flexDirection: 'row', gap: 12 },
  offerImage: {
    width: 78,
    height: 78,
    borderRadius: 12,
    backgroundColor: circleColors.page,
  },
  offerImageFallback: { alignItems: 'center', justifyContent: 'center' },
  offerInfo: { flex: 1 },
  brand: { fontSize: 12, color: circleColors.muted, fontFamily: fonts.BOLD },
  offerTitle: {
    fontSize: 15,
    fontFamily: fonts.BOLD,
    color: circleColors.text,
    marginTop: 2,
  },
  meta: { fontSize: 12, color: circleColors.muted, marginTop: 4 },
  sharedBy: { fontSize: 11, color: circleColors.green, marginTop: 6 },
  reactionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 12,
  },
  reactionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: circleColors.border,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: circleColors.page,
  },
  reactionChipActive: {
    borderColor: circleColors.green,
    backgroundColor: circleColors.greenSoft,
  },
  reactionEmoji: { fontSize: 14 },
  reactionCount: {
    fontSize: 11,
    fontFamily: fonts.BOLD,
    color: circleColors.text,
  },
  totalReactions: {
    marginTop: 8,
    fontSize: 11,
    color: circleColors.muted,
  },
});
