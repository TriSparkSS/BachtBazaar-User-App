import { GOOGLE_MAPS_API_KEY } from '../config/maps';

export const extractCityFromAddress = (address?: string | null): string | undefined => {
  if (!address?.trim()) {
    return undefined;
  }

  const normalized = address
    .replace(/^work\s*-\s*/i, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (!normalized) {
    return undefined;
  }

  const commaParts = normalized.split(',').map(part => part.trim()).filter(Boolean);
  if (commaParts.length >= 2) {
    const candidate = commaParts[commaParts.length - 2] ?? commaParts[commaParts.length - 1];
    if (candidate && candidate.length >= 2) {
      return candidate;
    }
  }

  const tokens = normalized.split(/[,\s]+/).filter(Boolean);
  if (tokens.length === 1) {
    return tokens[0];
  }

  return tokens[tokens.length - 1];
};

export const extractCityFromGeocode = (payload: unknown): string | undefined => {
  if (!payload || typeof payload !== 'object') {
    return undefined;
  }

  const record = payload as Record<string, unknown>;
  const address =
    record.address && typeof record.address === 'object'
      ? (record.address as Record<string, unknown>)
      : undefined;

  const city = [
    address?.city,
    address?.town,
    address?.village,
    address?.municipality,
    address?.county,
    address?.state_district,
  ].find(value => typeof value === 'string' && value.trim());

  if (typeof city === 'string') {
    return city.trim();
  }

  if (typeof record.display_name === 'string') {
    return extractCityFromAddress(record.display_name);
  }

  return undefined;
};

export const resolveShopCity = (
  geocodeCity?: string | null,
  profileAddress?: string | null,
  fallback = 'Mohali',
): string =>
  geocodeCity?.trim() ||
  extractCityFromAddress(profileAddress) ||
  fallback;

export type GeoCoordinates = {
  latitude: number;
  longitude: number;
};

const geocodeSingleQuery = async (query: string): Promise<GeoCoordinates | null> => {
  if (!GOOGLE_MAPS_API_KEY) {
    return null;
  }

  const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
    query,
  )}&components=country:IN&key=${encodeURIComponent(GOOGLE_MAPS_API_KEY)}`;

  try {
    const response = await fetch(geocodeUrl);

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as {
      status?: string;
      results?: Array<{
        geometry?: {
          location?: {
            lat?: number;
            lng?: number;
          };
        };
      }>;
    };
    const location = payload.results?.[0]?.geometry?.location;

    if (payload.status && payload.status !== 'OK') {
      return null;
    }

    const latitude = Number(location?.lat);
    const longitude = Number(location?.lng);

    if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
      return null;
    }

    return { latitude, longitude };
  } catch {
    return null;
  }
};

export const geocodeAddress = async (
  address: string,
  options?: { city?: string; label?: string },
): Promise<GeoCoordinates | null> => {
  const trimmedAddress = address.trim();
  const city = options?.city?.trim();
  const label = options?.label?.trim();

  const queries = [
    trimmedAddress && city ? `${trimmedAddress}, ${city}, India` : undefined,
    label && trimmedAddress && city ? `${label}, ${trimmedAddress}, ${city}, India` : undefined,
    label && trimmedAddress ? `${label}, ${trimmedAddress}, India` : undefined,
    trimmedAddress ? `${trimmedAddress}, India` : undefined,
    city && trimmedAddress ? `${city}, ${trimmedAddress}, India` : undefined,
    city ? `${city}, India` : undefined,
  ].filter((query): query is string => Boolean(query?.trim()));

  const uniqueQueries = [...new Set(queries)];

  for (const query of uniqueQueries) {
    const result = await geocodeSingleQuery(query);
    if (result) {
      return result;
    }
  }

  return null;
};
