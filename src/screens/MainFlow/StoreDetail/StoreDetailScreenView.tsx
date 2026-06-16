import React, { useMemo, useState } from 'react';
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
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import AnimatedScreen from '../../../components/AnimatedScreen';
import { colors, fonts } from '../../../helpers/styles';
import { ShopOffer, ShopProduct, ShopWithOffers } from '../../../types/shop';
import {
  DEFAULT_SHOP_CATEGORIES,
  METAL_FILTERS,
  MetalFilter,
  STORE_TABS,
  StoreTab,
} from '../../../utils/shop';

const { width } = Dimensions.get('window');
const PRODUCT_CARD_WIDTH = (width - 48) / 2;

const PRODUCT_PLACEHOLDER =
  'https://images.pexels.com/photos/1191531/pexels-photo-1191531.jpeg?auto=compress&cs=tinysrgb&dpr=1&w=400';

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
  const [activeMetalFilter, setActiveMetalFilter] = useState<MetalFilter>('All');
  const [isSaved, setIsSaved] = useState(false);

  const categories = shop.categories?.length ? shop.categories : DEFAULT_SHOP_CATEGORIES;

  const filteredProducts = useMemo(() => {
    if (activeMetalFilter === 'All') {
      return products;
    }

    return products.filter(product => product.metalType === activeMetalFilter);
  }, [activeMetalFilter, products]);

  const galleryImages = useMemo(() => {
    const images = [
      heroImageUri,
      ...shop.offers.map(offer => resolveImageUrl(offer.image)).filter(Boolean),
    ] as string[];

    return [...new Set(images)];
  }, [heroImageUri, resolveImageUrl, shop.offers]);

  const renderOfferCard = (offer: ShopOffer) => {
    const offerImage = resolveImageUrl(offer.image) ?? PRODUCT_PLACEHOLDER;

    return (
      <TouchableOpacity
        key={offer.id}
        style={styles.offerListCard}
        activeOpacity={0.86}
        onPress={() => onOfferPress(offer)}
      >
        <Image source={{ uri: offerImage }} style={styles.offerListImage} />
        <View style={styles.offerListBody}>
          <Text style={styles.offerListTitle}>{offer.title}</Text>
          {offer.subtitle ? <Text style={styles.offerListSubtitle}>{offer.subtitle}</Text> : null}
          {offer.discount ? (
            <View style={styles.offerListBadge}>
              <Text style={styles.offerListBadgeText}>{offer.discount}</Text>
            </View>
          ) : null}
        </View>
      </TouchableOpacity>
    );
  };

  const renderProductCard = (product: ShopProduct) => {
    const productImage = resolveImageUrl(product.image) ?? PRODUCT_PLACEHOLDER;

    const matchingOffer = shop.offers.find(offer => offer.id === product.id);

    return (
      <TouchableOpacity
        key={product.id}
        style={styles.productCard}
        activeOpacity={0.88}
        onPress={() => matchingOffer && onOfferPress(matchingOffer)}
      >
        <View style={styles.productImageWrap}>
          <Image source={{ uri: productImage }} style={styles.productImage} />
          <TouchableOpacity style={styles.productFavoriteButton} activeOpacity={0.8}>
            <MaterialCommunityIcons name="heart-outline" size={16} color="#4A5672" />
          </TouchableOpacity>
        </View>
        <View style={styles.productBody}>
          <View style={styles.productTitleRow}>
            <Text style={styles.productTitle} numberOfLines={1}>
              {product.title}
            </Text>
            {product.rating ? (
              <View style={styles.productRating}>
                <MaterialCommunityIcons name="star" size={12} color="#F2A900" />
                <Text style={styles.productRatingText}>{product.rating}</Text>
              </View>
            ) : null}
          </View>
          {product.category ? (
            <Text style={styles.productCategory} numberOfLines={1}>
              {product.category}
            </Text>
          ) : null}
          <View style={styles.productPriceRow}>
            {product.price ? <Text style={styles.productPrice}>{product.price}</Text> : null}
            {product.originalPrice ? (
              <Text style={styles.productOriginalPrice}>{product.originalPrice}</Text>
            ) : null}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderTabContent = () => {
    if (activeTab === 'Reviews') {
      return (
        <View style={styles.emptyStateCard}>
          <MaterialCommunityIcons name="message-star-outline" size={32} color="#99A4B8" />
          <Text style={styles.emptyStateTitle}>No reviews yet</Text>
          <Text style={styles.emptyStateText}>Be the first to review {shop.name}.</Text>
        </View>
      );
    }

    if (activeTab === 'Gallery') {
      return (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.galleryRow}
        >
          {galleryImages.map((imageUri, index) => (
            <Image key={`${imageUri}-${index}`} source={{ uri: imageUri }} style={styles.galleryImage} />
          ))}
        </ScrollView>
      );
    }

    if (activeTab === 'Offers') {
      if (isLoadingOffers) {
        return (
          <View style={styles.loadingBlock}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={styles.loadingText}>Loading offers...</Text>
          </View>
        );
      }

      if (!shop.offers.length) {
        return (
          <View style={styles.emptyStateCard}>
            <MaterialCommunityIcons name="tag-off-outline" size={32} color="#99A4B8" />
            <Text style={styles.emptyStateTitle}>No offers right now</Text>
            <Text style={styles.emptyStateText}>Check back soon for new deals.</Text>
          </View>
        );
      }

      return <View style={styles.offerList}>{shop.offers.map(renderOfferCard)}</View>;
    }

    return (
      <>
        <Text style={styles.filterLabel}>Metal Type:</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          {METAL_FILTERS.map(filter => {
            const isActive = activeMetalFilter === filter;

            return (
              <TouchableOpacity
                key={filter}
                style={[styles.filterChip, isActive && styles.filterChipActive]}
                onPress={() => setActiveMetalFilter(filter)}
                activeOpacity={0.82}
              >
                <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>
                  {filter}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <Text style={styles.sectionTitle}>Collections</Text>

        {isLoadingOffers ? (
          <View style={styles.loadingBlock}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={styles.loadingText}>Loading collections...</Text>
          </View>
        ) : filteredProducts.length > 0 ? (
          <View style={styles.productGrid}>{filteredProducts.map(renderProductCard)}</View>
        ) : (
          <View style={styles.emptyStateCard}>
            <MaterialCommunityIcons name="diamond-stone" size={32} color="#99A4B8" />
            <Text style={styles.emptyStateTitle}>No items in this filter</Text>
            <Text style={styles.emptyStateText}>Try another metal type or check offers.</Text>
          </View>
        )}
      </>
    );
  };

  return (
    <View style={styles.root}>
      <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
        <View style={styles.heroSection}>
          <Image source={{ uri: heroImageUri }} style={styles.heroImage} />
          <View style={styles.heroOverlay} />

          <SafeAreaView edges={['top']} style={styles.heroActions}>
            <TouchableOpacity style={styles.heroIconButton} onPress={onBack} activeOpacity={0.82}>
              <MaterialCommunityIcons name="arrow-left" size={22} color="#202843" />
            </TouchableOpacity>

            <View style={styles.heroActionsRight}>
              <TouchableOpacity style={styles.heroIconButton} activeOpacity={0.82}>
                <MaterialCommunityIcons name="share-variant-outline" size={20} color="#202843" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.heroIconButton}
                onPress={() => setIsSaved(prev => !prev)}
                activeOpacity={0.82}
              >
                <MaterialCommunityIcons
                  name={isSaved ? 'heart' : 'heart-outline'}
                  size={20}
                  color={isSaved ? colors.primary : '#202843'}
                />
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </View>

        <AnimatedScreen style={styles.sheet}>
          <View style={styles.sheetHandle} />

          <View style={styles.storeTopRow}>
            <View style={styles.storeTitleBlock}>
              <View style={styles.storeNameRow}>
                <Text style={styles.storeName}>{shop.name}</Text>
                {shop.isVerified ? (
                  <MaterialCommunityIcons name="check-decagram" size={18} color={colors.primary} />
                ) : null}
              </View>
              {shop.tagline ? <Text style={styles.storeTagline}>{shop.tagline}</Text> : null}
            </View>

            <View style={styles.storeQuickStats}>
              {shop.rating ? (
                <View style={styles.quickStat}>
                  <MaterialCommunityIcons name="star" size={14} color="#F2A900" />
                  <Text style={styles.quickStatText}>{shop.rating}</Text>
                </View>
              ) : null}
              {shop.distance ? (
                <View style={styles.quickStat}>
                  <MaterialCommunityIcons name="map-marker" size={14} color={colors.primary} />
                  <Text style={styles.quickStatText}>{shop.distance}</Text>
                </View>
              ) : null}
              <TouchableOpacity
                style={styles.saveButton}
                onPress={() => setIsSaved(prev => !prev)}
                activeOpacity={0.82}
              >
                <MaterialCommunityIcons
                  name={isSaved ? 'bookmark' : 'bookmark-outline'}
                  size={18}
                  color={colors.primary}
                />
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryRow}
          >
            {categories.map(category => (
              <View key={category} style={styles.categoryChip}>
                <Text style={styles.categoryChipText}>{category}</Text>
              </View>
            ))}
          </ScrollView>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tabRow}
          >
            {STORE_TABS.map(tab => {
              const isActive = activeTab === tab;

              return (
                <TouchableOpacity
                  key={tab}
                  style={styles.tabButton}
                  onPress={() => setActiveTab(tab)}
                  activeOpacity={0.82}
                >
                  <Text style={[styles.tabText, isActive && styles.tabTextActive]}>{tab}</Text>
                  {isActive ? <View style={styles.tabIndicator} /> : null}
                </TouchableOpacity>
              );
            })}
          </ScrollView>

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
    backgroundColor: '#F7FAFF',
  },
  heroSection: {
    height: 250,
    backgroundColor: '#D8E2F0',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 32, 51, 0.18)',
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
    paddingTop: 8,
  },
  heroActionsRight: {
    flexDirection: 'row',
    gap: 10,
  },
  heroIconButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#1B2430',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  sheet: {
    marginTop: -28,
    backgroundColor: colors.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 10,
    paddingHorizontal: 16,
    paddingBottom: 32,
    minHeight: 500,
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 44,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D8E2F0',
    marginBottom: 16,
  },
  storeTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 14,
  },
  storeTitleBlock: {
    flex: 1,
  },
  storeNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  storeName: {
    fontSize: 24,
    lineHeight: 28,
    color: colors.text,
    fontFamily: fonts.BOLD,
    letterSpacing: -0.5,
  },
  storeTagline: {
    marginTop: 4,
    fontSize: 13,
    color: '#667085',
    fontFamily: fonts.BOLD,
  },
  storeQuickStats: {
    alignItems: 'flex-end',
    gap: 8,
  },
  quickStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  quickStatText: {
    fontSize: 12,
    color: colors.text,
    fontFamily: fonts.BOLD,
  },
  saveButton: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryRow: {
    gap: 8,
    paddingBottom: 14,
  },
  categoryChip: {
    backgroundColor: colors.primarySoft,
    borderRadius: 100,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
  },
  categoryChipText: {
    fontSize: 12,
    color: colors.primaryDark,
    fontFamily: fonts.BOLD,
  },
  tabRow: {
    gap: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#E8EDF5',
    paddingBottom: 0,
    marginBottom: 18,
  },
  tabButton: {
    paddingBottom: 12,
    alignItems: 'center',
    minWidth: 72,
  },
  tabText: {
    fontSize: 14,
    color: '#99A4B8',
    fontFamily: fonts.BOLD,
  },
  tabTextActive: {
    color: colors.primary,
  },
  tabIndicator: {
    position: 'absolute',
    bottom: 0,
    width: '70%',
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.primary,
  },
  tabContent: {
    paddingBottom: 24,
  },
  filterLabel: {
    fontSize: 15,
    color: colors.text,
    fontFamily: fonts.BOLD,
    marginBottom: 10,
  },
  filterRow: {
    gap: 10,
    paddingBottom: 18,
  },
  filterChip: {
    borderRadius: 100,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: '#D8E2F0',
  },
  filterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterChipText: {
    fontSize: 13,
    color: '#667085',
    fontFamily: fonts.BOLD,
  },
  filterChipTextActive: {
    color: colors.white,
  },
  sectionTitle: {
    fontSize: 18,
    color: colors.text,
    fontFamily: fonts.BOLD,
    marginBottom: 14,
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
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E8EDF5',
    shadowColor: '#1B2430',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  productImageWrap: {
    height: 132,
    backgroundColor: '#F3F6FB',
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  productFavoriteButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  productBody: {
    padding: 10,
  },
  productTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  productTitle: {
    flex: 1,
    fontSize: 13,
    color: colors.text,
    fontFamily: fonts.BOLD,
  },
  productRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  productRatingText: {
    fontSize: 11,
    color: colors.text,
    fontFamily: fonts.BOLD,
  },
  productCategory: {
    marginTop: 2,
    fontSize: 11,
    color: '#667085',
    fontFamily: fonts.BOLD,
  },
  productPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
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
  offerList: {
    gap: 12,
  },
  offerListCard: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFD',
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E8EDF5',
  },
  offerListImage: {
    width: 96,
    height: 96,
  },
  offerListBody: {
    flex: 1,
    padding: 12,
    justifyContent: 'center',
  },
  offerListTitle: {
    fontSize: 14,
    color: colors.text,
    fontFamily: fonts.BOLD,
  },
  offerListSubtitle: {
    marginTop: 4,
    fontSize: 12,
    color: '#667085',
    fontFamily: fonts.BOLD,
  },
  offerListBadge: {
    alignSelf: 'flex-start',
    marginTop: 8,
    backgroundColor: colors.primarySoft,
    borderRadius: 100,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  offerListBadgeText: {
    fontSize: 11,
    color: colors.primaryDark,
    fontFamily: fonts.BOLD,
  },
  galleryRow: {
    gap: 12,
    paddingBottom: 8,
  },
  galleryImage: {
    width: 160,
    height: 120,
    borderRadius: 16,
    backgroundColor: '#E8EDF5',
  },
  emptyStateCard: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 36,
    paddingHorizontal: 20,
    backgroundColor: '#F8FAFD',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E8EDF5',
    gap: 8,
  },
  emptyStateTitle: {
    fontSize: 15,
    color: colors.text,
    fontFamily: fonts.BOLD,
  },
  emptyStateText: {
    fontSize: 12,
    color: '#667085',
    textAlign: 'center',
  },
  loadingBlock: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 28,
    gap: 10,
  },
  loadingText: {
    fontSize: 13,
    color: '#667085',
    fontFamily: fonts.BOLD,
  },
});
