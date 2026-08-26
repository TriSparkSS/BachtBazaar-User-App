import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Image,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import AnimatedScreen from '../../../components/AnimatedScreen';
import OfferLocationMap from '../OfferDetail/OfferLocationMap';
import { MainStackParamList } from '../../../navigation/types';
import { useAppContext } from '../../../context/AppContext';
import { shopApi } from '../../../services/shopApi';
import { wishlistApi } from '../../../services/offerWishlistApi';
import { cartApi, hasDifferentMerchantInCart } from '../../../services/cartApi';
import { colors, fonts } from '../../../helpers/styles';
import { formatShopAddress, isShopCurrentlyOpen } from '../../../utils/shop';
import { openChatWithNumber, openPhoneDialer } from '../../../helpers/contactActions';
import { showAppAlert } from '../../../services/appAlert';
import { ShopWithOffers } from '../../../types/shop';

const { width } = Dimensions.get('window');
const HEART_RED = '#E11D48';

const PRODUCT_PLACEHOLDER =
  'https://images.pexels.com/photos/4110251/pexels-photo-4110251.jpeg?auto=compress&cs=tinysrgb&dpr=1&w=800';

const SHOP_LOGO_PLACEHOLDER =
  'https://images.pexels.com/photos/264636/pexels-photo-264636.jpeg?auto=compress&cs=tinysrgb&dpr=1&w=200';

