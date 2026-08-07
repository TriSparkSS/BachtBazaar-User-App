import { Shop, ShopProduct } from '../types/shop';



const isRecord = (value: unknown): value is Record<string, unknown> =>

  Boolean(value && typeof value === 'object' && !Array.isArray(value));



/**

 * Parse merchant/shop delivery capability from API payloads.

 *

 * Primary field names (first hit wins):

 * providesDelivery | provides_delivery | deliveryAvailable | delivery_available |

 * isDelivery | is_delivery | deliveryEnabled | delivery_enabled | hasDelivery |

 * has_delivery | homeDelivery | home_delivery | offerDelivery | offer_delivery |

 * canDeliver | can_deliver | acceptsDelivery | accepts_delivery | delivery

 *

 * Also treats a numeric delivery fee / radius as implying delivery when no

 * boolean flag is present.

 *

 * Live shop GET probe (2026-08-07) for Molafzo / Ragh store / 69e155…:

 * No dedicated delivery flag on shop, merchantId, product, or inventory roots.

 * Present keys were shop (_id, merchantId, address…, shopName, openingHours,

 * isWishlisted), merchant (_id, phone, email, name, profileImage, status),

 * product (_id, name, price, discounted_price, stock, thumbnail, is_featured,

 * isWishlisted), inventory (productCount, serviceCount, offerCount, products,

 * services, offers). inventory.services are normal priced services — not a

 * delivery toggle. Unknown → undefined (caller defaults to false).

 */

export const pickProvidesDeliveryFlag = (...sources: unknown[]): boolean | undefined => {

  for (const source of sources) {

    if (!isRecord(source)) {

      continue;

    }



    const candidates: unknown[] = [

      // Live delivery-status field (primary).

      source.isDeliveryEnabled,

      source.is_delivery_enabled,

      source.providesDelivery,

      source.provides_delivery,

      source.deliveryAvailable,

      source.delivery_available,

      source.isDelivery,

      source.is_delivery,

      source.deliveryEnabled,

      source.delivery_enabled,

      source.hasDelivery,

      source.has_delivery,

      source.homeDelivery,

      source.home_delivery,

      source.offerDelivery,

      source.offer_delivery,

      source.canDeliver,

      source.can_deliver,

      source.acceptsDelivery,

      source.accepts_delivery,

      source.deliveryOption,

      source.delivery_option,

      source.deliveryRequested,

      source.delivery_requested,

      source.requestDelivery,

      source.request_delivery,

    ];



    for (const candidate of candidates) {

      if (typeof candidate === 'boolean') {

        return candidate;

      }

      if (typeof candidate === 'number' && !Number.isNaN(candidate)) {

        return candidate !== 0;

      }

      if (typeof candidate === 'string' && candidate.trim()) {

        const normalized = candidate.trim().toLowerCase();

        if (['true', '1', 'yes', 'y', 'on', 'enabled'].includes(normalized)) {

          return true;

        }

        if (['false', '0', 'no', 'n', 'off', 'disabled'].includes(normalized)) {

          return false;

        }

      }

    }



    // Closest non-boolean signals when a dedicated flag is absent on this object.

    const deliveryFee = source.deliveryFee ?? source.delivery_fee ?? source.deliveryCharge ?? source.delivery_charge;

    if (typeof deliveryFee === 'number' && !Number.isNaN(deliveryFee)) {

      return true;

    }

    if (typeof deliveryFee === 'string' && deliveryFee.trim() !== '') {

      const parsed = Number(deliveryFee);

      if (!Number.isNaN(parsed)) {

        return true;

      }

    }



    const radius = source.deliveryRadius ?? source.delivery_radius ?? source.maxDeliveryDistance ?? source.max_delivery_distance;

    if (typeof radius === 'number' && !Number.isNaN(radius) && radius > 0) {

      return true;

    }

    if (typeof radius === 'string' && radius.trim()) {

      const parsed = Number(radius);

      if (!Number.isNaN(parsed) && parsed > 0) {

        return true;

      }

    }



    if (typeof source.delivery === 'boolean') {

      return source.delivery;

    }

  }



  return undefined;

};



/**

 * Optional shop/product cache helper. Product Detail should prefer

 * GET /merchants/:id/delivery-status as the source of truth.

 */

export const resolveProvidesDelivery = (

  shop?: Pick<Shop, 'providesDelivery'> | null,

  product?: Pick<ShopProduct, 'providesDelivery'> | null,

): boolean => {

  if (shop?.providesDelivery === true) {

    return true;

  }

  if (shop?.providesDelivery === false) {

    return false;

  }

  if (product?.providesDelivery === true) {

    return true;

  }

  if (product?.providesDelivery === false) {

    return false;

  }

  return false;

};



