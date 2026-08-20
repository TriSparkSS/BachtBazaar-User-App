import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, Text, View } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { colors } from '../helpers/styles';
import type { PoiClickEvent } from '../utils/mapPoi';
import { createMapRegion, MapCoordinates } from '../utils/mapRegion';

type NativeFullScreenLocationMapProps = {
  coordinates: MapCoordinates | null;
  cameraCoordinates?: MapCoordinates | null;
  markerTitle?: string;
  markerDescription?: string;
  showLocationCard?: boolean;
  onPoiClick?: (event: PoiClickEvent) => void;
};

const NativeFullScreenLocationMap: React.FC<NativeFullScreenLocationMapProps> = ({
  coordinates,
  cameraCoordinates,
  markerTitle = 'Selected location',
  markerDescription,
  showLocationCard = true,
  onPoiClick,
}) => {
  const mapRef = useRef<MapView | null>(null);
  const [isReady, setIsReady] = useState(false);
  const focusCoordinates = coordinates ?? cameraCoordinates;
  const region = useMemo(
    () =>
      focusCoordinates
        ? createMapRegion(focusCoordinates, 0.008, 0.008)
        : createMapRegion({ latitude: 30.7046, longitude: 76.7179 }, 0.08, 0.08),
    [focusCoordinates],
  );

  useEffect(() => {
    if (!isReady || !focusCoordinates || !mapRef.current) {
      return;
    }

    mapRef.current.animateToRegion(createMapRegion(focusCoordinates, 0.008, 0.008), 350);
  }, [focusCoordinates, isReady]);

  return (
    <View style={styles.root}>
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
        initialRegion={region}
        showsUserLocation={false}
        showsMyLocationButton={false}
        toolbarEnabled={false}
        onMapReady={() => setIsReady(true)}
        onPoiClick={onPoiClick}>
        {coordinates ? (
          <Marker
            coordinate={coordinates}
            title={markerTitle}
            description={markerDescription}
          />
        ) : null}
      </MapView>

      {showLocationCard && (markerTitle || markerDescription) ? (
        <View style={styles.locationCard} pointerEvents="none">
          {markerTitle ? (
            <Text style={styles.locationTitle} numberOfLines={1}>
              {markerTitle}
            </Text>
          ) : null}
          {markerDescription ? (
            <Text style={styles.locationDescription} numberOfLines={2}>
              {markerDescription}
            </Text>
          ) : null}
        </View>
      ) : null}

      {!isReady ? (
        <View style={styles.loading}>
          <ActivityIndicator size="small" color={colors.primary} />
        </View>
      ) : null}
    </View>
  );
};

export default NativeFullScreenLocationMap;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    overflow: 'hidden',
    backgroundColor: '#EEF2F8',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  locationCard: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 26,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderWidth: 1,
    borderColor: '#E3E9F3',
  },
  locationTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  locationDescription: {
    marginTop: 3,
    fontSize: 12,
    color: colors.mutedText,
    lineHeight: 16,
  },
  loading: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(238,242,248,0.72)',
  },
});
