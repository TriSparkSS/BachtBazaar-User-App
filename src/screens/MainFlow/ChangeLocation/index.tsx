import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import ProfileLocationMap from '../../../components/ProfileLocationMap';
import type { MapLocationSelection } from '../../../components/FullScreenLocationMapModal';
import { useAppContext } from '../../../context/AppContext';
import { colors, fonts } from '../../../helpers/styles';
import { MainStackParamList } from '../../../navigation/types';
import { showAppAlert } from '../../../services/appAlert';
import { userAuthApi } from '../../../services/userAuthApi';
import {
  getCurrentDeviceCoordinates,
  requestLocationPermission,
} from '../../../utils/deviceLocation';
import {
  formatCoordinate,
  parseCoordinateInput,
  reverseGeocodeWithGoogle,
} from '../../../utils/googleGeocoding';

const FALLBACK_MAP_CENTER = { latitude: 30.7046, longitude: 76.7179 };

const ChangeLocationScreen = () => {
  const navigation =
    useNavigation<StackNavigationProp<MainStackParamList, 'ChangeLocation'>>();
  const { authToken, currentUser, setSession } = useAppContext();

  const [address, setAddress] = useState(currentUser?.address?.trim() || '');
  const [city, setCity] = useState(currentUser?.city?.trim() || '');
  const [latitude, setLatitude] = useState(
    currentUser?.latitude != null ? formatCoordinate(currentUser.latitude) : '',
  );
  const [longitude, setLongitude] = useState(
    currentUser?.longitude != null ? formatCoordinate(currentUser.longitude) : '',
  );
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const autoLocatedRef = useRef(false);

  const applyCoordinates = useCallback(async (coords: { latitude: number; longitude: number }) => {
    setLatitude(formatCoordinate(coords.latitude));
    setLongitude(formatCoordinate(coords.longitude));

    const geocoded = await reverseGeocodeWithGoogle(coords.latitude, coords.longitude);
    if (geocoded.address) {
      setAddress(geocoded.address);
    }
    if (geocoded.city) {
      setCity(geocoded.city);
    }
  }, []);

  useEffect(() => {
    if (autoLocatedRef.current) {
      return;
    }
    if (latitude.trim() || longitude.trim()) {
      return;
    }

    let cancelled = false;
    autoLocatedRef.current = true;

    const loadCurrentLocation = async () => {
      try {
        setIsLoadingLocation(true);
        const permitted = await requestLocationPermission();
        if (!permitted || cancelled) {
          return;
        }
        const coordinates = await getCurrentDeviceCoordinates();
        if (!coordinates || cancelled) {
          return;
        }
        await applyCoordinates(coordinates);
      } catch {
        // User can tap "Use current location" manually.
      } finally {
        if (!cancelled) {
          setIsLoadingLocation(false);
        }
      }
    };

    void loadCurrentLocation();
    return () => {
      cancelled = true;
    };
  }, [applyCoordinates, latitude, longitude]);

  const handleUseCurrentLocation = useCallback(async () => {
    try {
      setIsLoadingLocation(true);
      const permitted = await requestLocationPermission();
      if (!permitted) {
        showAppAlert(
          'Permission needed',
          'Location permission is required to set your nearby coupons area.',
        );
        return;
      }
      const coordinates = await getCurrentDeviceCoordinates();
      if (!coordinates) {
        showAppAlert('Location unavailable', 'Could not detect your current location.');
        return;
      }
      await applyCoordinates(coordinates);
    } catch {
      showAppAlert('Location failed', 'Could not update your location. Please try again.');
    } finally {
      setIsLoadingLocation(false);
    }
  }, [applyCoordinates]);

  const handleMapLocationChange = useCallback((selection: MapLocationSelection) => {
    setLatitude(formatCoordinate(selection.latitude));
    setLongitude(formatCoordinate(selection.longitude));
    if (selection.address?.trim()) {
      setAddress(selection.address.trim());
    }
    if (selection.city?.trim()) {
      setCity(selection.city.trim());
    }
  }, []);

  const handleSave = useCallback(async () => {
    const parsedLatitude = parseCoordinateInput(latitude);
    const parsedLongitude = parseCoordinateInput(longitude);
    const nextAddress = address.trim();
    const nextCity = city.trim();

    if (
      parsedLatitude == null ||
      parsedLongitude == null ||
      parsedLatitude < -90 ||
      parsedLatitude > 90 ||
      parsedLongitude < -180 ||
      parsedLongitude > 180
    ) {
      showAppAlert(
        'Pick a location',
        'Search the map or use current location so we can show nearby coupons.',
      );
      return;
    }

    if (!authToken?.trim() || !currentUser?._id) {
      showAppAlert('Login required', 'Please log in again to change your location.');
      return;
    }

    try {
      setIsSubmitting(true);
      const response = await userAuthApi.updateProfile(authToken, currentUser, {
        address: nextAddress || nextCity || 'Selected location',
        city: nextCity || undefined,
        latitude: parsedLatitude,
        longitude: parsedLongitude,
      });
      const enrichedUser = await userAuthApi.refreshUserProfile(authToken, response.user);
      await setSession(authToken, {
        ...enrichedUser,
        address: enrichedUser.address?.trim() || nextAddress || enrichedUser.address,
        city: enrichedUser.city?.trim() || nextCity || enrichedUser.city,
        latitude: enrichedUser.latitude ?? parsedLatitude,
        longitude: enrichedUser.longitude ?? parsedLongitude,
      });
      showAppAlert(
        'Location updated',
        'Nearby coupons and local offers will now use this place.',
        [{ text: 'OK', onPress: () => navigation.goBack() }],
      );
    } catch (error) {
      showAppAlert(
        'Save failed',
        error instanceof Error ? error.message : 'Could not update your location.',
      );
    } finally {
      setIsSubmitting(false);
    }
  }, [address, authToken, city, currentUser, latitude, longitude, navigation, setSession]);

  const parsedLatitude = parseCoordinateInput(latitude);
  const parsedLongitude = parseCoordinateInput(longitude);
  const hasValidCoordinates =
    parsedLatitude != null &&
    parsedLongitude != null &&
    parsedLatitude >= -90 &&
    parsedLatitude <= 90 &&
    parsedLongitude >= -180 &&
    parsedLongitude <= 180;
  const mapCoordinates = hasValidCoordinates
    ? { latitude: parsedLatitude as number, longitude: parsedLongitude as number }
    : FALLBACK_MAP_CENTER;
  const previewLabel = city.trim() || address.trim() || 'Search or tap the map';

  return (
    <View style={styles.root}>
      <SafeAreaView edges={['top']} style={styles.headerSafe}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
            activeOpacity={0.85}
          >
            <MaterialCommunityIcons name="arrow-left" size={22} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Change Location</Text>
          <View style={styles.backBtn} />
        </View>
      </SafeAreaView>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.heroCard}>
            <View style={styles.heroIconWrap}>
              <MaterialCommunityIcons name="map-marker-outline" size={26} color={colors.primary} />
            </View>
            <Text style={styles.heroLabel}>Nearby coupons area</Text>
            <Text style={styles.heroValue} numberOfLines={2}>
              {previewLabel}
            </Text>
            <Text style={styles.heroHint}>
              Pick a place to refresh Home shops and offers around that location.
            </Text>
          </View>

          <TouchableOpacity
            style={[
              styles.locationButton,
              (isSubmitting || isLoadingLocation) && styles.locationButtonDisabled,
            ]}
            onPress={handleUseCurrentLocation}
            disabled={isSubmitting || isLoadingLocation}
            activeOpacity={0.85}
          >
            {isLoadingLocation ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <MaterialCommunityIcons name="crosshairs-gps" size={18} color={colors.primary} />
            )}
            <Text style={styles.locationButtonText}>
              {isLoadingLocation ? 'Fetching location...' : 'Use current location'}
            </Text>
          </TouchableOpacity>

          <View style={styles.mapSection}>
            <Text style={styles.sectionLabel}>Search or move the pin</Text>
            <ProfileLocationMap
              latitude={mapCoordinates.latitude}
              longitude={mapCoordinates.longitude}
              height={280}
              markerTitle={hasValidCoordinates ? 'Your location' : 'Search a location'}
              markerDescription={address.trim() || undefined}
              onLocationChange={handleMapLocationChange}
            />
            <Text style={styles.mapHint}>
              Tap the map to search an area. Nearby coupons will follow this pin.
            </Text>
          </View>
        </ScrollView>

        <SafeAreaView edges={['bottom']} style={styles.footer}>
          <TouchableOpacity
            style={[styles.cta, isSubmitting && styles.ctaOff]}
            activeOpacity={0.9}
            disabled={isSubmitting}
            onPress={handleSave}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <Text style={styles.ctaText}>Update location</Text>
            )}
          </TouchableOpacity>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </View>
  );
};

