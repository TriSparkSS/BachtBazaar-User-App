import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  ImageBackground,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import OfferCountdownText from './OfferCountdownText';
import { colors, fonts } from '../helpers/styles';
import { OfferBanner } from '../types/offerBanner';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const BANNER_WIDTH = SCREEN_WIDTH - 32;
const AUTO_SCROLL_MS = 4500;
const DINEOUT_GREEN = '#004B36';

const FALLBACK_BANNERS: OfferBanner[] = [
  {
    id: 'fallback',
    title: '50% OFF',
    subtitle: 'Nearby Stores',
    badgeLabel: 'LIMITED TIME',
  },
];

type PromoBannerCarouselProps = {
  banners: OfferBanner[];
  isLoading?: boolean;
  resolveImageUrl: (path?: string | null) => string | undefined;
};

const PromoBannerCarousel: React.FC<PromoBannerCarouselProps> = ({
  banners,
  isLoading = false,
  resolveImageUrl,
}) => {
  const scrollRef = useRef<ScrollView>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const slides = useMemo(
    () => (banners.length > 0 ? banners : FALLBACK_BANNERS),
    [banners],
  );

  useEffect(() => {
    setActiveIndex(0);
    scrollRef.current?.scrollTo({ x: 0, animated: false });
  }, [slides]);

  useEffect(() => {
    if (slides.length <= 1) {
      return;
    }

    const intervalId = setInterval(() => {
      setActiveIndex(currentIndex => {
        const nextIndex = (currentIndex + 1) % slides.length;
        scrollRef.current?.scrollTo({ x: nextIndex * BANNER_WIDTH, animated: true });
        return nextIndex;
      });
    }, AUTO_SCROLL_MS);

    return () => clearInterval(intervalId);
  }, [slides.length]);

  const handleMomentumScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const nextIndex = Math.round(event.nativeEvent.contentOffset.x / BANNER_WIDTH);
    setActiveIndex(nextIndex);
  };

  const renderSlide = (banner: OfferBanner) => {
    const imageUri = resolveImageUrl(banner.image);

    const content = (
      <>
        <View style={styles.promoBannerGlow} />
        <View style={styles.promoBannerGlowSecondary} />
        <View style={styles.promoBannerCopy}>
          <View style={styles.promoBannerBadge}>
            <MaterialCommunityIcons name="fire" size={14} color="#FFE28A" />
            <Text style={styles.promoBannerBadgeText}>{banner.badgeLabel || 'LIMITED TIME'}</Text>
          </View>
          <Text style={styles.promoBannerTitle} numberOfLines={1}>
            {banner.title}
          </Text>
          {banner.subtitle ? (
            <Text style={styles.promoBannerSubtitle} numberOfLines={1}>
              {banner.subtitle}
            </Text>
          ) : null}
          <View style={styles.promoBannerCountdown}>
            <MaterialCommunityIcons name="clock-outline" size={14} color={colors.white} />
            {banner.expiresAt ? (
              <OfferCountdownText
                expiresAt={banner.expiresAt}
                suffix=" remaining"
                style={styles.promoBannerCountdownText}
              />
            ) : (
              <Text style={styles.promoBannerCountdownText}>Limited time offer</Text>
            )}
          </View>
        </View>

        <View style={styles.promoArtwork}>
          <View style={[styles.promoGiftBox, styles.promoGiftBoxLarge]}>
            <MaterialCommunityIcons name="store-outline" size={32} color={DINEOUT_GREEN} />
          </View>
          <View style={[styles.promoGiftBox, styles.promoGiftBoxSmall]}>
            <MaterialCommunityIcons name="gift-outline" size={23} color="#9A6500" />
          </View>
          <View style={styles.promoCoin}>
            <Text style={styles.promoCoinText}>₹</Text>
          </View>
        </View>
      </>
    );

    if (imageUri) {
      return (
        <ImageBackground source={{ uri: imageUri }} style={styles.promoBanner} imageStyle={styles.promoBannerImage}>
          <View style={styles.promoBannerImageOverlay}>{content}</View>
        </ImageBackground>
      );
    }

    return <View style={styles.promoBanner}>{content}</View>;
  };

  return (
    <View style={styles.promoBannerSection}>
      {isLoading ? (
        <View style={[styles.promoBanner, styles.promoBannerLoading]}>
          <ActivityIndicator size="small" color={colors.white} />
        </View>
      ) : (
        <>
          <ScrollView
            ref={scrollRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            decelerationRate="fast"
            snapToInterval={BANNER_WIDTH}
            snapToAlignment="start"
            disableIntervalMomentum
            onMomentumScrollEnd={handleMomentumScrollEnd}
            contentContainerStyle={styles.carouselContent}
          >
            {slides.map(banner => (
              <View key={banner.id} style={styles.slide}>
                {renderSlide(banner)}
              </View>
            ))}
          </ScrollView>

          {slides.length > 1 ? (
            <View style={styles.dotsRow}>
              {slides.map((banner, index) => (
                <View
                  key={`${banner.id}-dot`}
                  style={[styles.dot, index === activeIndex && styles.dotActive]}
                />
              ))}
            </View>
          ) : null}
        </>
      )}
    </View>
  );
};

export default PromoBannerCarousel;

const styles = StyleSheet.create({
  promoBannerSection: {
    marginHorizontal: 16,
    marginBottom: 17,
  },
  carouselContent: {
    alignItems: 'stretch',
  },
  slide: {
    width: BANNER_WIDTH,
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
  promoBannerLoading: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  promoBannerImage: {
    borderRadius: 23,
  },
  promoBannerImageOverlay: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 75, 54, 0.72)',
    borderRadius: 23,
    paddingHorizontal: 17,
    paddingVertical: 19,
    minHeight: 175,
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
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#C5D0E0',
  },
  dotActive: {
    width: 18,
    backgroundColor: colors.primary,
  },
});
