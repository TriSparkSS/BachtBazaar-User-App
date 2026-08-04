import React, { useEffect, useState } from 'react';
import { PermissionsAndroid, Platform } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import {
  ImageLibraryOptions,
  CameraOptions,
  launchCamera,
  launchImageLibrary,
} from 'react-native-image-picker';
import ProfileSetupScreenView from './ProfileSetupScreenView';
import { useAppContext } from '../../../context/AppContext';
import { userAuthApi } from '../../../services/userAuthApi';
import { resolveProfileImageUrl } from '../../../config/api';
import { showAppAlert } from '../../../services/appAlert';
import { GenderUi, mapGenderToApi, mapGenderToUi } from '../../../utils/profile';
import type { PoiClickEvent } from '../../../utils/mapPoi';
import {
  formatCoordinate,
  parseCoordinateInput,
  reverseGeocodeWithGoogle,
} from '../../../utils/googleGeocoding';
import { parsePoiClickEvent } from '../../../utils/mapPoi';
import {
  getCurrentDeviceCoordinates,
  requestLocationPermission,
} from '../../../utils/deviceLocation';

type ProfileImageFile = {
  uri: string;
  name: string;
  type: string;
};

const ProfileSetup = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { authToken, currentUser, setSession } = useAppContext();
  const [name, setName] = useState(currentUser?.name ?? '');
  const [gender, setGender] = useState<GenderUi>(() => mapGenderToUi(currentUser?.gender));
  const [address, setAddress] = useState(currentUser?.address ?? '');
  const [city, setCity] = useState(currentUser?.city ?? '');
  const [latitude, setLatitude] = useState(
    currentUser?.latitude != null ? formatCoordinate(currentUser.latitude) : '',
  );
  const [longitude, setLongitude] = useState(
    currentUser?.longitude != null ? formatCoordinate(currentUser.longitude) : '',
  );
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [profileImage, setProfileImage] = useState<ProfileImageFile | null>(null);
  const [fetchedProfileImage, setFetchedProfileImage] = useState<string | undefined>(
    currentUser?.profileImage,
  );
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  // @ts-ignore
  const isNewUser = route.params?.isNewUser ?? true;
  // @ts-ignore
  const source = route.params?.source ?? 'auth';

  const profileImageUri =
    profileImage?.uri ??
    resolveProfileImageUrl(fetchedProfileImage ?? currentUser?.profileImage);

  useEffect(() => {
    if (!authToken || !currentUser) {
      return;
    }

    let cancelled = false;

    const refreshProfile = async () => {
      try {
        setIsLoadingProfile(true);
        const nextUser = await userAuthApi.refreshUserProfile(authToken, currentUser);

        if (cancelled) {
          return;
        }

        await setSession(authToken, nextUser);
        setName(nextUser.name ?? '');
        setAddress(nextUser.address ?? '');
        setCity(nextUser.city ?? '');
        setLatitude(nextUser.latitude != null ? formatCoordinate(nextUser.latitude) : '');
        setLongitude(nextUser.longitude != null ? formatCoordinate(nextUser.longitude) : '');
        setGender(mapGenderToUi(nextUser.gender));
        setFetchedProfileImage(nextUser.profileImage);
      } catch {
        // Ignore fetch errors; local session data remains usable.
      } finally {
        if (!cancelled) {
          setIsLoadingProfile(false);
        }
      }
    };

    refreshProfile();

    return () => {
      cancelled = true;
    };
  }, [authToken, currentUser?._id]);

  const applyCoordinates = async (coords: { latitude: number; longitude: number }) => {
    setLatitude(formatCoordinate(coords.latitude));
    setLongitude(formatCoordinate(coords.longitude));

    const geocoded = await reverseGeocodeWithGoogle(coords.latitude, coords.longitude);
    if (geocoded.address) {
      setAddress(geocoded.address);
    }
    if (geocoded.city) {
      setCity(geocoded.city);
    }
  };

  useEffect(() => {
    if (
      latitude.trim() ||
      longitude.trim() ||
      currentUser?.latitude != null ||
      currentUser?.longitude != null
    ) {
      return;
    }

    let cancelled = false;

    const loadSavedOrCurrentLocation = async () => {
      try {
        setIsLoadingLocation(true);
        const permitted = await requestLocationPermission();
        if (!permitted) {
          return;
        }

        const coordinates = await getCurrentDeviceCoordinates();
        if (!coordinates || cancelled) {
          return;
        }

        await applyCoordinates(coordinates);
      } catch {
        // Ignore auto-location errors; user can tap the button manually.
      } finally {
        if (!cancelled) {
          setIsLoadingLocation(false);
        }
      }
    };

    loadSavedOrCurrentLocation();

    return () => {
      cancelled = true;
    };
  }, [currentUser?.latitude, currentUser?.longitude, latitude, longitude]);

  const handleUseCurrentLocation = async () => {
    try {
      setIsLoadingLocation(true);
      const permitted = await requestLocationPermission();
      if (!permitted) {
        showAppAlert('Permission needed', 'Location permission is required to pin your current location.');
        return;
      }

      const coordinates = await getCurrentDeviceCoordinates();
      if (!coordinates) {
        showAppAlert('Location unavailable', 'Could not detect your current location. Please try again.');
        return;
      }

      await applyCoordinates(coordinates);
    } catch {
      showAppAlert('Location failed', 'Could not update your location. Please try again.');
    } finally {
      setIsLoadingLocation(false);
    }
  };

  const imagePickerOptions: ImageLibraryOptions & CameraOptions = {
    mediaType: 'photo',
    selectionLimit: 1,
    includeBase64: false,
    quality: 0.8,
  };

  const navigateToMain = () => {
    const root = navigation.getParent();
    if (root) {
      // @ts-ignore
      root.navigate('MainStack');
      return;
    }
    navigation.goBack();
  };

  const handleBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }

    if (source === 'sidebar') {
      navigateToMain();
      return;
    }

    // @ts-ignore
    navigation.navigate('Successfull', { isNewUser });
  };

  const requestCameraPermission = async () => {
    if (Platform.OS !== 'android') {
      return true;
    }

    const result = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.CAMERA);
    return result === PermissionsAndroid.RESULTS.GRANTED;
  };

  const handleImageResponse = (asset?: {
    uri?: string;
    fileName?: string;
    type?: string;
  }) => {
    if (!asset?.uri) {
      return;
    }

    setProfileImage({
      uri: asset.uri,
      name: asset.fileName ?? `profile-${Date.now()}.jpg`,
      type: asset.type ?? 'image/jpeg',
    });
  };

  const handleAvatarPress = () => {
    showAppAlert('Profile Photo', 'Choose image source', [
      {
        text: 'Camera',
        onPress: async () => {
          const granted = await requestCameraPermission();

          if (!granted) {
            showAppAlert('Permission needed', 'Camera permission is required to take a photo.');
            return;
          }

          const response = await launchCamera(imagePickerOptions);
          if (response.didCancel) {
            return;
          }

          if (response.errorCode) {
            showAppAlert('Camera failed', response.errorMessage || 'Unable to open camera.');
            return;
          }

          handleImageResponse(response.assets?.[0]);
        },
      },
      {
        text: 'Gallery',
        onPress: async () => {
          const response = await launchImageLibrary(imagePickerOptions);
          if (response.didCancel) {
            return;
          }

          if (response.errorCode) {
            showAppAlert('Gallery failed', response.errorMessage || 'Unable to open gallery.');
            return;
          }

          handleImageResponse(response.assets?.[0]);
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const handleComplete = async () => {
    if (!authToken || !currentUser?._id) {
      showAppAlert('Session expired', 'Please log in again.');
      return;
    }

    if (name.trim().length < 2) {
      showAppAlert('Invalid name', 'Please enter your full name.');
      return;
    }

    try {
      setIsSubmitting(true);

      const parsedLatitude = parseCoordinateInput(latitude);
      const parsedLongitude = parseCoordinateInput(longitude);

      const response = await userAuthApi.updateProfile(authToken, currentUser, {
        name: name.trim(),
        gender: mapGenderToApi(gender),
        address: address.trim(),
        city: city.trim(),
        latitude: parsedLatitude,
        longitude: parsedLongitude,
        profileImage: profileImage ?? undefined,
      });

      const enrichedUser = await userAuthApi.refreshUserProfile(authToken, response.user);
      await setSession(authToken, enrichedUser);
      setFetchedProfileImage(enrichedUser.profileImage);
      setProfileImage(null);

      if (source === 'sidebar') {
        navigateToMain();
        return;
      }

      navigateToMain();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to update profile.';
      showAppAlert('Profile update failed', message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMapPoiClick = async (event: PoiClickEvent) => {
    const poi = parsePoiClickEvent(event);
    await applyCoordinates({
      latitude: poi.latitude,
      longitude: poi.longitude,
    });
    showAppAlert(
      poi.name || 'Location updated',
      'Selected place has been set as your location.',
      [{ text: 'OK' }],
    );
  };

  return (
    <ProfileSetupScreenView
      name={name}
      setName={setName}
      gender={gender}
      setGender={setGender}
      address={address}
      setAddress={setAddress}
      city={city}
      setCity={setCity}
      latitude={latitude}
      setLatitude={setLatitude}
      longitude={longitude}
      setLongitude={setLongitude}
      onUseCurrentLocation={handleUseCurrentLocation}
      onMapPoiClick={handleMapPoiClick}
      isLoadingLocation={isLoadingLocation}
      profileImageUri={profileImageUri}
      onAvatarPress={handleAvatarPress}
      onBack={handleBack}
      onComplete={handleComplete}
      isNewUser={isNewUser}
      isSubmitting={isSubmitting}
      isLoadingProfile={isLoadingProfile}
    />
  );
};

export default ProfileSetup;
