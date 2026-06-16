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

      const response = await userAuthApi.updateProfile(authToken, currentUser, {
        name: name.trim(),
        gender: mapGenderToApi(gender),
        address: address.trim(),
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

  return (
    <ProfileSetupScreenView
      name={name}
      setName={setName}
      gender={gender}
      setGender={setGender}
      address={address}
      setAddress={setAddress}
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
