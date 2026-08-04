import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import StoreDetailScreenView from './StoreDetailScreenView';
import { MainStackParamList } from '../../../navigation/types';
import { useAppContext } from '../../../context/AppContext';
import { shopApi } from '../../../services/shopApi';
import { shopWishlistApi } from '../../../services/shopWishlistApi';
import { showAppAlert } from '../../../services/appAlert';
import { colors, fonts } from '../../../helpers/styles';
import { ShopOffer, ShopProduct, ShopWithOffers } from '../../../types/shop';

const GROCERY_HERO_PLACEHOLDER =
  'https://images.pexels.com/photos/264636/pexels-photo-264636.jpeg?auto=compress&cs=tinysrgb&dpr=1&w=800';

const isFullShop = (value: unknown): value is ShopWithOffers => {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const record = value as Record<string, unknown>;
  return typeof record.id === 'string' && record.id.trim().length > 0 && Array.isArray(record.offers);
};

const StoreDetail = () => {
  const navigation = useNavigation<StackNavigationProp<MainStackParamList, 'StoreDetail'>>();
  const route = useRoute();
  const { authToken, currentUser } = useAppContext();
  const params = (route.params || {}) as MainStackParamList['StoreDetail'];
  const shopId = String(params.shopId || params.shop?.id || '').trim();
  const initialShop = isFullShop(params.shop) ? params.shop : null;

  const [shop, setShop] = useState<ShopWithOffers | null>(initialShop);
  const [isLoadingShop, setIsLoadingShop] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(
    shopId ? null : 'Store id is missing for this screen.',
  );
  const [reloadToken, setReloadToken] = useState(0);
  const [isSaved, setIsSaved] = useState(false);
  const [isTogglingWishlist, setIsTogglingWishlist] = useState(false);

  const retryLoad = useCallback(() => {
    if (!shopId) {
      setLoadError('Store id is missing for this screen.');
      return;
    }
    setShop(null);
    setLoadError(null);
    setIsLoadingShop(true);
    setReloadToken(token => token + 1);
  }, [shopId]);

  useEffect(() => {
    let cancelled = false;

    if (!shopId) {
      setIsLoadingShop(false);
      setLoadError('Store id is missing for this screen.');
      return;
    }

    const seedShop = initialShop;

    const loadShopDetail = async () => {
      try {
        setIsLoadingShop(true);
        setLoadError(null);
        console.log('[StoreDetail] fetching shop', shopId);
        const detail = await shopApi.fetchShopByIdWithOffers(shopId, authToken ?? undefined);

        if (!cancelled) {
          console.log('[StoreDetail] loaded shop', detail.id, detail.name);
          setShop(detail);
          setLoadError(null);
        }
      } catch (error) {
        console.warn(
          '[StoreDetail] fetch failed',
          shopId,
          error instanceof Error ? error.message : error,
        );
        if (!cancelled) {
          if (seedShop) {
            // Keep shop data passed from the previous screen when refresh fails.
            setShop(seedShop);
            setLoadError(null);
          } else {
            setShop(null);
            setLoadError(
              error instanceof Error ? error.message : 'Could not load store details.',
            );
          }
        }
      } finally {
        if (!cancelled) {
          setIsLoadingShop(false);
        }
      }
    };

    loadShopDetail();

    return () => {
      cancelled = true;
    };
    // Seed shop is only used as fallback when API fails; refetch key is shopId + token + retry.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authToken, shopId, reloadToken]);

  useEffect(() => {
    let cancelled = false;
    const token = authToken?.trim();
    const userId = currentUser?._id?.trim();

    if (!token || !shopId) {
      setIsSaved(false);
      return;
    }

    const loadWishlistState = async () => {
      try {
        const wishlisted = await shopWishlistApi.isShopWishlisted(shopId, token, userId);
        if (!cancelled) {
          setIsSaved(wishlisted);
        }
      } catch {
        if (!cancelled) {
          setIsSaved(false);
        }
      }
    };

    loadWishlistState();

    return () => {
      cancelled = true;
    };
  }, [authToken, currentUser?._id, shopId]);

  const heroImageUri = useMemo(() => {
    if (!shop) {
      return GROCERY_HERO_PLACEHOLDER;
    }
    const bannerUri = shopApi.resolveImageUrl(shop.coverImage);
    if (bannerUri) {
      return bannerUri;
    }

    return (
      shopApi.resolveImageUrl(shop.products?.find(product => product.image)?.image) ??
      GROCERY_HERO_PLACEHOLDER
    );
  }, [shop]);

  const products = shop?.products ?? [];

  const openOfferDetail = (offer: ShopOffer) => {
    if (!shop) {
      return;
    }
    navigation.navigate('OfferDetail', { shop, offer });
  };

  const openProductDetail = (product: ShopProduct) => {
    if (!shop) {
      return;
    }
    navigation.navigate('ProductDetail', { shop, product });
  };

  const handleToggleWishlist = useCallback(async () => {
    const token = authToken?.trim();
    const resolvedShopId = shop?.id?.trim() || shopId;
    const userId = currentUser?._id?.trim();

    if (!token) {
      showAppAlert('Login required', 'Please log in again to save stores.');
      return;
    }
    if (!resolvedShopId || !shop) {
      showAppAlert('Store unavailable', 'Store id is missing for this shop.');
      return;
    }

    try {
      setIsTogglingWishlist(true);
      if (isSaved) {
        const message = await shopWishlistApi.removeFromWishlist(resolvedShopId, token, userId);
        setIsSaved(false);
        showAppAlert('Removed', message);
      } else {
        const message = await shopWishlistApi.addToWishlist(
          {
            shopId: resolvedShopId,
            name: shop.name,
            address: shop.address || shop.address1,
            logo: shop.logo,
            city: shop.city,
            phone: shop.phone,
            isVerified: shop.isVerified,
          },
          token,
          userId,
        );
        setIsSaved(true);
        showAppAlert('Saved', message);
      }
    } catch (error) {
      showAppAlert(
        isSaved ? 'Could not remove store' : 'Could not save store',
        error instanceof Error ? error.message : 'Please try again.',
      );
    } finally {
      setIsTogglingWishlist(false);
    }
  }, [authToken, currentUser?._id, isSaved, shop, shopId]);

  if (isLoadingShop && !shop) {
    return (
      <View style={styles.root}>
        <SafeAreaView edges={['top']} style={styles.headerSafe}>
          <View style={styles.header}>
            <TouchableOpacity style={styles.headerButton} onPress={() => navigation.goBack()}>
              <MaterialCommunityIcons name="arrow-left" size={22} color={colors.white} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Store</Text>
            <View style={styles.headerButton} />
          </View>
        </SafeAreaView>
        <View style={styles.centerWrap}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.centerText}>Loading store details...</Text>
        </View>
      </View>
    );
  }

  if (!shop) {
    return (
      <View style={styles.root}>
        <SafeAreaView edges={['top']} style={styles.headerSafe}>
          <View style={styles.header}>
            <TouchableOpacity style={styles.headerButton} onPress={() => navigation.goBack()}>
              <MaterialCommunityIcons name="arrow-left" size={22} color={colors.white} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Store</Text>
            <View style={styles.headerButton} />
          </View>
        </SafeAreaView>
        <View style={styles.centerWrap}>
          <MaterialCommunityIcons name="store-off-outline" size={42} color="#94A3B8" />
          <Text style={styles.centerTitle}>Could not load store</Text>
          <Text style={styles.centerText}>
            {loadError || 'Store details are unavailable right now.'}
          </Text>
          <TouchableOpacity style={styles.retryBtn} onPress={retryLoad}>
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.retryBtn, styles.secondaryBtn]}
            onPress={() => navigation.goBack()}>
            <Text style={[styles.retryBtnText, styles.secondaryBtnText]}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <StoreDetailScreenView
      shop={shop}
      heroImageUri={heroImageUri}
      products={products}
      isLoadingOffers={isLoadingShop}
      isSaved={isSaved}
      isTogglingWishlist={isTogglingWishlist}
      onBack={() => navigation.goBack()}
      onToggleWishlist={handleToggleWishlist}
      onOfferPress={openOfferDetail}
      onProductPress={openProductDetail}
      resolveImageUrl={shopApi.resolveImageUrl}
    />
  );
};

export default StoreDetail;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.primary,
  },
  headerSafe: {
    backgroundColor: colors.primary,
  },
  header: {
    height: 54,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  headerButton: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    color: colors.white,
    fontSize: 17,
    fontFamily: fonts.BOLD,
  },
  centerWrap: {
    flex: 1,
    backgroundColor: '#F4F6FA',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  centerTitle: {
    marginTop: 14,
    fontSize: 17,
    color: colors.text,
    fontFamily: fonts.BOLD,
  },
  centerText: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
    color: colors.mutedText,
    fontFamily: fonts.BOLD,
  },
  retryBtn: {
    marginTop: 18,
    backgroundColor: colors.primary,
    borderRadius: 999,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  secondaryBtn: {
    marginTop: 10,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
  },
  retryBtnText: {
    color: colors.white,
    fontSize: 13,
    fontFamily: fonts.BOLD,
  },
  secondaryBtnText: {
    color: colors.primary,
  },
});
