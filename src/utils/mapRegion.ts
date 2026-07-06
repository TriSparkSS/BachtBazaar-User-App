export type MapCoordinates = {
  latitude: number;
  longitude: number;
};

export const createMapRegion = (
  coordinates: MapCoordinates,
  latitudeDelta = 0.012,
  longitudeDelta = 0.012,
) => ({
  latitude: coordinates.latitude,
  longitude: coordinates.longitude,
  latitudeDelta,
  longitudeDelta,
});
