import { Linking } from 'react-native';

export const hasValidCoordinates = (latitude?: number, longitude?: number): boolean =>
  typeof latitude === 'number' &&
  typeof longitude === 'number' &&
  Number.isFinite(latitude) &&
  Number.isFinite(longitude) &&
  Math.abs(latitude) <= 90 &&
  Math.abs(longitude) <= 180;

/** Open Google Maps directions to the store pin (lat/lng), not an address search. */
export const openStoreDirections = (options: {
  latitude?: number;
  longitude?: number;
  label?: string;
  addressFallback?: string;
}) => {
  const { latitude, longitude, label, addressFallback } = options;
  if (hasValidCoordinates(latitude, longitude)) {
    const destination = `${latitude},${longitude}`;
    return Linking.openURL(
      `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`,
    );
  }

  const query = encodeURIComponent(addressFallback?.trim() || label?.trim() || '');
  if (!query) {
    return Promise.resolve();
  }
  return Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${query}`);
};
