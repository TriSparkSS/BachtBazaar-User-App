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

export const getCurrentDeviceCoordinates = async (): Promise<GeoCoordinates | null> =>
  new Promise(resolve => {
    Geolocation.getCurrentPosition(
      position => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      () => resolve(null),
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 10000,
      },
    );
  });