export default ChangeLocationScreen;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F4F7FC',
  },
  flex: {
    flex: 1,
  },
  headerSafe: {
    backgroundColor: colors.white,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E4EAF3',
  },
  header: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  backBtn: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 17,
    color: colors.text,
    fontFamily: fonts.BOLD,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 24,
  },
  heroCard: {
    backgroundColor: colors.white,
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E7ECF5',
    alignItems: 'center',
    marginBottom: 16,
  },
  heroIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  heroLabel: {
    fontSize: 13,
    color: colors.mutedText,
    fontFamily: fonts.BOLD,
    marginBottom: 4,
  },
  heroValue: {
    fontSize: 18,
    lineHeight: 24,
    color: colors.text,
    fontFamily: fonts.BOLD,
    textAlign: 'center',
  },
  heroHint: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 18,
    color: colors.mutedText,
    textAlign: 'center',
  },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 48,
    borderRadius: 14,
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    marginBottom: 18,
  },
  locationButtonDisabled: {
    opacity: 0.7,
  },
  locationButtonText: {
    fontSize: 14,
    color: colors.primary,
    fontFamily: fonts.BOLD,
  },
  mapSection: {
    marginBottom: 8,
  },
  sectionLabel: {
    fontSize: 13,
    color: colors.mutedText,
    fontFamily: fonts.BOLD,
    marginBottom: 10,
  },
  mapHint: {
    marginTop: 10,
    fontSize: 12,
    lineHeight: 17,
    color: colors.mutedText,
  },
  footer: {
    backgroundColor: colors.white,
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E4EAF3',
  },
  cta: {
    height: 52,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaOff: {
    opacity: 0.7,
  },
  ctaText: {
    color: colors.white,
    fontSize: 16,
    fontFamily: fonts.BOLD,
  },
});
