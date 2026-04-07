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
import Navbar from '../../../../components/navbar';
import { colors, fonts } from '../../../../helpers/styles';
import { useAppContext } from '../../../../context/AppContext';
import { showAppAlert } from '../../../../services/appAlert';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48) / 3 - 8;

type SidebarItem = {
  icon: string;
  label: string;
  active?: boolean;
  tone?: 'danger';
};

type SidebarGroup = {
  title: string;
  items: SidebarItem[];
};

const sidebarGroups: SidebarGroup[] = [
  {
    title: 'Home',
    items: [
      { icon: 'view-dashboard-outline', label: 'Overview', active: true },
      { icon: 'storefront-outline', label: 'Shop' },
      { icon: 'bike-fast', label: 'Delivery' },
      { icon: 'cube-outline', label: 'Discover Product' },
      { icon: 'tag-outline', label: 'Local offers (Today`s)' },
    ],
  },
  {
    title: 'Saving & Tools',
    items: [
      { icon: 'wallet-outline', label: 'Bacht Wallet' },
      { icon: 'chart-line', label: 'Saving Summery' },
      { icon: 'target', label: 'Bachar Target' },
    ],
  },
  {
    title: 'Utility & Features',
    items: [
      { icon: 'truck-delivery-outline', label: 'Tips & Tricks' },
      { icon: 'ticket-percent-outline', label: 'My coupons' },
      { icon: 'bookmark-outline', label: 'Saved Stores' },
      { icon: 'heart-outline', label: 'Saved Products' },
    ],
  },
  {
    title: 'Setting',
    items: [
      { icon: 'lock-outline', label: 'Password' },
      { icon: 'account-edit-outline', label: 'Edit Profile' },
      { icon: 'bell-outline', label: 'Notification' },
      { icon: 'delete-outline', label: 'Delete account', tone: 'danger' },
    ],
  },
];

