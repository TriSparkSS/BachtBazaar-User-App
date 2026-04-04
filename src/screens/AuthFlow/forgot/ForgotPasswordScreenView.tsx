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
import BackButtonSVG from '../../../assets/icon/BackButton.svg';
import { colors, fonts } from '../../../helpers/styles';

const { width, height } = Dimensions.get('window');

interface ForgotPasswordScreenViewProps {
  onBack: () => void;
  onSubmit: (password: string, confirm: string) => void;
}

const ForgotPasswordScreenView: React.FC<ForgotPasswordScreenViewProps> = ({ onBack, onSubmit }) => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [secureText, setSecureText] = useState(true);
  const [secureConfirmText, setSecureConfirmText] = useState(true);

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
          {/* Header Area */}
          <View style={styles.header}>
            <TouchableOpacity style={styles.backButton} onPress={onBack}>
              <BackButtonSVG width={30} height={30} />
            </TouchableOpacity>
          </View>

          {/* Logo Area */}
          <View style={styles.logoContainer}>
            <LogoSVG width={100} height={100} />
            <View style={styles.titleContainer}>
              <Text style={styles.titleBachat}>Bachat</Text>
              <Text style={styles.titleBazaar}> Bazaar</Text>
            </View>
            <Text style={styles.subtitleSmall}>Discover Local Deals Near You</Text>
          </View>

          {/* Main Card */}
          <View style={styles.card}>
            <Text style={styles.heading}>Set a new password</Text>
            <Text style={styles.description}>
              Create a new password. Ensure it differs from previous ones for security
            </Text>

            {/* Inputs */}
            <View style={styles.inputSection}>
              {/* Password Field */}
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

              {/* Confirm Password Field */}
              <Text style={styles.fieldLabel}>Confirm Password</Text>
              <View style={styles.passwordInputContainer}>
                <TextInput
                  style={[styles.inputField, { paddingRight: 40 }]}
                  placeholder="••••••••••••"
                  secureTextEntry={secureConfirmText}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholderTextColor={colors.lighterGray}
                />
                <TouchableOpacity
                  style={styles.eyeBtn}
                  onPress={() => setSecureConfirmText(!secureConfirmText)}
                >
                  <MaterialCommunityIcons
                    name={secureConfirmText ? 'eye-off-outline' : 'eye-outline'}
                    size={22}
                    color="#BBB"
                  />
                </TouchableOpacity>
              </View>


            </View>

            {/* Action Button */}
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => onSubmit(password, confirmPassword)}
            >
              <Text style={styles.actionButtonText}>Set up Your password</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

export default ForgotPasswordScreenView;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    paddingBottom: 40,
  },
  header: {
    width: '100%',
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingHorizontal: 20,
    alignItems: 'flex-start',
  },
  backButton: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  logoContainer: {
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  titleContainer: {
    flexDirection: 'row',
    marginTop: 5,
  },
  titleBachat: {
    fontSize: 26,
    fontFamily: fonts.BOLD,
    color: '#FF8C42',
  },
  titleBazaar: {
    fontSize: 26,
    fontFamily: fonts.BOLD,
    color: '#4CAF50',
  },
  subtitleSmall: {
    fontSize: 16,
    color: '#333',
    marginTop: 2,
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
  heading: {
    fontSize: 24,
    fontFamily: fonts.BOLD,
    color: '#333',
    marginBottom: 10,
  },
  description: {
    fontSize: 16,
    fontFamily: fonts.BOLD,
    color: '#999',
    marginBottom: 25,
    lineHeight: 22,
  },
  inputSection: {
    width: '100%',
  },
  fieldLabel: {
    fontSize: 16,
    fontFamily: fonts.BOLD,
    color: '#333',
    marginBottom: 8,
    marginLeft: 5,
    marginTop: 10,
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
  eyeBtn: {
    padding: 10,
  },
  inputField: {
    flex: 1,
    fontSize: 18,
    color: '#333',
    fontFamily: fonts.BOLD,
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
    marginTop: 20,
  },
  actionButtonText: {
    fontSize: 20,
    fontFamily: fonts.BOLD,
    color: '#fff',
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
