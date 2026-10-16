import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  Image,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import OfferCountdownText from './OfferCountdownText';
import { colors, fonts } from '../helpers/styles';
import { OfferBanner } from '../types/offerBanner';

const logoSource = require('../assets/image/BachatBazaarLogo.png');

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const BANNER_WIDTH = SCREEN_WIDTH - 32;
const BANNER_RADIUS = 22;
const BANNER_HEIGHT = Math.round(BANNER_WIDTH * (9 / 16));
const AUTO_SCROLL_MS = 4500;

type PromoBannerCarouselProps = {
  banners: OfferBanner[];
  isLoading?: boolean;
  resolveImageUrl: (path?: string | null) => string | undefined;
  onBannerPress?: (banner: OfferBanner) => void;
};

const BannerShimmer = () => {
  const shift = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(shift, {
        toValue: 1,
        duration: 1200,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => {
      loop.stop();
      shift.setValue(0);
    };
  }, [shift]);

  const translateX = shift.interpolate({
    inputRange: [0, 1],
    outputRange: [-BANNER_WIDTH, BANNER_WIDTH],
  });

  return (
    <View style={styles.shimmerRoot} pointerEvents="none">
      <View style={styles.shimmerBase} />
      <Animated.View style={[styles.shimmerSweep, { transform: [{ translateX }] }]}>
        <LinearGradient
          colors={['transparent', 'rgba(255,255,255,0.55)', 'transparent']}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={styles.shimmerGradient}
        />
      </Animated.View>
    </View>
  );
};

const DefaultBannerArt = () => (
  <LinearGradient
    colors={['#1B4FBF', colors.primary, '#7AA2F5']}
    start={{ x: 0, y: 0 }}
    end={{ x: 1, y: 1 }}
    style={styles.defaultArt}
  >
    <Image source={logoSource} style={styles.defaultLogo} resizeMode="stretch" />
    <Text style={styles.defaultTitle}>Best Deals Near You</Text>
    <Text style={styles.defaultSubtitle}>Shop local. Save more every day.</Text>
  </LinearGradient>
);

const BannerFrame = ({
  imageUri,
  forceShimmer = false,
  children,
}: {
  imageUri?: string;
  forceShimmer?: boolean;
  children?: React.ReactNode;
}) => {
  const [imageState, setImageState] = useState<'idle' | 'loading' | 'ready' | 'error'>(
    imageUri ? 'loading' : 'idle',
  );

  useEffect(() => {
    setImageState(imageUri ? 'loading' : 'idle');
  }, [imageUri]);

  const showImage = Boolean(imageUri) && imageState !== 'error';
  const showShimmer = forceShimmer || imageState === 'loading';

  return (
    <View style={styles.promoBannerShadow}>
      <View style={styles.promoBannerShell}>
        <View style={styles.promoBanner}>
          <DefaultBannerArt />
          {showImage ? (
            <Image
              source={{ uri: imageUri }}
              style={styles.bannerPhoto}
              resizeMode="stretch"
              onLoadStart={() => setImageState('loading')}
              onLoad={() => setImageState('ready')}
              onError={() => setImageState('error')}
            />
          ) : null}
          {showShimmer ? <BannerShimmer /> : null}
          {children}
        </View>
      </View>
    </View>
  );
};

