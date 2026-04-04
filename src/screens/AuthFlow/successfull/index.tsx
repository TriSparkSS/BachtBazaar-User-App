import React from 'react';
import { useNavigation } from '@react-navigation/native';
import SuccessfullScreenView from './SuccessfullScreenView';

const Successfull = () => {
    const navigation = useNavigation();

    const handleGoToDashboard = () => {
        console.log('Navigating to Dashboard...');
        // @ts-ignore: navigation name typing
        navigation.navigate('MainStack');
    };

    const handleSetUpProfile = () => {
        console.log('Navigating to Profile Setup...');
        // @ts-ignore: navigation name typing
        navigation.navigate('ProfileSetup');
    };

    return (
        <SuccessfullScreenView
            onGoToDashboard={handleGoToDashboard}
            onSetUpProfile={handleSetUpProfile}
        />
    );
};

export default Successfull;
