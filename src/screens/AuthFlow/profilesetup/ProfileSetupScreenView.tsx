import React from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Image,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import AnimatedScreen from '../../../components/AnimatedScreen';
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
  const avatarUri =
    profileImageUri ||
    'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&dpr=1&w=500';

  return (
    <View style={styles.container}>
      <View style={styles.topGlow} />
      <View style={styles.bottomGlow} />
      <View style={styles.topRightVector}>
        <VectorSVG width={150} height={160} />
      </View>
      <View style={styles.bottomLeftVector}>
        <VectorSVG width={118} height={118} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
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
              <TextInput
                style={styles.inputField}
                placeholder="Enter your Name"
                placeholderTextColor={colors.lighterGray}
                value={name}
                onChangeText={setName}
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
              <TextInput
                style={[styles.inputField, styles.addressInput]}
                placeholder="Enter your Address"
                placeholderTextColor={colors.lighterGray}
                value={address}
                onChangeText={setAddress}
                multiline
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
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

export default ProfileSetupScreenView;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
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
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingBottom: 40,
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
    marginTop: 42,
    marginBottom: 18,
  },
  titleContainer: {
    flexDirection: 'row',
    marginTop: 5,
  },
  titleBachat: {
    fontSize: 26,
    fontFamily: fonts.BOLD,
    color: colors.primary,
  },
  titleBazaar: {
    fontSize: 26,
    fontFamily: fonts.BOLD,
    color: colors.primary,
  },
  subtitleSmall: {
    fontSize: 16,
    color: colors.text,
    marginTop: 2,
    fontFamily: fonts.BOLD,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 38,
    paddingHorizontal: 26,
    paddingTop: 28,
    paddingBottom: 34,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 8,
  },
  avatarWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  avatarTouch: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarCircle: {
    width: 118,
    height: 118,
    borderRadius: 59,
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
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.primaryBorder,
  },
  userName: {
    textAlign: 'center',
    fontSize: 24,
    fontFamily: fonts.BOLD,
    color: colors.text,
    marginTop: 6,
  },
  userPhone: {
    textAlign: 'center',
    fontSize: 14,
    fontFamily: fonts.BOLD,
    color: colors.lighterGray,
    marginTop: 2,
    marginBottom: 22,
  },
  fieldLabel: {
    fontSize: 16,
    fontFamily: fonts.BOLD,
    color: colors.text,
    marginBottom: 10,
    marginLeft: 2,
  },
  inputField: {
    width: '100%',
    minHeight: 56,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    backgroundColor: colors.white,
    paddingHorizontal: 16,
    color: colors.text,
    fontFamily: fonts.BOLD,
    marginBottom: 18,
  },
  addressInput: {
    minHeight: 88,
    paddingTop: 16,
    textAlignVertical: 'top',
  },
  genderRow: {
    flexDirection: 'row',
    gap: 14,
    marginBottom: 18,
  },
  genderButton: {
    flex: 1,
    height: 46,
    borderRadius: 14,
    backgroundColor: '#D9D9D9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeGenderButton: {
    backgroundColor: '#366FE0',
  },
  genderButtonText: {
    fontSize: 12,
    fontFamily: fonts.BOLD,
    color: colors.text,
  },
  activeGenderText: {
    color: colors.white,
  },
  actionButton: {
    width: '100%',
    height: 56,
    borderRadius: 16,
    backgroundColor: '#366FE0',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    shadowColor: '#366FE0',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 6,
  },
  actionButtonDisabled: {
    opacity: 0.75,
  },
  actionButtonText: {
    fontSize: 16,
    fontFamily: fonts.BOLD,
    color: colors.white,
  },
});
