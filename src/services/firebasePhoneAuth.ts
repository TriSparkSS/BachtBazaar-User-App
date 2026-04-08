import { getApp } from '@react-native-firebase/app';
import {
  FirebaseAuthTypes,
  getAuth,
  signInWithPhoneNumber,
} from '@react-native-firebase/auth';

let confirmation: FirebaseAuthTypes.ConfirmationResult | null = null;
let pendingPhoneNumber = '';

const indianPhoneRegex = /^\d{10}$/;

export const normalizeIndianPhoneNumber = (rawPhone: string) => {
  const digitsOnly = rawPhone.replace(/\D/g, '');

  if (digitsOnly.length === 10) {
    return `+91${digitsOnly}`;
  }

  if (digitsOnly.length === 12 && digitsOnly.startsWith('91')) {
    return `+${digitsOnly}`;
  }

  if (rawPhone.startsWith('+') && digitsOnly.length >= 10) {
    return rawPhone;
  }

  throw new Error('Please enter a valid 10-digit Indian mobile number.');
};

export const validateIndianPhoneInput = (rawPhone: string) =>
  indianPhoneRegex.test(rawPhone.replace(/\D/g, ''));

export const sendPhoneVerificationOtp = async (rawPhone: string) => {
  const phoneNumber = normalizeIndianPhoneNumber(rawPhone);
  const authInstance = getAuth(getApp());
  confirmation = await signInWithPhoneNumber(authInstance, phoneNumber);
  pendingPhoneNumber = phoneNumber;
  return phoneNumber;
};

export const confirmPhoneVerificationOtp = async (otp: string) => {
  if (!confirmation) {
    throw new Error('Please request an OTP first.');
  }

  const result = await confirmation.confirm(otp);
  if (!result) {
    throw new Error('OTP confirmation did not return a user.');
  }
  const token = await result.user.getIdToken();

  return {
    credential: result,
    token,
  };
};

export const resendPhoneVerificationOtp = async () => {
  if (!pendingPhoneNumber) {
    throw new Error('No phone number is available to resend OTP.');
  }

  const authInstance = getAuth(getApp());
  confirmation = await signInWithPhoneNumber(authInstance, pendingPhoneNumber);
  return pendingPhoneNumber;
};

export const getPendingPhoneNumber = () => pendingPhoneNumber;

export const clearPhoneVerificationState = () => {
  confirmation = null;
  pendingPhoneNumber = '';
};
