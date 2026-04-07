import React, { useEffect } from 'react';
import { useNavigation, StackActions } from '@react-navigation/native';
import SplashScreenView from './SplashScreenView';
import { useAppContext } from '../../../context/AppContext';

const Splash = () => {
  const navigation = useNavigation();
  const { authToken, currentUser, isBootstrapping } = useAppContext();

  useEffect(() => {
    if (isBootstrapping) {
      return;
    }

    const timer = setTimeout(() => {
      if (authToken && currentUser) {
        const root = navigation.getParent();
        if (root) {
          // @ts-ignore
          root.navigate('MainStack');
        }
        return;
      }

      navigation.dispatch(StackActions.replace('Login'));
    }, 1200);

    return () => clearTimeout(timer);
  }, [authToken, currentUser, isBootstrapping, navigation]);

  return <SplashScreenView />;
};

export default Splash;
