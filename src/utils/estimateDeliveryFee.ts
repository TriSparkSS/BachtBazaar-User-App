import { DeliveryFeeEstimate, deliveryApi } from '../services/deliveryApi';
import { resolveShopIdFromCartContext } from './resolveCartShop';

type EstimateShopRef = {
  shopId?: string;
  merchantId?: string;
  shopName?: string;
  city?: string;
  productId?: string;
  productName?: string;
};

export const estimateDeliveryFeeForShop = async (
  shop: EstimateShopRef,
  token: string,
): Promise<DeliveryFeeEstimate> => {
  const trimmedToken = token.trim();
  if (!trimmedToken) {
    throw new Error('Login required to estimate delivery.');
  }

  const shopId = shop.shopId?.trim();
  const merchantId = shop.merchantId?.trim();

  if (shopId && shopId !== merchantId) {
    return deliveryApi.estimateFee(shopId, trimmedToken);
  }

  if (shopId) {
    try {
      return await deliveryApi.estimateFee(shopId, trimmedToken);
    } catch {
      // shopId may actually be a merchant id (cart stub).
    }
  }

  const resolvedId = await resolveShopIdFromCartContext(shop, trimmedToken);
  if (resolvedId) {
    return deliveryApi.estimateFee(resolvedId, trimmedToken);
  }

  throw new Error('Could not find this store for delivery estimate.');
};

export const deliveryEstimateTierLabel = (
  estimate?: Pick<DeliveryFeeEstimate, 'tierApplied'> | null,
): string | undefined => {
  const tier = estimate?.tierApplied?.trim().toUpperCase();
  if (tier === 'NIGHT') {
    return 'Night';
  }
  if (tier === 'PEAK') {
    return 'Peak';
  }
  return undefined;
};

export const formatEstimateMeta = (
  estimate?: Pick<DeliveryFeeEstimate, 'distanceKm' | 'tierReason'> | null,
): string | undefined => {
  if (!estimate) {
    return undefined;
  }
  const parts = [
    typeof estimate.distanceKm === 'number' && Number.isFinite(estimate.distanceKm)
      ? `${estimate.distanceKm} km`
      : undefined,
    estimate.tierReason?.trim() || undefined,
  ].filter(Boolean);
  return parts.length ? parts.join(' · ') : undefined;
};
