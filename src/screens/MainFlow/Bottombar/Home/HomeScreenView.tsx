import {
  Dimensions,
  Image,
  Modal,
  PermissionsAndroid,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useEffect, useMemo, useState } from 'react';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { CommonActions, useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Geolocation from 'react-native-geolocation-service';
import AnimatedScreen from '../../../../components/AnimatedScreen';
import { AppIconName } from '../../../../components/AppIcon';
import Navbar from '../../../../components/navbar';
import { resolveProfileImageUrl } from '../../../../config/api';
import { colors, fonts } from '../../../../helpers/styles';
import { useAppContext } from '../../../../context/AppContext';
import { userAuthApi } from '../../../../services/userAuthApi';
import { showAppAlert } from '../../../../services/appAlert';
import { logApiEvent } from '../../../../services/apiClient';
import { ShopOffer, ShopWithOffers } from '../../../../types/shop';
import { MainStackParamList } from '../../../../navigation/types';
import { shopApi } from '../../../../services/shopApi';
import { extractCityFromGeocode, resolveShopCity } from '../../../../utils/location';
import { formatOfferCountdown } from '../../../../utils/offer';

const { width } = Dimensions.get('window');
const CARD_WIDTH = Math.min((width - 48) / 3 - 4, 118);
const LOCAL_OFFER_CARD_WIDTH = Math.min(width * 0.74, 292);
const DINEOUT_GREEN = '#004B36';
const DINEOUT_GREEN_LIGHT = '#0F6B4F';

type SidebarItem = {
  icon: AppIconName;
  label: string;
  tone?: 'danger';
};

type SidebarGroup = {
  title: string;
  items: SidebarItem[];
};

type CategoryChip = {
  id: string;
  label: string;
  icon: string;
  color: string;
  bg: string;
};

const PLACEHOLDER_SHOP_LOGO =
  'https://images.pexels.com/photos/248077/pexels-photo-248077.jpeg?auto=compress&cs=tinysrgb&dpr=1&w=200';

const PLACEHOLDER_OFFER_IMAGE =
  'https://images.pexels.com/photos/1191531/pexels-photo-1191531.jpeg?auto=compress&cs=tinysrgb&dpr=1&w=400';

const sidebarIconPalette: Record<string, string> = {
  Overview: '#F7DCA8',
  Shop: '#D9E8FF',
  Delivery: '#D8F1E4',
  'Discover Product': '#E8E0FF',
  'Local offers (Today`s)': '#FDE0EC',
  'Bacht Wallet': '#FFF0C7',
  'Saving Summery': '#DFF4FF',
  'Bachar Target': '#E5DEFF',
  'Tips & Tricks': '#EAF5FF',
  'My coupons': '#FBE4FF',
  'Saved Stores': '#DFF7EC',
  'Saved Products': '#FFE8E1',
  Password: '#F3E5FF',
  'Edit Profile': '#E7F7D8',
  Notification: '#E8F0FF',
  'Delete account': '#FFE5E5',
};

const sidebarIconTint: Record<string, string> = {
  Overview: '#8E5C00',
  Shop: '#366FE0',
  Delivery: '#2E8B57',
  'Discover Product': '#6C4CCF',
  'Local offers (Today`s)': '#C1487C',
  'Bacht Wallet': '#A16B00',
  'Saving Summery': '#1174A6',
  'Bachar Target': '#6343D8',
  'Tips & Tricks': '#2E6FB8',
  'My coupons': '#A63DBA',
  'Saved Stores': '#2D8B5F',
  'Saved Products': '#C15A42',
  Password: '#8A46CC',
  'Edit Profile': '#5E9631',
  Notification: '#4E73D8',
  'Delete account': '#D84B4B',
};

const sidebarMciIcons: Record<AppIconName, string> = {
  menu: 'menu',
  bell: 'bell-outline',
  search: 'magnify',
  qr: 'qrcode-scan',
  google: 'google',
  apple: 'apple',
  eye: 'eye-outline',
  'eye-off': 'eye-off-outline',
  close: 'close',
  phone: 'phone-outline',
  location: 'map-marker-outline',
  logout: 'logout',
  overview: 'view-dashboard-outline',
  shop: 'store-outline',
  delivery: 'truck-delivery-outline',
  'discover-product': 'package-variant',
  offers: 'tag-multiple-outline',
  wallet: 'wallet-outline',
  'saving-summary': 'chart-line',
  target: 'bullseye-arrow',
  tips: 'lightbulb-on-outline',
  coupons: 'ticket-percent-outline',
  'saved-stores': 'store-marker-outline',
  'saved-products': 'bookmark-box-outline',
  password: 'lock-outline',
  'edit-profile': 'account-edit-outline',
  notification: 'bell-badge-outline',
  'delete-account': 'delete-outline',
  reward: 'gift-outline',
  'nearby-coupons': 'map-marker-radius-outline',
  'scan-save': 'qrcode-scan',
  'invite-earn': 'account-plus-outline',
  'saved-offers': 'bookmark-outline',
  'hot-deals': 'fire',
  jewelry: 'diamond-stone',
  grocery: 'cart-outline',
  food: 'food-outline',
};

const sidebarGroups: SidebarGroup[] = [
  {
    title: 'Home',
    items: [
      { icon: 'overview', label: 'Overview' },
      { icon: 'shop', label: 'Shop' },
      { icon: 'delivery', label: 'Delivery' },
      { icon: 'discover-product', label: 'Discover Product' },
      { icon: 'offers', label: 'Local offers (Today`s)' },
    ],
  },
  {
    title: 'Saving & Tools',
    items: [
      { icon: 'wallet', label: 'Bacht Wallet' },
      { icon: 'saving-summary', label: 'Saving Summery' },
      { icon: 'target', label: 'Bachar Target' },
    ],
  },
  {
    title: 'Utility & Features',
    items: [
      { icon: 'tips', label: 'Tips & Tricks' },
      { icon: 'coupons', label: 'My coupons' },
      { icon: 'saved-stores', label: 'Saved Stores' },
      { icon: 'saved-products', label: 'Saved Products' },
    ],
  },
  {
    title: 'Setting',
    items: [
      { icon: 'password', label: 'Password' },
      { icon: 'edit-profile', label: 'Edit Profile' },
      { icon: 'notification', label: 'Notification' },
      { icon: 'delete-account', label: 'Delete account', tone: 'danger' },
    ],
  },
];

const categoryChips: CategoryChip[] = [
  { id: 'hot-deals', label: 'Hot Deals', icon: 'fire', color: '#E65A24', bg: '#FFF0EB' },
  { id: 'jewelry', label: 'Jewelry', icon: 'diamond-stone', color: '#8A5A00', bg: '#FFF4D8' },
  { id: 'grocery', label: 'Grocery', icon: 'cart-outline', color: '#0F6B4F', bg: '#E9F8EF' },
  { id: 'food', label: 'Food', icon: 'food-fork-drink', color: '#366FE0', bg: '#EEF4FF' },
];

const HomeScreenView = () => {
  const navigation = useNavigation();
  const { authToken, currentUser, clearSession, setSession } = useAppContext();
  const [selectedCategory, setSelectedCategory] = useState('hot-deals');
  const [selectedSidebarItem, setSelectedSidebarItem] = useState('Overview');
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [shopCity, setShopCity] = useState(() => resolveShopCity(undefined, currentUser?.address));
  const [shops, setShops] = useState<ShopWithOffers[]>([]);
  const [isLoadingShops, setIsLoadingShops] = useState(false);
  const [shopsError, setShopsError] = useState<string | null>(null);
  const [isPhoneVisible, setIsPhoneVisible] = useState(false);
  const [profileImageLoadError, setProfileImageLoadError] = useState(false);
  const [headerAddress, setHeaderAddress] = useState(
    currentUser?.address?.trim() ? `Work - ${currentUser.address.trim()}` : 'Work - Fetching location...',
  );

  const quickActions = [
    {
      icon: 'gift-outline',
      label: 'Daily\nRewards',
      bgColor: '#FFF4E5',
      color: '#F2994A',
    },
    {
      icon: 'map-marker-radius-outline',
      label: 'Nearby\nCoupons',
      bgColor: '#F1EAFE',
      color: '#8B5CF6',
    },
    {
      icon: 'qrcode-scan',
      label: 'Scan &\nSave',
      bgColor: '#E7F0FF',
      color: colors.primary,
    },
    {
      icon: 'account-plus-outline',
      label: 'Invite &\nEarn',
      bgColor: '#E7F8EF',
      color: '#27AE60',
    },
    {
      icon: 'bookmark-outline',
      label: 'Saved\nOffers',
      bgColor: '#FFF0EB',
      color: '#E65A24',
    },
  ];

  const userName = useMemo(() => currentUser?.name?.trim() || 'Your name', [currentUser?.name]);
  const sidebarLocation = useMemo(
    () => currentUser?.address?.trim() || 'New Delhi, India',
    [currentUser?.address],
  );
  const isProfileComplete = Boolean(currentUser?.name?.trim() && currentUser?.address?.trim());
  const maskedPhone = useMemo(() => {
    const digits = currentUser?.phone?.replace(/\D/g, '') || '7876876543';
    if (digits.length <= 4) {
      return digits;
    }

    return `${digits.slice(0, 4)}${'*'.repeat(Math.max(0, digits.length - 4))}`;
  }, [currentUser?.phone]);
  const displayPhone = currentUser?.phone ? `+91 ${currentUser.phone}` : '+91 786543567';
  const profileActionLabel = isProfileComplete ? 'Edit Profile' : 'Complete Profile';
  const profileImageUri =
    !profileImageLoadError && currentUser?.profileImage
      ? resolveProfileImageUrl(currentUser.profileImage) ?? ''
      : '';

  useEffect(() => {
    setProfileImageLoadError(false);
  }, [currentUser?.profileImage]);

  useEffect(() => {
    if (!authToken || !currentUser) {
      return;
    }

    let cancelled = false;

    const syncProfile = async () => {
      try {
        const refreshedUser = await userAuthApi.refreshUserProfile(authToken, currentUser);
        if (cancelled) {
          return;
        }

        await setSession(authToken, refreshedUser);
      } catch {
        // Ignore profile sync errors on home.
      }
    };

    syncProfile();

    return () => {
      cancelled = true;
    };
  }, [authToken, currentUser?._id]);

  useEffect(() => {
    if (!shopCity.trim()) {
      return;
    }

    let cancelled = false;

    const loadShops = async () => {
      try {
        setIsLoadingShops(true);
        setShopsError(null);
        const result = await shopApi.fetchShopsWithOffersByCity(shopCity, authToken ?? undefined);

        if (!cancelled) {
          setShops(result);
        }
      } catch (error) {
        if (!cancelled) {
          setShops([]);
          setShopsError(
            error instanceof Error ? error.message : 'Failed to load shops for your city.',
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoadingShops(false);
        }
      }
    };

    loadShops();

    return () => {
      cancelled = true;
    };
  }, [shopCity, authToken]);

  useEffect(() => {
    const requestLocationPermission = async () => {
      if (Platform.OS !== 'android') {
        return true;
      }

      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      );

      return granted === PermissionsAndroid.RESULTS.GRANTED;
    };

    const fallbackAddress = currentUser?.address?.trim()
      ? `Work - ${currentUser.address.trim()}`
      : 'Work - New Delhi, India';
    const profileCity = resolveShopCity(undefined, currentUser?.address);

    const formatAddress = (payload: any) => {
      const address = payload?.address ?? {};
      const pieces = [
        address.house_number ? `${address.house_number} ${address.road ?? ''}`.trim() : address.road,
        address.suburb || address.neighbourhood,
        address.city || address.town || address.village,
      ].filter(Boolean);

      if (!pieces.length) {
        return payload?.display_name
          ? `Work - ${payload.display_name.split(',').slice(0, 2).join(', ')}`
          : fallbackAddress;
      }

      return `Work - ${pieces.slice(0, 2).join(', ')}`;
    };

    const loadCurrentLocation = async () => {
      try {
        const permitted = await requestLocationPermission();
        if (!permitted) {
          setHeaderAddress(fallbackAddress);
          setShopCity(profileCity);
          return;
        }

        Geolocation.getCurrentPosition(
          async position => {
            try {
              const { latitude, longitude } = position.coords;
              console.log('[Location] Current coordinates', { latitude, longitude });

              const reverseGeocodeUrl = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`;
              const reverseGeocodeStartedAt = Date.now();
              const reverseGeocodeHeaders = {
                Accept: 'application/json',
              };

              logApiEvent('GET request', {
                url: reverseGeocodeUrl,
                method: 'GET',
                headers: reverseGeocodeHeaders,
              });

              const response = await fetch(reverseGeocodeUrl, {
                headers: reverseGeocodeHeaders,
              });

              const payload = await response.json();
              logApiEvent(response.ok ? 'GET response' : 'GET error-response', {
                url: reverseGeocodeUrl,
                method: 'GET',
                status: response.status,
                durationMs: Date.now() - reverseGeocodeStartedAt,
                responseBody: payload,
              });
              console.log('[Location] Reverse geocode response', payload);
              setHeaderAddress(formatAddress(payload));
              const geocodeCity = extractCityFromGeocode(payload);
              setShopCity(resolveShopCity(geocodeCity, currentUser?.address));
            } catch (error) {
              logApiEvent('GET network-error', {
                url: 'https://nominatim.openstreetmap.org/reverse',
                method: 'GET',
                error: error instanceof Error ? error.message : String(error),
              });
              setHeaderAddress(fallbackAddress);
              setShopCity(profileCity);
            }
          },
          () => {
            setHeaderAddress(fallbackAddress);
            setShopCity(profileCity);
          },
          {
            enableHighAccuracy: true,
            timeout: 15000,
            maximumAge: 10000,
          },
        );
      } catch {
        setHeaderAddress(fallbackAddress);
        setShopCity(profileCity);
      }
    };

    loadCurrentLocation();
  }, [currentUser?.address]);

  const openProfileSetup = () => {
    setSidebarVisible(false);
    navigation.dispatch(
      CommonActions.navigate({
        name: 'AuthFlow',
        params: {
          screen: 'ProfileSetup',
          params: {
            isNewUser: false,
            source: 'sidebar',
          },
        },
      }),
    );
  };

  const openChangePassword = () => {
    setSidebarVisible(false);
    navigation.dispatch(
      CommonActions.navigate({
        name: 'AuthFlow',
        params: {
          screen: 'Forgot',
          params: {
            flow: 'change-password',
          },
        },
      }),
    );
  };

  const openOfferDetail = (shop: ShopWithOffers, offer: ShopOffer) => {
    const parentNavigation = navigation.getParent<StackNavigationProp<MainStackParamList>>();
    if (parentNavigation) {
      parentNavigation.navigate('OfferDetail', { shop, offer });
      return;
    }

    navigation.navigate('OfferDetail' as never, { shop, offer } as never);
  };

  const openStoreDetail = (shop: ShopWithOffers) => {
    const parentNavigation = navigation.getParent<StackNavigationProp<MainStackParamList>>();
    if (parentNavigation) {
      parentNavigation.navigate('StoreDetail', { shop });
      return;
    }

    navigation.navigate('StoreDetail' as never, { shop } as never);
  };

  const handleLogout = () => {
    showAppAlert('Logout', 'Do you want to logout from this account?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          await clearSession();
          setSidebarVisible(false);
        },
      },
    ]);
  };

  const handleSidebarItemPress = (label: string) => {
    setSelectedSidebarItem(label);

    if (label === 'Edit Profile') {
      openProfileSetup();
      return;
    }

    if (label === 'Password') {
      openChangePassword();
      return;
    }

    if (label === 'Delete account') {
      setSidebarVisible(false);
      showAppAlert(
        'Delete account',
        'Account deletion will be available soon. Contact support if you need help.',
        [{ text: 'OK' }],
      );
      return;
    }

    if (label === 'Overview') {
      setSidebarVisible(false);
      return;
    }

    setSidebarVisible(false);
    showAppAlert('Coming soon', `${label} will be available in an upcoming update.`, [
      { text: 'OK' },
    ]);
  };

  return (
    <View style={styles.container}>
      <View style={styles.bgAccent} />

      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <Navbar
          onMenuPress={() => setSidebarVisible(true)}
          title="Bacht Bazaar"
          subtitle={headerAddress}
          showSearch
        />

        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <AnimatedScreen>
            <View style={styles.promoBannerSection}>
              <View style={styles.promoBanner}>
                <View style={styles.promoBannerGlow} />
                <View style={styles.promoBannerGlowSecondary} />
                <View style={styles.promoBannerCopy}>
                  <View style={styles.promoBannerBadge}>
                    <MaterialCommunityIcons name="fire" size={15} color="#FFE28A" />
                    <Text style={styles.promoBannerBadgeText}>LIMITED TIME</Text>
                  </View>
                  <Text style={styles.promoBannerTitle}>50% OFF</Text>
                  <Text style={styles.promoBannerSubtitle}>Nearby Stores</Text>
                  <View style={styles.promoBannerCountdown}>
                    <MaterialCommunityIcons
                      name="clock-outline"
                      size={15}
                      color={colors.white}
                    />
                    <Text style={styles.promoBannerCountdownText}>02:12:51 remaining</Text>
                  </View>
                </View>

                <View style={styles.promoArtwork}>
                  <View style={[styles.promoGiftBox, styles.promoGiftBoxLarge]}>
                    <MaterialCommunityIcons
                      name="store-outline"
                      size={34}
                      color={DINEOUT_GREEN}
                    />
                  </View>
                  <View style={[styles.promoGiftBox, styles.promoGiftBoxSmall]}>
                    <MaterialCommunityIcons name="gift-outline" size={25} color="#9A6500" />
                  </View>
                  <View style={styles.promoCoin}>
                    <Text style={styles.promoCoinText}>₹</Text>
                  </View>
                </View>
              </View>

              <View style={styles.walletSavingsStrip}>
                <View style={styles.walletSavingsIcon}>
                  <MaterialCommunityIcons
                    name="wallet-outline"
                    size={19}
                    color={colors.primary}
                  />
                </View>
                <Text style={styles.walletSavingsText}>
                  Save extra when you pay with Bachat Wallet
                </Text>
                <MaterialCommunityIcons
                  name="chevron-right"
                  size={20}
                  color={colors.primary}
                />
              </View>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.quickActionsScroll}
              contentContainerStyle={styles.quickActionsContent}
            >
              {quickActions.map(action => (
                <TouchableOpacity
                  key={action.label}
                  style={styles.quickActionItem}
                  activeOpacity={0.82}
                  onPress={() =>
                    showAppAlert(
                      action.label.replace('\n', ' '),
                      'This feature will be available in an upcoming update.',
                      [{ text: 'OK' }],
                    )
                  }
                >
                  <View style={[styles.quickActionCircle, { backgroundColor: action.bgColor }]}>
                    <MaterialCommunityIcons
                      name={action.icon}
                      size={25}
                      color={action.color}
                    />
                  </View>
                  <Text style={styles.quickActionLabel}>{action.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={styles.categoriesSection}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.categoriesScroll}
              contentContainerStyle={styles.categoriesContent}
            >
              {categoryChips.map(chip => {
                const isSelected = selectedCategory === chip.id;

                return (
                  <TouchableOpacity
                    key={chip.id}
                    style={[
                      styles.categoryPill,
                      isSelected && styles.categoryPillSelected,
                      isSelected && { backgroundColor: chip.bg, borderColor: chip.color },
                    ]}
                    activeOpacity={0.82}
                    onPress={() => setSelectedCategory(chip.id)}
                  >
                    <View
                      style={[
                        styles.categoryIconWrap,
                        { backgroundColor: isSelected ? colors.white : chip.bg },
                      ]}
                    >
                      <MaterialCommunityIcons
                        name={chip.icon}
                        size={18}
                        color={chip.color}
                      />
                    </View>
                    <Text
                      style={[
                        styles.categoryPillText,
                        isSelected && styles.categoryPillTextSelected,
                        isSelected && { color: chip.color },
                      ]}
                    >
                      {chip.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            </View>

            <View style={styles.localOffersSection}>
              <View style={styles.localOffersHeader}>
                <View>
                  <Text style={styles.localOffersKicker}>Near {shopCity}</Text>
                  <Text style={styles.localOffersTitle}>Local Offers</Text>
                </View>
                <View style={styles.localOffersHeaderActions}>
                  <TouchableOpacity style={styles.filterOfferButton} activeOpacity={0.78}>
                    <MaterialCommunityIcons
                      name="filter-variant"
                      size={16}
                      color={colors.primary}
                    />
                    <Text style={styles.filterOfferText}>Filter offer</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.viewAllHeaderButton} activeOpacity={0.78}>
                    <Text style={styles.viewAllHeaderText}>View all</Text>
                    <MaterialCommunityIcons name="chevron-right" size={20} color={colors.primary} />
                  </TouchableOpacity>
                </View>
              </View>

              {isLoadingShops ? (
                <View style={styles.shopsLoadingCard}>
                  <ActivityIndicator size="small" color={colors.primary} />
                  <Text style={styles.shopsLoadingText}>Loading nearby shops...</Text>
                </View>
              ) : shopsError ? (
                <View style={styles.shopsEmptyCard}>
                  <MaterialCommunityIcons name="store-off-outline" size={28} color="#99A4B8" />
                  <Text style={styles.shopsEmptyTitle}>Could not load shops</Text>
                  <Text style={styles.shopsEmptyText}>{shopsError}</Text>
                </View>
              ) : shops.length === 0 ? (
                <View style={styles.shopsEmptyCard}>
                  <MaterialCommunityIcons name="store-off-outline" size={28} color="#99A4B8" />
                  <Text style={styles.shopsEmptyTitle}>No shops nearby</Text>
                  <Text style={styles.shopsEmptyText}>Check back soon for local offers.</Text>
                </View>
              ) : (
                shops.map(shop => {
                  const shopLogo = shopApi.resolveImageUrl(shop.logo) ?? PLACEHOLDER_SHOP_LOGO;

                  return (
                    <View key={shop.id} style={styles.localOffersFeatureCard}>
                      <TouchableOpacity
                        style={styles.storeHeader}
                        activeOpacity={0.86}
                        onPress={() => openStoreDetail(shop)}
                      >
                        <View style={styles.storeLogoCircle}>
                          <Image source={{ uri: shopLogo }} style={styles.storeLogo} />
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
                          ) : null}
                        </View>
                        <View style={styles.storeMeta}>
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
                                <MaterialCommunityIcons
                                  name="map-marker"
                                  size={13}
                                  color="#E65A24"
                                />
                                <Text style={styles.distanceText}>{shop.distance}</Text>
                              </>
                            ) : null}
                            {shop.isOpen ? (
                              <View style={styles.openTag}>
                                <Text style={styles.openTagText}>Open</Text>
                              </View>
                            ) : null}
                          </View>
                        </View>
                      </TouchableOpacity>

                      {shop.offers.length > 0 ? (
                        <ScrollView
                          horizontal
                          showsHorizontalScrollIndicator={false}
                          style={styles.offersScroll}
                          contentContainerStyle={styles.offersContent}
                        >
                          {shop.offers.map(offer => {
                            const offerImage =
                              shopApi.resolveImageUrl(offer.image) ?? PLACEHOLDER_OFFER_IMAGE;

                            return (
                              <TouchableOpacity
                                key={offer.id}
                                style={styles.offerCard}
                                activeOpacity={0.88}
                                onPress={() => openOfferDetail(shop, offer)}
                              >
                                <View style={styles.offerImageContainer}>
                                  <Image source={{ uri: offerImage }} style={styles.offerImage} />
                                  {offer.discount ? (
                                    <View style={styles.offerTag}>
                                      <Text style={styles.offerTagTextSmall}>{offer.discount}</Text>
                                    </View>
                                  ) : null}
                                </View>
                                <View style={styles.offerInfo}>
                                  <Text style={styles.cardOfferTitle} numberOfLines={1}>
                                    {offer.title}
                                  </Text>
                                  {offer.subtitle ? (
                                    <Text style={styles.cardOfferSubtitle} numberOfLines={1}>
                                      {offer.subtitle}
                                    </Text>
                                  ) : null}
                                  <Text style={styles.cardCountdown}>
                                    {offer.countdown?.trim() || `${formatOfferCountdown(offer)} remaining`}
                                  </Text>
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
                })
              )}
            </View>
          </AnimatedScreen>
        </ScrollView>
      </SafeAreaView>

      <Modal
        visible={sidebarVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setSidebarVisible(false)}
      >
        <View style={styles.modalRoot}>
          <AnimatedScreen style={styles.sidebarCard}>
            <View style={styles.sidebarHeaderRow}>
              <Text style={styles.sidebarTitle}>Menu</Text>
              <TouchableOpacity
                onPress={() => setSidebarVisible(false)}
                style={styles.sidebarCloseButton}
                accessibilityRole="button"
                accessibilityLabel="Close menu"
              >
                <MaterialCommunityIcons name="close" size={22} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.sidebarScrollContent}
            >
              <View style={styles.sidebarProfileCard}>
                <View style={styles.sidebarProfileSection}>
                  <View style={styles.profileAvatar}>
                    {profileImageUri ? (
                      <Image
                        source={{ uri: profileImageUri }}
                        style={styles.profileAvatarImage}
                        onError={() => setProfileImageLoadError(true)}
                      />
                    ) : (
                      <Text style={styles.profileAvatarText}>{userName.charAt(0).toUpperCase()}</Text>
                    )}
                  </View>
                  <View style={styles.profileInfo}>
                    <Text style={styles.profileName}>{userName}</Text>
                    <Text style={styles.profileLocation}>{sidebarLocation}</Text>
                  </View>
                </View>

                <View style={styles.contactRow}>
                  <View style={styles.contactIconBadge}>
                    <MaterialCommunityIcons name="phone-outline" size={16} color={colors.primary} />
                  </View>
                  <Text style={styles.contactText}>
                    {isPhoneVisible ? displayPhone : `+91 ${maskedPhone}`}
                  </Text>
                  <TouchableOpacity
                    style={styles.contactToggleButton}
                    onPress={() => setIsPhoneVisible(prev => !prev)}
                    accessibilityRole="button"
                    accessibilityLabel={isPhoneVisible ? 'Hide phone number' : 'Show phone number'}
                  >
                    <MaterialCommunityIcons
                      name={isPhoneVisible ? 'eye-outline' : 'eye-off-outline'}
                      size={18}
                      color={colors.primary}
                    />
                  </TouchableOpacity>
                </View>

                <View style={styles.contactRow}>
                  <View style={styles.contactIconBadge}>
                    <MaterialCommunityIcons name="map-marker-outline" size={16} color={colors.primary} />
                  </View>
                  <Text style={styles.contactText}>{sidebarLocation}</Text>
                </View>
              </View>

              <View style={styles.sidebarDivider} />

              <TouchableOpacity style={styles.completeCard} onPress={openProfileSetup}>
                <View style={styles.completeCardIcon}>
                  <MaterialCommunityIcons
                    name={isProfileComplete ? 'account-edit-outline' : 'account-alert-outline'}
                    size={20}
                    color={colors.primary}
                  />
                </View>
                <View style={styles.completeCardContent}>
                  <Text style={styles.completeCardTitle}>
                    {isProfileComplete ? 'Your profile is ready' : 'Your profile is not complete'}
                  </Text>
                  <Text style={styles.completeCardText}>
                    {isProfileComplete ? 'Tap to edit your profile' : 'Please complete profile'}
                  </Text>
                </View>
                <View style={styles.completeCardAction}>
                  <Text style={styles.completeCardActionText}>{profileActionLabel}</Text>
                </View>
              </TouchableOpacity>

              {sidebarGroups.map(group => (
                <View key={group.title} style={styles.sidebarGroup}>
                  <Text style={styles.sidebarGroupTitle}>{group.title}</Text>
                  {group.items.map(item => {
                    const isDanger = item.tone === 'danger';

                    if (item.label === 'Edit Profile' && !isProfileComplete) {
                      return null;
                    }

                    const onPress = () => handleSidebarItemPress(item.label);

                    const isActive = selectedSidebarItem === item.label;

                    return (
                      <TouchableOpacity
                        key={item.label}
                        style={[styles.sidebarItem, isActive && styles.sidebarItemActive]}
                        onPress={onPress}
                        activeOpacity={0.65}
                      >
                        <View
                          style={[
                            styles.sidebarItemIconWrap,
                            {
                              backgroundColor: isActive
                                ? 'rgba(255,255,255,0.22)'
                                : sidebarIconPalette[item.label] ?? '#EEF4FF',
                            },
                          ]}
                        >
                          <MaterialCommunityIcons
                            name={sidebarMciIcons[item.icon]}
                            size={20}
                            color={
                              isActive
                                ? colors.white
                                : sidebarIconTint[item.label] ?? colors.primary
                            }
                          />
                        </View>
                        <Text
                          style={[
                            styles.sidebarItemText,
                            isActive && styles.sidebarItemTextActive,
                            isDanger && styles.sidebarItemTextDanger,
                          ]}
                        >
                          {item.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ))}

              <TouchableOpacity style={styles.logoutRow} onPress={handleLogout} activeOpacity={0.7}>
                <MaterialCommunityIcons name="logout" size={20} color="#E45A5A" />
                <Text style={styles.logoutText}>Log Out</Text>
              </TouchableOpacity>
            </ScrollView>
          </AnimatedScreen>

          <Pressable style={styles.backdrop} onPress={() => setSidebarVisible(false)} />
        </View>
      </Modal>
    </View>
  );
};

export default HomeScreenView;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  safeArea: {
    flex: 1,
    paddingTop: 6,
  },
  bgAccent: {
    position: 'absolute',
    top: -70,
    right: -50,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: colors.primarySoft,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 176,
    paddingTop: 8,
  },
  shopsLoadingCard: {
    marginHorizontal: 16,
    marginBottom: 18,
    backgroundColor: colors.white,
    borderRadius: 22,
    paddingVertical: 28,
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: '#E8EDF5',
  },
  shopsLoadingText: {
    fontSize: 13,
    color: '#667085',
    fontFamily: fonts.BOLD,
  },
  shopsEmptyCard: {
    marginHorizontal: 16,
    marginBottom: 18,
    backgroundColor: colors.white,
    borderRadius: 22,
    paddingVertical: 28,
    paddingHorizontal: 20,
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#E8EDF5',
  },
  shopsEmptyTitle: {
    fontSize: 15,
    color: colors.text,
    fontFamily: fonts.BOLD,
  },
  shopsEmptyText: {
    fontSize: 12,
    color: '#667085',
    textAlign: 'center',
  },
  noOffersText: {
    fontSize: 12,
    color: '#667085',
    fontFamily: fonts.BOLD,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  promoBannerSection: {
    marginHorizontal: 16,
    marginBottom: 18,
  },
  promoBanner: {
    minHeight: 188,
    borderRadius: 25,
    overflow: 'hidden',
    backgroundColor: DINEOUT_GREEN,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 20,
    shadowColor: DINEOUT_GREEN,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.32,
    shadowRadius: 20,
    elevation: 8,
  },
  promoBannerGlow: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    right: -70,
    top: -48,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  promoBannerGlowSecondary: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    left: -40,
    bottom: -50,
    backgroundColor: 'rgba(15,107,79,0.55)',
  },
  promoBannerCopy: {
    flex: 1,
    zIndex: 2,
  },
  promoBannerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 5,
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderRadius: 14,
    paddingHorizontal: 9,
    paddingVertical: 6,
    marginBottom: 8,
  },
  promoBannerBadgeText: {
    color: '#FFE28A',
    fontSize: 10,
    fontFamily: fonts.BOLD,
    letterSpacing: 1.2,
  },
  promoBannerTitle: {
    color: colors.white,
    fontSize: 38,
    lineHeight: 42,
    fontFamily: fonts.BOLD,
    letterSpacing: -1.4,
  },
  promoBannerSubtitle: {
    color: 'rgba(255,255,255,0.86)',
    fontSize: 18,
    fontFamily: fonts.BOLD,
    marginTop: 2,
  },
  promoBannerCountdown: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.28)',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 16,
    marginTop: 12,
  },
  promoBannerCountdownText: {
    color: colors.white,
    fontSize: 11,
    fontFamily: fonts.BOLD,
  },
  promoArtwork: {
    width: 126,
    height: 142,
    alignItems: 'center',
    justifyContent: 'center',
  },
  promoGiftBox: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.52)',
  },
  promoGiftBoxLarge: {
    width: 78,
    height: 92,
    right: 4,
    bottom: 8,
    backgroundColor: '#E7FFF3',
    transform: [{ rotate: '5deg' }],
  },
  promoGiftBoxSmall: {
    width: 58,
    height: 67,
    left: 3,
    bottom: 2,
    backgroundColor: '#FFE5A6',
    transform: [{ rotate: '-8deg' }],
  },
  promoCoin: {
    position: 'absolute',
    top: 6,
    right: 26,
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#D7A44E',
    borderWidth: 3,
    borderColor: '#F6D990',
    alignItems: 'center',
    justifyContent: 'center',
  },
  promoCoinText: {
    color: '#513B0D',
    fontSize: 21,
    fontFamily: fonts.BOLD,
  },
  walletSavingsStrip: {
    marginTop: 10,
    minHeight: 52,
    borderRadius: 18,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  walletSavingsIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySoft,
  },
  walletSavingsText: {
    flex: 1,
    color: colors.text,
    fontSize: 12,
    fontFamily: fonts.BOLD,
  },
  countdownHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 6,
  },
  countdownLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  countdownLabel: {
    fontSize: 12,
    color: colors.text,
    fontFamily: fonts.BOLD,
  },
  countdownTime: {
    fontSize: 12,
    color: colors.primary,
    fontFamily: fonts.BOLD,
  },
  banner: {
    marginHorizontal: 16,
    borderRadius: 14,
    padding: 18,
    minHeight: 122,
    marginBottom: 16,
    overflow: 'hidden',
  },
  bannerGradientFallback: {
    backgroundColor: colors.primary,
  },
  bannerContent: {
    flex: 1,
  },
  bannerTextSection: {
    marginBottom: 10,
  },
  bannerTitle: {
    fontSize: 28,
    fontFamily: fonts.BOLD,
    color: colors.white,
  },
  bannerSubtitle: {
    fontSize: 15,
    color: colors.white,
    opacity: 0.95,
    marginTop: 4,
    fontFamily: fonts.BOLD,
  },
  bannerCountdown: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(0,0,0,0.3)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 18,
    gap: 6,
  },
  bannerCountdownText: {
    fontSize: 12,
    color: colors.white,
    fontFamily: fonts.BOLD,
  },
  bannerDecorations: {
    position: 'absolute',
    right: 20,
    top: 20,
  },
  giftBox: {
    width: 32,
    height: 32,
    borderRadius: 7,
    opacity: 0.9,
  },
  quickActionsScroll: {
    marginBottom: 14,
  },
  quickActionsContent: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 4,
    gap: 10,
  },
  quickActionItem: {
    alignItems: 'center',
    width: 76,
    backgroundColor: colors.white,
    borderRadius: 18,
    paddingTop: 10,
    paddingBottom: 9,
    borderWidth: 1,
    borderColor: '#E9EDF5',
    shadowColor: '#1B2430',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  quickActionCircle: {
    width: 46,
    height: 46,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  quickActionLabel: {
    fontSize: 11,
    color: colors.text,
    textAlign: 'center',
    fontFamily: fonts.BOLD,
    marginTop: 4,
    lineHeight: 13,
  },
  categoriesSection: {
    marginBottom: 18,
    paddingBottom: 4,
  },
  categoriesScroll: {
    flexGrow: 0,
  },
  categoriesContent: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 10,
    gap: 10,
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#E7ECF5',
    backgroundColor: colors.white,
    gap: 8,
    shadowColor: '#1B2430',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  categoryIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryPillSelected: {
    borderWidth: 1.5,
  },
  categoryPillText: {
    fontSize: 12,
    color: colors.darkGray,
    fontFamily: fonts.BOLD,
  },
  categoryPillTextSelected: {
    color: colors.primary,
  },
  localOffersSection: {
    paddingHorizontal: 16,
    marginTop: 6,
  },
  localOffersHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
    gap: 10,
  },
  localOffersHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
  },
  filterOfferButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.white,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
  },
  filterOfferText: {
    fontSize: 11,
    color: colors.primary,
    fontFamily: fonts.BOLD,
  },
  localOffersTitle: {
    fontSize: 24,
    fontFamily: fonts.BOLD,
    color: colors.text,
    letterSpacing: -0.5,
  },
  localOffersKicker: {
    fontSize: 12,
    color: DINEOUT_GREEN_LIGHT,
    fontFamily: fonts.BOLD,
    marginBottom: 2,
  },
  viewAllHeaderButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    paddingLeft: 12,
    paddingRight: 8,
    paddingVertical: 8,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
  },
  viewAllHeaderText: {
    fontSize: 12,
    color: colors.primary,
    fontFamily: fonts.BOLD,
  },
  featuredStoreCard: {
    backgroundColor: colors.white,
    borderRadius: 22,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E7ECF5',
    marginBottom: 16,
    shadowColor: '#1B2430',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 5,
  },
  localOffersFeatureCard: {
    backgroundColor: colors.white,
    borderRadius: 22,
    paddingTop: 16,
    paddingBottom: 16,
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
  localOfferGlowTop: {
    position: 'absolute',
    top: -54,
    right: -28,
    width: 152,
    height: 152,
    borderRadius: 76,
    backgroundColor: 'rgba(15,107,79,0.1)',
  },
  localOfferGlowBottom: {
    position: 'absolute',
    bottom: -76,
    left: 36,
    width: 190,
    height: 110,
    borderRadius: 55,
    backgroundColor: 'rgba(15,107,79,0.06)',
  },
  localOfferCoinSmall: {
    position: 'absolute',
    top: 84,
    right: 86,
    width: 25,
    height: 25,
    borderRadius: 13,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.36,
    shadowRadius: 16,
    elevation: 6,
  },
  localOfferCoinText: {
    color: colors.white,
    fontSize: 13,
    fontFamily: fonts.BOLD,
  },
  featureHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    marginBottom: 18,
    gap: 12,
  },
  featureCopy: {
    flex: 1,
  },
  featureTitle: {
    color: colors.text,
    fontSize: 24,
    fontFamily: fonts.BOLD,
    letterSpacing: -0.6,
  },
  featureTitleStrike: {
    color: colors.lighterGray,
    textDecorationLine: 'line-through',
  },
  featureSubtitle: {
    color: colors.lightGray,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: fonts.BOLD,
    marginTop: 8,
  },
  comparePill: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
  },
  comparePillText: {
    color: colors.primary,
    fontSize: 10,
    fontFamily: fonts.BOLD,
    marginBottom: 4,
  },
  localStoresScroll: {
    marginTop: 2,
  },
  localStoresContent: {
    paddingLeft: 14,
    paddingRight: 20,
    gap: 14,
  },
  localStoreCard: {
    width: LOCAL_OFFER_CARD_WIDTH,
    backgroundColor: colors.white,
    borderRadius: 22,
    overflow: 'hidden',
    borderWidth: 1,
    shadowColor: '#1D4F91',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.14,
    shadowRadius: 18,
    elevation: 8,
  },
  localStoreImageWrap: {
    height: 164,
    position: 'relative',
    overflow: 'hidden',
  },
  localStoreImage: {
    width: '100%',
    height: '100%',
  },
  cashbackBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  cashbackBadgeText: {
    fontSize: 12,
    fontFamily: fonts.BOLD,
  },
  favoriteBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(15,23,42,0.24)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  storeThemeRibbon: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 5,
  },
  localStoreBody: {
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 12,
  },
  localStoreNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  localStoreName: {
    flex: 1,
    color: colors.text,
    fontSize: 19,
    fontFamily: fonts.BOLD,
    letterSpacing: -0.3,
  },
  localRatingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 14,
  },
  localRatingText: {
    color: colors.white,
    fontSize: 13,
    fontFamily: fonts.BOLD,
  },
  localStoreArea: {
    color: colors.lighterGray,
    fontSize: 13,
    fontFamily: fonts.BOLD,
    marginTop: 6,
  },
  localStoreCategory: {
    color: colors.lightGray,
    fontSize: 13,
    fontFamily: fonts.BOLD,
    marginTop: 4,
  },
  localOfferStrip: {
    marginTop: 12,
    paddingTop: 11,
    borderTopWidth: 1,
    borderTopColor: '#EEF1F6',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  localOfferStripLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  localOfferStripText: {
    flex: 1,
    color: colors.text,
    fontSize: 12,
    fontFamily: fonts.BOLD,
  },
  localOfferCount: {
    fontSize: 12,
    fontFamily: fonts.BOLD,
  },
  localOffersViewAll: {
    alignSelf: 'center',
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: DINEOUT_GREEN_LIGHT,
    borderRadius: 18,
    paddingVertical: 11,
    paddingHorizontal: 18,
    shadowColor: DINEOUT_GREEN,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 4,
  },
  localOffersViewAllText: {
    color: colors.white,
    fontSize: 15,
    fontFamily: fonts.BOLD,
  },
  sponsoredSection: {
    marginTop: 24,
    marginBottom: 46,
  },
  sponsoredHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sponsoredTitle: {
    color: colors.text,
    fontSize: 22,
    fontFamily: fonts.BOLD,
    letterSpacing: -0.4,
  },
  sponsoredViewAll: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sponsoredViewAllText: {
    color: '#E65A24',
    fontSize: 14,
    fontFamily: fonts.BOLD,
  },
  sponsoredContent: {
    gap: 14,
    paddingRight: 18,
    paddingBottom: 24,
  },
  sponsoredCard: {
    width: LOCAL_OFFER_CARD_WIDTH - 34,
    backgroundColor: colors.white,
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E7ECF5',
    shadowColor: '#1B2430',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
    marginBottom: 8,
  },
  sponsoredImage: {
    width: '100%',
    height: 112,
  },
  sponsoredBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    borderRadius: 15,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  sponsoredBadgeText: {
    fontSize: 11,
    fontFamily: fonts.BOLD,
  },
  sponsoredHeart: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(15,23,42,0.24)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sponsoredBody: {
    padding: 12,
  },
  sponsoredStoreName: {
    color: colors.text,
    fontSize: 15,
    fontFamily: fonts.BOLD,
  },
  sponsoredMeta: {
    color: colors.lightGray,
    fontSize: 12,
    fontFamily: fonts.BOLD,
    marginTop: 4,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  filterText: {
    fontSize: 12,
    color: colors.lighterGray,
    marginRight: 4,
    fontFamily: fonts.BOLD,
  },
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  controlsLabel: {
    fontSize: 14,
    color: colors.text,
    fontFamily: fonts.BOLD,
  },
  storeCard: {
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  storeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    paddingHorizontal: 14,
  },
  storeLogoCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    overflow: 'hidden',
    marginRight: 12,
    borderWidth: 2,
    borderColor: '#E7ECF5',
  },
  storeLogo: {
    width: '100%',
    height: '100%',
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
  offersScroll: {
    marginTop: 2,
  },
  offersContent: {
    gap: 10,
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
  offerTagTextSmall: {
    fontSize: 10,
    color: '#8C7400',
    fontFamily: fonts.BOLD,
  },
  offerCountdownBadge: {
    position: 'absolute',
    right: 8,
    bottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(255,255,255,0.92)',
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 8,
  },
  offerCountdownBadgeText: {
    fontSize: 9,
    color: DINEOUT_GREEN,
    fontFamily: fonts.BOLD,
  },
  offerInfo: {
    padding: 9,
  },
  cardOfferTitle: {
    fontSize: 12,
    color: colors.text,
    fontFamily: fonts.BOLD,
  },
  cardOfferSubtitle: {
    fontSize: 10,
    color: colors.lightGray,
    fontFamily: fonts.BOLD,
    marginTop: 2,
  },
  cardCountdown: {
    fontSize: 10,
    color: '#E31C5F',
    fontFamily: fonts.BOLD,
    marginTop: 6,
  },
  modalRoot: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.38)',
    flexDirection: 'row',
  },
  sidebarCard: {
    width: width * 0.82,
    maxWidth: 340,
    backgroundColor: colors.white,
    marginTop: 0,
    marginBottom: 0,
    marginLeft: 0,
    borderTopRightRadius: 28,
    borderBottomRightRadius: 28,
    borderTopLeftRadius: 0,
    borderBottomLeftRadius: 0,
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 8, height: 0 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 16,
    overflow: 'hidden',
  },
  sidebarPatternTop: {
    position: 'absolute',
    top: 44,
    right: 14,
    width: 82,
    height: 82,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(54,111,224,0.14)',
  },
  sidebarPatternBottom: {
    position: 'absolute',
    bottom: 96,
    left: -18,
    width: 92,
    height: 92,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(54,111,224,0.14)',
  },
  backdrop: {
    flex: 1,
  },
  sidebarScrollContent: {
    paddingBottom: 20,
  },
  sidebarHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EEF2F8',
  },
  sidebarTitle: {
    fontSize: 18,
    color: colors.text,
    fontFamily: fonts.BOLD,
    letterSpacing: -0.3,
  },
  sidebarCloseButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F4F7FC',
  },
  sidebarProfileCard: {
    backgroundColor: 'rgba(255,255,255,0.72)',
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: 'rgba(54,111,224,0.12)',
    marginBottom: 10,
  },
  sidebarProfileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  profileAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFD9DC',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    borderWidth: 2,
    borderColor: colors.white,
  },
  profileAvatarText: {
    fontSize: 18,
    color: '#A94B57',
    fontFamily: fonts.BOLD,
  },
  profileAvatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 24,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 14,
    color: colors.text,
    fontFamily: fonts.BOLD,
  },
  profileLocation: {
    fontSize: 11,
    color: colors.lighterGray,
    fontFamily: fonts.BOLD,
    marginTop: 2,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 7,
    minHeight: 32,
  },
  contactIconBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#EEF4FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactText: {
    fontSize: 11,
    color: colors.text,
    fontFamily: fonts.BOLD,
    flex: 1,
  },
  contactToggleButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#EEF4FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sidebarDivider: {
    height: 1,
    backgroundColor: 'rgba(54,111,224,0.14)',
    marginVertical: 14,
  },
  completeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F4F8FF',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
  },
  completeCardIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  completeCardContent: {
    flex: 1,
  },
  completeCardTitle: {
    fontSize: 12,
    color: colors.text,
    fontFamily: fonts.BOLD,
  },
  completeCardText: {
    fontSize: 11,
    color: colors.primary,
    fontFamily: fonts.BOLD,
    marginTop: 2,
  },
  completeCardAction: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: colors.primary,
  },
  completeCardActionText: {
    fontSize: 11,
    color: colors.white,
    fontFamily: fonts.BOLD,
  },
  sidebarGroup: {
    marginBottom: 14,
  },
  sidebarGroupTitle: {
    fontSize: 11,
    color: colors.lighterGray,
    fontFamily: fonts.BOLD,
    marginBottom: 9,
    marginLeft: 2,
  },
  sidebarItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 48,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    marginBottom: 4,
  },
  sidebarItemActive: {
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  sidebarItemIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sidebarItemText: {
    fontSize: 13,
    color: colors.text,
    fontFamily: fonts.BOLD,
    flex: 1,
  },
  sidebarItemTextActive: {
    color: colors.white,
  },
  sidebarItemTextDanger: {
    color: '#E45A5A',
  },
  logoutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 9,
    paddingVertical: 9,
    marginTop: 8,
  },
  logoutText: {
    fontSize: 12,
    color: '#E45A5A',
    fontFamily: fonts.BOLD,
  },
});
