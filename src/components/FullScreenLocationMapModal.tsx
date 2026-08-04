import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import NativeFullScreenLocationMap from './NativeFullScreenLocationMap';
import { colors, fonts } from '../helpers/styles';
import type { PoiClickEvent } from '../utils/mapPoi';
import { MapCoordinates } from '../utils/mapRegion';

type FullScreenLocationMapModalProps = {
  visible: boolean;
  coordinates: MapCoordinates;
  markerTitle?: string;
  markerDescription?: string;
  onPoiClick?: (event: PoiClickEvent) => void;
  onClose: () => void;
};

const FullScreenLocationMapModal: React.FC<FullScreenLocationMapModalProps> = ({
  visible,
  coordinates,
  markerTitle = 'Selected location',
  markerDescription,
  onPoiClick,
  onClose,
}) => (
  <Modal
    visible={visible}
    animationType="slide"
    presentationStyle="fullScreen"
    onRequestClose={onClose}>
    <View style={styles.root}>
      <NativeFullScreenLocationMap
        coordinates={coordinates}
        markerTitle={markerTitle}
        markerDescription={markerDescription}
        onPoiClick={onPoiClick}
      />

      <SafeAreaView style={styles.overlay} edges={['top']} pointerEvents="box-none">
        <View style={styles.topBar}>
          <Pressable
            style={styles.closeButton}
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Close map">
            <MaterialCommunityIcons name="close" size={22} color={colors.text} />
          </Pressable>
          <View style={styles.titleWrap}>
            <Text style={styles.title} numberOfLines={1}>
              {markerTitle}
            </Text>
            {markerDescription ? (
              <Text style={styles.subtitle} numberOfLines={2}>
                {markerDescription}
              </Text>
            ) : null}
          </View>
        </View>
      </SafeAreaView>
    </View>
  </Modal>
);

export default FullScreenLocationMapModal;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#EEF2F8',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginHorizontal: 16,
    marginTop: 8,
    padding: 10,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderWidth: 1,
    borderColor: '#E7ECF5',
    shadowColor: '#1B2430',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F4F7FC',
    borderWidth: 1,
    borderColor: '#E3E9F3',
  },
  titleWrap: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    color: colors.text,
    fontFamily: fonts.BOLD,
  },
  subtitle: {
    marginTop: 2,
    fontSize: 12,
    color: colors.mutedText,
    fontFamily: fonts.BOLD,
    lineHeight: 16,
  },
});
