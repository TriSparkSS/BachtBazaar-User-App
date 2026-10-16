import { Platform } from 'react-native';
import { getApp } from '@react-native-firebase/app';
import {
  AppleAuthProvider,
  GoogleAuthProvider,
  getAuth,
  signInWithCredential,
} from '@react-native-firebase/auth';
import { appleAuth } from '@invertase/react-native-apple-authentication';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import { getGoogleWebClientId } from '../config/firebase';
import { logApiEvent } from './apiClient';
import { ensureFirebaseAppCheck } from './firebaseAppCheck';

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

const isFirebaseNetworkError = (error: unknown) => {
  const code =
    typeof error === 'object' && error && 'code' in error
      ? String((error as { code?: unknown }).code)
      : '';
  const message = getErrorMessage(error);
  return /network-request-failed|app-check|too-many-requests|internal-error|network error/i.test(
    `${code} ${message}`,
  );
};

export const signInWithGoogle = async (): Promise<GoogleSignInResult | null> => {
  configureGoogleSignIn();
  await ensureFirebaseAppCheck();

  if (Platform.OS === 'android') {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
  }

  try {
    try {
      await GoogleSignin.signOut();
    } catch {
      // A stale Google session on emulators can block a fresh sign-in.
    }

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

    const googleUser = result.data.user;
    const googleProfile = {
      googleIdToken: idToken,
      uid: googleUser.id,
      email: googleUser.email,
      displayName: googleUser.name,
      photoUrl: googleUser.photo,
    };

    try {
      const authInstance = getAuth(getApp());
      const credential = GoogleAuthProvider.credential(idToken);
      const userCredential = await signInWithCredential(authInstance, credential);
      const firebaseToken = await userCredential.user.getIdToken(true);

      return {
        firebaseToken,
        googleIdToken: idToken,
        uid: userCredential.user.uid,
        email: userCredential.user.email ?? googleProfile.email,
        displayName: userCredential.user.displayName ?? googleProfile.displayName,
        photoUrl: userCredential.user.photoURL ?? googleProfile.photoUrl,
      };
    } catch (firebaseError) {
      if (!isFirebaseNetworkError(firebaseError)) {
        throw firebaseError;
      }

      logApiEvent('Firebase Google credential fallback', {
        error: getErrorMessage(firebaseError),
        hint: 'Using the Google ID token so login can continue when Firebase Auth is unreachable.',
      });

      return {
        firebaseToken: idToken,
        ...googleProfile,
      };
    }
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

export type AppleSignInResult = {
  firebaseToken: string;
  appleIdToken: string;
  uid: string;
  email?: string | null;
  displayName?: string | null;
};

export const isAppleSignInAvailable = () =>
  Platform.OS === 'ios' && appleAuth.isSupported;

export const signInWithApple = async (): Promise<AppleSignInResult | null> => {
  if (!isAppleSignInAvailable()) {
    throw new Error('Apple sign-in is available on iOS devices only.');
  }

  try {
    const appleResponse = await appleAuth.performRequest({
      requestedOperation: appleAuth.Operation.LOGIN,
      requestedScopes: [appleAuth.Scope.FULL_NAME, appleAuth.Scope.EMAIL],
    });

    const { identityToken, nonce, fullName, email } = appleResponse;
    if (!identityToken) {
      throw new Error('Apple sign-in did not return an identity token.');
    }

    const authInstance = getAuth(getApp());
    const credential = AppleAuthProvider.credential(identityToken, nonce);
    const userCredential = await signInWithCredential(authInstance, credential);
    const firebaseToken = await userCredential.user.getIdToken();

    // Apple only shares the name on the first sign-in.
    const appleName = [fullName?.givenName, fullName?.familyName]
      .filter(Boolean)
      .join(' ')
      .trim();

    return {
      firebaseToken,
      appleIdToken: identityToken,
      uid: userCredential.user.uid,
      email: userCredential.user.email ?? email,
      displayName: userCredential.user.displayName ?? (appleName || null),
    };
  } catch (error) {
    if (
      typeof error === 'object' &&
      error &&
      'code' in error &&
      error.code === appleAuth.Error.CANCELED
    ) {
      return null;
    }

    throw new Error(error instanceof Error ? error.message : 'Unable to sign in with Apple.');
  }
};
