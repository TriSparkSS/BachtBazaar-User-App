import React, { useMemo, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Image,
  Linking,
  PanResponder,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import AnimatedScreen from '../../../components/AnimatedScreen';
import { colors, fonts } from '../../../helpers/styles';
import { ShopOffer, ShopWithOffers } from '../../../types/shop';
import {
  buildOfferBadgeText,
  buildOfferDescription,
  buildOfferHeadline,
  buildOfferSummary,
  buildRedeemSteps,
  formatOfferCountdown,
} from '../../../utils/offer';

const { width } = Dimensions.get('window');
const SLIDER_HORIZONTAL_PADDING = 16;
const SLIDER_TRACK_WIDTH = width - SLIDER_HORIZONTAL_PADDING * 2;
const SLIDER_THUMB_SIZE = 56;
const SLIDER_MAX_TRANSLATE = SLIDER_TRACK_WIDTH - SLIDER_THUMB_SIZE - 8;

const OFFER_PLACEHOLDER =
  'https://images.pexels.com/photos/1191531/pexels-photo-1191531.jpeg?auto=compress&cs=tinysrgb&dpr=1&w=800';

const SHOP_LOGO_PLACEHOLDER =
  'https://images.pexels.com/photos/248077/pexels-photo-248077.jpeg?auto=compress&cs=tinysrgb&dpr=1&w=200';

const MAP_PLACEHOLDER =
  'https://images.pexels.com/photos/2662116/pexels-photo-2662116.jpeg?auto=compress&cs=tinysrgb&dpr=1&w=800';

type OfferDetailScreenViewProps = {
  shop: ShopWithOffers;
  offer: ShopOffer;
  heroImageUri: string;
  shopLogoUri: string;
  onBack: () => void;
};

const OfferDetailScreenView: React.FC<OfferDetailScreenViewProps> = ({
  shop,
  offer,
  heroImageUri,
  shopLogoUri,
  onBack,
}) => {
  const [isSaved, setIsSaved] = useState(false);
  const [qrRevealed, setQrRevealed] = useState(false);
  const slideX = useRef(new Animated.Value(0)).current;

  const headline = useMemo(() => buildOfferHeadline(offer), [offer]);
  const summary = useMemo(() => buildOfferSummary(offer), [offer]);
  const description = useMemo(() => buildOfferDescription(offer, shop.name), [offer, shop.name]);
  const redeemSteps = useMemo(() => buildRedeemSteps(offer, shop), [offer, shop]);
  const countdown = useMemo(() => formatOfferCountdown(offer), [offer]);
  const badgeText = useMemo(() => buildOfferBadgeText(offer), [offer]);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: () => !qrRevealed,
      onPanResponderMove: (_, gestureState) => {
        const nextValue = Math.max(0, Math.min(gestureState.dx, SLIDER_MAX_TRANSLATE));
        slideX.setValue(nextValue);
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx >= SLIDER_MAX_TRANSLATE * 0.82) {
          Animated.timing(slideX, {
            toValue: SLIDER_MAX_TRANSLATE,
            duration: 160,
            useNativeDriver: false,
          }).start(() => setQrRevealed(true));
          return;
        }

        Animated.spring(slideX, {
          toValue: 0,
          useNativeDriver: false,
          bounciness: 0,
        }).start();
      },
    }),
  ).current;

  const handleGetDirections = () => {
    const query = encodeURIComponent(shop.name);
    Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${query}`);
  };

  return (
    <View style={styles.root}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
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

          <View style={styles.heroBadge}>
            <Text style={styles.heroBadgeText}>{badgeText}</Text>
          </View>
        </View>

        <AnimatedScreen style={styles.sheetWrap}>
          <LinearGradient
            colors={['#FFF8F1', '#F7FAFF', '#F3F8FF']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.sheetGradient}
          >
            <View style={styles.sheetHandle} />
            <Text style={styles.offerTitle}>{headline}</Text>

            <View style={styles.storeCard}>
              <Image source={{ uri: shopLogoUri }} style={styles.storeLogo} />
              <View style={styles.storeCardBody}>
                <View style={styles.storeNameRow}>
                  <Text style={styles.storeName}>{shop.name}</Text>
                  {shop.isVerified ? (
                    <MaterialCommunityIcons name="check-decagram" size={16} color={colors.primary} />
                  ) : null}
                </View>
                <View style={styles.storeMetaRow}>
                  {shop.distance ? (
                    <View style={styles.storeMetaItem}>
                      <MaterialCommunityIcons name="map-marker" size={13} color={colors.primary} />
                      <Text style={styles.storeMetaText}>{shop.distance}</Text>
                    </View>
                  ) : null}
                  {shop.isOpen ? (
                    <View style={styles.openPill}>
                      <Text style={styles.openPillText}>Open</Text>
                    </View>
                  ) : null}
                </View>
              </View>
              {shop.rating ? (
                <View style={styles.ratingPill}>
                  <MaterialCommunityIcons name="star" size={12} color="#F2A900" />
                  <Text style={styles.ratingPillText}>{shop.rating}</Text>
                </View>
              ) : null}
            </View>

            <Text style={styles.sectionTitle}>Offer Description</Text>
            <Text style={styles.sectionSubtitle}>{summary}</Text>
            <Text style={styles.descriptionText}>{description}</Text>

            <View style={styles.urgencyBanner}>
              <MaterialCommunityIcons name="clock-alert-outline" size={18} color="#D84B4B" />
              <Text style={styles.urgencyText}>
                Hurry! This exclusive offer expires in {countdown}
              </Text>
            </View>

            <Text style={styles.sectionTitle}>How to redeem</Text>
            <View style={styles.stepsList}>
              {redeemSteps.map((step, index) => (
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

            <View style={styles.mapCard}>
              <Image source={{ uri: MAP_PLACEHOLDER }} style={styles.mapImage} />
              <TouchableOpacity
                style={styles.directionsButton}
                onPress={handleGetDirections}
                activeOpacity={0.85}
              >
                <MaterialCommunityIcons name="navigation-variant-outline" size={16} color={colors.primary} />
                <Text style={styles.directionsButtonText}>Get Directions</Text>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </AnimatedScreen>
      </ScrollView>

      <SafeAreaView edges={['bottom']} style={styles.bottomBar}>
        {qrRevealed ? (
          <View style={styles.qrCard}>
            <View style={styles.qrIconWrap}>
              <MaterialCommunityIcons name="qrcode" size={88} color={colors.text} />
            </View>
            <Text style={styles.qrTitle}>Show this QR at checkout</Text>
            <Text style={styles.qrCodeText}>{offer.id}</Text>
          </View>
        ) : (
          <View style={styles.sliderTrack}>
            <Text style={styles.sliderHint}>Slide to Reveal QR</Text>
            <View style={styles.sliderChevrons}>
              <MaterialCommunityIcons name="chevron-right" size={18} color="#99A4B8" />
              <MaterialCommunityIcons name="chevron-right" size={18} color="#99A4B8" />
              <MaterialCommunityIcons name="chevron-right" size={18} color="#99A4B8" />
            </View>
            <Animated.View
              style={[styles.sliderThumb, { transform: [{ translateX: slideX }] }]}
              {...panResponder.panHandlers}
            >
              <MaterialCommunityIcons name="qrcode-scan" size={24} color={colors.white} />
            </Animated.View>
          </View>
        )}
      </SafeAreaView>
    </View>
  );
};

export default OfferDetailScreenView;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F7FAFF',
  },
  scrollContent: {
    paddingBottom: 24,
  },
  heroSection: {
    height: 280,
    backgroundColor: '#D8E2F0',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 32, 51, 0.16)',
  },
  heroActions: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
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
  heroBadge: {
    position: 'absolute',
    left: 16,
    bottom: 42,
    backgroundColor: '#FFD93D',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  heroBadgeText: {
    fontSize: 12,
    color: '#202843',
    fontFamily: fonts.BOLD,
    letterSpacing: 0.4,
  },
  sheetWrap: {
    marginTop: -24,
  },
  sheetGradient: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 28,
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 44,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D8E2F0',
    marginBottom: 16,
  },
  offerTitle: {
    fontSize: 24,
    lineHeight: 30,
    color: colors.text,
    fontFamily: fonts.BOLD,
    letterSpacing: -0.5,
    marginBottom: 16,
  },
  storeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 18,
    padding: 12,
    gap: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E8EDF5',
    shadowColor: '#1B2430',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
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
  storeNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  storeName: {
    fontSize: 15,
    color: colors.text,
    fontFamily: fonts.BOLD,
  },
  storeMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  storeMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  storeMetaText: {
    fontSize: 12,
    color: '#667085',
    fontFamily: fonts.BOLD,
  },
  openPill: {
    backgroundColor: '#E7F8EF',
    borderRadius: 100,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  openPillText: {
    fontSize: 11,
    color: '#27AE60',
    fontFamily: fonts.BOLD,
  },
  ratingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFF8E8',
    borderRadius: 100,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  ratingPillText: {
    fontSize: 12,
    color: colors.text,
    fontFamily: fonts.BOLD,
  },
  sectionTitle: {
    fontSize: 17,
    color: colors.text,
    fontFamily: fonts.BOLD,
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: colors.primaryDark,
    fontFamily: fonts.BOLD,
    marginBottom: 8,
  },
  descriptionText: {
    fontSize: 13,
    lineHeight: 20,
    color: '#667085',
    marginBottom: 16,
  },
  urgencyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFF1F1',
    borderWidth: 1,
    borderColor: '#F6CACA',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 22,
  },
  urgencyText: {
    flex: 1,
    fontSize: 13,
    color: '#B42318',
    fontFamily: fonts.BOLD,
  },
  stepsList: {
    gap: 14,
    marginBottom: 20,
  },
  stepRow: {
    flexDirection: 'row',
    gap: 12,
  },
  stepNumber: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumberText: {
    fontSize: 14,
    color: colors.white,
    fontFamily: fonts.BOLD,
  },
  stepBody: {
    flex: 1,
    paddingTop: 2,
  },
  stepTitle: {
    fontSize: 14,
    color: colors.text,
    fontFamily: fonts.BOLD,
    marginBottom: 4,
  },
  stepDescription: {
    fontSize: 12,
    lineHeight: 18,
    color: '#667085',
  },
  mapCard: {
    borderRadius: 18,
    overflow: 'hidden',
    height: 170,
    backgroundColor: '#E8EDF5',
    marginBottom: 8,
  },
  mapImage: {
    width: '100%',
    height: '100%',
  },
  directionsButton: {
    position: 'absolute',
    right: 12,
    bottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.white,
    borderRadius: 100,
    paddingHorizontal: 12,
    paddingVertical: 8,
    shadowColor: '#1B2430',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  directionsButtonText: {
    fontSize: 12,
    color: colors.primary,
    fontFamily: fonts.BOLD,
  },
  bottomBar: {
    paddingHorizontal: SLIDER_HORIZONTAL_PADDING,
    paddingTop: 10,
    paddingBottom: 8,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: '#E8EDF5',
  },
  sliderTrack: {
    height: 64,
    borderRadius: 100,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: '#D8E2F0',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  sliderHint: {
    textAlign: 'center',
    fontSize: 15,
    color: '#667085',
    fontFamily: fonts.BOLD,
  },
  sliderChevrons: {
    position: 'absolute',
    right: 18,
    flexDirection: 'row',
    alignItems: 'center',
  },
  sliderThumb: {
    position: 'absolute',
    left: 4,
    width: SLIDER_THUMB_SIZE,
    height: SLIDER_THUMB_SIZE,
    borderRadius: SLIDER_THUMB_SIZE / 2,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 10,
    elevation: 6,
  },
  qrCard: {
    alignItems: 'center',
    backgroundColor: '#F8FAFD',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E8EDF5',
    paddingVertical: 18,
    paddingHorizontal: 16,
  },
  qrIconWrap: {
    width: 120,
    height: 120,
    borderRadius: 16,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  qrTitle: {
    fontSize: 14,
    color: colors.text,
    fontFamily: fonts.BOLD,
    marginBottom: 4,
  },
  qrCodeText: {
    fontSize: 12,
    color: '#667085',
    fontFamily: fonts.BOLD,
  },
});
