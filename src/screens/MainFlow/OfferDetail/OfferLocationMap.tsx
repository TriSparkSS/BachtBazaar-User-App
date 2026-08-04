import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import AppGoogleMap from '../../../components/AppGoogleMap';
import { colors, fonts } from '../../../helpers/styles';
import { geocodeAddress } from '../../../utils/location';

type OfferLocationMapProps = {
  address?: string;
  city?: string;
  label: string;
  onGetDirections?: () => void;
};

const OfferLocationMap: React.FC<OfferLocationMapProps> = ({
  address,
  city,
  label,
  onGetDirections,
}) => {
  const [coordinates, setCoordinates] = useState<{ latitude: number; longitude: number } | null>(null);
  const [isLoading, setIsLoading] = useState(Boolean(address?.trim() || city?.trim()));
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const resolveCoordinates = async () => {
      if (!address?.trim() && !city?.trim()) {
        setIsLoading(false);
        setHasError(true);
        return;
      }

      setIsLoading(true);
      setHasError(false);

      const result = await geocodeAddress(address?.trim() || city || '', {
        city,
        label,
      });

      if (cancelled) {
        return;
      }

      if (!result) {
        setCoordinates(null);
        setHasError(true);
      } else {
        setCoordinates(result);
        setHasError(false);
      }

      setIsLoading(false);
    };

    resolveCoordinates();

    return () => {
      cancelled = true;
    };
  }, [address, city, label]);

  const openExternalMap = () => {
    if (onGetDirections) {
      onGetDirections();
      return;
    }

    const parts = [label, address, city].filter(Boolean).join(', ');
    const query = encodeURIComponent(parts || label);
    Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${query}`);
  };

  return (
    <View style={styles.card}>
      <View style={styles.mapContainer}>
        {isLoading ? (
          <View style={styles.centerState}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={styles.stateText}>Loading map...</Text>
          </View>
        ) : hasError || !coordinates ? (
          <View style={styles.centerState}>
            <MaterialCommunityIcons name="map-marker-off-outline" size={28} color="#B8C2D3" />
            <Text style={styles.stateTitle}>Map unavailable</Text>
            <Text style={styles.stateText}>Could not locate this store on the map.</Text>
          </View>
        ) : (
          <AppGoogleMap
            coordinates={coordinates}
            height={180}
            markerTitle={label}
            markerDescription={[address, city].filter(Boolean).join(', ')}
            expandLabel="Tap to open full map"
          />
        )}
      </View>

      <TouchableOpacity style={styles.directionsButton} onPress={openExternalMap} activeOpacity={0.85}>
        <MaterialCommunityIcons name="navigation-variant-outline" size={16} color={colors.primary} />
        <Text style={styles.directionsButtonText}>Get Directions</Text>
      </TouchableOpacity>
    </View>
  );
};

export default OfferLocationMap;

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#FAFBFE',
    borderWidth: 1,
    borderColor: '#EEF2F8',
  },
  mapContainer: {
    height: 180,
    backgroundColor: '#EEF2F8',
  },
  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    gap: 6,
  },
  stateTitle: {
    fontSize: 14,
    color: colors.text,
    fontFamily: fonts.BOLD,
    marginTop: 4,
  },
  stateText: {
    fontSize: 12,
    color: colors.mutedText,
    textAlign: 'center',
    fontFamily: fonts.BOLD,
    lineHeight: 17,
  },
  directionsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: '#EEF2F8',
  },
  directionsButtonText: {
    fontSize: 13,
    color: colors.primary,
    fontFamily: fonts.BOLD,
  },
});
