import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  LayoutChangeEvent,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { colors } from '../helpers/styles';
import { createGoogleStaticMapUrl } from '../utils/googleStaticMap';
import type { PoiClickEvent } from '../utils/mapPoi';
import { MapCoordinates } from '../utils/mapRegion';

type NativeFullScreenLocationMapProps = {
  coordinates: MapCoordinates;
  markerTitle?: string;
  markerDescription?: string;
  onPoiClick?: (event: PoiClickEvent) => void;
};

const NativeFullScreenLocationMap: React.FC<NativeFullScreenLocationMapProps> = ({
  coordinates,
  markerTitle = 'Selected location',
  markerDescription,
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [layout, setLayout] = useState({ width: 0, height: 0 });
  const mapUrl = useMemo(
    () =>
      layout.width && layout.height
        ? createGoogleStaticMapUrl({
            coordinates,
            width: layout.width,
            height: layout.height,
            zoom: 16,
          })
        : undefined,
    [coordinates, layout.height, layout.width],
  );

  const handleLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setIsLoading(true);
    setLayout({ width, height });
  };

  return (
    <View style={styles.root} onLayout={handleLayout}>
      {mapUrl ? (
        <Image
          key={mapUrl}
          source={{ uri: mapUrl }}
          style={styles.mapImage}
          resizeMode="cover"
          onLoadStart={() => setIsLoading(true)}
          onLoadEnd={() => setIsLoading(false)}
        />
      ) : null}

      <View style={styles.markerWrap} pointerEvents="none">
        <MaterialCommunityIcons name="map-marker" size={48} color={colors.primary} />
      </View>

      <View style={styles.locationCard} pointerEvents="none">
        <Text style={styles.locationTitle} numberOfLines={1}>
          {markerTitle}
        </Text>
        {markerDescription ? (
          <Text style={styles.locationDescription} numberOfLines={2}>
            {markerDescription}
          </Text>
        ) : null}
      </View>

      {isLoading ? (
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
  mapImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  markerWrap: {
    position: 'absolute',
    left: '50%',
    top: '50%',
    marginLeft: -24,
    marginTop: -48,
    shadowColor: '#1B2430',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
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
