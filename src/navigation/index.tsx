import React from 'react';
import { BackHandler } from 'react-native';
import {
  CommonActions,
  NavigationContainer,
  createNavigationContainerRef,
  StackActions,
} from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { enableScreens } from 'react-native-screens';
import { AuthStack } from './AuthStack';
import { MainStack } from './MainStack';
import { showAppAlert } from '../services/appAlert';
import { useAppContext } from '../context/AppContext';
import SplashScreenView from '../screens/AuthFlow/splash/SplashScreenView';

enableScreens(false);

export const navigationRef = createNavigationContainerRef();

let isInMainStack = false;

const exitApp = () => {
  BackHandler.exitApp();
};

const handleBackButtonClick = () => {
  if (isInMainStack) {
    return false;
  }

  if (!navigationRef.canGoBack()) {
    showAppAlert('Hold on!', 'Are you sure you want to exit the application?', [
      {
        text: 'Cancel',
        onPress: () => console.log('cancel'),
      },
      {
        text: 'Yes',
        onPress: () => exitApp(),
      },
    ]);
  }
  return !navigationRef.canGoBack();
};

export function navigate(name: string, params?: any) {
  if (navigationRef.isReady()) {
    // @ts-ignore
    navigationRef.dispatch(StackActions.replace(name, params));
  }
}

export function replace(name: string, params?: any) {
  if (navigationRef.isReady()) {
    // @ts-ignore
    navigationRef.dispatch(StackActions.replace(name, params));
  }
}

export function resetToAuthLogin() {
  if (!navigationRef.isReady()) {
    return;
  }

  navigationRef.dispatch(
    CommonActions.reset({
      index: 0,
      routes: [
        {
          name: 'AuthFlow',
          state: {
            index: 0,
            routes: [{ name: 'Login' }],
          },
        },
      ],
    }),
  );
}

export function goBack() {
  if (navigationRef.isReady()) {
    try {
      if (navigationRef.canGoBack()) {
        navigationRef.goBack();
      } else {
        handleBackButtonClick();
      }
    } catch (error) {
      console.log(error);
    }
  }
}

const RootStackNav = createStackNavigator();

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
      <RootStackNav.Screen component={AuthStack} name="AuthFlow" />
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
