import { getApp } from '@react-native-firebase/app';
import {
  FirebaseAuthTypes,
  getAuth,
  signInWithPhoneNumber,
} from '@react-native-firebase/auth';
import { logApiEvent } from './apiClient';

let confirmation: FirebaseAuthTypes.ConfirmationResult | null = null;
let pendingPhoneNumber = '';

const e164PhoneRegex = /^\+[1-9]\d{6,14}$/;

export const normalizePhoneNumber = (rawPhone: string) => {
  const digitsOnly = rawPhone.replace(/\D/g, '');

  if (!rawPhone.trim().startsWith('+') && digitsOnly.length === 10) {
    return `+91${digitsOnly}`;
  }

  const normalizedPhone = `+${digitsOnly}`;

  if (e164PhoneRegex.test(normalizedPhone)) {
    return normalizedPhone;
  }

  throw new Error('Please enter a valid international mobile number.');
};

export const validatePhoneInput = (rawPhone: string) => {
  try {
    const normalizedPhone = normalizePhoneNumber(rawPhone);

    if (normalizedPhone.startsWith('+91')) {
      return /^\+91\d{10}$/.test(normalizedPhone);
    }

    return e164PhoneRegex.test(normalizedPhone);
  } catch {
    return false;
  }
};

export const sendPhoneVerificationOtp = async (rawPhone: string) => {
  const phoneNumber = normalizePhoneNumber(rawPhone);
  const authInstance = getAuth(getApp());
  const startedAt = Date.now();

  logApiEvent('Firebase send-phone-otp request', {
    provider: 'firebase-auth',
    method: 'signInWithPhoneNumber',
    phoneNumber,
  });

  try {
    confirmation = await signInWithPhoneNumber(authInstance, phoneNumber);
    pendingPhoneNumber = phoneNumber;
    logApiEvent('Firebase send-phone-otp response', {
      provider: 'firebase-auth',
      method: 'signInWithPhoneNumber',
      phoneNumber,
      durationMs: Date.now() - startedAt,
    });
    return phoneNumber;
  } catch (error) {
    logApiEvent('Firebase send-phone-otp error', {
      provider: 'firebase-auth',
      method: 'signInWithPhoneNumber',
      phoneNumber,
      durationMs: Date.now() - startedAt,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
};

export const confirmPhoneVerificationOtp = async (otp: string) => {
  if (!confirmation) {
    throw new Error('Please request an OTP first.');
  }

  const startedAt = Date.now();
  logApiEvent('Firebase confirm-phone-otp request', {
    provider: 'firebase-auth',
    method: 'confirmation.confirm',
    otp,
    otpLength: otp.length,
  });

  try {
    const result = await confirmation.confirm(otp);
    if (!result) {
      throw new Error('OTP confirmation did not return a user.');
    }
    const token = await result.user.getIdToken();

    logApiEvent('Firebase confirm-phone-otp response', {
      provider: 'firebase-auth',
      method: 'confirmation.confirm',
      durationMs: Date.now() - startedAt,
      token,
    });

    return {
      credential: result,
      token,
    };
  } catch (error) {
    logApiEvent('Firebase confirm-phone-otp error', {
      provider: 'firebase-auth',
      method: 'confirmation.confirm',
      durationMs: Date.now() - startedAt,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
};

export const resendPhoneVerificationOtp = async () => {
  if (!pendingPhoneNumber) {
    throw new Error('No phone number is available to resend OTP.');
  }

  const authInstance = getAuth(getApp());
  const startedAt = Date.now();
  logApiEvent('Firebase resend-phone-otp request', {
    provider: 'firebase-auth',
    method: 'signInWithPhoneNumber',
    phoneNumber: pendingPhoneNumber,
  });

  try {
    confirmation = await signInWithPhoneNumber(authInstance, pendingPhoneNumber);
    logApiEvent('Firebase resend-phone-otp response', {
      provider: 'firebase-auth',
      method: 'signInWithPhoneNumber',
      phoneNumber: pendingPhoneNumber,
      durationMs: Date.now() - startedAt,
    });
    return pendingPhoneNumber;
  } catch (error) {
    logApiEvent('Firebase resend-phone-otp error', {
      provider: 'firebase-auth',
      method: 'signInWithPhoneNumber',
      phoneNumber: pendingPhoneNumber,
      durationMs: Date.now() - startedAt,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
};

export const getPendingPhoneNumber = () => pendingPhoneNumber;

export const clearPhoneVerificationState = () => {
  confirmation = null;
  pendingPhoneNumber = '';
};

// Retain the previous exports for callers outside the login flow.
export const normalizeIndianPhoneNumber = normalizePhoneNumber;
export const validateIndianPhoneInput = validatePhoneInput;
