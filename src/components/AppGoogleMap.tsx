import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import FullScreenLocationMapModal from './FullScreenLocationMapModal';
import NativeGoogleMapPreview from './NativeGoogleMapPreview';
import { colors, fonts } from '../helpers/styles';
import type { PoiClickEvent } from '../utils/mapPoi';
import { parsePoiClickEvent, showPoiClickAlert } from '../utils/mapPoi';
import { MapCoordinates } from '../utils/mapRegion';

type AppGoogleMapProps = {
  coordinates: MapCoordinates;
  height?: number;
  markerTitle?: string;
  markerDescription?: string;
  expandLabel?: string;
  onPress?: () => void;
  onPoiClick?: (event: PoiClickEvent) => void;
};

const AppGoogleMap: React.FC<AppGoogleMapProps> = ({
  coordinates,
  height = 180,
  markerTitle = 'Selected location',
  markerDescription,
  expandLabel = 'Tap to open full map',
  onPress,
  onPoiClick,
}) => {
  const [isFullscreenVisible, setIsFullscreenVisible] = useState(false);

  const handlePoiClick = (event: PoiClickEvent) => {
    if (onPoiClick) {
      onPoiClick(event);
      return;
    }

    showPoiClickAlert(parsePoiClickEvent(event));
  };

  const openFullscreen = () => {
    if (onPress) {
      onPress();
      return;
    }

    setIsFullscreenVisible(true);
  };

  return (
    <>
      <Pressable
        style={[styles.container, { height }]}
        onPress={openFullscreen}
        accessibilityRole="button"
        accessibilityLabel="Open full screen map">
        <NativeGoogleMapPreview
          coordinates={coordinates}
          markerTitle={markerTitle}
          markerDescription={markerDescription}
        />

        <View style={styles.expandOverlay} pointerEvents="none">
          <View style={styles.expandChip}>
            <MaterialCommunityIcons name="fullscreen" size={16} color={colors.primary} />
            <Text style={styles.expandText}>{expandLabel}</Text>
          </View>
        </View>
      </Pressable>

      <FullScreenLocationMapModal
        visible={isFullscreenVisible}
        coordinates={coordinates}
        markerTitle={markerTitle}
        markerDescription={markerDescription}
        onPoiClick={handlePoiClick}
        onClose={() => setIsFullscreenVisible(false)}
      />
    </>
  );
};

export default AppGoogleMap;

const styles = StyleSheet.create({
  container: {
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#DCE3EE',
    backgroundColor: '#EEF2F8',
  },
  expandOverlay: {
    position: 'absolute',
    left: 10,
    right: 10,
    bottom: 10,
    alignItems: 'center',
  },
  expandChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderRadius: 100,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#E3E9F3',
    shadowColor: '#1B2430',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  expandText: {
    fontSize: 11,
    color: colors.primary,
    fontFamily: fonts.BOLD,
  },
});
