import React, { useState } from 'react';
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
} from 'react-native';
import AnimatedScreen from '../../../components/AnimatedScreen';
import AppIcon from '../../../components/AppIcon';
import LogoSVG from '../../../assets/image/BachatBazaarLogo.svg';
import VectorSVG from '../../../assets/image/Vector.svg';
import { colors, fonts } from '../../../helpers/styles';

const { width, height } = Dimensions.get('window');

interface LoginScreenViewProps {
  onLoginWithPassword: (phone: string, password: string) => void | Promise<void>;
  onLoginWithOtp: (phone: string) => void | Promise<void>;
  onSignupWithOtp: (phone: string) => void | Promise<void>;
  onForgotPassword: (phone: string) => void | Promise<void>;
  onGooglePress: () => void;
  onApplePress: () => void;
  isSubmitting?: boolean;
}

const LoginScreenView: React.FC<LoginScreenViewProps> = ({
  onLoginWithPassword,
  onLoginWithOtp,
  onSignupWithOtp,
  onForgotPassword,
  onGooglePress,
  onApplePress,
  isSubmitting = false,
}) => {
  const [activeTab, setActiveTab] = useState<'login' | 'signin'>('login');
  const [loginMethod, setLoginMethod] = useState<'otp' | 'password'>('otp');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [secureText, setSecureText] = useState(true);

  const handleAction = () => {
    if (activeTab === 'signin') {
      onSignupWithOtp(phone);
      return;
    }

    if (loginMethod === 'password') {
      onLoginWithPassword(phone, password);
      return;
    }

    onLoginWithOtp(phone);
  };

  return (
    <View style={styles.container}>
      <View style={styles.topRightVector}>
        <VectorSVG width={width * 0.4} height={width * 0.4} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <AnimatedScreen>
            <View style={styles.logoContainer}>
              <LogoSVG width={100} height={100} />
              <View style={styles.titleContainer}>
                <Text style={styles.titleBachat}>Bachat</Text>
                <Text style={styles.titleBazaar}> Bazaar</Text>
              </View>
              <Text style={styles.subtitle}>Discover Local Deals Near You</Text>
            </View>

            <View style={styles.card}>
              <View style={styles.tabContainer}>
                <TouchableOpacity
                  style={[styles.tab, activeTab === 'login' && styles.activeTab]}
                  onPress={() => {
                    setActiveTab('login');
                    setLoginMethod('otp');
                  }}
                >
                  <Text style={[styles.tabText, activeTab === 'login' && styles.activeTabText]}>
                    Log in
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.tab, activeTab === 'signin' && styles.activeTab]}
                  onPress={() => {
                    setActiveTab('signin');
                    setLoginMethod('otp');
                  }}
                >
                  <Text style={[styles.tabText, activeTab === 'signin' && styles.activeTabText]}>
                    Sign up
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.inputSection}>
                <View style={styles.row}>
                  <View style={styles.countryCode}>
                    <Text style={styles.countryCodeText}>IN +91</Text>
                  </View>
                  <View style={styles.phoneInputContainer}>
                    <TextInput
                      style={styles.inputField}
                      placeholder="786543567"
                      keyboardType="phone-pad"
                      value={phone}
                      onChangeText={setPhone}
                      placeholderTextColor={colors.lighterGray}
                      maxLength={10}
                    />
                  </View>
                </View>

                {activeTab === 'login' && loginMethod === 'password' && (
                  <>
                    <Text style={styles.fieldLabel}>Password</Text>
                    <View style={styles.passwordInputContainer}>
                      <TextInput
                        style={[styles.inputField, { paddingRight: 40 }]}
                        placeholder="••••••••••••"
                        secureTextEntry={secureText}
                        value={password}
                        onChangeText={setPassword}
                        placeholderTextColor={colors.lighterGray}
                      />
                      <TouchableOpacity
                        style={styles.eyeBtn}
                        onPress={() => setSecureText(!secureText)}
                      >
                        <AppIcon name={secureText ? 'eye-off' : 'eye'} size={18} />
                      </TouchableOpacity>
                    </View>

                    <View style={styles.footerLinks}>
                      <Text style={styles.wrongPassword}></Text>
                      <TouchableOpacity onPress={() => onForgotPassword(phone)}>
                        <Text style={styles.forgotPassword}>Forgot password?</Text>
                      </TouchableOpacity>
                    </View>
                  </>
                )}
              </View>

              <TouchableOpacity
                style={[styles.actionButton, isSubmitting && styles.actionButtonDisabled]}
                onPress={handleAction}
                disabled={isSubmitting}
              >
                <Text style={styles.actionButtonText}>
                  {isSubmitting
                    ? activeTab === 'login' && loginMethod === 'password'
                      ? 'Logging in...'
                      : 'Sending OTP...'
                    : activeTab === 'login' && loginMethod === 'password'
                      ? 'Log in'
                      : 'Send OTP'}
                </Text>
              </TouchableOpacity>

              {activeTab === 'login' && loginMethod === 'otp' && (
                <TouchableOpacity
                  style={styles.secondaryButton}
                  onPress={() => setLoginMethod('password')}
                  disabled={isSubmitting}
                >
                  <Text style={styles.secondaryButtonText}>Log in with password</Text>
                </TouchableOpacity>
              )}

              {activeTab === 'login' && loginMethod === 'password' && (
                <TouchableOpacity
                  style={styles.secondaryGhostButton}
                  onPress={() => setLoginMethod('otp')}
                  disabled={isSubmitting}
                >
                  <Text style={styles.secondaryGhostButtonText}>Use OTP login</Text>
                </TouchableOpacity>
              )}

              <>
                <View style={styles.separatorContainer}>
                  <View style={styles.separatorLine} />
                  <Text style={styles.separatorText}>Or</Text>
                  <View style={styles.separatorLine} />
                </View>

                <View style={styles.socialContainer}>
                  <TouchableOpacity style={styles.socialButton} onPress={onApplePress}>
                    <AppIcon name="apple" size={20} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.socialButton, styles.dashedBorder]}
                    onPress={onGooglePress}
                  >
                    <AppIcon name="google" size={20} />
                  </TouchableOpacity>
                </View>
              </>
            </View>
          </AnimatedScreen>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