const ProductDetail = () => {
  const navigation =
    useNavigation<StackNavigationProp<MainStackParamList, 'ProductDetail'>>();
  const route = useRoute();
  const { authToken } = useAppContext();
  const routeParams = route.params as MainStackParamList['ProductDetail'];
  const product = routeParams.product;
  const [shop, setShop] = useState<ShopWithOffers>(routeParams.shop);
  const [heroError, setHeroError] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isTogglingWishlist, setIsTogglingWishlist] = useState(false);
  /** Source of truth: GET /merchants/:id/delivery-status. Stay false until API returns true (no button flash). */
  const [providesDelivery, setProvidesDelivery] = useState(false);
  const [isAddingToCart, setIsAddingToCart] = useState(false);

  const heroImageUri = useMemo(
    () => shopApi.resolveImageUrl(product.image) ?? PRODUCT_PLACEHOLDER,
    [product.image],
  );
  const shopLogoUri = useMemo(
    () => shopApi.resolveImageUrl(shop.logo) ?? SHOP_LOGO_PLACEHOLDER,
    [shop.logo],
  );
  const shopAddress = formatShopAddress(shop);
  const openNow = isShopCurrentlyOpen(shop);
  const showHeroImage = Boolean(heroImageUri) && !heroError;

  useEffect(() => {
    setShop(routeParams.shop);
  }, [routeParams.shop]);

  useEffect(() => {
    let cancelled = false;
    const merchantId = shop.merchantId?.trim();
    const token = authToken?.trim();

    // Hide cart/delivery until this API confirms delivery is enabled.
    setProvidesDelivery(false);

    if (!merchantId || !token) {
      return;
    }

    shopApi
      .fetchMerchantDeliveryStatus(merchantId, token)
      .then(result => {
        if (cancelled) {
          return;
        }
        setProvidesDelivery(result.providesDelivery);
        setShop(prev =>
          prev.providesDelivery === result.providesDelivery
            ? prev
            : { ...prev, providesDelivery: result.providesDelivery },
        );
      })
      .catch(() => {
        if (!cancelled) {
          setProvidesDelivery(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [authToken, shop.merchantId]);

  useEffect(() => {
    let cancelled = false;
    const shopId = routeParams.shop.id?.trim() || product.shopId?.trim();
    const token = authToken?.trim();
    if (!shopId || !token) {
      return;
    }

    shopApi
      .fetchShopByIdWithOffers(shopId, token)
      .then(detail => {
        if (!cancelled) {
          // Preserve merchantId / delivery flag so a sparse detail payload
          // cannot cancel an in-flight delivery-status fetch or wipe its result.
          setShop(prev => ({
            ...prev,
            ...detail,
            merchantId: detail.merchantId?.trim() || prev.merchantId,
            // delivery-status effect owns this flag — don't let shop GET clobber it.
            providesDelivery: prev.providesDelivery,
          }));
        }
      })
      .catch(() => {
        // Keep route shop if detail refresh fails.
      });

    return () => {
      cancelled = true;
    };
  }, [authToken, product.shopId, routeParams.shop.id]);

  useEffect(() => {
    let cancelled = false;
    const token = authToken?.trim();
    const productId = product.id?.trim();
    if (!token || !productId) {
      setIsSaved(false);
      return;
    }

    wishlistApi
      .isSaved('products', productId, token)
      .then(saved => {
        if (!cancelled) {
          setIsSaved(saved);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setIsSaved(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [authToken, product.id]);

  const handleToggleWishlist = useCallback(async () => {
    const token = authToken?.trim();
    const productId = product.id?.trim();
    if (!token) {
      showAppAlert('Login required', 'Please log in again to save products.');
      return;
    }
    if (!productId) {
      showAppAlert('Product unavailable', 'Product id is missing for this item.');
      return;
    }

    try {
      setIsTogglingWishlist(true);
      if (isSaved) {
        const message = await wishlistApi.remove('products', productId, token);
        setIsSaved(false);
        showAppAlert('Removed', message);
      } else {
        const message = await wishlistApi.add('products', productId, token);
        setIsSaved(true);
        showAppAlert('Saved', message);
      }
    } catch (error) {
      showAppAlert(
        isSaved ? 'Could not remove product' : 'Could not save product',
        error instanceof Error ? error.message : 'Please try again.',
      );
    } finally {
      setIsTogglingWishlist(false);
    }
  }, [authToken, isSaved, product.id]);

  const badgeText = product.isFeatured
    ? 'Featured'
    : product.category?.trim() ||
      product.brand?.trim() ||
      (product.price ? String(product.price) : 'Product');

  const aboutSummary = [product.brand, product.category, product.metalType]
    .filter(Boolean)
    .join(' · ');

  const description =
    product.description?.trim() ||
    `Complete details for ${product.title} available at ${shop.name}. Contact the store for availability, variants, and the best deal.`;

  const specChips = [
    product.brand ? `Brand: ${product.brand}` : null,
    product.category ? `Category: ${product.category}` : null,
    product.metalType ? `Type: ${product.metalType}` : null,
    product.stock != null ? `Stock: ${product.stock}` : null,
    product.rating ? `Rating: ${product.rating}` : null,
  ].filter(Boolean) as string[];

  const getSteps = [
    {
      title: `Visit ${shop.name}`,
      description: shopAddress || 'Check the store location below for directions.',
    },
    {
      title: 'Ask for this product',
      description: `Show or mention "${product.title}" at the counter.`,
    },
    {
      title: 'Confirm price & stock',
      description: product.price
        ? `Listed price ${product.price}${product.originalPrice ? ` (MRP ${product.originalPrice})` : ''}. Confirm final price in-store.`
        : 'Confirm availability and final price with the store.',
    },
  ];

  const handleGetDirections = () => {
    const query = encodeURIComponent(shopAddress || shop.name);
    Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${query}`);
  };

  const handleCall = async () => {
    try {
      await openPhoneDialer(shop.phone);
    } catch (error) {
      showAppAlert(
        'Call unavailable',
        error instanceof Error ? error.message : 'Phone number is not available.',
      );
    }
  };

  const handleChat = async () => {
    try {
      await openChatWithNumber(
        shop.phone,
        `Hi, I'm interested in "${product.title}" from ${shop.name} on Bachat Bazaar.`,
      );
    } catch (error) {
      showAppAlert(
        'Chat unavailable',
        error instanceof Error ? error.message : 'Mobile number is not available for chat.',
      );
    }
  };

  const handleAddToCart = async () => {
    if (isAddingToCart) {
      return;
    }

    const token = authToken?.trim();
    if (!token) {
      showAppAlert('Login required', 'Please log in again to add items to cart.');
      return;
    }

    const merchantId = shop.merchantId?.trim();
    const productId = product.id?.trim();
    if (!merchantId) {
      showAppAlert('Merchant required', 'Could not find the merchant for this product.');
      return;
    }
    if (!productId) {
      showAppAlert('Product required', 'Could not find the product to add to cart.');
      return;
    }

    try {
      setIsAddingToCart(true);
      const cart = await cartApi.fetchCart(token);
      if (hasDifferentMerchantInCart(cart.items, merchantId)) {
        showAppAlert(
          'Different store',
          'Cart has items from another store. Clear cart or continue shopping from the same store.',
          [
            { text: 'OK', style: 'cancel' },
            {
              text: 'Go to Cart',
              onPress: () => navigation.navigate('Cart'),
            },
          ],
        );
        return;
      }

      await cartApi.addToCart([{ productId, merchantId, quantity: 1 }], token);
      showAppAlert(
        'Added to cart',
        `"${product.title}" from ${shop.name} was added to your cart.`,
        [
          { text: 'Add more', style: 'cancel' },
          {
            text: 'Go to Cart',
            onPress: () => navigation.navigate('Cart'),
          },
        ],
      );
    } catch (error) {
      showAppAlert(
        'Could not add to cart',
        error instanceof Error ? error.message : 'Please try again.',
      );
    } finally {
      setIsAddingToCart(false);
    }
  };

  const handleRequestDelivery = () => {
    navigation.navigate('RequestDelivery', { shop, product });
  };

  return (
    <View style={styles.root}>
      <View style={styles.heroSection}>
        {showHeroImage ? (
          <Image
            source={{ uri: heroImageUri }}
            style={styles.heroImage}
            resizeMode="contain"
            onError={() => setHeroError(true)}
          />
        ) : (
          <LinearGradient
            colors={['#4F86F7', '#6BA3FF', '#D7E6FF']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroGradient}>
            <MaterialCommunityIcons
              name="package-variant-closed"
              size={52}
              color="rgba(255,255,255,0.4)"
            />
          </LinearGradient>
        )}
        <LinearGradient
          colors={['rgba(22,32,51,0.04)', 'rgba(22,32,51,0.5)']}
          style={styles.heroOverlay}
        />

        <SafeAreaView edges={['top']} style={styles.heroActions}>
          <TouchableOpacity
            style={styles.heroIconButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.85}>
            <MaterialCommunityIcons name="arrow-left" size={22} color="#1A2238" />
          </TouchableOpacity>

          <View style={styles.heroActionsRight}>
            <TouchableOpacity style={styles.heroIconButton} activeOpacity={0.85}>
              <MaterialCommunityIcons name="share-variant-outline" size={19} color="#1A2238" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.heroIconButton}
              onPress={handleToggleWishlist}
              disabled={isTogglingWishlist}
              activeOpacity={0.85}>
              {isTogglingWishlist ? (
                <ActivityIndicator size="small" color={HEART_RED} />
              ) : (
                <MaterialCommunityIcons
                  name={isSaved ? 'heart' : 'heart-outline'}
                  size={19}
                  color={isSaved ? HEART_RED : '#1A2238'}
                />
              )}
            </TouchableOpacity>
          </View>
        </SafeAreaView>

        <View style={styles.heroBadge}>
          <Text style={styles.heroBadgeText}>{badgeText}</Text>
        </View>
      </View>

      <ScrollView
        style={styles.contentScroll}
        contentContainerStyle={styles.contentScrollContainer}
        showsVerticalScrollIndicator={false}
        bounces={false}>
        <AnimatedScreen style={styles.sheet}>
          <Text style={styles.productTitle}>{product.title}</Text>

          {(product.price || product.originalPrice || product.rating) && (
            <View style={styles.priceCard}>
              {product.price ? <Text style={styles.priceValue}>{product.price}</Text> : null}
              {product.originalPrice ? (
                <Text style={styles.originalPrice}>{product.originalPrice}</Text>
              ) : null}
              {product.rating ? (
                <View style={styles.ratingPill}>
                  <MaterialCommunityIcons name="star" size={13} color="#F5A623" />
                  <Text style={styles.ratingText}>{product.rating}</Text>
                </View>
              ) : null}
            </View>
          )}

          <TouchableOpacity
            style={styles.storeCard}
            activeOpacity={0.88}
            onPress={() => navigation.navigate('StoreDetail', { shop })}>
            <Image source={{ uri: shopLogoUri }} style={styles.storeLogo} />
            <View style={styles.storeCardBody}>
              <Text style={styles.storeName}>{shop.name}</Text>
              {shopAddress ? (
                <Text style={styles.storeAddress} numberOfLines={2}>
                  {shopAddress}
                </Text>
              ) : null}
              <View style={styles.storeMetaRow}>
                {openNow !== undefined ? (
                  <View style={[styles.statusPill, openNow ? styles.statusOpen : styles.statusClosed]}>
                    <Text
                      style={[
                        styles.statusText,
                        openNow ? styles.statusTextOpen : styles.statusTextClosed,
                      ]}>
                      {openNow ? 'Open now' : 'Closed'}
                    </Text>
                  </View>
                ) : null}
                {product.stock != null ? (
                  <View style={styles.metaPill}>
                    <Text style={styles.metaPillText}>
                      {product.stock > 0 ? `${product.stock} in stock` : 'Out of stock'}
                    </Text>
                  </View>
                ) : null}
              </View>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={20} color="#98A2B3" />
          </TouchableOpacity>

          <View
            style={[
              styles.infoBanner,
              product.stock != null && product.stock <= 0 && styles.infoBannerWarn,
            ]}>
            <MaterialCommunityIcons
              name={
                product.stock != null && product.stock <= 0
                  ? 'package-variant-closed-remove'
                  : 'information-outline'
              }
              size={18}
              color={product.stock != null && product.stock <= 0 ? '#D84B4B' : colors.primary}
            />
            <Text
              style={[
                styles.infoBannerText,
                product.stock != null && product.stock <= 0 && styles.infoBannerTextWarn,
              ]}>
              {product.stock != null && product.stock <= 0
                ? 'This product may be out of stock. Call the store to confirm.'
                : `Available at ${shop.name}. Visit or call to purchase.`}
            </Text>
          </View>

          <View style={styles.sectionBlock}>
            <Text style={styles.sectionTitle}>About this product</Text>
            {aboutSummary ? <Text style={styles.summaryText}>{aboutSummary}</Text> : null}
            <Text style={styles.descriptionText}>{description}</Text>
          </View>

          {specChips.length > 0 ? (
            <View style={styles.chipsRow}>
              {specChips.map(label => (
                <View key={label} style={styles.ruleChip}>
                  <Text style={styles.ruleChipText}>{label}</Text>
                </View>
              ))}
            </View>
          ) : null}

          <View style={styles.sectionBlock}>
            <Text style={styles.sectionTitle}>How to get it</Text>
            <View style={styles.stepsList}>
              {getSteps.map((step, index) => (
                <View key={`${step.title}-${index}`} style={styles.stepRow}>
                  <View style={styles.stepNumber}>
                    <Text style={styles.stepNumberText}>{index + 1}</Text>
                  </View>
                  <View style={styles.stepBody}>
                    <Text style={styles.stepTitle}>{step.title}</Text>
                    <Text style={styles.stepDescription}>{step.description}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.sectionBlock}>
            <Text style={styles.sectionTitle}>Store location</Text>
            <OfferLocationMap
              address={shopAddress}
              city={shop.city}
              label={shop.name}
              onGetDirections={handleGetDirections}
            />
          </View>
        </AnimatedScreen>
      </ScrollView>

      <SafeAreaView edges={['bottom']} style={styles.bottomBar}>
        {providesDelivery ? (
          <>
            <TouchableOpacity
              style={[styles.addToCartButton, isAddingToCart && styles.addToCartButtonDisabled]}
              activeOpacity={0.88}
              disabled={isAddingToCart}
              onPress={handleAddToCart}>
              {isAddingToCart ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <MaterialCommunityIcons name="cart-outline" size={20} color={colors.primary} />
              )}
              <Text style={styles.addToCartButtonText}>
                {isAddingToCart ? 'Adding...' : 'Add to Cart'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.requestDeliveryButton}
              activeOpacity={0.88}
              onPress={handleRequestDelivery}>
              <MaterialCommunityIcons name="truck-delivery-outline" size={20} color={colors.white} />
              <Text style={styles.requestDeliveryButtonText}>Request Delivery</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <TouchableOpacity style={styles.chatButton} activeOpacity={0.88} onPress={handleChat}>
              <MaterialCommunityIcons name="whatsapp" size={20} color="#22A45A" />
              <Text style={styles.chatButtonText}>Chat</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.callButton} activeOpacity={0.88} onPress={handleCall}>
              <MaterialCommunityIcons name="phone" size={20} color={colors.white} />
              <Text style={styles.callButtonText}>Call store</Text>
            </TouchableOpacity>
          </>
        )}
      </SafeAreaView>
    </View>
  );
};

export default ProductDetail;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F4F7FC',
  },
  contentScroll: {
    flex: 1,
    marginTop: -24,
  },
  contentScrollContainer: {
    flexGrow: 1,
    paddingBottom: 12,
  },
  heroSection: {
    height: 260,
    backgroundColor: '#D8E2F0',
    justifyContent: 'center',
    alignItems: 'center',
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
  heroBadge: {
    position: 'absolute',
    left: 20,
    bottom: 36,
    backgroundColor: colors.primary,
    borderRadius: 100,
    paddingHorizontal: 14,
    paddingVertical: 8,
    maxWidth: width - 80,
  },
  heroBadgeText: {
    fontSize: 12,
    color: colors.white,
    fontFamily: fonts.BOLD,
    letterSpacing: 0.3,
  },
  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 24,
    minHeight: 420,
  },
  productTitle: {
    fontSize: 24,
    lineHeight: 30,
    color: colors.text,
    fontFamily: fonts.BOLD,
    letterSpacing: -0.4,
    marginBottom: 14,
  },
  priceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 10,
    alignSelf: 'flex-start',
    backgroundColor: colors.primarySoft,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
  },
  priceValue: {
    fontSize: 20,
    color: colors.primary,
    fontFamily: fonts.BOLD,
  },
  originalPrice: {
    fontSize: 13,
    color: '#98A2B3',
    textDecorationLine: 'line-through',
    fontFamily: fonts.BOLD,
  },
  ratingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFF7E8',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  ratingText: {
    fontSize: 12,
    color: '#8A5A00',
    fontFamily: fonts.BOLD,
  },
  storeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAFBFE',
    borderRadius: 16,
    padding: 14,
    gap: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#EEF2F8',
  },
  storeLogo: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#EEF4FF',
  },
  storeCardBody: {
    flex: 1,
  },
  storeName: {
    fontSize: 15,
    color: colors.text,
    fontFamily: fonts.BOLD,
  },
  storeAddress: {
    marginTop: 4,
    fontSize: 12,
    color: colors.mutedText,
    lineHeight: 17,
    fontFamily: fonts.BOLD,
  },
  storeMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  statusPill: {
    borderRadius: 100,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  statusOpen: {
    backgroundColor: '#ECF9F1',
  },
  statusClosed: {
    backgroundColor: '#FDEEEE',
  },
  statusText: {
    fontSize: 11,
    fontFamily: fonts.BOLD,
  },
  statusTextOpen: {
    color: '#1F8B4C',
  },
  statusTextClosed: {
    color: '#D84B4B',
  },
  metaPill: {
    backgroundColor: '#F4F7FC',
    borderRadius: 100,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  metaPillText: {
    fontSize: 11,
    color: '#5E6B82',
    fontFamily: fonts.BOLD,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#EEF4FF',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 18,
  },
  infoBannerWarn: {
    backgroundColor: '#FFF4F4',
  },
  infoBannerText: {
    flex: 1,
    fontSize: 13,
    color: colors.primaryDark,
    fontFamily: fonts.BOLD,
    lineHeight: 18,
  },
  infoBannerTextWarn: {
    color: '#B42318',
  },
  sectionBlock: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    color: colors.text,
    fontFamily: fonts.BOLD,
    marginBottom: 12,
    letterSpacing: -0.2,
  },
  summaryText: {
    fontSize: 14,
    color: colors.primaryDark,
    fontFamily: fonts.BOLD,
    marginBottom: 8,
  },
  descriptionText: {
    fontSize: 13,
    lineHeight: 20,
    color: colors.mutedText,
    fontFamily: fonts.BOLD,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  ruleChip: {
    backgroundColor: '#F4F7FC',
    borderRadius: 100,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: '#E8EDF5',
  },
  ruleChipText: {
    fontSize: 12,
    color: '#5E6B82',
    fontFamily: fonts.BOLD,
  },
  stepsList: {
    gap: 14,
  },
  stepRow: {
    flexDirection: 'row',
    gap: 12,
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  stepNumberText: {
    color: colors.white,
    fontSize: 13,
    fontFamily: fonts.BOLD,
  },
  stepBody: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 14,
    color: colors.text,
    fontFamily: fonts.BOLD,
    marginBottom: 4,
  },
  stepDescription: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.mutedText,
    fontFamily: fonts.BOLD,
  },
  bottomBar: {
    backgroundColor: colors.white,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E4EAF3',
    paddingHorizontal: 20,
    paddingTop: 12,
    flexDirection: 'row',
    gap: 10,
  },
  chatButton: {
    flex: 1,
    height: 52,
    borderRadius: 16,
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: '#22A45A',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  chatButtonText: {
    color: '#22A45A',
    fontSize: 15,
    fontFamily: fonts.BOLD,
  },
  callButton: {
    flex: 1.35,
    height: 52,
    borderRadius: 16,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  callButtonText: {
    color: colors.white,
    fontSize: 15,
    fontFamily: fonts.BOLD,
  },
  addToCartButton: {
    flex: 1,
    height: 52,
    borderRadius: 16,
    backgroundColor: colors.primarySoft,
    borderWidth: 1.5,
    borderColor: colors.primaryBorder,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  addToCartButtonDisabled: {
    opacity: 0.7,
  },
  addToCartButtonText: {
    color: colors.primary,
    fontSize: 14,
    fontFamily: fonts.BOLD,
  },
  requestDeliveryButton: {
    flex: 1.25,
    height: 52,
    borderRadius: 16,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 8,
  },
  requestDeliveryButtonText: {
    color: colors.white,
    fontSize: 14,
    fontFamily: fonts.BOLD,
  },
});
