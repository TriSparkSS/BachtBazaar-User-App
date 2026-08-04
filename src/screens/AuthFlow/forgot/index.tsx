import React from 'react';
import { useNavigation, StackActions, useRoute } from '@react-navigation/native';
import ForgotPasswordScreenView from './ForgotPasswordScreenView';
import { userAuthApi } from '../../../services/userAuthApi';
import { showAppAlert } from '../../../services/appAlert';
import { useAppContext } from '../../../context/AppContext';

const isPasswordValid = (value: string) =>
  value.length >= 8 && /[A-Z]/.test(value) && /[!@#$%]/.test(value);

const ForgotPassword = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { authToken, currentUser } = useAppContext();
  // @ts-ignore
  const userId = route.params?.userId;
  // @ts-ignore
  const flow = route.params?.flow;
  // @ts-ignore
  const firebaseToken = route.params?.firebaseToken;
  // @ts-ignore
  const phoneNumber = route.params?.phoneNumber;
  // @ts-ignore
  const sessionToken = route.params?.sessionToken;

  const handleBack = () => {
    navigation.goBack();
  };

  const handleSubmit = async (oldPassword: string, password: string, confirm: string) => {
    if (password !== confirm) {
      showAppAlert('Error', 'Passwords do not match');
      return;
    }

    if (!isPasswordValid(password.trim())) {
      showAppAlert(
        'Weak password',
        'Password must have 8+ characters, 1 uppercase letter, and 1 symbol (!@#$%).',
      );
      return;
    }

    try {
      if (flow === 'change-password') {
        if (!authToken) {
          showAppAlert('Session expired', 'Please log in again.');
          return;
        }

        if (oldPassword.trim().length < 6) {
          showAppAlert('Error', 'Old password must be at least 6 characters');
          return;
        }

        await userAuthApi.changePassword(
          authToken,
          oldPassword.trim(),
          password.trim(),
        );
        showAppAlert('Success', 'Password updated successfully', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
        return;
      }

      if (flow === 'forgot-password') {
        if (!firebaseToken) {
          showAppAlert('Unavailable', 'Verification session expired. Please verify your number again.');
          return;
        }

        await userAuthApi.forgotPassword(firebaseToken, password.trim());
        showAppAlert('Success', 'Password reset successfully', [
          { text: 'OK', onPress: () => navigation.dispatch(StackActions.replace('Login')) },
        ]);
        return;
      }

      const resolvedUserId = userId ?? currentUser?._id;
      const resolvedToken = sessionToken ?? authToken ?? undefined;

      if (!resolvedUserId) {
        showAppAlert('Unavailable', 'User ID not found. Please verify your number again.');
        return;
      }

      if (!resolvedToken) {
        showAppAlert('Session expired', 'Please verify your number again.');
        return;
      }

      await userAuthApi.setPassword(resolvedUserId, password.trim(), resolvedToken);

      if (flow === 'signup-password') {
        // @ts-ignore
        navigation.dispatch(StackActions.replace('Successfull', { isNewUser: true }));
        return;
      }

      showAppAlert('Success', 'Password updated successfully', [
        { text: 'OK', onPress: () => navigation.dispatch(StackActions.replace('Login')) },
      ]);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unable to set password right now.';
      showAppAlert('Password setup failed', message);
    }
  };

  return (
    <ForgotPasswordScreenView
      onBack={handleBack}
      onSubmit={handleSubmit}
      mode={
        flow === 'change-password'
          ? 'change-password'
          : flow === 'forgot-password'
            ? 'forgot-password'
            : 'signup-password'
      }
      phoneNumber={phoneNumber}
    />
  );
};

export default ForgotPassword;
