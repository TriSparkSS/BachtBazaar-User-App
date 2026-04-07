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
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import AnimatedScreen from '../../../components/AnimatedScreen';
import LogoSVG from '../../../assets/image/BachatBazaarLogo.svg';
import VectorSVG from '../../../assets/image/Vector.svg';
import BackButtonSVG from '../../../assets/icon/BackButton.svg';
import { colors, fonts } from '../../../helpers/styles';

const { width } = Dimensions.get('window');

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
      <View style={styles.topRightVector}>
        <VectorSVG width={150} height={160} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <AnimatedScreen>
            <View style={styles.header}>
              <TouchableOpacity style={styles.backButton} onPress={onBack}>
                <BackButtonSVG width={30} height={30} />
              </TouchableOpacity>
            </View>

            <View style={styles.logoContainer}>
              <LogoSVG width={100} height={100} />
              <View style={styles.titleContainer}>
                <Text style={styles.titleBachat}>Bachat</Text>
                <Text style={styles.titleBazaar}> Bazaar</Text>
              </View>
              <Text style={styles.subtitleSmall}>Discover Local Deals Near You</Text>
            </View>

            <View style={styles.card}>
              <Text style={styles.heading}>Set a new password</Text>
              <Text style={styles.description}>
                Create a new password. Ensure it differs from previous ones for security
              </Text>

              <Text style={styles.fieldLabel}>Password</Text>
              <View style={styles.passwordInputContainer}>
                <TextInput
                  style={[styles.inputField, styles.inputWithIcon]}
                  placeholder="••••••••••••"
                  secureTextEntry={secureText}
                  value={password}
                  onChangeText={setPassword}
                  placeholderTextColor={colors.lighterGray}
                />
                <TouchableOpacity style={styles.eyeBtn} onPress={() => setSecureText(!secureText)}>
                  <MaterialCommunityIcons
                    name={secureText ? 'eye-off-outline' : 'eye-outline'}
                    size={22}
                    color={colors.lighterGray}
                  />
                </TouchableOpacity>
              </View>

              <Text style={styles.fieldLabel}>Confirm Password</Text>
              <View style={styles.passwordInputContainer}>
                <TextInput
                  style={[styles.inputField, styles.inputWithIcon]}
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
                    color={colors.lighterGray}
                  />
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => onSubmit(password, confirmPassword)}
              >
                <Text style={styles.actionButtonText}>Set up Your password</Text>
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
    backgroundColor: colors.white,
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    paddingBottom: 40,
  },
  topRightVector: {
    position: 'absolute',
    top: 36,
    right: 0,
    opacity: 0.55,
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
    backgroundColor: colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.primaryBorder,
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
    color: colors.primary,
  },
  titleBazaar: {
    fontSize: 26,
    fontFamily: fonts.BOLD,
    color: colors.primary,
  },
  subtitleSmall: {
    fontSize: 16,
    color: colors.text,
    marginTop: 2,
    fontFamily: fonts.BOLD,
  },
  card: {
    width: width * 0.9,
    backgroundColor: colors.white,
    borderRadius: 35,
    padding: 25,
    paddingVertical: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 8,
    marginTop: 10,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
  },
  heading: {
    fontSize: 24,
    fontFamily: fonts.BOLD,
    color: colors.text,
    marginBottom: 10,
  },
  description: {
    fontSize: 16,
    fontFamily: fonts.BOLD,
    color: colors.mutedText,
    marginBottom: 25,
    lineHeight: 22,
  },
  fieldLabel: {
    fontSize: 16,
    fontFamily: fonts.BOLD,
    color: colors.text,
    marginBottom: 8,
    marginLeft: 5,
    marginTop: 10,
  },
  passwordInputContainer: {
    width: '100%',
    height: 58,
    backgroundColor: colors.white,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    paddingLeft: 15,
    paddingRight: 5,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  inputField: {
    flex: 1,
    fontSize: 18,
    color: colors.text,
    fontFamily: fonts.BOLD,
  },
  inputWithIcon: {
    paddingRight: 40,
  },
  eyeBtn: {
    padding: 10,
  },
  actionButton: {
    width: '100%',
    height: 60,
    backgroundColor: colors.primary,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 22,
  },
  actionButtonText: {
    fontSize: 18,
    fontFamily: fonts.BOLD,
    color: colors.white,
  },
});
