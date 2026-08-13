import {
  Dimensions,
  Image,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { CommonActions, useFocusEffect, useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import AnimatedScreen from '../../../../components/AnimatedScreen';
import { AppIconName } from '../../../../components/AppIcon';
import Navbar from '../../../../components/navbar';
import { resolveProfileImageUrl } from '../../../../config/api';
import { colors, fonts } from '../../../../helpers/styles';
import { useAppContext } from '../../../../context/AppContext';
import { userAuthApi } from '../../../../services/userAuthApi';
import { showAppAlert } from '../../../../services/appAlert';
import { logApiEvent } from '../../../../services/apiClient';
import { ShopOffer, ShopProduct, ShopWithOffers } from '../../../../types/shop';
import { SearchResults } from '../../../../types/search';
import { MainStackParamList } from '../../../../navigation/types';
import { resetToAuthLogin } from '../../../../navigation/navigationService';
import { shopApi } from '../../../../services/shopApi';
import { mergeRedemptionHistoryIntoCalendar } from '../../../../services/dailyRewardsParser';
import { offerWishlistApi } from '../../../../services/offerWishlistApi';
import { shopWishlistApi } from '../../../../services/shopWishlistApi';
import { categoryApi } from '../../../../services/categoryApi';
import { Category } from '../../../../types/category';
import { OfferBanner } from '../../../../types/offerBanner';
import { geocodeAddress, GeoCoordinates, resolveShopCity } from '../../../../utils/location';
import { reverseGeocodeWithGoogle } from '../../../../utils/googleGeocoding';
import { getCurrentDeviceCoordinates, requestLocationPermission } from '../../../../utils/deviceLocation';
import OfferCountdownText from '../../../../components/OfferCountdownText';
import PromoBannerCarousel from '../../../../components/PromoBannerCarousel';
import DailyRewardsSheet from '../../../../components/DailyRewardsSheet';
import FeatureWalkthrough, {
  WalkthroughTargetRect,
} from '../../../../components/FeatureWalkthrough';
import { featureWalkthroughStorage } from '../../../../services/featureWalkthroughStorage';
import { DailyCalendarDay, DailyRewardEntry, DailyRewardsCalendar } from '../../../../types/dailyRewards';

const { width } = Dimensions.get('window');
const CARD_WIDTH = Math.min((width - 48) / 3 - 4, 118);
const LOCAL_OFFER_CARD_WIDTH = Math.min(width * 0.74, 292);
const DINEOUT_GREEN = '#004B36';
const DINEOUT_GREEN_LIGHT = '#0F6B4F';
const HEART_RED = '#E11D48';

type SidebarItem = {
  icon: AppIconName;
  label: string;
  tone?: 'danger';
};

type SidebarGroup = {
  title: string;
  items: SidebarItem[];
};

type QuickActionId =
  | 'daily-rewards'
  | 'nearby-coupons'
  | 'scan-save'
  | 'invite-earn'
  | 'saved-offers';

type CategoryChip = {
  id: string;
  label: string;
  icon: string;
  color: string;
  bg: string;
  image?: string;
};

const CATEGORY_CHIP_PALETTE = [
  { color: '#E65A24', bg: '#FFF0EB' },
  { color: '#8A5A00', bg: '#FFF4D8' },
  { color: '#0F6B4F', bg: '#E9F8EF' },
  { color: '#366FE0', bg: '#EEF4FF' },
  { color: '#8B5CF6', bg: '#F1EAFE' },
  { color: '#D84B4B', bg: '#FFF0F0' },
];

const ALL_CATEGORY_CHIP: CategoryChip = {
  id: 'all',
  label: 'All',
  icon: 'view-grid-outline',
  color: '#366FE0',
  bg: '#EEF4FF',
};

const MAX_VISIBLE_CATEGORY_CHIPS = 5;

const PLACEHOLDER_SHOP_LOGO =
  'https://images.pexels.com/photos/248077/pexels-photo-248077.jpeg?auto=compress&cs=tinysrgb&dpr=1&w=200';

const PLACEHOLDER_OFFER_IMAGE =
  'https://images.pexels.com/photos/1191531/pexels-photo-1191531.jpeg?auto=compress&cs=tinysrgb&dpr=1&w=400';

const formatApiDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const EMPTY_SEARCH_RESULTS: SearchResults = {
  query: '',
  totalShopsFound: 0,
  totalProductsFound: 0,
  totalServicesFound: 0,
  shops: [],
  products: [],
  services: [],
  offers: [],
};

const sidebarIconPalette: Record<string, string> = {
  Overview: '#F7DCA8',
  Shop: '#D9E8FF',
  Delivery: '#D8F1E4',
  'Discover Product': '#E8E0FF',
  'Local offers (Today)': '#FDE0EC',
  'Bacht Wallet': '#FFF0C7',
  'Saving Summary': '#DFF4FF',
  'Bachat Target': '#E5DEFF',
  'Tips & Tricks': '#EAF5FF',
  'My coupons': '#FBE4FF',
  'My QR': '#E8EDFF',
  'Saved Stores': '#DFF7EC',
  'Saved Products': '#FFE8E1',
  Password: '#F3E5FF',
  'Edit Profile': '#E7F7D8',
  Notification: '#E8F0FF',
  Language: '#E8F7F4',
  'Delete account': '#FFE5E5',
  'Create request': '#E0F2FE',
  'Privacy Policy': '#E8EEFF',
  'Terms & Conditions': '#EAF5FF',
  FAQ: '#E8F1FF',
  'Video Guide': '#FFE8F0',
  'Help Articles': '#F3E8FF',
  'Help & Support': '#E8F1FF',
  Contact: '#EAF8F0',
};

const sidebarIconTint: Record<string, string> = {
  Overview: '#8E5C00',
  Shop: '#366FE0',
  Delivery: '#2E8B57',
  'Discover Product': '#6C4CCF',
  'Local offers (Today)': '#C1487C',
  'Bacht Wallet': '#A16B00',
  'Saving Summary': '#1174A6',
  'Bachat Target': '#6343D8',
  'Tips & Tricks': '#2E6FB8',
  'My coupons': '#A63DBA',
  'My QR': '#366FE0',
  'Saved Stores': '#2D8B5F',
  'Saved Products': '#C15A42',
  Password: '#8A46CC',
  'Edit Profile': '#5E9631',
  Notification: '#4E73D8',
  Language: '#1F8A70',
  'Delete account': '#D84B4B',
  'Create request': '#0284C7',
  'Privacy Policy': '#3F5BD8',
  'Terms & Conditions': '#2E6FB8',
  FAQ: '#366FE0',
  'Video Guide': '#C1487C',
  'Help Articles': '#7C3AED',
  'Help & Support': '#366FE0',
  Contact: '#2D8B5F',
};

const sidebarMciIcons: Record<AppIconName, string> = {
  menu: 'menu',
  bell: 'bell-outline',
  search: 'magnify',
  qr: 'qrcode',
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
  'create-request': 'handshake-outline',
  reward: 'gift-outline',
  'nearby-coupons': 'map-marker-radius-outline',
  'scan-save': 'qrcode-scan',
  'invite-earn': 'account-plus-outline',
  'saved-offers': 'bookmark-outline',
  'hot-deals': 'fire',
  jewelry: 'diamond-stone',
  grocery: 'cart-outline',
  food: 'food-outline',
  'privacy-policy': 'shield-lock-outline',
  'terms-conditions': 'file-document-outline',
  'help-support': 'headset',
  faq: 'help-circle-outline',
  'video-guide': 'play-circle-outline',
  'help-articles': 'book-open-page-variant-outline',
  contact: 'email-outline',
  language: 'translate',
};

const sidebarGroups: SidebarGroup[] = [
  {
    title: 'Home',
    items: [
      { icon: 'overview', label: 'Overview' },
      { icon: 'create-request', label: 'Create request' },
      { icon: 'shop', label: 'Shop' },
      { icon: 'delivery', label: 'Delivery' },
      { icon: 'discover-product', label: 'Discover Product' },
      { icon: 'offers', label: 'Local offers (Today)' },
    ],
  },
  {
    title: 'Saving & Tools',
    items: [
      { icon: 'wallet', label: 'Bacht Wallet' },
      { icon: 'saving-summary', label: 'Saving Summary' },
      { icon: 'target', label: 'Bachat Target' },
    ],
  },
  {
    title: 'Utility & Features',
    items: [
      { icon: 'tips', label: 'Tips & Tricks' },
      { icon: 'coupons', label: 'My coupons' },
      { icon: 'qr', label: 'My QR' },
      { icon: 'saved-offers', label: 'Saved Offers' },
      { icon: 'saved-stores', label: 'Saved Stores' },
      { icon: 'saved-products', label: 'Saved Products' },
    ],
  },
  {
    title: 'Help Center',
    items: [
      { icon: 'faq', label: 'FAQ' },
      { icon: 'video-guide', label: 'Video Guide' },
      { icon: 'help-support', label: 'Help & Support' },
      { icon: 'contact', label: 'Contact' },
    ],
  },
  {
    title: 'Legal',
    items: [
      { icon: 'privacy-policy', label: 'Privacy Policy' },
      { icon: 'terms-conditions', label: 'Terms & Conditions' },
    ],
  },
  {
    title: 'Setting',
    items: [
      { icon: 'language', label: 'Language' },
      { icon: 'password', label: 'Password' },
      { icon: 'edit-profile', label: 'Edit Profile' },
      { icon: 'notification', label: 'Notification' },
      { icon: 'delete-account', label: 'Delete account', tone: 'danger' },
    ],
  },
];

const HomeScreenView = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { authToken, currentUser, clearSession, setSession } = useAppContext();
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(false);
  const [offerBanners, setOfferBanners] = useState<OfferBanner[]>([]);
  const [isLoadingBanners, setIsLoadingBanners] = useState(false);
  const [categoriesModalVisible, setCategoriesModalVisible] = useState(false);
  const [selectedSidebarItem, setSelectedSidebarItem] = useState('Overview');
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [shops, setShops] = useState<ShopWithOffers[]>([]);
  const [isLoadingShops, setIsLoadingShops] = useState(false);
  const [shopsError, setShopsError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSearchQuery, setActiveSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResults>(EMPTY_SEARCH_RESULTS);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [isPhoneVisible, setIsPhoneVisible] = useState(false);
  const [profileImageLoadError, setProfileImageLoadError] = useState(false);
  const [dailyRewardsVisible, setDailyRewardsVisible] = useState(false);
  const [selectedDailyRewardDate, setSelectedDailyRewardDate] = useState(formatApiDate(new Date()));
  const [dailyRewards, setDailyRewards] = useState<DailyRewardsCalendar | null>(null);
  const [dailyRewardsByDate, setDailyRewardsByDate] = useState<Record<string, DailyRewardsCalendar>>({});
  const [isLoadingDailyRewards, setIsLoadingDailyRewards] = useState(false);
  const [dailyRewardsError, setDailyRewardsError] = useState<string | null>(null);
  const [savedShopIds, setSavedShopIds] = useState<Record<string, true>>({});
  const [savedOfferIds, setSavedOfferIds] = useState<Record<string, true>>({});
  const [togglingShopId, setTogglingShopId] = useState<string | null>(null);
  const [togglingOfferId, setTogglingOfferId] = useState<string | null>(null);
  const [headerAddress, setHeaderAddress] = useState(
    currentUser?.address?.trim() ? `Work - ${currentUser.address.trim()}` : 'Work - Fetching location...',
  );
  const [deviceCoordinates, setDeviceCoordinates] = useState<GeoCoordinates | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [featureWalkthroughVisible, setFeatureWalkthroughVisible] = useState(false);
  const [walkthroughTargets, setWalkthroughTargets] = useState<
    Partial<Record<string, WalkthroughTargetRect | null>>
  >({});
  const bannerFetchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bannerRequestIdRef = useRef(0);
  const searchRequestIdRef = useRef(0);
  const lastCreateRequestPromptQueryRef = useRef<string | null>(null);
  const authTokenRef = useRef(authToken);
  const walkthroughCheckedRef = useRef(false);
  const homeScrollRef = useRef<ScrollView>(null);
  const walkthroughHeaderRef = useRef<View>(null);
  const walkthroughMenuRef = useRef<View>(null);
  const walkthroughSearchRef = useRef<View>(null);
  const walkthroughCartRef = useRef<View>(null);
  const walkthroughCategoriesRef = useRef<View>(null);
  const walkthroughOffersRef = useRef<View>(null);
  const walkthroughRewardsRef = useRef<View>(null);

  useEffect(() => {
    authTokenRef.current = authToken;
  }, [authToken]);

  const measureWalkthroughTargets = useCallback(() => {
    // Offers wrapper is header + first-card region; clamp runaway lists.
    const maxHeightById: Record<string, number> = {
      offers: 340,
      categories: 130,
      welcome: 80,
    };

    const measure = (ref: React.RefObject<View | null>, id: string) => {
      const node = ref.current;
      if (!node || typeof node.measureInWindow !== 'function') {
        setWalkthroughTargets(prev => ({ ...prev, [id]: null }));
        return;
      }
      node.measureInWindow((x, y, width, height) => {
        if (width > 8 && height > 8) {
          const maxH = maxHeightById[id];
          // Offers wrapper is the section header; extend hole over first shop cards below.
          let nextHeight = id === 'offers' ? height + 250 : height;
          if (maxH) {
            nextHeight = Math.min(nextHeight, maxH);
          }
          setWalkthroughTargets(prev => ({
            ...prev,
            [id]: {
              x,
              y,
              width,
              height: nextHeight,
            },
          }));
        } else {
          setWalkthroughTargets(prev => ({ ...prev, [id]: null }));
        }
      });
    };

    measure(walkthroughHeaderRef, 'welcome');
    measure(walkthroughSearchRef, 'search');
    measure(walkthroughCategoriesRef, 'categories');
    measure(walkthroughOffersRef, 'offers');
    measure(walkthroughCartRef, 'cart');
    measure(walkthroughRewardsRef, 'rewards');
    measure(walkthroughMenuRef, 'menu');
  }, []);

  /** Double rAF after layout/scroll so measureInWindow sees settled frames. */
  const scheduleWalkthroughMeasure = useCallback(() => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        measureWalkthroughTargets();
      });
    });
  }, [measureWalkthroughTargets]);

  const handleWalkthroughStepChange = useCallback(
    (stepId: string) => {
      const afterScrollSettle = (delayMs: number) => {
        setTimeout(() => {
          scheduleWalkthroughMeasure();
          // Second pass once scroll inertia / layout finish.
          setTimeout(scheduleWalkthroughMeasure, 90);
        }, delayMs);
      };

      // Local offers sit lower — nudge scroll so the spotlight can land on it.
      if (stepId === 'offers' || stepId === 'categories') {
        homeScrollRef.current?.scrollTo({
          y: stepId === 'offers' ? 240 : 140,
          animated: true,
        });
        afterScrollSettle(360);
        return;
      }
      if (
        stepId === 'welcome' ||
        stepId === 'search' ||
        stepId === 'menu' ||
        stepId === 'cart' ||
        stepId === 'rewards'
      ) {
        homeScrollRef.current?.scrollTo({ y: 0, animated: true });
        afterScrollSettle(320);
        return;
      }
      scheduleWalkthroughMeasure();
    },
    [scheduleWalkthroughMeasure],
  );

  // First-time Home feature guide — only after login / main stack Home is visible.
  useEffect(() => {
    if (!authToken?.trim() || walkthroughCheckedRef.current) {
      return;
    }
    walkthroughCheckedRef.current = true;
    let cancelled = false;
    const timer = setTimeout(() => {
      (async () => {
        try {
          // One-shot for coach-mark deploy so the guide reappears after install.
          await featureWalkthroughStorage.ensureForcedOnceForVersion();
          const done = await featureWalkthroughStorage.isDone();
          if (!cancelled && !done) {
            setFeatureWalkthroughVisible(true);
          }
        } catch {
          if (!cancelled) {
            setFeatureWalkthroughVisible(true);
          }
        }
      })();
    }, 450);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [authToken]);

  useEffect(() => {
    if (!featureWalkthroughVisible) {
      return;
    }
    const t1 = setTimeout(scheduleWalkthroughMeasure, 80);
    const t2 = setTimeout(scheduleWalkthroughMeasure, 380);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [featureWalkthroughVisible, scheduleWalkthroughMeasure]);

  const handleFeatureWalkthroughComplete = useCallback(async () => {
    setFeatureWalkthroughVisible(false);
    await featureWalkthroughStorage.markDone();
  }, []);

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
      loadWishlistIds();
    }, [loadWishlistIds]),
  );

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
      } catch (error) {
        showAppAlert(
          isSaved ? 'Could not remove store' : 'Could not save store',
          error instanceof Error ? error.message : 'Please try again.',
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
      } catch (error) {
        showAppAlert(
          isSaved ? 'Could not remove offer' : 'Could not save offer',
          error instanceof Error ? error.message : 'Please try again.',
        );
      } finally {
        setTogglingOfferId(null);
      }
    },
    [authToken, savedOfferIds],
  );

  const quickActions = [
    {
      id: 'daily-rewards' as const,
      icon: 'gift-outline',
      label: 'Daily\nRewards',
      bgColor: '#FFF4E5',
      color: '#F2994A',
    },
    {
      id: 'nearby-coupons' as const,
      icon: 'map-marker-radius-outline',
      label: 'Nearby\nCoupons',
      bgColor: '#F1EAFE',
      color: '#8B5CF6',
    },
    {
      id: 'scan-save' as const,
      icon: 'qrcode-scan',
      label: 'Scan &\nSave',
      bgColor: '#E7F0FF',
      color: colors.primary,
    },
    {
      id: 'invite-earn' as const,
      icon: 'account-plus-outline',
      label: 'Invite &\nEarn',
      bgColor: '#E7F8EF',
      color: '#27AE60',
    },
    {
      id: 'saved-offers' as const,
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

  const loadDailyRewards = useCallback(async (date: string) => {
    try {
      setIsLoadingDailyRewards(true);
      setDailyRewardsError(null);
      const token = authTokenRef.current ?? undefined;
      const todayKey = formatApiDate(new Date());
      // List source: calender API only. History is status-only (never invents cards).
      const calendar = await shopApi.fetchDailyRewardsCalendar(date, token);

      if (!calendar.entries.length) {
        setDailyRewards(calendar);
        setDailyRewardsByDate(prev => ({
          ...prev,
          [date]: calendar,
        }));
        return;
      }

      // Past selected day → Expire via merge; skip history fetch (not needed for that label).
      const isPastSelectedDate = date < todayKey;
      const redemptionHistory =
        !isPastSelectedDate && token
          ? await shopApi.fetchOfferRedemptionHistory(token).catch(() => [])
          : [];

      // Hearts stay on isWishlisted; history sets Claimed/Redeem/Available when not expired.
      const result = mergeRedemptionHistoryIntoCalendar(
        calendar,
        redemptionHistory,
        todayKey,
      );

      setDailyRewards(result);
      setDailyRewardsByDate(prev => ({
        ...prev,
        [date]: result,
      }));
    } catch (error) {
      setDailyRewards(null);
      setDailyRewardsError(
        error instanceof Error ? error.message : 'Failed to load daily rewards.',
      );
    } finally {
      setIsLoadingDailyRewards(false);
    }
  }, []);

  const updateDailyRewardWishlist = useCallback(
    (offerId: string, isWishlisted: boolean) => {
      const patchEntries = (entries: DailyRewardEntry[]) =>
        entries.map(entry => {
          const id = entry.offerId?.trim() || entry.id.trim();
          return id === offerId ? { ...entry, isWishlisted } : entry;
        });

      setDailyRewards(prev =>
        prev ? { ...prev, entries: patchEntries(prev.entries) } : prev,
      );
      setDailyRewardsByDate(prev => {
        const next: Record<string, DailyRewardsCalendar> = {};
        Object.entries(prev).forEach(([key, calendar]) => {
          next[key] = { ...calendar, entries: patchEntries(calendar.entries) };
        });
        return next;
      });
      setSavedOfferIds(prev => {
        if (isWishlisted) {
          return { ...prev, [offerId]: true };
        }
        const next = { ...prev };
        delete next[offerId];
        return next;
      });
    },
    [],
  );

  const handleToggleDailyRewardWishlist = useCallback(
    async (reward: DailyRewardEntry) => {
      const token = authTokenRef.current?.trim();
      const offerId = reward.offerId?.trim() || reward.id.trim();
      if (!token || !offerId) {
        showAppAlert('Login required', 'Please log in again to save offers.');
        return;
      }

      const isSaved = Boolean(reward.isWishlisted);
      try {
        setTogglingOfferId(offerId);
        if (isSaved) {
          await offerWishlistApi.removeFromWishlist(offerId, token);
          updateDailyRewardWishlist(offerId, false);
        } else {
          await offerWishlistApi.addToWishlist(offerId, token);
          updateDailyRewardWishlist(offerId, true);
        }
      } catch (error) {
        showAppAlert(
          isSaved ? 'Could not remove offer' : 'Could not save offer',
          error instanceof Error ? error.message : 'Please try again.',
        );
      } finally {
        setTogglingOfferId(null);
      }
    },
    [updateDailyRewardWishlist],
  );

  const handleClaimDailyReward = useCallback(
    async (reward: DailyRewardEntry) => {
      const token = authTokenRef.current?.trim();
      if (!token) {
        throw new Error('Please log in again to claim this reward.');
      }

      const offerId = reward.offerId?.trim() || reward.id.trim();
      if (!offerId) {
        throw new Error('Offer id is missing for this reward.');
      }

      const response = await shopApi.redeemUserOffer(offerId, token);
      await loadDailyRewards(selectedDailyRewardDate);

      return response.message || 'Your reward has been claimed successfully.';
    },
    [loadDailyRewards, selectedDailyRewardDate],
  );

  const openOfferRedemptionHistory = useCallback(() => {
    const parentNavigation = navigation.getParent<StackNavigationProp<MainStackParamList>>();
    if (parentNavigation) {
      parentNavigation.navigate('OfferRedemptionHistory');
      return;
    }

    (navigation as StackNavigationProp<MainStackParamList>).navigate('OfferRedemptionHistory');
  }, [navigation]);

  const openScannerScreen = useCallback(() => {
    const parentNavigation = navigation.getParent<StackNavigationProp<MainStackParamList>>();
    if (parentNavigation) {
      parentNavigation.navigate('ScannerScreen');
      return;
    }

    (navigation as StackNavigationProp<MainStackParamList>).navigate('ScannerScreen');
  }, [navigation]);

  const openMyQrScreen = useCallback(() => {
    const parentNavigation = navigation.getParent<StackNavigationProp<MainStackParamList>>();
    if (parentNavigation) {
      parentNavigation.navigate('MyQrScreen');
      return;
    }

    (navigation as StackNavigationProp<MainStackParamList>).navigate('MyQrScreen');
  }, [navigation]);

  const openSavedScreen = useCallback(
    (initialTab: 'offers' | 'shops' | 'products' = 'offers') => {
      const params = { initialTab };
      const parentNavigation = navigation.getParent<StackNavigationProp<MainStackParamList>>();
      if (parentNavigation) {
        parentNavigation.navigate('SavedOffers', params);
        return;
      }

      (navigation as StackNavigationProp<MainStackParamList>).navigate('SavedOffers', params);
    },
    [navigation],
  );

  const openSavedOffers = useCallback(() => {
    openSavedScreen('offers');
  }, [openSavedScreen]);

  const openCart = useCallback(() => {
    const parentNavigation = navigation.getParent<StackNavigationProp<MainStackParamList>>();
    if (parentNavigation) {
      parentNavigation.navigate('Cart');
      return;
    }

    (navigation as StackNavigationProp<MainStackParamList>).navigate('Cart');
  }, [navigation]);

  const openDeliveryOrders = useCallback(() => {
    const parentNavigation = navigation.getParent<StackNavigationProp<MainStackParamList>>();
    if (parentNavigation) {
      parentNavigation.navigate('DeliveryOrders');
      return;
    }

    (navigation as StackNavigationProp<MainStackParamList>).navigate('DeliveryOrders');
  }, [navigation]);

  const openLegalWebScreen = useCallback(
    (title: string, url: string) => {
      const parentNavigation =
        navigation.getParent<StackNavigationProp<MainStackParamList>>();
      if (parentNavigation) {
        parentNavigation.navigate('LegalWebScreen', { title, url });
        return;
      }

      (navigation as StackNavigationProp<MainStackParamList>).navigate('LegalWebScreen', {
        title,
        url,
      });
    },
    [navigation],
  );

  const openHelpSupport = useCallback(() => {
    const parentNavigation =
      navigation.getParent<StackNavigationProp<MainStackParamList>>();
    if (parentNavigation) {
      parentNavigation.navigate('HelpSupport');
      return;
    }

    (navigation as StackNavigationProp<MainStackParamList>).navigate('HelpSupport');
  }, [navigation]);

  const openFaq = useCallback(() => {
    const parentNavigation =
      navigation.getParent<StackNavigationProp<MainStackParamList>>();
    if (parentNavigation) {
      parentNavigation.navigate('FAQ');
      return;
    }

    (navigation as StackNavigationProp<MainStackParamList>).navigate('FAQ');
  }, [navigation]);

  const openVideoGuide = useCallback(() => {
    const parentNavigation =
      navigation.getParent<StackNavigationProp<MainStackParamList>>();
    if (parentNavigation) {
      parentNavigation.navigate('VideoGuide');
      return;
    }

    (navigation as StackNavigationProp<MainStackParamList>).navigate('VideoGuide');
  }, [navigation]);

  const openContact = useCallback(() => {
    const parentNavigation =
      navigation.getParent<StackNavigationProp<MainStackParamList>>();
    if (parentNavigation) {
      parentNavigation.navigate('Contact');
      return;
    }

    (navigation as StackNavigationProp<MainStackParamList>).navigate('Contact');
  }, [navigation]);

  const openHelpArticles = useCallback(() => {
    const parentNavigation =
      navigation.getParent<StackNavigationProp<MainStackParamList>>();
    if (parentNavigation) {
      parentNavigation.navigate('HelpArticles');
      return;
    }

    (navigation as StackNavigationProp<MainStackParamList>).navigate(
      'HelpArticles',
    );
  }, [navigation]);

  const openLanguage = useCallback(() => {
    const parentNavigation =
      navigation.getParent<StackNavigationProp<MainStackParamList>>();
    if (parentNavigation) {
      parentNavigation.navigate('Language');
      return;
    }

    (navigation as StackNavigationProp<MainStackParamList>).navigate('Language');
  }, [navigation]);

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

  const loadShops = useCallback(async () => {
    const isAllCategory = selectedCategory === 'all';

    if (isAllCategory && !deviceCoordinates) {
      return;
    }

    try {
      setIsLoadingShops(true);
      setShopsError(null);
      const result = await shopApi.fetchHomeShops(
        selectedCategory,
        authTokenRef.current ?? undefined,
        deviceCoordinates,
      );
      setShops(result);
    } catch (error) {
      setShops([]);
      setShopsError(
        error instanceof Error ? error.message : 'Failed to load nearby shops.',
      );
    } finally {
      setIsLoadingShops(false);
    }
  }, [deviceCoordinates, selectedCategory]);

  useEffect(() => {
    void loadShops();
  }, [loadShops, authToken]);

  const runSearch = useCallback(async (query: string) => {
    const trimmed = query.trim();
    const requestId = ++searchRequestIdRef.current;

    if (!trimmed) {
      setSearchResults(EMPTY_SEARCH_RESULTS);
      setSearchError(null);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    setSearchError(null);
    // Clear stale results so the "not available" dialog cannot fire against old empty state.
    setSearchResults({ ...EMPTY_SEARCH_RESULTS, query: trimmed });

    try {
      const result = await shopApi.searchShopsProductsAndOffers(
        trimmed,
        authTokenRef.current ?? undefined,
      );

      if (searchRequestIdRef.current !== requestId) {
        return;
      }

      setSearchResults({
        ...result,
        query: result.query?.trim() || trimmed,
      });
    } catch (error) {
      if (searchRequestIdRef.current !== requestId) {
        return;
      }

      setSearchResults({ ...EMPTY_SEARCH_RESULTS, query: trimmed });
      setSearchError(error instanceof Error ? error.message : 'Search failed. Please try again.');
    } finally {
      if (searchRequestIdRef.current === requestId) {
        setIsSearching(false);
      }
    }
  }, []);

  useEffect(() => {
    void runSearch(activeSearchQuery);
  }, [activeSearchQuery, runSearch]);

  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value);

    // Clear results as soon as the field is emptied.
    if (!value.trim()) {
      setActiveSearchQuery('');
      setIsSearching(false);
      return;
    }

    // Search when the user finishes a word (types a trailing space).
    if (/\s$/.test(value)) {
      const wordQuery = value.trim();
      if (wordQuery) {
        setIsSearching(true);
        setActiveSearchQuery(wordQuery);
      }
    }
  }, []);

  const handleSearchSubmit = useCallback(() => {
    const wordQuery = searchQuery.trim();
    setSearchQuery(wordQuery);
    if (wordQuery) {
      setIsSearching(true);
    }
    setActiveSearchQuery(wordQuery);
  }, [searchQuery]);

  const handleClearSearch = useCallback(() => {
    setSearchQuery('');
    setActiveSearchQuery('');
    lastCreateRequestPromptQueryRef.current = '';
  }, []);

  const loadCategories = useCallback(async () => {
    try {
      setIsLoadingCategories(true);
      const result = await categoryApi.fetchCategories(authTokenRef.current ?? undefined);
      setCategories(result);
    } catch {
      setCategories([]);
    } finally {
      setIsLoadingCategories(false);
    }
  }, []);

  useEffect(() => {
    void loadCategories();
  }, [loadCategories, authToken]);

  const loadBanners = useCallback(async () => {
    const requestId = ++bannerRequestIdRef.current;

    try {
      setIsLoadingBanners(true);
      const result = await shopApi.fetchHomeBanners(
        selectedCategory,
        authTokenRef.current ?? undefined,
      );

      if (bannerRequestIdRef.current !== requestId) {
        return;
      }

      setOfferBanners(result);
    } catch {
      if (bannerRequestIdRef.current !== requestId) {
        return;
      }

      setOfferBanners([]);
    } finally {
      if (bannerRequestIdRef.current === requestId) {
        setIsLoadingBanners(false);
      }
    }
  }, [selectedCategory]);

  const categoryChips = useMemo<CategoryChip[]>(() => {
    const apiChips = categories.map((category, index) => {
      const palette = CATEGORY_CHIP_PALETTE[index % CATEGORY_CHIP_PALETTE.length];

      return {
        id: category.id,
        label: category.label,
        icon: category.type === 'service' ? 'hand-heart-outline' : 'tag-outline',
        color: palette.color,
        bg: palette.bg,
        image: categoryApi.resolveImageUrl(category.image),
      };
    });

    return [ALL_CATEGORY_CHIP, ...apiChips];
  }, [categories]);

  const visibleCategoryChips = useMemo(
    () => categoryChips.slice(0, MAX_VISIBLE_CATEGORY_CHIPS),
    [categoryChips],
  );

  const hasMoreCategories = categoryChips.length > MAX_VISIBLE_CATEGORY_CHIPS;
  const isSearchActive = activeSearchQuery.trim().length > 0;
  const displayedShops = isSearchActive ? searchResults.shops : shops;
  const normalizedActiveQuery = activeSearchQuery.trim().toLowerCase();
  const resultsMatchActiveQuery =
    !normalizedActiveQuery ||
    searchResults.query.trim().toLowerCase() === normalizedActiveQuery;
  const hasSearchHits =
    searchResults.products.length > 0 ||
    searchResults.services.length > 0 ||
    searchResults.offers.length > 0 ||
    searchResults.shops.length > 0 ||
    searchResults.totalProductsFound > 0 ||
    searchResults.totalServicesFound > 0 ||
    searchResults.totalShopsFound > 0;
  const searchResultCount =
    searchResults.products.length +
    searchResults.services.length +
    searchResults.offers.length +
    searchResults.shops.length;

  const openCreateRequest = useCallback(
    (initialProduct?: string) => {
      setSidebarVisible(false);
      const parentNavigation = navigation.getParent<StackNavigationProp<MainStackParamList>>();
      parentNavigation?.navigate('CreateRequestForm', {
        initialProduct: initialProduct?.trim() || undefined,
      });
    },
    [navigation],
  );

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const query = activeSearchQuery.trim();
      if (query) {
        await runSearch(query);
        return;
      }

      const tasks: Promise<unknown>[] = [
        loadCategories(),
        loadBanners(),
        loadShops(),
        loadWishlistIds(),
      ];

      if (dailyRewardsVisible) {
        tasks.push(loadDailyRewards(selectedDailyRewardDate));
      }

      await Promise.all(tasks);
    } finally {
      setIsRefreshing(false);
    }
  }, [
    activeSearchQuery,
    dailyRewardsVisible,
    loadBanners,
    loadCategories,
    loadDailyRewards,
    loadShops,
    loadWishlistIds,
    runSearch,
    selectedDailyRewardDate,
  ]);

  useEffect(() => {
    if (!isSearchActive || isSearching || searchError) {
      return;
    }

    const query = activeSearchQuery.trim();
    // Wait until this query's response is applied — avoid racing an empty previous state.
    if (!query || !resultsMatchActiveQuery || hasSearchHits) {
      return;
    }

    if (lastCreateRequestPromptQueryRef.current === query) {
      return;
    }

    lastCreateRequestPromptQueryRef.current = query;
    showAppAlert(
      'Product not available',
      `"${query}" was not found nearby. Would you like to create a request for it?`,
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes',
          onPress: () => openCreateRequest(query),
        },
      ],
    );
  }, [
    isSearchActive,
    isSearching,
    openCreateRequest,
    searchError,
    activeSearchQuery,
    hasSearchHits,
    resultsMatchActiveQuery,
  ]);

  useEffect(() => {
    if (bannerFetchTimerRef.current) {
      clearTimeout(bannerFetchTimerRef.current);
    }

    bannerFetchTimerRef.current = setTimeout(() => {
      void loadBanners();
    }, 200);

    return () => {
      if (bannerFetchTimerRef.current) {
        clearTimeout(bannerFetchTimerRef.current);
      }
    };
  }, [loadBanners]);

  useEffect(() => {
    if (!dailyRewardsVisible) {
      return;
    }

    // Always refresh so claim/redeem status stays current when reopening.
    loadDailyRewards(selectedDailyRewardDate);
  }, [dailyRewardsVisible, selectedDailyRewardDate, loadDailyRewards]);

  useEffect(() => {
    const fallbackAddress = currentUser?.address?.trim()
      ? `Work - ${currentUser.address.trim()}`
      : 'Work - New Delhi, India';
    const profileCity = resolveShopCity(undefined, currentUser?.address);

    const formatAddress = (address?: string, city?: string) => {
      if (city?.trim()) {
        return `Work - ${city.trim()}`;
      }

      if (address?.trim()) {
        return `Work - ${address.split(',').slice(0, 2).join(', ')}`;
      }

      return fallbackAddress;
    };

    const applyFallbackLocation = async () => {
      setHeaderAddress(fallbackAddress);

      const geocoded = await geocodeAddress(profileCity);
      if (geocoded) {
        setDeviceCoordinates(geocoded);
      }
    };

    const loadCurrentLocation = async () => {
      try {
        const permitted = await requestLocationPermission();
        const coordinates = await getCurrentDeviceCoordinates();

        if (coordinates) {
          setDeviceCoordinates(coordinates);
          console.log('[Location] Current coordinates', coordinates);

          try {
            const { latitude, longitude } = coordinates;
            const reverseGeocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=***`;
            const reverseGeocodeStartedAt = Date.now();

            logApiEvent('GET request', {
              url: reverseGeocodeUrl,
              method: 'GET',
            });

            const result = await reverseGeocodeWithGoogle(latitude, longitude);
            logApiEvent(result.address || result.city ? 'GET response' : 'GET error-response', {
              url: reverseGeocodeUrl,
              method: 'GET',
              durationMs: Date.now() - reverseGeocodeStartedAt,
              responseBody: result,
            });
            console.log('[Location] Reverse geocode response', result);
            setHeaderAddress(formatAddress(result.address, result.city));
          } catch (error) {
            logApiEvent('GET network-error', {
              url: 'https://maps.googleapis.com/maps/api/geocode/json',
              method: 'GET',
              error: error instanceof Error ? error.message : String(error),
            });
            setHeaderAddress(fallbackAddress);
          }

          return;
        }

        if (!permitted) {
          await applyFallbackLocation();
          return;
        }

        await applyFallbackLocation();
      } catch {
        await applyFallbackLocation();
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

    (navigation as any).navigate('OfferDetail', { shop, offer });
  };

  const openStoreDetail = (shop: ShopWithOffers) => {
    const parentNavigation = navigation.getParent<StackNavigationProp<MainStackParamList>>();
    if (parentNavigation) {
      parentNavigation.navigate('StoreDetail', { shop });
      return;
    }

    (navigation as any).navigate('StoreDetail', { shop });
  };

  const openSearchProduct = useCallback(
    async (product: ShopProduct) => {
      const parentNavigation = navigation.getParent<StackNavigationProp<MainStackParamList>>();
      const navigateToProduct = (shop: ShopWithOffers) => {
        if (parentNavigation) {
          parentNavigation.navigate('ProductDetail', { shop, product });
          return;
        }
        (navigation as any).navigate('ProductDetail', { shop, product });
      };

      let shop: ShopWithOffers = {
        id: product.shopId || 'unknown-shop',
        name: product.shopName || 'Partner store',
        offers: [],
        products: [product],
      };

      if (product.shopId?.trim() && authToken?.trim()) {
        try {
          shop = await shopApi.fetchShopByIdWithOffers(product.shopId, authToken);
        } catch {
          // Keep minimal shop payload.
        }
      }

      navigateToProduct(shop);
    },
    [authToken, navigation],
  );

  const handleLogout = () => {
    showAppAlert('Logout', 'Do you want to logout from this account?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Yes',
        style: 'destructive',
        onPress: async () => {
          try {
            if (authToken) {
              await userAuthApi.logout(authToken);
            }

            await clearSession();
            setSidebarVisible(false);
            resetToAuthLogin();
          } catch (error) {
            showAppAlert(
              'Logout failed',
              error instanceof Error ? error.message : 'Could not logout. Please try again.',
              [{ text: 'OK' }],
            );
          }
        },
      },
    ]);
  };

  const handleDeleteAccount = () => {
    showAppAlert(
      'Delete account',
      'Are you sure you want to delete your account? This action cannot be undone.',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, delete',
          style: 'destructive',
          onPress: async () => {
            if (!authToken) {
              showAppAlert('Delete failed', 'You are not logged in.', [{ text: 'OK' }]);
              return;
            }

            try {
              await userAuthApi.deleteAccount(authToken);
              await clearSession();
              setSidebarVisible(false);
              resetToAuthLogin();
            } catch (error) {
              showAppAlert(
                'Delete failed',
                error instanceof Error ? error.message : 'Could not delete your account. Please try again.',
                [{ text: 'OK' }],
              );
            }
          },
        },
      ],
    );
  };

  const handleSidebarItemPress = (label: string) => {
    setSelectedSidebarItem(label);

    if (label === 'Create request') {
      openCreateRequest();
      return;
    }

    if (label === 'My QR') {
      setSidebarVisible(false);
      openMyQrScreen();
      return;
    }

    if (label === 'Saved Offers') {
      setSidebarVisible(false);
      openSavedScreen('offers');
      return;
    }

    if (label === 'Saved Stores') {
      setSidebarVisible(false);
      openSavedScreen('shops');
      return;
    }

    if (label === 'Saved Products') {
      setSidebarVisible(false);
      openSavedScreen('products');
      return;
    }

    if (label === 'Delivery') {
      setSidebarVisible(false);
      openDeliveryOrders();
      return;
    }

    if (label === 'Privacy Policy') {
      setSidebarVisible(false);
      openLegalWebScreen(
        'Privacy Policy',
        'https://bachatbazaar.tech/legal/privacy-policy',
      );
      return;
    }

    if (label === 'Terms & Conditions') {
      setSidebarVisible(false);
      openLegalWebScreen(
        'Terms & Conditions',
        'https://bachatbazaar.tech/legal/terms-and-condition',
      );
      return;
    }

    if (label === 'FAQ') {
      setSidebarVisible(false);
      openFaq();
      return;
    }

    if (label === 'Video Guide') {
      setSidebarVisible(false);
      openVideoGuide();
      return;
    }

    if (label === 'Help Articles') {
      setSidebarVisible(false);
      openHelpArticles();
      return;
    }

    if (label === 'Help & Support') {
      setSidebarVisible(false);
      openHelpSupport();
      return;
    }

    if (label === 'Contact') {
      setSidebarVisible(false);
      openContact();
      return;
    }

    if (label === 'Language') {
      setSidebarVisible(false);
      openLanguage();
      return;
    }

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
      handleDeleteAccount();
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

  const handleCategorySelect = (categoryId: string) => {
    setSelectedCategory(categoryId);
    setCategoriesModalVisible(false);
  };

  const handleQuickActionPress = (actionId: QuickActionId, label: string) => {
    if (actionId === 'daily-rewards') {
      const today = formatApiDate(new Date());
      setSelectedDailyRewardDate(today);
      setDailyRewards(dailyRewardsByDate[today] ?? null);
      setDailyRewardsError(null);
      setDailyRewardsVisible(true);
      return;
    }

    if (actionId === 'scan-save') {
      openScannerScreen();
      return;
    }

    if (actionId === 'saved-offers') {
      openSavedOffers();
      return;
    }

    showAppAlert(label.replace('\n', ' '), 'This feature will be available in an upcoming update.', [
      { text: 'OK' },
    ]);
  };

  const handleDailyRewardDateSelect = (date: string) => {
    setSelectedDailyRewardDate(date);
    const cachedRewards = dailyRewardsByDate[date];
    if (cachedRewards) {
      setDailyRewards(cachedRewards);
      setDailyRewardsError(null);
      return;
    }

    setDailyRewards(null);
    setDailyRewardsError(null);
  };

  const rewardPreviewByDate = useMemo(
    () =>
      Object.values(dailyRewardsByDate).reduce<Record<string, string | undefined>>((acc, calendar) => {
        calendar.calendarDays?.forEach(day => {
          if (day.image) {
            acc[day.date] = day.image;
          }
        });
        calendar.entries.forEach(entry => {
          if (entry.image) {
            acc[entry.date] = entry.image;
          }
        });
        return acc;
      }, {}),
    [dailyRewardsByDate],
  );

  const mergedCalendarDays = useMemo(() => {
    const dayMap = new Map<string, DailyCalendarDay>();

    Object.values(dailyRewardsByDate).forEach(calendar => {
      calendar.calendarDays?.forEach(day => {
        dayMap.set(day.date, day);
      });
    });

    dailyRewards?.calendarDays?.forEach(day => {
      dayMap.set(day.date, day);
    });

    return Array.from(dayMap.values()).sort((left, right) => left.date.localeCompare(right.date));
  }, [dailyRewards, dailyRewardsByDate]);

  const renderCategoryChip = (chip: CategoryChip) => {
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
        onPress={() => handleCategorySelect(chip.id)}
      >
        <View
          style={[
            styles.categoryIconWrap,
            { backgroundColor: isSelected ? colors.white : chip.bg },
          ]}
        >
          {chip.image ? (
            <Image source={{ uri: chip.image }} style={styles.categoryChipImage} />
          ) : (
            <MaterialCommunityIcons name={chip.icon} size={15} color={chip.color} />
          )}
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
  };

  const renderSearchItem = (
    item: SearchResults['products'][number],
    type: 'product' | 'service',
  ) => {
    const imageUri = shopApi.resolveImageUrl(item.image) ?? PLACEHOLDER_OFFER_IMAGE;

    return (
      <TouchableOpacity
        key={`${type}-${item.id}`}
        style={styles.searchResultCard}
        activeOpacity={0.88}
        onPress={() => {
          if (type === 'product') {
            void openSearchProduct(item);
          }
        }}>
        <View style={styles.searchResultImageWrap}>
          <Image source={{ uri: imageUri }} style={styles.searchResultImage} resizeMode="cover" />
          {item.isFeatured ? (
            <View style={styles.searchFeaturedBadge}>
              <Text style={styles.searchFeaturedText}>Featured</Text>
            </View>
          ) : null}
        </View>
        <View style={styles.searchResultBody}>
          <View style={styles.searchResultTypeRow}>
            <MaterialCommunityIcons
              name={type === 'service' ? 'hand-heart-outline' : 'package-variant-closed'}
              size={13}
              color={colors.primary}
            />
            <Text style={styles.searchResultTypeText}>
              {type === 'service' ? 'Service' : 'Product'}
            </Text>
          </View>
          <Text style={styles.searchResultTitle} numberOfLines={2}>
            {item.title}
          </Text>
          {item.shopName ? (
            <Text style={styles.searchShopName} numberOfLines={1}>
              {item.shopName}
            </Text>
          ) : null}
          <View style={styles.searchPriceRow}>
            {item.price ? <Text style={styles.searchPrice}>{item.price}</Text> : null}
            {item.originalPrice ? (
              <Text style={styles.searchOriginalPrice}>{item.originalPrice}</Text>
            ) : null}
          </View>
          {item.stock != null ? (
            <Text style={styles.searchStockText}>Stock: {item.stock}</Text>
          ) : null}
        </View>
        <MaterialCommunityIcons
          name="chevron-right"
          size={20}
          color="#98A2B3"
          style={styles.searchResultChevron}
        />
      </TouchableOpacity>
    );
  };

  const renderSearchShopRow = (shop: ShopWithOffers) => {
    const shopLogo = shopApi.resolveImageUrl(shop.logo) ?? PLACEHOLDER_SHOP_LOGO;

    return (
      <TouchableOpacity
        key={`search-shop-${shop.id}`}
        style={styles.searchShopRow}
        activeOpacity={0.88}
        onPress={() => openStoreDetail(shop)}>
        <View style={styles.searchShopLogoWrap}>
          <Image source={{ uri: shopLogo }} style={styles.searchShopLogo} resizeMode="cover" />
        </View>
        <View style={styles.searchShopBody}>
          <Text style={styles.searchResultTitle} numberOfLines={1}>
            {shop.name}
          </Text>
          {shop.address || shop.tagline ? (
            <Text style={styles.searchShopMeta} numberOfLines={1}>
              {shop.tagline || shop.address}
            </Text>
          ) : null}
        </View>
        <MaterialCommunityIcons name="chevron-right" size={20} color="#98A2B3" />
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.bgAccent} />

      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <Navbar
          onMenuPress={() => setSidebarVisible(true)}
          onScannerPress={openScannerScreen}
          onCartPress={openCart}
          title="Bacht Bazaar"
          subtitle={headerAddress}
          showSearch
          searchValue={searchQuery}
          onSearchChange={handleSearchChange}
          onSearchSubmit={handleSearchSubmit}
          onClearSearch={handleClearSearch}
          headerRef={walkthroughHeaderRef}
          menuRef={walkthroughMenuRef}
          headerActionsRef={walkthroughCartRef}
          searchRef={walkthroughSearchRef}
        />

        <ScrollView
          ref={homeScrollRef}
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          nestedScrollEnabled
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: Math.max(insets.bottom, 12) + 40 },
          ]}
        >
          <AnimatedScreen>
            <PromoBannerCarousel
              banners={offerBanners}
              isLoading={isLoadingBanners}
              resolveImageUrl={shopApi.resolveImageUrl}
            />

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.quickActionsScroll}
              contentContainerStyle={styles.quickActionsContent}
            >
              {quickActions.map(action => {
                const isRewards = action.id === 'daily-rewards';
                return (
                  <View
                    key={action.label}
                    ref={isRewards ? walkthroughRewardsRef : undefined}
                    collapsable={isRewards ? false : undefined}
                    style={isRewards ? styles.walkthroughRewardsWrap : undefined}
                  >
                    <TouchableOpacity
                      style={styles.quickActionItem}
                      activeOpacity={0.82}
                      onPress={() => handleQuickActionPress(action.id, action.label)}
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
                  </View>
                );
              })}
            </ScrollView>

            <View style={styles.categoriesSection}>
              <View style={styles.categoriesHeaderRow}>
                <Text style={styles.categoriesTitle}>Categories</Text>
                {hasMoreCategories ? (
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => setCategoriesModalVisible(true)}
                  >
                    <Text style={styles.viewAllCategoriesText}>View all</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
              {/* Categories step: chips row only */}
              <View
                ref={walkthroughCategoriesRef}
                collapsable={false}
                style={styles.walkthroughCategoriesWrap}
                onLayout={() => {
                  if (featureWalkthroughVisible) {
                    scheduleWalkthroughMeasure();
                  }
                }}
              >
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.categoriesScroll}
                  contentContainerStyle={styles.categoriesContent}
                >
                  {visibleCategoryChips.map(renderCategoryChip)}
                  {isLoadingCategories && categoryChips.length <= 1 ? (
                    <View style={styles.categoryLoadingPill}>
                      <ActivityIndicator size="small" color={colors.primary} />
                    </View>
                  ) : null}
                </ScrollView>
              </View>
            </View>

            <View style={styles.localOffersSection}>
              {/* Offers step: header + first-card region (extra shops stay outside) */}
              <View
                ref={walkthroughOffersRef}
                collapsable={false}
                style={styles.walkthroughOffersWrap}
                onLayout={() => {
                  if (featureWalkthroughVisible) {
                    scheduleWalkthroughMeasure();
                  }
                }}
              >
              <View style={styles.localOffersHeader}>
                <View style={styles.localOffersTitleWrap}>
                  <Text style={styles.localOffersTitle}>
                    {isSearchActive ? 'Search Results' : 'Local Offers'}
                  </Text>
                  {isSearchActive ? (
                    <Text style={styles.searchSummaryText}>
                      {searchResultCount > 0
                        ? `${searchResultCount} result${searchResultCount === 1 ? '' : 's'} for "${activeSearchQuery.trim()}"`
                        : `Showing results for "${activeSearchQuery.trim()}"`}
                    </Text>
                  ) : null}
                </View>
                {!isSearchActive ? (
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
                ) : null}
              </View>
              </View>

              {isSearchActive && isSearching ? (
                <View style={styles.shopsLoadingCard}>
                  <ActivityIndicator size="small" color={colors.primary} />
                  <Text style={styles.shopsLoadingText}>Searching...</Text>
                </View>
              ) : isSearchActive && searchError ? (
                <View style={styles.shopsEmptyCard}>
                  <MaterialCommunityIcons name="magnify-close" size={28} color="#99A4B8" />
                  <Text style={styles.shopsEmptyTitle}>Search failed</Text>
                  <Text style={styles.shopsEmptyText}>{searchError}</Text>
                </View>
              ) : !isSearchActive && isLoadingShops ? (
                <View style={styles.shopsLoadingCard}>
                  <ActivityIndicator size="small" color={colors.primary} />
                  <Text style={styles.shopsLoadingText}>Loading nearby shops...</Text>
                </View>
              ) : !isSearchActive && shopsError ? (
                <View style={styles.shopsEmptyCard}>
                  <MaterialCommunityIcons name="store-off-outline" size={28} color="#99A4B8" />
                  <Text style={styles.shopsEmptyTitle}>Could not load shops</Text>
                  <Text style={styles.shopsEmptyText}>{shopsError}</Text>
                </View>
              ) : isSearchActive && !hasSearchHits ? (
                <View style={styles.shopsEmptyCard}>
                  <MaterialCommunityIcons name="magnify-close" size={28} color="#99A4B8" />
                  <Text style={styles.shopsEmptyTitle}>No results found</Text>
                  <Text style={styles.shopsEmptyText}>
                    "{activeSearchQuery.trim()}" is not available nearby. Want to create a request for it?
                  </Text>
                  <TouchableOpacity
                    style={styles.createRequestEmptyBtn}
                    activeOpacity={0.88}
                    onPress={() => openCreateRequest(activeSearchQuery.trim())}>
                    <MaterialCommunityIcons name="plus-circle-outline" size={16} color={colors.white} />
                    <Text style={styles.createRequestEmptyBtnText}>Create request</Text>
                  </TouchableOpacity>
                </View>
              ) : !isSearchActive && shops.length === 0 ? (
                <View style={styles.shopsEmptyCard}>
                  <MaterialCommunityIcons name="store-off-outline" size={28} color="#99A4B8" />
                  <Text style={styles.shopsEmptyTitle}>No shops nearby</Text>
                  <Text style={styles.shopsEmptyText}>Check back soon for local offers.</Text>
                </View>
              ) : isSearchActive ? (
                <>
                  {searchResults.products.length > 0 ? (
                    <View style={styles.searchSection}>
                      <Text style={styles.searchSectionTitle}>
                        Products ({searchResults.products.length})
                      </Text>
                      {searchResults.products.map(item => renderSearchItem(item, 'product'))}
                    </View>
                  ) : null}

                  {searchResults.services.length > 0 ? (
                    <View style={styles.searchSection}>
                      <Text style={styles.searchSectionTitle}>
                        Services ({searchResults.services.length})
                      </Text>
                      {searchResults.services.map(item => renderSearchItem(item, 'service'))}
                    </View>
                  ) : null}

                  {searchResults.offers.length > 0 ? (
                    <View style={styles.searchSection}>
                      <Text style={styles.searchSectionTitle}>
                        Offers ({searchResults.offers.length})
                      </Text>
                      {searchResults.offers.map(offer => {
                        const offerImage =
                          shopApi.resolveImageUrl(offer.image) ?? PLACEHOLDER_OFFER_IMAGE;
                        const matchingShop =
                          searchResults.shops.find(shop => shop.id === offer.shopId) ??
                          ({
                            id: offer.shopId || 'unknown-shop',
                            name: 'Partner store',
                            offers: [offer],
                          } as ShopWithOffers);

                        return (
                          <TouchableOpacity
                            key={`search-offer-${offer.id}`}
                            style={styles.searchResultCard}
                            activeOpacity={0.88}
                            onPress={() => openOfferDetail(matchingShop, offer)}>
                            <View style={styles.searchResultImageWrap}>
                              <Image
                                source={{ uri: offerImage }}
                                style={styles.searchResultImage}
                                resizeMode="cover"
                              />
                              {offer.discount ? (
                                <View style={styles.searchFeaturedBadge}>
                                  <Text style={styles.searchFeaturedText}>{offer.discount}</Text>
                                </View>
                              ) : null}
                            </View>
                            <View style={styles.searchResultBody}>
                              <View style={styles.searchResultTypeRow}>
                                <MaterialCommunityIcons
                                  name="tag-outline"
                                  size={13}
                                  color={colors.primary}
                                />
                                <Text style={styles.searchResultTypeText}>Offer</Text>
                              </View>
                              <Text style={styles.searchResultTitle} numberOfLines={2}>
                                {offer.title}
                              </Text>
                              {offer.description ? (
                                <Text style={styles.searchStockText} numberOfLines={2}>
                                  {offer.description}
                                </Text>
                              ) : null}
                            </View>
                            <MaterialCommunityIcons
                              name="chevron-right"
                              size={20}
                              color="#98A2B3"
                              style={styles.searchResultChevron}
                            />
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  ) : null}

                  {searchResults.shops.length > 0 ? (
                    <View style={styles.searchSection}>
                      <Text style={styles.searchSectionTitle}>
                        Stores ({searchResults.shops.length})
                      </Text>
                      {searchResults.shops.map(renderSearchShopRow)}
                    </View>
                  ) : null}
                </>
              ) : (
                <>
                  {displayedShops.map(shop => {
                  const shopLogo = shopApi.resolveImageUrl(shop.logo) ?? PLACEHOLDER_SHOP_LOGO;
                  const hasOffers = shop.offers.length > 0;
                  const shopSaved = Boolean(savedShopIds[shop.id]);
                  const shopToggling = togglingShopId === shop.id;

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
                          ) : shop.address ? (
                            <Text style={styles.storeTagline} numberOfLines={1}>
                              {shop.address}
                            </Text>
                          ) : null}
                        </View>
                        <View style={styles.storeMeta}>
                          <TouchableOpacity
                            style={styles.homeHeartButton}
                            activeOpacity={0.85}
                            disabled={shopToggling}
                            onPress={event => {
                              event.stopPropagation?.();
                              handleToggleShopWishlist(shop);
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

                      {hasOffers ? (
                        <ScrollView
                          horizontal
                          showsHorizontalScrollIndicator={false}
                          style={styles.offersScroll}
                          contentContainerStyle={styles.offersContent}
                        >
                          {shop.offers.map(offer => {
                            const offerImage =
                              shopApi.resolveImageUrl(offer.image) ?? PLACEHOLDER_OFFER_IMAGE;
                            const offerSaved = Boolean(savedOfferIds[offer.id]);
                            const offerToggling = togglingOfferId === offer.id;

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
                                  <TouchableOpacity
                                    style={styles.offerHeartButton}
                                    activeOpacity={0.85}
                                    disabled={offerToggling}
                                    onPress={event => {
                                      event.stopPropagation?.();
                                      handleToggleOfferWishlist(offer);
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
                                  <Text style={styles.cardOfferTitle} numberOfLines={1}>
                                    {offer.title}
                                  </Text>
                                  {offer.subtitle ? (
                                    <Text style={styles.cardOfferSubtitle} numberOfLines={1}>
                                      {offer.subtitle}
                                    </Text>
                                  ) : null}
                                  <OfferCountdownText
                                    expiresAt={offer.expiresAt}
                                    countdown={offer.countdown}
                                    suffix=" remaining"
                                    style={styles.cardCountdown}
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
                  })}
                </>
              )}
            </View>
          </AnimatedScreen>
        </ScrollView>
      </SafeAreaView>

      <Modal
        visible={categoriesModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setCategoriesModalVisible(false)}
      >
        <Pressable style={styles.categoriesModalBackdrop} onPress={() => setCategoriesModalVisible(false)}>
          <Pressable style={styles.categoriesModalCard} onPress={() => undefined}>
            <View style={styles.categoriesModalHeader}>
              <Text style={styles.categoriesModalTitle}>All Categories</Text>
              <TouchableOpacity
                onPress={() => setCategoriesModalVisible(false)}
                style={styles.sidebarCloseButton}
                accessibilityRole="button"
                accessibilityLabel="Close categories"
              >
                <MaterialCommunityIcons name="close" size={22} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.categoriesModalContent}
            >
              <View style={styles.categoriesModalGrid}>
                {categoryChips.map(renderCategoryChip)}
              </View>
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

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

      <DailyRewardsSheet
        visible={dailyRewardsVisible}
        rewards={dailyRewards}
        calendarDays={mergedCalendarDays}
        selectedDate={selectedDailyRewardDate}
        rewardPreviewByDate={rewardPreviewByDate}
        isLoading={isLoadingDailyRewards}
        error={dailyRewardsError}
        togglingOfferId={togglingOfferId}
        onClose={() => setDailyRewardsVisible(false)}
        onRetry={() => loadDailyRewards(selectedDailyRewardDate)}
        onDateSelect={handleDailyRewardDateSelect}
        onClaimReward={handleClaimDailyReward}
        onToggleWishlist={handleToggleDailyRewardWishlist}
        onOpenHistory={openOfferRedemptionHistory}
        resolveImageUrl={shopApi.resolveImageUrl}
      />

      <FeatureWalkthrough
        visible={featureWalkthroughVisible}
        onComplete={handleFeatureWalkthroughComplete}
        targets={walkthroughTargets}
        onStepChange={handleWalkthroughStepChange}
      />
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
    paddingTop: 4,
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
  createRequestEmptyBtn: {
    marginTop: 8,
    minHeight: 42,
    borderRadius: 999,
    backgroundColor: colors.primary,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  createRequestEmptyBtnText: {
    color: colors.white,
    fontSize: 13,
    fontFamily: fonts.BOLD,
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
    marginBottom: 17,
  },
  promoBanner: {
    minHeight: 175,
    borderRadius: 23,
    overflow: 'hidden',
    backgroundColor: DINEOUT_GREEN,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 17,
    paddingVertical: 19,
    shadowColor: DINEOUT_GREEN,
    shadowOffset: { width: 0, height: 11 },
    shadowOpacity: 0.32,
    shadowRadius: 19,
    elevation: 8,
  },
  promoBannerGlow: {
    position: 'absolute',
    width: 205,
    height: 205,
    borderRadius: 103,
    right: -65,
    top: -45,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  promoBannerGlowSecondary: {
    position: 'absolute',
    width: 130,
    height: 130,
    borderRadius: 65,
    left: -37,
    bottom: -47,
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
    borderRadius: 13,
    paddingHorizontal: 8,
    paddingVertical: 5,
    marginBottom: 7,
  },
  promoBannerBadgeText: {
    color: '#FFE28A',
    fontSize: 9,
    fontFamily: fonts.BOLD,
    letterSpacing: 1.1,
  },
  promoBannerTitle: {
    color: colors.white,
    fontSize: 35,
    lineHeight: 39,
    fontFamily: fonts.BOLD,
    letterSpacing: -1.3,
  },
  promoBannerSubtitle: {
    color: 'rgba(255,255,255,0.86)',
    fontSize: 17,
    fontFamily: fonts.BOLD,
    marginTop: 2,
  },
  promoBannerCountdown: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.28)',
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 15,
    marginTop: 11,
  },
  promoBannerCountdownText: {
    color: colors.white,
    fontSize: 10,
    fontFamily: fonts.BOLD,
  },
  promoArtwork: {
    width: 117,
    height: 132,
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
    width: 73,
    height: 86,
    right: 4,
    bottom: 8,
    backgroundColor: '#E7FFF3',
    transform: [{ rotate: '5deg' }],
  },
  promoGiftBoxSmall: {
    width: 54,
    height: 62,
    left: 3,
    bottom: 2,
    backgroundColor: '#FFE5A6',
    transform: [{ rotate: '-8deg' }],
  },
  promoCoin: {
    position: 'absolute',
    top: 6,
    right: 24,
    width: 39,
    height: 39,
    borderRadius: 20,
    backgroundColor: '#D7A44E',
    borderWidth: 3,
    borderColor: '#F6D990',
    alignItems: 'center',
    justifyContent: 'center',
  },
  promoCoinText: {
    color: '#513B0D',
    fontSize: 20,
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
    marginBottom: 12,
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
    marginBottom: 8,
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
    marginBottom: 10,
    paddingBottom: 2,
  },
  walkthroughCategoriesWrap: {
    borderRadius: 18,
  },
  walkthroughRewardsWrap: {
    borderRadius: 18,
  },
  walkthroughOffersWrap: {
    borderRadius: 18,
  },
  categoriesHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 2,
  },
  categoriesTitle: {
    fontSize: 15,
    color: colors.text,
    fontFamily: fonts.BOLD,
  },
  viewAllCategoriesText: {
    fontSize: 13,
    color: colors.primary,
    fontFamily: fonts.BOLD,
  },
  categoriesModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(22, 32, 51, 0.42)',
    justifyContent: 'flex-end',
  },
  categoriesModalCard: {
    maxHeight: '72%',
    backgroundColor: colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 16,
    paddingBottom: 24,
  },
  categoriesModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  categoriesModalTitle: {
    fontSize: 18,
    color: colors.text,
    fontFamily: fonts.BOLD,
  },
  categoriesModalContent: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  categoriesModalGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  categoriesScroll: {
    flexGrow: 0,
  },
  categoriesContent: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 12,
    gap: 10,
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E7ECF5',
    backgroundColor: colors.white,
    gap: 6,
    shadowColor: '#1B2430',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  categoryIconWrap: {
    width: 24,
    height: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  categoryChipImage: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  categoryLoadingPill: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  categoryPillSelected: {
    borderWidth: 1.5,
  },
  categoryPillText: {
    fontSize: 10,
    color: colors.darkGray,
    fontFamily: fonts.BOLD,
  },
  categoryPillTextSelected: {
    color: colors.primary,
  },
  localOffersSection: {
    paddingHorizontal: 16,
    marginTop: 2,
  },
  localOffersHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
    gap: 10,
  },
  localOffersHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
  },
  localOffersTitleWrap: {
    flex: 1,
    flexShrink: 1,
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
    fontSize: 19,
    fontFamily: fonts.BOLD,
    color: colors.text,
    letterSpacing: -0.4,
  },
  searchSummaryText: {
    marginTop: 3,
    fontSize: 12,
    color: '#667085',
    fontFamily: fonts.BOLD,
  },
  searchSection: {
    gap: 10,
    marginBottom: 16,
  },
  searchSectionTitle: {
    fontSize: 15,
    color: colors.text,
    fontFamily: fonts.BOLD,
  },
  searchResultCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E7ECF5',
    overflow: 'hidden',
    minHeight: 108,
    shadowColor: '#1B2430',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  searchResultImageWrap: {
    width: 96,
    height: 108,
    backgroundColor: '#EEF2F8',
  },
  searchResultImage: {
    width: 96,
    height: 108,
  },
  searchFeaturedBadge: {
    position: 'absolute',
    left: 7,
    top: 7,
    borderRadius: 12,
    backgroundColor: colors.primary,
    paddingHorizontal: 7,
    paddingVertical: 4,
  },
  searchFeaturedText: {
    color: colors.white,
    fontSize: 9,
    fontFamily: fonts.BOLD,
  },
  searchResultBody: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 12,
    justifyContent: 'center',
  },
  searchResultChevron: {
    marginRight: 10,
  },
  searchResultTypeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 5,
  },
  searchResultTypeText: {
    color: colors.primary,
    fontSize: 10,
    fontFamily: fonts.BOLD,
    textTransform: 'uppercase',
  },
  searchResultTitle: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 18,
    fontFamily: fonts.BOLD,
  },
  searchShopName: {
    marginTop: 4,
    color: '#667085',
    fontSize: 12,
    fontFamily: fonts.BOLD,
  },
  searchPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginTop: 8,
  },
  searchPrice: {
    color: colors.text,
    fontSize: 14,
    fontFamily: fonts.BOLD,
  },
  searchOriginalPrice: {
    color: '#99A4B8',
    fontSize: 11,
    fontFamily: fonts.BOLD,
    textDecorationLine: 'line-through',
  },
  searchStockText: {
    marginTop: 5,
    color: '#667085',
    fontSize: 11,
    fontFamily: fonts.BOLD,
  },
  searchShopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E7ECF5',
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 12,
  },
  searchShopLogoWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#EEF2F8',
  },
  searchShopLogo: {
    width: 48,
    height: 48,
  },
  searchShopBody: {
    flex: 1,
  },
  searchShopMeta: {
    marginTop: 3,
    color: '#667085',
    fontSize: 12,
    fontFamily: fonts.BOLD,
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
    gap: 6,
  },
  homeHeartButton: {
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
