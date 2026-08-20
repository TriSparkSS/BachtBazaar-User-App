import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, Text, View } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { colors } from '../helpers/styles';
import { createMapRegion, MapCoordinates } from '../utils/mapRegion';

type NativeGoogleMapPreviewProps = {
  coordinates: MapCoordinates;
  markerTitle?: string;
  markerDescription?: string;
};

const NativeGoogleMapPreview: React.FC<NativeGoogleMapPreviewProps> = ({
  coordinates,
  markerTitle = 'Selected location',
  markerDescription,
}) => {
  const [isReady, setIsReady] = useState(false);
  const region = useMemo(
    () => createMapRegion(coordinates, 0.01, 0.01),
    [coordinates],
  );

  return (
    <View style={styles.root}>
      <MapView
        key={`${coordinates.latitude}-${coordinates.longitude}`}
        style={styles.map}
        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
        initialRegion={region}
        scrollEnabled={false}
        zoomEnabled={false}
        rotateEnabled={false}
        pitchEnabled={false}
        toolbarEnabled={false}
        moveOnMarkerPress={false}
        pointerEvents="none"
        onMapReady={() => setIsReady(true)}>
        <Marker
          coordinate={coordinates}
          title={markerTitle}
          description={markerDescription}
        />
      </MapView>

      <View style={styles.label} pointerEvents="none">
        <Text style={styles.labelTitle} numberOfLines={1}>
          {markerTitle}
        </Text>
        {markerDescription ? (
          <Text style={styles.labelDescription} numberOfLines={1}>
            {markerDescription}
          </Text>
        ) : null}
      </View>

      {!isReady ? (
        <View style={styles.loading}>
          <ActivityIndicator size="small" color={colors.primary} />
        </View>
      ) : null}
    </View>
  );
};

export default NativeGoogleMapPreview;

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
    backgroundColor: '#EEF2F8',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  label: {
    position: 'absolute',
    left: 12,
    right: 12,
    top: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.94)',
    borderWidth: 1,
    borderColor: '#E3E9F3',
  },
  labelTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
  },
  labelDescription: {
    marginTop: 2,
    fontSize: 10,
    color: colors.mutedText,
  },
  loading: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(238,242,248,0.72)',
  },
});
