import React, { useEffect, useMemo, useState } from 'react';
import {
  Dimensions,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import AnimatedScreen from '../../../components/AnimatedScreen';
import OfferCountdownText from '../../../components/OfferCountdownText';
import { colors, fonts } from '../../../helpers/styles';
import { ShopOffer, ShopProduct, ShopWithOffers } from '../../../types/shop';
import {
  formatShopAddress,
  formatTodayOpeningHours,
  getFeaturedProducts,
  isShopOpenNow,
  STORE_TABS,
  StoreTab,
} from '../../../utils/shop';

const { width } = Dimensions.get('window');
const PRODUCT_CARD_WIDTH = (width - 52) / 2;

const PRODUCT_PLACEHOLDER =
  'https://images.pexels.com/photos/4110251/pexels-photo-4110251.jpeg?auto=compress&cs=tinysrgb&dpr=1&w=400';

const getShopInitial = (name: string) => name.trim().charAt(0).toUpperCase() || 'S';

type StoreDetailScreenViewProps = {
  shop: ShopWithOffers;
  heroImageUri: string;
  products: ShopProduct[];
  isLoadingOffers?: boolean;
  onBack: () => void;
  onOfferPress: (offer: ShopOffer) => void;
  resolveImageUrl: (path?: string | null) => string | undefined;
};

const StoreDetailScreenView: React.FC<StoreDetailScreenViewProps> = ({
  shop,
  heroImageUri,
  products,
  isLoadingOffers = false,
  onBack,
  onOfferPress,
  resolveImageUrl,
}) => {
  const [activeTab, setActiveTab] = useState<StoreTab>('Overview');
  const [isSaved, setIsSaved] = useState(false);
  const [heroError, setHeroError] = useState(false);
  const [logoError, setLogoError] = useState(false);

  const shopAddress = formatShopAddress(shop);
  const shopLogoUri = resolveImageUrl(shop.logo);
  const openNow = isShopOpenNow(shop.openingHours) ?? shop.isOpen;
  const todayHours = formatTodayOpeningHours(shop.openingHours);
  const featuredProducts = useMemo(() => getFeaturedProducts(products), [products]);
  const showHeroImage = Boolean(heroImageUri) && !heroError;

  useEffect(() => {
    setLogoError(false);
  }, [shop.logo]);

  useEffect(() => {
    setHeroError(false);
  }, [heroImageUri]);

  const galleryImages = useMemo(() => {
    const images = [
      ...products.map(product => resolveImageUrl(product.image)).filter(Boolean),
      ...shop.offers.map(offer => resolveImageUrl(offer.image)).filter(Boolean),
    ] as string[];

    return [...new Set(images)];
  }, [products, resolveImageUrl, shop.offers]);

  const renderOfferCard = (offer: ShopOffer, compact = false) => {
    const offerImage = resolveImageUrl(offer.image) ?? PRODUCT_PLACEHOLDER;

    if (compact) {
      return (
        <TouchableOpacity
          key={offer.id}
          style={styles.offerCompactCard}
          activeOpacity={0.9}
          onPress={() => onOfferPress(offer)}
        >
          <Image source={{ uri: offerImage }} style={styles.offerCompactImage} />
          <LinearGradient
            colors={['transparent', 'rgba(22, 32, 51, 0.72)']}
            style={styles.offerCompactGradient}
          />
          {offer.discount ? (
            <View style={styles.offerDiscountRibbon}>
              <Text style={styles.offerDiscountRibbonText}>{offer.discount}</Text>
            </View>
          ) : null}
          <View style={styles.offerCompactFooter}>
            <Text style={styles.offerCompactTitle} numberOfLines={1}>
              {offer.title}
            </Text>
            {offer.description ? (
              <Text style={styles.offerCompactDescription} numberOfLines={1}>
                {offer.description}
              </Text>
            ) : null}
            <OfferCountdownText
              expiresAt={offer.expiresAt}
              countdown={offer.countdown}
              suffix=" left"
              style={styles.offerCompactTimer}
            />
          </View>
        </TouchableOpacity>
      );
    }

    return (
      <TouchableOpacity
        key={offer.id}
        style={styles.offerCard}
        activeOpacity={0.92}
        onPress={() => onOfferPress(offer)}
      >
        <View style={styles.offerImageWrap}>
          <Image source={{ uri: offerImage }} style={styles.offerCardImage} />
          {offer.discount ? (
            <View style={styles.offerDiscountPill}>
              <MaterialCommunityIcons name="tag-outline" size={12} color={colors.white} />
              <Text style={styles.offerDiscountPillText}>{offer.discount}</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.offerCardBody}>
          <View style={styles.offerCardTopRow}>
            <View style={styles.offerCardTitleBlock}>
              <Text style={styles.offerCardTitle}>{offer.title}</Text>
              {offer.description ? (
                <Text style={styles.offerCardDescription} numberOfLines={2}>
                  {offer.description}
                </Text>
              ) : offer.subtitle ? (
                <Text style={styles.offerCardDescription}>{offer.subtitle}</Text>
              ) : null}
            </View>
            <MaterialCommunityIcons name="chevron-right" size={22} color="#C5CEDD" />
          </View>

          <View style={styles.offerCardMeta}>
            {offer.offerType ? (
              <View style={styles.offerTypeChip}>
                <Text style={styles.offerTypeChipText}>{offer.offerType}</Text>
              </View>
            ) : null}
            <View style={styles.offerExpiryRow}>
              <MaterialCommunityIcons name="clock-outline" size={13} color="#8B97AB" />
              {offer.expiresAt ? (
                <OfferCountdownText
                  expiresAt={offer.expiresAt}
                  countdown={offer.countdown}
                  prefix="Ends in "
                  expiredText="Offer expired"
                  style={styles.offerExpiryText}
                />
              ) : (
                <Text style={styles.offerExpiryText}>
                  {offer.countdown?.trim() || 'Limited time offer'}
                </Text>
              )}
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderProductCard = (product: ShopProduct) => {
    const productImage = resolveImageUrl(product.image) ?? PRODUCT_PLACEHOLDER;

    return (
      <View key={product.id} style={styles.productCard}>
        <View style={styles.productImageWrap}>
          <Image source={{ uri: productImage }} style={styles.productImage} />
          {product.isFeatured ? (
            <View style={styles.featuredBadge}>
              <Text style={styles.featuredBadgeText}>Featured</Text>
            </View>
          ) : null}
        </View>
        <View style={styles.productBody}>
          <Text style={styles.productTitle} numberOfLines={2}>
            {product.title}
          </Text>
          <View style={styles.productPriceRow}>
            {product.price ? <Text style={styles.productPrice}>{product.price}</Text> : null}
            {product.originalPrice ? (
              <Text style={styles.productOriginalPrice}>{product.originalPrice}</Text>
            ) : null}
          </View>
          {product.stock != null ? (
            <Text style={styles.productStock}>{product.stock} in stock</Text>
          ) : null}
        </View>
      </View>
    );
  };

  const renderStatPill = (icon: string, label: string) => (
    <View style={styles.statPill} key={label}>
      <MaterialCommunityIcons name={icon as any} size={14} color={colors.primary} />
      <Text style={styles.statPillText}>{label}</Text>
    </View>
  );

  const renderOverview = () => (
    <>
      <View style={styles.infoCard}>
        {shopAddress ? (
          <View style={styles.infoRow}>
            <View style={styles.infoIconWrap}>
              <MaterialCommunityIcons name="map-marker-outline" size={16} color={colors.primary} />
            </View>
            <Text style={styles.infoText}>{shopAddress}</Text>
          </View>
        ) : null}
        {shop.phone ? (
          <View style={styles.infoRow}>
            <View style={styles.infoIconWrap}>
              <MaterialCommunityIcons name="phone-outline" size={16} color={colors.primary} />
            </View>
            <Text style={styles.infoText}>{shop.phone}</Text>
          </View>
        ) : null}
        {todayHours ? (
          <View style={[styles.infoRow, !shop.merchantName && styles.infoRowLast]}>
            <View style={styles.infoIconWrap}>
              <MaterialCommunityIcons name="clock-outline" size={16} color={colors.primary} />
            </View>
            <Text style={styles.infoText}>{todayHours}</Text>
          </View>
        ) : null}
        {shop.merchantName ? (
          <View style={[styles.infoRow, styles.infoRowLast]}>
            <View style={styles.infoIconWrap}>
              <MaterialCommunityIcons name="account-outline" size={16} color={colors.primary} />
            </View>
            <Text style={styles.infoText}>{shop.merchantName}</Text>
          </View>
        ) : null}
      </View>

      {featuredProducts.length > 0 ? (
        <View style={styles.sectionBlock}>
          <Text style={styles.sectionTitle}>Popular picks</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalList}
          >
            {featuredProducts.map(product => {
              const productImage = resolveImageUrl(product.image) ?? PRODUCT_PLACEHOLDER;

              return (
                <View key={product.id} style={styles.horizontalProductCard}>
                  <Image source={{ uri: productImage }} style={styles.horizontalProductImage} />
                  <Text style={styles.horizontalProductTitle} numberOfLines={2}>
                    {product.title}
                  </Text>
                  {product.price ? <Text style={styles.horizontalProductPrice}>{product.price}</Text> : null}
                </View>
              );
            })}
          </ScrollView>
        </View>
      ) : null}

      {shop.offers.length > 0 ? (
        <View style={styles.sectionBlock}>
          <Text style={styles.sectionTitle}>Deals for you</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalList}
          >
            {shop.offers.slice(0, 4).map(offer => renderOfferCard(offer, true))}
          </ScrollView>
        </View>
      ) : null}
    </>
  );

  const renderTabContent = () => {
    if (isLoadingOffers) {
      return (
        <View style={styles.loadingBlock}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={styles.loadingText}>Loading store details...</Text>
        </View>
      );
    }

    if (activeTab === 'Gallery') {
      if (!galleryImages.length) {
        return (
          <View style={styles.emptyStateCard}>
            <MaterialCommunityIcons name="image-off-outline" size={28} color="#B8C2D3" />
            <Text style={styles.emptyStateTitle}>No photos yet</Text>
            <Text style={styles.emptyStateText}>Store photos will appear here.</Text>
          </View>
        );
      }

      return (
        <View style={styles.galleryGrid}>
          {galleryImages.map((imageUri, index) => (
            <Image key={`${imageUri}-${index}`} source={{ uri: imageUri }} style={styles.galleryImage} />
          ))}
        </View>
      );
    }

    if (activeTab === 'Offers') {
      if (!shop.offers.length) {
        return (
          <View style={styles.emptyStateCard}>
            <MaterialCommunityIcons name="tag-off-outline" size={28} color="#B8C2D3" />
            <Text style={styles.emptyStateTitle}>No offers right now</Text>
            <Text style={styles.emptyStateText}>Check back soon for new deals.</Text>
          </View>
        );
      }

      return <View style={styles.offerList}>{shop.offers.map(offer => renderOfferCard(offer))}</View>;
    }

    if (activeTab === 'Products') {
      if (!products.length) {
        return (
          <View style={styles.emptyStateCard}>
            <MaterialCommunityIcons name="package-variant-closed" size={28} color="#B8C2D3" />
            <Text style={styles.emptyStateTitle}>No products listed</Text>
            <Text style={styles.emptyStateText}>This store has not added products yet.</Text>
          </View>
        );
      }

      return <View style={styles.productGrid}>{products.map(renderProductCard)}</View>;
    }

    return renderOverview();
  };

  return (
    <View style={styles.root}>
      <View style={styles.heroSection}>
        {showHeroImage ? (
          <Image
            key={heroImageUri}
            source={{ uri: heroImageUri }}
            style={styles.heroImage}
            onError={() => setHeroError(true)}
          />
        ) : (
          <LinearGradient
            colors={['#4F86F7', '#6BA3FF', '#A8C8FF']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroGradient}
          >
            <MaterialCommunityIcons name="storefront-outline" size={56} color="rgba(255,255,255,0.35)" />
          </LinearGradient>
        )}
        <LinearGradient
          colors={['rgba(22,32,51,0.05)', 'rgba(22,32,51,0.45)']}
          style={styles.heroOverlay}
        />

        <SafeAreaView edges={['top']} style={styles.heroActions}>
          <TouchableOpacity style={styles.heroIconButton} onPress={onBack} activeOpacity={0.85}>
            <MaterialCommunityIcons name="arrow-left" size={22} color="#1A2238" />
          </TouchableOpacity>

          <View style={styles.heroActionsRight}>
            <TouchableOpacity style={styles.heroIconButton} activeOpacity={0.85}>
              <MaterialCommunityIcons name="share-variant-outline" size={19} color="#1A2238" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.heroIconButton}
              onPress={() => setIsSaved(prev => !prev)}
              activeOpacity={0.85}
            >
              <MaterialCommunityIcons
                name={isSaved ? 'heart' : 'heart-outline'}
                size={19}
                color={isSaved ? colors.primary : '#1A2238'}
              />
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>

      <ScrollView
        style={styles.contentScroll}
        contentContainerStyle={styles.contentScrollContainer}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <AnimatedScreen style={styles.sheet}>
          <View style={styles.avatarWrap}>
            <LinearGradient colors={['#EEF4FF', '#FFFFFF']} style={styles.avatarRing}>
              <View style={styles.avatarCircle}>
                {shopLogoUri && !logoError ? (
                  <Image
                    key={shopLogoUri}
                    source={{ uri: shopLogoUri }}
                    style={styles.avatarImage}
                    onError={() => setLogoError(true)}
                  />
                ) : (
                  <Text style={styles.avatarInitial}>{getShopInitial(shop.name)}</Text>
                )}
              </View>
            </LinearGradient>
          </View>

          <View style={styles.storeHeader}>
            <View style={styles.storeTitleRow}>
              <Text style={styles.storeName}>{shop.name}</Text>
              {shop.isVerified ? (
                <MaterialCommunityIcons name="check-decagram" size={20} color={colors.primary} />
              ) : null}
            </View>

            {shopAddress ? (
              <Text style={styles.storeAddress} numberOfLines={2}>
                {shopAddress}
              </Text>
            ) : null}

            <View style={styles.storeMetaRow}>
              {openNow !== undefined ? (
                <View style={[styles.statusPill, openNow ? styles.statusOpen : styles.statusClosed]}>
                  <View style={[styles.statusDot, openNow ? styles.statusDotOpen : styles.statusDotClosed]} />
                  <Text style={[styles.statusText, openNow ? styles.statusTextOpen : styles.statusTextClosed]}>
                    {openNow ? 'Open now' : 'Closed'}
                  </Text>
                </View>
              ) : null}
              {shop.phone ? (
                <View style={styles.phonePill}>
                  <MaterialCommunityIcons name="phone-outline" size={13} color="#5E6B82" />
                  <Text style={styles.phonePillText}>{shop.phone}</Text>
                </View>
              ) : null}
            </View>

            <View style={styles.statsRow}>
              {shop.productCount
                ? renderStatPill('package-variant-closed', `${shop.productCount} Product${shop.productCount === 1 ? '' : 's'}`)
                : null}
              {shop.offerCount
                ? renderStatPill('tag-multiple-outline', `${shop.offerCount} Offer${shop.offerCount === 1 ? '' : 's'}`)
                : null}
              {shop.serviceCount
                ? renderStatPill('hand-heart-outline', `${shop.serviceCount} Service${shop.serviceCount === 1 ? '' : 's'}`)
                : null}
            </View>
          </View>

          <View style={styles.tabSwitcher}>
            {STORE_TABS.map(tab => {
              const isActive = activeTab === tab;

              return (
                <TouchableOpacity
                  key={tab}
                  style={[styles.tabPill, isActive && styles.tabPillActive]}
                  onPress={() => setActiveTab(tab)}
                  activeOpacity={0.85}
                >
                  <Text style={[styles.tabPillText, isActive && styles.tabPillTextActive]}>{tab}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.tabContent}>{renderTabContent()}</View>
        </AnimatedScreen>
      </ScrollView>
    </View>
  );
};

export default StoreDetailScreenView;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F4F7FC',
  },
  heroSection: {
    height: 210,
    backgroundColor: '#D8E2F0',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroGradient: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  heroActions: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 6,
  },
  heroActionsRight: {
    flexDirection: 'row',
    gap: 8,
  },
  heroIconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentScroll: {
    flex: 1,
    marginTop: -16,
  },
  contentScrollContainer: {
    flexGrow: 1,
    paddingBottom: 32,
  },
  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 12,
    paddingHorizontal: 20,
    paddingBottom: 36,
    minHeight: 520,
  },
  avatarWrap: {
    alignSelf: 'center',
    marginTop: 4,
    marginBottom: 16,
  },
  avatarRing: {
    width: 78,
    height: 78,
    borderRadius: 39,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: colors.white,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarInitial: {
    fontSize: 28,
    color: colors.white,
    fontFamily: fonts.BOLD,
  },
  storeHeader: {
    alignItems: 'center',
    marginBottom: 20,
    paddingTop: 4,
  },
  storeTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
    paddingHorizontal: 8,
  },
  storeName: {
    fontSize: 22,
    lineHeight: 28,
    color: colors.text,
    fontFamily: fonts.BOLD,
    letterSpacing: -0.3,
    textAlign: 'center',
    flexShrink: 1,
  },
  storeAddress: {
    fontSize: 13,
    color: colors.mutedText,
    fontFamily: fonts.BOLD,
    lineHeight: 18,
    textAlign: 'center',
    paddingHorizontal: 12,
  },
  storeMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginTop: 12,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 100,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  statusOpen: {
    backgroundColor: '#ECF9F1',
  },
  statusClosed: {
    backgroundColor: '#FDEEEE',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusDotOpen: {
    backgroundColor: '#22A55B',
  },
  statusDotClosed: {
    backgroundColor: '#E05252',
  },
  statusText: {
    fontSize: 12,
    fontFamily: fonts.BOLD,
  },
  statusTextOpen: {
    color: '#1F8B4C',
  },
  statusTextClosed: {
    color: '#D84B4B',
  },
  phonePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#F4F7FC',
    borderRadius: 100,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  phonePillText: {
    fontSize: 12,
    color: '#5E6B82',
    fontFamily: fonts.BOLD,
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginTop: 14,
  },
  statPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.primarySoft,
    borderRadius: 100,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  statPillText: {
    fontSize: 12,
    color: colors.primaryDark,
    fontFamily: fonts.BOLD,
  },
  tabSwitcher: {
    flexDirection: 'row',
    backgroundColor: '#F4F7FC',
    borderRadius: 14,
    padding: 4,
    marginBottom: 20,
  },
  tabPill: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
  },
  tabPillActive: {
    backgroundColor: colors.white,
    shadowColor: '#1B2430',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  tabPillText: {
    fontSize: 12,
    color: '#8B97AB',
    fontFamily: fonts.BOLD,
  },
  tabPillTextActive: {
    color: colors.primary,
  },
  tabContent: {
    paddingBottom: 12,
  },
  infoCard: {
    backgroundColor: '#FAFBFE',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 4,
    marginBottom: 22,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#EEF2F8',
  },
  infoRowLast: {
    borderBottomWidth: 0,
  },
  infoIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: colors.text,
    fontFamily: fonts.BOLD,
    lineHeight: 18,
  },
  sectionBlock: {
    marginBottom: 22,
  },
  sectionTitle: {
    fontSize: 16,
    color: colors.text,
    fontFamily: fonts.BOLD,
    marginBottom: 12,
    letterSpacing: -0.2,
  },
  horizontalList: {
    gap: 12,
    paddingRight: 4,
  },
  horizontalProductCard: {
    width: 128,
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 10,
    borderWidth: 1,
    borderColor: '#EEF2F8',
  },
  horizontalProductImage: {
    width: '100%',
    height: 88,
    borderRadius: 12,
    backgroundColor: '#F3F6FB',
    marginBottom: 8,
  },
  horizontalProductTitle: {
    fontSize: 12,
    color: colors.text,
    fontFamily: fonts.BOLD,
    minHeight: 32,
    lineHeight: 16,
  },
  horizontalProductPrice: {
    marginTop: 4,
    fontSize: 13,
    color: colors.primary,
    fontFamily: fonts.BOLD,
  },
  productGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 14,
  },
  productCard: {
    width: PRODUCT_CARD_WIDTH,
    backgroundColor: colors.white,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#EEF2F8',
  },
  productImageWrap: {
    height: 128,
    backgroundColor: '#F3F6FB',
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  featuredBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: colors.primary,
    borderRadius: 100,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  featuredBadgeText: {
    fontSize: 9,
    color: colors.white,
    fontFamily: fonts.BOLD,
  },
  productBody: {
    padding: 12,
  },
  productTitle: {
    fontSize: 13,
    color: colors.text,
    fontFamily: fonts.BOLD,
    minHeight: 34,
    lineHeight: 17,
  },
  productPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
  },
  productPrice: {
    fontSize: 14,
    color: colors.text,
    fontFamily: fonts.BOLD,
  },
  productOriginalPrice: {
    fontSize: 11,
    color: '#99A4B8',
    textDecorationLine: 'line-through',
    fontFamily: fonts.BOLD,
  },
  productStock: {
    marginTop: 4,
    fontSize: 11,
    color: colors.mutedText,
    fontFamily: fonts.BOLD,
  },
  offerList: {
    gap: 14,
  },
  offerCard: {
    backgroundColor: colors.white,
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#EEF2F8',
    shadowColor: '#1B2430',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 3,
  },
  offerImageWrap: {
    height: 148,
    backgroundColor: '#F3F6FB',
  },
  offerCardImage: {
    width: '100%',
    height: '100%',
  },
  offerDiscountPill: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primary,
    borderRadius: 100,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  offerDiscountPillText: {
    fontSize: 11,
    color: colors.white,
    fontFamily: fonts.BOLD,
  },
  offerCardBody: {
    padding: 14,
  },
  offerCardTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  offerCardTitleBlock: {
    flex: 1,
  },
  offerCardTitle: {
    fontSize: 16,
    color: colors.text,
    fontFamily: fonts.BOLD,
    letterSpacing: -0.2,
  },
  offerCardDescription: {
    marginTop: 4,
    fontSize: 13,
    color: colors.mutedText,
    lineHeight: 18,
    fontFamily: fonts.BOLD,
  },
  offerCardMeta: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    flexWrap: 'wrap',
  },
  offerTypeChip: {
    backgroundColor: '#F4F7FC',
    borderRadius: 100,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  offerTypeChipText: {
    fontSize: 11,
    color: '#5E6B82',
    fontFamily: fonts.BOLD,
  },
  offerExpiryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  offerExpiryText: {
    fontSize: 11,
    color: '#8B97AB',
    fontFamily: fonts.BOLD,
  },
  offerCompactCard: {
    width: 168,
    height: 196,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#EEF2F8',
  },
  offerCompactImage: {
    width: '100%',
    height: '100%',
  },
  offerCompactGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  offerDiscountRibbon: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: colors.primary,
    borderRadius: 100,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  offerDiscountRibbonText: {
    fontSize: 10,
    color: colors.white,
    fontFamily: fonts.BOLD,
  },
  offerCompactFooter: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: 12,
  },
  offerCompactTitle: {
    fontSize: 13,
    color: colors.white,
    fontFamily: fonts.BOLD,
  },
  offerCompactDescription: {
    marginTop: 2,
    fontSize: 11,
    color: 'rgba(255,255,255,0.82)',
    fontFamily: fonts.BOLD,
  },
  offerCompactTimer: {
    marginTop: 4,
    fontSize: 10,
    color: 'rgba(255,255,255,0.9)',
    fontFamily: fonts.BOLD,
  },
  galleryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  galleryImage: {
    width: (width - 50) / 2,
    height: 118,
    borderRadius: 14,
    backgroundColor: '#EEF2F8',
  },
  emptyStateCard: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 24,
    backgroundColor: '#FAFBFE',
    borderRadius: 16,
    gap: 6,
  },
  emptyStateTitle: {
    fontSize: 15,
    color: colors.text,
    fontFamily: fonts.BOLD,
    marginTop: 4,
  },
  emptyStateText: {
    fontSize: 12,
    color: colors.mutedText,
    textAlign: 'center',
    lineHeight: 18,
  },
  loadingBlock: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 36,
    gap: 10,
  },
  loadingText: {
    fontSize: 13,
    color: colors.mutedText,
    fontFamily: fonts.BOLD,
  },
});
