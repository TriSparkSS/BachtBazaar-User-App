import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Pressable,
  Dimensions,
  ActivityIndicator,
  NativeSyntheticEvent,
  TextInputKeyPressEventData,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import AnimatedScreen from '../../../components/AnimatedScreen';
import { ScreenScaffold } from '../../../components/ScreenScaffold';
import LogoSVG from '../../../assets/image/BachatBazaarLogo.svg';
import VectorSVG from '../../../assets/image/Vector.svg';
import { colors, fonts } from '../../../helpers/styles';

const { width, height } = Dimensions.get('window');

interface OTPCodeScreenViewProps {
  otp: string[];
  setOtp: (otp: string[]) => void;
  onVerify: () => void;
  onResend: () => void;
  onBack: () => void;
  phoneNumber?: string;
  isVerifying?: boolean;
  isResending?: boolean;
}

const OTPCodeScreenView: React.FC<OTPCodeScreenViewProps> = ({
  otp,
  setOtp,
  onVerify,
  onResend,
  onBack,
  phoneNumber,
  isVerifying = false,
  isResending = false,
}) => {
  const inputRefs = useRef<Array<TextInput | null>>([]);
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
  const codeComplete = useMemo(() => otp.every(Boolean), [otp]);
  const maskedPhone = phoneNumber || 'your mobile number';

  useEffect(() => {
    const focusTimer = setTimeout(() => {
      inputRefs.current[0]?.focus();
    }, 360);

    return () => clearTimeout(focusTimer);
  }, []);

  const handleOtpChange = (value: string, index: number) => {
    const digits = value.replace(/[^0-9]/g, '');
    const newOtp = [...otp];

    if (digits.length > 1) {
      digits
        .slice(0, otp.length - index)
        .split('')
        .forEach((digit, offset) => {
          newOtp[index + offset] = digit;
        });

      setOtp(newOtp);
      const nextIndex = Math.min(index + digits.length, otp.length - 1);
      inputRefs.current[nextIndex]?.focus();
      return;
    }

    newOtp[index] = digits;
    setOtp(newOtp);

    if (digits && index < otp.length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (
    event: NativeSyntheticEvent<TextInputKeyPressEventData>,
    index: number,
  ) => {
    if (event.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      const newOtp = [...otp];
      newOtp[index - 1] = '';
      setOtp(newOtp);
      inputRefs.current[index - 1]?.focus();
    }
  };

  return (
    <ScreenScaffold
      onBack={onBack}
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
                <LogoSVG width={82} height={82} />
              </View>
              <Text style={styles.title}>Check your phone</Text>
              <Text style={styles.subtitle}>
                We sent a 6-digit code to confirm it is really you.
              </Text>
            </View>

            <View style={styles.card}>
              <View style={styles.phoneChip}>
                <View style={styles.phoneTextWrap}>
                  <View style={styles.phoneLabelRow}>
                    <View style={styles.phoneIconWrap}>
                      <MaterialCommunityIcons
                        name="phone-outline"
                        size={19}
                        color={colors.darkgreen}
                      />
                    </View>
                    <Text style={styles.phoneLabel}>Code sent to</Text>
                  </View>
                  <Text style={styles.phoneNumber} numberOfLines={1}>
                    {maskedPhone}
                  </Text>
                </View>
              </View>

              <View style={styles.otpContainer}>
                {otp.map((digit, index) => {
                  const isFocused = focusedIndex === index;
                  const isFilled = Boolean(digit);

                  return (
                    <Pressable
                      key={index}
                      style={[
                        styles.otpInput,
                        isFocused && styles.otpInputFocused,
                        isFilled && styles.otpInputFilled,
                      ]}
                      onPress={() => inputRefs.current[index]?.focus()}>
                      <TextInput
                        ref={ref => {
                          inputRefs.current[index] = ref;
                        }}
                        style={styles.otpTextInput}
                        keyboardType="number-pad"
                        textContentType="oneTimeCode"
                        autoComplete="sms-otp"
                        maxLength={6}
                        value={digit}
                        onChangeText={value => handleOtpChange(value, index)}
                        onKeyPress={event => handleKeyPress(event, index)}
                        onFocus={() => setFocusedIndex(index)}
                        onBlur={() =>
                          setFocusedIndex(current => (current === index ? null : current))
                        }
                        showSoftInputOnFocus
                        selectionColor={colors.primary}
                        accessibilityLabel={`OTP digit ${index + 1}`}
                      />
                    </Pressable>
                  );
                })}
              </View>

              <View style={styles.securityNote}>
                <View style={styles.securityDot} />
                <Text style={styles.securityText}>
                  Keep this code private. Bachat Bazaar will never ask for it
                  outside this screen.
                </Text>
              </View>

              <TouchableOpacity
                style={[
                  styles.actionButton,
                  (!codeComplete || isVerifying) && styles.actionButtonMuted,
                ]}
                onPress={onVerify}
                disabled={isVerifying}
                activeOpacity={0.86}
                accessibilityRole="button">
                {isVerifying ? (
                  <ActivityIndicator size="small" color={colors.white} />
                ) : (
                  <Text style={styles.actionButtonText}>Verify OTP</Text>
                )}
              </TouchableOpacity>

              <View style={styles.resendContainer}>
                <Text style={styles.resendText}>Did not receive the code?</Text>
                <TouchableOpacity
                  style={styles.resendButton}
                  onPress={onResend}
                  disabled={isResending}
                  activeOpacity={0.76}
                  accessibilityRole="button">
                  {isResending ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                  ) : (
                    <Text style={styles.resendLink}>Resend OTP</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </AnimatedScreen>
    </ScreenScaffold>
  );
};

export default OTPCodeScreenView;

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
    overflow: 'visible',
    opacity: 0.7,
  },
  animatedScreen: {
    width: '100%',
    alignItems: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 22,
    maxWidth: 390,
    paddingHorizontal: 16,
  },
  logoHalo: {
    width: 98,
    height: 98,
    borderRadius: 32,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 13,
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
    marginBottom: 13,
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
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 20,
    shadowColor: '#173E7A',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.14,
    shadowRadius: 24,
    elevation: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#DCE6F7',
  },
  phoneChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F4F7FD',
    borderRadius: 18,
    padding: 12,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#E1E8F5',
  },
  phoneIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  /* phoneIconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  }, */
  phoneTextWrap: {
    flex: 1,
  },
  phoneLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  phoneLabel: {
    color: '#7E8AA0',
    fontSize: 11,
    fontFamily: fonts.BOLD,
  },
  phoneNumber: {
    color: colors.text,
    fontSize: 15,
    fontFamily: fonts.BOLD,
  },
  cardTitle: {
    color: colors.text,
    fontSize: 20,
    fontFamily: fonts.BOLD,
  },
  cardCopy: {
    color: '#6D7B92',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 6,
    marginBottom: 18,
    fontFamily: fonts.BOLD,
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    gap: 7,
  },
  otpInput: {
    flex: 1,
    minWidth: 42,
    height: 56,
    backgroundColor: '#F8FAFE',
    borderWidth: 1.4,
    borderColor: '#DCE3EE',
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  otpTextInput: {
    width: '100%',
    height: '100%',
    textAlign: 'center',
    textAlignVertical: 'center',
    paddingVertical: 0,
    fontSize: 20,
    fontFamily: fonts.BOLD,
    color: colors.text,
  },
  otpInputFocused: {
    borderColor: colors.primary,
    backgroundColor: colors.white,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.13,
    shadowRadius: 8,
    elevation: 3,
  },
  otpInputFilled: {
    borderColor: colors.primaryBorder,
    color: colors.primaryDark,
  },
  securityNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F1FBF6',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16,
  },
  securityDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.darkgreen,
    marginTop: 5,
    marginRight: 8,
  },
  securityText: {
    flex: 1,
    color: '#607287',
    fontSize: 11.5,
    lineHeight: 16,
    fontFamily: fonts.BOLD,
  },
  actionButton: {
    width: '100%',
    height: 54,
    backgroundColor: colors.primary,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.primaryDark,
    shadowOffset: { width: 0, height: 7 },
    shadowOpacity: 0.22,
    shadowRadius: 12,
    elevation: 5,
  },
  actionButtonMuted: {
    opacity: 0.72,
  },
  actionButtonText: {
    fontSize: 15,
    fontFamily: fonts.BOLD,
    color: colors.white,
    letterSpacing: 0.1,
  },
  resendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    marginTop: 15,
  },
  resendText: {
    fontSize: 12.5,
    color: '#65748B',
    fontFamily: fonts.BOLD,
    marginRight: 5,
  },
  resendButton: {
    minHeight: 32,
    minWidth: 78,
    borderRadius: 16,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySoft,
  },
  resendLink: {
    fontSize: 12.5,
    color: colors.primaryDark,
    fontFamily: fonts.BOLD,
  },
});
