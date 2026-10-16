export interface UserProfile {
  _id: string;
  phone: string;
  email?: string;
  name?: string;
  gender?: 'male' | 'female' | 'other';
  address?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
  profileImage?: string;
  isVerified: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface AuthResponse {
  success: boolean;
  token: string;
  user: UserProfile;
  isNewUser?: boolean;
  message?: string;
  nextStep?: string;
}

export interface SendOtpResponse {
  success: boolean;
  exists: boolean;
  requestId?: string;
  message?: string;
}

export type OtpRetryType = 'text' | 'Voice';

export interface ResendOtpResponse {
  success: boolean;
  message?: string;
  retryType?: string;
}

export interface PendingAuthState {
  phone: string;
  normalizedPhone: string;
  exists: boolean;
  mode?: 'login' | 'signup' | 'forgot-password';
}
