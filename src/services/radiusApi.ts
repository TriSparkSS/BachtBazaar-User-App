import { API_ENDPOINTS, USER_RADIUS_ACCOUNT_ID } from '../config/api';
import { apiRequest } from './apiClient';
import {
  areaRadiusStorage,
  clampAreaRadiusKm,
} from './areaRadiusStorage';

export type DiscoveryRadiusLocation = {
  latitude?: number;
  longitude?: number;
  city?: string;
};

export type DiscoveryRadius = {
  radiusKm: number;
  unit: string;
  location?: DiscoveryRadiusLocation;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value && typeof value === 'object' && !Array.isArray(value));

const readNumber = (value: unknown): number | undefined => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return undefined;
};

export const parseDiscoveryRadius = (
  payload: unknown,
  fallbackKm?: number,
): DiscoveryRadius => {
  const root = isRecord(payload) ? payload : {};
  const data = isRecord(root.data) ? root.data : root;
  const locationRaw = isRecord(data.location) ? data.location : undefined;
  const latitude = readNumber(locationRaw?.latitude);
  const longitude = readNumber(locationRaw?.longitude);
  const city = typeof locationRaw?.city === 'string' ? locationRaw.city.trim() : '';
  const radiusRaw = readNumber(data.radius);

  return {
    radiusKm: clampAreaRadiusKm(radiusRaw ?? fallbackKm ?? Number.NaN),
    unit: typeof data.unit === 'string' && data.unit.trim() ? data.unit.trim() : 'km',
    location:
      latitude != null || longitude != null || city
        ? {
            latitude,
            longitude,
            city: city || undefined,
          }
        : undefined,
  };
};

const radiusHeaders = {
  'account-id': USER_RADIUS_ACCOUNT_ID,
  Accept: 'application/json',
};

export const radiusApi = {
  async getRadius(token: string): Promise<DiscoveryRadius> {
    const payload = await apiRequest<unknown>(API_ENDPOINTS.discoveryRadius, {
      method: 'GET',
      token,
      headers: radiusHeaders,
    });
    const parsed = parseDiscoveryRadius(payload);
    await areaRadiusStorage.setRadiusKm(parsed.radiusKm);
    return parsed;
  },

  async updateRadius(token: string, radiusKm: number): Promise<DiscoveryRadius> {
    const radius = clampAreaRadiusKm(radiusKm);

    const payload = await apiRequest<unknown>(API_ENDPOINTS.discoveryRadius, {
      method: 'PATCH',
      token,
      headers: {
        ...radiusHeaders,
        'Content-Type': 'application/json',
      },
      body: { radius },
    });
    const parsed = parseDiscoveryRadius(payload, radius);
    const savedKm = parsed.radiusKm;
    await areaRadiusStorage.setRadiusKm(savedKm);
    return { ...parsed, radiusKm: savedKm };
  },
};
