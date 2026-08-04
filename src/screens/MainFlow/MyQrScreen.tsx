import React, { useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import QRCode from 'react-native-qrcode-svg';
import { useAppContext } from '../../context/AppContext';
import { encodeUserQrValue } from '../../helpers/offerQrCode';
import { colors, fonts } from '../../helpers/styles';
import { MainStackParamList } from '../../navigation/types';

const MyQrScreen = () => {
  const navigation = useNavigation<StackNavigationProp<MainStackParamList, 'MyQrScreen'>>();
  const { currentUser } = useAppContext();

  const qrValue = useMemo(
    () =>
      encodeUserQrValue({
        userId: currentUser?._id,
        id: currentUser?._id,
        name: currentUser?.name,
        phone: currentUser?.phone,
        city: currentUser?.city,
      }),
    [currentUser],
  );

  return (
    <View style={styles.root}>
      <SafeAreaView edges={['top']} style={styles.headerSafe}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.headerButton} onPress={() => navigation.goBack()}>
            <MaterialCommunityIcons name="arrow-left" size={22} color={colors.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>My QR Code</Text>
          <View style={styles.headerButton} />
        </View>
      </SafeAreaView>

      <View style={styles.body}>
        <View style={styles.card}>
          <Text style={styles.name}>{currentUser?.name?.trim() || 'Bachat User'}</Text>
          <Text style={styles.phone}>{currentUser?.phone || 'Profile QR'}</Text>

          <View style={styles.qrWrap}>
            <QRCode value={qrValue} size={200} backgroundColor={colors.white} color="#111827" />
          </View>

          <Text style={styles.hint}>
            Show this QR at partner shops so merchants can scan your profile for offers and
            redemptions.
          </Text>
        </View>
      </View>
    </View>
  );
};

export default MyQrScreen;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.primary,
  },
  headerSafe: {
    backgroundColor: colors.primary,
  },
  header: {
    height: 54,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  headerButton: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    color: colors.white,
    fontSize: 17,
    fontFamily: fonts.BOLD,
  },
  body: {
    flex: 1,
    backgroundColor: '#F4F6FA',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: 22,
    padding: 22,
    alignItems: 'center',
    shadowColor: '#1B2430',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  name: {
    fontSize: 18,
    color: colors.text,
    fontFamily: fonts.BOLD,
  },
  phone: {
    marginTop: 4,
    fontSize: 13,
    color: colors.mutedText,
    fontFamily: fonts.BOLD,
  },
  qrWrap: {
    marginTop: 22,
    padding: 14,
    borderRadius: 18,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: '#E8EDF5',
  },
  hint: {
    marginTop: 18,
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
    color: colors.mutedText,
    fontFamily: fonts.BOLD,
  },
});