const PromoBannerCarousel: React.FC<PromoBannerCarouselProps> = ({
  banners,
  isLoading = false,
  resolveImageUrl,
  onBannerPress,
}) => {
  const scrollRef = useRef<ScrollView>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const slides = useMemo(() => banners, [banners]);

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
    if (Number.isFinite(nextIndex)) {
      setActiveIndex(Math.max(0, Math.min(slides.length - 1, nextIndex)));
    }
  };

  const renderOverlay = (banner: OfferBanner) => {
    const showText = banner.isTextShown !== false;
    const showTitle = showText && Boolean(banner.title?.trim());
    const showSubtitle = showText && Boolean(banner.subtitle?.trim());
    const showBadge = showText && Boolean(banner.badgeLabel?.trim());
    const showCountdown = showText && Boolean(banner.expiresAt);
    if (!showTitle && !showSubtitle && !showBadge && !showCountdown) {
      return null;
    }

    return (
      <LinearGradient
        colors={['rgba(255,255,255,0.04)', 'rgba(8,14,28,0.18)', 'rgba(8,14,28,0.58)']}
        locations={[0, 0.45, 1]}
        style={styles.promoBannerCopyWrap}
        pointerEvents="none"
      >
        {showBadge ? (
          <View style={styles.promoBannerBadge}>
            <Text style={styles.promoBannerBadgeText}>{banner.badgeLabel}</Text>
          </View>
        ) : null}
        {showTitle ? (
          <Text style={styles.promoBannerTitle} numberOfLines={2}>
            {banner.title}
          </Text>
        ) : null}
        {showSubtitle ? (
          <Text style={styles.promoBannerSubtitle} numberOfLines={2}>
            {banner.subtitle}
          </Text>
        ) : null}
        {showCountdown ? (
          <View style={styles.promoBannerCountdown}>
            <OfferCountdownText
              expiresAt={banner.expiresAt}
              suffix=" remaining"
              style={styles.promoBannerCountdownText}
            />
          </View>
        ) : null}
      </LinearGradient>
    );
  };

  const renderSlide = (banner: OfferBanner) => {
    const imageUri = resolveImageUrl(banner.image);
    const content = <BannerFrame imageUri={imageUri}>{renderOverlay(banner)}</BannerFrame>;

    if (!onBannerPress) {
      return content;
    }

    return (
      <TouchableOpacity
        activeOpacity={0.92}
        onPress={() => onBannerPress(banner)}
        accessibilityRole="button"
        accessibilityLabel={`Open banner details for ${banner.title || 'offer'}`}
      >
        {content}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.promoBannerSection}>
      {isLoading ? (
        <BannerFrame forceShimmer />
      ) : slides.length === 0 ? (
        <BannerFrame />
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
  },
  promoBannerShadow: {
    width: BANNER_WIDTH,
    borderRadius: BANNER_RADIUS,
    backgroundColor: colors.white,
    shadowColor: '#101828',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  promoBannerShell: {
    width: BANNER_WIDTH,
    height: BANNER_HEIGHT,
    borderRadius: BANNER_RADIUS,
    overflow: 'hidden',
    backgroundColor: '#E8EEF8',
  },
  promoBanner: {
    width: BANNER_WIDTH,
    height: BANNER_HEIGHT,
    overflow: 'hidden',
    justifyContent: 'flex-end',
    backgroundColor: '#E8EEF8',
  },
  bannerPhoto: {
    ...StyleSheet.absoluteFillObject,
    width: BANNER_WIDTH,
    height: BANNER_HEIGHT,
  },
  defaultArt: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  defaultLogo: {
    width: 64,
    height: 64,
    marginBottom: 10,
  },
  defaultTitle: {
    color: colors.white,
    fontSize: 20,
    lineHeight: 24,
    fontFamily: fonts.BOLD,
    textAlign: 'center',
  },
  defaultSubtitle: {
    marginTop: 4,
    color: 'rgba(255,255,255,0.9)',
    fontSize: 13,
    fontFamily: fonts.BOLD,
    textAlign: 'center',
  },
  shimmerRoot: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  shimmerBase: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(232,238,248,0.55)',
  },
  shimmerSweep: {
    ...StyleSheet.absoluteFillObject,
  },
  shimmerGradient: {
    width: BANNER_WIDTH * 0.45,
    height: '100%',
  },
  promoBannerCopyWrap: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 14,
  },
  promoBannerBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.28)',
  },
  promoBannerBadgeText: {
    color: colors.white,
    fontSize: 10,
    fontFamily: fonts.BOLD,
    letterSpacing: 0.6,
  },
  promoBannerTitle: {
    color: colors.white,
    fontSize: 20,
    lineHeight: 24,
    fontFamily: fonts.BOLD,
    letterSpacing: -0.3,
    textShadowColor: 'rgba(0,0,0,0.45)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  promoBannerSubtitle: {
    color: 'rgba(255,255,255,0.92)',
    fontSize: 13,
    lineHeight: 18,
    fontFamily: fonts.BOLD,
    marginTop: 4,
    textShadowColor: 'rgba(0,0,0,0.35)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
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
