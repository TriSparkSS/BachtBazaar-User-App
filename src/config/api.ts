export const API_BASE_URL = 'https://bachatbazaar.tech/api/user';

/** Shop/offers APIs live under /api/users (not /api/user). */
export const SHOPS_API_BASE_URL = 'https://bachatbazaar.tech/api/users';

/** Admin banners and other admin APIs live under /api. */
export const ADMIN_API_BASE_URL = 'https://bachatbazaar.tech/api';

/** Delivery APIs live under /api (same root as merchants/admin). */
export const DELIVERY_API_BASE_URL = 'https://bachatbazaar.tech/api';

/** Cart APIs live under /api (same root as delivery/merchants). */
export const CART_API_BASE_URL = 'https://bachatbazaar.tech/api';

/** Help & Support tickets live under /api (same root as delivery/cart). */
export const HELP_API_BASE_URL = 'https://bachatbazaar.tech/api';

/** FAQs live under /api (same root as help/delivery). */
export const FAQ_API_BASE_URL = 'https://bachatbazaar.tech/api';

/** Help articles live under /api (same root as FAQs/help). */
export const HELP_ARTICLES_API_BASE_URL = 'https://bachatbazaar.tech/api';

/** Bachat Circle APIs live under /api (same root as help/delivery). */
export const BACHAT_CIRCLE_API_BASE_URL = 'https://bachatbazaar.tech/api';

/** In-app notifications live under /api. */
export const NOTIFY_API_BASE_URL = 'https://bachatbazaar.tech/api';

/** Phone OTP (send / verify / resend) lives under /api/users, form-urlencoded. */
export const OTP_API_BASE_URL = 'https://bachatbazaar.tech/api/users';

/** Sent as `account-id` on GET/PATCH /api/user/radius. */
export const USER_RADIUS_ACCOUNT_ID =
  '5d8e43cab19f/00986b9f-d7cb-4973-a18a-9b6ebc3ba6ec';

