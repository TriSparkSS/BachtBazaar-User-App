export const API_BASE_URL = 'https://bachatbazaar.tech/api/user';

export const API_ENDPOINTS = {
  sendOtp: '/auth/send-otp',
  verifyOtp: '/auth/verify-otp',
  forgotPassword: '/auth/forgot-password',
  setPassword: '/auth/set-password',
  changePassword: '/password',
  loginPassword: '/auth/login-password',
  loginOtp: '/auth/login-otp',
  updateProfile: '/profile',
  profileImage: '/profile-image',
} as const;

export const resolveProfileImageUrl = (path?: string | null) => {
  if (!path) {
    return undefined;
  }

  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }

  const origin = API_BASE_URL.replace(/\/api\/user\/?$/, '');
  return `${origin}${path.startsWith('/') ? path : `/${path}`}`;
};

