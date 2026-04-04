import React, { useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import ProfileSetupScreenView from './ProfileSetupScreenView';

const ProfileSetup = () => {
    const navigation = useNavigation();
    const [name, setName] = useState('');
    const [gender, setGender] = useState<'Male' | 'Female'>('Male');
    const [address, setAddress] = useState('');

    const handleComplete = () => {
        console.log('Completing profile:', { name, gender, address });
        // @ts-ignore: navigation name typing
        navigation.navigate('MainStack');
    };

    return (
        <ProfileSetupScreenView
            name={name}
            setName={setName}
            gender={gender}
            setGender={setGender}
            address={address}
            setAddress={setAddress}
            onComplete={handleComplete}
        />
    );
};

export default ProfileSetup;
