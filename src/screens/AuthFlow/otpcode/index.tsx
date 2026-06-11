import React, { useState } from 'react';
import { useNavigation, useRoute } from '@react-navigation/native';
import OTPCodeScreenView from './OTPCodeScreenView';
import { useAppContext } from '../../../context/AppContext';
import {
  clearPhoneVerificationState,
  resendPhoneVerificationOtp,
} from '../../../services/firebasePhoneAuth';
import { showAppAlert } from '../../../services/appAlert';

const OTPCode = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { pendingAuth } = useAppContext();
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);

  // @ts-ignore
  const phoneNumber = route.params?.phoneNumber ?? pendingAuth?.normalizedPhone ?? '';

  const handleBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }

    // @ts-ignore
    navigation.navigate('Login');
  };

  const handleVerify = async () => {
    const fullOtp = otp.join('');

    if (fullOtp.length < 6) {
      showAppAlert('Incomplete code', 'Please enter the complete 6-digit OTP.');
      return;
    }

    if (!pendingAuth) {
      showAppAlert('Session expired', 'Please request OTP again.');
      // @ts-ignore
      navigation.navigate('Login');
      return;
    }

    try {
      setIsVerifying(true);

      /*
       * Temporary UI-development bypass:
       * Restore confirmPhoneVerificationOtp and the token-based API calls here
       * when Firebase OTP verification is ready to be enabled again.
       */
      console.log('[Auth] OTP verification bypassed for UI development', {
        phone: pendingAuth.phone,
        exists: pendingAuth.exists,
        mode: pendingAuth.mode,
      });
      clearPhoneVerificationState();

      if (pendingAuth.mode === 'login') {
        const root = navigation.getParent();
        if (root) {
          // @ts-ignore
          root.navigate('MainStack');
        }
        return;
      }

      if (pendingAuth.mode === 'forgot-password') {
        // @ts-ignore
        navigation.navigate('Forgot', {
          flow: 'forgot-password',
          phoneNumber: pendingAuth.normalizedPhone,
          developmentBypass: true,
        });
        return;
      }

      // @ts-ignore
      navigation.navigate('Forgot', {
        flow: 'signup-password',
        phoneNumber: pendingAuth.normalizedPhone,
        developmentBypass: true,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to verify OTP.';
      showAppAlert('Verification failed', message);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResend = async () => {
    try {
      setIsResending(true);
      await resendPhoneVerificationOtp();
      console.log('[Auth] OTP resend requested', { phoneNumber });
      showAppAlert('OTP sent', 'A new OTP has been sent to your mobile number.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to resend OTP.';
      showAppAlert('Resend failed', message);
    } finally {
      setIsResending(false);
    }
  };

  return (
    <OTPCodeScreenView
      otp={otp}
      setOtp={setOtp}
      onVerify={handleVerify}
      onResend={handleResend}
      onBack={handleBack}
      phoneNumber={phoneNumber}
      isVerifying={isVerifying}
      isResending={isResending}
    />
  );
};

export default OTPCode;
