import { CreateRequestShopOffer } from '../types/createRequest';

export const REQUEST_CATEGORIES = [
  'Electronics',
  'Fashion',
  'Jewelry',
  'Grocery',
  'Home & Kitchen',
  'Food',
  'Other',
] as const;

export const MOCK_NOTIFIED_SHOPS = [
  'Khanna Electronics',
  'Gupta Mobile Hub',
  'Tech Point Store',
  'Digital World',
  'City Electronics',
];

const clampPrice = (value: number) => Math.max(999, Math.round(value));

export const buildMockOffers = (product: string, budget?: string): CreateRequestShopOffer[] => {
  const budgetValue = Number(String(budget ?? '').replace(/[^\d.]/g, ''));
  const base = Number.isFinite(budgetValue) && budgetValue > 0 ? budgetValue : 14999;
  const best = clampPrice(base * 0.94);
  const productPerk = product.trim() || 'selected product';

  return [
    {
      id: '1',
      shopName: 'City Electronics',
      distanceKm: 3.2,
      rating: 4.5,
      price: best,
      originalPrice: clampPrice(best * 1.14),
      isBestDeal: true,
      badges: ['Fast Responder', 'Save 12%'],
      responseTime: 'Responded 4 min ago',
      perks: ['6 months EMI available', '1 year extended warranty free'],
      phone: '+919876543210',
    },
    {
      id: '2',
      shopName: 'Gupta Mobile Hub',
      distanceKm: 0.8,
      rating: 4.9,
      price: clampPrice(best * 1.004),
      originalPrice: clampPrice(best * 1.12),
      badges: ['Fast Responder', 'Save 10%'],
      responseTime: 'Responded 1 min ago',
      perks: ['1 year extended warranty free', 'Same day pickup available'],
      phone: '+919876543211',
    },
    {
      id: '3',
      shopName: 'Digital World',
      distanceKm: 1.5,
      rating: 4.7,
      price: clampPrice(best * 1.008),
      originalPrice: clampPrice(best * 1.13),
      badges: ['Save 11%'],
      responseTime: 'Responded 3 min ago',
      perks: ['10% cashback on UPI payment', `Best local deal on ${productPerk}`],
      phone: '+919876543212',
    },
    {
      id: '4',
      shopName: 'Tech Point Store',
      distanceKm: 2.1,
      rating: 4.6,
      price: clampPrice(best * 1.011),
      originalPrice: clampPrice(best * 1.12),
      badges: ['Fast Responder', 'Save 11%'],
      responseTime: 'Responded 2 min ago',
      perks: ['Free screen guard', 'Exchange offer available'],
      phone: '+919876543213',
    },
    {
      id: '5',
      shopName: 'Khanna Electronics',
      distanceKm: 1.2,
      rating: 4.8,
      price: clampPrice(best * 1.021),
      originalPrice: clampPrice(best * 1.12),
      badges: ['Save 10%'],
      responseTime: 'Responded just now',
      perks: ['Free wireless earbuds included', 'Doorstep demo available'],
      phone: '+919876543214',
    },
  ];
};

export const estimateAveragePriceRange = (product: string) => {
  const normalized = product.trim().toLowerCase();
  if (!normalized) {
    return null;
  }

  if (normalized.includes('iphone 15 pro') || normalized.includes('iphone15pro')) {
    return { min: 132500, max: 132500 };
  }

  if (normalized.includes('iphone')) {
    return { min: 70000, max: 135000 };
  }

  if (normalized.includes('samsung') && normalized.includes('tv')) {
    return { min: 42000, max: 52000 };
  }

  if (normalized.includes('nike') || normalized.includes('shoe')) {
    return { min: 3299, max: 7499 };
  }

  if (normalized.includes('gold') || normalized.includes('jewel')) {
    return { min: 25000, max: 85000 };
  }

  return { min: 5000, max: 15000 };
};