const HomeScreenView = () => {
  const navigation = useNavigation();
  const { currentUser, clearSession } = useAppContext();
  const [comparePrices, setComparePrices] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('Hot Deals');
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [headerAddress, setHeaderAddress] = useState(
    currentUser?.address?.trim() ? `Work - ${currentUser.address.trim()}` : 'Work - Fetching location...',
  );

  const quickActions = [
    { icon: 'gift', label: 'Daily\nRewards', bgColor: '#EEF4FF', iconColor: '#366FE0' },
    { icon: 'map-marker', label: 'Nearby\nCoupons', bgColor: '#F3E5F5', iconColor: '#9C27B0' },
    { icon: 'qrcode-scan', label: 'Scan &\nSave', bgColor: '#E3F2FD', iconColor: '#2196F3' },
    { icon: 'account-plus', label: 'Invite &\nEarn', bgColor: '#E8F5E9', iconColor: '#4CAF50' },
    { icon: 'bookmark', label: 'Saved\nOffers', bgColor: '#EEF4FF', iconColor: '#366FE0' },
  ];

  const categories = [
    { id: 'Hot Deals', icon: 'fire', label: 'Hot Deals' },
    { id: 'Jewelry', icon: 'diamond-stone', label: 'Jewelry' },
    { id: 'Grocery', icon: 'cart', label: 'Grocery' },
    { id: 'Food', icon: 'food', label: 'Food' },
  ];

  const userName = useMemo(() => currentUser?.name?.trim() || 'Your name', [currentUser?.name]);
  const sidebarLocation = useMemo(
    () => currentUser?.address?.trim() || 'New Delhi, India',
    [currentUser?.address],
  );
  const isProfileComplete = Boolean(currentUser?.name?.trim() && currentUser?.address?.trim());
  const displayPhone = currentUser?.phone ? `+91 ${currentUser.phone}` : '+91 786543567';
  const profileActionLabel = isProfileComplete ? 'Edit Profile' : 'Complete Profile';

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
            } catch (error) {
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
      } catch (error) {
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
                    <MaterialCommunityIcons name={action.icon as never} size={30} color={action.iconColor} />
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
                  <MaterialCommunityIcons
                    name={cat.icon as never}
                    size={18}
                    color={selectedCategory === cat.id ? colors.primary : colors.darkGray}
                  />
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
            <View style={styles.sidebarHeaderRow}>
              <View />
              <TouchableOpacity onPress={() => setSidebarVisible(false)}>
                <MaterialCommunityIcons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.sidebarScrollContent}
            >

              <View style={styles.sidebarProfileSection}>
                <View style={styles.profileAvatar}>
                  <Text style={styles.profileAvatarText}>{userName.charAt(0).toUpperCase()}</Text>
                </View>
                <View style={styles.profileInfo}>
                  <Text style={styles.profileName}>{userName}</Text>
                  <Text style={styles.profileLocation}>{sidebarLocation}</Text>
                </View>
              </View>

              <View style={styles.contactRow}>
                <MaterialCommunityIcons name="phone" size={16} color={colors.text} />
                <Text style={styles.contactText}>{displayPhone}</Text>
              </View>

              <View style={styles.contactRow}>
                <MaterialCommunityIcons name="map-marker" size={16} color={colors.text} />
                <Text style={styles.contactText}>{sidebarLocation}</Text>
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

                    return (
                      <TouchableOpacity
                        key={item.label}
                        style={[styles.sidebarItem, item.active && styles.sidebarItemActive]}
                        onPress={item.label === 'Edit Profile' ? openProfileSetup : undefined}
                      >
                        <MaterialCommunityIcons
                          name={item.icon as never}
                          size={16}
                          color={
                            isDanger ? '#E45A5A' : item.active ? colors.white : colors.text
                          }
                        />
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
                <MaterialCommunityIcons name="logout" size={18} color="#E45A5A" />
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
    marginBottom: 8,
  },
  countdownLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  countdownLabel: {
    fontSize: 14,
    color: colors.text,
    fontFamily: fonts.BOLD,
  },
  countdownTime: {
    fontSize: 14,
    color: colors.primary,
    fontFamily: fonts.BOLD,
  },
  banner: {
    marginHorizontal: 16,
    borderRadius: 16,
    padding: 24,
    minHeight: 140,
    marginBottom: 20,
    overflow: 'hidden',
  },
  bannerGradientFallback: {
    backgroundColor: colors.primary,
  },
  bannerContent: {
    flex: 1,
  },
  bannerTextSection: {
    marginBottom: 12,
  },
  bannerTitle: {
    fontSize: 36,
    fontFamily: fonts.BOLD,
    color: colors.white,
  },
  bannerSubtitle: {
    fontSize: 18,
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
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  bannerCountdownText: {
    fontSize: 13,
    color: colors.white,
    fontFamily: fonts.BOLD,
  },
  bannerDecorations: {
    position: 'absolute',
    right: 20,
    top: 20,
  },
  giftBox: {
    width: 40,
    height: 40,
    borderRadius: 8,
    opacity: 0.9,
  },
  quickActionsScroll: {
    marginBottom: 20,
  },
  quickActionsContent: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 16,
  },
  quickActionItem: {
    alignItems: 'center',
    width: 72,
  },
  quickActionCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  quickActionLabel: {
    fontSize: 12,
    color: colors.lightGray,
    textAlign: 'center',
    fontFamily: fonts.BOLD,
    marginTop: 4,
    lineHeight: 14,
  },
  categoriesScroll: {
    marginBottom: 20,
  },
  categoriesContent: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 10,
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
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
    fontSize: 14,
    color: colors.darkGray,
    fontFamily: fonts.BOLD,
  },
  categoryPillTextSelected: {
    color: colors.primary,
  },
  localOffersSection: {
    paddingHorizontal: 16,
    marginTop: 10,
  },
  localOffersHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  localOffersTitle: {
    fontSize: 22,
    fontFamily: fonts.BOLD,
    color: colors.text,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  filterText: {
    fontSize: 14,
    color: colors.lighterGray,
    marginRight: 4,
    fontFamily: fonts.BOLD,
  },
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  controlsLabel: {
    fontSize: 16,
    color: colors.text,
    fontFamily: fonts.BOLD,
  },
  storeCard: {
    backgroundColor: colors.white,
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  storeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  storeLogoCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
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
    fontSize: 16,
    fontFamily: fonts.BOLD,
    color: colors.text,
  },
  verifiedIcon: {
    marginLeft: 6,
  },
  storeTagline: {
    fontSize: 13,
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
    fontSize: 14,
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
    gap: 12,
    paddingRight: 4,
  },
  offerCard: {
    width: CARD_WIDTH,
    backgroundColor: '#F9FAFD',
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E6ECF7',
  },
  offerImageContainer: {
    height: 96,
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
    padding: 10,
  },
  cardOfferTitle: {
    fontSize: 13,
    color: colors.text,
    fontFamily: fonts.BOLD,
  },
  cardOfferSubtitle: {
    fontSize: 12,
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
    backgroundColor: colors.white,
    marginTop: 0,
    marginBottom: 0,
    marginLeft: 0,
    borderTopRightRadius: 28,
    borderBottomRightRadius: 28,
    borderTopLeftRadius: 0,
    borderBottomLeftRadius: 0,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 24,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 12,
  },
  backdrop: {
    flex: 1,
  },
  sidebarScrollContent: {
    paddingBottom: 16,
  },
  sidebarHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginBottom: 10,
  },
  sidebarProfileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  profileAvatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  profileAvatarText: {
    fontSize: 20,
    color: colors.primary,
    fontFamily: fonts.BOLD,
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
    fontSize: 12,
    color: colors.lighterGray,
    fontFamily: fonts.BOLD,
    marginTop: 2,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  contactText: {
    fontSize: 12,
    color: colors.text,
    fontFamily: fonts.BOLD,
    flex: 1,
  },
  sidebarDivider: {
    height: 1,
    backgroundColor: colors.primaryBorder,
    marginVertical: 12,
  },
  completeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
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
    backgroundColor: colors.white,
  },
  completeCardActionText: {
    fontSize: 11,
    color: colors.primary,
    fontFamily: fonts.BOLD,
  },
  sidebarGroup: {
    marginBottom: 14,
  },
  sidebarGroupTitle: {
    fontSize: 11,
    color: colors.lighterGray,
    fontFamily: fonts.BOLD,
    marginBottom: 8,
  },
  sidebarItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 34,
    paddingHorizontal: 10,
    borderRadius: 10,
    marginBottom: 4,
  },
  sidebarItemActive: {
    backgroundColor: '#366FE0',
  },
  sidebarItemText: {
    fontSize: 12,
    color: colors.text,
    fontFamily: fonts.BOLD,
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
    gap: 10,
    paddingHorizontal: 10,
    paddingVertical: 10,
    marginTop: 4,
  },
  logoutText: {
    fontSize: 13,
    color: '#E45A5A',
    fontFamily: fonts.BOLD,
  },
});
