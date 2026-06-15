import React, { useEffect, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import LoginScreenView from './LoginScreenView';
import { useAppContext } from '../../../context/AppContext';
import { userAuthApi } from '../../../services/userAuthApi';
import {
  normalizePhoneNumber,
  sendPhoneVerificationOtp,
  validatePhoneInput,
} from '../../../services/firebasePhoneAuth';
import { showAppAlert } from '../../../services/appAlert';
import { configureGoogleSignIn, signInWithApple, signInWithGoogle } from '../../../services/firebaseSocialAuth';

const Login = () => {
  const navigation = useNavigation();
  const { setPendingAuth, setSession } = useAppContext();
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    configureGoogleSignIn();
  }, []);

  const navigateToOtp = async (
    phone: string,
    mode: 'login' | 'signup' | 'forgot-password',
    exists: boolean,
  ) => {
    const normalizedPhone = normalizePhoneNumber(phone);
    await sendPhoneVerificationOtp(phone);

    setPendingAuth({
      phone: phone.replace(/\D/g, ''),
      normalizedPhone,
      exists,
      mode,
    });

    // @ts-ignore
    navigation.navigate('OTPCode', {
      phoneNumber: normalizedPhone,
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
      const response = await userAuthApi.loginWithPassword(phone, password);
      await setSession(response.token, response.user);
      const root = navigation.getParent();
      if (root) {
        // @ts-ignore
        root.navigate('MainStack');
      }
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
      const sendOtpResponse = await userAuthApi.sendOtp(phone);

      if (!sendOtpResponse.exists) {
        showAppAlert('Account not found', 'This mobile number is not registered. Please sign up first.');
        return;
      }

      await navigateToOtp(phone, 'login', true);
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
      const sendOtpResponse = await userAuthApi.sendOtp(phone);

      if (sendOtpResponse.exists) {
        showAppAlert('Account already exists', 'This mobile number is already registered. Please log in.');
        return;
      }

      await navigateToOtp(phone, 'signup', false);
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
      const sendOtpResponse = await userAuthApi.sendOtp(phone);

      if (!sendOtpResponse.exists) {
        showAppAlert('Account not found', 'This mobile number is not registered. Please sign up first.');
        return;
      }

      await navigateToOtp(phone, 'forgot-password', true);
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
        const response = await signInWithGoogle();
        if (!response) {
          return;
        }

        await setSession(response.token, response.user);
        const root = navigation.getParent();
        if (root) {
          // @ts-ignore
          root.navigate('MainStack');
        }
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Unable to sign in with Google.';
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
        await signInWithApple();
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
      isSubmitting={isSubmitting}
    />
  );
};

export default Login;
