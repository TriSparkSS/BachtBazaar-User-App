import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts } from '../helpers/styles';

export type FeatureWalkthroughStep = {
  id: string;
  title: string;
  description: string;
  icon: string;
};

export type WalkthroughTargetRect = {
  x: number;
  y: number;
  width: number;
  height: number;
  /** Optional corner radius hint for the spotlight hole */
  radius?: number;
};

export const FEATURE_WALKTHROUGH_STEPS: FeatureWalkthroughStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to Bachat Bazaar',
    description:
      'Discover nearby shops, exclusive local offers, and daily savings — all in one place.',
    icon: 'hand-wave-outline',
  },
  {
    id: 'search',
    title: 'Search products & stores',
    description:
      'Use the search bar at the top to find products, services, and stores near you.',
    icon: 'magnify',
  },
  {
    id: 'categories',
    title: 'Browse categories',
    description:
      'Swipe the categories strip to filter nearby shops and offers by what you need.',
    icon: 'view-grid-outline',
  },
  {
    id: 'offers',
    title: 'Local offers & shops',
    description:
      'Explore Local Offers below — open a shop, save favorites with the heart, and grab deals.',
    icon: 'storefront-outline',
  },
  {
    id: 'cart',
    title: 'Cart & header actions',
    description:
      'Open your cart from the header to review items and send delivery requests.',
    icon: 'cart-outline',
  },
  {
    id: 'rewards',
    title: 'Daily rewards calendar',
    description:
      'Tap Daily Rewards in quick actions to claim calendar bonuses and track your streaks.',
    icon: 'calendar-star',
  },
  {
    id: 'menu',
    title: 'Side menu for Help & more',
    description:
      'Open the menu for Help, Delivery orders, Settings, Language, FAQ, and account options.',
    icon: 'menu',
  },
];

type FeatureWalkthroughProps = {
  visible: boolean;
  onComplete: () => void;
  steps?: FeatureWalkthroughStep[];
  /** Measured window rects keyed by step.id */
  targets?: Partial<Record<string, WalkthroughTargetRect | null | undefined>>;
  /** Called when the active step changes so the host can remeasure / scroll */
  onStepChange?: (stepId: string, stepIndex: number) => void;
};

const SPOTLIGHT_PADDING = 6;
const DEFAULT_SPOTLIGHT_RADIUS = 16;
const TOOLTIP_GAP = 14;
const ARROW_SIZE = 10;
const TOOLTIP_EST_HEIGHT = 210;
const SIDE_MARGIN = 18;
const MASK_COLOR = 'rgba(15, 23, 42, 0.68)';
/** Deep Bachat blue card (FinX-style coach mark). */
const CARD_BG = colors.primary;
const CARD_BG_SOFT = colors.primaryDark;

const STEP_RADIUS: Record<string, number> = {
  welcome: 14,
  search: 18,
  categories: 18,
  offers: 18,
  cart: 14,
  rewards: 18,
  menu: 14,
};

const roundedRectPath = (
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): string => {
  const radius = Math.max(0, Math.min(r, w / 2, h / 2));
  return [
    `M${x + radius},${y}`,
    `H${x + w - radius}`,
    `Q${x + w},${y} ${x + w},${y + radius}`,
    `V${y + h - radius}`,
    `Q${x + w},${y + h} ${x + w - radius},${y + h}`,
    `H${x + radius}`,
    `Q${x},${y + h} ${x},${y + h - radius}`,
    `V${y + radius}`,
    `Q${x},${y} ${x + radius},${y} Z`,
  ].join(' ');
};

const expandRect = (
  rect: WalkthroughTargetRect,
  padding: number,
  screenW: number,
  screenH: number,
): WalkthroughTargetRect => {
  const x = Math.max(0, rect.x - padding);
  const y = Math.max(0, rect.y - padding);
  const right = Math.min(screenW, rect.x + rect.width + padding);
  const bottom = Math.min(screenH, rect.y + rect.height + padding);
  return {
    x,
    y,
    width: Math.max(0, right - x),
    height: Math.max(0, bottom - y),
    radius: rect.radius,
  };
};

