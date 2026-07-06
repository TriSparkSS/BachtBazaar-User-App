import React from 'react';
import AppGoogleMap from './AppGoogleMap';
import type { PoiClickEvent } from '../utils/mapPoi';

type ProfileLocationMapProps = {
  latitude: number;
  longitude: number;
  height?: number;
  markerTitle?: string;
  markerDescription?: string;
  onPoiClick?: (event: PoiClickEvent) => void;
};

const ProfileLocationMap: React.FC<ProfileLocationMapProps> = ({
  latitude,
  longitude,
  height = 180,
  markerTitle = 'Your location',
  markerDescription,
  onPoiClick,
}) => (
  <AppGoogleMap
    coordinates={{ latitude, longitude }}
    height={height}
    markerTitle={markerTitle}
    markerDescription={markerDescription}
    expandLabel="Tap to open full map"
    onPoiClick={onPoiClick}
  />
);

export default ProfileLocationMap;
