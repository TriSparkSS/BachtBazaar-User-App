import React, { useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';
import AnimatedScreen from '../../../components/AnimatedScreen';
import LogoSVG from '../../../assets/image/BachatBazaarLogo.svg';
import VectorSVG from '../../../assets/image/Vector.svg';
import { colors, fonts } from '../../../helpers/styles';

const { width, height } = Dimensions.get('window');

const BackArrowIcon = () => (
  <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
    <Path
      d="M14.5 6.5L9 12l5.5 5.5"
      stroke="#FFFFFF"
      strokeWidth={2.6}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const LockIcon = ({ active }: { active?: boolean }) => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
    <Path
      d="M7 10V8a5 5 0 0110 0v2"
      stroke={active ? colors.primary : '#99A4B8'}
      strokeWidth={1.8}
      strokeLinecap="round"
    />
    <Path
      d="M6 10h12v10H6z"
      stroke={active ? colors.primary : '#99A4B8'}
      strokeWidth={1.8}
      strokeLinejoin="round"
    />
  </Svg>
);

const EyeIcon = ({ hidden, color }: { hidden: boolean; color: string }) =>
  hidden ? (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Path
        d="M3 3l18 18"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
      />
      <Path
        d="M10.58 10.58A2 2 0 0012 14a2 2 0 001.41-.59M9.88 5.09A10.94 10.94 0 0112 5c7 0 10 7 10 7a13.16 13.16 0 01-1.67 2.68M6.61 6.61A13.526 13.526 0 002 12s3 7 10 7a9.74 9.74 0 005.39-1.61"
        stroke={color}
        strokeWidth={1.7}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  ) : (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Path
        d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z"
        stroke={color}
        strokeWidth={1.8}
        strokeLinejoin="round"
      />
      <Circle cx="12" cy="12" r="3" stroke={color} strokeWidth={1.8} />
    </Svg>
  );

const hasEightCharacters = (value: string) => value.length >= 8;
const hasUppercaseLetter = (value: string) => /[A-Z]/.test(value);
const hasSymbol = (value: string) => /[!@#$%]/.test(value);

interface ForgotPasswordScreenViewProps {
  onBack: () => void;
  onSubmit: (
    oldPassword: string,
    password: string,
    confirm: string,
  ) => void | Promise<void>;
  mode?: 'signup-password' | 'forgot-password' | 'change-password';
  phoneNumber?: string;
}

const ForgotPasswordScreenView: React.FC<ForgotPasswordScreenViewProps> = ({
  onBack,
  onSubmit,
  mode = 'signup-password',
  phoneNumber,
}) => {
  const [oldPassword, setOldPassword] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [secureOldText, setSecureOldText] = useState(true);
  const [secureText, setSecureText] = useState(true);
  const [secureConfirmText, setSecureConfirmText] = useState(true);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const oldPasswordRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const confirmPasswordRef = useRef<TextInput>(null);
  const isChangePassword = mode === 'change-password';
  const isForgotPassword = mode === 'forgot-password';

  const refocusInput = (inputRef: React.RefObject<TextInput | null>) => {
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  const screenCopy = useMemo(() => {
    if (isChangePassword) {
      return {
        badge: 'ACCOUNT SECURITY',
        title: 'Change password',
        subtitle: 'Update your password to keep your account protected.',
        cardTitle: 'Enter password details',
        cardCopy: 'Use a strong password that is hard to guess.',
        action: 'Update Password',
      };
    }

    if (isForgotPassword) {
      return {
        badge: 'OTP VERIFIED',
        title: 'Create new password',
        subtitle: 'Your phone number is verified. Set a fresh password below.',
        cardTitle: 'Set new password',
        cardCopy: phoneNumber
          ? `Create a secure password for ${phoneNumber}.`
          : 'Create a secure password for your account.',
        action: 'Reset Password',
      };
    }

    return {
      badge: 'FINAL STEP',
      title: 'Set your password',
      subtitle: 'One last step before your Bachat Bazaar account is ready.',
      cardTitle: 'Create password',
      cardCopy: phoneNumber
        ? `Create a secure password for ${phoneNumber}.`
        : 'Create a secure password for your new account.',
      action: 'Continue',
    };
  }, [isChangePassword, isForgotPassword, phoneNumber]);

  const passwordChecks = [
    { label: '8+ characters', met: hasEightCharacters(password) },
    { label: '1 uppercase letter', met: hasUppercaseLetter(password) },
    { label: '1 symbol (!@#$%)', met: hasSymbol(password) },
    {
      label: 'Passwords match',
      met:
        confirmPassword.length > 0 &&
        password.length > 0 &&
        confirmPassword === password,
    },
  ];

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      await onSubmit(oldPassword, password, confirmPassword);
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleOldPasswordVisibility = () => {
    setSecureOldText(current => !current);
    refocusInput(oldPasswordRef);
  };

  const togglePasswordVisibility = () => {
    setSecureText(current => !current);
    refocusInput(passwordRef);
  };

  const toggleConfirmPasswordVisibility = () => {
    setSecureConfirmText(current => !current);
    refocusInput(confirmPasswordRef);
  };

  const renderPasswordField = (
    label: string,
    value: string,
    onChangeText: (text: string) => void,
    secure: boolean,
    onToggleSecure: () => void,
    inputRef: React.RefObject<TextInput | null>,
    fieldKey: string,
    placeholder: string,
    returnKeyType: 'next' | 'done',
    onSubmitEditing?: () => void,
  ) => (
    <>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View
        style={[
          styles.passwordInputContainer,
          focusedField === fieldKey && styles.focusedInput,
        ]}>
        <View style={styles.inputLeadingIcon}>
          <LockIcon active={focusedField === fieldKey} />
        </View>
        <TextInput
          ref={inputRef}
          style={styles.passwordInput}
          placeholder={placeholder}
          secureTextEntry={secure}
          value={value}
          onChangeText={onChangeText}
          onFocus={() => setFocusedField(fieldKey)}
          onBlur={() => setFocusedField(null)}
          placeholderTextColor="#99A4B8"
          selectionColor={colors.primary}
          returnKeyType={returnKeyType}
          blurOnSubmit={returnKeyType === 'done'}
          onSubmitEditing={onSubmitEditing}
        />
        <TouchableOpacity
          style={styles.eyeBtn}
          onPress={onToggleSecure}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={secure ? `Show ${label.toLowerCase()}` : `Hide ${label.toLowerCase()}`}
          accessibilityState={{ selected: !secure }}>
          <EyeIcon
            hidden={secure}
            color={secure ? '#607287' : colors.primary}
          />
        </TouchableOpacity>
      </View>
    </>
  );

  return (
    <View style={styles.container}>
      <View style={styles.heroWash} />
      <View style={styles.topGlow} />
      <View style={styles.bottomGlow} />
      <View style={styles.topRightVector}>
        <VectorSVG width={120} height={120} />
      </View>

      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={onBack}
          activeOpacity={0.78}
          accessibilityRole="button"
          accessibilityLabel="Go back">
          <BackArrowIcon />
        </TouchableOpacity>
      </SafeAreaView>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoiding}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <AnimatedScreen style={styles.animatedScreen}>
            <View style={styles.logoContainer}>
              <View style={styles.logoHalo}>
                <LogoSVG width={86} height={86} />
              </View>
              <View style={styles.badge}>
                <View style={styles.badgeDot} />
                <Text style={styles.badgeText}>{screenCopy.badge}</Text>
              </View>
              <Text style={styles.title}>{screenCopy.title}</Text>
              <Text style={styles.subtitle}>{screenCopy.subtitle}</Text>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>{screenCopy.cardTitle}</Text>
              <Text style={styles.cardCopy}>{screenCopy.cardCopy}</Text>

              {isChangePassword &&
                renderPasswordField(
                  'Old Password',
                  oldPassword,
                  setOldPassword,
                  secureOldText,
                  toggleOldPasswordVisibility,
                  oldPasswordRef,
                  'oldPassword',
                  'Enter old password',
                  'next',
                  () => passwordRef.current?.focus(),
                )}

              {renderPasswordField(
                'Password',
                password,
                setPassword,
                secureText,
                togglePasswordVisibility,
                passwordRef,
                'password',
                'Create password',
                'next',
                () => confirmPasswordRef.current?.focus(),
              )}

              {renderPasswordField(
                'Confirm Password',
                confirmPassword,
                setConfirmPassword,
                secureConfirmText,
                toggleConfirmPasswordVisibility,
                confirmPasswordRef,
                'confirmPassword',
                'Confirm password',
                'done',
                handleSubmit,
              )}

              <View style={styles.requirementsWrap}>
                {passwordChecks.map(check => (
                  <View
                    key={check.label}
                    style={[
                      styles.requirementItem,
                      check.met && styles.requirementItemActive,
                    ]}>
                    <View
                      style={[
                        styles.requirementIndicator,
                        check.met && styles.requirementIndicatorActive,
                      ]}>
                      {check.met ? (
                        <Text style={styles.requirementCheckmark}>✓</Text>
                      ) : null}
                    </View>
                    <Text
                      style={[
                        styles.requirementText,
                        check.met && styles.requirementTextActive,
                      ]}>
                      {check.label}
                    </Text>
                  </View>
                ))}
              </View>

              <View style={styles.securityNote}>
                <View style={styles.securityDot} />
                <Text style={styles.securityText}>
                  Use a password you do not use anywhere else.
                </Text>
              </View>

              <TouchableOpacity
                style={[
                  styles.actionButton,
                  isSubmitting && styles.actionButtonDisabled,
                ]}
                onPress={handleSubmit}
                disabled={isSubmitting}
                activeOpacity={0.86}
                accessibilityRole="button">
                {isSubmitting ? (
                  <ActivityIndicator size="small" color={colors.white} />
                ) : (
                  <Text style={styles.actionButtonText}>{screenCopy.action}</Text>
                )}
              </TouchableOpacity>
            </View>
          </AnimatedScreen>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

export default ForgotPasswordScreenView;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7FAFF',
    overflow: 'hidden',
  },
  safeArea: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 20,
  },
  keyboardAvoiding: {
    flex: 1,
  },
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
  backButton: {
    marginLeft: 18,
    marginTop: 4,
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    shadowColor: '#173E7A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 12,
    elevation: 7,
  },
  backChevron: {
    width: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backChevronLine: {
    position: 'absolute',
    width: 18,
    height: 4,
    borderRadius: 4,
    backgroundColor: colors.white,
  },
  backChevronTop: {
    transform: [{ rotate: '-45deg' }],
    top: 3,
  },
  backChevronBottom: {
    transform: [{ rotate: '45deg' }],
    bottom: 3,
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: Platform.OS === 'ios' ? 72 : 62,
    paddingBottom: 30,
    paddingHorizontal: 16,
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
    marginBottom: 13,
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
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
    shadowColor: '#173E7A',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.14,
    shadowRadius: 24,
    elevation: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#DCE6F7',
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
  fieldLabel: {
    fontSize: 13,
    color: '#33415A',
    fontFamily: fonts.BOLD,
    marginBottom: 8,
    marginLeft: 2,
  },
  passwordInputContainer: {
    width: '100%',
    height: 54,
    backgroundColor: '#F8FAFE',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#DCE3EE',
    paddingLeft: 12,
    paddingRight: 4,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  focusedInput: {
    borderColor: colors.primary,
    backgroundColor: colors.white,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 7,
    elevation: 2,
  },
  inputLeadingIcon: {
    marginRight: 8,
  },
  passwordInput: {
    flex: 1,
    fontSize: 15,
    color: '#182238',
    fontFamily: fonts.BOLD,
    paddingVertical: 0,
  },
  eyeBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EEF3FC',
  },
  requirementsWrap: {
    marginTop: 2,
    marginBottom: 12,
    gap: 8,
  },
  requirementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F6F8FB',
    borderRadius: 13,
    minHeight: 42,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  requirementItemActive: {
    backgroundColor: '#F1FBF6',
    borderColor: '#B8E0C6',
  },
  requirementIndicator: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: '#C2CAD7',
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  requirementIndicatorActive: {
    borderColor: colors.darkgreen,
    backgroundColor: colors.darkgreen,
  },
  requirementCheckmark: {
    fontSize: 10,
    color: colors.white,
    fontFamily: fonts.BOLD,
    lineHeight: 12,
  },
  requirementText: {
    fontSize: 12.5,
    color: '#607287',
    fontFamily: fonts.BOLD,
  },
  requirementTextActive: {
    color: '#1F6E45',
  },
  securityNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
  actionButtonDisabled: {
    opacity: 0.7,
  },
  actionButtonText: {
    fontSize: 15,
    color: colors.white,
    fontFamily: fonts.BOLD,
    letterSpacing: 0.1,
  },
});
