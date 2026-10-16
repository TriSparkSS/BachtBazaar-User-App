import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
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
import LocalOfferStoreCard from '../../../components/LocalOfferStoreCard';
import { useAppContext } from '../../../context/AppContext';
import { colors, fonts } from '../../../helpers/styles';
import { MainStackParamList } from '../../../navigation/types';
import { showAppAlert } from '../../../services/appAlert';
import {
  areaRadiusStorage,
  DEFAULT_AREA_RADIUS_KM,
} from '../../../services/areaRadiusStorage';
import { offerWishlistApi } from '../../../services/offerWishlistApi';
import { radiusApi } from '../../../services/radiusApi';
import { shopApi } from '../../../services/shopApi';
import { shopWishlistApi } from '../../../services/shopWishlistApi';
import { ShopOffer, ShopWithOffers } from '../../../types/shop';
import {
  filterLocalOfferShops,
  LOCAL_OFFER_FILTERS,
  LocalOfferFilter,
} from '../../../utils/localOfferFilter';

const LocalOffersScreen = () => {
  const navigation = useNavigation<StackNavigationProp<MainStackParamList, 'LocalOffers'>>();
  const route = useRoute<RouteProp<MainStackParamList, 'LocalOffers'>>();
  const { authToken, currentUser } = useAppContext();
  const initialFilter = route.params?.filter ?? 'all';
  const categoryId = route.params?.categoryId ?? 'all';

  const [shops, setShops] = useState<ShopWithOffers[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<LocalOfferFilter>(initialFilter);
  const [filterVisible, setFilterVisible] = useState(false);
  const [savedShopIds, setSavedShopIds] = useState<Record<string, true>>({});
  const [savedOfferIds, setSavedOfferIds] = useState<Record<string, true>>({});
  const [togglingShopId, setTogglingShopId] = useState<string | null>(null);
  const [togglingOfferId, setTogglingOfferId] = useState<string | null>(null);

  const loadShops = useCallback(async () => {
    try {
      setError(null);
      let radiusKm = await areaRadiusStorage.getRadiusKm();
      const token = authToken?.trim();
      if (token) {
        try {
          const remote = await radiusApi.getRadius(token);
          radiusKm = remote.radiusKm;
        } catch {
          radiusKm = radiusKm || DEFAULT_AREA_RADIUS_KM;
        }
      }
      const result = await shopApi.fetchHomeShops(categoryId, token, radiusKm);
      setShops(result);
    } catch (loadError) {
      setShops([]);
      setError(
        loadError instanceof Error ? loadError.message : 'Failed to load local offers.',
      );
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [authToken, categoryId]);

  const loadWishlistIds = useCallback(async () => {
    const token = authToken?.trim();
    const userId = currentUser?._id?.trim();
    if (!token) {
      setSavedShopIds({});
      setSavedOfferIds({});
      return;
    }

    try {
      const [offerList, shopList] = await Promise.all([
        offerWishlistApi.fetchWishlist(token),
        shopWishlistApi.fetchWishlist(token, userId),
      ]);

      const nextOffers: Record<string, true> = {};
      offerList.forEach(item => {
        if (item.offerId) {
          nextOffers[item.offerId] = true;
        }
      });

      const nextShops: Record<string, true> = {};
      shopList.forEach(item => {
        if (item.shopId) {
          nextShops[item.shopId] = true;
        }
      });

      setSavedOfferIds(nextOffers);
      setSavedShopIds(nextShops);
    } catch {
      // Keep previous wishlist chips if refresh fails.
    }
  }, [authToken, currentUser?._id]);

  useFocusEffect(
    useCallback(() => {
      setIsLoading(true);
      void loadShops();
      void loadWishlistIds();
    }, [loadShops, loadWishlistIds]),
  );

  const visibleShops = filterLocalOfferShops(shops, filter);
  const activeFilter = LOCAL_OFFER_FILTERS.find(item => item.id === filter);

  const openStoreDetail = (shop: ShopWithOffers) => {
    navigation.navigate('StoreDetail', { shop });
  };

  const openOfferDetail = (shop: ShopWithOffers, offer: ShopOffer) => {
    navigation.navigate('OfferDetail', { shop, offer });
  };

  const handleToggleShopWishlist = useCallback(
    async (shop: ShopWithOffers) => {
      const token = authToken?.trim();
      const userId = currentUser?._id?.trim();
      const shopId = shop.id?.trim();
      if (!token || !shopId) {
        showAppAlert('Login required', 'Please log in again to save stores.');
        return;
      }

      const isSaved = Boolean(savedShopIds[shopId]);
      try {
        setTogglingShopId(shopId);
        if (isSaved) {
          await shopWishlistApi.removeFromWishlist(shopId, token, userId);
          setSavedShopIds(prev => {
            const next = { ...prev };
            delete next[shopId];
            return next;
          });
        } else {
          await shopWishlistApi.addToWishlist(
            {
              shopId,
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
          setSavedShopIds(prev => ({ ...prev, [shopId]: true }));
        }
      } catch (toggleError) {
        showAppAlert(
          isSaved ? 'Could not remove store' : 'Could not save store',
          toggleError instanceof Error ? toggleError.message : 'Please try again.',
        );
      } finally {
        setTogglingShopId(null);
      }
    },
    [authToken, currentUser?._id, savedShopIds],
  );

  const handleToggleOfferWishlist = useCallback(
    async (offer: ShopOffer) => {
      const token = authToken?.trim();
      const offerId = offer.id?.trim();
      if (!token || !offerId) {
        showAppAlert('Login required', 'Please log in again to save offers.');
        return;
      }

      const isSaved = Boolean(savedOfferIds[offerId]);
      try {
        setTogglingOfferId(offerId);
        if (isSaved) {
          await offerWishlistApi.removeFromWishlist(offerId, token);
          setSavedOfferIds(prev => {
            const next = { ...prev };
            delete next[offerId];
            return next;
          });
        } else {
          await offerWishlistApi.addToWishlist(offerId, token);
          setSavedOfferIds(prev => ({ ...prev, [offerId]: true }));
        }
      } catch (toggleError) {
        showAppAlert(
          isSaved ? 'Could not remove offer' : 'Could not save offer',
          toggleError instanceof Error ? toggleError.message : 'Please try again.',
        );
      } finally {
        setTogglingOfferId(null);
      }
    },
    [authToken, savedOfferIds],
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <MaterialCommunityIcons name="arrow-left" size={22} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerCopy}>
          <Text style={styles.headerTitle}>Local Offers</Text>
          {activeFilter && filter !== 'all' ? (
            <Text style={styles.headerHint}>{activeFilter.hint}</Text>
          ) : (
            <Text style={styles.headerHint}>
              {visibleShops.length} store{visibleShops.length === 1 ? '' : 's'} nearby
            </Text>
          )}
        </View>
        <TouchableOpacity
          style={[styles.filterButton, filter !== 'all' && styles.filterButtonActive]}
          activeOpacity={0.85}
          onPress={() => setFilterVisible(true)}
        >
          <MaterialCommunityIcons
            name="filter-variant"
            size={16}
            color={filter === 'all' ? '#6B7280' : colors.white}
          />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.primary} />
          <Text style={styles.centeredText}>Loading local offers...</Text>
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <MaterialCommunityIcons name="store-off-outline" size={28} color="#99A4B8" />
          <Text style={styles.emptyTitle}>Could not load offers</Text>
          <Text style={styles.centeredText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => { setIsLoading(true); void loadShops(); }}>
            <Text style={styles.retryText}>Try again</Text>
          </TouchableOpacity>
        </View>
      ) : visibleShops.length === 0 ? (
        <View style={styles.centered}>
          <MaterialCommunityIcons name="filter-off-outline" size={28} color="#99A4B8" />
          <Text style={styles.emptyTitle}>Nothing matches this filter</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => setFilter('all')}>
            <Text style={styles.retryText}>Show all stores</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => {
                setIsRefreshing(true);
                void loadShops();
                void loadWishlistIds();
              }}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
        >
          {visibleShops.map(shop => (
            <LocalOfferStoreCard
              key={shop.id}
              shop={shop}
              shopSaved={Boolean(savedShopIds[shop.id])}
              shopToggling={togglingShopId === shop.id}
              savedOfferIds={savedOfferIds}
              togglingOfferId={togglingOfferId}
              onPressStore={() => openStoreDetail(shop)}
              onPressOffer={offer => openOfferDetail(shop, offer)}
              onToggleShop={() => handleToggleShopWishlist(shop)}
              onToggleOffer={handleToggleOfferWishlist}
            />
          ))}
        </ScrollView>
      )}

      <Modal
        visible={filterVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setFilterVisible(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setFilterVisible(false)}>
          <Pressable style={styles.filterSheet} onPress={() => undefined}>
            <View style={styles.filterHeader}>
              <Text style={styles.filterTitle}>Filter local offers</Text>
              <TouchableOpacity onPress={() => setFilterVisible(false)} hitSlop={10}>
                <MaterialCommunityIcons name="close" size={22} color={colors.text} />
              </TouchableOpacity>
            </View>
            {LOCAL_OFFER_FILTERS.map(option => {
              const selected = filter === option.id;
              return (
                <TouchableOpacity
                  key={option.id}
                  style={[styles.filterOption, selected && styles.filterOptionSelected]}
                  activeOpacity={0.8}
                  onPress={() => {
                    setFilter(option.id);
                    setFilterVisible(false);
                  }}
                >
                  <View style={[styles.filterIcon, selected && styles.filterIconSelected]}>
                    <MaterialCommunityIcons
                      name={option.icon}
                      size={18}
                      color={selected ? colors.white : colors.primary}
                    />
                  </View>
                  <View style={styles.filterCopy}>
                    <Text style={[styles.filterLabel, selected && styles.filterLabelSelected]}>
                      {option.label}
                    </Text>
                    <Text style={styles.filterHint}>{option.hint}</Text>
                  </View>
                  <MaterialCommunityIcons
                    name={selected ? 'check-circle' : 'circle-outline'}
                    size={20}
                    color={selected ? colors.primary : '#C5CEDB'}
                  />
                </TouchableOpacity>
              );
            })}
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
};

export default LocalOffersScreen;

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#F4F6FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 12,
    gap: 10,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: '#EEF1F6',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
  },
  headerCopy: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    color: colors.text,
    fontFamily: fonts.BOLD,
  },
  headerHint: {
    marginTop: 2,
    fontSize: 12,
    color: '#6B7280',
    fontFamily: fonts.BOLD,
  },
  filterButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
  },
  filterButtonActive: {
    backgroundColor: colors.primary,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 28,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    gap: 8,
  },
  centeredText: {
    fontSize: 13,
    color: '#667085',
    textAlign: 'center',
    fontFamily: fonts.BOLD,
  },
  emptyTitle: {
    fontSize: 16,
    color: colors.text,
    fontFamily: fonts.BOLD,
  },
  retryButton: {
    marginTop: 8,
    backgroundColor: colors.primary,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  retryText: {
    color: colors.white,
    fontSize: 13,
    fontFamily: fonts.BOLD,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(22, 32, 51, 0.42)',
    justifyContent: 'flex-end',
  },
  filterSheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
  },
  filterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  filterTitle: {
    fontSize: 18,
    color: colors.text,
    fontFamily: fonts.BOLD,
  },
  filterOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 14,
    marginBottom: 6,
  },
  filterOptionSelected: {
    backgroundColor: '#F4F8FF',
  },
  filterIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#EAF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterIconSelected: {
    backgroundColor: colors.primary,
  },
  filterCopy: {
    flex: 1,
  },
  filterLabel: {
    fontSize: 14,
    color: colors.text,
    fontFamily: fonts.BOLD,
  },
  filterLabelSelected: {
    color: colors.primary,
  },
  filterHint: {
    marginTop: 2,
    fontSize: 12,
    color: '#667085',
    fontFamily: fonts.BOLD,
  },
});
