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
  Image,
} from 'react-native';
import BackgroundImg from '../../../assets/image/Background.png';
import LogoSVG from '../../../assets/image/BachatBazaarLogo.svg';
import VectorSVG from '../../../assets/image/Vector.svg';
import { colors, fonts } from '../../../helpers/styles';

const { width, height } = Dimensions.get('window');

interface OTPCodeScreenViewProps {
  otp: string[];
  setOtp: (otp: string[]) => void;
  onVerify: () => void;
  onResend: () => void;
}

const OTPCodeScreenView: React.FC<OTPCodeScreenViewProps> = ({ otp, setOtp, onVerify, onResend }) => {
  const inputRefs = [
    useRef<TextInput>(null),
    useRef<TextInput>(null),
    useRef<TextInput>(null),
    useRef<TextInput>(null),
    useRef<TextInput>(null),
  ];

  const handleOtpChange = (value: string, index: number) => {
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus logic
    if (value && index < 4) {
      inputRefs[index + 1].current?.focus();
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs[index - 1].current?.focus();
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
            <Text style={styles.subtitleSmall}>Discover Local Deals Near You</Text>
          </View>

          {/* Main Card */}
          <View style={styles.card}>
            <Text style={styles.heading}>Check your phone</Text>
            <Text style={styles.subtitle}>
              We sent a otp to <Text style={styles.boldText}>876578932</Text>
            </Text>
            <Text style={styles.description}>
              enter 5 digit code that mentioned in the phone
            </Text>

            {/* OTP Inputs */}
            <View style={styles.otpContainer}>
              {otp.map((digit, index) => (
                <TextInput
                  key={index}
                  ref={inputRefs[index]}
                  style={styles.otpInput}
                  keyboardType="number-pad"
                  maxLength={1}
                  value={digit}
                  onChangeText={(value) => handleOtpChange(value, index)}
                  onKeyPress={(e) => handleKeyPress(e, index)}
                />
              ))}
            </View>

            {/* Action Button */}
            <TouchableOpacity style={styles.actionButton} onPress={onVerify}>
              <Text style={styles.actionButtonText}>Verify Code</Text>
            </TouchableOpacity>



            {/* Resend Link */}
            <View style={styles.resendContainer}>
              <Text style={styles.resendText}>Haven't got the email yet? </Text>
              <TouchableOpacity onPress={onResend}>
                <Text style={styles.resendLink}>Resend otp</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

export default OTPCodeScreenView;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 1)',
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
    backgroundColor: 'rgba(255, 255, 255, 1)',
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
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 5,
    fontFamily: fonts.BOLD,
  },
  boldText: {
    color: '#333',
    fontFamily: fonts.BOLD,
  },
  description: {
    fontSize: 16,
    fontFamily: fonts.BOLD,
    color: '#999',
    marginBottom: 30,
    lineHeight: 22,
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  otpInput: {
    width: 55,
    height: 60,
    backgroundColor: '#FFF',
    borderWidth: 1.5,
    borderColor: '#E0A361',
    borderRadius: 15,
    textAlign: 'center',
    fontSize: 22,
    fontFamily: fonts.BOLD,
    color: '#333',
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
  dashedBorder: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#D0D0D0',
  },
  placeholderBox: {
    width: '100%',
    height: 55,
    marginTop: 25,
    borderRadius: 15,
    opacity: 0.5,
  },
  resendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
  resendText: {
    fontSize: 14,
    color: '#999',
    fontFamily: fonts.BOLD,
  },
  resendLink: {
    fontSize: 14,
    color: '#E0A361',
    fontFamily: fonts.BOLD,
    textDecorationLine: 'underline',
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
