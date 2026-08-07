import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import ProfileLocationMap from '../../../components/ProfileLocationMap';
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
import { parsePoiClickEvent, type PoiClickEvent } from '../../../utils/mapPoi';

const AddAddress = () => {
  const navigation = useNavigation<StackNavigationProp<MainStackParamList, 'AddAddress'>>();
  const route = useRoute();
  const params = (route.params as MainStackParamList['AddAddress']) ?? {};
  const { authToken, currentUser, setSession } = useAppContext();

  const [address, setAddress] = useState(
    params.initialAddress?.trim() || currentUser?.address?.trim() || '',
  );
  const [city, setCity] = useState(params.initialCity?.trim() || currentUser?.city?.trim() || '');
  const [latitude, setLatitude] = useState(
    params.initialLatitude != null
      ? formatCoordinate(params.initialLatitude)
      : currentUser?.latitude != null
        ? formatCoordinate(currentUser.latitude)
        : '',
  );
  const [longitude, setLongitude] = useState(
    params.initialLongitude != null
      ? formatCoordinate(params.initialLongitude)
      : currentUser?.longitude != null
        ? formatCoordinate(currentUser.longitude)
        : '',
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

    loadCurrentLocation();
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
          'Location permission is required to pin your current location.',
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

  const handleMapPoiClick = useCallback(
    async (event: PoiClickEvent) => {
      const poi = parsePoiClickEvent(event);
      await applyCoordinates({
        latitude: poi.latitude,
        longitude: poi.longitude,
      });
      showAppAlert(
        poi.name || 'Location updated',
        'Selected place has been set as your delivery address.',
        [{ text: 'OK' }],
      );
    },
    [applyCoordinates],
  );

  const returnSelectedAddress = useCallback(
    (selectedAddress: string, selectedCity: string) => {
      const state = navigation.getState();
      const requestDeliveryRoute = [...(state?.routes ?? [])]
        .reverse()
        .find(route => route.name === 'RequestDelivery');
      const previousParams =
        (requestDeliveryRoute?.params as MainStackParamList['RequestDelivery'] | undefined) ??
        undefined;

      // Merge into the existing RequestDelivery route so product/shop are never dropped.
      // Always pass selectedCity so Request Delivery can send street + city to the API.
      navigation.navigate({
        name: 'RequestDelivery',
        params: {
          ...(previousParams ?? {}),
          selectedAddress,
          selectedCity,
        },
        merge: true,
      });
    },
    [navigation],
  );

  const handleSave = useCallback(async () => {
    const nextAddress = address.trim();
    if (!nextAddress) {
      showAppAlert('Address required', 'Please enter a delivery address to continue.');
      return;
    }

    const nextCity = city.trim();
    if (!nextCity) {
      showAppAlert('City required', 'Please enter a city to continue.');
      return;
    }

    const parsedLatitude = parseCoordinateInput(latitude);
    const parsedLongitude = parseCoordinateInput(longitude);

    if (!authToken?.trim() || !currentUser?._id) {
      returnSelectedAddress(nextAddress, nextCity);
      return;
    }

    try {
      setIsSubmitting(true);
      const response = await userAuthApi.updateProfile(authToken, currentUser, {
        address: nextAddress,
        city: nextCity,
        latitude: parsedLatitude,
        longitude: parsedLongitude,
      });
      const enrichedUser = await userAuthApi.refreshUserProfile(authToken, response.user);
      await setSession(authToken, enrichedUser);
      returnSelectedAddress(
        enrichedUser.address?.trim() || nextAddress,
        enrichedUser.city?.trim() || nextCity,
      );
    } catch (error) {
      showAppAlert(
        'Save failed',
        error instanceof Error ? error.message : 'Could not save your address.',
      );
    } finally {
      setIsSubmitting(false);
    }
  }, [
    address,
    authToken,
    city,
    currentUser,
    latitude,
    longitude,
    returnSelectedAddress,
    setSession,
  ]);

  const parsedLatitude = parseCoordinateInput(latitude);
  const parsedLongitude = parseCoordinateInput(longitude);
  const showMap =
    parsedLatitude != null &&
    parsedLongitude != null &&
    parsedLatitude >= -90 &&
    parsedLatitude <= 90 &&
    parsedLongitude >= -180 &&
    parsedLongitude <= 180;

  return (
    <View style={styles.root}>
      <SafeAreaView edges={['top']} style={styles.headerSafe}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
            activeOpacity={0.85}>
            <MaterialCommunityIcons name="arrow-left" size={22} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Add Address</Text>
          <View style={styles.backBtn} />
        </View>
      </SafeAreaView>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <Text style={styles.sectionLabel}>Delivery Address</Text>
          <TextInput
            style={styles.addressInput}
            value={address}
            onChangeText={setAddress}
            placeholder="Street, area, landmark"
            placeholderTextColor="#B0B7C3"
            multiline
            textAlignVertical="top"
            editable={!isSubmitting}
            underlineColorAndroid="transparent"
          />

          <Text style={styles.sectionLabel}>City</Text>
          <TextInput
            style={styles.input}
            value={city}
            onChangeText={setCity}
            placeholder="Enter city"
            placeholderTextColor="#B0B7C3"
            editable={!isSubmitting}
            autoCapitalize="words"
            underlineColorAndroid="transparent"
          />

          <TouchableOpacity
            style={[
              styles.locationButton,
              (isSubmitting || isLoadingLocation) && styles.locationButtonDisabled,
            ]}
            onPress={handleUseCurrentLocation}
            disabled={isSubmitting || isLoadingLocation}
            activeOpacity={0.85}>
            {isLoadingLocation ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <MaterialCommunityIcons name="map-marker-radius" size={18} color={colors.primary} />
            )}
            <Text style={styles.locationButtonText}>
              {isLoadingLocation ? 'Fetching location...' : 'Use current location'}
            </Text>
          </TouchableOpacity>

          {showMap ? (
            <View style={styles.mapSection}>
              <Text style={styles.sectionLabel}>Location on map</Text>
              <ProfileLocationMap
                latitude={parsedLatitude as number}
                longitude={parsedLongitude as number}
                height={180}
                onPoiClick={handleMapPoiClick}
              />
              <Text style={styles.mapHint}>Tap a place on the map to set your address</Text>
            </View>
          ) : null}
        </ScrollView>

        <SafeAreaView edges={['bottom']} style={styles.footer}>
          <TouchableOpacity
            style={[styles.cta, isSubmitting && styles.ctaOff]}
            activeOpacity={0.9}
            disabled={isSubmitting}
            onPress={handleSave}>
            {isSubmitting ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <Text style={styles.ctaText}>Save Address</Text>
            )}
          </TouchableOpacity>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </View>
  );
};

