import React, { useRef } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Image,
  Platform,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import AnimatedScreen from '../../../components/AnimatedScreen';
import { AppTextInput } from '../../../components/AppTextInput';
import { ScreenScaffold } from '../../../components/ScreenScaffold';
import LogoSVG from '../../../assets/image/BachatBazaarLogo.svg';
import VectorSVG from '../../../assets/image/Vector.svg';
import { colors, fonts } from '../../../helpers/styles';

import { GenderUi } from '../../../utils/profile';

const { width, height } = Dimensions.get('window');

interface ProfileSetupScreenViewProps {
  name: string;
  setName: (name: string) => void;
  gender: GenderUi;
  setGender: (gender: GenderUi) => void;
  address: string;
  setAddress: (address: string) => void;
  profileImageUri?: string;
  onAvatarPress: () => void;
  onBack: () => void;
  onComplete: () => void | Promise<void>;
  isNewUser?: boolean;
  isSubmitting?: boolean;
  isLoadingProfile?: boolean;
}

const genderOptions: GenderUi[] = ['Male', 'Female', 'Other'];

const genderIcons: Record<'Male' | 'Female' | 'Other', string> = {
  Male: 'gender-male',
  Female: 'gender-female',
  Other: 'gender-male-female',
};

const ProfileSetupScreenView: React.FC<ProfileSetupScreenViewProps> = ({
  name,
  setName,
  gender,
  setGender,
  address,
  setAddress,
  profileImageUri,
  onAvatarPress,
  onBack,
  onComplete,
  isNewUser = true,
  isSubmitting = false,
  isLoadingProfile = false,
}) => {
  const nameInputRef = useRef<TextInput>(null);
  const addressInputRef = useRef<TextInput>(null);

  return (
    <ScreenScaffold
      onBack={onBack}
      background={
        <>
          <View style={styles.heroWash} />
          <View style={styles.topGlow} />
          <View style={styles.bottomGlow} />
          <View style={styles.topRightVector}>
            <VectorSVG width={120} height={120} />
          </View>
        </>
      }>
      <AnimatedScreen style={styles.contentWrap}>
        <View style={styles.headerBlock}>
          <View style={styles.logoHalo}>
            <LogoSVG width={64} height={64} />
          </View>
          <Text style={styles.title}>
            {isNewUser ? 'Complete your profile' : 'Update your profile'}
          </Text>
          <Text style={styles.subtitle}>
            Add your details so shops and offers feel more personal.
          </Text>
        </View>

        <View style={styles.card}>
          <TouchableOpacity
            style={styles.avatarSection}
            onPress={onAvatarPress}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Change profile photo">
            <View style={styles.avatarRing}>
              <View style={styles.avatarCircle}>
                {isLoadingProfile ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : profileImageUri ? (
                  <Image source={{ uri: profileImageUri }} style={styles.avatarImage} />
                ) : (
                  <MaterialCommunityIcons
                    name="account-outline"
                    size={48}
                    color="#99A4B8"
                  />
                )}
              </View>
              <View style={styles.cameraBadge}>
                <MaterialCommunityIcons name="camera" size={16} color={colors.white} />
              </View>
            </View>
            <Text style={styles.avatarHint}>Tap to add photo</Text>
          </TouchableOpacity>

          <Text style={styles.fieldLabel}>Full name</Text>
          <AppTextInput
            ref={nameInputRef}
            containerStyle={styles.inputField}
            focusedContainerStyle={styles.inputFieldFocused}
            style={styles.inputText}
            placeholder="Enter your name"
            placeholderTextColor="#99A4B8"
            value={name}
            onChangeText={setName}
            returnKeyType="next"
            onSubmitEditing={() => addressInputRef.current?.focus()}
            editable={!isSubmitting}
            autoCapitalize="words"
            textContentType="name"
            leftAdornment={
              <View style={styles.inputIcon} pointerEvents="none">
                <MaterialCommunityIcons name="account-outline" size={20} color="#99A4B8" />
              </View>
            }
          />

          <Text style={styles.fieldLabel}>Gender</Text>
          <View style={styles.genderRow}>
            {genderOptions.map(option => {
              const isActive = gender === option;
              return (
                <TouchableOpacity
                  key={option}
                  style={[styles.genderPill, isActive && styles.genderPillActive]}
                  onPress={() => setGender(option)}
                  activeOpacity={0.78}>
                  <MaterialCommunityIcons
                    name={genderIcons[option] as 'gender-male'}
                    size={16}
                    color={isActive ? colors.white : '#69778D'}
                  />
                  <Text style={[styles.genderText, isActive && styles.genderTextActive]}>
                    {option}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={styles.fieldLabel}>Address (optional)</Text>
          <AppTextInput
            ref={addressInputRef}
            containerStyle={[styles.inputField, styles.addressInput]}
            focusedContainerStyle={styles.inputFieldFocused}
            style={styles.inputText}
            placeholder="Street, area, city"
            placeholderTextColor="#99A4B8"
            value={address}
            onChangeText={setAddress}
            multiline
            editable={!isSubmitting}
            textAlignVertical="top"
            autoCapitalize="sentences"
            leftAdornment={
              <View style={[styles.inputIcon, styles.addressIcon]} pointerEvents="none">
                <MaterialCommunityIcons
                  name="map-marker-outline"
                  size={20}
                  color="#99A4B8"
                />
              </View>
            }
          />

          <TouchableOpacity
            style={[styles.actionButton, isSubmitting && styles.actionButtonDisabled]}
            disabled={isSubmitting}
            onPress={onComplete}
            activeOpacity={0.86}>
            {isSubmitting ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <>
                <Text style={styles.actionButtonText}>
                  {isNewUser ? 'Complete Profile' : 'Save Changes'}
                </Text>
                <MaterialCommunityIcons name="check" size={20} color={colors.white} />
              </>
            )}
          </TouchableOpacity>
        </View>
      </AnimatedScreen>
    </ScreenScaffold>
  );
};

export default ProfileSetupScreenView;

const styles = StyleSheet.create({
  heroWash: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: Math.max(315, height * 0.35),
    backgroundColor: '#EAF2FF',
    borderBottomLeftRadius: 54,
    borderBottomRightRadius: 54,
  },
  topGlow: {
    position: 'absolute',
    width: 230,
    height: 230,
    borderRadius: 115,
    backgroundColor: '#D9E7FF',
    top: -112,
    left: -88,
    opacity: 0.78,
  },
  bottomGlow: {
    position: 'absolute',
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: '#E8F8F0',
    bottom: -145,
    right: -110,
    opacity: 0.8,
  },
  topRightVector: {
    position: 'absolute',
    top: -4,
    right: -6,
    width: 120,
    height: 120,
    opacity: 0.7,
  },
  contentWrap: {
    width: '100%',
    alignItems: 'center',
  },
  headerBlock: {
    alignItems: 'center',
    marginBottom: 18,
    maxWidth: 390,
    paddingHorizontal: 12,
  },
  logoHalo: {
    width: 80,
    height: 80,
    borderRadius: 26,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.95)',
    shadowColor: '#2457B8',
    shadowOffset: { width: 0, height: 9 },
    shadowOpacity: 0.14,
    shadowRadius: 18,
    elevation: 6,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.86)',
    borderRadius: 100,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.95)',
    paddingHorizontal: 13,
    paddingVertical: 7,
    marginBottom: 10,
    shadowColor: '#285CB8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 2,
  },
  badgeDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.darkgreen,
    marginRight: 8,
  },
  badgeText: {
    fontSize: 10,
    letterSpacing: 0.9,
    color: colors.primaryDark,
    fontFamily: fonts.BOLD,
  },
  title: {
    fontSize: 25,
    color: colors.text,
    fontFamily: fonts.BOLD,
    letterSpacing: -0.4,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    color: '#5F6D84',
    textAlign: 'center',
    marginTop: 6,
    maxWidth: 320,
    fontFamily: fonts.BOLD,
  },
  card: {
    width: Math.min(width - 32, 430),
    backgroundColor: colors.white,
    borderRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 22,
    shadowColor: '#173E7A',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.14,
    shadowRadius: 24,
    elevation: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#DCE6F7',
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarRing: {
    padding: 4,
    borderRadius: 60,
    borderWidth: 2,
    borderColor: colors.primaryBorder,
    backgroundColor: colors.primarySoft,
    position: 'relative',
  },
  avatarCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#F8FAFE',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  cameraBadge: {
    position: 'absolute',
    right: 2,
    bottom: 2,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.white,
  },
  avatarHint: {
    marginTop: 8,
    fontSize: 12,
    color: colors.primary,
    fontFamily: fonts.BOLD,
  },
  fieldLabel: {
    fontSize: 13,
    fontFamily: fonts.BOLD,
    color: '#33415A',
    marginBottom: 8,
    marginLeft: 2,
  },
  inputField: {
    width: '100%',
    minHeight: 54,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#DCE3EE',
    backgroundColor: '#F8FAFE',
    paddingHorizontal: 12,
    marginBottom: 14,
  },
  inputFieldFocused: {
    borderColor: colors.primary,
    backgroundColor: colors.white,
  },
  inputIcon: {
    marginRight: 8,
  },
  addressIcon: {
    alignSelf: 'flex-start',
    marginTop: Platform.OS === 'android' ? 12 : 10,
  },
  inputText: {
    color: '#182238',
    fontSize: 15,
    minHeight: 0,
    paddingVertical: Platform.OS === 'android' ? 8 : 0,
  },
  addressInput: {
    minHeight: 88,
    alignItems: 'flex-start',
  },
  genderRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  genderPill: {
    flex: 1,
    minHeight: 44,
    borderRadius: 14,
    backgroundColor: '#EEF3FC',
    borderWidth: 1,
    borderColor: '#DCE3EE',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 6,
  },
  genderPillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
    shadowColor: colors.primaryDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 3,
  },
  genderText: {
    fontSize: 12,
    fontFamily: fonts.BOLD,
    color: '#69778D',
  },
  genderTextActive: {
    color: colors.white,
  },
  actionButton: {
    width: '100%',
    height: 54,
    borderRadius: 15,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 4,
    shadowColor: colors.primaryDark,
    shadowOffset: { width: 0, height: 7 },
    shadowOpacity: 0.22,
    shadowRadius: 12,
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
