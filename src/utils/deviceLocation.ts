import { PermissionsAndroid, Platform } from 'react-native';
import Geolocation from 'react-native-geolocation-service';
import { GeoCoordinates } from './location';

export const requestLocationPermission = async (): Promise<boolean> => {
  if (Platform.OS !== 'android') {
    return true;
  }

  const granted = await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
  );

  return granted === PermissionsAndroid.RESULTS.GRANTED;
};

const readCoordinate = (value: unknown): number | null => {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

export const getCurrentDeviceCoordinates = async (): Promise<GeoCoordinates | null> =>
  new Promise(resolve => {
    try {
      Geolocation.getCurrentPosition(
        position => {
          const latitude = readCoordinate(position?.coords?.latitude);
          const longitude = readCoordinate(position?.coords?.longitude);
          if (latitude == null || longitude == null) {
            resolve(null);
            return;
          }
          resolve({ latitude, longitude });
        },
        () => resolve(null),
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 10000,
        },
      );
    } catch {
      resolve(null);
    }
  });
