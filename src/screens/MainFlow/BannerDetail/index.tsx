import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Image,
  ImageBackground,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import AnimatedScreen from '../../../components/AnimatedScreen';
import OfferCountdownText from '../../../components/OfferCountdownText';
import { colors, fonts } from '../../../helpers/styles';
import { MainStackParamList } from '../../../navigation/types';
import { useAppContext } from '../../../context/AppContext';
import { shopApi } from '../../../services/shopApi';
import { showAppAlert } from '../../../services/appAlert';
import { OfferBanner } from '../../../types/offerBanner';
import { OfferDetail, ShopOffer, ShopWithOffers } from '../../../types/shop';
import { formatOfferExpiryDate } from '../../../utils/offer';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const BANNER_WIDTH = SCREEN_WIDTH - 32;
const BANNER_RADIUS = 30;

const DEFAULT_TERMS = [
  'Valid on selected products only',
  'Cannot be combined with other offers',
  'Offer subject to store terms and availability',
];

const BannerDetail = () => {
  const navigation = useNavigation<StackNavigationProp<MainStackParamList, 'BannerDetail'>>();
  const route = useRoute();
  const { authToken } = useAppContext();
  const initialBanner = (route.params as MainStackParamList['BannerDetail']).banner;

  const [banner, setBanner] = useState<OfferBanner>(initialBanner);
  const [shop, setShop] = useState<ShopWithOffers | null>(null);
  const [offerDetail, setOfferDetail] = useState<OfferDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isNavigating, setIsNavigating] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setIsLoading(true);
      const token = authToken?.trim() || undefined;
      const shopId = initialBanner.shopId?.trim();
      const offerId = (initialBanner.offerId || initialBanner.id)?.trim();

      try {
        let resolvedShop: ShopWithOffers | null = null;
        if (shopId) {
          try {
            resolvedShop = await shopApi.fetchShopByIdWithOffers(shopId, token);
          } catch {
            resolvedShop = null;
          }
        }

        let resolvedOffer: OfferDetail | null = null;
        if (offerId && (shopId || resolvedShop?.id)) {
          try {
            resolvedOffer = await shopApi.fetchOfferById(
              offerId,
              shopId || resolvedShop!.id,
              token,
            );
          } catch {
            resolvedOffer = null;
          }
        }

        if (cancelled) {
          return;
        }

        setShop(resolvedShop);
        setOfferDetail(resolvedOffer);

        setBanner(prev => ({
          ...prev,
          title: resolvedOffer?.title || prev.title,
          subtitle: resolvedOffer?.subtitle || prev.subtitle,
          discount: resolvedOffer?.discount || prev.discount,
          description: resolvedOffer?.description || prev.description,
          image: resolvedOffer?.image || prev.image,
          expiresAt: resolvedOffer?.expiresAt || resolvedOffer?.timeline?.endDate || prev.expiresAt,
          shopName:
            resolvedShop?.name ||
            resolvedOffer?.merchant?.storeName ||
            resolvedOffer?.shopName ||
            prev.shopName,
          shopCategory: resolvedShop?.categories?.[0] || prev.shopCategory,
          shopLogo: resolvedShop?.logo || resolvedOffer?.merchant?.avatar || prev.shopLogo,
          rating: resolvedShop?.rating || prev.rating,
          distance: resolvedShop?.distance || prev.distance,
          isVerified: resolvedShop?.isVerified ?? prev.isVerified,
          shopId: resolvedShop?.id || prev.shopId,
          offerId: resolvedOffer?.id || prev.offerId || prev.id,
          terms:
            prev.terms?.length
              ? prev.terms
              : resolvedOffer?.redeemSteps?.map(step => step.description || step.title).filter(Boolean),
        }));
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [authToken, initialBanner]);

  const imageUri = shopApi.resolveImageUrl(banner.image);
  const logoUri = shopApi.resolveImageUrl(banner.shopLogo);
  const shopName = banner.shopName || shop?.name || 'Partner store';
  const saleTitle = banner.discount || banner.title || 'Special Offer';
  const description =
    banner.description ||
    offerDetail?.description ||
    `${saleTitle}. Valid on selected products only.`;
  const terms = banner.terms?.length ? banner.terms : DEFAULT_TERMS;
  const validTillLabel = useMemo(() => {
    if (!banner.expiresAt) {
      return 'Limited time';
    }
    return formatOfferExpiryDate(banner.expiresAt) || banner.expiresAt;
  }, [banner.expiresAt]);

  const showViewStore = !banner.isAdminBanner && Boolean(banner.shopId || shop?.id);

  const buildOfferPayload = (): ShopOffer => {
    if (offerDetail) {
      return offerDetail;
    }
    return {
      id: banner.offerId || banner.id,
      shopId: banner.shopId || shop?.id || '',
      title: banner.title,
      subtitle: banner.subtitle,
      discount: banner.discount,
      image: banner.image,
      expiresAt: banner.expiresAt,
      description: banner.description,
      shopName,
    };
  };

  const buildShopPayload = (): ShopWithOffers => {
    if (shop) {
      return shop;
    }
    return {
      id: banner.shopId || 'unknown-shop',
      name: shopName,
      logo: banner.shopLogo,
      rating: banner.rating,
      distance: banner.distance,
      isVerified: banner.isVerified,
      categories: banner.shopCategory ? [banner.shopCategory] : undefined,
      offers: [buildOfferPayload()],
    };
  };

  const handleViewStore = async () => {
    const shopId = banner.shopId || shop?.id;
    if (!shopId) {
      showAppAlert(
        'Store unavailable',
        'Store details are not available for this banner yet.',
      );
      return;
    }

    setIsNavigating(true);
    try {
      navigation.navigate('StoreDetail', {
        shopId,
        shop: shop || { id: shopId },
      });
    } finally {
      setIsNavigating(false);
    }
  };

  const handleClaimOffer = () => {
    const offerId = banner.offerId || banner.id;
    if (!offerId) {
      showAppAlert(
        'Offer unavailable',
        'Offer details are not available for this banner yet.',
      );
      return;
    }

    navigation.navigate('OfferDetail', {
      shop: buildShopPayload(),
      offer: buildOfferPayload(),
    });
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <AnimatedScreen style={styles.root}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.headerBtn}
            onPress={() => navigation.goBack()}
            activeOpacity={0.85}
            accessibilityLabel="Close banner details"
          >
            <MaterialCommunityIcons name="close" size={22} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Banner Details</Text>
          <View style={styles.headerBtn} />
        </View>

        {isLoading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <>
            <ScrollView
              style={styles.scroll}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.heroShadow}>
                <View style={styles.heroShell}>
                  {imageUri ? (
                    <ImageBackground
                      source={{ uri: imageUri }}
                      style={styles.heroBanner}
                      imageStyle={styles.heroBannerImage}
                    >
                      <View style={styles.heroCopyWrap}>
                        {banner.badgeLabel ? (
                          <View style={styles.heroBadge}>
                            <Text style={styles.heroBadgeText}>{banner.badgeLabel}</Text>
                          </View>
                        ) : null}
                        <Text style={styles.heroTitle} numberOfLines={1}>
                          {banner.title}
                        </Text>
                        {banner.subtitle ? (
                          <Text style={styles.heroSubtitle} numberOfLines={1}>
                            {banner.subtitle}
                          </Text>
                        ) : null}
                        <View style={styles.heroCountdown}>
                          {banner.expiresAt ? (
                            <OfferCountdownText
                              expiresAt={banner.expiresAt}
                              suffix=" remaining"
                              style={styles.heroCountdownText}
                            />
                          ) : (
                            <Text style={styles.heroCountdownText}>Limited time offer</Text>
                          )}
                        </View>
                      </View>
                    </ImageBackground>
                  ) : (
                    <View style={[styles.heroBanner, styles.heroFallback]}>
                      <MaterialCommunityIcons
                        name="image-outline"
                        size={40}
                        color={colors.mutedText}
                      />
                    </View>
                  )}
                </View>
              </View>

              <View style={styles.storeRow}>
                <View style={styles.storeLogoWrap}>
                  {logoUri ? (
                    <Image source={{ uri: logoUri }} style={styles.storeLogo} />
                  ) : (
                    <View style={[styles.storeLogo, styles.storeLogoFallback]}>
                      <MaterialCommunityIcons name="storefront-outline" size={22} color={colors.primary} />
                    </View>
                  )}
                </View>
                <View style={styles.storeMeta}>
                  <View style={styles.storeNameRow}>
                    <Text style={styles.storeName} numberOfLines={1}>
                      {shopName}
                    </Text>
                    {banner.isVerified ? (
                      <MaterialCommunityIcons name="check-decagram" size={18} color={colors.primary} />
                    ) : null}
                  </View>
                  {banner.shopCategory ? (
                    <Text style={styles.storeCategory}>{banner.shopCategory}</Text>
                  ) : null}
                  <View style={styles.storeStatsRow}>
                    {banner.rating ? (
                      <View style={styles.statChip}>
                        <MaterialCommunityIcons name="star" size={13} color="#F5A623" />
                        <Text style={styles.statText}>{banner.rating}</Text>
                      </View>
                    ) : null}
                    {banner.distance ? (
                      <View style={styles.statChip}>
                        <MaterialCommunityIcons name="map-marker-distance" size={13} color={colors.primary} />
                        <Text style={styles.statText}>{banner.distance}</Text>
                      </View>
                    ) : null}
                  </View>
                </View>
              </View>

              <Text style={styles.saleTitle}>{saleTitle}</Text>
              <Text style={styles.saleDescription}>{description}</Text>

              <View style={styles.validityCard}>
                <View style={styles.validityItem}>
                  <Text style={styles.validityLabel}>Valid Till</Text>
                  <Text style={styles.validityValue}>{validTillLabel}</Text>
                </View>
                <View style={styles.validityDivider} />
                <View style={styles.validityItem}>
                  <Text style={styles.validityLabel}>Time Left</Text>
                  {banner.expiresAt ? (
                    <OfferCountdownText
                      expiresAt={banner.expiresAt}
                      style={styles.validityCountdown}
                    />
                  ) : (
                    <Text style={styles.validityValue}>Limited time</Text>
                  )}
                </View>
              </View>

              <Text style={styles.sectionTitle}>Terms & Conditions</Text>
              {terms.map((term, index) => (
                <View key={`${term}-${index}`} style={styles.termRow}>
                  <View style={styles.bullet} />
                  <Text style={styles.termText}>{term}</Text>
                </View>
              ))}
            </ScrollView>

            <View style={styles.footer}>
              {showViewStore ? (
                <TouchableOpacity
                  style={styles.viewStoreBtn}
                  activeOpacity={0.88}
                  onPress={handleViewStore}
                  disabled={isNavigating}
                >
                  <MaterialCommunityIcons name="eye-outline" size={20} color={colors.white} />
                  <Text style={styles.viewStoreText}>View Store</Text>
                </TouchableOpacity>
              ) : null}

              <View style={styles.secondaryRow}>
                <TouchableOpacity
                  style={styles.claimBtn}
                  activeOpacity={0.88}
                  onPress={handleClaimOffer}
                >
                  <MaterialCommunityIcons name="gift-outline" size={18} color={colors.redOrange} />
                  <Text style={styles.claimText}>Claim Offer</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.closeBtn}
                  activeOpacity={0.88}
                  onPress={() => navigation.goBack()}
                >
                  <Text style={styles.closeText}>Close</Text>
                </TouchableOpacity>
              </View>
            </View>
          </>
        )}
      </AnimatedScreen>
    </SafeAreaView>
  );
};

