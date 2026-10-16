import React, { useEffect, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import LoginScreenView from './LoginScreenView';
import { useAppContext } from '../../../context/AppContext';
import { userAuthApi } from '../../../services/userAuthApi';
import { normalizePhoneNumber, validatePhoneInput } from '../../../services/phoneNumber';
import { showAppAlert } from '../../../services/appAlert';
import { getFcmToken } from '../../../services/fcmToken';
import {
  isAppleSignInAvailable,
  signInWithApple,
  signInWithGoogle,
} from '../../../services/firebaseSocialAuth';
import { resetToMainStack } from '../../../navigation/navigationService';

const Login = () => {
  const navigation = useNavigation();
  const { setPendingAuth, setSession } = useAppContext();
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // Warm FCM token while user is on the login screen.
    void getFcmToken();
  }, []);

  const navigateToOtp = (
    phone: string,
    mode: 'login' | 'signup' | 'forgot-password',
    exists: boolean,
  ) => {
    const normalizedPhone = normalizePhoneNumber(phone);

    setPendingAuth({
      phone: phone.replace(/\D/g, ''),
      normalizedPhone,
      exists,
      mode,
    });

    // @ts-ignore
    navigation.navigate('OTPCode', {
      phoneNumber: normalizedPhone,
      pendingAuth: {
        phone: phone.replace(/\D/g, ''),
        normalizedPhone,
        exists,
        mode,
      },
    });
  };

  const handleLoginWithPassword = async (phone: string, password: string) => {
    if (!validatePhoneInput(phone)) {
      showAppAlert(
        'Invalid number',
        'Please enter a valid mobile number for the selected country.',
      );
      return;
    }

    if (password.trim().length < 6) {
      showAppAlert('Invalid password', 'Password must be at least 6 characters.');
      return;
    }

    try {
      setIsSubmitting(true);
      const fcmToken = await getFcmToken();
      const response = await userAuthApi.loginWithPassword(phone, password, fcmToken);
      await setSession(response.token, response.user);
      const { consumePendingOfferDeepLink } = await import(
        '../../../services/deepLinkHandler'
      );
      void consumePendingOfferDeepLink();
      resetToMainStack();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unable to log in with password.';
      showAppAlert('Login failed', message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLoginWithOtp = async (phone: string) => {
    if (!validatePhoneInput(phone)) {
      showAppAlert(
        'Invalid number',
        'Please enter a valid mobile number for the selected country.',
      );
      return;
    }

    try {
      setIsSubmitting(true);
      if (!(await userAuthApi.isPhoneRegistered(phone))) {
        showAppAlert('Account not found', 'This mobile number is not registered. Please sign up first.');
        return;
      }

      await userAuthApi.sendOtp(phone);
      navigateToOtp(phone, 'login', true);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to send OTP.';
      showAppAlert('OTP failed', message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignupWithOtp = async (phone: string) => {
    if (!validatePhoneInput(phone)) {
      showAppAlert(
        'Invalid number',
        'Please enter a valid mobile number for the selected country.',
      );
      return;
    }

    try {
      setIsSubmitting(true);
      if (await userAuthApi.isPhoneRegistered(phone)) {
        showAppAlert('Account already exists', 'This mobile number is already registered. Please log in.');
        return;
      }

      await userAuthApi.sendOtp(phone);
      navigateToOtp(phone, 'signup', false);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to send OTP.';
      showAppAlert('OTP failed', message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgotPassword = async (phone: string) => {
    if (!validatePhoneInput(phone)) {
      showAppAlert(
        'Invalid number',
        'Please enter a valid mobile number for the selected country.',
      );
      return;
    }

    try {
      setIsSubmitting(true);
      if (!(await userAuthApi.isPhoneRegistered(phone))) {
        showAppAlert('Account not found', 'This mobile number is not registered. Please sign up first.');
        return;
      }

      await userAuthApi.sendOtp(phone);
      navigateToOtp(phone, 'forgot-password', true);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to start forgot password.';
      showAppAlert('Forgot password failed', message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGooglePress = () => {
    const run = async () => {
      try {
        setIsSubmitting(true);
        const googleSignIn = await signInWithGoogle();
        if (!googleSignIn) {
          return;
        }

        const response = await userAuthApi.loginWithGoogle(googleSignIn.firebaseToken, {
          uid: googleSignIn.uid,
          googleIdToken: googleSignIn.googleIdToken,
          email: googleSignIn.email,
          displayName: googleSignIn.displayName,
          photoUrl: googleSignIn.photoUrl,
        });

        await setSession(response.token, response.user);

        // @ts-ignore
        navigation.navigate('Successfull', {
          isNewUser: response.isNewUser ?? true,
        });
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : typeof error === 'string'
              ? error
              : 'Unable to sign in with Google.';
        showAppAlert('Google login failed', message);
      } finally {
        setIsSubmitting(false);
      }
    };

    run();
  };

  const handleApplePress = () => {
    const run = async () => {
      try {
        setIsSubmitting(true);
        const appleSignIn = await signInWithApple();
        if (!appleSignIn) {
          return;
        }

        const response = await userAuthApi.loginWithApple(appleSignIn.firebaseToken, {
          appleIdToken: appleSignIn.appleIdToken,
          email: appleSignIn.email,
          displayName: appleSignIn.displayName,
        });

        await setSession(response.token, response.user);

        // @ts-ignore
        navigation.navigate('Successfull', {
          isNewUser: response.isNewUser ?? true,
        });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Unable to sign in with Apple.';
        showAppAlert('Apple login failed', message);
      } finally {
        setIsSubmitting(false);
      }
    };

    run();
  };

  return (
    <LoginScreenView
      onLoginWithPassword={handleLoginWithPassword}
      onLoginWithOtp={handleLoginWithOtp}
      onSignupWithOtp={handleSignupWithOtp}
      onForgotPassword={handleForgotPassword}
      onGooglePress={handleGooglePress}
      onApplePress={handleApplePress}
      showAppleLogin={isAppleSignInAvailable()}
      isSubmitting={isSubmitting}
    />
  );
};

export default Login;
