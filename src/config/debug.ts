/**
 * Logs every API request/response in Metro or logcat.
 * Keep this true while testing API integration in installed APKs.
 * Set it back to false before production release builds.
 */
const FORCE_API_DEBUG = true;

export const API_DEBUG = __DEV__ || FORCE_API_DEBUG;

/**
 * Paste your Firebase App Check debug token here after the first dev run.
 * Register it in Firebase Console → App Check → your app → Manage debug tokens.
 */
export const APP_CHECK_DEBUG_TOKEN = 'AB20B1B3-F288-4230-B16E-E49B7284B1BF';