export const API_ENDPOINTS = {
  sendOtp: '/auth/send-otp',
  verifyOtp: '/auth/verify-otp',
  resendOtp: '/auth/resend-otp',
  forgotPassword: '/auth/forgot-password',
  /** Signup account creation — password + optional fcmToken / referralCode. */
  createAuth: '/auth/create',
  setPassword: '/auth/set-password',
  changePassword: '/password',
  loginPassword: '/auth/login-password',
  loginOtp: '/auth/login-otp',
  loginGoogle: '/auth/login-google',
  logout: '/auth/logout',
  deleteAccount: '/auth/delete-account',
  updateProfile: '/profile',
  getProfile: '/profile',
  /** GET and PATCH discovery radius. Body for PATCH is form-urlencoded `radius`. */
  discoveryRadius: '/radius',
  profileImage: '/profile-image',
  shopsByCity: (city: string, categoryId?: string) =>
    `/shop?city=${encodeURIComponent(city)}${
      categoryId && categoryId.trim() && categoryId !== 'all'
        ? `&category_id=${encodeURIComponent(categoryId.trim())}`
        : ''
    }`,
  shops: '/shop',
  shopsAll: (radiusKm?: number) => {
    const radius =
      typeof radiusKm === 'number' && Number.isFinite(radiusKm)
        ? Math.max(1, Math.round(radiusKm))
        : undefined;
    return radius != null ? `/shop/all?radius=${radius}` : '/shop/all';
  },
  shopsAllByCategory: (categoryId: string, radiusKm?: number) => {
    const params = new URLSearchParams();
    params.set('category', categoryId.trim());
    if (typeof radiusKm === 'number' && Number.isFinite(radiusKm)) {
      params.set('radius', String(Math.max(1, Math.round(radiusKm))));
    }
    return `/shop/all?${params.toString()}`;
  },
  shopSearch: (query: string, offerTypeId?: string) => {
    const base = `/shop/search?q=${encodeURIComponent(query.trim())}`;
    const normalizedType = offerTypeId?.trim();
    return normalizedType
      ? `${base}&offer_type_id=${encodeURIComponent(normalizedType)}`
      : base;
  },
  shopById: (shopId: string) => `/shop/${encodeURIComponent(shopId)}`,
  shopOffers: (shopId: string) => `/shop/offers/${shopId}`,
  dailyRewardsCalendar: (date: string) =>
    `/shop/offers/calender?date=${encodeURIComponent(date.trim())}`,
  userMilestones: '/milestones',
  userMilestoneById: (id: string) => `/milestones/${encodeURIComponent(id.trim())}`,
  referralsMyCode: '/referrals/my-code',
  referralsList: '/referrals/list',
  /** GET /contacts/search?q=&page=&limit= — registered users. Under /api/user. */
  contactsSearch: (query: string, page = 1, limit = 10) =>
    `/contacts/search?q=${encodeURIComponent(query.trim())}&page=${encodeURIComponent(
      String(page),
    )}&limit=${encodeURIComponent(String(limit))}`,
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
  removeWishlistItem: (type: 'offers' | 'shops' | 'products', id: string) =>
    `/offer-wishlist/remove/${encodeURIComponent(type)}/${encodeURIComponent(id.trim())}`,
  clearOfferWishlist: '/offer-wishlist/clear',
  // Legacy aliases kept for any leftover callers
  offerWishlist: '/offer-wishlist/offers',
  addOfferWishlist: (offerId: string) =>
    `/offer-wishlist/offers/${encodeURIComponent(offerId.trim())}`,
  removeOfferWishlist: (offerId: string) =>
    `/offer-wishlist/remove/offers/${encodeURIComponent(offerId.trim())}`,
  offerBanners: (categoryId: string) =>
    `/shop/offers/banners?category=${encodeURIComponent(categoryId.trim())}`,
  adminBannerActiveFeed: '/adminbanners/active-feed',
  /** Merchant delivery capability — under /api (ADMIN_API_BASE_URL), not /api/user. */
  merchantDeliveryStatus: (merchantId: string) =>
    `/merchants/${encodeURIComponent(merchantId.trim())}/delivery-status`,
  /** Live delivery quote — under /api (DELIVERY_API_BASE_URL). */
  estimateDeliveryFee: (shopId: string) =>
    `/delivery/estimate-fee?shopId=${encodeURIComponent(shopId.trim())}`,
  /** User delivery order create — under /api (DELIVERY_API_BASE_URL). */
  createDeliveryOrder: '/delivery/user/delivery-orders',
  /** Multi-item create — same host, JSON body with items[]. */
  createDeliveryOrderBatch: '/delivery-orders/create',
  /** User delivery orders list (GET) — under /api (DELIVERY_API_BASE_URL). */
  listDeliveryOrders: '/delivery/user/delivery-orders',
  /**
   * User delivery order detail (GET) — under /api (DELIVERY_API_BASE_URL).
   * Full URL: https://bachatbazaar.tech/api/delivery/user/delivery-orders/:orderId
   */
  deliveryOrderDetail: (orderId: string) =>
    `/delivery/user/delivery-orders/${encodeURIComponent(orderId.trim())}`,
  /** User delivery order cancel — under /api (DELIVERY_API_BASE_URL). */
  cancelDeliveryOrder: (orderId: string) =>
    `/delivery/user/delivery-orders/${encodeURIComponent(orderId.trim())}/cancel`,
  /** Cart — under /api (CART_API_BASE_URL). */
  cart: '/cart',
  cartAdd: '/cart/add',
  cartItem: (itemId: string) => `/cart/item/${encodeURIComponent(itemId.trim())}`,
  cartClear: '/cart/clear',
  /** Request a support callback — under /api (HELP_API_BASE_URL). */
  userCallback: '/callback/user',
  /** Help & Support — under /api (HELP_API_BASE_URL). */
  helpCreateTicket: '/help/user/tickets',
  helpMyTickets: (status?: string) =>
    status && status.trim()
      ? `/help/user/tickets/my-tickets?status=${encodeURIComponent(status.trim())}`
      : '/help/user/tickets/my-tickets',
  helpTicketDetail: (ticketId: string) =>
    `/help/user/tickets/${encodeURIComponent(ticketId.trim())}`,
  helpTicketReply: (ticketId: string) =>
    `/help/user/tickets/${encodeURIComponent(ticketId.trim())}/reply`,
  /** FAQs — under /api (FAQ_API_BASE_URL). */
  faqsUser: '/faqs/user',
  faqDetail: (faqId: string) => `/faqs/${encodeURIComponent(faqId.trim())}`,
  /** Help articles — under /api (HELP_ARTICLES_API_BASE_URL). */
  helpArticlesUser: '/help-articles/user',
  helpArticleBySlug: (slug: string) =>
    `/help-articles/by-slug/${encodeURIComponent(slug.trim())}`,
  /** Bachat Circle — under /api (BACHAT_CIRCLE_API_BASE_URL). */
  bachatCircleCreate: '/bachatcircle',
  bachatCircleMine: '/bachatcircle/my-circles',
  bachatCircleById: (circleId: string) =>
    `/bachatcircle/${encodeURIComponent(circleId.trim())}`,
  bachatCircleInvite: (circleId: string) =>
    `/bachatcircle/${encodeURIComponent(circleId.trim())}/invite`,
  bachatCircleMyInvitations: '/bachatcircle/invitations/my-invitations',
  bachatCircleRespondInvitation: (invitationId: string) =>
    `/bachatcircle/invitations/${encodeURIComponent(invitationId.trim())}/respond`,
  bachatCircleOffers: (circleId: string) =>
    `/bachatcircle/${encodeURIComponent(circleId.trim())}/offers`,
  bachatCircleOfferReact: (circleId: string, sharedOfferId: string) =>
    `/bachatcircle/${encodeURIComponent(circleId.trim())}/offers/${encodeURIComponent(
      sharedOfferId.trim(),
    )}/reactions`,
  /** Notifications — under /api (NOTIFY_API_BASE_URL). */
  notifications: '/notify',
  notificationRead: (notificationId: string) =>
    `/notify/${encodeURIComponent(notificationId.trim())}/read`,
  notificationsReadAll: '/notify/read-all',
  notificationDelete: (notificationId: string) =>
    `/notify/${encodeURIComponent(notificationId.trim())}`,
  /** Click tracking — under /api (ADMIN_API_BASE_URL). */
  clickShop: (shopId: string) => `/click/shop/${encodeURIComponent(shopId.trim())}`,
  clickOffer: (offerId: string) => `/click/offer/${encodeURIComponent(offerId.trim())}`,
  clickUserRedeem: '/click/user/redeem',
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

