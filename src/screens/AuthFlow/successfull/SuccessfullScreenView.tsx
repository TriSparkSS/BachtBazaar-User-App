import React, { useEffect, useRef } from 'react';
import {
  Animated,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import AnimatedScreen from '../../../components/AnimatedScreen';
import { ScreenScaffold } from '../../../components/ScreenScaffold';
import LogoSVG from '../../../assets/image/BachatBazaarLogo.svg';
import VectorSVG from '../../../assets/image/Vector.svg';
import { colors, fonts } from '../../../helpers/styles';

const { width, height } = Dimensions.get('window');

interface SuccessfullScreenViewProps {
  onGoToDashboard: () => void;
  onSetUpProfile: () => void;
  isNewUser?: boolean;
  isSubmitting?: boolean;
}

const perks = [
  { icon: 'tag-multiple-outline', label: 'Local deals' },
  { icon: 'storefront-outline', label: 'Nearby shops' },
  { icon: 'wallet-outline', label: 'Smart savings' },
];

const SuccessfullScreenView: React.FC<SuccessfullScreenViewProps> = ({
  onGoToDashboard,
  onSetUpProfile,
  isNewUser = true,
  isSubmitting = false,
}) => {
  const scaleAnim = useRef(new Animated.Value(0.85)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 6,
        tension: 80,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 420,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, scaleAnim]);

  return (
    <ScreenScaffold
      background={
        <>
          <View style={styles.heroWash} />
          <View style={styles.topGlow} />
          <View style={styles.bottomGlow} />
          <View style={styles.topRightVector}>
            <VectorSVG width={120} height={120} />
          </View>
        </>
      }>
      <AnimatedScreen style={styles.animatedScreen}>
        <View style={styles.logoContainer}>
          <View style={styles.logoHalo}>
            <LogoSVG width={72} height={72} />
          </View>
          <View style={styles.badge}>
            <View style={styles.badgeDot} />
            <Text style={styles.badgeText}>ACCOUNT READY</Text>
          </View>
          <Text style={styles.title}>You're all set!</Text>
          <Text style={styles.subtitle}>
            {isNewUser
              ? 'Your Bachat Bazaar account is live. Start exploring deals or finish your profile.'
              : 'Welcome back! Your account is verified and ready to use.'}
          </Text>
        </View>

        <Animated.View
          style={[
            styles.card,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}>
          <View style={styles.successIconWrap}>
            <View style={styles.successIconRing}>
              <MaterialCommunityIcons
                name="check-bold"
                size={42}
                color={colors.white}
              />
            </View>
          </View>

          <Text style={styles.cardTitle}>Registration successful</Text>
          <Text style={styles.cardCopy}>
            {isNewUser
              ? 'Password saved securely. You can browse offers now or add a profile photo and details.'
              : 'You can continue to your dashboard and pick up where you left off.'}
          </Text>

          <View style={styles.perksRow}>
            {perks.map(perk => (
              <View key={perk.label} style={styles.perkChip}>
                <MaterialCommunityIcons
                  name={perk.icon as 'tag-multiple-outline'}
                  size={18}
                  color={colors.primary}
                />
                <Text style={styles.perkText}>{perk.label}</Text>
              </View>
            ))}
          </View>

          <TouchableOpacity
            style={[styles.primaryButton, isSubmitting && styles.buttonDisabled]}
            onPress={onGoToDashboard}
            disabled={isSubmitting}
            activeOpacity={0.86}>
            {isSubmitting ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <>
                <Text style={styles.primaryButtonText}>Go to Dashboard</Text>
                <MaterialCommunityIcons
                  name="arrow-right"
                  size={20}
                  color={colors.white}
                />
              </>
            )}
          </TouchableOpacity>

          {isNewUser ? (
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={onSetUpProfile}
              disabled={isSubmitting}
              activeOpacity={0.78}>
              <MaterialCommunityIcons
                name="account-edit-outline"
                size={18}
                color={colors.primaryDark}
              />
              <Text style={styles.secondaryButtonText}>Set up your profile</Text>
            </TouchableOpacity>
          ) : null}

          <View style={styles.securityNote}>
            <MaterialCommunityIcons
              name="shield-check-outline"
              size={16}
              color={colors.darkgreen}
            />
            <Text style={styles.securityText}>
              Your session is saved securely on this device.
            </Text>
          </View>
        </Animated.View>
      </AnimatedScreen>
    </ScreenScaffold>
  );
};