export default LoginScreenView;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    paddingBottom: 28,
  },
  logoContainer: {
    alignItems: 'center',
    marginTop: height * 0.055,
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
  subtitle: {
    fontSize: 13,
    color: colors.text,
    fontFamily: fonts.BOLD,
  },
  card: {
    width: width * 0.88,
    backgroundColor: colors.white,
    borderRadius: 28,
    paddingHorizontal: 20,
    paddingVertical: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 6,
    marginTop: 6,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 20,
    padding: 4,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 2,
  },
  tab: {
    flex: 1,
    paddingVertical: 11,
    alignItems: 'center',
    borderRadius: 12,
  },
  activeTab: {
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  tabText: {
    fontSize: 14,
    color: colors.text,
    fontFamily: fonts.BOLD,
  },
  activeTabText: {
    color: colors.white,
  },
  inputSection: {
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  countryCode: {
    height: 46,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    backgroundColor: colors.white,
  },
  countryCodeText: {
    color: colors.text,
    fontFamily: fonts.BOLD,
    fontSize: 14,
  },
  phoneInputContainer: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    backgroundColor: colors.white,
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  fieldLabel: {
    fontSize: 13,
    color: colors.text,
    fontFamily: fonts.BOLD,
    marginTop: 14,
    marginBottom: 6,
  },
  passwordInputContainer: {
    width: '100%',
    height: 46,
    backgroundColor: colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    paddingLeft: 14,
    paddingRight: 5,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  eyeBtn: {
    padding: 8,
  },
  inputField: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    fontFamily: fonts.BOLD,
  },
  footerLinks: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  wrongPassword: {
    color: colors.mutedText,
  },
  forgotPassword: {
    color: colors.primary,
    fontSize: 12,
    fontFamily: fonts.BOLD,
  },
  actionButton: {
    width: '100%',
    height: 50,
    backgroundColor: colors.primary,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.14,
    shadowRadius: 7,
    elevation: 5,
  },
  actionButtonDisabled: {
    opacity: 0.75,
  },
  secondaryButton: {
    width: '100%',
    height: 50,
    backgroundColor: colors.primary,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
  },
  secondaryButtonText: {
    fontSize: 15,
    fontFamily: fonts.BOLD,
    color: colors.white,
  },
  secondaryGhostButton: {
    width: '100%',
    height: 46,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
    backgroundColor: colors.primarySoft,
  },
  secondaryGhostButtonText: {
    fontSize: 14,
    fontFamily: fonts.BOLD,
    color: colors.primary,
  },
  actionButtonText: {
    fontSize: 15,
    color: colors.white,
    fontFamily: fonts.BOLD,
  },
  separatorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 14,
  },
  separatorLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.primaryBorder,
  },
  separatorText: {
    marginHorizontal: 10,
    color: colors.mutedText,
    fontFamily: fonts.BOLD,
  },
  socialContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
  },
  socialButton: {
    width: 56,
    height: 42,
    borderRadius: 10,
    backgroundColor: colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.primaryBorder,
  },
  dashedBorder: {
    borderStyle: 'dashed',
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
});
