import React from 'react';
import { useNavigation, useRoute } from '@react-navigation/native';
import SuccessfullScreenView from './SuccessfullScreenView';

const Successfull = () => {
  const navigation = useNavigation();
  const route = useRoute();
  // @ts-ignore
  const isNewUser = route.params?.isNewUser ?? true;

  const handleGoToDashboard = () => {
    const root = navigation.getParent();
    if (root) {
      // @ts-ignore
      root.navigate('MainStack');
    }
  };

  const handleSetUpProfile = () => {
    // @ts-ignore
    navigation.navigate('ProfileSetup', { isNewUser });
  };

  return (
    <SuccessfullScreenView
      onGoToDashboard={handleGoToDashboard}
      onSetUpProfile={handleSetUpProfile}
      isNewUser={isNewUser}
    />
  );
};

export default Successfull;
