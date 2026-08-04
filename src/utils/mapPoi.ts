import { showAppAlert } from '../services/appAlert';
import { MapCoordinates } from './mapRegion';

export type PoiClickEvent = {
  nativeEvent: {
    name: string;
    placeId: string;
    coordinate: MapCoordinates;
  };
};

export type PoiSelection = MapCoordinates & {
  name: string;
  placeId: string;
};

export const parsePoiClickEvent = (event: PoiClickEvent): PoiSelection => {
  const { name, placeId, coordinate } = event.nativeEvent;

  return {
    name,
    placeId,
    latitude: coordinate.latitude,
    longitude: coordinate.longitude,
  };
};

export const showPoiClickAlert = (poi: PoiSelection) => {
  showAppAlert(
    poi.name || 'Point of interest',
    `Place ID: ${poi.placeId}\nLat: ${poi.latitude.toFixed(6)}\nLng: ${poi.longitude.toFixed(6)}`,
    [{ text: 'OK' }],
  );
};
