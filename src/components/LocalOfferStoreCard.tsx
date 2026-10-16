import React from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import OfferCountdownText from './OfferCountdownText';
import { colors, fonts } from '../helpers/styles';
import { shopApi } from '../services/shopApi';
import { ShopOffer, ShopWithOffers } from '../types/shop';
import { isShopCurrentlyOpen } from '../utils/shop';

const { width } = Dimensions.get('window');
const CARD_WIDTH = Math.min((width - 48) / 3 - 4, 118);
const HEART_RED = '#E11D48';
const PLACEHOLDER_SHOP_LOGO =
  'https://images.pexels.com/photos/248077/pexels-photo-248077.jpeg?auto=compress&cs=tinysrgb&dpr=1&w=200';
const PLACEHOLDER_OFFER_IMAGE =
  'https://images.pexels.com/photos/1191531/pexels-photo-1191531.jpeg?auto=compress&cs=tinysrgb&dpr=1&w=400';

export const resolveLocalOfferShopImage = (shop: { logo?: string; coverImage?: string }) =>
  shopApi.resolveImageUrl(shop.logo) ??
  shopApi.resolveImageUrl(shop.coverImage) ??
  PLACEHOLDER_SHOP_LOGO;

type LocalOfferStoreCardProps = {
  shop: ShopWithOffers;
  cardRef?: React.Ref<View>;
  shopSaved: boolean;
  shopToggling: boolean;
  savedOfferIds: Record<string, true>;
  togglingOfferId: string | null;
  onPressStore: () => void;
  onPressOffer: (offer: ShopOffer) => void;
  onToggleShop: () => void;
  onToggleOffer: (offer: ShopOffer) => void;
};

