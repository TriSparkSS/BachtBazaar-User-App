export interface UserProfile {
  _id: string;
  phone: string;
  name?: string;
  gender?: 'male' | 'female' | 'other';
  address?: string;
  profileImage?: string;
  isVerified: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface AuthResponse {
  success: boolean;
  token: string;
  user: UserProfile;
}

export interface SendOtpResponse {
  success: boolean;
  exists: boolean;
}

export interface PendingAuthState {
  phone: string;
  normalizedPhone: string;
  exists: boolean;
  mode?: 'login' | 'signup' | 'forgot-password';
}
