import React from 'react';
import { StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { enableScreens } from 'react-native-screens';
import { MainStack } from './MainStack';
import { useAppContext } from '../context/AppContext';
import SplashScreenView from '../screens/AuthFlow/splash/SplashScreenView';
import AuthScreens from '../screens/AuthFlow';
import { colors } from '../helpers/styles';
import { navigationRef } from './navigationService';

export {
  goBack,
  navigate,
  navigationRef,
  replace,
  resetToAuthLogin,
} from './navigationService';

enableScreens(false);

const RootStackNav = createStackNavigator();
const AuthStackNav = createStackNavigator();

const AuthFlowNavigator = () => (
  <AuthStackNav.Navigator
    screenOptions={{
      headerShown: false,
      cardStyle: styles.authCard,
    }}
    initialRouteName="Login">
    <AuthStackNav.Screen component={AuthScreens.Splash} name="Splash" />
    <AuthStackNav.Screen component={AuthScreens.Login} name="Login" />
    <AuthStackNav.Screen component={AuthScreens.Forgot} name="Forgot" />
    <AuthStackNav.Screen component={AuthScreens.OTPCode} name="OTPCode" />
    <AuthStackNav.Screen component={AuthScreens.Successfull} name="Successfull" />
    <AuthStackNav.Screen component={AuthScreens.ProfileSetup} name="ProfileSetup" />
  </AuthStackNav.Navigator>
);

const RootNavigator = () => {
  const { isAuthenticated, isBootstrapping } = useAppContext();

  if (isBootstrapping) {
    return <SplashScreenView />;
  }

  return (
    <RootStackNav.Navigator
      key={isAuthenticated ? 'authenticated' : 'guest'}
      screenOptions={{
        headerShown: false,
      }}
      initialRouteName={isAuthenticated ? 'MainStack' : 'AuthFlow'}>
      <RootStackNav.Screen component={AuthFlowNavigator} name="AuthFlow" />
      <RootStackNav.Screen component={MainStack} name="MainStack" />
    </RootStackNav.Navigator>
  );
};

export const AppNavigation = () => {
  return (
    <SafeAreaProvider>
      <NavigationContainer ref={navigationRef}>
        <RootNavigator />
      </NavigationContainer>
    </SafeAreaProvider>
  );
};

const styles = StyleSheet.create({
  authCard: {
    backgroundColor: colors.white,
  },
});
