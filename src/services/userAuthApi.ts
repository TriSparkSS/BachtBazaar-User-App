import { API_ENDPOINTS, resolveProfileImageUrl } from '../config/api';
import { SendOtpResponse, UserProfile } from '../types/auth';
import { apiRequest } from './apiClient';
import { parseAuthResponse, parseVerifyOtpResponse } from './authResponseParser';

const formatApiPhone = (phone: string) => {
  const digits = phone.replace(/\D/g, '');

  if (phone.trim().startsWith('+')) {
    if (digits.length === 12 && digits.startsWith('91')) {
      return digits.slice(-10);
    }

    return `+${digits}`;
  }

  return digits;
};

export const userAuthApi = {
  sendOtp(phone: string) {
    return apiRequest<SendOtpResponse>(API_ENDPOINTS.sendOtp, {
      method: 'POST',
      body: { phone: formatApiPhone(phone) },
    });
  },

  verifyOtp(firebaseToken: string, phone?: string) {
    return apiRequest<unknown>(API_ENDPOINTS.verifyOtp, {
      method: 'POST',
      body: { token: firebaseToken, firebaseToken },
    }).then(payload => parseVerifyOtpResponse(payload, phone, firebaseToken));
  },

  forgotPassword(token: string, newPassword: string) {
    return apiRequest<{ success: boolean }>(API_ENDPOINTS.forgotPassword, {
      method: 'POST',
      body: { token, newPassword },
    });
  },

  loginWithOtp(firebaseToken: string, phone?: string) {
    return apiRequest<unknown>(API_ENDPOINTS.loginOtp, {
      method: 'POST',
      body: { token: firebaseToken, firebaseToken },
    }).then(payload => parseAuthResponse(payload, phone));
  },

  loginWithPassword(phone: string, password: string) {
    return apiRequest<unknown>(API_ENDPOINTS.loginPassword, {
      method: 'POST',
      body: { phone: formatApiPhone(phone), password },
    }).then(payload => parseAuthResponse(payload, formatApiPhone(phone)));
  },

  setPassword(userId: string, password: string, token?: string) {
    return apiRequest<{ success: boolean }>(API_ENDPOINTS.setPassword, {
      method: 'POST',
      token,
      body: { userId, password },
    });
  },

  changePassword(token: string, oldPassword: string, newPassword: string) {
    return apiRequest<{ success: boolean }>(API_ENDPOINTS.changePassword, {
      method: 'PUT',
      token,
      body: { oldPassword, newPassword },
    });
  },

  updateProfile(
    token: string,
    payload: {
      name?: string;
      gender?: 'male' | 'female' | 'other';
      address?: string;
      profileImage?: {
        uri: string;
        name: string;
        type: string;
      };
    },
  ) {
    const formData = new FormData();

    if (payload.name) {
      formData.append('name', payload.name);
    }

    if (payload.gender) {
      formData.append('gender', payload.gender);
    }

    if (payload.address) {
      formData.append('address', payload.address);
    }

    if (payload.profileImage) {
      formData.append('profileImage', payload.profileImage as never);
    }

    return apiRequest<{ success: boolean; user: UserProfile }>(API_ENDPOINTS.updateProfile, {
      method: 'PUT',
      token,
      body: formData,
    });
  },

  getProfileImage(token: string) {
    return apiRequest<{ profileImage?: string; url?: string }>(API_ENDPOINTS.profileImage, {
      method: 'GET',
      token,
    });
  },

  resolveProfileImageUrl,
};
