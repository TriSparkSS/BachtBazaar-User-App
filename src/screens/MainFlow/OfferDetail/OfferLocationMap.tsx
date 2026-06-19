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
  city?: string;
  label: string;
  onGetDirections?: () => void;
};

const buildMapHtml = (latitude: number, longitude: number) => {
  const delta = 0.012;
  const bbox = [
    longitude - delta,
    latitude - delta,
    longitude + delta,
    latitude + delta,
  ].join('%2C');
  const marker = `${latitude}%2C${longitude}`;
  const embedUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${marker}`;

  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta
      name="viewport"
      content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no"
    />
    <style>
      html, body {
        width: 100%;
        height: 100%;
        margin: 0;
        padding: 0;
        overflow: hidden;
        background: #eef2f8;
      }
      iframe {
        border: 0;
        width: 100%;
        height: 100%;
      }
    </style>
  </head>
  <body>
    <iframe src="${embedUrl}" title="Store location"></iframe>
  </body>
</html>`;
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
  const [webViewFailed, setWebViewFailed] = useState(false);

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
      setWebViewFailed(false);

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

  const mapHtml = useMemo(() => {
    if (!coordinates) {
      return null;
    }

    return buildMapHtml(coordinates.latitude, coordinates.longitude);
  }, [coordinates]);

  const openExternalMap = () => {
    if (onGetDirections) {
      onGetDirections();
      return;
    }

    const parts = [label, address, city].filter(Boolean).join(', ');
    const query = encodeURIComponent(parts || label);
    Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${query}`);
  };

  const showMapUnavailable = hasError || !mapHtml || webViewFailed;

  return (
    <View style={styles.card}>
      <View style={styles.mapContainer}>
        {isLoading ? (
          <View style={styles.centerState}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={styles.stateText}>Loading map...</Text>
          </View>
        ) : showMapUnavailable ? (
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
            mixedContentMode="always"
            androidLayerType="hardware"
            startInLoadingState
            onError={() => setWebViewFailed(true)}
            onHttpError={() => setWebViewFailed(true)}
            renderLoading={() => (
              <View style={styles.centerState}>
                <ActivityIndicator size="small" color={colors.primary} />
              </View>
            )}
          />
        )}

        {!isLoading && coordinates && !showMapUnavailable ? (
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
