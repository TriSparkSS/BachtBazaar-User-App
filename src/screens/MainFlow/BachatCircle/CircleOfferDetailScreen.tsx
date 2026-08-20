import React, { useMemo } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { fonts } from '../../../helpers/styles';
import { MainStackParamList } from '../../../navigation/types';
import { showAppAlert } from '../../../services/appAlert';
import MemberAvatar from './components/MemberAvatar';
import { MOCK_SHARED_OFFERS } from './mockData';
import { circleColors, circleShadow } from './theme';

const CircleOfferDetailScreen = () => {
  const navigation =
    useNavigation<
      StackNavigationProp<MainStackParamList, 'BachatCircleOfferDetail'>
    >();
  const route =
    useRoute<RouteProp<MainStackParamList, 'BachatCircleOfferDetail'>>();
  const offer = useMemo(
    () =>
      MOCK_SHARED_OFFERS.find(o => o.id === route.params.offerId) ||
      MOCK_SHARED_OFFERS[0],
    [route.params.offerId],
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.iconBtn}
        >
          <MaterialCommunityIcons
            name="arrow-left"
            size={22}
            color={circleColors.green}
          />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Offer Details</Text>
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={() =>
            navigation.navigate('BachatCircleShareOffer', { offerId: offer.id })
          }
        >
          <MaterialCommunityIcons
            name="share-variant"
            size={20}
            color={circleColors.green}
          />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.sharedBy}>
          <MemberAvatar
            name={offer.sharedByName}
            initial={offer.sharedByName.charAt(0)}
            color={circleColors.greenSoft}
            size={42}
          />
          <View style={{ flex: 1 }}>
            <Text style={styles.sharedText}>
              Shared by{' '}
              <Text style={styles.sharedName}>{offer.sharedByName}</Text>
            </Text>
            <Text style={styles.sharedMeta}>
              {offer.timeAgo} in Azmir's Family Circle
            </Text>
          </View>
          <View style={styles.fromCircle}>
            <MaterialCommunityIcons
              name="shield-check"
              size={12}
              color={circleColors.green}
            />
            <Text style={styles.fromCircleText}>From your circle</Text>
          </View>
        </View>

        <View style={[styles.mainCard, circleShadow.card]}>
          <View style={[styles.hero, { backgroundColor: offer.imageColor }]}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{offer.badge}</Text>
            </View>
            <TouchableOpacity style={styles.heart}>
              <MaterialCommunityIcons
                name="heart-outline"
                size={20}
                color={circleColors.green}
              />
            </TouchableOpacity>
            <MaterialCommunityIcons
              name="food"
              size={72}
              color={circleColors.orange}
            />
          </View>

          <View style={styles.cardBody}>
            <View style={styles.brandRow}>
              <View
                style={[
                  styles.brandMark,
                  { backgroundColor: offer.imageColor },
                ]}
              >
                <MaterialCommunityIcons
                  name="store"
                  size={18}
                  color={circleColors.orange}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.brand}>{offer.brand}</Text>
                <Text style={styles.title}>{offer.title}</Text>
              </View>
            </View>
            <View style={styles.chips}>
              <View style={styles.chip}>
                <MaterialCommunityIcons
                  name="map-marker-outline"
                  size={14}
                  color={circleColors.muted}
                />
                <Text style={styles.chipText}>{offer.distance} away</Text>
              </View>
              <View style={styles.chip}>
                <MaterialCommunityIcons
                  name="clock-outline"
                  size={14}
                  color={circleColors.muted}
                />
                <Text style={styles.chipText}>Valid till {offer.validTill}</Text>
              </View>
              <View style={styles.chip}>
                <MaterialCommunityIcons
                  name="star"
                  size={14}
                  color={circleColors.star}
                />
                <Text style={styles.chipText}>
                  {offer.rating}
                  {offer.ratingCount ? ` (${offer.ratingCount})` : ''}
                </Text>
              </View>
            </View>
            <View style={styles.restriction}>
              <MaterialCommunityIcons
                name="account-group"
                size={16}
                color={circleColors.green}
              />
              <Text style={styles.restrictionText}>
                Only members of Azmir's Family Circle can view this offer.
              </Text>
            </View>
          </View>
        </View>

        <View style={[styles.quickActions, circleShadow.soft]}>
          {[
            { icon: 'phone', color: circleColors.green, label: 'Call Store' },
            {
              icon: 'navigation-variant',
              color: circleColors.orange,
              label: 'Directions',
            },
            {
              icon: 'bookmark-outline',
              color: circleColors.green,
              label: 'Save Offer',
            },
          ].map((item, index) => (
            <TouchableOpacity
              key={item.label}
              style={[
                styles.quickItem,
                index < 2 && styles.quickItemBorder,
              ]}
              onPress={() =>
                showAppAlert(item.label, 'Action will use live APIs later.')
              }
            >
              <MaterialCommunityIcons
                name={item.icon}
                size={20}
                color={item.color}
              />
              <Text style={styles.quickLabel}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.sectionTitle}>About this offer</Text>
        <Text style={styles.about}>{offer.about}</Text>

        <Text style={styles.sectionTitle}>Store Details</Text>
        <View style={[styles.storeCard, circleShadow.soft]}>
          <View
            style={[styles.storeThumb, { backgroundColor: offer.imageColor }]}
          />
          <View style={{ flex: 1 }}>
            <View style={styles.storeTitleRow}>
              <Text style={styles.storeBrand}>{offer.brand}</Text>
              {offer.open ? (
                <View style={styles.openPill}>
                  <Text style={styles.openText}>Open</Text>
                </View>
              ) : null}
            </View>
            <Text style={styles.address}>{offer.address}</Text>
            <Text style={styles.hours}>{offer.hours}</Text>
          </View>
          <TouchableOpacity style={styles.phoneBtn}>
            <MaterialCommunityIcons
              name="phone"
              size={18}
              color={circleColors.white}
            />
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>Location</Text>
        <View style={styles.mapPreview}>
          <MaterialCommunityIcons
            name="map"
            size={40}
            color={circleColors.green}
          />
          <TouchableOpacity style={styles.mapBtn}>
            <MaterialCommunityIcons
              name="map-marker"
              size={14}
              color={circleColors.green}
            />
            <Text style={styles.mapBtnText}>View on Map</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.redeemBtn, circleShadow.cta]}
          onPress={() =>
            showAppAlert('Redeem Offer', 'Redemption flow coming soon.')
          }
        >
          <MaterialCommunityIcons
            name="ticket-confirmation-outline"
            size={18}
            color={circleColors.white}
          />
          <Text style={styles.redeemText}>Redeem Offer</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.shareAgainBtn}
          onPress={() =>
            navigation.navigate('BachatCircleShareOffer', {
              offerId: offer.id,
            })
          }
        >
          <MaterialCommunityIcons
            name="upload"
            size={20}
            color={circleColors.green}
          />
        </TouchableOpacity>
      </View>
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
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontFamily: fonts.BOLD,
    fontSize: 17,
    color: circleColors.green,
  },
  content: { padding: 16, paddingBottom: 24 },
  sharedBy: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  sharedText: { color: circleColors.text, fontSize: 13 },
  sharedName: { color: circleColors.green, fontFamily: fonts.BOLD },
  sharedMeta: { color: circleColors.muted, fontSize: 11, marginTop: 2 },
  fromCircle: {
    backgroundColor: circleColors.greenSoft,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 5,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  fromCircleText: {
    color: circleColors.green,
    fontSize: 10,
    fontFamily: fonts.BOLD,
  },
  mainCard: {
    backgroundColor: circleColors.white,
    borderRadius: 18,
    overflow: 'hidden',
    marginBottom: 14,
    borderWidth: 1,
    borderColor: circleColors.borderSoft,
  },
  hero: {
    height: 190,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: 14,
    left: 14,
    backgroundColor: circleColors.badgeRed,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  badgeText: {
    color: circleColors.white,
    fontFamily: fonts.BOLD,
    fontSize: 12,
  },
  heart: {
    position: 'absolute',
    top: 14,
    right: 14,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: circleColors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: { padding: 14 },
  brandRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  brandMark: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -28,
    borderWidth: 3,
    borderColor: circleColors.white,
  },
  brand: {
    fontFamily: fonts.BOLD,
    fontSize: 18,
    color: circleColors.text,
  },
  title: { color: circleColors.muted, marginTop: 2, fontSize: 13 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: circleColors.border,
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: circleColors.chipGray,
  },
  chipText: { color: circleColors.muted, fontSize: 11 },
  restriction: {
    marginTop: 12,
    backgroundColor: circleColors.greenSoft,
    borderRadius: 12,
    padding: 10,
    flexDirection: 'row',
    gap: 8,
  },
  restrictionText: { flex: 1, color: circleColors.green, fontSize: 12 },
  quickActions: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: circleColors.borderSoft,
    borderRadius: 16,
    marginBottom: 16,
    backgroundColor: circleColors.white,
  },
  quickItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 4,
  },
  quickItemBorder: {
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: circleColors.border,
  },
  quickLabel: { fontSize: 11, color: circleColors.text, fontFamily: fonts.BOLD },
  sectionTitle: {
    fontFamily: fonts.BOLD,
    fontSize: 15,
    color: circleColors.text,
    marginBottom: 8,
  },
  about: {
    color: circleColors.muted,
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 16,
  },
  storeCard: {
    flexDirection: 'row',
    gap: 10,
    borderWidth: 1,
    borderColor: circleColors.borderSoft,
    borderRadius: 16,
    padding: 12,
    marginBottom: 16,
    alignItems: 'center',
    backgroundColor: circleColors.white,
  },
  storeThumb: { width: 48, height: 48, borderRadius: 12 },
  storeTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  storeBrand: { fontFamily: fonts.BOLD, color: circleColors.text, fontSize: 15 },
  openPill: {
    backgroundColor: circleColors.greenSoft,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  openText: {
    color: circleColors.green,
    fontSize: 11,
    fontFamily: fonts.BOLD,
  },
  address: { color: circleColors.muted, fontSize: 12, marginTop: 4 },
  hours: { color: circleColors.muted, fontSize: 12, marginTop: 4 },
  phoneBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: circleColors.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapPreview: {
    height: 150,
    borderRadius: 16,
    backgroundColor: circleColors.greenSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: circleColors.greenBorder,
  },
  mapBtn: {
    position: 'absolute',
    bottom: 14,
    backgroundColor: circleColors.white,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 9,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: circleColors.greenBorder,
  },
  mapBtnText: {
    color: circleColors.green,
    fontFamily: fonts.BOLD,
    fontSize: 12,
  },
  footer: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: circleColors.borderSoft,
    backgroundColor: circleColors.white,
  },
  redeemBtn: {
    flex: 1,
    backgroundColor: circleColors.green,
    borderRadius: 16,
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  redeemText: {
    color: circleColors.white,
    fontFamily: fonts.BOLD,
    fontSize: 15,
  },
  shareAgainBtn: {
    width: 52,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: circleColors.green,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: circleColors.greenSoft,
  },
});

export default CircleOfferDetailScreen;
