export const API_BASE_URL = 'https://bachatbazaar.tech/api/user';

/** Shop/offers APIs live under /api/users (not /api/user). */
export const SHOPS_API_BASE_URL = 'https://bachatbazaar.tech/api/users';

/** Admin banners and other admin APIs live under /api. */
export const ADMIN_API_BASE_URL = 'https://bachatbazaar.tech/api';

export const API_ENDPOINTS = {
  sendOtp: '/auth/send-otp',
  verifyOtp: '/auth/verify-otp',
  forgotPassword: '/auth/forgot-password',
  setPassword: '/auth/set-password',
  changePassword: '/password',
  loginPassword: '/auth/login-password',
  loginOtp: '/auth/login-otp',
  loginGoogle: '/auth/login-google',
  logout: '/auth/logout',
  deleteAccount: '/auth/delete-account',
  updateProfile: '/profile',
  getProfile: '/profile',
  profileImage: '/profile-image',
  shopsByCity: (city: string) => `/shop?city=${encodeURIComponent(city)}`,
  shopSearch: (query: string) => `/shop/search?q=${encodeURIComponent(query.trim())}`,
  shopById: (shopId: string) => `/shop/${encodeURIComponent(shopId)}`,
  shopOffers: (shopId: string) => `/shop/offers/${shopId}`,
  offerById: (offerId: string) => `/shop/offer/${encodeURIComponent(offerId)}`,
  shopLogo: (shopId: string) => `/shop/${encodeURIComponent(shopId)}/logo`,
  shopBanner: (shopId: string) => `/shop/${encodeURIComponent(shopId)}/banner`,
  categories: '/others/categories',
  offerBanners: (city: string, categoryId: string) =>
    `/shop/offers/banners?city=${encodeURIComponent(city.trim())}&category_id=${encodeURIComponent(categoryId.trim())}`,
  adminBannerActiveFeed: '/adminbaners/active-feed',
} as const;

export const getShopLogoUrl = (shopId: string) =>
  `${SHOPS_API_BASE_URL}${API_ENDPOINTS.shopLogo(shopId)}`;

export const getShopBannerUrl = (shopId: string) =>
  `${SHOPS_API_BASE_URL}${API_ENDPOINTS.shopBanner(shopId)}`;

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

