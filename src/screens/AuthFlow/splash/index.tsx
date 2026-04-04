import React, { useEffect } from 'react';
import { useNavigation, StackActions } from '@react-navigation/native';
import SplashScreenView from './SplashScreenView';

const Splash = () => {
  const navigation = useNavigation();

  useEffect(() => {
    const timer = setTimeout(() => {
      const root = navigation.getParent();
      if (root) {
        navigation.dispatch(StackActions.replace('Login'));
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [navigation]);

  return <SplashScreenView />;
};

export default Splash;
