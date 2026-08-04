import { GOOGLE_MAPS_API_KEY } from '../config/maps';

export type ReverseGeocodeResult = {
  address?: string;
  city?: string;
};

const getAddressComponent = (
  components: Array<{ long_name?: string; types?: string[] }>,
  ...types: string[]
) => {
  for (const type of types) {
    const match = components.find(component => component.types?.includes(type));
    if (match?.long_name?.trim()) {
      return match.long_name.trim();
    }
  }

  return undefined;
};

export const reverseGeocodeWithGoogle = async (
  latitude: number,
  longitude: number,
): Promise<ReverseGeocodeResult> => {
  const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${encodeURIComponent(
    `${latitude},${longitude}`,
  )}&key=${encodeURIComponent(GOOGLE_MAPS_API_KEY)}`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      return {};
    }

    const payload = (await response.json()) as {
      results?: Array<{
        formatted_address?: string;
        address_components?: Array<{ long_name?: string; types?: string[] }>;
      }>;
    };

    const result = payload.results?.[0];
    if (!result) {
      return {};
    }

    const components = result.address_components ?? [];

    return {
      address: result.formatted_address?.trim(),
      city:
        getAddressComponent(components, 'locality', 'postal_town', 'administrative_area_level_2') ??
        getAddressComponent(components, 'sublocality', 'sublocality_level_1'),
    };
  } catch {
    return {};
  }
};

export const formatCoordinate = (value: number) => value.toFixed(6);

export const parseCoordinateInput = (value: string): number | undefined => {
  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }

  const parsed = Number(trimmed);
  if (Number.isNaN(parsed)) {
    return undefined;
  }

  return parsed;
};
