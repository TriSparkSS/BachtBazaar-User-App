import { API_ENDPOINTS } from '../config/api';
import { AuthResponse, SendOtpResponse, UserProfile } from '../types/auth';
import { apiRequest } from './apiClient';

const formatIndianApiPhone = (phone: string) => {
const digits = phone.replace(/\D/g, '');
return digits.slice(-10); // always return last 10 digits
};

export const userAuthApi = {
  sendOtp(phone: string) {
    return apiRequest<SendOtpResponse>(API_ENDPOINTS.sendOtp, {
      method: 'POST',
      body: { phone: formatIndianApiPhone(phone) },
    });
  },

  verifyOtp(token: string) {
    return apiRequest<AuthResponse>(API_ENDPOINTS.verifyOtp, {
      method: 'POST',
      body: { token },
    });
  },

  forgotPassword(token: string, newPassword: string) {
    return apiRequest<{ success: boolean }>(API_ENDPOINTS.forgotPassword, {
      method: 'POST',
      body: { token, newPassword },
    });
  },

  loginWithOtp(token: string) {
    return apiRequest<AuthResponse>(API_ENDPOINTS.loginOtp, {
      method: 'POST',
      body: { token },
    });
  },

  loginWithPassword(phone: string, password: string) {
    return apiRequest<AuthResponse>(API_ENDPOINTS.loginPassword, {
      method: 'POST',
      body: { phone: formatIndianApiPhone(phone), password },
    });
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
};
