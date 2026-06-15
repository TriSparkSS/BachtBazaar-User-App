import React, { useRef } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Image,
  Platform,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import AnimatedScreen from '../../../components/AnimatedScreen';
import { AppTextInput } from '../../../components/AppTextInput';
import { ScreenScaffold } from '../../../components/ScreenScaffold';
import LogoSVG from '../../../assets/image/BachatBazaarLogo.svg';
import VectorSVG from '../../../assets/image/Vector.svg';
import { colors, fonts } from '../../../helpers/styles';

interface ProfileSetupScreenViewProps {
  name: string;
  setName: (name: string) => void;
  gender: 'Male' | 'Female' | 'Other';
  setGender: (gender: 'Male' | 'Female' | 'Other') => void;
  address: string;
  setAddress: (address: string) => void;
  phone: string;
  profileImageUri?: string;
  onAvatarPress: () => void;
  onComplete: () => void;
  isNewUser?: boolean;
  isSubmitting?: boolean;
}

const genderOptions: Array<'Male' | 'Female' | 'Other'> = ['Male', 'Female', 'Other'];

const ProfileSetupScreenView: React.FC<ProfileSetupScreenViewProps> = ({
  name,
  setName,
  gender,
  setGender,
  address,
  setAddress,
  phone,
  profileImageUri,
  onAvatarPress,
  onComplete,
  isNewUser = true,
  isSubmitting = false,
}) => {
  const nameInputRef = useRef<TextInput>(null);
  const addressInputRef = useRef<TextInput>(null);
  const avatarUri =
    profileImageUri ||
    'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&dpr=1&w=500';

  return (
    <ScreenScaffold
      backgroundColor={colors.white}
      background={
        <>
          <View style={styles.topGlow} />
          <View style={styles.bottomGlow} />
          <View style={styles.topRightVector}>
            <VectorSVG width={150} height={160} />
          </View>
          <View style={styles.bottomLeftVector}>
            <VectorSVG width={118} height={118} />
          </View>
        </>
      }>
      <AnimatedScreen style={styles.contentWrap}>
            <View style={styles.logoContainer}>
              <LogoSVG width={100} height={100} />
              <View style={styles.titleContainer}>
                <Text style={styles.titleBachat}>Bachat</Text>
                <Text style={styles.titleBazaar}> Bazaar</Text>
              </View>
              <Text style={styles.subtitleSmall}>Discover Local Deals Near You</Text>
            </View>

            <View style={styles.card}>
              <View style={styles.avatarWrapper}>
                <TouchableOpacity style={styles.avatarTouch} onPress={onAvatarPress} activeOpacity={0.85}>
                  <View style={styles.avatarCircle}>
                    <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
                  </View>
                  <View style={styles.editBadge}>
                    <MaterialCommunityIcons name="camera-outline" size={14} color={colors.primary} />
                  </View>
                </TouchableOpacity>
              </View>

              <Text style={styles.userName}>{name.trim() || 'Your name'}</Text>
              <Text style={styles.userPhone}>{phone || '786543567'}</Text>

              <Text style={styles.fieldLabel}>Your Name</Text>
              <AppTextInput
                ref={nameInputRef}
                containerStyle={styles.inputField}
                focusedContainerStyle={styles.inputFieldFocused}
                style={styles.inputText}
                placeholder="Enter your Name"
                placeholderTextColor={colors.lighterGray}
                value={name}
                onChangeText={setName}
                returnKeyType="next"
                onSubmitEditing={() => addressInputRef.current?.focus()}
                editable={!isSubmitting}
                autoCapitalize="words"
                textContentType="name"
              />

              <View style={styles.genderRow}>
                {genderOptions.slice(0, 2).map(option => {
                  const isActive = gender === option;
                  return (
                    <TouchableOpacity
                      key={option}
                      style={[styles.genderButton, isActive && styles.activeGenderButton]}
                      onPress={() => setGender(option)}
                    >
                      <Text style={[styles.genderButtonText, isActive && styles.activeGenderText]}>
                        {option}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={styles.fieldLabel}>Your Address (optional)</Text>
              <AppTextInput
                ref={addressInputRef}
                containerStyle={[styles.inputField, styles.addressInput]}
                focusedContainerStyle={styles.inputFieldFocused}
                style={styles.inputText}
                placeholder="Enter your Address"
                placeholderTextColor={colors.lighterGray}
                value={address}
                onChangeText={setAddress}
                multiline
                editable={!isSubmitting}
                textAlignVertical="top"
                autoCapitalize="sentences"
              />

              <TouchableOpacity
                style={[styles.actionButton, isSubmitting && styles.actionButtonDisabled]}
                disabled={isSubmitting}
                onPress={onComplete}
              >
                <Text style={styles.actionButtonText}>
                  {isSubmitting
                    ? 'Saving...'
                    : isNewUser
                      ? 'Complete Profile'
                      : 'Update Profile'}
                </Text>
              </TouchableOpacity>
            </View>
          </AnimatedScreen>
    </ScreenScaffold>
  );
};

export default ProfileSetupScreenView;

const styles = StyleSheet.create({
  topGlow: {
    position: 'absolute',
    top: 116,
    left: 18,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(222, 210, 255, 0.22)',
  },
  bottomGlow: {
    position: 'absolute',
    bottom: 50,
    right: 10,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(255, 214, 186, 0.22)',
  },
  flex: {
    flex: 1,
  },
  contentWrap: {
    width: '100%',
    alignItems: 'center',
  },
  topRightVector: {
    position: 'absolute',
    top: 36,
    right: 0,
    opacity: 0.55,
  },
  bottomLeftVector: {
    position: 'absolute',
    bottom: 38,
    left: -6,
    opacity: 0.35,
    transform: [{ rotate: '180deg' }],
  },
  logoContainer: {
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 14,
  },
  titleContainer: {
    flexDirection: 'row',
    marginTop: 3,
  },
  titleBachat: {
    fontSize: 22,
    fontFamily: fonts.BOLD,
    color: colors.primary,
  },
  titleBazaar: {
    fontSize: 22,
    fontFamily: fonts.BOLD,
    color: colors.primary,
  },
  subtitleSmall: {
    fontSize: 13,
    color: colors.text,
    marginTop: 2,
    fontFamily: fonts.BOLD,
  },
  card: {
    width: '100%',
    maxWidth: 392,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 30,
    paddingHorizontal: 22,
    paddingTop: 22,
    paddingBottom: 28,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 6,
  },
  avatarWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  avatarTouch: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarCircle: {
    width: 102,
    height: 102,
    borderRadius: 51,
    backgroundColor: '#E8ECF5',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  editBadge: {
    position: 'absolute',
    right: '30%',
    bottom: 6,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.primaryBorder,
  },
  userName: {
    textAlign: 'center',
    fontSize: 20,
    fontFamily: fonts.BOLD,
    color: colors.text,
    marginTop: 4,
  },
  userPhone: {
    textAlign: 'center',
    fontSize: 12,
    fontFamily: fonts.BOLD,
    color: colors.lighterGray,
    marginTop: 2,
    marginBottom: 18,
  },
  fieldLabel: {
    fontSize: 14,
    fontFamily: fonts.BOLD,
    color: colors.text,
    marginBottom: 8,
    marginLeft: 2,
  },
  inputField: {
    width: '100%',
    minHeight: 50,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    backgroundColor: colors.white,
    paddingHorizontal: 14,
    marginBottom: 14,
  },
  inputFieldFocused: {
    borderColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 7,
    elevation: 2,
  },
  inputText: {
    color: colors.text,
    fontSize: 14,
    fontFamily: fonts.BOLD,
    minHeight: 0,
    paddingVertical: Platform.OS === 'android' ? 10 : 0,
  },
  addressInput: {
    minHeight: 78,
    alignItems: 'flex-start',
  },
  genderRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  genderButton: {
    flex: 1,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#D9D9D9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeGenderButton: {
    backgroundColor: '#366FE0',
  },
  genderButtonText: {
    fontSize: 11,
    fontFamily: fonts.BOLD,
    color: colors.text,
  },
  activeGenderText: {
    color: colors.white,
  },
  actionButton: {
    width: '100%',
    height: 50,
    borderRadius: 14,
    backgroundColor: '#366FE0',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
    shadowColor: '#366FE0',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.14,
    shadowRadius: 8,
    elevation: 5,
  },
  actionButtonDisabled: {
    opacity: 0.75,
  },
  actionButtonText: {
    fontSize: 15,
    fontFamily: fonts.BOLD,
    color: colors.white,
  },
});
