import { BackHandler } from 'react-native';
import {
  CommonActions,
  createNavigationContainerRef,
  StackActions,
} from '@react-navigation/native';
import { showAppAlert } from '../services/appAlert';

export const navigationRef = createNavigationContainerRef();

const exitApp = () => {
  BackHandler.exitApp();
};

const handleBackButtonClick = () => {
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