const coerceDeliveryBoolean = (value: unknown): boolean | undefined => {

  if (typeof value === 'boolean') {

    return value;

  }

  if (typeof value === 'number' && !Number.isNaN(value)) {

    return value !== 0;

  }

  if (typeof value === 'string' && value.trim()) {

    const normalized = value.trim().toLowerCase();

    if (['true', '1', 'yes', 'y', 'on', 'enabled'].includes(normalized)) {

      return true;

    }

    if (['false', '0', 'no', 'n', 'off', 'disabled'].includes(normalized)) {

      return false;

    }

  }

  return undefined;

};



/**

 * Parse GET /merchants/:id/delivery-status payloads.

 * Real API shape (2026-08-07):

 * { success: true, data: { merchantId, merchantName, isDeliveryEnabled: boolean } }

 *

 * Also accepts legacy aliases: deliveryEnabled, providesDelivery, deliveryStatus,

 * { data: true }, nested merchant flags, etc.

 */

export const parseMerchantDeliveryStatusResponse = (payload: unknown): boolean => {

  if (typeof payload === 'boolean') {

    console.log(

      `[API] merchant delivery-status parsed isDeliveryEnabled=${payload}`,

    );

    return payload;

  }



  if (!isRecord(payload)) {

    console.log('[API] merchant delivery-status parsed isDeliveryEnabled=false');

    return false;

  }



  const data = isRecord(payload.data) ? payload.data : undefined;

  const nested =

    (data && isRecord(data.merchant) ? data.merchant : undefined) ??

    (isRecord(payload.merchant) ? payload.merchant : undefined);



  // Primary field from live API — check data then root before legacy aliases.

  const primaryCandidates: unknown[] = [

    data?.isDeliveryEnabled,

    data?.is_delivery_enabled,

    payload.isDeliveryEnabled,

    payload.is_delivery_enabled,

    nested?.isDeliveryEnabled,

    nested?.is_delivery_enabled,

  ];



  for (const candidate of primaryCandidates) {

    const coerced = coerceDeliveryBoolean(candidate);

    if (coerced !== undefined) {

      console.log(

        `[API] merchant delivery-status parsed isDeliveryEnabled=${coerced}`,

      );

      return coerced;

    }

  }



  const candidates: unknown[] = [

    payload.deliveryStatus,

    payload.delivery_status,

    payload.deliveryEnabled,

    payload.delivery_enabled,

    payload.providesDelivery,

    payload.provides_delivery,

    payload.deliveryAvailable,

    payload.delivery_available,

    payload.hasDelivery,

    payload.has_delivery,

    payload.provides_delivery_status,

    payload.delivery,

    data?.deliveryStatus,

    data?.delivery_status,

    data?.deliveryEnabled,

    data?.delivery_enabled,

    data?.providesDelivery,

    data?.provides_delivery,

    data?.deliveryAvailable,

    data?.delivery_available,

    data?.hasDelivery,

    data?.has_delivery,

    data?.delivery,

    typeof payload.data === 'boolean' || typeof payload.data === 'number' || typeof payload.data === 'string'

      ? payload.data

      : undefined,

    nested?.deliveryStatus,

    nested?.delivery_status,

    nested?.deliveryEnabled,

    nested?.providesDelivery,

  ];



  for (const candidate of candidates) {

    const coerced = coerceDeliveryBoolean(candidate);

    if (coerced !== undefined) {

      console.log(

        `[API] merchant delivery-status parsed isDeliveryEnabled=${coerced}`,

      );

      return coerced;

    }

  }



  // Last resort: reuse shop-body alias picker on known objects.

  const fromAliases = pickProvidesDeliveryFlag(payload, data, nested);

  const result = fromAliases === true;

  console.log(

    `[API] merchant delivery-status parsed isDeliveryEnabled=${result}`,

  );

  return result;

};



export const parsePriceAmount = (value?: string | null): number => {

  if (!value?.trim()) {

    return 0;

  }

  const parsed = Number(String(value).replace(/[^\d.]/g, ''));

  return Number.isFinite(parsed) ? parsed : 0;

};



/** Fees used for Request Delivery charge breakdown (mockup defaults). */

export const REQUEST_DELIVERY_FEE = 40;

export const REQUEST_PLATFORM_FEE = 10;


