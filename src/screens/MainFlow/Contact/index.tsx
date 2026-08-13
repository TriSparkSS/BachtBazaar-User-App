import React, { useCallback } from 'react';
import {
  Linking,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {
  openChatWithNumber,
  openPhoneDialer,
} from '../../../helpers/contactActions';
import { colors, fonts } from '../../../helpers/styles';
import { MainStackParamList } from '../../../navigation/types';
import { showAppAlert } from '../../../services/appAlert';

const SUPPORT_EMAIL = 'support@bachatbazaar.tech';
const SUPPORT_PHONE = '+919876543210';

type ContactRow = {
  key: string;
  title: string;
  subtitle: string;
  icon: string;
  iconBg: string;
  iconColor: string;
  onPress: () => void;
};

const ContactScreen = () => {
  const navigation =
    useNavigation<StackNavigationProp<MainStackParamList, 'Contact'>>();

  const openEmail = useCallback(async () => {
    try {
      await Linking.openURL(`mailto:${SUPPORT_EMAIL}`);
    } catch {
      showAppAlert('Could not open email', SUPPORT_EMAIL);
    }
  }, []);

  const openWhatsApp = useCallback(async () => {
    try {
      await openChatWithNumber(
        SUPPORT_PHONE,
        'Hi, I need help with my Bachat Bazaar account.',
      );
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Could not open WhatsApp.';
      showAppAlert('WhatsApp unavailable', message);
    }
  }, []);

  const openCall = useCallback(async () => {
    try {
      await openPhoneDialer(SUPPORT_PHONE);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Could not open phone dialer.';
      showAppAlert('Call unavailable', message);
    }
  }, []);

  const rows: ContactRow[] = [
    {
      key: 'email',
      title: 'Contact Support',
      subtitle: SUPPORT_EMAIL,
      icon: 'email-outline',
      iconBg: '#E8F1FF',
      iconColor: colors.primary,
      onPress: () => void openEmail(),
    },
    {
      key: 'whatsapp',
      title: 'WhatsApp Support',
      subtitle: 'Chat with our support team',
      icon: 'whatsapp',
      iconBg: '#EAF8F0',
      iconColor: '#2D8B5F',
      onPress: () => void openWhatsApp(),
    },
    {
      key: 'call',
      title: 'Call Support',
      subtitle: SUPPORT_PHONE,
      icon: 'phone-outline',
      iconBg: '#FFF3E8',
      iconColor: '#D97706',
      onPress: () => void openCall(),
    },
  ];

  return (
    <View style={styles.root}>
      <SafeAreaView edges={['top']} style={styles.headerSafe}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
            activeOpacity={0.85}>
            <MaterialCommunityIcons
              name="arrow-left"
              size={22}
              color={colors.white}
            />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Contact</Text>
          <View style={styles.backBtn} />
        </View>
      </SafeAreaView>

      <View style={styles.body}>
        <View style={styles.introCard}>
          <View style={styles.introIcon}>
            <MaterialCommunityIcons
              name="headset"
              size={28}
              color={colors.primary}
            />
          </View>
          <View style={styles.introTextWrap}>
            <Text style={styles.introTitle}>How can we help you?</Text>
            <Text style={styles.introSub}>
              Email, WhatsApp, or call our support team for account and order
              help.
            </Text>
          </View>
        </View>

        <View style={styles.listCard}>
          {rows.map((row, index) => (
            <TouchableOpacity
              key={row.key}
              style={[
                styles.row,
                index < rows.length - 1 ? styles.rowDivider : null,
              ]}
              onPress={row.onPress}
              activeOpacity={0.85}>
              <View style={[styles.rowIcon, { backgroundColor: row.iconBg }]}>
                <MaterialCommunityIcons
                  name={row.icon}
                  size={20}
                  color={row.iconColor}
                />
              </View>
              <View style={styles.rowTextWrap}>
                <Text style={styles.rowTitle}>{row.title}</Text>
                <Text style={styles.rowSubtitle}>{row.subtitle}</Text>
              </View>
              <MaterialCommunityIcons
                name="open-in-new"
                size={18}
                color={colors.mutedText}
              />
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );
};

export default ContactScreen;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.primary,
  },
  headerSafe: {
    backgroundColor: colors.primary,
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
    color: colors.white,
    fontFamily: fonts.BOLD,
  },
  body: {
    flex: 1,
    backgroundColor: '#F4F6FA',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 16,
    gap: 12,
  },
  introCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E8EDF5',
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  introIcon: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  introTextWrap: {
    flex: 1,
  },
  introTitle: {
    fontSize: 16,
    color: colors.text,
    fontFamily: fonts.BOLD,
    marginBottom: 4,
  },
  introSub: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.mutedText,
    fontFamily: fonts.BOLD,
  },
  listCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E8EDF5',
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 12,
  },
  rowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: '#EEF2F8',
  },
  rowIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowTextWrap: {
    flex: 1,
  },
  rowTitle: {
    fontSize: 14,
    color: colors.text,
    fontFamily: fonts.BOLD,
    marginBottom: 2,
  },
  rowSubtitle: {
    fontSize: 12,
    color: colors.mutedText,
    fontFamily: fonts.BOLD,
  },
});
