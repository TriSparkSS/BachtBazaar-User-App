import React, { useEffect, useRef } from 'react';
import {
  Animated,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import AnimatedScreen from '../../../components/AnimatedScreen';
import { ScreenScaffold } from '../../../components/ScreenScaffold';
import LogoSVG from '../../../assets/image/BachatBazaarLogo.svg';
import TickSVG from '../../../assets/image/Tick.svg';
import VectorSVG from '../../../assets/image/Vector.svg';
import { colors, fonts } from '../../../helpers/styles';

const { width, height } = Dimensions.get('window');

interface SuccessfullScreenViewProps {
  onGoToDashboard: () => void;
  onSetUpProfile: () => void;
  isNewUser?: boolean;
}

const SuccessfullScreenView: React.FC<SuccessfullScreenViewProps> = ({
  onGoToDashboard,
  onSetUpProfile,
  isNewUser = true,
}) => {
  const floatAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: -10,
          duration: 1100,
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 1100,
          useNativeDriver: true,
        }),
      ]),
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.06,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, [floatAnim, pulseAnim]);

  return (
    <ScreenScaffold
      backgroundColor={colors.white}
      background={
        <>
          <View style={styles.topGlow} />
          <View style={styles.bottomGlow} />
          <View style={styles.topRightVector}>
            <VectorSVG width={width * 0.4} height={width * 0.4} />
          </View>
          <View style={styles.bottomLeftVector}>
            <VectorSVG width={118} height={118} />
          </View>
        </>
      }>
      <AnimatedScreen>
          <View style={styles.logoContainer}>
            <LogoSVG width={100} height={100} />
            <View style={styles.titleContainer}>
              <Text style={styles.titleBachat}>Bachat</Text>
              <Text style={styles.titleBazaar}> Bazaar</Text>
            </View>
            <Text style={styles.subtitleSmall}>Discover Local Deals Near You</Text>
          </View>

          <View style={styles.card}>
            <Animated.View
              style={[
                styles.checkmarkOuter,
                {
                  transform: [{ translateY: floatAnim }, { scale: pulseAnim }],
                },
              ]}
            >
              <View style={styles.checkmarkInner}>
                <TickSVG width={50} height={50} />
              </View>
            </Animated.View>

            <Text style={styles.heading}>Successful</Text>
            <Text style={styles.description}>
              {isNewUser
                ? 'Create a new password. Ensure it differs from previous ones for security'
                : 'Your account is verified successfully.'}
            </Text>

            <TouchableOpacity onPress={onGoToDashboard}>
              <View style={styles.actionButton}>
                <Text style={styles.actionButtonText}>Go to Dashboard</Text>
                <Text style={styles.arrow}>→</Text>
              </View>
            </TouchableOpacity>

            <Text style={styles.orText}>or</Text>

            <TouchableOpacity onPress={onSetUpProfile}>
              <View style={styles.actionButton}>
                <Text style={styles.actionButtonText}>
                  {isNewUser ? 'Set up Your Profile' : 'Update Your Profile'}
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        </AnimatedScreen>
    </ScreenScaffold>
  );
};

export default SuccessfullScreenView;

const styles = StyleSheet.create({
  topGlow: {
    position: 'absolute',
    top: 120,
    left: 22,
    width: 170,
    height: 170,
    borderRadius: 85,
    backgroundColor: 'rgba(232, 204, 255, 0.22)',
  },
  bottomGlow: {
    position: 'absolute',
    bottom: 80,
    right: 18,
    width: 190,
    height: 190,
    borderRadius: 95,
    backgroundColor: 'rgba(255, 206, 177, 0.22)',
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    paddingBottom: 28,
  },
  logoContainer: {
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 14,
  },
  titleContainer: {
    flexDirection: 'row',
    marginTop: 3,
  },
  titleBachat: {
    fontSize: 22,
    fontFamily: fonts.BOLD,
    color: colors.primary,
  },
  titleBazaar: {
    fontSize: 22,
    fontFamily: fonts.BOLD,
    color: colors.primary,
  },
  subtitleSmall: {
    fontSize: 13,
    color: colors.text,
    marginTop: 2,
    fontFamily: fonts.BOLD,
  },
  card: {
    width: width * 0.88,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 28,
    paddingHorizontal: 20,
    paddingVertical: 28,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 5,
    marginTop: 6,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
  },
  checkmarkOuter: {
    width: 98,
    height: 98,
    borderRadius: 49,
    borderWidth: 2,
    borderColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    backgroundColor: '#fff',
    shadowColor: '#eaeaeaff',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 4,
  },
  checkmarkInner: {
    width: 78,
    height: 78,
    borderRadius: 39,
    backgroundColor: colors.primarySoft,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heading: {
    fontSize: 22,
    fontFamily: fonts.BOLD,
    color: colors.text,
    marginBottom: 10,
  },
  description: {
    fontSize: 13,
    fontFamily: fonts.BOLD,
    color: colors.mutedText,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 18,
    paddingHorizontal: 8,
  },
  actionButton: {
    width: width * 0.72,
    height: 50,
    borderRadius: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.14,
    shadowRadius: 7,
    elevation: 6,
    backgroundColor: colors.primary,
  },
  actionButtonText: {
    fontSize: 15,
    fontFamily: fonts.BOLD,
    color: '#fff',
  },
  arrow: {
    marginLeft: 8,
    fontSize: 17,
    color: colors.white,
    fontFamily: fonts.BOLD,
  },
  orText: {
    fontSize: 16,
    fontFamily: fonts.BOLD,
    color: colors.lighterGray,
    marginVertical: 12,
  },
  topRightVector: {
    position: 'absolute',
    top: 28,
    right: 0,
    width: 150,
    height: 200,
    overflow: 'visible',
    opacity: 0.55,
  },
  bottomLeftVector: {
    position: 'absolute',
    bottom: 44,
    left: -6,
    opacity: 0.35,
    transform: [{ rotate: '180deg' }],
  },
});
