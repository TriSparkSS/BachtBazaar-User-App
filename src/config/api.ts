export const API_BASE_URL = 'https://bachatbazaar.tech/api/user';

/** Shop/offers APIs live under /api/users (not /api/user). */
export const SHOPS_API_BASE_URL = 'https://bachatbazaar.tech/api/users';

export const API_ENDPOINTS = {
  sendOtp: '/auth/send-otp',
  verifyOtp: '/auth/verify-otp',
  forgotPassword: '/auth/forgot-password',
  setPassword: '/auth/set-password',
  changePassword: '/password',
  loginPassword: '/auth/login-password',
  loginOtp: '/auth/login-otp',
  updateProfile: '/profile',
  getProfile: '/profile',
  profileImage: '/profile-image',
  shopsByCity: (city: string) => `/shop?city=${encodeURIComponent(city)}`,
  shopById: (shopId: string) => `/shop/${encodeURIComponent(shopId)}`,
  shopOffers: (shopId: string) => `/shop/offers/${shopId}`,
  offerById: (offerId: string) => `/shop/offer/${encodeURIComponent(offerId)}`,
} as const;

export const resolveProfileImageUrl = (path?: string | null) => {
  if (!path) {
    return undefined;
  }

  if (
    path.startsWith('http://') ||
    path.startsWith('https://') ||
    path.startsWith('data:image/')
  ) {
    return path;
  }

  const origin = API_BASE_URL.replace(/\/api\/user\/?$/, '');
  return `${origin}${path.startsWith('/') ? path : `/${path}`}`;
};

