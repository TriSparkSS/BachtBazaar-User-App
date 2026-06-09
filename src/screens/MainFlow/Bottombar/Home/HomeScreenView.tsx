import {
  Dimensions,
  Image,
  Modal,
  PermissionsAndroid,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useEffect, useMemo, useState } from 'react';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { CommonActions, useNavigation } from '@react-navigation/native';
import Geolocation from 'react-native-geolocation-service';
import AnimatedScreen from '../../../../components/AnimatedScreen';
import AppIcon, { AppIconName } from '../../../../components/AppIcon';
import Navbar from '../../../../components/navbar';
import { API_BASE_URL } from '../../../../config/api';
import { colors, fonts } from '../../../../helpers/styles';
import { useAppContext } from '../../../../context/AppContext';
import { showAppAlert } from '../../../../services/appAlert';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48) / 3 - 8;

type SidebarItem = {
  icon: AppIconName;
  label: string;
  active?: boolean;
  tone?: 'danger';
};

type SidebarGroup = {
  title: string;
  items: SidebarItem[];
};

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

const sidebarGroups: SidebarGroup[] = [
  {
    title: 'Home',
    items: [
      { icon: 'overview', label: 'Overview', active: true },
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

const HomeScreenView = () => {
  const navigation = useNavigation();
  const { currentUser, clearSession } = useAppContext();
  const [comparePrices, setComparePrices] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('Hot Deals');
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [isPhoneVisible, setIsPhoneVisible] = useState(false);
  const [profileImageLoadError, setProfileImageLoadError] = useState(false);
  const [headerAddress, setHeaderAddress] = useState(
    currentUser?.address?.trim() ? `Work - ${currentUser.address.trim()}` : 'Work - Fetching location...',
  );

  const quickActions = [
    { icon: 'reward' as AppIconName, label: 'Daily\nRewards', bgColor: '#EEF4FF' },
    { icon: 'nearby-coupons' as AppIconName, label: 'Nearby\nCoupons', bgColor: '#F3E5F5' },
    { icon: 'scan-save' as AppIconName, label: 'Scan &\nSave', bgColor: '#E3F2FD' },
    { icon: 'invite-earn' as AppIconName, label: 'Invite &\nEarn', bgColor: '#E8F5E9' },
    { icon: 'saved-offers' as AppIconName, label: 'Saved\nOffers', bgColor: '#EEF4FF' },
  ];

  const categories = [
    { id: 'Hot Deals', icon: 'hot-deals' as AppIconName, label: 'Hot Deals' },
    { id: 'Jewelry', icon: 'jewelry' as AppIconName, label: 'Jewelry' },
    { id: 'Grocery', icon: 'grocery' as AppIconName, label: 'Grocery' },
    { id: 'Food', icon: 'food' as AppIconName, label: 'Food' },
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
      ? currentUser.profileImage.startsWith('http')
        ? currentUser.profileImage
        : `${API_BASE_URL.replace(/\/api\/user\/?$/, '')}${currentUser.profileImage}`
      : '';

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
          return;
        }

        Geolocation.getCurrentPosition(
          async position => {
            try {
              const { latitude, longitude } = position.coords;
              console.log('[Location] Current coordinates', { latitude, longitude });

              const response = await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`,
                {
                  headers: {
                    Accept: 'application/json',
                  },
                },
              );

              const payload = await response.json();
              console.log('[Location] Reverse geocode response', payload);
              setHeaderAddress(formatAddress(payload));
            } catch {
              setHeaderAddress(fallbackAddress);
            }
          },
          () => {
            setHeaderAddress(fallbackAddress);
          },
          {
            enableHighAccuracy: true,
            timeout: 15000,
            maximumAge: 10000,
          },
        );
      } catch {
        setHeaderAddress(fallbackAddress);
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

  const handleLogout = () => {
    showAppAlert('Logout', 'Do you want to logout from this account?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          console.log('[Auth] Logout requested');
          await clearSession();
          setSidebarVisible(false);
          navigation.dispatch(
            CommonActions.reset({
              index: 0,
              routes: [
                {
                  name: 'AuthFlow',
                  state: {
                    routes: [{ name: 'Login' }],
                  },
                },
              ],
            }),
          );
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <View style={styles.bgAccent} />

      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <AnimatedScreen>
            <Navbar onMenuPress={() => setSidebarVisible(true)} title={userName} subtitle={headerAddress} />

            <View style={styles.countdownHeader}>
              <View style={styles.countdownLeft}>
                <MaterialCommunityIcons name="fire" size={18} color={colors.primary} />
                <Text style={styles.countdownLabel}>Mega Sale Starts in</Text>
              </View>
              <Text style={styles.countdownTime}>02:12:51</Text>
            </View>

            <View style={[styles.banner, styles.bannerGradientFallback]}>
              <View style={styles.bannerContent}>
                <View style={styles.bannerTextSection}>
                  <Text style={styles.bannerTitle}>50% OFF</Text>
                  <Text style={styles.bannerSubtitle}>Nearby Stores</Text>
                </View>
                <View style={styles.bannerCountdown}>
                  <MaterialCommunityIcons name="clock-outline" size={16} color={colors.white} />
                  <Text style={styles.bannerCountdownText}>02:12:51 remaining</Text>
                </View>
              </View>
              <View style={styles.bannerDecorations}>
                <View style={[styles.giftBox, { backgroundColor: '#FFB300' }]} />
                <View style={[styles.giftBox, { backgroundColor: '#FF8A65', marginTop: 15 }]} />
                <View style={[styles.giftBox, { backgroundColor: '#90CAF9', marginTop: 10 }]} />
              </View>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.quickActionsScroll}
              contentContainerStyle={styles.quickActionsContent}
            >
              {quickActions.map(action => (
                <TouchableOpacity key={action.label} style={styles.quickActionItem}>
                  <View style={[styles.quickActionCircle, { backgroundColor: action.bgColor }]}>
                    <AppIcon name={action.icon} size={22} />
                  </View>
                  <Text style={styles.quickActionLabel}>{action.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.categoriesScroll}
              contentContainerStyle={styles.categoriesContent}
            >
              {categories.map(cat => (
                <TouchableOpacity
                  key={cat.id}
                  style={[
                    styles.categoryPill,
                    selectedCategory === cat.id && styles.categoryPillSelected,
                  ]}
                  onPress={() => setSelectedCategory(cat.id)}
                >
                  <AppIcon name={cat.icon} size={16} />
                  <Text
                    style={[
                      styles.categoryPillText,
                      selectedCategory === cat.id && styles.categoryPillTextSelected,
                    ]}
                  >
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={styles.localOffersSection}>
              <View style={styles.localOffersHeader}>
                <Text style={styles.localOffersTitle}>Local Offers</Text>
                <TouchableOpacity style={styles.filterRow}>
                  <Text style={styles.filterText}>Filter offer</Text>
                  <MaterialCommunityIcons name="filter-variant" size={20} color={colors.darkGray} />
                </TouchableOpacity>
              </View>

              <View style={styles.controlsRow}>
                <Text style={styles.controlsLabel}>Compare Prices</Text>
                <Switch
                  value={comparePrices}
                  onValueChange={setComparePrices}
                  thumbColor={colors.white}
                  trackColor={{ false: '#D3D9E5', true: '#8DC29B' }}
                />
              </View>

              <View style={styles.storeCard}>
                <View style={styles.storeHeader}>
                  <View style={styles.storeLogoCircle}>
                    <Image
                      source={{
                        uri: 'https://images.pexels.com/photos/102061/pexels-photo-102061.jpeg?auto=compress&cs=tinysrgb&dpr=1&w=500',
                      }}
                      style={styles.storeLogo}
                    />
                  </View>
                  <View style={styles.storeInfo}>
                    <View style={styles.storeNameContainer}>
                      <Text style={styles.storeName}>Sharma Jewelers</Text>
                      <MaterialCommunityIcons
                        name="check-decagram"
                        size={18}
                        color="#029AF1"
                        style={styles.verifiedIcon}
                      />
                    </View>
                    <Text style={styles.storeTagline}>Trusted since 1995</Text>
                  </View>
                  <View style={styles.storeMeta}>
                    <View style={styles.ratingRow}>
                      <MaterialCommunityIcons name="star" size={22} color="#FFD93D" />
                      <Text style={styles.ratingText}>
                        4.8 <Text style={styles.ratingCount}>(57)</Text>
                      </Text>
                    </View>
                    <View style={styles.distanceStatusRow}>
                      <MaterialCommunityIcons name="map-marker" size={16} color={colors.primary} />
                      <Text style={styles.distanceText}>0.3km</Text>
                      <View style={styles.openTag}>
                        <Text style={styles.openTagText}>Open</Text>
                      </View>
                    </View>
                  </View>
                </View>

                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.offersScroll}
                  contentContainerStyle={styles.offersContent}
                >
                  {[
                    {
                      tag: '10%OFF',
                      title: 'FLAT10%OFF',
                      subtitle: 'on Gold Jewelry',
                      image:
                        'https://images.pexels.com/photos/248077/pexels-photo-248077.jpeg?auto=compress&cs=tinysrgb&dpr=1&w=500',
                    },
                    {
                      tag: 'Buy 1Get 1',
                      title: 'Buy 1Get 1',
                      subtitle: 'on Silver Items',
                      image:
                        'https://images.pexels.com/photos/248077/pexels-photo-248077.jpeg?auto=compress&cs=tinysrgb&dpr=1&w=500',
                    },
                    {
                      tag: 'Free SUFF',
                      title: 'Free Silver',
                      subtitle: 'Polishing',
                      image:
                        'https://images.pexels.com/photos/248077/pexels-photo-248077.jpeg?auto=compress&cs=tinysrgb&dpr=1&w=500',
                    },
                  ].map((offer, index) => (
                    <View key={index} style={styles.offerCard}>
                      <View style={styles.offerImageContainer}>
                        <Image source={{ uri: offer.image }} style={styles.offerImage} />
                        <View style={styles.offerTag}>
                          <Text style={styles.offerTagTextSmall}>{offer.tag}</Text>
                        </View>
                      </View>
                      <View style={styles.offerInfo}>
                        <Text style={styles.cardOfferTitle} numberOfLines={1}>
                          {offer.title}
                        </Text>
                        <Text style={styles.cardOfferSubtitle} numberOfLines={1}>
                          {offer.subtitle}
                        </Text>
                        <Text style={styles.cardCountdown}>02:12:51 remaining</Text>
                      </View>
                    </View>
                  ))}
                </ScrollView>
              </View>
            </View>
          </AnimatedScreen>
        </ScrollView>
      </SafeAreaView>

      <Modal
        visible={sidebarVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setSidebarVisible(false)}
      >
        <View style={styles.modalRoot}>
          <AnimatedScreen style={styles.sidebarCard}>
            <View style={styles.sidebarPatternTop} />
            <View style={styles.sidebarPatternBottom} />
            <View style={styles.sidebarHeaderRow}>
              <View />
              <TouchableOpacity onPress={() => setSidebarVisible(false)}>
                <AppIcon name="close" size={18} />
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
                    <AppIcon name="phone" size={13} />
                  </View>
                  <Text style={styles.contactText}>
                    {isPhoneVisible ? displayPhone : `+91 ${maskedPhone}`}
                  </Text>
                  <TouchableOpacity
                    style={styles.contactToggleButton}
                    onPress={() => setIsPhoneVisible(prev => !prev)}
                  >
                    <AppIcon name={isPhoneVisible ? 'eye' : 'eye-off'} size={16} />
                  </TouchableOpacity>
                </View>

                <View style={styles.contactRow}>
                  <View style={styles.contactIconBadge}>
                    <AppIcon name="location" size={13} />
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

                    const onPress =
                      item.label === 'Edit Profile'
                        ? openProfileSetup
                        : item.label === 'Password'
                          ? openChangePassword
                          : undefined;

                    return (
                      <TouchableOpacity
                        key={item.label}
                        style={[styles.sidebarItem, item.active && styles.sidebarItemActive]}
                        onPress={onPress}
                      >
                        <View
                          style={[
                            styles.sidebarItemIconWrap,
                            {
                              backgroundColor: item.active
                                ? 'rgba(255,255,255,0.24)'
                                : sidebarIconPalette[item.label] ?? '#EEF4FF',
                            },
                          ]}
                        >
                          <AppIcon
                            name={item.icon}
                            size={13}
                            style={
                              item.active
                                ? styles.sidebarItemIconActive
                                : { tintColor: sidebarIconTint[item.label] ?? colors.primary }
                            }
                          />
                        </View>
                        <Text
                          style={[
                            styles.sidebarItemText,
                            item.active && styles.sidebarItemTextActive,
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

              <TouchableOpacity style={styles.logoutRow} onPress={handleLogout}>
                <AppIcon name="logout" size={16} />
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
    paddingBottom: 100,
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
    marginBottom: 16,
  },
  quickActionsContent: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 12,
  },
  quickActionItem: {
    alignItems: 'center',
    width: 66,
  },
  quickActionCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  quickActionLabel: {
    fontSize: 11,
    color: colors.lightGray,
    textAlign: 'center',
    fontFamily: fonts.BOLD,
    marginTop: 4,
    lineHeight: 13,
  },
  categoriesScroll: {
    marginBottom: 16,
  },
  categoriesContent: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 10,
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    backgroundColor: colors.white,
    gap: 6,
  },
  categoryPillSelected: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primaryBorder,
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
    alignItems: 'center',
    marginBottom: 12,
  },
  localOffersTitle: {
    fontSize: 18,
    fontFamily: fonts.BOLD,
    color: colors.text,
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
    marginBottom: 12,
  },
  storeLogoCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    overflow: 'hidden',
    marginRight: 12,
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
    fontSize: 14,
    fontFamily: fonts.BOLD,
    color: colors.text,
  },
  verifiedIcon: {
    marginLeft: 6,
  },
  storeTagline: {
    fontSize: 11,
    color: colors.lighterGray,
    fontFamily: fonts.BOLD,
    marginTop: 2,
  },
  storeMeta: {
    alignItems: 'flex-end',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    fontSize: 12,
    color: colors.text,
    fontFamily: fonts.BOLD,
    marginLeft: 4,
  },
  ratingCount: {
    color: colors.lighterGray,
  },
  distanceStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 4,
  },
  distanceText: {
    fontSize: 12,
    color: colors.lightGray,
    fontFamily: fonts.BOLD,
  },
  openTag: {
    marginLeft: 6,
    backgroundColor: '#DBF0D9',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
  },
  openTagText: {
    color: '#4C9A45',
    fontSize: 12,
    fontFamily: fonts.BOLD,
  },
  offersScroll: {
    marginTop: 4,
  },
  offersContent: {
    gap: 10,
    paddingRight: 4,
  },
  offerCard: {
    width: CARD_WIDTH,
    backgroundColor: '#F9FAFD',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E6ECF7',
  },
  offerImageContainer: {
    height: 88,
    position: 'relative',
  },
  offerImage: {
    width: '100%',
    height: '100%',
  },
  offerTag: {
    position: 'absolute',
    left: 8,
    bottom: 8,
    backgroundColor: '#F8E791',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  offerTagTextSmall: {
    fontSize: 10,
    color: '#8C7400',
    fontFamily: fonts.BOLD,
  },
  offerInfo: {
    padding: 8,
  },
  cardOfferTitle: {
    fontSize: 12,
    color: colors.text,
    fontFamily: fonts.BOLD,
  },
  cardOfferSubtitle: {
    fontSize: 11,
    color: colors.lightGray,
    fontFamily: fonts.BOLD,
    marginTop: 3,
  },
  cardCountdown: {
    fontSize: 11,
    color: colors.primary,
    fontFamily: fonts.BOLD,
    marginTop: 7,
  },
  modalRoot: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.14)',
    flexDirection: 'row',
  },
  sidebarCard: {
    width: width * 0.78,
    maxWidth: 330,
    backgroundColor: 'rgba(255,255,255,0.97)',
    marginTop: 0,
    marginBottom: 0,
    marginLeft: 0,
    borderTopRightRadius: 32,
    borderBottomRightRadius: 32,
    borderTopLeftRadius: 0,
    borderBottomLeftRadius: 0,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 18,
    borderWidth: 2,
    borderColor: '#366FE0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.14,
    shadowRadius: 24,
    elevation: 12,
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
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginBottom: 10,
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
    width: 24,
    height: 24,
    borderRadius: 12,
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
    width: 24,
    height: 24,
    borderRadius: 12,
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
    gap: 10,
    minHeight: 38,
    paddingHorizontal: 10,
    borderRadius: 12,
    marginBottom: 6,
  },
  sidebarItemActive: {
    backgroundColor: '#D7A44E',
    shadowColor: '#D7A44E',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 5,
  },
  sidebarItemIconWrap: {
    width: 22,
    height: 22,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sidebarItemText: {
    fontSize: 11,
    color: colors.text,
    fontFamily: fonts.BOLD,
  },
  sidebarItemTextActive: {
    color: colors.white,
  },
  sidebarItemIconActive: {
    tintColor: colors.white,
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
