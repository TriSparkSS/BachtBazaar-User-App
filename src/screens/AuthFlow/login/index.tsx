import React, { useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import LoginScreenView from './LoginScreenView';
import { useAppContext } from '../../../context/AppContext';
import { userAuthApi } from '../../../services/userAuthApi';
import {
  normalizeIndianPhoneNumber,
  sendPhoneVerificationOtp,
  validateIndianPhoneInput,
} from '../../../services/firebasePhoneAuth';
import { showAppAlert } from '../../../services/appAlert';
import { configureGoogleSignIn, signInWithApple, signInWithGoogle } from '../../../services/firebaseSocialAuth';
import { useEffect } from 'react';

const Login = () => {
  const navigation = useNavigation();
  const { setPendingAuth, setSession } = useAppContext();
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    configureGoogleSignIn();
  }, []);

  const navigateToOtp = async (
    phone: string,
    mode: 'login' | 'signup',
    exists: boolean,
  ) => {
    const normalizedPhone = normalizeIndianPhoneNumber(phone);
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
    if (!validateIndianPhoneInput(phone)) {
      showAppAlert('Invalid number', 'Please enter a valid 10-digit mobile number.');
      return;
    }

    if (password.trim().length < 6) {
      showAppAlert('Invalid password', 'Password must be at least 6 characters.');
      return;
    }

    try {
      setIsSubmitting(true);
      const response = await userAuthApi.loginWithPassword(phone.replace(/\D/g, ''), password);
      console.log('[Auth] Login with password response', response);
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
    if (!validateIndianPhoneInput(phone)) {
      showAppAlert('Invalid number', 'Please enter a valid 10-digit mobile number.');
      return;
    }

    try {
      setIsSubmitting(true);
      const plainPhone = phone.replace(/\D/g, '');
      const sendOtpResponse = await userAuthApi.sendOtp(plainPhone);
      console.log('[Auth] Send OTP response', sendOtpResponse);

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
    if (!validateIndianPhoneInput(phone)) {
      showAppAlert('Invalid number', 'Please enter a valid 10-digit mobile number.');
      return;
    }

    try {
      setIsSubmitting(true);
      const plainPhone = phone.replace(/\D/g, '');
      const sendOtpResponse = await userAuthApi.sendOtp(plainPhone);
      console.log('[Auth] Signup Send OTP response', sendOtpResponse);

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

  const handleForgotPassword = () => {
    // @ts-ignore
    navigation.navigate('Forgot');
  };

  const handleGooglePress = () => {
    const run = async () => {
      try {
        setIsSubmitting(true);
        const response = await signInWithGoogle();
        if (!response) {
          return;
        }

        console.log('[Auth] Google login response', response);
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