export default AddAddress;

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
  sectionLabel: {
    fontSize: 13,
    color: colors.mutedText,
    fontFamily: fonts.BOLD,
    marginBottom: 10,
    marginTop: 6,
  },
  addressInput: {
    minHeight: 96,
    backgroundColor: colors.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E8EDF5',
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: colors.text,
    fontFamily: fonts.BOLD,
    marginBottom: 16,
  },
  input: {
    height: 52,
    backgroundColor: colors.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E8EDF5',
    paddingHorizontal: 14,
    fontSize: 15,
    color: colors.text,
    fontFamily: fonts.BOLD,
    marginBottom: 16,
  },
  locationButton: {
    minHeight: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    backgroundColor: colors.primarySoft,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 16,
    paddingHorizontal: 12,
  },
  locationButtonDisabled: {
    opacity: 0.7,
  },
  locationButtonText: {
    fontSize: 13,
    fontFamily: fonts.BOLD,
    color: colors.primary,
  },
  mapSection: {
    marginBottom: 8,
  },
  mapHint: {
    marginTop: 8,
    fontSize: 12,
    color: colors.mutedText,
    fontFamily: fonts.BOLD,
  },
  footer: {
    backgroundColor: colors.white,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E4EAF3',
    paddingHorizontal: 20,
    paddingTop: 12,
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
