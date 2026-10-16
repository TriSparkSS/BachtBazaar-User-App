import React, { useEffect, useRef, useState } from 'react';
import { CommonActions, useNavigation, useRoute } from '@react-navigation/native';
import OTPCodeScreenView from './OTPCodeScreenView';
import { useAppContext } from '../../../context/AppContext';
import { userAuthApi } from '../../../services/userAuthApi';
import { showAppAlert } from '../../../services/appAlert';
import { deepLinkStorage } from '../../../services/deepLinkStorage';
import { resetToMainStack } from '../../../navigation/navigationService';
import { OtpRetryType, PendingAuthState } from '../../../types/auth';

const OTP_LENGTH = 4;
const RESEND_COOLDOWN_SECONDS = 30;

const emptyOtp = () => Array<string>(OTP_LENGTH).fill('');

const OTPCode = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { pendingAuth: contextPendingAuth, setPendingAuth, setSession } =
    useAppContext();
  const [otp, setOtp] = useState(emptyOtp);
  const [isVerifying, setIsVerifying] = useState(false);
  const [resendingType, setResendingType] = useState<OtpRetryType | null>(null);
  const [resendCooldown, setResendCooldown] = useState(RESEND_COOLDOWN_SECONDS);
  const verifyLockRef = useRef(false);

  const routePendingAuth = (route.params as { pendingAuth?: PendingAuthState } | undefined)
    ?.pendingAuth;
  const pendingAuth = routePendingAuth ?? contextPendingAuth;

  const phoneNumber =
    (route.params as { phoneNumber?: string } | undefined)?.phoneNumber ??
    pendingAuth?.normalizedPhone ??
    '';

  const needsSetPassword = (isNewUser: boolean | undefined) => {
    if (pendingAuth?.mode === 'login') {
      return false;
    }
    return pendingAuth?.mode === 'signup' || Boolean(isNewUser);
  };

  useEffect(() => {
    if (resendCooldown <= 0) {
      return;
    }

    const timer = setTimeout(() => setResendCooldown(value => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

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

    if (verifyLockRef.current || isVerifying) {
      return;
    }

    if (fullOtp.length < OTP_LENGTH) {
      showAppAlert('Incomplete code', `Please enter the complete ${OTP_LENGTH}-digit OTP.`);
      return;
    }

    if (!pendingAuth) {
      showAppAlert('Session expired', 'Please request OTP again.');
      // @ts-ignore
      navigation.navigate('Login');
      return;
    }

    try {
      verifyLockRef.current = true;
      setIsVerifying(true);
      setPendingAuth(pendingAuth);

      const response = await userAuthApi.verifyOtp(pendingAuth.normalizedPhone, fullOtp);

      if (pendingAuth.mode === 'forgot-password') {
        navigation.dispatch(
          CommonActions.reset({
            index: 0,
            routes: [
              { name: 'Login' },
              {
                name: 'Forgot',
                params: {
                  flow: 'forgot-password',
                  phoneNumber: pendingAuth.normalizedPhone,
                  userId: response.user._id,
                  sessionToken: response.token,
                },
              },
            ],
          }),
        );
        return;
      }

      const isNewUser = response.isNewUser ?? pendingAuth.mode === 'signup';

      if (needsSetPassword(isNewUser)) {
        navigation.dispatch(
          CommonActions.reset({
            index: 0,
            routes: [
              { name: 'Login' },
              {
                name: 'Forgot',
                params: {
                  flow: 'signup-password',
                  phoneNumber: pendingAuth.normalizedPhone,
                  userId: response.user._id,
                  sessionToken: response.token,
                },
              },
            ],
          }),
        );
        return;
      }

      await deepLinkStorage.clearPendingReferralCode();
      await setSession(response.token, response.user);
      const { consumePendingOfferDeepLink } = await import(
        '../../../services/deepLinkHandler'
      );
      void consumePendingOfferDeepLink();

      const root = navigation.getParent();
      if (root) {
        root.dispatch(
          CommonActions.reset({
            index: 0,
            routes: [{ name: 'MainStack' }],
          }),
        );
        return;
      }

      resetToMainStack();
    } catch (error) {
      verifyLockRef.current = false;
      setIsVerifying(false);
      const message = error instanceof Error ? error.message : 'Unable to verify OTP.';
      showAppAlert('Verification failed', message);
    }
  };

  const handleResend = async (retryType: OtpRetryType) => {
    if (!pendingAuth) {
      showAppAlert('Session expired', 'Please request OTP again.');
      return;
    }

    if (resendCooldown > 0 || resendingType) {
      return;
    }

    try {
      setResendingType(retryType);
      await userAuthApi.resendOtp(pendingAuth.normalizedPhone, retryType);
      setOtp(emptyOtp());
      setResendCooldown(RESEND_COOLDOWN_SECONDS);
      showAppAlert(
        'OTP sent',
        retryType === 'Voice'
          ? 'You will receive a call with your OTP shortly.'
          : 'A new OTP has been sent to your mobile number.',
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to resend OTP.';
      showAppAlert('Resend failed', message);
    } finally {
      setResendingType(null);
    }
  };

  return (
    <OTPCodeScreenView
      otp={otp}
      setOtp={setOtp}
      onVerify={handleVerify}
      onResend={() => handleResend('text')}
      onResendViaCall={() => handleResend('Voice')}
      onBack={handleBack}
      phoneNumber={phoneNumber}
      isVerifying={isVerifying}
      resendingType={resendingType}
      resendCooldown={resendCooldown}
    />
  );
};

export default OTPCode;