export default SuccessfullScreenView;

const styles = StyleSheet.create({
  heroWash: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: Math.max(315, height * 0.35),
    backgroundColor: '#EAF2FF',
    borderBottomLeftRadius: 54,
    borderBottomRightRadius: 54,
  },
  topGlow: {
    position: 'absolute',
    width: 230,
    height: 230,
    borderRadius: 115,
    backgroundColor: '#D9E7FF',
    top: -112,
    left: -88,
    opacity: 0.78,
  },
  bottomGlow: {
    position: 'absolute',
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: '#E8F8F0',
    bottom: -145,
    right: -110,
    opacity: 0.8,
  },
  topRightVector: {
    position: 'absolute',
    top: -4,
    right: -6,
    width: 120,
    height: 120,
    opacity: 0.7,
  },
  animatedScreen: {
    width: '100%',
    alignItems: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 20,
    maxWidth: 390,
    paddingHorizontal: 12,
  },
  logoHalo: {
    width: 88,
    height: 88,
    borderRadius: 28,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.95)',
    shadowColor: '#2457B8',
    shadowOffset: { width: 0, height: 9 },
    shadowOpacity: 0.14,
    shadowRadius: 18,
    elevation: 6,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.86)',
    borderRadius: 100,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.95)',
    paddingHorizontal: 13,
    paddingVertical: 7,
    marginBottom: 12,
    shadowColor: '#285CB8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 2,
  },
  badgeDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.darkgreen,
    marginRight: 8,
  },
  badgeText: {
    fontSize: 10,
    letterSpacing: 0.9,
    color: colors.primaryDark,
    fontFamily: fonts.BOLD,
  },
  title: {
    fontSize: 27,
    color: colors.text,
    fontFamily: fonts.BOLD,
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    color: '#5F6D84',
    textAlign: 'center',
    marginTop: 7,
    maxWidth: 330,
    fontFamily: fonts.BOLD,
  },
  card: {
    width: Math.min(width - 32, 430),
    backgroundColor: colors.white,
    borderRadius: 28,
    paddingHorizontal: 22,
    paddingTop: 24,
    paddingBottom: 22,
    alignItems: 'center',
    shadowColor: '#173E7A',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.14,
    shadowRadius: 24,
    elevation: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#DCE6F7',
  },
  successIconWrap: {
    marginBottom: 16,
  },
  successIconRing: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.darkgreen,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.darkgreen,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.28,
    shadowRadius: 14,
    elevation: 6,
    borderWidth: 4,
    borderColor: '#E8F8F0',
  },
  cardTitle: {
    fontSize: 20,
    fontFamily: fonts.BOLD,
    color: colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  cardCopy: {
    fontSize: 13,
    lineHeight: 19,
    color: '#6D7B92',
    textAlign: 'center',
    marginBottom: 18,
    fontFamily: fonts.BOLD,
    paddingHorizontal: 4,
  },
  perksRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 20,
  },
  perkChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primarySoft,
    borderRadius: 100,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
  },
  perkText: {
    fontSize: 11,
    fontFamily: fonts.BOLD,
    color: colors.primaryDark,
  },
  primaryButton: {
    width: '100%',
    height: 54,
    backgroundColor: colors.primary,
    borderRadius: 15,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    shadowColor: colors.primaryDark,
    shadowOffset: { width: 0, height: 7 },
    shadowOpacity: 0.22,
    shadowRadius: 12,
    elevation: 5,
  },
  primaryButtonText: {
    fontSize: 15,
    color: colors.white,
    fontFamily: fonts.BOLD,
  },
  secondaryButton: {
    width: '100%',
    minHeight: 48,
    marginTop: 11,
    borderRadius: 14,
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  secondaryButtonText: {
    fontSize: 14,
    fontFamily: fonts.BOLD,
    color: colors.primaryDark,
  },
  buttonDisabled: {
    opacity: 0.75,
  },
  securityNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F1FBF6',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 16,
    width: '100%',
  },
  securityText: {
    flex: 1,
    color: '#607287',
    fontSize: 11.5,
    lineHeight: 16,
    fontFamily: fonts.BOLD,
  },
});
