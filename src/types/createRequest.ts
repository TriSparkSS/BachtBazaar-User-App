export type RequestUrgency = 'today' | 'soon' | 'flexible';

export type CreateRequestFormParams = {
  product: string;
  category: string;
  categoryId: string;
  budget?: string;
  urgency: RequestUrgency;
  location: string;
  requestId?: string;
  expiresAt?: string;
};

export type CreateRequestShopOffer = {
  id: string;
  shopName: string;
  distanceKm: number;
  rating: number;
  price: number;
  originalPrice?: number;
  perks: string[];
  badges?: string[];
  responseTime: string;
  isBestDeal?: boolean;
  phone?: string;
};

export type CreateRequestResultsSummary = {
  product: string;
  bestPrice: number;
  marketPrice: number;
  youSave: number;
  offers: CreateRequestShopOffer[];
};
