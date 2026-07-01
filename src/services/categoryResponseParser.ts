import { Category } from '../types/category';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value && typeof value === 'object' && !Array.isArray(value));

const pickString = (...values: unknown[]): string | undefined => {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }

  return undefined;
};

const normalizeCategory = (value: unknown): Category | undefined => {
  if (!isRecord(value)) {
    return undefined;
  }

  const id = pickString(value._id, value.id);
  const label = pickString(value.label, value.name, value.value);
  const valueSlug = pickString(value.value, value.slug);

  if (!id || !label) {
    return undefined;
  }

  return {
    id,
    value: valueSlug ?? label.toLowerCase(),
    label,
    description: pickString(value.description),
    image: pickString(value.image, value.imageUrl, value.image_url),
    type: pickString(value.type) ?? 'product',
  };
};

const unwrapList = (payload: unknown): unknown[] => {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (!isRecord(payload)) {
    return [];
  }

  if (Array.isArray(payload.data)) {
    return payload.data;
  }

  return [];
};

export const parseCategoriesResponse = (payload: unknown): Category[] =>
  unwrapList(payload)
    .map(item => normalizeCategory(item))
    .filter((category): category is Category => Boolean(category));
