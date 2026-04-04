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
  Image,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import BackgroundImg from '../../../assets/image/Background.png';
import LogoSVG from '../../../assets/image/BachatBazaarLogo.svg';
import VectorSVG from '../../../assets/image/Vector.svg';
import { colors, fonts } from '../../../helpers/styles';

const { width, height } = Dimensions.get('window');

interface LoginScreenViewProps {
  onLogin: (phone: string, password: string) => void;
  onSignin: (phone: string, password: string) => void;
  onForgotPassword: () => void;
}

const LoginScreenView: React.FC<LoginScreenViewProps> = ({ onLogin, onSignin, onForgotPassword }) => {
  const [activeTab, setActiveTab] = useState<'login' | 'signin'>('signin');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [secureText, setSecureText] = useState(true);

  const handleAction = () => {
    if (activeTab === 'login') {
      onLogin(phone, password);
    } else {
      onSignin(phone, password);
    }
  };

  return (
    <View style={styles.container}>
      {/* Background */}
      <View style={StyleSheet.absoluteFillObject}>
        <Image
          source={BackgroundImg}
          style={{ width: width, height: height }}
          resizeMode="cover"
        />
      </View>

      <View style={styles.topRightVector}>
        <VectorSVG width={width * 0.4} height={width * 0.4} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Logo Area */}
          <View style={styles.logoContainer}>
            <LogoSVG width={100} height={100} />
            <View style={styles.titleContainer}>
              <Text style={styles.titleBachat}>Bachat</Text>
              <Text style={styles.titleBazaar}> Bazaar</Text>
            </View>
            <Text style={styles.subtitle}>Discover Local Deals Near You</Text>
          </View>

          {/* Main Card */}
          <View style={styles.card}>
            {/* Tabs */}
            <View style={styles.tabContainer}>
              <TouchableOpacity
                style={[styles.tab, activeTab === 'login' && styles.activeTab]}
                onPress={() => setActiveTab('login')}
              >
                <Text style={[styles.tabText, activeTab === 'login' && styles.activeTabText]}>
                  Log in
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tab, activeTab === 'signin' && styles.activeTab]}
                onPress={() => setActiveTab('signin')}
              >
                <Text style={[styles.tabText, activeTab === 'signin' && styles.activeTabText]}>
                  {activeTab === 'login' ? 'Sign in' : 'Sign up'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Inputs */}
            <View style={styles.inputSection}>
              {/* Phone Input */}
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
                  />
                </View>
              </View>

              {/* Password Input - Mode Switch: Only in Login Mode */}
              {activeTab === 'login' && (
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
                      <MaterialCommunityIcons
                        name={secureText ? 'eye-off-outline' : 'eye-outline'}
                        size={22}
                        color="#BBB"
                      />
                    </TouchableOpacity>
                  </View>

                  {/* Footer Links - Login Mode Only */}
                  <View style={styles.footerLinks}>
                    <Text style={styles.wrongPassword}></Text>
                    <TouchableOpacity onPress={onForgotPassword}>
                      <Text style={styles.forgotPassword}>Forgot password?</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </View>

            {/* Action Button */}
            <TouchableOpacity style={styles.actionButton} onPress={handleAction}>
              <Text style={styles.actionButtonText}>
                {activeTab === 'login' ? 'Log in with password' : 'Send OTP'}
              </Text>
            </TouchableOpacity>

            {/* Separator & Social Logins - Sign Up Mode Only */}
            {activeTab === 'signin' && (
              <>
                <View style={styles.separatorContainer}>
                  <View style={styles.separatorLine} />
                  <Text style={styles.separatorText}>Or</Text>
                  <View style={styles.separatorLine} />
                </View>

                <View style={styles.socialContainer}>
                  <TouchableOpacity style={styles.socialButton}>
                    <MaterialCommunityIcons name="apple" size={28} color="#000" />
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.socialButton, styles.dashedBorder]}>
                    <MaterialCommunityIcons name="google" size={24} color="#DB4437" />
                  </TouchableOpacity>
                </View>
              </>
            )}


          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

