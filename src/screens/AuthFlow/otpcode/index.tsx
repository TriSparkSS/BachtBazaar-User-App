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
      console.log('[Auth] Firebase token received for OTP verification', {
        phone: pendingAuth.phone,
        exists: pendingAuth.exists,
        mode: pendingAuth.mode,
      });

      const response =
        pendingAuth.mode === 'login'
          ? await userAuthApi.loginWithOtp(firebaseToken)
          : await userAuthApi.verifyOtp(firebaseToken);

      console.log('[Auth] OTP API response', response);
      await setSession(response.token, response.user);
      clearPhoneVerificationState();

      if (pendingAuth.mode === 'login') {
        const root = navigation.getParent();
        if (root) {
          // @ts-ignore
          root.navigate('MainStack');
        }
        return;
      }

      // @ts-ignore
      navigation.navigate('Forgot', {
        userId: response.user._id,
        flow: 'signup-password',
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
      phoneNumber={phoneNumber}
      isVerifying={isVerifying}
      isResending={isResending}
    />
  );
};

export default OTPCode;
