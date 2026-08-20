import { Platform, ViewStyle } from 'react-native';
import { colors } from '../../../helpers/styles';

/**
 * Bachat Circle palette — mapped to the shared app theme in helpers/styles.
 * Keep semantic keys (green/orange) so existing screens keep compiling,
 * but values come only from the real brand colors.
 */
export const circleColors = {
  // Primary brand (was PDF forest green)
  green: colors.primary,
  greenDark: colors.primaryDark,
  greenMid: colors.primary,
  greenSoft: colors.primarySoft,
  greenBanner: colors.primarySoft,
  greenBorder: colors.primaryBorder,
  greenWash: colors.primarySoft,

  // Secondary / accent (was PDF orange) — app savings green
  orange: colors.darkgreen,
  orangeSoft: colors.pastelGreen,
  orangeBorder: colors.pastelGreen,
  orangeMid: colors.lightgreen,

  // Surfaces
  cream: colors.bg,
  creamDeep: colors.bg,
  page: colors.searchBg,
  white: colors.white,
  card: colors.card,
  chipGray: colors.searchBg,

  // Text & borders
  text: colors.text,
  muted: colors.mutedText,
  mutedSoft: colors.lighterGray,
  border: colors.borderGray,
  borderSoft: colors.primarySoft,

  // Status
  red: colors.red,
  redSoft: '#FFE5E5',
  badgeRed: colors.gradientRed,
  adminGold: colors.yellow,
  star: colors.yellow,
  online: colors.darkgreen,
  tabInactive: colors.lighterGray,
};

export const circleShadow = {
  soft: Platform.select<ViewStyle>({
    ios: {
      shadowColor: colors.primary,
      shadowOpacity: 0.08,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 4 },
    },
    android: { elevation: 3 },
    default: {},
  }),
  card: Platform.select<ViewStyle>({
    ios: {
      shadowColor: colors.darkblue,
      shadowOpacity: 0.1,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 3 },
    },
    android: { elevation: 4 },
    default: {},
  }),
  float: Platform.select<ViewStyle>({
    ios: {
      shadowColor: colors.darkgreen,
      shadowOpacity: 0.28,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 4 },
    },
    android: { elevation: 6 },
    default: {},
  }),
  cta: Platform.select<ViewStyle>({
    ios: {
      shadowColor: colors.primary,
      shadowOpacity: 0.28,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 5 },
    },
    android: { elevation: 5 },
    default: {},
  }),
};
