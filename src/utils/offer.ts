import { ShopOffer, ShopWithOffers } from '../types/shop';

export const formatOfferCountdown = (offer: {
  countdown?: string;
  expiresAt?: string;
}): string => {
  if (offer.countdown?.trim()) {
    return offer.countdown.replace(/\s*remaining\s*$/i, '').trim();
  }

  if (offer.expiresAt) {
    const expiresAt = new Date(offer.expiresAt).getTime();
    if (!Number.isNaN(expiresAt)) {
      const remainingMs = Math.max(0, expiresAt - Date.now());
      const totalSeconds = Math.floor(remainingMs / 1000);
      const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, '0');
      const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
      const seconds = String(totalSeconds % 60).padStart(2, '0');
      return `${hours}:${minutes}:${seconds}`;
    }
  }

  return '02:12:51';
};

export const formatOfferExpiryDate = (expiresAt?: string): string => {
  if (!expiresAt) {
    return 'the offer end date';
  }

  const date = new Date(expiresAt);
  if (Number.isNaN(date.getTime())) {
    return expiresAt;
  }

  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
};

export const buildOfferHeadline = (offer: ShopOffer): string => {
  if (offer.subtitle) {
    return `${offer.title} ${offer.subtitle}`.trim();
  }

  return offer.title;
};

export const buildOfferSummary = (offer: ShopOffer): string =>
  offer.discount?.trim() || offer.title;

export const buildOfferDescription = (offer: ShopOffer, shopName: string): string => {
  if (offer.description?.trim()) {
    return offer.description.trim();
  }

  const summary = buildOfferSummary(offer);
  const expiry = formatOfferExpiryDate(offer.expiresAt);

  return `Enjoy ${summary.toLowerCase()} at ${shopName}. This offer is valid until ${expiry}. Terms and conditions apply. Show your QR code at the counter to redeem.`;
};

export type RedeemStep = {
  title: string;
  description: string;
};

export const buildRedeemSteps = (offer: ShopOffer, shop: ShopWithOffers): RedeemStep[] => {
  if (offer.redeemSteps?.length) {
    return offer.redeemSteps;
  }

  const itemText = offer.subtitle?.trim() || 'eligible items';

  return [
    {
      title: `Visit ${shop.name}`,
      description: shop.tagline?.trim() || 'Head to the store during open hours.',
    },
    {
      title: `Choose ${itemText}`,
      description: 'Pick the products covered by this offer from the store collection.',
    },
    {
      title: 'Show QR Code',
      description: 'Slide the button below to reveal your QR and show it at checkout.',
    },
  ];
};

export const buildOfferBadgeText = (offer: ShopOffer): string => {
  if (offer.discount?.trim()) {
    return offer.discount.trim().toUpperCase();
  }

  return offer.title.toUpperCase();
};
