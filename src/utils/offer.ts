import { OfferDetail, ShopOffer, ShopWithOffers } from '../types/shop';
import { formatShopAddress } from './shop';

export const formatOfferCountdown = (offer: {
  countdown?: string;
  expiresAt?: string;
  timeline?: OfferDetail['timeline'];
}): string => {
  if (offer.countdown?.trim()) {
    return offer.countdown.replace(/\s*remaining\s*$/i, '').trim();
  }

  if (offer.timeline?.remainingDays != null && offer.timeline.remainingDays >= 0) {
    const days = offer.timeline.remainingDays;
    return days === 1 ? '1 day' : `${days} days`;
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

  return 'soon';
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

export const buildOfferHeadline = (offer: ShopOffer | OfferDetail): string => offer.title;

export const buildOfferSummary = (offer: ShopOffer | OfferDetail): string =>
  (offer as OfferDetail).discountExpression?.trim() || offer.discount?.trim() || offer.title;

export const buildOfferDescription = (offer: ShopOffer | OfferDetail, shopName: string): string => {
  if (offer.description?.trim()) {
    return offer.description.trim();
  }

  const detail = offer as OfferDetail;
  const mechanicDescription = detail.mechanics?.subType?.description || detail.mechanics?.parentType?.description;

  if (mechanicDescription?.trim()) {
    return mechanicDescription.trim();
  }

  const summary = buildOfferSummary(offer);
  const expiry = formatOfferExpiryDate(offer.expiresAt);

  return `Enjoy ${summary.toLowerCase()} at ${shopName}. This offer is valid until ${expiry}.`;
};

export type RedeemStep = {
  title: string;
  description: string;
};

export const buildRedeemSteps = (offer: ShopOffer | OfferDetail, shop: ShopWithOffers): RedeemStep[] => {
  if (offer.redeemSteps?.length) {
    return offer.redeemSteps;
  }

  const detail = offer as OfferDetail;
  const steps: RedeemStep[] = [];

  if (detail.mechanics?.parentType?.label) {
    steps.push({
      title: detail.mechanics.parentType.label,
      description:
        detail.mechanics.parentType.description?.trim() ||
        'Check the offer mechanic before you shop.',
    });
  }

  if (detail.mechanics?.subType?.label) {
    steps.push({
      title: detail.mechanics.subType.label,
      description:
        detail.mechanics.subType.description?.trim() ||
        'Follow the product pairing mentioned in this offer.',
    });
  }

  if (detail.minimumPurchaseAmount && detail.minimumPurchaseAmount > 0) {
    steps.push({
      title: `Spend ₹${detail.minimumPurchaseAmount.toLocaleString('en-IN')} or more`,
      description: 'Your cart must meet the minimum purchase amount to redeem this offer.',
    });
  }

  steps.push({
    title: `Visit ${detail.merchant?.storeName || shop.name}`,
    description: formatShopAddress(shop) || shop.tagline?.trim() || 'Head to the store during open hours.',
  });

  if (detail.operationalRules?.qrRequired) {
    steps.push({
      title: 'Show QR code',
      description: 'Slide the button below to reveal your QR and show it at checkout.',
    });
  } else if (detail.code) {
    steps.push({
      title: 'Use offer code',
      description: `Share code ${detail.code} at the counter to redeem this offer.`,
    });
  }

  return steps;
};

export const buildOfferBadgeText = (offer: ShopOffer | OfferDetail): string => {
  const detail = offer as OfferDetail;

  if (detail.discountExpression?.trim()) {
    return detail.discountExpression.trim().toUpperCase();
  }

  if (offer.discount?.trim()) {
    return offer.discount.trim().toUpperCase();
  }

  return offer.title.toUpperCase();
};

export const buildOfferUrgencyText = (offer: OfferDetail): string => {
  if (offer.timeline?.isExpired) {
    return 'This offer has expired.';
  }

  if (offer.timeline?.isUpcoming) {
    const days = offer.timeline.remainingDays;
    if (days != null && days > 0) {
      return `Starts in ${days === 1 ? '1 day' : `${days} days`}.`;
    }

    return `Starts on ${formatOfferExpiryDate(offer.timeline.startDate)}.`;
  }

  const countdown = formatOfferCountdown(offer);
  if (offer.timeline?.remainingDays != null) {
    return `Hurry! This offer ends in ${countdown}.`;
  }

  return `Hurry! This offer expires in ${countdown}.`;
};

export const buildOperationalRuleLabels = (offer: OfferDetail): string[] => {
  const rules = offer.operationalRules;
  if (!rules) {
    return [];
  }

  const labels: string[] = [];
  if (rules.walkInOnly) {
    labels.push('Walk-in only');
  }
  if (rules.qrRequired) {
    labels.push('QR required');
  }
  if (rules.nearbyOnly) {
    labels.push('Nearby only');
  }

  return labels;
};