const isValidRect = (
  rect?: WalkthroughTargetRect | null,
): rect is WalkthroughTargetRect =>
  !!rect &&
  Number.isFinite(rect.x) &&
  Number.isFinite(rect.y) &&
  rect.width > 8 &&
  rect.height > 8;

const FeatureWalkthrough = ({
  visible,
  onComplete,
  steps = FEATURE_WALKTHROUGH_STEPS,
  targets,
  onStepChange,
}: FeatureWalkthroughProps) => {
  const insets = useSafeAreaInsets();
  const [stepIndex, setStepIndex] = useState(0);
  const [tooltipHeight, setTooltipHeight] = useState(TOOLTIP_EST_HEIGHT);
  const [windowSize, setWindowSize] = useState(() => Dimensions.get('window'));
  const fadeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const sub = Dimensions.addEventListener('change', ({ window }) => {
      setWindowSize(window);
    });
    return () => sub?.remove();
  }, []);

  useEffect(() => {
    if (visible) {
      setStepIndex(0);
      setTooltipHeight(TOOLTIP_EST_HEIGHT);
      fadeAnim.setValue(1);
    }
  }, [visible, fadeAnim]);

  useEffect(() => {
    setTooltipHeight(TOOLTIP_EST_HEIGHT);
    fadeAnim.setValue(0);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }, [stepIndex, fadeAnim]);

  const total = steps.length;
  const step = steps[Math.min(stepIndex, Math.max(total - 1, 0))];
  const isLast = stepIndex >= total - 1;

  useEffect(() => {
    if (!visible || !step) {
      return;
    }
    onStepChange?.(step.id, stepIndex);
  }, [visible, step, stepIndex, onStepChange]);

  const finish = useCallback(() => {
    setStepIndex(0);
    onComplete();
  }, [onComplete]);

  /** Advance to the next step (or finish on last). */
  const handleNext = useCallback(() => {
    if (isLast) {
      finish();
      return;
    }
    setStepIndex(prev => Math.min(prev + 1, total - 1));
  }, [finish, isLast, total]);

  /**
   * Skip THIS tip only — advances to the next step.
   * Does not mark complete / dismiss the whole tour (except on last step).
   */
  const handleSkip = useCallback(() => {
    handleNext();
  }, [handleNext]);

  /** ✕ / back — exit entire walkthrough and mark complete. */
  const handleCloseTour = useCallback(() => {
    finish();
  }, [finish]);

  const screenW = windowSize.width;
  const screenH = windowSize.height;
  const rawTarget = step ? targets?.[step.id] : undefined;
  const hasSpotlight = isValidRect(rawTarget);
  const spotlightRadius =
    (hasSpotlight && rawTarget.radius) ||
    (step ? STEP_RADIUS[step.id] : undefined) ||
    DEFAULT_SPOTLIGHT_RADIUS;
  const spotlight = hasSpotlight
    ? expandRect(rawTarget, SPOTLIGHT_PADDING, screenW, screenH)
    : null;

  const maskPath = useMemo(() => {
    const outer = `M0,0 H${screenW} V${screenH} H0 Z`;
    if (!spotlight) {
      return outer;
    }
    return `${outer} ${roundedRectPath(
      spotlight.x,
      spotlight.y,
      spotlight.width,
      spotlight.height,
      spotlightRadius,
    )}`;
  }, [screenW, screenH, spotlight, spotlightRadius]);

  const tooltipLayout = useMemo(() => {
    const maxWidth = Math.min(screenW - SIDE_MARGIN * 2, 340);
    const topSafe = Math.max(insets.top, SIDE_MARGIN);
    const bottomSafe = screenH - Math.max(insets.bottom, SIDE_MARGIN);

    if (!spotlight) {
      return {
        mode: 'centered' as const,
        left: (screenW - maxWidth) / 2,
        width: maxWidth,
        top: undefined as number | undefined,
        placeAbove: false,
        arrowLeft: maxWidth / 2 - ARROW_SIZE,
      };
    }

    const estimated = Math.max(tooltipHeight, 170);
    const spaceBelow = bottomSafe - (spotlight.y + spotlight.height + TOOLTIP_GAP);
    const spaceAbove = spotlight.y - TOOLTIP_GAP - topSafe;
    const placeAbove = spaceBelow < estimated && spaceAbove > spaceBelow;

    let top = placeAbove
      ? spotlight.y - TOOLTIP_GAP - estimated
      : spotlight.y + spotlight.height + TOOLTIP_GAP;

    if (!placeAbove) {
      top = Math.max(top, spotlight.y + spotlight.height + TOOLTIP_GAP);
    } else {
      top = Math.min(top, spotlight.y - TOOLTIP_GAP - estimated);
    }
    top = Math.max(topSafe, Math.min(top, bottomSafe - estimated));

    const tooltipBottom = top + estimated;
    const overlapsHole =
      top < spotlight.y + spotlight.height && tooltipBottom > spotlight.y;
    if (overlapsHole) {
      if (!placeAbove && spaceAbove >= estimated * 0.7) {
        top = Math.max(topSafe, spotlight.y - TOOLTIP_GAP - estimated);
      } else if (placeAbove && spaceBelow >= estimated * 0.7) {
        top = Math.min(
          bottomSafe - estimated,
          spotlight.y + spotlight.height + TOOLTIP_GAP,
        );
      }
    }

    const highlightCenterX = spotlight.x + spotlight.width / 2;
    let left = highlightCenterX - maxWidth / 2;
    left = Math.max(SIDE_MARGIN, Math.min(left, screenW - SIDE_MARGIN - maxWidth));
    const arrowLeft = Math.max(
      22,
      Math.min(
        highlightCenterX - left - ARROW_SIZE,
        maxWidth - 22 - ARROW_SIZE * 2,
      ),
    );

    const finalPlaceAbove =
      top + estimated / 2 < spotlight.y + spotlight.height / 2;

    return {
      mode: 'anchored' as const,
      left,
      width: maxWidth,
      top,
      placeAbove: finalPlaceAbove,
      arrowLeft,
    };
  }, [spotlight, screenW, screenH, insets.top, insets.bottom, tooltipHeight]);

  if (!step) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={handleCloseTour}
    >
      <View style={styles.root} pointerEvents="box-none">
        <Svg width={screenW} height={screenH} style={StyleSheet.absoluteFill}>
          <Path d={maskPath} fill={MASK_COLOR} fillRule="evenodd" />
          {spotlight ? (
            <>
              <Rect
                x={spotlight.x - 4}
                y={spotlight.y - 4}
                width={spotlight.width + 8}
                height={spotlight.height + 8}
                rx={spotlightRadius + 4}
                ry={spotlightRadius + 4}
                fill="transparent"
                stroke="#FFFFFF"
                strokeWidth={5}
                opacity={0.12}
              />
              <Rect
                x={spotlight.x - 1}
                y={spotlight.y - 1}
                width={spotlight.width + 2}
                height={spotlight.height + 2}
                rx={spotlightRadius + 1}
                ry={spotlightRadius + 1}
                fill="transparent"
                stroke="#FFFFFF"
                strokeWidth={2}
                opacity={0.5}
              />
            </>
          ) : null}
        </Svg>

        <Animated.View
          style={[
            styles.tooltipLayer,
            { opacity: fadeAnim },
            tooltipLayout.mode === 'centered'
              ? styles.tooltipCentered
              : {
                  position: 'absolute',
                  left: tooltipLayout.left,
                  top: tooltipLayout.top,
                  width: tooltipLayout.width,
                },
            tooltipLayout.mode === 'centered'
              ? {
                  marginTop: Math.max(insets.top, SIDE_MARGIN) + 36,
                  marginBottom: Math.max(insets.bottom, SIDE_MARGIN) + 24,
                  width: tooltipLayout.width,
                  alignSelf: 'center',
                }
              : null,
          ]}
          pointerEvents="box-none"
        >
          {tooltipLayout.mode === 'anchored' && !tooltipLayout.placeAbove ? (
            <View
              style={[
                styles.arrowUp,
                { marginLeft: tooltipLayout.arrowLeft },
              ]}
            />
          ) : null}

          <View
            style={styles.card}
            onLayout={event => {
              const next = event.nativeEvent.layout.height + ARROW_SIZE;
              if (next > 0 && Math.abs(next - tooltipHeight) > 2) {
                setTooltipHeight(next);
              }
            }}
          >
            <View style={styles.headerRow}>
              <View style={styles.iconCircle}>
                <MaterialCommunityIcons
                  name={step.icon}
                  size={22}
                  color={CARD_BG}
                />
              </View>
              <View style={styles.headerSpacer} />
              <TouchableOpacity
                onPress={handleCloseTour}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                activeOpacity={0.7}
                style={styles.closeBtn}
                accessibilityLabel="Close tour"
              >
                <Text style={styles.closeText}>✕</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.title} numberOfLines={2}>
              {step.title}
            </Text>
            <Text style={styles.description} numberOfLines={4}>
              {step.description}
            </Text>

            <View style={styles.footer}>
              <TouchableOpacity
                onPress={handleSkip}
                hitSlop={{ top: 10, bottom: 10, left: 8, right: 8 }}
                activeOpacity={0.7}
                style={styles.footerSide}
              >
                <Text style={styles.skipText}>Skip</Text>
              </TouchableOpacity>

              <Text style={styles.stepCounter}>
                {stepIndex + 1} of {total}
              </Text>

              <TouchableOpacity
                style={styles.primaryButton}
                onPress={handleNext}
                activeOpacity={0.88}
              >
                <Text style={styles.primaryButtonText}>
                  {isLast ? 'Done' : 'Next'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {tooltipLayout.mode === 'anchored' && tooltipLayout.placeAbove ? (
            <View
              style={[
                styles.arrowDown,
                { marginLeft: tooltipLayout.arrowLeft },
              ]}
            />
          ) : null}
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  tooltipLayer: {
    zIndex: 2,
  },
  tooltipCentered: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: SIDE_MARGIN,
  },
  arrowUp: {
    width: 0,
    height: 0,
    borderLeftWidth: ARROW_SIZE,
    borderRightWidth: ARROW_SIZE,
    borderBottomWidth: ARROW_SIZE,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: CARD_BG,
    marginBottom: -1,
    alignSelf: 'flex-start',
  },
  arrowDown: {
    width: 0,
    height: 0,
    borderLeftWidth: ARROW_SIZE,
    borderRightWidth: ARROW_SIZE,
    borderTopWidth: ARROW_SIZE,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: CARD_BG,
    marginTop: -1,
    alignSelf: 'flex-start',
  },
  card: {
    backgroundColor: CARD_BG,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 14,
    borderWidth: 1,
    borderColor: CARD_BG_SOFT,
    shadowColor: '#0F172A',
    shadowOpacity: 0.35,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 14 },
    elevation: 18,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerSpacer: {
    flex: 1,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  closeText: {
    fontSize: 14,
    color: colors.white,
    fontFamily: fonts.BOLD,
    lineHeight: 18,
  },
  title: {
    fontSize: 17,
    lineHeight: 22,
    fontFamily: fonts.BOLD,
    color: colors.white,
    marginBottom: 6,
  },
  description: {
    fontSize: 13,
    lineHeight: 19,
    color: 'rgba(255,255,255,0.88)',
    marginBottom: 14,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.22)',
    paddingTop: 12,
  },
  footerSide: {
    minWidth: 48,
  },
  skipText: {
    fontSize: 14,
    fontFamily: fonts.BOLD,
    color: 'rgba(255,255,255,0.85)',
  },
  stepCounter: {
    flex: 1,
    textAlign: 'center',
    fontSize: 13,
    fontFamily: fonts.BOLD,
    color: 'rgba(255,255,255,0.72)',
  },
  primaryButton: {
    backgroundColor: colors.white,
    borderRadius: 10,
    minHeight: 36,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 72,
  },
  primaryButtonText: {
    color: CARD_BG,
    fontSize: 14,
    fontFamily: fonts.BOLD,
  },
});

export default FeatureWalkthrough;
