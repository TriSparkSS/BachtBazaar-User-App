import { API_BASE_URL, API_ENDPOINTS, resolveProfileImageUrl } from '../config/api';
import { AuthResponse, SendOtpResponse, UserProfile } from '../types/auth';
import { apiRequest, logApiEvent } from './apiClient';
import {
  parseAuthResponse,
  parseFetchProfileResponse,
  parseGoogleAuthResponse,
  parseProfileImagePath,
  parseUpdateProfileResponse,
  parseVerifyOtpResponse,
} from './authResponseParser';

const bytesToBase64 = (bytes: Uint8Array): string => {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let output = '';

  for (let index = 0; index < bytes.length; index += 3) {
    const byte1 = bytes[index];
    const byte2 = bytes[index + 1];
    const byte3 = bytes[index + 2];

    output += alphabet[byte1 >> 2];
    output += alphabet[((byte1 & 0x03) << 4) | (byte2 >> 4)];
    output += Number.isFinite(byte2) ? alphabet[((byte2 & 0x0f) << 2) | (byte3 >> 6)] : '=';
    output += Number.isFinite(byte3) ? alphabet[byte3 & 0x3f] : '=';
  }

  return output;
};

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

  async loginWithGoogle(
    firebaseToken: string,
    profile?: {
      uid?: string;
      googleIdToken?: string;
      email?: string | null;
      displayName?: string | null;
      photoUrl?: string | null;
    },
  ): Promise<AuthResponse> {
    const requestBody = {
      token: firebaseToken,
      firebaseToken,
      idToken: profile?.googleIdToken ?? firebaseToken,
      email: profile?.email ?? undefined,
      name: profile?.displayName ?? undefined,
      profileImage: profile?.photoUrl ?? undefined,
      provider: 'google',
    };

    try {
      const payload = await apiRequest<unknown>(API_ENDPOINTS.loginGoogle, {
        method: 'POST',
        body: requestBody,
      });

      const response = parseGoogleAuthResponse(payload, profile?.email ?? undefined);
      const enrichedUser = await this.enrichUserWithProfileImage(response.token, {
        ...response.user,
        name: response.user.name ?? profile?.displayName ?? undefined,
        profileImage: response.user.profileImage ?? profile?.photoUrl ?? undefined,
      });

      return {
        ...response,
        user: enrichedUser,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const shouldUseFirebaseSession =
        message.includes('Invalid OTP') ||
        message.includes('HTML page') ||
        message.includes('status 404');

      if (!shouldUseFirebaseSession || !profile?.uid) {
        if (message.includes('Invalid OTP')) {
          throw new Error(
            'Google sign-in succeeded, but the server rejected the phone OTP endpoints for Google login. Add POST /auth/login-google on the backend or enable Google tokens there.',
          );
        }

        throw error;
      }

      const fallbackUser: UserProfile = {
        _id: profile.uid,
        phone: '',
        name: profile.displayName ?? undefined,
        profileImage: profile.photoUrl ?? undefined,
        isVerified: true,
      };

      return {
        success: true,
        token: firebaseToken,
        user: fallbackUser,
        isNewUser: true,
      };
    }
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

  logout(token: string) {
    return apiRequest<{ success?: boolean; message?: string }>(API_ENDPOINTS.logout, {
      method: 'POST',
      token,
    });
  },

  deleteAccount(token: string) {
    return apiRequest<{ success?: boolean; message?: string }>(API_ENDPOINTS.deleteAccount, {
      method: 'DELETE',
      token,
    });
  },

  updateProfile(
    token: string,
    currentUser: UserProfile,
    payload: {
      name?: string;
      gender?: 'male' | 'female' | 'other';
      address?: string;
      city?: string;
      latitude?: number;
      longitude?: number;
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

    if (payload.city) {
      formData.append('city', payload.city);
    }

    if (payload.latitude != null && !Number.isNaN(payload.latitude)) {
      formData.append('latitude', String(payload.latitude));
    }

    if (payload.longitude != null && !Number.isNaN(payload.longitude)) {
      formData.append('longitude', String(payload.longitude));
    }

    if (payload.profileImage) {
      formData.append('profileImage', {
        uri: payload.profileImage.uri,
        name: payload.profileImage.name,
        type: payload.profileImage.type,
      } as never);
    }

    const updates: Partial<UserProfile> = {
      name: payload.name,
      gender: payload.gender,
      address: payload.address,
      city: payload.city,
      latitude: payload.latitude,
      longitude: payload.longitude,
    };

    return apiRequest<unknown>(API_ENDPOINTS.updateProfile, {
      method: 'PUT',
      token,
      body: formData,
    }).then(responsePayload => ({
      success: true,
      user: parseUpdateProfileResponse(responsePayload, currentUser, updates),
    }));
  },

  fetchProfile(token: string, fallbackUser: UserProfile) {
    return apiRequest<unknown>(API_ENDPOINTS.getProfile, {
      method: 'GET',
      token,
    }).then(payload => parseFetchProfileResponse(payload, fallbackUser));
  },

  async fetchProfileImagePath(token: string) {
    const path = API_ENDPOINTS.profileImage;
    const url = `${API_BASE_URL}${path}`;
    const startedAt = Date.now();

    logApiEvent('GET request', {
      url,
      path,
      method: 'GET',
      headers: { Accept: 'application/json, image/*', Authorization: '[REDACTED]' },
    });

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json, image/*',
        Authorization: `Bearer ${token}`,
      },
    });

    const contentType = response.headers.get('content-type') ?? '';

    if (!response.ok) {
      let payload: unknown;
      if (contentType.includes('application/json')) {
        payload = await response.json();
      } else {
        payload = await response.text();
      }

      logApiEvent('GET error-response', {
        url,
        path,
        method: 'GET',
        status: response.status,
        durationMs: Date.now() - startedAt,
        responseBody: payload,
      });

      throw new Error(
        typeof payload === 'object' && payload && 'message' in payload
          ? String(payload.message)
          : `Profile image request failed with status ${response.status}`,
      );
    }

    if (contentType.includes('image/')) {
      const buffer = await response.arrayBuffer();
      const mime = contentType.split(';')[0].trim() || 'image/jpeg';
      const dataUri = `data:${mime};base64,${bytesToBase64(new Uint8Array(buffer))}`;

      logApiEvent('GET response', {
        url,
        path,
        method: 'GET',
        status: response.status,
        durationMs: Date.now() - startedAt,
        responseBody: `[${mime} image, ${buffer.byteLength} bytes]`,
      });

      return dataUri;
    }

    const payload = contentType.includes('application/json')
      ? await response.json()
      : await response.text();

    logApiEvent('GET response', {
      url,
      path,
      method: 'GET',
      status: response.status,
      durationMs: Date.now() - startedAt,
      responseBody: payload,
    });

    return parseProfileImagePath(payload);
  },

  async refreshUserProfile(token: string, currentUser: UserProfile): Promise<UserProfile> {
    const [profileResult, imageResult] = await Promise.allSettled([
      this.fetchProfile(token, currentUser),
      this.fetchProfileImagePath(token),
    ]);

    let user = profileResult.status === 'fulfilled' ? profileResult.value : currentUser;

    if (imageResult.status === 'fulfilled' && imageResult.value) {
      user = { ...user, profileImage: imageResult.value };
    }

    return user;
  },

  async enrichUserWithProfileImage(token: string, user: UserProfile): Promise<UserProfile> {
    try {
      const profileImage = await this.fetchProfileImagePath(token);
      if (profileImage) {
        return { ...user, profileImage };
      }
    } catch {
      // Keep cached profile when image endpoint is unavailable.
    }

    return user;
  },

  resolveProfileImageUrl,
};
