import React from 'react';
import { useNavigation, StackActions, useRoute } from '@react-navigation/native';
import ForgotPasswordScreenView from './ForgotPasswordScreenView';
import { userAuthApi } from '../../../services/userAuthApi';
import { showAppAlert } from '../../../services/appAlert';
import { useAppContext } from '../../../context/AppContext';

const ForgotPassword = () => {
    const navigation = useNavigation();
    const route = useRoute();
    const { authToken } = useAppContext();
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
        console.log('[Auth] Password setup attempt', { hasUserId: Boolean(userId), flow });
        if (password !== confirm) {
           showAppAlert('Error', 'Passwords do not match');
           return;
        }

        if (password.trim().length < 6) {
            showAppAlert('Error', 'Password must be at least 6 characters');
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

                const response = await userAuthApi.changePassword(
                    authToken,
                    oldPassword.trim(),
                    password.trim(),
                );
                console.log('[Auth] Change password response', response);
                showAppAlert('Success', 'Password updated successfully', [
                    { text: 'OK', onPress: () => navigation.goBack() }
                ]);
                return;
            }

            if (flow === 'forgot-password') {
                if (!firebaseToken) {
                    showAppAlert('Unavailable', 'Verification session expired. Please verify your number again.');
                    return;
                }

                const response = await userAuthApi.forgotPassword(firebaseToken, password.trim());
                console.log('[Auth] Forgot password response', response);
                showAppAlert('Success', 'Password reset successfully', [
                    { text: 'OK', onPress: () => navigation.dispatch(StackActions.replace('Login')) }
                ]);
                return;
            }

            if (!userId) {
                showAppAlert('Unavailable', 'User ID not found. Please verify your number again.');
                return;
            }

            const response = await userAuthApi.setPassword(
                userId,
                password.trim(),
                sessionToken ?? authToken ?? undefined,
            );
            console.log('[Auth] Set password response', response);

            if (flow === 'signup-password') {
                // @ts-ignore
                navigation.dispatch(StackActions.replace('Successfull', { isNewUser: true }));
                return;
            }

            showAppAlert('Success', 'Password updated successfully', [
                { text: 'OK', onPress: () => navigation.dispatch(StackActions.replace('Login')) }
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
            mode={flow === 'change-password' ? 'change-password' : flow === 'forgot-password' ? 'forgot-password' : 'signup-password'}
            phoneNumber={phoneNumber}
        />
    );
};

export default ForgotPassword;
