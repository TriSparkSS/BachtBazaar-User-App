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
import OfferCountdownText from './OfferCountdownText';
import { colors, fonts } from '../helpers/styles';
import { OfferBanner } from '../types/offerBanner';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const BANNER_WIDTH = SCREEN_WIDTH - 32;
const BANNER_RADIUS = 30;
const AUTO_SCROLL_MS = 4500;

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
  const slides = useMemo(() => banners.filter(banner => Boolean(resolveImageUrl(banner.image))), [banners, resolveImageUrl]);

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
    if (!imageUri) {
      return null;
    }

    return (
      <View style={styles.promoBannerShadow}>
      <View style={styles.promoBannerShell}>
        <ImageBackground source={{ uri: imageUri }} style={styles.promoBanner} imageStyle={styles.promoBannerImage}>
        <View style={styles.promoBannerCopyWrap}>
          {banner.badgeLabel ? (
            <View style={styles.promoBannerBadge}>
              <Text style={styles.promoBannerBadgeText}>{banner.badgeLabel}</Text>
            </View>
          ) : null}
          <Text style={styles.promoBannerTitle} numberOfLines={1}>
            {banner.title}
          </Text>
          {banner.subtitle ? (
            <Text style={styles.promoBannerSubtitle} numberOfLines={1}>
              {banner.subtitle}
            </Text>
          ) : null}
          <View style={styles.promoBannerCountdown}>
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
        </ImageBackground>
      </View>
      </View>
    );
  };

  return (
    <View style={styles.promoBannerSection}>
      {isLoading ? (
        <View style={styles.promoBannerShadow}>
          <View style={styles.promoBannerShell}>
            <View style={[styles.promoBanner, styles.promoBannerLoading]}>
              <ActivityIndicator size="small" color={colors.white} />
            </View>
          </View>
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
    marginBottom: 16,
  },
  carouselContent: {
    alignItems: 'stretch',
  },
  slide: {
    width: BANNER_WIDTH,
    paddingVertical: 3,
  },
  promoBannerShadow: {
    borderRadius: BANNER_RADIUS,
    backgroundColor: '#FFF4EA',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 13 },
    shadowOpacity: 0.18,
    shadowRadius: 21,
    elevation: 8,
  },
  promoBannerShell: {
    borderRadius: BANNER_RADIUS,
    overflow: 'hidden',
    backgroundColor: '#FFF4EA',
  },
  promoBanner: {
    minHeight: 160,
    borderRadius: BANNER_RADIUS,
    overflow: 'hidden',
    justifyContent: 'flex-end',
    backgroundColor: '#D9E2F2',
  },
  promoBannerLoading: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  promoBannerImage: {
    borderRadius: BANNER_RADIUS,
  },
  promoBannerCopyWrap: {
    paddingHorizontal: 17,
    paddingVertical: 14,
  },
  promoBannerBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(0,0,0,0.16)',
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
    fontSize: 27,
    lineHeight: 31,
    fontFamily: fonts.BOLD,
    letterSpacing: -0.6,
  },
  promoBannerSubtitle: {
    color: 'rgba(255,255,255,0.86)',
    fontSize: 16,
    fontFamily: fonts.BOLD,
    marginTop: 2,
  },
  promoBannerCountdown: {
    alignSelf: 'flex-start',
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
