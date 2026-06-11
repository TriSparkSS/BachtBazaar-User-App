import React, { useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Modal,
  FlatList,
  Keyboard,
  Pressable,
} from 'react-native';
import AnimatedScreen from '../../../components/AnimatedScreen';
import AppIcon from '../../../components/AppIcon';
import LogoSVG from '../../../assets/image/BachatBazaarLogo.svg';
import VectorSVG from '../../../assets/image/Vector.svg';
import {
  countries,
  Country,
  defaultCountry,
  getCountryFlag,
  getNationalNumberMaxLength,
} from '../../../constants/countries';
import { colors, fonts } from '../../../helpers/styles';

const { width, height } = Dimensions.get('window');

const socialIcons = {
  apple: {
    uri: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABIAAAASCAYAAABWzo5XAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAOdEVYdFNvZnR3YXJlAEZpZ21hnrGWYwAAAMFJREFUeAGllIENgjAQRb9OwAgdgRHYQDewI7CBjMAGuAkjqBMUJ4AN9BrPoM2dcPQnLyWlPI4eKbA+JdETHTLiiJF4Eh4Z6VkSiAIZ+UictmAnzFXEga/vxIUFjudjRQ+eH6Ck47d/M2Len5STJDkri/9RS6JglDSSpNpQzU/39jw62DIQkySaYIvTKrrBnlq7obVYI673kqiFfcMjZSqqNkgClFirOmqiAut/zAYLcZiPjTh6/uzYpSvem9ymD70AkrSHfARycLUAAAAASUVORK5CYII=',
  },
  google: {
    uri: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABIAAAASCAYAAABWzo5XAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAOdEVYdFNvZnR3YXJlAEZpZ21hnrGWYwAAAgpJREFUeAG1lDtP21AUx8+5vlZI20hGqlAfUmU6tGuQqEQnnIYP4EoMZQL2qqRSF8QQJjqmXrpVzRYqVWrGSoXGSB2Q6OBvUC+V2gGwokACjnM4dh7kYWCB/+L7OPqd8z/3+gJckzBu8dA0tGa1tgQoZhEoHa4RgMvRjpSKNf59170StJ99tkJA6wSowcXZi0rKfztedrzumhiAzE3nWwAfLoN0qjN9T9WH4OeVhJC+PQ+QLGpiuZMyDYh5tqpRAJkJe88ZAdUrY3r945NKcJCIshCic9S8lZm0bW+4mj+GocWtR6DTbXUJ6srnxq970NibcINAZO7bow29TDKiESzCWADJub+g3G3Yt9/9c/uDshtVkwhi+yYEulurKVu2rYDOsEiJqf2d4WACUeCPHgdqtfhaAEwKuCZ1rCGfAOnheOvkYRqiJAOyeL9nDRFn2arRHreD283+oeZqoBY+HT+FL/XHniR1andh070oe3ajVumBgKzttVQusqZKv/im+txjSDjVmuh/mym90uMgL94f5buQCNSCcq+iUNOb8zkuv9ALYH98wy3utCNBur7w03wgK4kD00gcvuyGFX+u3VkeAEWw0vw6NywPV0g5eQTJ/69dCB5k7NWkOwLqVsa++ceNP+5OvbYkudzfx9hnZKZk6gEIg1As8lTj10BDQI8T7BBh+ffCVxtuSmcd2cNWBwpGUQAAAABJRU5ErkJggg==',
  },
} as const;

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
  const phoneInputRef = useRef<TextInput>(null);
  const passwordInputRef = useRef<TextInput>(null);
  const [activeTab, setActiveTab] = useState<'login' | 'signin'>('login');
  const [loginMethod, setLoginMethod] = useState<'otp' | 'password'>('otp');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [secureText, setSecureText] = useState(true);
  const [selectedCountry, setSelectedCountry] =
    useState<Country>(defaultCountry);
  const [countryPickerVisible, setCountryPickerVisible] = useState(false);
  const [countrySearch, setCountrySearch] = useState('');
  const [focusedField, setFocusedField] = useState<
    'phone' | 'password' | null
  >(null);

  const internationalPhone = `${selectedCountry.dialCode}${phone}`;
  const maxPhoneLength = getNationalNumberMaxLength(selectedCountry);
  const filteredCountries = useMemo(() => {
    const query = countrySearch.trim().toLowerCase();

    if (!query) {
      return countries;
    }

    return countries.filter(
      country =>
        country.name.toLowerCase().includes(query) ||
        country.code.toLowerCase().includes(query) ||
        country.dialCode.includes(query),
    );
  }, [countrySearch]);

  const handleAction = () => {
    if (activeTab === 'signin') {
      onSignupWithOtp(internationalPhone);
      return;
    }

    if (loginMethod === 'password') {
      onLoginWithPassword(internationalPhone, password);
      return;
    }

    onLoginWithOtp(internationalPhone);
  };

  const togglePasswordVisibility = () => {
    setSecureText(current => !current);
    requestAnimationFrame(() => passwordInputRef.current?.focus());
  };

  const openCountryPicker = () => {
    Keyboard.dismiss();
    setCountrySearch('');
    setCountryPickerVisible(true);
  };

  const selectCountry = (country: Country) => {
    setSelectedCountry(country);
    setPhone(currentPhone =>
      currentPhone.slice(0, getNationalNumberMaxLength(country)),
    );
    setCountryPickerVisible(false);
    setCountrySearch('');
  };

  const isSigningUp = activeTab === 'signin';
  const isPasswordLogin = activeTab === 'login' && loginMethod === 'password';
  const actionLabel = isSigningUp
    ? 'Create account with OTP'
    : isPasswordLogin
      ? 'Log in securely'
      : 'Continue with OTP';

  return (
    <View style={styles.container}>
      <View style={styles.heroWash} />
      <View style={styles.topGlow} />
      <View style={styles.bottomGlow} />
      <View style={styles.topRightVector}>
        <VectorSVG width={120} height={120} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoiding}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <AnimatedScreen style={styles.animatedScreen}>
            <View style={styles.animatedContent}>
              <View style={styles.logoContainer}>
                <View style={styles.logoHalo}>
                  <LogoSVG width={86} height={86} />
                </View>
                <Text style={styles.title}>
                  {isSigningUp ? 'Join Bachat Bazaar' : 'Welcome back'}
                </Text>
                <Text style={styles.subtitle}>
                  {isSigningUp
                    ? 'Create your account and start saving on everyday shopping.'
                    : 'Your nearby deals and smarter savings are waiting for you.'}
                </Text>
              </View>

              <View style={styles.card}>
                <View style={styles.tabContainer}>
                  <TouchableOpacity
                    style={[
                      styles.tab,
                      activeTab === 'login' && styles.activeTab,
                    ]}
                    onPress={() => {
                      setActiveTab('login');
                      setLoginMethod('otp');
                    }}
                    accessibilityRole="button"
                    accessibilityState={{ selected: activeTab === 'login' }}>
                    <Text
                      style={[
                        styles.tabText,
                        activeTab === 'login' && styles.activeTabText,
                      ]}>
                      Log in
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.tab,
                      activeTab === 'signin' && styles.activeTab,
                    ]}
                    onPress={() => {
                      setActiveTab('signin');
                      setLoginMethod('otp');
                    }}
                    accessibilityRole="button"
                    accessibilityState={{ selected: activeTab === 'signin' }}>
                    <Text
                      style={[
                        styles.tabText,
                        activeTab === 'signin' && styles.activeTabText,
                      ]}>
                      Sign up
                    </Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.inputSection}>
                  <Text style={styles.fieldLabel}>Mobile number</Text>
                  <View style={styles.row}>
                    <TouchableOpacity
                      style={[
                        styles.countryCode,
                        countryPickerVisible && styles.focusedInput,
                      ]}
                      onPress={openCountryPicker}
                      activeOpacity={0.75}
                      accessibilityRole="button"
                      accessibilityLabel={`Country code, ${selectedCountry.name}, ${selectedCountry.dialCode}`}
                      accessibilityHint="Opens the country code picker">
                      <Text style={styles.countryFlag}>
                        {getCountryFlag(selectedCountry.code)}
                      </Text>
                      <Text style={styles.countryCodeText}>
                        {selectedCountry.dialCode}
                      </Text>
                      <View style={styles.dropdownArrow} />
                    </TouchableOpacity>
                    <Pressable
                      style={[
                        styles.phoneInputContainer,
                        focusedField === 'phone' && styles.focusedInput,
                      ]}
                      onPress={() => phoneInputRef.current?.focus()}
                      accessibilityRole="button"
                      accessibilityLabel="Focus mobile number field">
                      <TextInput
                        ref={phoneInputRef}
                        style={[styles.inputField, styles.phoneTextInput]}
                        placeholder={
                          selectedCountry.example ?? 'Phone number'
                        }
                        keyboardType="phone-pad"
                        value={phone}
                        onChangeText={value =>
                          setPhone(value.replace(/\D/g, ''))
                        }
                        onFocus={() => setFocusedField('phone')}
                        onBlur={() => setFocusedField(null)}
                        placeholderTextColor="#99A4B8"
                        selectionColor={colors.primary}
                        maxLength={maxPhoneLength}
                        returnKeyType={isPasswordLogin ? 'next' : 'done'}
                        showSoftInputOnFocus
                        accessibilityLabel="Mobile number"
                      />
                    </Pressable>
                  </View>

                  {!isPasswordLogin && (
                    <View style={styles.securityNote}>
                      <View style={styles.securityDot} />
                      <Text style={styles.securityText}>
                        Your number stays private and secure.
                      </Text>
                    </View>
                  )}

                  {isPasswordLogin && (
                    <>
                      <Text style={styles.fieldLabel}>Password</Text>
                      <View
                        style={[
                          styles.passwordInputContainer,
                          focusedField === 'password' && styles.focusedInput,
                        ]}>
                        <TextInput
                          ref={passwordInputRef}
                          style={styles.passwordInput}
                          placeholder="Enter your password"
                          secureTextEntry={secureText}
                          value={password}
                          onChangeText={setPassword}
                          onFocus={() => setFocusedField('password')}
                          onBlur={() => setFocusedField(null)}
                          placeholderTextColor="#99A4B8"
                          selectionColor={colors.primary}
                          returnKeyType="done"
                          onSubmitEditing={handleAction}
                          accessibilityLabel="Password"
                        />
                        <TouchableOpacity
                          style={styles.eyeBtn}
                          onPress={togglePasswordVisibility}
                          accessibilityRole="button"
                          accessibilityLabel={
                            secureText ? 'Show password' : 'Hide password'
                          }
                          accessibilityState={{ selected: !secureText }}>
                          <AppIcon
                            name={secureText ? 'eye' : 'eye-off'}
                            size={19}
                          />
                        </TouchableOpacity>
                      </View>

                      <View style={styles.footerLinks}>
                        <TouchableOpacity
                          onPress={() => onForgotPassword(internationalPhone)}>
                          <Text style={styles.forgotPassword}>
                            Forgot password?
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </>
                  )}
                </View>

                <TouchableOpacity
                  style={[
                    styles.actionButton,
                    isSubmitting && styles.actionButtonDisabled,
                  ]}
                  onPress={handleAction}
                  disabled={isSubmitting}
                  activeOpacity={0.86}
                  accessibilityRole="button">
                  {isSubmitting ? (
                    <ActivityIndicator size="small" color={colors.white} />
                  ) : (
                    <Text style={styles.actionButtonText}>{actionLabel}</Text>
                  )}
                </TouchableOpacity>

                {activeTab === 'login' && (
                  <TouchableOpacity
                    style={styles.secondaryButton}
                    onPress={() =>
                      setLoginMethod(
                        loginMethod === 'otp' ? 'password' : 'otp',
                      )
                    }
                    disabled={isSubmitting}
                    activeOpacity={0.78}>
                    <Text style={styles.secondaryLead}>
                      {loginMethod === 'otp'
                        ? 'Prefer your password?'
                        : 'Want a quicker login?'}
                    </Text>
                    <Text style={styles.secondaryButtonText}>
                      {loginMethod === 'otp' ? ' Use password' : ' Use OTP'}
                    </Text>
                  </TouchableOpacity>
                )}

                <View style={styles.separatorContainer}>
                  <View style={styles.separatorLine} />
                  <Text style={styles.separatorText}>or continue with</Text>
                  <View style={styles.separatorLine} />
                </View>

                <View style={styles.socialContainer}>
                  <TouchableOpacity
                    style={styles.socialButton}
                    onPress={onApplePress}
                    activeOpacity={0.75}
                    accessibilityRole="button"
                    accessibilityLabel="Continue with Apple">
                    <Image source={socialIcons.apple} style={styles.socialIcon} />
                    <Text style={styles.socialText}>Apple</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.socialButton}
                    onPress={onGooglePress}
                    activeOpacity={0.75}
                    accessibilityRole="button"
                    accessibilityLabel="Continue with Google">
                    <Image source={socialIcons.google} style={styles.socialIcon} />
                    <Text style={styles.socialText}>Google</Text>
                  </TouchableOpacity>
                </View>

                <Text style={styles.termsText}>
                  By continuing, you agree to our Terms of Service and Privacy
                  Policy.
                </Text>
              </View>
            </View>
          </AnimatedScreen>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal
        visible={countryPickerVisible}
        transparent
        animationType="slide"
        statusBarTranslucent
        onRequestClose={() => setCountryPickerVisible(false)}>
        <View style={styles.modalRoot}>
          <Pressable
            style={styles.modalBackdrop}
            onPress={() => setCountryPickerVisible(false)}
            accessibilityLabel="Close country picker"
          />
          <View style={styles.countrySheet}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <View>
                <Text style={styles.sheetTitle}>Select country</Text>
                <Text style={styles.sheetSubtitle}>
                  Choose your flag and dialing code
                </Text>
              </View>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setCountryPickerVisible(false)}
                accessibilityRole="button"
                accessibilityLabel="Close country picker">
                <Text style={styles.closeButtonText}>X</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.countrySearchContainer}>
              <AppIcon name="search" size={17} />
              <TextInput
                style={styles.countrySearchInput}
                value={countrySearch}
                onChangeText={setCountrySearch}
                placeholder="Search country or code"
                placeholderTextColor="#929DB0"
                selectionColor={colors.primary}
                autoCorrect={false}
                autoCapitalize="none"
                accessibilityLabel="Search countries"
              />
            </View>

            <FlatList
              data={filteredCountries}
              keyExtractor={country => country.code}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.countryList}
              renderItem={({ item }) => {
                const isSelected = item.code === selectedCountry.code;

                return (
                  <TouchableOpacity
                    style={[
                      styles.countryOption,
                      isSelected && styles.selectedCountryOption,
                    ]}
                    onPress={() => selectCountry(item)}
                    activeOpacity={0.72}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isSelected }}>
                    <Text style={styles.optionFlag}>
                      {getCountryFlag(item.code)}
                    </Text>
                    <View style={styles.optionDetails}>
                      <Text
                        style={[
                          styles.optionName,
                          isSelected && styles.selectedOptionText,
                        ]}
                        numberOfLines={1}>
                        {item.name}
                      </Text>
                      <Text style={styles.optionIso}>{item.code}</Text>
                    </View>
                    <Text
                      style={[
                        styles.optionDialCode,
                        isSelected && styles.selectedOptionText,
                      ]}>
                      {item.dialCode}
                    </Text>
                    <View
                      style={[
                        styles.selectionIndicator,
                        isSelected && styles.selectedIndicator,
                      ]}
                    />
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={
                <View style={styles.emptyCountries}>
                  <Text style={styles.emptyCountriesTitle}>
                    No country found
                  </Text>
                  <Text style={styles.emptyCountriesText}>
                    Try another country name or dialing code.
                  </Text>
                </View>
              }
            />
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default LoginScreenView;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7FAFF',
    overflow: 'hidden',
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
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: Platform.OS === 'ios' ? 48 : 28,
    paddingBottom: 30,
    paddingHorizontal: 16,
  },
  animatedScreen: {
    width: '100%',
    alignItems: 'center',
  },
  animatedContent: {
    alignItems: 'center',
    width: '100%',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 22,
    maxWidth: 390,
    paddingHorizontal: 16,
  },
  brandPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.82)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.95)',
    borderRadius: 100,
    paddingHorizontal: 13,
    paddingVertical: 7,
    marginBottom: 14,
    shadowColor: '#285CB8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 2,
  },
  brandPillDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.darkgreen,
    marginRight: 8,
  },
  brandPillText: {
    fontSize: 10,
    letterSpacing: 0.9,
    fontFamily: fonts.BOLD,
    color: colors.primaryDark,
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
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#EEF3FC',
    borderRadius: 18,
    marginBottom: 20,
    padding: 4,
  },
  tab: {
    flex: 1,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
  },
  activeTab: {
    backgroundColor: colors.primary,
    shadowColor: colors.primaryDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  tabText: {
    fontSize: 14.5,
    color: '#69778D',
    fontFamily: fonts.BOLD,
  },
  activeTabText: {
    color: colors.white,
  },
  formIntro: {
    marginBottom: 18,
  },
  formTitle: {
    color: colors.text,
    fontSize: 18,
    fontFamily: fonts.BOLD,
  },
  formHelper: {
    color: '#718097',
    fontSize: 13,
    lineHeight: 18,
    marginTop: 5,
  },
  inputSection: {
    marginBottom: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  countryCode: {
    width: 112,
    height: 54,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#DCE3EE',
    backgroundColor: '#F8FAFE',
    paddingHorizontal: 10,
  },
  countryFlag: {
    fontSize: 20,
    marginRight: 7,
  },
  countryCodeText: {
    color: colors.text,
    fontFamily: fonts.BOLD,
    fontSize: 14,
    flex: 1,
  },
  dropdownArrow: {
    width: 0,
    height: 0,
    borderLeftWidth: 4,
    borderRightWidth: 4,
    borderTopWidth: 5,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#66758C',
    marginLeft: 5,
  },
  phoneInputContainer: {
    flex: 1,
    height: 54,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#DCE3EE',
    backgroundColor: '#F8FAFE',
    justifyContent: 'center',
    paddingHorizontal: 15,
  },
  fieldLabel: {
    fontSize: 13,
    color: '#33415A',
    fontFamily: fonts.BOLD,
    marginBottom: 8,
    marginLeft: 2,
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
  securityNote: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 9,
    marginBottom: 17,
    marginLeft: 3,
  },
  securityDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.darkgreen,
    marginRight: 7,
  },
  securityText: {
    color: '#708097',
    fontSize: 11.5,
    fontFamily: fonts.BOLD,
  },
  passwordInputContainer: {
    width: '100%',
    height: 54,
    backgroundColor: '#F8FAFE',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#DCE3EE',
    paddingLeft: 15,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  eyeBtn: {
    width: 48,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputField: {
    flex: 1,
    fontSize: 15,
    color: '#182238',
    fontFamily: fonts.BOLD,
  },
  phoneTextInput: {
    height: '100%',
    paddingVertical: 0,
    textAlignVertical: 'center',
  },
  passwordInput: {
    flex: 1,
    fontSize: 15,
    color: '#182238',
    fontFamily: fonts.BOLD,
  },
  footerLinks: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    minHeight: 24,
    marginBottom: 7,
  },
  forgotPassword: {
    color: colors.primary,
    fontSize: 12,
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
  secondaryButton: {
    width: '100%',
    minHeight: 42,
    backgroundColor: colors.primarySoft,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    marginTop: 11,
    paddingHorizontal: 12,
  },
  secondaryLead: {
    fontSize: 12.5,
    fontFamily: fonts.BOLD,
    color: '#65748B',
  },
  secondaryButtonText: {
    fontSize: 12.5,
    fontFamily: fonts.BOLD,
    color: colors.primaryDark,
  },
  actionButtonText: {
    fontSize: 15,
    color: colors.white,
    fontFamily: fonts.BOLD,
    letterSpacing: 0.1,
  },
  separatorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 18,
    marginBottom: 14,
  },
  separatorLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E2E8F2',
  },
  separatorText: {
    marginHorizontal: 11,
    color: '#8794A8',
    fontFamily: fonts.BOLD,
    fontSize: 10.5,
  },
  socialContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
  },
  socialButton: {
    flex: 1,
    height: 50,
    borderRadius: 14,
    backgroundColor: colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#DCE3EE',
  },
  socialIcon: {
    width: 19,
    height: 19,
    resizeMode: 'contain',
    marginRight: 9,
  },
  socialText: {
    color: '#27344B',
    fontSize: 13,
    fontFamily: fonts.BOLD,
  },
  termsText: {
    marginTop: 15,
    paddingHorizontal: 8,
    color: '#8A96A9',
    fontSize: 10.5,
    lineHeight: 15,
    textAlign: 'center',
  },
  modalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 28, 49, 0.48)',
  },
  countrySheet: {
    height: Math.min(height * 0.76, 680),
    backgroundColor: colors.white,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingTop: 9,
    paddingHorizontal: 18,
    paddingBottom: Platform.OS === 'ios' ? 28 : 18,
    shadowColor: '#0E2344',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.18,
    shadowRadius: 22,
    elevation: 18,
  },
  sheetHandle: {
    width: 42,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#D8E0EC',
    alignSelf: 'center',
    marginBottom: 15,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  sheetTitle: {
    color: colors.text,
    fontSize: 21,
    fontFamily: fonts.BOLD,
  },
  sheetSubtitle: {
    color: '#718097',
    fontSize: 12.5,
    marginTop: 3,
  },
  closeButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F0F4FA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    color: '#536179',
    fontSize: 14,
    fontFamily: fonts.BOLD,
  },
  countrySearchContainer: {
    height: 50,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#DCE3EE',
    backgroundColor: '#F7F9FD',
    paddingHorizontal: 14,
    marginBottom: 10,
    gap: 10,
  },
  countrySearchInput: {
    flex: 1,
    color: colors.text,
    fontSize: 14,
    fontFamily: fonts.BOLD,
  },
  countryList: {
    paddingBottom: 8,
  },
  countryOption: {
    minHeight: 60,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    paddingHorizontal: 12,
    marginVertical: 3,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  selectedCountryOption: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primaryBorder,
  },
  optionFlag: {
    width: 42,
    fontSize: 25,
  },
  optionDetails: {
    flex: 1,
    paddingRight: 8,
  },
  optionName: {
    color: '#253249',
    fontSize: 14,
    fontFamily: fonts.BOLD,
  },
  optionIso: {
    color: '#8A96A8',
    fontSize: 10,
    fontFamily: fonts.BOLD,
    letterSpacing: 0.8,
    marginTop: 2,
  },
  optionDialCode: {
    color: '#526079',
    fontSize: 13.5,
    fontFamily: fonts.BOLD,
    marginRight: 12,
  },
  selectedOptionText: {
    color: colors.primaryDark,
  },
  selectionIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: '#C4CDDB',
  },
  selectedIndicator: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  emptyCountries: {
    alignItems: 'center',
    paddingVertical: 46,
    paddingHorizontal: 24,
  },
  emptyCountriesTitle: {
    color: colors.text,
    fontSize: 16,
    fontFamily: fonts.BOLD,
  },
  emptyCountriesText: {
    color: '#7B879A',
    fontSize: 12.5,
    lineHeight: 18,
    textAlign: 'center',
    marginTop: 5,
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
});