export default LoginScreenView;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    paddingBottom: 40,
  },
  logoContainer: {
    alignItems: 'center',
    marginTop: height * 0.08, // Increased top margin to match image
    marginBottom: 20,
  },
  titleContainer: {
    flexDirection: 'row',
    marginTop: 5,
  },
  titleBachat: {
    fontSize: 26,
    fontFamily: fonts.BOLD,
    color: '#FF8C42', // Slightly more vibrant orange to match image logo
  },
  titleBazaar: {
    fontSize: 26,
    fontFamily: fonts.BOLD,
    color: '#4CAF50', // Better green to match image
  },
  subtitle: {
    fontSize: 16,
    color: '#333',
    fontFamily: fonts.BOLD,
  },
  card: {
    width: width * 0.9,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    borderRadius: 35,
    padding: 25,
    paddingVertical: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
    marginTop: 10,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 20,
    marginBottom: 25,
    padding: 5,
    borderWidth: 1,
    borderColor: '#F0F0F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  tab: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: 15,
  },
  activeTab: {
    backgroundColor: '#E0A361',
    shadowColor: '#E0A361',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 5,
  },
  tabText: {
    fontSize: 18,
    fontFamily: fonts.BOLD,
    color: '#333',
  },
  activeTabText: {
    color: '#fff',
  },
  inputSection: {
    width: '100%',
  },
  row: {
    flexDirection: 'row',
    marginBottom: 15,
  },
  countryCode: {
    width: 85,
    height: 58,
    backgroundColor: '#F5F5F5',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E8E8E8',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  countryCodeText: {
    fontSize: 18,
    color: '#333',
    fontFamily: fonts.BOLD,
  },
  phoneInputContainer: {
    flex: 1,
    height: 58,
    backgroundColor: '#F5F5F5',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E8E8E8',
    paddingHorizontal: 15,
    justifyContent: 'center',
  },
  passwordInputContainer: {
    width: '100%',
    height: 58,
    backgroundColor: '#F5F5F5',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E8E8E8',
    paddingLeft: 15,
    paddingRight: 5,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  fieldLabel: {
    fontSize: 16,
    fontFamily: fonts.BOLD,
    color: '#333',
    marginBottom: 8,
    marginLeft: 5,
    marginTop: 10,
  },
  eyeBtn: {
    padding: 10,
  },
  inputField: {
    flex: 1,
    fontSize: 18,
    color: '#333',
    fontFamily: fonts.BOLD,
  },
  footerLinks: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 5,
    marginBottom: 20,
    paddingHorizontal: 5,
  },
  wrongPassword: {
    color: '#BBB',
    fontSize: 14,
    fontFamily: fonts.BOLD,
  },
  forgotPassword: {
    color: '#E0A361',
    fontSize: 15,
    fontFamily: fonts.BOLD,
  },
  actionButton: {
    width: '100%',
    height: 60,
    backgroundColor: '#E0A361',
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#E0A361',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    marginTop: 5,
  },
  actionButtonText: {
    fontSize: 20,
    fontFamily: fonts.BOLD,
    color: '#fff',
  },
  separatorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 25,
  },
  separatorLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#D0D0D0',
  },
  separatorText: {
    marginHorizontal: 15,
    color: '#999',
    fontSize: 16,
    fontFamily: fonts.BOLD,
  },
  socialContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
  },
  socialButton: {
    width: 65,
    height: 50,
    backgroundColor: '#fff',
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  dashedBorder: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#D0D0D0',
  },
  placeholderBox: {
    width: '100%',
    height: 55,
    marginTop: 30,
    borderRadius: 15,
    opacity: 0.5,
  },
  topRightVector: {
    position: 'absolute',
    top: 40,
    right: 0,
    width: 150,
    height: 200,
    overflow: 'visible',
  },
});
