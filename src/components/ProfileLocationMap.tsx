import React from 'react';
import AppGoogleMap from './AppGoogleMap';
import type { MapLocationSelection } from './FullScreenLocationMapModal';
import type { PoiClickEvent } from '../utils/mapPoi';

type ProfileLocationMapProps = {
  latitude: number;
  longitude: number;
  height?: number;
  markerTitle?: string;
  markerDescription?: string;
  searchable?: boolean;
  onPoiClick?: (event: PoiClickEvent) => void;
  onLocationChange?: (selection: MapLocationSelection) => void;
  onClearLocation?: () => void;
};

const ProfileLocationMap: React.FC<ProfileLocationMapProps> = ({
  latitude,
  longitude,
  height = 180,
  markerTitle = 'Your location',
  markerDescription,
  searchable = true,
  onPoiClick,
  onLocationChange,
  onClearLocation,
}) => (
  <AppGoogleMap
    coordinates={{ latitude, longitude }}
    height={height}
    markerTitle={markerTitle}
    markerDescription={markerDescription}
    expandLabel="Tap to open full map"
    searchable={searchable}
    onPoiClick={onPoiClick}
    onLocationChange={onLocationChange}
    onClearLocation={onClearLocation}
  />
);

export default ProfileLocationMap;
