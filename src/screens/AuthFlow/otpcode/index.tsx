import React, { useState } from 'react';
import { useNavigation, useRoute } from '@react-navigation/native';
import OTPCodeScreenView from './OTPCodeScreenView';
import { useAppContext } from '../../../context/AppContext';
import {
  clearPhoneVerificationState,
  confirmPhoneVerificationOtp,
  resendPhoneVerificationOtp,
} from '../../../services/firebasePhoneAuth';
import { userAuthApi } from '../../../services/userAuthApi';
import { showAppAlert } from '../../../services/appAlert';

const OTPCode = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { pendingAuth, setSession } = useAppContext();
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);

  // @ts-ignore
  const phoneNumber = route.params?.phoneNumber ?? pendingAuth?.normalizedPhone ?? '';

  const handleBack = () => {
    clearPhoneVerificationState();
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

      const { token: firebaseToken } = await confirmPhoneVerificationOtp(fullOtp);
      clearPhoneVerificationState();

      if (pendingAuth.mode === 'login') {
        const response = await userAuthApi.loginWithOtp(
          firebaseToken,
          pendingAuth.phone,
        );
        await setSession(response.token, response.user);
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
          firebaseToken,
        });
        return;
      }

      const response = await userAuthApi.verifyOtp(firebaseToken, pendingAuth.phone);

      if ('token' in response && response.user) {
        await setSession(response.token, response.user);
        // @ts-ignore
        navigation.navigate('Forgot', {
          flow: 'signup-password',
          phoneNumber: pendingAuth.normalizedPhone,
        });
        return;
      }

      // @ts-ignore
      navigation.navigate('Forgot', {
        flow: 'signup-password',
        phoneNumber: pendingAuth.normalizedPhone,
        userId: response.userId,
        sessionToken: response.sessionToken,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to verify OTP.';
      showAppAlert('Verification failed', message);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResend = async () => {
    if (!pendingAuth) {
      showAppAlert('Session expired', 'Please request OTP again.');
      return;
    }

    try {
      setIsResending(true);
      await userAuthApi.sendOtp(pendingAuth.normalizedPhone);
      await resendPhoneVerificationOtp();
      setOtp(['', '', '', '', '', '']);
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
