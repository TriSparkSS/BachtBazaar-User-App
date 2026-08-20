import React, { useCallback, useMemo, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { fonts } from '../../../helpers/styles';
import { MainStackParamList } from '../../../navigation/types';
import { showAppAlert } from '../../../services/appAlert';
import MemberAvatar from './components/MemberAvatar';
import { circleStorage } from './circleStorage';
import { ALL_CONTACTS, MOCK_SHARED_OFFERS } from './mockData';
import { BachatCircleState, SharedOffer } from './types';
import { circleColors, circleShadow } from './theme';

const offerIcon = (brand: string) => {
  const b = brand.toLowerCase();
  if (b.includes('burger')) return 'hamburger';
  if (b.includes('trend')) return 'tshirt-crew';
  return 'food';
};

const CircleFeedScreen = () => {
  const navigation =
    useNavigation<
      StackNavigationProp<MainStackParamList, 'BachatCircleFeed'>
    >();
  const [circle, setCircle] = useState<BachatCircleState | null>(null);
  const [shareText, setShareText] = useState('');

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      (async () => {
        const state = await circleStorage.load();
        if (!alive) return;
        if (!state.created) {
          navigation.replace('BachatCircle');
          return;
        }
        setCircle(state);
      })();
      return () => {
        alive = false;
      };
    }, [navigation]),
  );

  const members = useMemo(() => {
    if (!circle) return [];
    return ALL_CONTACTS.filter(c => circle.memberIds.includes(c.id));
  }, [circle]);

  const openOffer = (offer: SharedOffer) => {
    navigation.navigate('BachatCircleOfferDetail', { offerId: offer.id });
  };

  if (!circle) {
    return <SafeAreaView style={styles.safe} edges={['top']} />;
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.navigate('BottomStack')}
          style={styles.iconBtn}
        >
          <MaterialCommunityIcons
            name="arrow-left"
            size={22}
            color={circleColors.green}
          />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.headerCenter}
          onPress={() =>
            showAppAlert('Your circles', circle.name, [{ text: 'OK' }])
          }
        >
          <View style={styles.titleRow}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {circle.name}
            </Text>
            <MaterialCommunityIcons
              name="chevron-down"
              size={18}
              color={circleColors.green}
            />
          </View>
          <Text style={styles.memberCount}>{members.length} Members</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={() => navigation.navigate('BachatCircleMembers')}
        >
          <MaterialCommunityIcons
            name="cog-outline"
            size={22}
            color={circleColors.green}
          />
        </TouchableOpacity>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.membersRow}
      >
        {members.map(m => (
          <View key={m.id} style={styles.memberItem}>
            <MemberAvatar
              name={m.isYou ? 'You' : m.name}
              initial={m.initial}
              color={m.avatarColor}
              online={m.online}
              size={54}
              ringColor={circleColors.greenSoft}
            />
            <Text style={styles.memberName} numberOfLines={1}>
              {m.isYou ? 'You' : m.name.split(' ')[0]}
            </Text>
          </View>
        ))}
        <TouchableOpacity
          style={styles.memberItem}
          onPress={() =>
            navigation.navigate('BachatCircleAddMembers', {
              circleName: circle.name,
              category: circle.category,
            })
          }
        >
          <View style={styles.addAvatar}>
            <MaterialCommunityIcons
              name="plus"
              size={24}
              color={circleColors.green}
            />
          </View>
          <Text style={styles.memberName}>Add</Text>
        </TouchableOpacity>
      </ScrollView>

      <View style={styles.tabs}>
        <TouchableOpacity style={styles.tab}>
          <MaterialCommunityIcons
            name="account-group"
            size={16}
            color={circleColors.green}
          />
          <Text style={[styles.tabText, styles.tabTextActive]}>
            Circle Feed
          </Text>
          <View style={styles.tabUnderline} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.tab}
          onPress={() => navigation.navigate('BachatCircleMembers')}
        >
          <MaterialCommunityIcons
            name="account-multiple-outline"
            size={16}
            color={circleColors.muted}
          />
          <Text style={styles.tabText}>Members</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.privacyBanner}>
          <MaterialCommunityIcons
            name="shield-check"
            size={18}
            color={circleColors.green}
          />
          <Text style={styles.privacyText}>
            Only circle members can see shared offers.{' '}
            <Text
              style={styles.learnMore}
              onPress={() =>
                showAppAlert(
                  'Privacy',
                  'Shared offers are visible only to members of this Bachat Circle.',
                )
              }
            >
              Learn more
            </Text>
          </Text>
        </View>

        <View style={[styles.shareBox, circleShadow.soft]}>
          <MemberAvatar
            name="You"
            initial={(members.find(m => m.isYou)?.initial) || 'Y'}
            color={circleColors.greenSoft}
            size={38}
          />
          <TextInput
            style={styles.shareInput}
            placeholder="Share an offer with your circle..."
            placeholderTextColor={circleColors.mutedSoft}
            value={shareText}
            onChangeText={setShareText}
          />
          <TouchableOpacity
            style={styles.shareBtn}
            onPress={() =>
              navigation.navigate('BachatCircleShareOffer', {
                offerId: MOCK_SHARED_OFFERS[0].id,
              })
            }
          >
            <MaterialCommunityIcons
              name="upload"
              size={14}
              color={circleColors.white}
            />
            <Text style={styles.shareBtnText}>Share Offer</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Latest Shared Offers</Text>
          <TouchableOpacity
            style={styles.filterBtn}
            onPress={() => showAppAlert('Filter', 'Offer filters coming soon.')}
          >
            <MaterialCommunityIcons
              name="filter-variant"
              size={16}
              color={circleColors.green}
            />
            <Text style={styles.filterText}>Filter</Text>
          </TouchableOpacity>
        </View>

        {MOCK_SHARED_OFFERS.map(offer => (
          <View key={offer.id} style={[styles.offerCard, circleShadow.card]}>
            <View style={styles.offerTop}>
              <MemberAvatar
                name={offer.sharedByName}
                initial={offer.sharedByName.charAt(0)}
                color={circleColors.greenSoft}
                size={36}
              />
              <View style={styles.offerTopText}>
                <Text style={styles.offerActor}>
                  {offer.sharedByName}{' '}
                  <Text style={styles.offerActorMuted}>shared an offer</Text>
                </Text>
                <Text style={styles.offerTime}>{offer.timeAgo}</Text>
              </View>
              <MaterialCommunityIcons
                name="dots-vertical"
                size={18}
                color={circleColors.mutedSoft}
              />
            </View>

            <TouchableOpacity
              style={styles.offerBody}
              activeOpacity={0.9}
              onPress={() => openOffer(offer)}
            >
              <View
                style={[
                  styles.offerImage,
                  { backgroundColor: offer.imageColor },
                ]}
              >
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{offer.badge}</Text>
                </View>
                <MaterialCommunityIcons
                  name={offerIcon(offer.brand)}
                  size={34}
                  color={circleColors.orange}
                />
              </View>
              <View style={styles.offerInfo}>
                <Text style={styles.brand}>{offer.brand}</Text>
                <Text style={styles.offerTitle} numberOfLines={2}>
                  {offer.title}
                </Text>
                <View style={styles.metaRow}>
                  <View style={styles.metaChip}>
                    <MaterialCommunityIcons
                      name="map-marker-outline"
                      size={12}
                      color={circleColors.green}
                    />
                    <Text style={styles.meta}>{offer.distance}</Text>
                  </View>
                  <View style={styles.metaChip}>
                    <MaterialCommunityIcons
                      name="clock-outline"
                      size={12}
                      color={circleColors.green}
                    />
                    <Text style={styles.meta}>Till {offer.validTill}</Text>
                  </View>
                  <View style={styles.metaChip}>
                    <MaterialCommunityIcons
                      name="star"
                      size={12}
                      color={circleColors.star}
                    />
                    <Text style={styles.meta}>{offer.rating}</Text>
                  </View>
                </View>
              </View>
            </TouchableOpacity>

            <View style={styles.offerActions}>
              <TouchableOpacity
                style={styles.viewDetails}
                onPress={() => openOffer(offer)}
              >
                <MaterialCommunityIcons
                  name="map-marker-outline"
                  size={16}
                  color={circleColors.green}
                />
                <Text style={styles.viewDetailsText}>View Details</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.shareAgain}
                onPress={() =>
                  navigation.navigate('BachatCircleShareOffer', {
                    offerId: offer.id,
                  })
                }
              >
                <MaterialCommunityIcons
                  name="upload"
                  size={14}
                  color={circleColors.orange}
                />
                <Text style={styles.shareAgainText}>Share Again</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: circleColors.page },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 8,
    backgroundColor: circleColors.white,
  },
  iconBtn: { padding: 8, width: 40 },
  headerCenter: { flex: 1, alignItems: 'center' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  headerTitle: {
    fontFamily: fonts.BOLD,
    fontSize: 16,
    color: circleColors.text,
    maxWidth: 220,
  },
  memberCount: {
    color: circleColors.green,
    fontSize: 12,
    marginTop: 2,
    fontFamily: fonts.BOLD,
  },
  membersRow: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 14,
    backgroundColor: circleColors.white,
  },
  memberItem: { width: 66, alignItems: 'center', gap: 6 },
  memberName: {
    fontSize: 11,
    color: circleColors.text,
    textAlign: 'center',
    fontFamily: fonts.BOLD,
  },
  addAvatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
    borderWidth: 1.5,
    borderColor: circleColors.green,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: circleColors.greenSoft,
  },
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: circleColors.borderSoft,
    paddingHorizontal: 16,
    backgroundColor: circleColors.white,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 12,
    marginRight: 22,
    position: 'relative',
  },
  tabText: { color: circleColors.muted, fontSize: 14 },
  tabTextActive: {
    color: circleColors.green,
    fontFamily: fonts.BOLD,
  },
  tabUnderline: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 3,
    backgroundColor: circleColors.green,
    borderTopLeftRadius: 2,
    borderTopRightRadius: 2,
  },
  content: { padding: 16, paddingBottom: 28 },
  privacyBanner: {
    backgroundColor: circleColors.greenSoft,
    borderRadius: 14,
    padding: 12,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  privacyText: {
    flex: 1,
    color: circleColors.green,
    fontSize: 12,
    lineHeight: 17,
  },
  learnMore: {
    textDecorationLine: 'underline',
    fontFamily: fonts.BOLD,
  },
  shareBox: {
    backgroundColor: circleColors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: circleColors.borderSoft,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 18,
  },
  shareInput: { flex: 1, color: circleColors.text, fontSize: 13 },
  shareBtn: {
    backgroundColor: circleColors.orange,
    borderRadius: 10,
    paddingHorizontal: 11,
    paddingVertical: 9,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  shareBtnText: {
    color: circleColors.white,
    fontSize: 11,
    fontFamily: fonts.BOLD,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontFamily: fonts.BOLD,
    fontSize: 16,
    color: circleColors.text,
  },
  filterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: circleColors.greenSoft,
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  filterText: {
    color: circleColors.green,
    fontFamily: fonts.BOLD,
    fontSize: 12,
  },
  offerCard: {
    backgroundColor: circleColors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: circleColors.borderSoft,
    padding: 14,
    marginBottom: 14,
  },
  offerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  offerTopText: { flex: 1 },
  offerActor: {
    fontFamily: fonts.BOLD,
    color: circleColors.text,
    fontSize: 13,
  },
  offerActorMuted: {
    color: circleColors.muted,
  },
  offerTime: { color: circleColors.mutedSoft, fontSize: 11, marginTop: 2 },
  offerBody: { flexDirection: 'row', gap: 12 },
  offerImage: {
    width: 92,
    height: 92,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  badge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: circleColors.badgeRed,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  badgeText: {
    color: circleColors.white,
    fontSize: 9,
    fontFamily: fonts.BOLD,
  },
  offerInfo: { flex: 1 },
  brand: {
    fontFamily: fonts.BOLD,
    color: circleColors.text,
    fontSize: 15,
  },
  offerTitle: {
    color: circleColors.muted,
    fontSize: 12,
    marginTop: 4,
    lineHeight: 17,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 10,
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: circleColors.chipGray,
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 4,
  },
  meta: { color: circleColors.muted, fontSize: 10, fontFamily: fonts.BOLD },
  offerActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: circleColors.border,
  },
  viewDetails: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  viewDetailsText: {
    color: circleColors.green,
    fontFamily: fonts.BOLD,
    fontSize: 13,
  },
  shareAgain: {
    borderWidth: 1.5,
    borderColor: circleColors.orange,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: circleColors.orangeSoft,
  },
  shareAgainText: {
    color: circleColors.orange,
    fontFamily: fonts.BOLD,
    fontSize: 12,
  },
});

export default CircleFeedScreen;
