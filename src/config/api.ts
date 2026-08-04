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
  shopsByCity: (city: string, categoryId?: string) =>
    `/shop?city=${encodeURIComponent(city)}${
      categoryId && categoryId.trim() && categoryId !== 'all'
        ? `&category_id=${encodeURIComponent(categoryId.trim())}`
        : ''
    }`,
  shopsByLocation: (lat: number, lng: number, categoryId?: string) =>
    `/shop?lat=${encodeURIComponent(String(lat))}&lng=${encodeURIComponent(String(lng))}${
      categoryId && categoryId.trim() && categoryId !== 'all'
        ? `&category_id=${encodeURIComponent(categoryId.trim())}`
        : ''
    }`,
  shopsAllByCategory: (categoryId: string) =>
    `/shop/all?category=${encodeURIComponent(categoryId.trim())}`,
  shopSearch: (query: string) => `/shop/search?q=${encodeURIComponent(query.trim())}`,
  shopById: (shopId: string) => `/shop/${encodeURIComponent(shopId)}`,
  shopOffers: (shopId: string) => `/shop/offers/${shopId}`,
  dailyRewardsCalendar: (date: string) =>
    `/shop/offers/calender?date=${encodeURIComponent(date.trim())}`,
  offerById: (offerId: string) => `/shop/offer/${encodeURIComponent(offerId)}`,
  shopLogo: (shopId: string) => `/shop/${encodeURIComponent(shopId)}/logo`,
  shopBanner: (shopId: string) => `/shop/${encodeURIComponent(shopId)}/banner`,
  categories: '/others/categories',
  createBestRequest: '/best-request/create',
  editBestRequest: (requestId: string) =>
    `/best-request/edit/${encodeURIComponent(requestId.trim())}`,
  myBestRequests: '/best-request/my-requests',
  cancelBestRequest: (requestId: string) =>
    `/best-request/cancel/${encodeURIComponent(requestId.trim())}`,
  deleteBestRequest: (requestId: string) =>
    `/best-request/delete/${encodeURIComponent(requestId.trim())}`,
  closeBestRequest: (requestId: string) =>
    `/best-request/close/${encodeURIComponent(requestId.trim())}`,
  merchantBidHistory: '/merchant-bids/merchant/history',
  merchantBidsForUserRequest: (requestId: string) =>
    `/merchant-bids/user/request/${encodeURIComponent(requestId.trim())}`,
  closeMerchantBid: (bidId: string) =>
    `/merchant-bids/user/${encodeURIComponent(bidId.trim())}/close`,
  redeemUserOffer: (offerId: string) =>
    `/offer-redemption/user/${encodeURIComponent(offerId.trim())}/redeem`,
  claimDirectUserOffer: (offerId: string) =>
    `/offer-redemption/user/${encodeURIComponent(offerId.trim())}/claim-direct`,
  merchantOfferRedemption: '/offer-redemption/merchant',
  offerRedemptionHistory: '/offer-redemption/user/history',
  /** Wishlist type: offers | shops | products */
  wishlistByType: (type: 'offers' | 'shops' | 'products') =>
    `/offer-wishlist/${encodeURIComponent(type)}`,
  addWishlistItem: (type: 'offers' | 'shops' | 'products', id: string) =>
    `/offer-wishlist/${encodeURIComponent(type)}/${encodeURIComponent(id.trim())}`,
  removeWishlistItem: (type: 'offers' | 'shops' | 'products', id: string) => {
    // Backend remove route uses singular type segment (offer/shop/product).
    const singular =
      type === 'offers' ? 'offer' : type === 'shops' ? 'shop' : 'product';
    return `/offer-wishlist/remove/${encodeURIComponent(singular)}/${encodeURIComponent(id.trim())}`;
  },
  clearOfferWishlist: '/offer-wishlist/clear',
  // Legacy aliases kept for any leftover callers
  offerWishlist: '/offer-wishlist/offers',
  addOfferWishlist: (offerId: string) =>
    `/offer-wishlist/offers/${encodeURIComponent(offerId.trim())}`,
  removeOfferWishlist: (offerId: string) =>
    `/offer-wishlist/remove/offer/${encodeURIComponent(offerId.trim())}`,
  offerBanners: (categoryId: string) =>
    `/shop/offers/banners?category=${encodeURIComponent(categoryId.trim())}`,
  adminBannerActiveFeed: '/adminbanners/active-feed',
} as const;

export const getShopLogoUrl = (shopId: string) =>
  `${SHOPS_API_BASE_URL}${API_ENDPOINTS.shopLogo(shopId)}`;

export const getShopBannerUrl = (shopId: string) =>
  `${SHOPS_API_BASE_URL}${API_ENDPOINTS.shopBanner(shopId)}`;

/**
 * Build absolute image URLs for relative paths (/uploads/...).
 * Passes through http(s) and data:image URIs unchanged.
 * Note: /shop/:id/logo and /banner currently return SPA HTML — prefer
 * Buffer→data-URI (size-capped) from shopResponseParser instead.
 */
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

