import React from 'react';
import { useNavigation, StackActions } from '@react-navigation/native';
import { Alert } from 'react-native';
import LoginScreenView from './LoginScreenView';

const Login = () => {
    const navigation = useNavigation();

    const handleLogin = (phone: string, password: string) => {
        console.log('Login attempt:', { phone, password });
        // After successful login, replace AuthFlow with MainStack
        // In a real app, this would happen after API call
        const root = navigation.getParent();
        if (root) {
            root.dispatch(StackActions.replace('MainStack'));
        }
    };

    const handleSignin = (phone: string, password: string) => {
        console.log('Signin attempt:', { phone, password });
        // After "Send OTP", navigate to the OTP Code screen
        // @ts-ignore: navigation names are not typed
        navigation.navigate('OTPCode');
    };

    const handleForgotPassword = () => {
        // @ts-ignore: navigation names are not typed
        navigation.navigate('Forgot');
    };

    return (
        <LoginScreenView
            onLogin={handleLogin}
            onSignin={handleSignin}
            onForgotPassword={handleForgotPassword}
        />
    );
};

export default Login;
