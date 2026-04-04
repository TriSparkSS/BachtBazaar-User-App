import React from 'react';
import { useNavigation, StackActions } from '@react-navigation/native';
import { Alert } from 'react-native';
import ForgotPasswordScreenView from './ForgotPasswordScreenView';

const ForgotPassword = () => {
    const navigation = useNavigation();

    const handleBack = () => {
        navigation.goBack();
    };

    const handleSubmit = (password: string, confirm: string) => {
        console.log('Password setup attempt:', { password, confirm });
        if (password !== confirm) {
           Alert.alert('Error', 'Passwords do not match');
           return;
        }
        // Simulating success
        Alert.alert('Success', 'Password updated successfully', [
            { text: 'OK', onPress: () => navigation.dispatch(StackActions.replace('Login')) }
        ]);
    };

    return (
        <ForgotPasswordScreenView
            onBack={handleBack}
            onSubmit={handleSubmit}
        />
    );
};

export default ForgotPassword;
