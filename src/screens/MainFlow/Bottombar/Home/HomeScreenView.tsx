import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Dimensions,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useState } from 'react';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import LinearGradient from 'react-native-linear-gradient';
import Navbar from '../../../../components/navbar';
import BackgroundImg from '../../../../assets/image/Background.png';
import VectorSVG from '../../../../assets/image/Vector.svg';
import { colors, fonts } from '../../../../helpers/styles';

const { width, height } = Dimensions.get('window');
const CARD_WIDTH = (width - 48) / 3 - 8;
const OFFER_CARD_SIZE = CARD_WIDTH;

const HomeScreenView = () => {
  const [comparePrices, setComparePrices] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('Hot Deals');

  const quickActions = [
    { icon: 'gift', label: 'Daily\nRewards', bgColor: '#FFF3E0', iconColor: '#FF9800' },
    { icon: 'map-marker', label: 'Nearby\nCoupons', bgColor: '#F3E5F5', iconColor: '#9C27B0' },
    { icon: 'qrcode-scan', label: 'Scan &\nSave', bgColor: '#E3F2FD', iconColor: '#2196F3' },
    { icon: 'account-plus', label: 'Invite &\nEarn', bgColor: '#E8F5E9', iconColor: '#4CAF50' },
    { icon: 'bookmark', label: 'Saved\nOffers', bgColor: '#FFF3E0', iconColor: '#FF9800' },
  ];

  const categories = [
    { id: 'Hot Deals', icon: 'fire', label: 'Hot Deals' },
    { id: 'Jewelry', icon: 'diamond-stone', label: 'Jewelry' },
    { id: 'Grocery', icon: 'cart', label: 'Grocery' },
    { id: 'Food', icon: 'food', label: 'Food' },
  ];

  const offers = [
    { tag: '10%OFF', title: 'FLAT10%OFF', subtitle: 'on Gold Jewelry', image: null },
    { tag: 'Buy 1Get 1', title: 'Buy 1Get 1', subtitle: 'on Silver Items', image: null },
    { tag: 'Free SUFF', title: 'Free Silver', subtitle: 'Polishing', image: null },
  ];

  return (
    <View style={styles.container}>
      {/* Background */}
      <View style={StyleSheet.absoluteFillObject}>
        <Image
          source={BackgroundImg}
          style={{ width: width, height: height }}
          resizeMode="cover"
        />
      </View>

      {/* Top Right Vector */}
      <View style={styles.topRightVector}>
        <VectorSVG width={width * 0.4} height={width * 0.4} />
      </View>

      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
        <Navbar />

        {/* Mega Sale Countdown */}
        <View style={styles.countdownHeader}>
          <View style={styles.countdownLeft}>
            <MaterialCommunityIcons name="fire" size={18} color={colors.red} />
            <Text style={styles.countdownLabel}>Mega Sale Starts in</Text>
          </View>
          <Text style={styles.countdownTime}>02:12:51</Text>
        </View>

        {/* Mega Sale Banner */}
        <LinearGradient
          colors={['#FF6B35', '#FF4D6D']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.banner}
        >
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
        </LinearGradient>

        {/* Quick Action Buttons */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.quickActionsScroll}
          contentContainerStyle={styles.quickActionsContent}
        >
          {quickActions.map((action) => (
            <TouchableOpacity key={action.label} style={styles.quickActionItem}>
              <View style={[styles.quickActionCircle, { backgroundColor: action.bgColor }]}>
                <MaterialCommunityIcons
                  name={action.icon as any}
                  size={30}
                  color={action.iconColor}
                />
              </View>
              <Text style={styles.quickActionLabel}>{action.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Category Filter Pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.categoriesScroll}
          contentContainerStyle={styles.categoriesContent}
        >
          {categories.map((cat) => (
            <TouchableOpacity
              key={cat.id}
              style={[
                styles.categoryPill,
                selectedCategory === cat.id && styles.categoryPillSelected,
              ]}
              onPress={() => setSelectedCategory(cat.id)}
            >
              <MaterialCommunityIcons
                name={cat.icon as any}
                size={18}
                color={selectedCategory === cat.id ? colors.red : colors.darkGray}
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

        {/* Local Offers Section */}
        <View style={styles.localOffersSection}>
          <View style={styles.localOffersHeader}>
            <Text style={styles.localOffersTitle}>Local Offers</Text>
            <TouchableOpacity style={styles.filterRow}>
              <Text style={styles.filterText}>Filter offer</Text>
              <MaterialCommunityIcons name="filter-variant" size={20} color={colors.darkGray} />
            </TouchableOpacity>
          </View>

          {/* Store Card - Sharma Jewelers */}
          <View style={styles.storeCard}>
            <View style={styles.storeHeader}>
              <View style={styles.storeLogoCircle}>
                <Image
                  source={{ uri: 'https://images.pexels.com/photos/102061/pexels-photo-102061.jpeg?auto=compress&cs=tinysrgb&dpr=1&w=500' }}
                  style={styles.storeLogo}
                />
              </View>
              <View style={styles.storeInfo}>
                <View style={styles.storeNameContainer}>
                  <Text style={styles.storeName}>Sharma Jewelers</Text>
                  <MaterialCommunityIcons name="check-decagram" size={18} color="#029AF1" style={styles.verifiedIcon} />
                </View>
                <Text style={styles.storeTagline}>Trusted since 1995</Text>
              </View>
              <View style={styles.storeMeta}>
                <View style={styles.ratingRow}>
                  <MaterialCommunityIcons name="star" size={22} color="#FFD93D" />
                  <Text style={styles.ratingText}>4.8 <Text style={styles.ratingCount}>(57)</Text></Text>
                </View>
                <View style={styles.distanceStatusRow}>
                  <MaterialCommunityIcons name="map-marker" size={16} color={colors.orange} />
                  <Text style={styles.distanceText}>0.3km</Text>
                  <View style={styles.openTag}>
                    <Text style={styles.openTagText}>Open</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Offer Cards Row */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.offersScroll}
              contentContainerStyle={styles.offersContent}
            >
              {[
                { tag: '10%OFF', title: 'FLAT10%OFF', subtitle: 'on Gold Jewelry', image: 'https://images.pexels.com/photos/248077/pexels-photo-248077.jpeg?auto=compress&cs=tinysrgb&dpr=1&w=500' },
                { tag: 'Buy 1Get 1', title: 'Buy 1Get 1', subtitle: 'on Silver Items', image: 'https://images.pexels.com/photos/248077/pexels-photo-248077.jpeg?auto=compress&cs=tinysrgb&dpr=1&w=500' },
                { tag: 'Free SUFF', title: 'Free Silver', subtitle: 'Polishing', image: 'https://images.pexels.com/photos/248077/pexels-photo-248077.jpeg?auto=compress&cs=tinysrgb&dpr=1&w=500' },
              ].map((offer, index) => (
                <View key={index} style={styles.offerCard}>
                  <View style={styles.offerImageContainer}>
                    <Image
                      source={{ uri: offer.image }}
                      style={styles.offerImage}
                    />
                    <View style={styles.offerTag}>
                      <Text style={styles.offerTagTextSmall}>{offer.tag}</Text>
                    </View>
                  </View>
                  <View style={styles.offerInfo}>
                    <Text style={styles.cardOfferTitle} numberOfLines={1}>{offer.title}</Text>
                    <Text style={styles.cardOfferSubtitle} numberOfLines={1}>{offer.subtitle}</Text>
                    <Text style={styles.cardCountdown}>02:12:51 remaining</Text>
                  </View>
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
    </View>
  );
};

export default HomeScreenView;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
  },
  topRightVector: {
    position: 'absolute',
    top: 40,
    right: 0,
    width: 150,
    height: 200,
    overflow: 'visible',
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
    color: colors.darkGray,
    fontWeight: '500',
  },
  countdownTime: {
    fontSize: 14,
    color: colors.darkGray,
    fontWeight: '600',
  },
  banner: {
    marginHorizontal: 16,
    borderRadius: 16,
    padding: 24,
    minHeight: 140,
    marginBottom: 20,
    overflow: 'hidden',
  },
  bannerContent: {
    flex: 1,
  },
  bannerTextSection: {
    marginBottom: 12,
  },
  bannerTitle: {
    fontSize: 36,
    fontWeight: 'bold',
    color: colors.white,
  },
  bannerSubtitle: {
    fontSize: 18,
    color: colors.white,
    opacity: 0.95,
    marginTop: 4,
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
    fontWeight: '500',
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
    fontWeight: 'bold',
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
    borderColor: colors.borderGray,
    backgroundColor: colors.white,
    gap: 6,
  },
  categoryPillSelected: {
    backgroundColor: '#FFE0B2',
    borderColor: 'transparent',
  },
  categoryPillText: {
    fontSize: 14,
    color: colors.darkGray,
    fontWeight: '500',
  },
  categoryPillTextSelected: {
    color: '#FF6B35',
    fontWeight: 'bold',
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
    fontWeight: 'bold',
    color: '#8D6E63', // Brownish color from image
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
  storeCard: {
    backgroundColor: '#FAFAFA',
    borderRadius: 24,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  storeHeader: {
    flexDirection: 'row',
    marginBottom: 16,
    alignItems: 'center',
  },
  storeLogoCircle: {
    width: 65,
    height: 65,
    borderRadius: 32.5,
    backgroundColor: colors.white,
    padding: 2,
    borderWidth: 1,
    borderColor: '#EEEEEE',
    overflow: 'hidden',
  },
  storeLogo: {
    width: '100%',
    height: '100%',
    borderRadius: 32.5,
  },
  storeInfo: {
    flex: 1,
    marginLeft: 12,
  },
  storeNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  storeName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  verifiedIcon: {
    marginTop: 2,
  },
  storeTagline: {
    fontSize: 14,
    color: colors.lighterGray,
    marginTop: 2,
  },
  storeMeta: {
    alignItems: 'flex-end',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.darkGray,
  },
  ratingCount: {
    fontSize: 14,
    color: colors.lighterGray,
    fontWeight: 'normal',
  },
  distanceStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
  },
  distanceText: {
    fontSize: 14,
    color: colors.lightGray,
  },
  openTag: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  openTagText: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: 'bold',
  },
  offersScroll: {
    marginHorizontal: -4,
  },
  offersContent: {
    flexDirection: 'row',
    gap: 12,
    paddingRight: 10,
  },
  offerCard: {
    width: width * 0.4,
    backgroundColor: colors.white,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  offerImageContainer: {
    width: '100%',
    height: width * 0.35,
    backgroundColor: '#F5F5F5',
  },
  offerImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  offerTag: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: '#FFD933',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  offerTagTextSmall: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#333',
  },
  offerInfo: {
    padding: 10,
  },
  cardOfferTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  cardOfferSubtitle: {
    fontSize: 12,
    color: colors.lightGray,
    marginTop: 2,
  },
  cardCountdown: {
    fontSize: 12,
    color: '#FF5A5F',
    fontWeight: 'bold',
    marginTop: 8,
  },
});