const LocalOfferStoreCard = ({
  shop,
  cardRef,
  shopSaved,
  shopToggling,
  savedOfferIds,
  togglingOfferId,
  onPressStore,
  onPressOffer,
  onToggleShop,
  onToggleOffer,
}: LocalOfferStoreCardProps) => {
  const shopLogo = resolveLocalOfferShopImage(shop);
  const hasOffers = shop.offers.length > 0;
  const shopOpen = isShopCurrentlyOpen(shop);
  const isClosed = shopOpen === false;

  return (
    <View
      ref={cardRef}
      collapsable={cardRef ? false : undefined}
      style={[styles.card, isClosed && styles.closedCard]}
    >
      <TouchableOpacity style={styles.storeHeader} activeOpacity={0.86} onPress={onPressStore}>
        <View style={styles.storeLogoCircle}>
          <Image source={{ uri: shopLogo }} style={styles.storeLogo} />
          {isClosed ? <View style={styles.closedLogoWash} /> : null}
        </View>
        <View style={styles.storeInfo}>
          <View style={styles.storeNameContainer}>
            <Text style={styles.storeName}>{shop.name}</Text>
            {shop.isVerified ? (
              <MaterialCommunityIcons
                name="check-decagram"
                size={16}
                color={colors.primary}
                style={styles.verifiedIcon}
              />
            ) : null}
          </View>
          {shop.tagline ? (
            <Text style={styles.storeTagline}>{shop.tagline}</Text>
          ) : shop.address ? (
            <Text style={styles.storeTagline} numberOfLines={1}>
              {shop.address}
            </Text>
          ) : null}
        </View>
        <View style={styles.storeMeta}>
          <TouchableOpacity
            style={styles.heartButton}
            activeOpacity={0.85}
            disabled={shopToggling}
            onPress={event => {
              event.stopPropagation?.();
              onToggleShop();
            }}
          >
            {shopToggling ? (
              <ActivityIndicator size="small" color={HEART_RED} />
            ) : (
              <MaterialCommunityIcons
                name={shopSaved ? 'heart' : 'heart-outline'}
                size={18}
                color={shopSaved ? HEART_RED : '#98A2B3'}
              />
            )}
          </TouchableOpacity>
          {shop.rating ? (
            <View style={styles.ratingRow}>
              <MaterialCommunityIcons name="star-outline" size={14} color="#F2A900" />
              <Text style={styles.ratingText}>
                {shop.rating}
                {shop.ratingCount ? (
                  <Text style={styles.ratingCount}> ({shop.ratingCount})</Text>
                ) : null}
              </Text>
            </View>
          ) : null}
          <View style={styles.distanceStatusRow}>
            {shop.distance ? (
              <>
                <MaterialCommunityIcons name="map-marker" size={13} color="#E65A24" />
                <Text style={styles.distanceText}>{shop.distance}</Text>
              </>
            ) : null}
            {shopOpen ? (
              <View style={styles.openTag}>
                <Text style={styles.openTagText}>Open</Text>
              </View>
            ) : isClosed ? (
              <View style={styles.closedTag}>
                <Text style={styles.closedTagText}>Closed</Text>
              </View>
            ) : null}
          </View>
        </View>
      </TouchableOpacity>

      {hasOffers ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.offersScroll}
          contentContainerStyle={styles.offersContent}
        >
          {shop.offers.map(offer => {
            const offerImage = shopApi.resolveImageUrl(offer.image) ?? PLACEHOLDER_OFFER_IMAGE;
            const offerSaved = Boolean(savedOfferIds[offer.id]);
            const offerToggling = togglingOfferId === offer.id;

            return (
              <TouchableOpacity
                key={offer.id}
                style={styles.offerCard}
                activeOpacity={0.88}
                onPress={() => onPressOffer(offer)}
              >
                <View style={styles.offerImageContainer}>
                  <Image source={{ uri: offerImage }} style={styles.offerImage} />
                  {offer.discount ? (
                    <View style={styles.offerTag}>
                      <Text style={styles.offerTagText}>{offer.discount}</Text>
                    </View>
                  ) : null}
                  <TouchableOpacity
                    style={styles.offerHeartButton}
                    activeOpacity={0.85}
                    disabled={offerToggling}
                    onPress={event => {
                      event.stopPropagation?.();
                      onToggleOffer(offer);
                    }}
                  >
                    {offerToggling ? (
                      <ActivityIndicator size="small" color={HEART_RED} />
                    ) : (
                      <MaterialCommunityIcons
                        name={offerSaved ? 'heart' : 'heart-outline'}
                        size={16}
                        color={offerSaved ? HEART_RED : '#667085'}
                      />
                    )}
                  </TouchableOpacity>
                </View>
                <View style={styles.offerInfo}>
                  <Text style={styles.offerTitle} numberOfLines={1}>
                    {offer.title}
                  </Text>
                  {offer.subtitle ? (
                    <Text style={styles.offerSubtitle} numberOfLines={1}>
                      {offer.subtitle}
                    </Text>
                  ) : null}
                  <OfferCountdownText
                    expiresAt={offer.expiresAt}
                    countdown={offer.countdown}
                    suffix=" remaining"
                    style={styles.offerCountdown}
                  />
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      ) : (
        <Text style={styles.noOffersText}>No offers available right now.</Text>
      )}
    </View>
  );
};

export default LocalOfferStoreCard;

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: 18,
    paddingTop: 14,
    paddingBottom: 14,
    marginBottom: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E7ECF5',
    shadowColor: '#1B2430',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 5,
  },
  closedCard: {
    opacity: 0.58,
    backgroundColor: '#F4F6F8',
    borderColor: '#E2E6ED',
    shadowOpacity: 0.03,
    elevation: 1,
  },
  storeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    paddingHorizontal: 14,
  },
  storeLogoCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    overflow: 'hidden',
    marginRight: 12,
    borderWidth: 2,
    borderColor: '#E7ECF5',
  },
  storeLogo: {
    width: '100%',
    height: '100%',
  },
  closedLogoWash: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(244,246,248,0.45)',
  },
  storeInfo: {
    flex: 1,
  },
  storeNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  storeName: {
    fontSize: 16,
    fontFamily: fonts.BOLD,
    color: colors.text,
    letterSpacing: -0.2,
  },
  verifiedIcon: {
    marginLeft: 5,
  },
  storeTagline: {
    fontSize: 11,
    color: colors.lighterGray,
    fontFamily: fonts.BOLD,
    marginTop: 3,
  },
  storeMeta: {
    alignItems: 'flex-end',
    gap: 6,
  },
  heartButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F4F6FA',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  ratingText: {
    fontSize: 12,
    color: colors.text,
    fontFamily: fonts.BOLD,
  },
  ratingCount: {
    color: colors.lighterGray,
    fontSize: 11,
  },
  distanceStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
    gap: 3,
  },
  distanceText: {
    fontSize: 11,
    color: colors.lightGray,
    fontFamily: fonts.BOLD,
  },
  openTag: {
    marginLeft: 4,
    backgroundColor: '#DBF0D9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  openTagText: {
    color: '#4C9A45',
    fontSize: 10,
    fontFamily: fonts.BOLD,
  },
  closedTag: {
    marginLeft: 4,
    backgroundColor: '#FDEEEE',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  closedTagText: {
    color: '#D84B4B',
    fontSize: 10,
    fontFamily: fonts.BOLD,
  },
  offersScroll: {
    marginTop: 2,
  },
  offersContent: {
    gap: 12,
    paddingHorizontal: 14,
    paddingRight: 18,
  },
  offerCard: {
    width: CARD_WIDTH + 12,
    backgroundColor: colors.white,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E6ECF7',
  },
  offerImageContainer: {
    height: 96,
    position: 'relative',
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
    overflow: 'hidden',
  },
  offerHeartButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.94)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  offerImage: {
    width: '100%',
    height: '100%',
  },
  offerTag: {
    position: 'absolute',
    left: 8,
    top: 8,
    backgroundColor: '#F8E791',
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 8,
  },
  offerTagText: {
    fontSize: 10,
    color: '#8C7400',
    fontFamily: fonts.BOLD,
  },
  offerInfo: {
    padding: 9,
  },
  offerTitle: {
    fontSize: 12,
    color: colors.text,
    fontFamily: fonts.BOLD,
  },
  offerSubtitle: {
    fontSize: 10,
    color: colors.lightGray,
    fontFamily: fonts.BOLD,
    marginTop: 2,
  },
  offerCountdown: {
    fontSize: 10,
    color: '#E31C5F',
    fontFamily: fonts.BOLD,
    marginTop: 6,
  },
  noOffersText: {
    fontSize: 12,
    color: '#667085',
    fontFamily: fonts.BOLD,
    paddingHorizontal: 16,
    paddingBottom: 4,
  },
});
