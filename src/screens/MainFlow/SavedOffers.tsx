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
import { RouteProp, useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAppContext } from '../../context/AppContext';
import { MainStackParamList } from '../../navigation/types';
import { wishlistApi } from '../../services/offerWishlistApi';
import { shopApi } from '../../services/shopApi';
import { showAppAlert } from '../../services/appAlert';
import {
  WishlistOfferItem,
  WishlistProductItem,
  WishlistShopItem,
  WishlistType,
} from '../../types/wishlist';
import { ShopOffer, ShopProduct, ShopWithOffers } from '../../types/shop';
import { colors, fonts } from '../../helpers/styles';

const HEART_RED = '#E11D48';

type SavedTab = WishlistType;

const formatDate = (value?: string) => {
  if (!value) {
    return '';
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

const toShopOffer = (item: WishlistOfferItem): ShopOffer => ({
  id: item.offerId,
  shopId: item.shopId || '',
  title: item.title,
  subtitle: item.subtitle,
  discount: item.discount,
  image: item.image,
  expiresAt: item.expiresAt,
  description: item.description,
  minimumPurchaseAmount: item.minimumPurchaseAmount,
});

const toMinimalShopFromOffer = (item: WishlistOfferItem): ShopWithOffers => ({
  id: item.shopId || 'unknown-shop',
  name: item.shopName || 'Partner store',
  offers: [toShopOffer(item)],
});

const toShopProduct = (item: WishlistProductItem): ShopProduct => ({
  id: item.productId,
  shopId: item.shopId || '',
  title: item.title,
  category: item.category,
  brand: item.brand,
  description: item.subtitle,
  image: item.image,
  price: item.price,
  originalPrice: item.originalPrice,
});

const resolveInitialTab = (value?: string | null): SavedTab => {
  if (value === 'shops' || value === 'products' || value === 'offers') {
    return value;
  }
  return 'offers';
};

const SavedOffers = () => {
  const navigation = useNavigation<StackNavigationProp<MainStackParamList, 'SavedOffers'>>();
  const route = useRoute<RouteProp<MainStackParamList, 'SavedOffers'>>();
  const { authToken } = useAppContext();
  const [activeTab, setActiveTab] = useState<SavedTab>(() =>
    resolveInitialTab(route.params?.initialTab),
  );
  const [offers, setOffers] = useState<WishlistOfferItem[]>([]);
  const [stores, setStores] = useState<WishlistShopItem[]>([]);
  const [products, setProducts] = useState<WishlistProductItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [isClearing, setIsClearing] = useState(false);

  const loadTab = useCallback(
    async (_tab?: SavedTab) => {
      const token = authToken?.trim();
      if (!token) {
        setOffers([]);
        setStores([]);
        setProducts([]);
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        // Backend returns offers + shops + products in one payload for every typed GET.
        const all = await wishlistApi.fetchAll(token);
        setOffers(all.offers);
        setStores(all.shops);
        setProducts(all.products);
      } catch (error) {
        showAppAlert(
          'Could not load saved items',
          error instanceof Error ? error.message : 'Please try again.',
        );
        setOffers([]);
        setStores([]);
        setProducts([]);
      } finally {
        setIsLoading(false);
      }
    },
    [authToken],
  );

  useFocusEffect(
    useCallback(() => {
      setActiveTab(resolveInitialTab(route.params?.initialTab));
      loadTab();
    }, [loadTab, route.params?.initialTab]),
  );

  const handleRemove = async (type: WishlistType, id: string) => {
    const token = authToken?.trim();
    if (!token) {
      showAppAlert('Login required', 'Please log in again to manage saved items.');
      return;
    }

    try {
      setRemovingId(id);
      const message = await wishlistApi.remove(type, id, token);
      if (type === 'offers') {
        setOffers(prev => prev.filter(entry => entry.offerId !== id && entry.id !== id));
      } else if (type === 'shops') {
        setStores(prev => prev.filter(entry => entry.shopId !== id && entry.id !== id));
      } else {
        setProducts(prev => prev.filter(entry => entry.productId !== id && entry.id !== id));
      }
      showAppAlert('Removed', message);
    } catch (error) {
      showAppAlert(
        'Could not remove item',
        error instanceof Error ? error.message : 'Please try again.',
      );
    } finally {
      setRemovingId(null);
    }
  };

  const handleClearAll = () => {
    const count =
      activeTab === 'offers' ? offers.length : activeTab === 'shops' ? stores.length : products.length;
    if (!count) {
      return;
    }

    showAppAlert('Clear wishlist?', 'Remove all saved items from your wishlist?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear all',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            const token = authToken?.trim();
            if (!token) {
              showAppAlert('Login required', 'Please log in again to manage saved items.');
              return;
            }

            try {
              setIsClearing(true);
              const message = await wishlistApi.clear(token);
              setOffers([]);
              setStores([]);
              setProducts([]);
              showAppAlert('Cleared', message);
            } catch (error) {
              showAppAlert(
                'Could not clear wishlist',
                error instanceof Error ? error.message : 'Please try again.',
              );
            } finally {
              setIsClearing(false);
            }
          })();
        },
      },
    ]);
  };

  const openOffer = async (item: WishlistOfferItem) => {
    const offer = toShopOffer(item);
    let shop = toMinimalShopFromOffer(item);

    if (item.shopId?.trim() && authToken?.trim()) {
      try {
        shop = await shopApi.fetchShopByIdWithOffers(item.shopId, authToken);
      } catch {
        // Fall back to minimal shop payload.
      }
    }

    navigation.navigate('OfferDetail', { shop, offer });
  };

  const openStore = async (item: WishlistShopItem) => {
    let shop: ShopWithOffers = {
      id: item.shopId,
      name: item.name,
      address: item.address,
      logo: item.logo,
      city: item.city,
      phone: item.phone,
      isVerified: item.isVerified,
      offers: [],
    };

    if (authToken?.trim()) {
      try {
        shop = await shopApi.fetchShopByIdWithOffers(item.shopId, authToken);
      } catch {
        // Keep minimal shop payload.
      }
    }

    navigation.navigate('StoreDetail', { shop });
  };

  const openProduct = async (item: WishlistProductItem) => {
    const product = toShopProduct(item);
    let shop: ShopWithOffers = {
      id: item.shopId || 'unknown-shop',
      name: item.shopName || 'Partner store',
      offers: [],
      products: [product],
    };

    if (item.shopId?.trim() && authToken?.trim()) {
      try {
        shop = await shopApi.fetchShopByIdWithOffers(item.shopId, authToken);
      } catch {
        // Keep minimal shop payload.
      }
    }

    navigation.navigate('ProductDetail', { shop, product });
  };

  const activeCount =
    activeTab === 'offers' ? offers.length : activeTab === 'shops' ? stores.length : products.length;

  const emptyCopy =
    activeTab === 'offers'
      ? {
          title: 'No saved offers',
          sub: 'Tap the heart on any offer to save it here.',
        }
      : activeTab === 'shops'
        ? {
            title: 'No saved stores',
            sub: 'Tap the heart on any store to save it here.',
          }
        : {
            title: 'No saved products',
            sub: 'Tap the heart on any product to save it here.',
          };

  const renderHeartButton = (id: string, onPress: () => void) => {
    const isRemoving = removingId === id;
    return (
      <TouchableOpacity
        style={styles.heartBtn}
        activeOpacity={0.85}
        disabled={isRemoving}
        onPress={onPress}>
        {isRemoving ? (
          <ActivityIndicator size="small" color={HEART_RED} />
        ) : (
          <MaterialCommunityIcons name="heart" size={22} color={HEART_RED} />
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.root}>
      <SafeAreaView edges={['top']} style={styles.headerSafe}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.85}>
            <MaterialCommunityIcons name="arrow-left" size={22} color={colors.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Saved</Text>
          {activeCount > 0 ? (
            <TouchableOpacity
              style={styles.clearBtn}
              onPress={handleClearAll}
              disabled={isClearing}
              activeOpacity={0.85}>
              {isClearing ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <Text style={styles.clearText}>Clear</Text>
              )}
            </TouchableOpacity>
          ) : (
            <View style={styles.backBtn} />
          )}
        </View>
      </SafeAreaView>

      <View style={styles.body}>
        <View style={styles.tabs}>
          {(
            [
              { id: 'offers' as const, label: `Offers (${offers.length})` },
              { id: 'shops' as const, label: `Stores (${stores.length})` },
              { id: 'products' as const, label: `Products (${products.length})` },
            ] as const
          ).map(tab => (
            <TouchableOpacity
              key={tab.id}
              style={[styles.tab, activeTab === tab.id && styles.tabActive]}
              onPress={() => setActiveTab(tab.id)}
              activeOpacity={0.85}>
              <Text style={[styles.tabText, activeTab === tab.id && styles.tabTextActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {isLoading && activeCount === 0 ? (
          <View style={styles.center}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={styles.centerText}>Loading saved items...</Text>
          </View>
        ) : !isLoading && activeCount === 0 ? (
          <View style={styles.center}>
            <View style={styles.emptyIcon}>
              <MaterialCommunityIcons name="heart-outline" size={28} color={HEART_RED} />
            </View>
            <Text style={styles.emptyTitle}>{emptyCopy.title}</Text>
            <Text style={styles.emptySub}>{emptyCopy.sub}</Text>
          </View>
        ) : (
          <ScrollView
            style={styles.flex}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={isLoading}
                onRefresh={() => loadTab(activeTab)}
                tintColor={colors.primary}
              />
            }>
            {activeTab === 'offers'
              ? offers.map(item => {
                  const imageUri = shopApi.resolveImageUrl(item.image);
                  return (
                    <TouchableOpacity
                      key={item.id}
                      style={styles.card}
                      activeOpacity={0.88}
                      onPress={() => openOffer(item)}>
                      <View style={styles.imageWrap}>
                        {imageUri ? (
                          <Image source={{ uri: imageUri }} style={styles.image} />
                        ) : (
                          <View style={styles.imageFallback}>
                            <MaterialCommunityIcons name="tag-outline" size={22} color="#99A4B8" />
                          </View>
                        )}
                      </View>
                      <View style={styles.copy}>
                        <Text style={styles.title} numberOfLines={2}>
                          {item.title}
                        </Text>
                        {item.shopName ? (
                          <Text style={styles.shop} numberOfLines={1}>
                            {item.shopName}
                          </Text>
                        ) : null}
                        <View style={styles.metaRow}>
                          {item.discount ? (
                            <View style={styles.discountChip}>
                              <Text style={styles.discountText}>{item.discount}</Text>
                            </View>
                          ) : null}
                          {item.createdAt || item.expiresAt ? (
                            <Text style={styles.metaText}>
                              {item.expiresAt
                                ? `Expires ${formatDate(item.expiresAt)}`
                                : `Saved ${formatDate(item.createdAt)}`}
                            </Text>
                          ) : null}
                        </View>
                      </View>
                      {renderHeartButton(item.offerId, () => handleRemove('offers', item.offerId))}
                    </TouchableOpacity>
                  );
                })
              : activeTab === 'shops'
                ? stores.map(item => {
                    const imageUri = shopApi.resolveImageUrl(item.logo);
                    return (
                      <TouchableOpacity
                        key={item.id}
                        style={styles.card}
                        activeOpacity={0.88}
                        onPress={() => openStore(item)}>
                        <View style={styles.imageWrap}>
                          {imageUri ? (
                            <Image source={{ uri: imageUri }} style={styles.image} />
                          ) : (
                            <View style={styles.imageFallback}>
                              <MaterialCommunityIcons
                                name="storefront-outline"
                                size={22}
                                color="#99A4B8"
                              />
                            </View>
                          )}
                        </View>
                        <View style={styles.copy}>
                          <Text style={styles.title} numberOfLines={2}>
                            {item.name}
                          </Text>
                          {item.address ? (
                            <Text style={styles.shop} numberOfLines={2}>
                              {item.address}
                            </Text>
                          ) : null}
                          {item.createdAt ? (
                            <Text style={styles.metaText}>Saved {formatDate(item.createdAt)}</Text>
                          ) : null}
                        </View>
                        {renderHeartButton(item.shopId, () => handleRemove('shops', item.shopId))}
                      </TouchableOpacity>
                    );
                  })
                : products.map(item => {
                    const imageUri = shopApi.resolveImageUrl(item.image);
                    return (
                      <TouchableOpacity
                        key={item.id}
                        style={styles.card}
                        activeOpacity={0.88}
                        onPress={() => openProduct(item)}>
                        <View style={styles.imageWrap}>
                          {imageUri ? (
                            <Image source={{ uri: imageUri }} style={styles.image} />
                          ) : (
                            <View style={styles.imageFallback}>
                              <MaterialCommunityIcons
                                name="package-variant-closed"
                                size={22}
                                color="#99A4B8"
                              />
                            </View>
                          )}
                        </View>
                        <View style={styles.copy}>
                          <Text style={styles.title} numberOfLines={2}>
                            {item.title}
                          </Text>
                          {item.shopName ? (
                            <Text style={styles.shop} numberOfLines={1}>
                              {item.shopName}
                            </Text>
                          ) : null}
                          <View style={styles.metaRow}>
                            {item.price ? (
                              <View style={styles.discountChip}>
                                <Text style={styles.discountText}>{item.price}</Text>
                              </View>
                            ) : null}
                            {item.createdAt ? (
                              <Text style={styles.metaText}>Saved {formatDate(item.createdAt)}</Text>
                            ) : null}
                          </View>
                        </View>
                        {renderHeartButton(item.productId, () =>
                          handleRemove('products', item.productId),
                        )}
                      </TouchableOpacity>
                    );
                  })}
          </ScrollView>
        )}
      </View>
    </View>
  );
};

export default SavedOffers;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.primary,
  },
  flex: { flex: 1 },
  headerSafe: {
    backgroundColor: colors.primary,
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
  clearBtn: {
    minWidth: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  clearText: {
    color: colors.white,
    fontSize: 13,
    fontFamily: fonts.BOLD,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 17,
    color: colors.white,
    fontFamily: fonts.BOLD,
  },
  body: {
    flex: 1,
    backgroundColor: '#F4F6FA',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  tabs: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 14,
    marginBottom: 4,
    backgroundColor: '#E8EDF5',
    borderRadius: 12,
    padding: 4,
    gap: 4,
  },
  tab: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  tabActive: {
    backgroundColor: colors.white,
  },
  tabText: {
    fontSize: 12,
    color: '#667085',
    fontFamily: fonts.BOLD,
    textAlign: 'center',
  },
  tabTextActive: {
    color: colors.primary,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 36,
    gap: 8,
  },
  centerText: {
    fontSize: 13,
    color: colors.mutedText,
    fontFamily: fonts.BOLD,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E8EDF5',
  },
  emptyTitle: {
    fontSize: 17,
    color: colors.text,
    fontFamily: fonts.BOLD,
  },
  emptySub: {
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
    color: colors.mutedText,
    fontFamily: fonts.BOLD,
  },
  list: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 28,
    gap: 12,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  imageWrap: {
    width: 64,
    height: 64,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#EEF2F8',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imageFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: {
    flex: 1,
    gap: 3,
  },
  title: {
    fontSize: 14,
    color: colors.text,
    fontFamily: fonts.BOLD,
  },
  shop: {
    fontSize: 12,
    color: '#667085',
    fontFamily: fonts.BOLD,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 2,
  },
  discountChip: {
    backgroundColor: '#EEF4FF',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  discountText: {
    fontSize: 11,
    color: colors.primary,
    fontFamily: fonts.BOLD,
  },
  metaText: {
    fontSize: 11,
    color: '#98A2B3',
    fontFamily: fonts.BOLD,
  },
  heartBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF1F3',
  },
});
