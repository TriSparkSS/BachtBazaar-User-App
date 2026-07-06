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
import { MapCoordinates } from '../utils/mapRegion';

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
  const [isLoading, setIsLoading] = useState(true);
  const [layout, setLayout] = useState({ width: 0, height: 0 });
  const mapUrl = useMemo(
    () =>
      layout.width && layout.height
        ? createGoogleStaticMapUrl({
            coordinates,
            width: layout.width,
            height: layout.height,
            zoom: 15,
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
        <MaterialCommunityIcons name="map-marker" size={38} color={colors.primary} />
      </View>

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

      {isLoading ? (
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
  mapImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  markerWrap: {
    position: 'absolute',
    left: '50%',
    top: '50%',
    marginLeft: -19,
    marginTop: -38,
    shadowColor: '#1B2430',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
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
