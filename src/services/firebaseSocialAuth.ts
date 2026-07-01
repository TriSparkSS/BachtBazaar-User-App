import { Platform } from 'react-native';
import { getApp } from '@react-native-firebase/app';
import {
  GoogleAuthProvider,
  getAuth,
  signInWithCredential,
} from '@react-native-firebase/auth';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import { getGoogleWebClientId } from '../config/firebase';

let googleConfigured = false;

export const configureGoogleSignIn = () => {
  if (googleConfigured) {
    return;
  }

  GoogleSignin.configure({
    webClientId: getGoogleWebClientId(),
    scopes: ['email', 'profile'],
    offlineAccess: false,
  });

  googleConfigured = true;
};

export type GoogleSignInResult = {
  firebaseToken: string;
  googleIdToken: string;
  uid: string;
  email?: string | null;
  displayName?: string | null;
  photoUrl?: string | null;
};

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  return 'Unable to sign in with Google.';
};

export const signInWithGoogle = async (): Promise<GoogleSignInResult | null> => {
  configureGoogleSignIn();
  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

  try {
    const result = await GoogleSignin.signIn();
    if (result.type !== 'success') {
      return null;
    }

    const tokens = await GoogleSignin.getTokens();
    const idToken = result.data.idToken ?? tokens.idToken ?? null;

    if (!idToken) {
      throw new Error(
        'Google sign-in did not return an ID token. Verify the Web client ID and SHA-1 fingerprint in Firebase.',
      );
    }

    const authInstance = getAuth(getApp());
    const credential = GoogleAuthProvider.credential(idToken);
    const userCredential = await signInWithCredential(authInstance, credential);
    const firebaseToken = await userCredential.user.getIdToken();

    return {
      firebaseToken,
      googleIdToken: idToken,
      uid: userCredential.user.uid,
      email: userCredential.user.email ?? result.data.user.email,
      displayName: userCredential.user.displayName ?? result.data.user.name,
      photoUrl: userCredential.user.photoURL ?? result.data.user.photo,
    };
  } catch (error) {
    if (
      typeof error === 'object' &&
      error &&
      'code' in error &&
      error.code === statusCodes.SIGN_IN_CANCELLED
    ) {
      return null;
    }

    throw new Error(getErrorMessage(error));
  }
};

export const signInWithApple = async () => {
  if (Platform.OS !== 'ios') {
    throw new Error('Apple sign-in is available on iOS devices only.');
  }

  throw new Error('Apple sign-in still needs Apple developer configuration.');
};
