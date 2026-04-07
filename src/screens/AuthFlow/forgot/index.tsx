import React from 'react';
import { useNavigation, StackActions, useRoute } from '@react-navigation/native';
import ForgotPasswordScreenView from './ForgotPasswordScreenView';
import { userAuthApi } from '../../../services/userAuthApi';
import { showAppAlert } from '../../../services/appAlert';

const ForgotPassword = () => {
    const navigation = useNavigation();
    const route = useRoute();
    // @ts-ignore
    const userId = route.params?.userId;
    // @ts-ignore
    const flow = route.params?.flow;

    const handleBack = () => {
        navigation.goBack();
    };

    const handleSubmit = async (password: string, confirm: string) => {
        console.log('[Auth] Password setup attempt', { hasUserId: Boolean(userId), flow });
        if (password !== confirm) {
           showAppAlert('Error', 'Passwords do not match');
           return;
        }

        if (password.trim().length < 6) {
            showAppAlert('Error', 'Password must be at least 6 characters');
            return;
        }

        if (!userId) {
            showAppAlert('Unavailable', 'User ID not found. Please verify your number again.');
            return;
        }

        try {
            const response = await userAuthApi.setPassword(userId, password.trim());
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
        />
    );
};

export default ForgotPassword;
