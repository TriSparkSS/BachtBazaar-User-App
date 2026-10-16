import AsyncStorage from '@react-native-async-storage/async-storage';

const AREA_RADIUS_KEY = '@bachatbazaar/area_radius_km';

export const DEFAULT_AREA_RADIUS_KM = 5;
export const MIN_AREA_RADIUS_KM = 1;
export const MAX_AREA_RADIUS_KM = 100;

export const clampAreaRadiusKm = (value: number): number => {
  if (!Number.isFinite(value)) {
    return DEFAULT_AREA_RADIUS_KM;
  }
  return Math.min(
    MAX_AREA_RADIUS_KM,
    Math.max(MIN_AREA_RADIUS_KM, Math.round(value)),
  );
};

export const areaRadiusStorage = {
  async getRadiusKm(): Promise<number> {
    try {
      const stored = await AsyncStorage.getItem(AREA_RADIUS_KEY);
      if (!stored) {
        return DEFAULT_AREA_RADIUS_KM;
      }
      return clampAreaRadiusKm(Number(stored));
    } catch {
      return DEFAULT_AREA_RADIUS_KM;
    }
  },

  async setRadiusKm(radiusKm: number): Promise<number> {
    const next = clampAreaRadiusKm(radiusKm);
    await AsyncStorage.setItem(AREA_RADIUS_KEY, String(next));
    return next;
  },
};
