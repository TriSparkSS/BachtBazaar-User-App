import { GOOGLE_MAPS_API_KEY } from '../config/maps';
import { MapCoordinates } from './mapRegion';

type CreateGoogleStaticMapUrlOptions = {
  coordinates: MapCoordinates;
  width: number;
  height: number;
  zoom?: number;
  scale?: 1 | 2;
};

const clampStaticMapSize = (value: number, fallback: number) => {
  if (!Number.isFinite(value) || value <= 0) {
    return fallback;
  }

  return Math.max(160, Math.min(640, Math.round(value)));
};

export const createGoogleStaticMapUrl = ({
  coordinates,
  width,
  height,
  zoom = 15,
  scale = 2,
}: CreateGoogleStaticMapUrlOptions) => {
  if (!GOOGLE_MAPS_API_KEY) {
    return undefined;
  }

  const center = `${coordinates.latitude.toFixed(6)},${coordinates.longitude.toFixed(6)}`;
  const size = `${clampStaticMapSize(width, 640)}x${clampStaticMapSize(
    height,
    360,
  )}`;

  return [
    'https://maps.googleapis.com/maps/api/staticmap',
    `center=${encodeURIComponent(center)}`,
    `zoom=${zoom}`,
    `size=${size}`,
    `scale=${scale}`,
    'maptype=roadmap',
    `key=${encodeURIComponent(GOOGLE_MAPS_API_KEY)}`,
  ]
    .join('&')
    .replace('&', '?');
};
