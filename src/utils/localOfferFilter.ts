import { ShopWithOffers } from '../types/shop';

export type LocalOfferFilter = 'all' | 'distance' | 'offer' | 'price';

export const LOCAL_OFFER_FILTERS: Array<{
  id: LocalOfferFilter;
  label: string;
  hint: string;
  icon: string;
}> = [
  {
    id: 'all',
    label: 'All stores',
    hint: 'Show the full local offers list',
    icon: 'view-grid-outline',
  },
  {
    id: 'distance',
    label: 'Store distance',
    hint: 'Nearest stores first',
    icon: 'map-marker-distance',
  },
  {
    id: 'offer',
    label: 'Offer',
    hint: 'Stores with the best discounts',
    icon: 'tag-outline',
  },
  {
    id: 'price',
    label: 'Product price',
    hint: 'Lowest product price first',
    icon: 'currency-inr',
  },
];

const parseDistanceKm = (value?: string): number | null => {
  if (!value?.trim()) {
    return null;
  }
  const match = value.replace(/,/g, '').match(/(\d+(?:\.\d+)?)/);
  if (!match) {
    return null;
  }
  const amount = Number(match[1]);
  if (!Number.isFinite(amount)) {
    return null;
  }
  return /km/i.test(value) ? amount : /m\b/i.test(value) ? amount / 1000 : amount;
};

const parseMoney = (value?: string): number | null => {
  if (!value?.trim()) {
    return null;
  }
  const match = value.replace(/,/g, '').match(/(\d+(?:\.\d+)?)/);
  if (!match) {
    return null;
  }
  const amount = Number(match[1]);
  return Number.isFinite(amount) ? amount : null;
};

const bestOfferRank = (shop: ShopWithOffers) => {
  let percent = 0;
  let rupees = 0;
  shop.offers.forEach(offer => {
    const text = offer.discount ?? '';
    const percentMatch = text.match(/(\d+(?:\.\d+)?)\s*%/);
    const amountMatch = text.replace(/,/g, '').match(/(\d+(?:\.\d+)?)/);
    if (percentMatch) {
      percent = Math.max(percent, Number(percentMatch[1]));
      return;
    }
    if (amountMatch) {
      rupees = Math.max(rupees, Number(amountMatch[1]));
    }
  });
  return { hasOffer: shop.offers.length > 0, percent, rupees };
};

const lowestProductPrice = (shop: ShopWithOffers): number | null => {
  const prices = (shop.products ?? [])
    .map(product => parseMoney(product.price))
    .filter((price): price is number => price != null);
  return prices.length > 0 ? Math.min(...prices) : null;
};

export const filterLocalOfferShops = (
  source: ShopWithOffers[],
  filter: LocalOfferFilter,
): ShopWithOffers[] => {
  if (filter === 'all') {
    return source;
  }

  if (filter === 'distance') {
    return [...source].sort((left, right) => {
      const leftKm = parseDistanceKm(left.distance);
      const rightKm = parseDistanceKm(right.distance);
      if (leftKm == null && rightKm == null) {
        return 0;
      }
      if (leftKm == null) {
        return 1;
      }
      if (rightKm == null) {
        return -1;
      }
      return leftKm - rightKm;
    });
  }

  if (filter === 'offer') {
    return source
      .filter(shop => shop.offers.length > 0)
      .sort((left, right) => {
        const leftRank = bestOfferRank(left);
        const rightRank = bestOfferRank(right);
        if (rightRank.percent !== leftRank.percent) {
          return rightRank.percent - leftRank.percent;
        }
        return rightRank.rupees - leftRank.rupees;
      });
  }

  return source
    .filter(shop => lowestProductPrice(shop) != null)
    .sort(
      (left, right) =>
        (lowestProductPrice(left) ?? Number.POSITIVE_INFINITY) -
        (lowestProductPrice(right) ?? Number.POSITIVE_INFINITY),
    );
};
