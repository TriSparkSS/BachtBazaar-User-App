import React, { useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
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
import OfferLocationMap from './OfferLocationMap';
import { colors, fonts } from '../../../helpers/styles';
import { OfferDetail, ShopWithOffers } from '../../../types/shop';
import {
  buildOfferBadgeText,
  buildOfferDescription,
  buildOfferHeadline,
  buildOfferSummary,
  buildOfferUrgencyText,
  buildOperationalRuleLabels,
  buildRedeemSteps,
  formatOfferExpiryDate,
} from '../../../utils/offer';
import { formatShopAddress, isShopOpenNow } from '../../../utils/shop';

const { width } = Dimensions.get('window');
const SLIDER_HORIZONTAL_PADDING = 20;
const SLIDER_TRACK_WIDTH = width - SLIDER_HORIZONTAL_PADDING * 2;
const SLIDER_THUMB_SIZE = 54;
const SLIDER_MAX_TRANSLATE = SLIDER_TRACK_WIDTH - SLIDER_THUMB_SIZE - 8;

type OfferDetailScreenViewProps = {
  shop: ShopWithOffers;
  offer: OfferDetail;
  merchantName: string;
  heroImageUri: string;
  shopLogoUri: string;
  isLoading?: boolean;
  onBack: () => void;
  resolveImageUrl: (path?: string | null) => string | undefined;
};

const OfferDetailScreenView: React.FC<OfferDetailScreenViewProps> = ({
  shop,
  offer,
  merchantName,
  heroImageUri,
  shopLogoUri,
  isLoading = false,
  onBack,
  resolveImageUrl,
}) => {
  const [isSaved, setIsSaved] = useState(false);
  const [heroError, setHeroError] = useState(false);
  const [qrRevealed, setQrRevealed] = useState(false);
  const slideX = useRef(new Animated.Value(0)).current;

  const headline = useMemo(() => buildOfferHeadline(offer), [offer]);
  const summary = useMemo(() => buildOfferSummary(offer), [offer]);
  const description = useMemo(() => buildOfferDescription(offer, merchantName), [offer, merchantName]);
  const redeemSteps = useMemo(() => buildRedeemSteps(offer, shop), [offer, shop]);
  const badgeText = useMemo(() => buildOfferBadgeText(offer), [offer]);
  const urgencyText = useMemo(() => buildOfferUrgencyText(offer), [offer]);
  const ruleLabels = useMemo(() => buildOperationalRuleLabels(offer), [offer]);
  const shopAddress = formatShopAddress(shop);
  const openNow = isShopOpenNow(shop.openingHours) ?? shop.isOpen;
  const showQrSlider = offer.operationalRules?.qrRequired !== false;
  const showHeroImage = Boolean(heroImageUri) && !heroError;

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: () => showQrSlider && !qrRevealed,
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
    const query = encodeURIComponent(shopAddress || merchantName);
    Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${query}`);
  };

  const renderMechanicCard = (
    label: string,
    description?: string,
    iconUri?: string,
    key?: string,
  ) => (
    <View key={key || label} style={styles.mechanicCard}>
      {iconUri ? (
        <Image source={{ uri: resolveImageUrl(iconUri) ?? iconUri }} style={styles.mechanicIcon} />
      ) : (
        <View style={styles.mechanicIconFallback}>
          <MaterialCommunityIcons name="tag-outline" size={18} color={colors.primary} />
        </View>
      )}
      <View style={styles.mechanicBody}>
        <Text style={styles.mechanicTitle}>{label}</Text>
        {description ? <Text style={styles.mechanicDescription}>{description}</Text> : null}
      </View>
    </View>
  );

  return (
    <View style={styles.root}>
      <View style={styles.heroSection}>
        {showHeroImage ? (
          <Image
            source={{ uri: heroImageUri }}
            style={styles.heroImage}
            onError={() => setHeroError(true)}
          />
        ) : (
          <LinearGradient
            colors={['#4F86F7', '#6BA3FF', '#D7E6FF']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroGradient}
          >
            <MaterialCommunityIcons name="tag-outline" size={52} color="rgba(255,255,255,0.4)" />
          </LinearGradient>
        )}
        <LinearGradient
          colors={['rgba(22,32,51,0.04)', 'rgba(22,32,51,0.5)']}
          style={styles.heroOverlay}
        />

        <SafeAreaView edges={['top']} style={styles.heroActions}>
          <TouchableOpacity style={styles.heroIconButton} onPress={onBack} activeOpacity={0.85}>
            <MaterialCommunityIcons name="arrow-left" size={22} color="#1A2238" />
          </TouchableOpacity>

          <View style={styles.heroActionsRight}>
            <TouchableOpacity style={styles.heroIconButton} activeOpacity={0.85}>
              <MaterialCommunityIcons name="share-variant-outline" size={19} color="#1A2238" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.heroIconButton}
              onPress={() => setIsSaved(prev => !prev)}
              activeOpacity={0.85}
            >
              <MaterialCommunityIcons
                name={isSaved ? 'heart' : 'heart-outline'}
                size={19}
                color={isSaved ? colors.primary : '#1A2238'}
              />
            </TouchableOpacity>
          </View>
        </SafeAreaView>

        <View style={styles.heroBadge}>
          <Text style={styles.heroBadgeText}>{badgeText}</Text>
        </View>
      </View>

      <ScrollView
        style={styles.contentScroll}
        contentContainerStyle={styles.contentScrollContainer}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <AnimatedScreen style={styles.sheet}>
          {isLoading ? (
            <View style={styles.loadingBlock}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={styles.loadingText}>Loading offer details...</Text>
            </View>
          ) : (
            <>
              <Text style={styles.offerTitle}>{headline}</Text>

              {offer.code ? (
                <View style={styles.codeCard}>
                  <Text style={styles.codeLabel}>Offer code</Text>
                  <Text style={styles.codeValue}>{offer.code}</Text>
                </View>
              ) : null}

              <View style={styles.storeCard}>
                <Image source={{ uri: shopLogoUri }} style={styles.storeLogo} />
                <View style={styles.storeCardBody}>
                  <Text style={styles.storeName}>{merchantName}</Text>
                  {shopAddress ? (
                    <Text style={styles.storeAddress} numberOfLines={2}>
                      {shopAddress}
                    </Text>
                  ) : null}
                  <View style={styles.storeMetaRow}>
                    {openNow !== undefined ? (
                      <View style={[styles.statusPill, openNow ? styles.statusOpen : styles.statusClosed]}>
                        <Text
                          style={[styles.statusText, openNow ? styles.statusTextOpen : styles.statusTextClosed]}
                        >
                          {openNow ? 'Open now' : 'Closed'}
                        </Text>
                      </View>
                    ) : null}
                    {offer.minimumPurchaseAmount ? (
                      <View style={styles.minPurchasePill}>
                        <Text style={styles.minPurchaseText}>
                          Min ₹{offer.minimumPurchaseAmount.toLocaleString('en-IN')}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                </View>
              </View>

              <View
                style={[
                  styles.urgencyBanner,
                  offer.timeline?.isUpcoming && styles.urgencyUpcoming,
                  offer.timeline?.isExpired && styles.urgencyExpired,
                ]}
              >
                <MaterialCommunityIcons
                  name={
                    offer.timeline?.isExpired
                      ? 'clock-remove-outline'
                      : offer.timeline?.isUpcoming
                        ? 'clock-start'
                        : 'clock-alert-outline'
                  }
                  size={18}
                  color={
                    offer.timeline?.isExpired
                      ? '#8B97AB'
                      : offer.timeline?.isUpcoming
                        ? '#366FE0'
                        : '#D84B4B'
                  }
                />
                <Text
                  style={[
                    styles.urgencyText,
                    offer.timeline?.isUpcoming && styles.urgencyTextUpcoming,
                    offer.timeline?.isExpired && styles.urgencyTextExpired,
                  ]}
                >
                  {urgencyText}
                </Text>
              </View>

              {offer.timeline?.endDate ? (
                <Text style={styles.validityText}>
                  Valid till {formatOfferExpiryDate(offer.timeline.endDate)}
                </Text>
              ) : null}

              {(offer.mechanics?.parentType || offer.mechanics?.subType) && (
                <View style={styles.sectionBlock}>
                  <Text style={styles.sectionTitle}>How it works</Text>
                  {offer.mechanics?.parentType
                    ? renderMechanicCard(
                        offer.mechanics.parentType.label || 'Offer type',
                        offer.mechanics.parentType.description,
                        offer.mechanics.parentType.icon,
                        'parent',
                      )
                    : null}
                  {offer.mechanics?.subType
                    ? renderMechanicCard(
                        offer.mechanics.subType.label || 'Offer detail',
                        offer.mechanics.subType.description,
                        offer.mechanics.subType.icon,
                        'sub',
                      )
                    : null}
                </View>
              )}

              <View style={styles.sectionBlock}>
                <Text style={styles.sectionTitle}>About this offer</Text>
                <Text style={styles.summaryText}>{summary}</Text>
                <Text style={styles.descriptionText}>{description}</Text>
              </View>

              {ruleLabels.length > 0 || offer.mechanics?.campaignPoolWinners ? (
                <View style={styles.chipsRow}>
                  {ruleLabels.map(label => (
                    <View key={label} style={styles.ruleChip}>
                      <Text style={styles.ruleChipText}>{label}</Text>
                    </View>
                  ))}
                  {offer.mechanics?.campaignPoolWinners ? (
                    <View style={styles.ruleChip}>
                      <Text style={styles.ruleChipText}>
                        {offer.mechanics.campaignPoolWinners} winners
                      </Text>
                    </View>
                  ) : null}
                </View>
              ) : null}

              {offer.linkedProducts && offer.linkedProducts.length > 0 ? (
                <View style={styles.sectionBlock}>
                  <Text style={styles.sectionTitle}>Included products</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.productRow}>
                    {offer.linkedProducts.map(product => (
                      <View key={product.id} style={styles.productChip}>
                        {product.image ? (
                          <Image
                            source={{ uri: resolveImageUrl(product.image) }}
                            style={styles.productChipImage}
                          />
                        ) : null}
                        <Text style={styles.productChipTitle} numberOfLines={2}>
                          {product.title}
                        </Text>
                        {product.price ? <Text style={styles.productChipPrice}>{product.price}</Text> : null}
                      </View>
                    ))}
                  </ScrollView>
                </View>
              ) : null}

              <View style={styles.sectionBlock}>
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
              </View>

              <View style={styles.sectionBlock}>
                <Text style={styles.sectionTitle}>Store location</Text>
                <OfferLocationMap
                  address={shopAddress}
                  label={merchantName}
                  onGetDirections={handleGetDirections}
                />
              </View>
            </>
          )}
        </AnimatedScreen>
      </ScrollView>

      {!isLoading ? (
        <SafeAreaView edges={['bottom']} style={styles.bottomBar}>
          {qrRevealed || !showQrSlider ? (
            <View style={styles.redeemCard}>
              <View style={styles.redeemIconWrap}>
                <MaterialCommunityIcons
                  name={showQrSlider ? 'qrcode' : 'ticket-confirmation-outline'}
                  size={showQrSlider ? 72 : 40}
                  color={colors.text}
                />
              </View>
              <Text style={styles.redeemTitle}>
                {showQrSlider ? 'Show this at checkout' : 'Use this offer code'}
              </Text>
              <Text style={styles.redeemCode}>{offer.code || offer.id}</Text>
            </View>
          ) : (
            <View style={styles.sliderTrack}>
              <Text style={styles.sliderHint}>Slide to reveal QR</Text>
              <View style={styles.sliderChevrons}>
                <MaterialCommunityIcons name="chevron-right" size={18} color="#B8C2D3" />
                <MaterialCommunityIcons name="chevron-right" size={18} color="#B8C2D3" />
                <MaterialCommunityIcons name="chevron-right" size={18} color="#B8C2D3" />
              </View>
              <Animated.View
                style={[styles.sliderThumb, { transform: [{ translateX: slideX }] }]}
                {...panResponder.panHandlers}
              >
                <MaterialCommunityIcons name="qrcode-scan" size={22} color={colors.white} />
              </Animated.View>
            </View>
          )}
        </SafeAreaView>
      ) : null}
    </View>
  );
};

export default OfferDetailScreenView;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F4F7FC',
  },
  contentScroll: {
    flex: 1,
    marginTop: -24,
  },
  contentScrollContainer: {
    flexGrow: 1,
    paddingBottom: 12,
  },
  heroSection: {
    height: 240,
    backgroundColor: '#D8E2F0',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroGradient: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  heroActions: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 6,
  },
  heroActionsRight: {
    flexDirection: 'row',
    gap: 8,
  },
  heroIconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroBadge: {
    position: 'absolute',
    left: 20,
    bottom: 36,
    backgroundColor: colors.primary,
    borderRadius: 100,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  heroBadgeText: {
    fontSize: 12,
    color: colors.white,
    fontFamily: fonts.BOLD,
    letterSpacing: 0.3,
  },
  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 24,
    minHeight: 420,
  },
  loadingBlock: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    gap: 10,
  },
  loadingText: {
    fontSize: 13,
    color: colors.mutedText,
    fontFamily: fonts.BOLD,
  },
  offerTitle: {
    fontSize: 24,
    lineHeight: 30,
    color: colors.text,
    fontFamily: fonts.BOLD,
    letterSpacing: -0.4,
    marginBottom: 14,
  },
  codeCard: {
    alignSelf: 'flex-start',
    backgroundColor: colors.primarySoft,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
  },
  codeLabel: {
    fontSize: 11,
    color: colors.primaryDark,
    fontFamily: fonts.BOLD,
    marginBottom: 2,
  },
  codeValue: {
    fontSize: 18,
    color: colors.primary,
    fontFamily: fonts.BOLD,
    letterSpacing: 1,
  },
  storeCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FAFBFE',
    borderRadius: 16,
    padding: 14,
    gap: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#EEF2F8',
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
  storeName: {
    fontSize: 15,
    color: colors.text,
    fontFamily: fonts.BOLD,
  },
  storeAddress: {
    marginTop: 4,
    fontSize: 12,
    color: colors.mutedText,
    lineHeight: 17,
    fontFamily: fonts.BOLD,
  },
  storeMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  statusPill: {
    borderRadius: 100,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  statusOpen: {
    backgroundColor: '#ECF9F1',
  },
  statusClosed: {
    backgroundColor: '#FDEEEE',
  },
  statusText: {
    fontSize: 11,
    fontFamily: fonts.BOLD,
  },
  statusTextOpen: {
    color: '#1F8B4C',
  },
  statusTextClosed: {
    color: '#D84B4B',
  },
  minPurchasePill: {
    backgroundColor: '#F4F7FC',
    borderRadius: 100,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  minPurchaseText: {
    fontSize: 11,
    color: '#5E6B82',
    fontFamily: fonts.BOLD,
  },
  urgencyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFF4F4',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 8,
  },
  urgencyUpcoming: {
    backgroundColor: '#EEF4FF',
  },
  urgencyExpired: {
    backgroundColor: '#F4F7FC',
  },
  urgencyText: {
    flex: 1,
    fontSize: 13,
    color: '#B42318',
    fontFamily: fonts.BOLD,
    lineHeight: 18,
  },
  urgencyTextUpcoming: {
    color: colors.primaryDark,
  },
  urgencyTextExpired: {
    color: '#8B97AB',
  },
  validityText: {
    fontSize: 12,
    color: colors.mutedText,
    fontFamily: fonts.BOLD,
    marginBottom: 18,
  },
  sectionBlock: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    color: colors.text,
    fontFamily: fonts.BOLD,
    marginBottom: 12,
    letterSpacing: -0.2,
  },
  summaryText: {
    fontSize: 14,
    color: colors.primaryDark,
    fontFamily: fonts.BOLD,
    marginBottom: 8,
  },
  descriptionText: {
    fontSize: 13,
    lineHeight: 20,
    color: colors.mutedText,
    fontFamily: fonts.BOLD,
  },
  mechanicCard: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: '#FAFBFE',
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#EEF2F8',
  },
  mechanicIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#F3F6FB',
  },
  mechanicIconFallback: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mechanicBody: {
    flex: 1,
  },
  mechanicTitle: {
    fontSize: 14,
    color: colors.text,
    fontFamily: fonts.BOLD,
    marginBottom: 4,
  },
  mechanicDescription: {
    fontSize: 12,
    lineHeight: 18,
    color: colors.mutedText,
    fontFamily: fonts.BOLD,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  ruleChip: {
    backgroundColor: '#F4F7FC',
    borderRadius: 100,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  ruleChipText: {
    fontSize: 11,
    color: '#5E6B82',
    fontFamily: fonts.BOLD,
  },
  productRow: {
    gap: 12,
    paddingRight: 4,
  },
  productChip: {
    width: 120,
    backgroundColor: '#FAFBFE',
    borderRadius: 14,
    padding: 10,
    borderWidth: 1,
    borderColor: '#EEF2F8',
  },
  productChipImage: {
    width: '100%',
    height: 72,
    borderRadius: 10,
    backgroundColor: '#F3F6FB',
    marginBottom: 8,
  },
  productChipTitle: {
    fontSize: 12,
    color: colors.text,
    fontFamily: fonts.BOLD,
    minHeight: 30,
    lineHeight: 15,
  },
  productChipPrice: {
    marginTop: 4,
    fontSize: 12,
    color: colors.primary,
    fontFamily: fonts.BOLD,
  },
  stepsList: {
    gap: 14,
  },
  stepRow: {
    flexDirection: 'row',
    gap: 12,
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumberText: {
    fontSize: 13,
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
    color: colors.mutedText,
    fontFamily: fonts.BOLD,
  },
  bottomBar: {
    paddingHorizontal: SLIDER_HORIZONTAL_PADDING,
    paddingTop: 10,
    paddingBottom: 8,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: '#EEF2F8',
  },
  sliderTrack: {
    height: 60,
    borderRadius: 100,
    backgroundColor: '#F4F7FC',
    borderWidth: 1,
    borderColor: '#E3EAF5',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  sliderHint: {
    textAlign: 'center',
    fontSize: 14,
    color: colors.mutedText,
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
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  redeemCard: {
    alignItems: 'center',
    backgroundColor: '#FAFBFE',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#EEF2F8',
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  redeemIconWrap: {
    width: 96,
    height: 96,
    borderRadius: 14,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  redeemTitle: {
    fontSize: 14,
    color: colors.text,
    fontFamily: fonts.BOLD,
    marginBottom: 4,
  },
  redeemCode: {
    fontSize: 18,
    color: colors.primary,
    fontFamily: fonts.BOLD,
    letterSpacing: 1,
  },
});
