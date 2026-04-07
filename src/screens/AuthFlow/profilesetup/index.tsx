import React, { useState } from 'react';
import { PermissionsAndroid, Platform } from 'react-native';
import { CommonActions, useNavigation, useRoute } from '@react-navigation/native';
import {
  ImageLibraryOptions,
  CameraOptions,
  launchCamera,
  launchImageLibrary,
} from 'react-native-image-picker';
import ProfileSetupScreenView from './ProfileSetupScreenView';
import { useAppContext } from '../../../context/AppContext';
import { userAuthApi } from '../../../services/userAuthApi';
import { API_BASE_URL } from '../../../config/api';
import { showAppAlert } from '../../../services/appAlert';

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
  const [gender, setGender] = useState<'Male' | 'Female' | 'Other'>('Male');
  const [address, setAddress] = useState(currentUser?.address ?? '');
  const [profileImage, setProfileImage] = useState<ProfileImageFile | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  // @ts-ignore
  const isNewUser = route.params?.isNewUser ?? true;
  // @ts-ignore
  const source = route.params?.source ?? 'auth';
  const profileImageUri = profileImage?.uri
    ?? (currentUser?.profileImage
      ? currentUser.profileImage.startsWith('http')
        ? currentUser.profileImage
        : `${API_BASE_URL.replace(/\/api\/user\/?$/, '')}${currentUser.profileImage}`
      : undefined);

  const imagePickerOptions: ImageLibraryOptions & CameraOptions = {
    mediaType: 'photo',
    selectionLimit: 1,
    includeBase64: false,
    quality: 0.8,
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

      const response = await userAuthApi.updateProfile(authToken, {
        name: name.trim(),
        gender: gender.toLowerCase() as 'male' | 'female' | 'other',
        address: address.trim(),
        profileImage: profileImage ?? undefined,
      });

      console.log('[Auth] Update profile response', response);
      await setSession(authToken, response.user);
      if (source === 'sidebar') {
        navigation.goBack();
        return;
      }

      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: 'MainStack' }],
        }),
      );
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
      phone={currentUser?.phone ?? ''}
      profileImageUri={profileImageUri}
      onAvatarPress={handleAvatarPress}
      onComplete={handleComplete}
      isNewUser={isNewUser}
      isSubmitting={isSubmitting}
    />
  );
};

export default ProfileSetup;