export default BannerDetail;

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.searchBg,
  },
  headerTitle: {
    fontSize: 17,
    fontFamily: fonts.BOLD,
    color: colors.text,
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  heroShadow: {
    width: BANNER_WIDTH,
    alignSelf: 'center',
    borderRadius: BANNER_RADIUS,
    backgroundColor: '#FFF4EA',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 13 },
    shadowOpacity: 0.18,
    shadowRadius: 21,
    elevation: 8,
    marginBottom: 16,
  },
  heroShell: {
    borderRadius: BANNER_RADIUS,
    overflow: 'hidden',
    backgroundColor: '#FFF4EA',
  },
  heroBanner: {
    minHeight: 160,
    borderRadius: BANNER_RADIUS,
    overflow: 'hidden',
    justifyContent: 'flex-end',
    backgroundColor: '#D9E2F2',
  },
  heroBannerImage: {
    borderRadius: BANNER_RADIUS,
  },
  heroCopyWrap: {
    paddingHorizontal: 17,
    paddingVertical: 14,
  },
  heroBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(0,0,0,0.16)',
    borderRadius: 13,
    paddingHorizontal: 8,
    paddingVertical: 5,
    marginBottom: 7,
  },
  heroBadgeText: {
    color: '#FFE28A',
    fontSize: 9,
    fontFamily: fonts.BOLD,
    letterSpacing: 1.1,
  },
  heroTitle: {
    color: colors.white,
    fontSize: 27,
    lineHeight: 31,
    fontFamily: fonts.BOLD,
    letterSpacing: -0.6,
  },
  heroSubtitle: {
    color: 'rgba(255,255,255,0.86)',
    fontSize: 16,
    fontFamily: fonts.BOLD,
    marginTop: 2,
  },
  heroCountdown: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(0,0,0,0.28)',
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 15,
    marginTop: 11,
  },
  heroCountdownText: {
    color: colors.white,
    fontSize: 10,
    fontFamily: fonts.BOLD,
  },
  heroFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  storeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  storeLogoWrap: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  storeLogo: {
    width: 54,
    height: 54,
    borderRadius: 14,
    backgroundColor: colors.primarySoft,
  },
  storeLogoFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  storeMeta: {
    flex: 1,
  },
  storeNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  storeName: {
    flexShrink: 1,
    fontSize: 17,
    fontFamily: fonts.BOLD,
    color: colors.text,
  },
  storeCategory: {
    marginTop: 2,
    fontSize: 13,
    color: colors.mutedText,
  },
  storeStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 6,
  },
  statChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 12,
    fontFamily: fonts.BOLD,
    color: colors.text,
  },
  saleTitle: {
    fontSize: 22,
    fontFamily: fonts.BOLD,
    color: colors.text,
    marginBottom: 8,
  },
  saleDescription: {
    fontSize: 14,
    lineHeight: 21,
    color: colors.mutedText,
    marginBottom: 16,
  },
  validityCard: {
    flexDirection: 'row',
    backgroundColor: colors.primarySoft,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    paddingVertical: 12,
    marginBottom: 20,
  },
  validityItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  validityDivider: {
    width: 1,
    backgroundColor: colors.primaryBorder,
  },
  validityLabel: {
    fontSize: 11,
    color: colors.mutedText,
    marginBottom: 4,
  },
  validityValue: {
    fontSize: 14,
    fontFamily: fonts.BOLD,
    color: colors.text,
  },
  validityCountdown: {
    fontSize: 14,
    fontFamily: fonts.BOLD,
    color: colors.redOrange,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: fonts.BOLD,
    color: colors.text,
    marginBottom: 10,
  },
  termRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
    gap: 10,
  },
  bullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary,
    marginTop: 7,
  },
  termText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 20,
    color: colors.mutedText,
  },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderGray,
    backgroundColor: colors.bg,
    gap: 10,
  },
  viewStoreBtn: {
    height: 52,
    borderRadius: 14,
    backgroundColor: colors.darkgreen,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  viewStoreText: {
    color: colors.white,
    fontSize: 16,
    fontFamily: fonts.BOLD,
  },
  secondaryRow: {
    flexDirection: 'row',
    gap: 10,
  },
  claimBtn: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.redOrange,
    backgroundColor: '#FFF1F5',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  claimText: {
    color: colors.redOrange,
    fontSize: 14,
    fontFamily: fonts.BOLD,
  },
  closeBtn: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.borderGray,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: {
    color: colors.text,
    fontSize: 14,
    fontFamily: fonts.BOLD,
  },
});
