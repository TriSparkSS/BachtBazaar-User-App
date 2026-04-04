import React, { useState } from 'react';
import { useNavigation, StackActions } from '@react-navigation/native';
import { Alert } from 'react-native';
import OTPCodeScreenView from './OTPCodeScreenView';

const OTPCode = () => {
    const navigation = useNavigation();
    const [otp, setOtp] = useState(['', '', '', '', '']);

    const handleVerify = () => {
        const fullOtp = otp.join('');
        console.log('OTP Verify attempt:', fullOtp);
        if (fullOtp.length < 5) {
            Alert.alert('Error', 'Please enter the complete 5-digit code');
            return;
        }
        // Simulating success
        Alert.alert('Success', 'OTP Verified successfully', [
            // @ts-ignore: navigation names are not typed
            { text: 'OK', onPress: () => navigation.navigate('Successfull') }
        ]);
    };

    const handleResend = () => {
        console.log('Resending OTP...');
        Alert.alert('Resent', 'A new OTP has been sent to your phone number');
    };

    return (
        <OTPCodeScreenView
            otp={otp}
            setOtp={setOtp}
            onVerify={handleVerify}
            onResend={handleResend}
        />
    );
};

export default OTPCode;
