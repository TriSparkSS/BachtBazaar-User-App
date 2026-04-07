import React, { useRef } from 'react';
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
import LogoSVG from '../../../assets/image/BachatBazaarLogo.svg';
import VectorSVG from '../../../assets/image/Vector.svg';
import { colors, fonts } from '../../../helpers/styles';

const { width, height } = Dimensions.get('window');

interface OTPCodeScreenViewProps {
  otp: string[];
  setOtp: (otp: string[]) => void;
  onVerify: () => void;
  onResend: () => void;
  phoneNumber?: string;
  isVerifying?: boolean;
  isResending?: boolean;
}

const OTPCodeScreenView: React.FC<OTPCodeScreenViewProps> = ({
  otp,
  setOtp,
  onVerify,
  onResend,
  phoneNumber,
  isVerifying = false,
  isResending = false,
}) => {
  const inputRefs = useRef<Array<TextInput | null>>([]);

  const handleOtpChange = (value: string, index: number) => {
    const newOtp = [...otp];
    newOtp[index] = value.replace(/[^0-9]/g, '');
    setOtp(newOtp);

    if (value && index < otp.length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
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
              <Text style={styles.subtitleSmall}>Discover Local Deals Near You</Text>
            </View>

            <View style={styles.card}>
              <Text style={styles.heading}>Check your phone</Text>
              <Text style={styles.subtitle}>
                We sent a otp to <Text style={styles.boldText}>{phoneNumber || '876578932'}</Text>
              </Text>
              <Text style={styles.description}>
                enter 6 digit code that mentioned in the phone
              </Text>

              <View style={styles.otpContainer}>
                {otp.map((digit, index) => (
                  <TextInput
                    key={index}
                    ref={ref => {
                      inputRefs.current[index] = ref;
                    }}
                    style={styles.otpInput}
                    keyboardType="number-pad"
                    maxLength={1}
                    value={digit}
                    onChangeText={value => handleOtpChange(value, index)}
                    onKeyPress={e => handleKeyPress(e, index)}
                  />
                ))}
              </View>

              <TouchableOpacity
                style={[styles.actionButton, isVerifying && styles.actionButtonDisabled]}
                onPress={onVerify}
                disabled={isVerifying}
              >
                <Text style={styles.actionButtonText}>
                  {isVerifying ? 'Verifying...' : 'Verify Code'}
                </Text>
              </TouchableOpacity>

              <View style={styles.resendContainer}>
                <Text style={styles.resendText}>Haven't got the email yet? </Text>
                <TouchableOpacity onPress={onResend} disabled={isResending}>
                  <Text style={styles.resendLink}>
                    {isResending ? 'Sending...' : 'Resend otp'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </AnimatedScreen>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

export default OTPCodeScreenView;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    paddingBottom: 40,
  },
  logoContainer: {
    alignItems: 'center',
    marginTop: height * 0.08,
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
  subtitle: {
    fontSize: 16,
    color: colors.mutedText,
    marginBottom: 5,
    fontFamily: fonts.BOLD,
  },
  boldText: {
    color: colors.text,
    fontFamily: fonts.BOLD,
  },
  description: {
    fontSize: 16,
    fontFamily: fonts.BOLD,
    color: colors.lighterGray,
    marginBottom: 30,
    lineHeight: 22,
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
    gap: 8,
  },
  otpInput: {
    width: 46,
    height: 60,
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.primaryBorder,
    borderRadius: 15,
    textAlign: 'center',
    fontSize: 22,
    fontFamily: fonts.BOLD,
    color: colors.primary,
  },
  actionButton: {
    width: '100%',
    height: 60,
    backgroundColor: colors.primary,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 8,
    marginTop: 5,
  },
  actionButtonDisabled: {
    opacity: 0.75,
  },
  actionButtonText: {
    fontSize: 20,
    fontFamily: fonts.BOLD,
    color: '#fff',
  },
  resendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
  resendText: {
    fontSize: 14,
    color: colors.mutedText,
    fontFamily: fonts.BOLD,
  },
  resendLink: {
    fontSize: 14,
    color: colors.primary,
    fontFamily: fonts.BOLD,
  },
  topRightVector: {
    position: 'absolute',
    top: 40,
    right: 0,
    width: 150,
    height: 200,
    overflow: 'visible',
    opacity: 0.55,
  },
});
