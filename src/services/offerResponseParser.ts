import { OfferDetail, ShopProduct } from '../types/shop';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value && typeof value === 'object' && !Array.isArray(value));

const pickString = (...values: unknown[]): string | undefined => {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) {
      return value;
    }

    if (typeof value === 'number' && !Number.isNaN(value)) {
      return String(value);
    }
  }

  return undefined;
};

const pickNumber = (...values: unknown[]): number | undefined => {
  for (const value of values) {
    if (typeof value === 'number' && !Number.isNaN(value)) {
      return value;
    }

    if (typeof value === 'string' && value.trim()) {
      const parsed = Number(value);
      if (!Number.isNaN(parsed)) {
        return parsed;
      }
    }
  }

  return undefined;
};

const resolveImagePath = (value: unknown): string | undefined => {
  if (typeof value === 'string' && value.trim()) {
    return value.trim();
  }

  return undefined;
};

const normalizeMechanicType = (value: unknown) => {
  if (!isRecord(value)) {
    return undefined;
  }

  return {
    id: pickString(value._id, value.id),
    value: pickString(value.value),
    label: pickString(value.label),
    description: pickString(value.description),
    icon: resolveImagePath(pickString(value.icon)),
  };
};

const normalizeProduct = (value: unknown, shopId: string): ShopProduct | undefined => {
  if (!isRecord(value)) {
    return undefined;
  }

  const id = pickString(value._id, value.id);
  const title = pickString(value.name, value.title);

  if (!id || !title) {
    return undefined;
  }

  const price = pickNumber(value.price);
  const discountedPrice = pickNumber(value.discounted_price, value.discountedPrice);

  return {
    id,
    shopId,
    title,
    image: resolveImagePath(pickString(value.thumbnail, value.image)),
    price:
      discountedPrice != null
        ? `₹${discountedPrice.toLocaleString('en-IN')}`
        : price != null
          ? `₹${price.toLocaleString('en-IN')}`
          : undefined,
    originalPrice:
      discountedPrice != null && price != null ? `₹${price.toLocaleString('en-IN')}` : undefined,
    stock: pickNumber(value.stock),
    isFeatured: Boolean(value.is_featured ?? value.isFeatured),
  };
};

export const parseOfferDetailResponse = (
  payload: unknown,
  fallbackOfferId?: string,
  shopId = '',
): OfferDetail | null => {
  if (!isRecord(payload)) {
    return null;
  }

  const data = isRecord(payload.data) ? payload.data : payload;
  const id = pickString(data._id, data.id, fallbackOfferId);
  const title = pickString(data.title, data.name);

  if (!id || !title) {
    return null;
  }

  const timelineRecord = isRecord(data.timeline) ? data.timeline : undefined;
  const merchantRecord = isRecord(data.merchant) ? data.merchant : undefined;
  const mechanicsRecord = isRecord(data.mechanics) ? data.mechanics : undefined;
  const rulesRecord = isRecord(data.operationalRules) ? data.operationalRules : undefined;
  const minimumPurchaseAmount = pickNumber(data.minimumPurchaseAmount, data.minimum_purchase_amount);

  const parentType = normalizeMechanicType(mechanicsRecord?.parentType ?? mechanicsRecord?.parent_type);
  const subType = normalizeMechanicType(mechanicsRecord?.subType ?? mechanicsRecord?.sub_type);

  const timeline = timelineRecord
    ? {
        startDate: pickString(timelineRecord.startDate, timelineRecord.start_date),
        endDate: pickString(timelineRecord.endDate, timelineRecord.end_date),
        isExpired: Boolean(timelineRecord.isExpired ?? timelineRecord.is_expired),
        isUpcoming: Boolean(timelineRecord.isUpcoming ?? timelineRecord.is_upcoming),
        remainingDays: pickNumber(timelineRecord.remainingDays, timelineRecord.remaining_days),
      }
    : undefined;

  const linkedProducts = Array.isArray(data.linkedProducts)
    ? data.linkedProducts
        .map(item => normalizeProduct(item, shopId))
        .filter((product): product is ShopProduct => Boolean(product))
    : [];

  return {
    id,
    shopId,
    title,
    description: pickString(data.description),
    code: pickString(data.code),
    displayType: pickString(data.displayType, data.display_type),
    discountExpression: pickString(data.discountExpression, data.discount_expression),
    discount: pickString(data.discountExpression, data.discount_expression, data.discount),
    image: resolveImagePath(pickString(data.thumbnail, data.image, data.offerImage)),
    expiresAt: timeline?.endDate,
    minimumPurchaseAmount,
    subtitle:
      minimumPurchaseAmount && minimumPurchaseAmount > 0
        ? `Min purchase ₹${minimumPurchaseAmount.toLocaleString('en-IN')}`
        : undefined,
    offerType: parentType?.label,
    timeline,
    merchant: merchantRecord
      ? {
          storeName: pickString(merchantRecord.storeName, merchantRecord.store_name),
          avatar: resolveImagePath(pickString(merchantRecord.avatar)),
        }
      : undefined,
    mechanics: mechanicsRecord
      ? {
          parentType,
          subType,
          freeQuantity: pickNumber(mechanicsRecord.freeQuantity, mechanicsRecord.free_quantity) ?? null,
          maxFreeLimit: pickNumber(mechanicsRecord.maxFreeLimit, mechanicsRecord.max_free_limit) ?? null,
          campaignPoolWinners: pickNumber(
            mechanicsRecord.campaignPoolWinners,
            mechanicsRecord.campaign_pool_winners,
          ),
        }
      : undefined,
    linkedProducts,
    operationalRules: rulesRecord
      ? {
          walkInOnly: Boolean(rulesRecord.walkInOnly ?? rulesRecord.walk_in_only),
          qrRequired: Boolean(rulesRecord.qrRequired ?? rulesRecord.qr_required),
          nearbyOnly: Boolean(rulesRecord.nearbyOnly ?? rulesRecord.nearby_only),
        }
      : undefined,
    isActive: data.isActive !== undefined ? Boolean(data.isActive) : data.is_active !== undefined ? Boolean(data.is_active) : undefined,
    createdAt: pickString(data.createdAt, data.created_at),
  };
};
