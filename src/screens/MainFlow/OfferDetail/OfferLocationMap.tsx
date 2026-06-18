import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { WebView } from 'react-native-webview';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { colors, fonts } from '../../../helpers/styles';
import { geocodeAddress } from '../../../utils/location';

type OfferLocationMapProps = {
  address?: string;
  label: string;
  onGetDirections?: () => void;
};

const buildMapHtml = (latitude: number, longitude: number, label: string) => `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta
      name="viewport"
      content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no"
    />
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
    <style>
      html, body, #map {
        width: 100%;
        height: 100%;
        margin: 0;
        padding: 0;
        background: #eef2f8;
      }
      .leaflet-control-attribution {
        font-size: 9px;
      }
    </style>
  </head>
  <body>
    <div id="map"></div>
    <script>
      const map = L.map('map', {
        zoomControl: true,
        attributionControl: true,
      }).setView([${latitude}, ${longitude}], 15);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors',
      }).addTo(map);

      const marker = L.marker([${latitude}, ${longitude}]).addTo(map);
      marker.bindPopup(${JSON.stringify(label)}).openPopup();
    </script>
  </body>
</html>`;

const OfferLocationMap: React.FC<OfferLocationMapProps> = ({ address, label, onGetDirections }) => {
  const [coordinates, setCoordinates] = useState<{ latitude: number; longitude: number } | null>(null);
  const [isLoading, setIsLoading] = useState(Boolean(address?.trim()));
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const resolveCoordinates = async () => {
      if (!address?.trim()) {
        setIsLoading(false);
        setHasError(true);
        return;
      }

      setIsLoading(true);
      setHasError(false);

      const result = await geocodeAddress(`${label}, ${address}`);

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
  }, [address, label]);

  const mapHtml = useMemo(() => {
    if (!coordinates) {
      return null;
    }

    return buildMapHtml(coordinates.latitude, coordinates.longitude, label);
  }, [coordinates, label]);

  const openExternalMap = () => {
    if (onGetDirections) {
      onGetDirections();
      return;
    }

    const query = encodeURIComponent(address ? `${label}, ${address}` : label);
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
        ) : hasError || !mapHtml ? (
          <View style={styles.centerState}>
            <MaterialCommunityIcons name="map-marker-off-outline" size={28} color="#B8C2D3" />
            <Text style={styles.stateTitle}>Map unavailable</Text>
            <Text style={styles.stateText}>Could not locate this store on the map.</Text>
          </View>
        ) : (
          <WebView
            originWhitelist={['*']}
            source={{ html: mapHtml }}
            style={styles.webView}
            nestedScrollEnabled
            javaScriptEnabled
            domStorageEnabled
            androidLayerType="hardware"
            startInLoadingState
            renderLoading={() => (
              <View style={styles.centerState}>
                <ActivityIndicator size="small" color={colors.primary} />
              </View>
            )}
          />
        )}

        {!isLoading && coordinates ? (
          <View style={styles.pinBadge}>
            <MaterialCommunityIcons name="map-marker" size={14} color={colors.primary} />
            <Text style={styles.pinBadgeText} numberOfLines={1}>
              {label}
            </Text>
          </View>
        ) : null}
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
  webView: {
    flex: 1,
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
  pinBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    maxWidth: '72%',
    backgroundColor: 'rgba(255,255,255,0.94)',
    borderRadius: 100,
    paddingHorizontal: 10,
    paddingVertical: 6,
    shadowColor: '#1B2430',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  pinBadgeText: {
    fontSize: 11,
    color: colors.text,
    fontFamily: fonts.BOLD,
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
