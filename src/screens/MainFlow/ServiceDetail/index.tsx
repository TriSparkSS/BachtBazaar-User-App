import React, { useMemo, useState } from 'react';
import {
  Dimensions,
  Image,
  Linking,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import AnimatedScreen from '../../../components/AnimatedScreen';
import OfferLocationMap from '../OfferDetail/OfferLocationMap';
import { MainStackParamList } from '../../../navigation/types';
import { shopApi } from '../../../services/shopApi';
import { colors, fonts } from '../../../helpers/styles';
import { formatShopAddress, isShopCurrentlyOpen } from '../../../utils/shop';
import { openChatWithNumber, openPhoneDialer } from '../../../helpers/contactActions';
import { showAppAlert } from '../../../services/appAlert';

const { width } = Dimensions.get('window');

const SERVICE_PLACEHOLDER =
  'https://images.pexels.com/photos/3993449/pexels-photo-3993449.jpeg?auto=compress&cs=tinysrgb&dpr=1&w=800';

const SHOP_LOGO_PLACEHOLDER =
  'https://images.pexels.com/photos/264636/pexels-photo-264636.jpeg?auto=compress&cs=tinysrgb&dpr=1&w=200';

const usableImage = (uri?: string) =>
  uri && !uri.startsWith('file:') ? uri : undefined;

const ServiceDetail = () => {
  const navigation =
    useNavigation<StackNavigationProp<MainStackParamList, 'ServiceDetail'>>();
  const route = useRoute();
  const { shop, service } = route.params as MainStackParamList['ServiceDetail'];
  const [heroError, setHeroError] = useState(false);

  const heroImageUri = useMemo(() => {
    const resolved = usableImage(shopApi.resolveImageUrl(service.image));
    return resolved ?? SERVICE_PLACEHOLDER;
  }, [service.image]);
  const shopLogoUri = useMemo(
    () => shopApi.resolveImageUrl(shop.logo) ?? SHOP_LOGO_PLACEHOLDER,
    [shop.logo],
  );
  const shopAddress = formatShopAddress(shop);
  const openNow = isShopCurrentlyOpen(shop);
  const showHeroImage = Boolean(heroImageUri) && !heroError;

  const pricingLabel =
    service.pricingType === 'hourly'
      ? 'Hourly'
      : service.pricingType === 'fixed'
        ? 'Fixed price'
        : service.pricingType;

  const chips = [service.duration, service.gender, pricingLabel].filter(Boolean) as string[];
  const description =
    service.description?.trim() ||
    `${service.title} is available at ${shop.name}. Call the store to book a slot and confirm the final price.`;

  const handleShare = async () => {
    try {
      await Share.share({
        message: `${service.title} at ${shop.name}${service.price ? ` — ${service.price}` : ''}`,
        title: service.title,
      });
    } catch {
      // User cancelled share.
    }
  };

  const handleCall = async () => {
    try {
      await openPhoneDialer(shop.phone);
    } catch (error) {
      showAppAlert(
        'Call unavailable',
        error instanceof Error ? error.message : 'Phone number is not available.',
      );
    }
  };

  const handleChat = async () => {
    try {
      await openChatWithNumber(
        shop.phone,
        `Hi, I'd like to book "${service.title}" at ${shop.name} on Bachat Bazaar.`,
      );
    } catch (error) {
      showAppAlert(
        'Chat unavailable',
        error instanceof Error ? error.message : 'Mobile number is not available for chat.',
      );
    }
  };

  const handleGetDirections = () => {
    const query = encodeURIComponent(shopAddress || shop.name);
    Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${query}`);
  };

  return (
    <View style={styles.root}>
      <View style={styles.heroSection}>
        {showHeroImage ? (
          <Image
            source={{ uri: heroImageUri }}
            style={styles.heroImage}
            resizeMode="cover"
            onError={() => setHeroError(true)}
          />
        ) : (
          <LinearGradient
            colors={['#4F86F7', '#6BA3FF', '#D7E6FF']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroGradient}
          >
            <MaterialCommunityIcons
              name="hand-heart-outline"
              size={52}
              color="rgba(255,255,255,0.4)"
            />
          </LinearGradient>
        )}
        <LinearGradient
          colors={['rgba(22,32,51,0.04)', 'rgba(22,32,51,0.5)']}
          style={styles.heroOverlay}
        />

        <SafeAreaView edges={['top']} style={styles.heroActions}>
          <TouchableOpacity
            style={styles.heroIconButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.85}
          >
            <MaterialCommunityIcons name="arrow-left" size={22} color="#1A2238" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.heroIconButton} onPress={handleShare} activeOpacity={0.85}>
            <MaterialCommunityIcons name="share-variant-outline" size={19} color="#1A2238" />
          </TouchableOpacity>
        </SafeAreaView>

        <View style={styles.heroBadge}>
          <Text style={styles.heroBadgeText}>Service</Text>
        </View>
      </View>

      <ScrollView
        style={styles.contentScroll}
        contentContainerStyle={styles.contentScrollContainer}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <AnimatedScreen style={styles.sheet}>
          <Text style={styles.title}>{service.title}</Text>

          {chips.length ? (
            <View style={styles.chipsRow}>
              {chips.map(label => (
                <View key={label} style={styles.chip}>
                  <Text style={styles.chipText}>{label}</Text>
                </View>
              ))}
            </View>
          ) : null}

          {(service.price || service.originalPrice || service.rating) ? (
            <View style={styles.priceCard}>
              {service.price ? <Text style={styles.priceValue}>{service.price}</Text> : null}
              {service.originalPrice ? (
                <Text style={styles.originalPrice}>{service.originalPrice}</Text>
              ) : null}
              {service.rating ? (
                <View style={styles.ratingPill}>
                  <MaterialCommunityIcons name="star" size={13} color="#F5A623" />
                  <Text style={styles.ratingText}>{service.rating}</Text>
                </View>
              ) : null}
            </View>
          ) : null}

          <TouchableOpacity
            style={styles.storeCard}
            activeOpacity={0.88}
            onPress={() => navigation.navigate('StoreDetail', { shop })}
          >
            <Image source={{ uri: shopLogoUri }} style={styles.storeLogo} />
            <View style={styles.storeCardBody}>
              <Text style={styles.storeName}>{shop.name}</Text>
              {shopAddress ? (
                <Text style={styles.storeAddress} numberOfLines={2}>
                  {shopAddress}
                </Text>
              ) : null}
              {openNow !== undefined ? (
                <View style={[styles.statusPill, openNow ? styles.statusOpen : styles.statusClosed]}>
                  <Text style={[styles.statusText, openNow ? styles.statusTextOpen : styles.statusTextClosed]}>
                    {openNow ? 'Open now' : 'Closed'}
                  </Text>
                </View>
              ) : null}
            </View>
            <MaterialCommunityIcons name="chevron-right" size={20} color="#98A2B3" />
          </TouchableOpacity>

          <View style={styles.sectionBlock}>
            <Text style={styles.sectionTitle}>About this service</Text>
            <Text style={styles.descriptionText}>{description}</Text>
          </View>

          <View style={styles.sectionBlock}>
            <Text style={styles.sectionTitle}>How to book</Text>
            <View style={styles.stepRow}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>1</Text>
              </View>
              <Text style={styles.stepText}>Call or chat with {shop.name} to confirm a slot.</Text>
            </View>
            <View style={styles.stepRow}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>2</Text>
              </View>
              <Text style={styles.stepText}>
                Mention “{service.title}”
                {service.price ? ` at ${service.price}` : ''}.
              </Text>
            </View>
            <View style={[styles.stepRow, styles.stepRowLast]}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>3</Text>
              </View>
              <Text style={styles.stepText}>Visit the store at the booked time.</Text>
            </View>
          </View>

          <View style={styles.sectionBlock}>
            <Text style={styles.sectionTitle}>Store location</Text>
            <OfferLocationMap
              address={shopAddress}
              city={shop.city}
              label={shop.name}
              onGetDirections={handleGetDirections}
            />
          </View>
        </AnimatedScreen>
      </ScrollView>

      <SafeAreaView edges={['bottom']} style={styles.bottomBar}>
        <TouchableOpacity style={styles.chatButton} activeOpacity={0.88} onPress={handleChat}>
          <MaterialCommunityIcons name="whatsapp" size={20} color="#22A45A" />
          <Text style={styles.chatButtonText}>Chat</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.callButton} activeOpacity={0.88} onPress={handleCall}>
          <MaterialCommunityIcons name="phone" size={20} color={colors.white} />
          <Text style={styles.callButtonText}>Call</Text>
        </TouchableOpacity>
      </SafeAreaView>
    </View>
  );
};

export default ServiceDetail;

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
    height: 260,
    backgroundColor: '#D8E2F0',
    justifyContent: 'center',
    alignItems: 'center',
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
    maxWidth: width - 80,
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
  title: {
    fontSize: 24,
    lineHeight: 30,
    color: colors.text,
    fontFamily: fonts.BOLD,
    letterSpacing: -0.4,
    marginBottom: 12,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  chip: {
    backgroundColor: colors.primarySoft,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  chipText: {
    fontSize: 12,
    fontFamily: fonts.BOLD,
    color: colors.primary,
  },
  priceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 10,
    alignSelf: 'flex-start',
    backgroundColor: colors.primarySoft,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
  },
  priceValue: {
    fontSize: 20,
    color: colors.primary,
    fontFamily: fonts.BOLD,
  },
  originalPrice: {
    fontSize: 13,
    color: '#98A2B3',
    textDecorationLine: 'line-through',
    fontFamily: fonts.BOLD,
  },
  ratingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFF7E8',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  ratingText: {
    fontSize: 12,
    color: '#8A5A00',
    fontFamily: fonts.BOLD,
  },
  storeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAFBFE',
    borderRadius: 16,
    padding: 14,
    gap: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#EEF2F8',
  },
  storeLogo: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: '#EEF2F8',
  },
  storeCardBody: {
    flex: 1,
    minWidth: 0,
  },
  storeName: {
    fontSize: 15,
    fontFamily: fonts.BOLD,
    color: colors.text,
  },
  storeAddress: {
    marginTop: 3,
    fontSize: 12,
    color: colors.mutedText,
    lineHeight: 16,
  },
  statusPill: {
    alignSelf: 'flex-start',
    marginTop: 8,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  statusOpen: {
    backgroundColor: colors.pastelGreen,
  },
  statusClosed: {
    backgroundColor: '#FFE5E5',
  },
  statusText: {
    fontSize: 11,
    fontFamily: fonts.BOLD,
  },
  statusTextOpen: {
    color: colors.darkgreen,
  },
  statusTextClosed: {
    color: colors.red,
  },
  sectionBlock: {
    marginBottom: 22,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: fonts.BOLD,
    color: colors.text,
    marginBottom: 10,
  },
  descriptionText: {
    fontSize: 14,
    lineHeight: 21,
    color: colors.mutedText,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#EEF2F8',
  },
  stepRowLast: {
    borderBottomWidth: 0,
  },
  stepNumber: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumberText: {
    fontSize: 13,
    fontFamily: fonts.BOLD,
    color: colors.primary,
  },
  stepText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    color: colors.text,
    paddingTop: 2,
  },
  bottomBar: {
    backgroundColor: colors.white,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E4EAF3',
    paddingHorizontal: 20,
    paddingTop: 12,
    flexDirection: 'row',
    gap: 10,
  },
  chatButton: {
    flex: 1,
    height: 52,
    borderRadius: 16,
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: '#22A45A',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  chatButtonText: {
    color: '#22A45A',
    fontSize: 15,
    fontFamily: fonts.BOLD,
  },
  callButton: {
    flex: 1.35,
    height: 52,
    borderRadius: 16,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  callButtonText: {
    color: colors.white,
    fontSize: 15,
    fontFamily: fonts.BOLD,
  },
});
