import { GOOGLE_MAPS_API_KEY } from '../config/maps';
import { extractCityFromAddress } from './location';
import type { MapCoordinates } from './mapRegion';

export type PlacePrediction = {
  placeId: string;
  primaryText: string;
  secondaryText?: string;
  description: string;
};

export type PlaceSelection = MapCoordinates & {
  address: string;
  city?: string;
  name?: string;
};

type AutocompletePayload = {
  status?: string;
  predictions?: Array<{
    place_id?: string;
    description?: string;
    structured_formatting?: {
      main_text?: string;
      secondary_text?: string;
    };
  }>;
};

type PlaceDetailsPayload = {
  status?: string;
  result?: {
    name?: string;
    formatted_address?: string;
    geometry?: {
      location?: {
        lat?: number;
        lng?: number;
      };
    };
    address_components?: Array<{ long_name?: string; types?: string[] }>;
  };
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

export const fetchPlacePredictions = async (
  input: string,
  options?: { country?: string; sessionToken?: string },
): Promise<PlacePrediction[]> => {
  const query = input.trim();
  if (!query || query.length < 2 || !GOOGLE_MAPS_API_KEY) {
    return [];
  }

  const country = options?.country?.trim().toLowerCase() || 'in';
  const params = new URLSearchParams({
    input: query,
    key: GOOGLE_MAPS_API_KEY,
    components: `country:${country}`,
    language: 'en',
  });
  if (options?.sessionToken) {
    params.set('sessiontoken', options.sessionToken);
  }

  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/place/autocomplete/json?${params.toString()}`,
    );
    if (!response.ok) {
      return [];
    }

    const payload = (await response.json()) as AutocompletePayload;
    if (payload.status && payload.status !== 'OK' && payload.status !== 'ZERO_RESULTS') {
      return [];
    }

    return (payload.predictions ?? [])
      .map(prediction => {
        const placeId = prediction.place_id?.trim();
        const description = prediction.description?.trim();
        if (!placeId || !description) {
          return null;
        }

        return {
          placeId,
          description,
          primaryText:
            prediction.structured_formatting?.main_text?.trim() || description,
          secondaryText: prediction.structured_formatting?.secondary_text?.trim(),
        } satisfies PlacePrediction;
      })
      .filter((item): item is PlacePrediction => Boolean(item));
  } catch {
    return [];
  }
};

export const fetchPlaceDetails = async (
  placeId: string,
  options?: { sessionToken?: string },
): Promise<PlaceSelection | null> => {
  const id = placeId.trim();
  if (!id || !GOOGLE_MAPS_API_KEY) {
    return null;
  }

  const params = new URLSearchParams({
    place_id: id,
    key: GOOGLE_MAPS_API_KEY,
    fields: 'geometry,formatted_address,name,address_component',
    language: 'en',
  });
  if (options?.sessionToken) {
    params.set('sessiontoken', options.sessionToken);
  }

  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/place/details/json?${params.toString()}`,
    );
    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as PlaceDetailsPayload;
    if (payload.status && payload.status !== 'OK') {
      return null;
    }

    const result = payload.result;
    const latitude = Number(result?.geometry?.location?.lat);
    const longitude = Number(result?.geometry?.location?.lng);
    if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
      return null;
    }

    const address =
      result?.formatted_address?.trim() ||
      result?.name?.trim() ||
      undefined;
    if (!address) {
      return null;
    }

    const components = result?.address_components ?? [];
    const city =
      getAddressComponent(components, 'locality', 'postal_town', 'administrative_area_level_2') ??
      getAddressComponent(components, 'sublocality', 'sublocality_level_1') ??
      extractCityFromAddress(address);

    return {
      latitude,
      longitude,
      address,
      city,
      name: result?.name?.trim(),
    };
  } catch {
    return null;
  }
};
