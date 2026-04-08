import { Platform } from 'react-native';
import auth from '@react-native-firebase/auth';
import type { FirebaseAuthTypes } from '@react-native-firebase/auth';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { UserProfile } from '../types/auth';

let googleConfigured = false;

const mapFirebaseUserToProfile = (firebaseUser: FirebaseAuthTypes.User): UserProfile => ({
  _id: firebaseUser.uid,
  phone: firebaseUser.phoneNumber ?? '',
  name: firebaseUser.displayName ?? 'User',
  address: '',
  profileImage: firebaseUser.photoURL ?? undefined,
  isVerified: true,
});

export const configureGoogleSignIn = () => {
  if (googleConfigured) {
    return;
  }

  GoogleSignin.configure({
    scopes: ['email', 'profile'],
  });

  googleConfigured = true;
};

export const signInWithGoogle = async () => {
  configureGoogleSignIn();
  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

  const result = await GoogleSignin.signIn();
  if (result.type === 'cancelled') {
    return null;
  }

  const tokens = await GoogleSignin.getTokens();
  const idToken = result.data.idToken ?? tokens.idToken ?? null;
  const accessToken = tokens.accessToken;

  if (!idToken && !accessToken) {
    throw new Error(
      'Google sign-in is missing Firebase OAuth configuration. Please add the Google OAuth client in Firebase.',
    );
  }

  const credential = auth.GoogleAuthProvider.credential(idToken, accessToken);
  const userCredential = await auth().signInWithCredential(credential);
  const firebaseToken = await userCredential.user.getIdToken();

  return {
    token: firebaseToken,
    user: mapFirebaseUserToProfile(userCredential.user),
    googleUser: result.data.user,
  };
};

export const signInWithApple = async () => {
  if (Platform.OS !== 'ios') {
    throw new Error('Apple sign-in is available on iOS devices only.');
  }

  throw new Error('Apple sign-in still needs Apple developer configuration.');
};
