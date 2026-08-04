import React, { useState } from 'react';
import { useNavigation, useRoute } from '@react-navigation/native';
import SuccessfullScreenView from './SuccessfullScreenView';

const Successfull = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const [isNavigating, setIsNavigating] = useState(false);
  // @ts-ignore
  const isNewUser = route.params?.isNewUser ?? true;

  const handleGoToDashboard = async () => {
    if (isNavigating) {
      return;
    }

    try {
      setIsNavigating(true);
      const root = navigation.getParent();
      if (root) {
        // @ts-ignore
        root.navigate('MainStack');
      }
    } finally {
      setIsNavigating(false);
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
      isSubmitting={isNavigating}
    />
  );
};

export default Successfull;
