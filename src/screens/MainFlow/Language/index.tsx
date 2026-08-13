import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { colors, fonts } from '../../../helpers/styles';
import { MainStackParamList } from '../../../navigation/types';
import { showAppAlert } from '../../../services/appAlert';
import {
  AppLanguage,
  languageStorage,
} from '../../../services/languageStorage';

type LanguageOption = {
  code: AppLanguage;
  label: string;
  comingSoon?: boolean;
};

const LANGUAGE_OPTIONS: LanguageOption[] = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'Hindi (Coming soon)', comingSoon: true },
];

const LanguageScreen = () => {
  const navigation =
    useNavigation<StackNavigationProp<MainStackParamList, 'Language'>>();
  const [selectedLanguage, setSelectedLanguage] = useState<AppLanguage>('en');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let active = true;

      const load = async () => {
        setIsLoading(true);
        try {
          const language = await languageStorage.getLanguage();
          if (active) {
            // Hindi is not applied yet — keep English as the active selection.
            setSelectedLanguage(language === 'hi' ? 'en' : language);
            if (language === 'hi') {
              await languageStorage.setLanguage('en');
            }
          }
        } finally {
          if (active) {
            setIsLoading(false);
          }
        }
      };

      void load();

      return () => {
        active = false;
      };
    }, []),
  );

  const selectLanguage = useCallback(
    async (option: LanguageOption) => {
      if (isSaving) {
        return;
      }

      if (option.comingSoon || option.code === 'hi') {
        showAppAlert(
          'Coming soon',
          'Hindi language support is coming soon',
          [{ text: 'OK' }],
        );
        return;
      }

      if (option.code === selectedLanguage) {
        return;
      }

      setIsSaving(true);
      try {
        await languageStorage.setLanguage(option.code);
        setSelectedLanguage(option.code);
      } catch {
        showAppAlert(
          'Could not save',
          'Unable to update language preference. Please try again.',
          [{ text: 'OK' }],
        );
      } finally {
        setIsSaving(false);
      }
    },
    [isSaving, selectedLanguage],
  );

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
          <Text style={styles.headerTitle}>Language</Text>
          <View style={styles.backBtn} />
        </View>
      </SafeAreaView>

      <View style={styles.body}>
        <View style={styles.card}>
          <View style={styles.iconWrap}>
            <MaterialCommunityIcons
              name="translate"
              size={36}
              color={colors.primary}
            />
          </View>
          <Text style={styles.title}>App language</Text>
          <Text style={styles.subtitle}>
            Choose your preferred language. Hindi support is in progress — the
            app stays in English for now.
          </Text>
        </View>

        {isLoading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : (
          LANGUAGE_OPTIONS.map(option => {
            const isSelected = selectedLanguage === option.code;
            return (
              <TouchableOpacity
                key={option.code}
                style={[styles.rowCard, isSelected && styles.rowCardSelected]}
                onPress={() => void selectLanguage(option)}
                activeOpacity={0.85}
                disabled={isSaving}>
                <View style={styles.rowTextWrap}>
                  <Text
                    style={[
                      styles.rowLabel,
                      option.comingSoon && styles.rowLabelMuted,
                    ]}>
                    {option.label}
                  </Text>
                  {option.code === 'en' ? (
                    <Text style={styles.rowHint}>Default</Text>
                  ) : (
                    <Text style={styles.rowHint}>Not available yet</Text>
                  )}
                </View>
                <MaterialCommunityIcons
                  name={isSelected ? 'radiobox-marked' : 'radiobox-blank'}
                  size={24}
                  color={isSelected ? colors.primary : colors.mutedText}
                />
              </TouchableOpacity>
            );
          })
        )}
      </View>
    </View>
  );
};

export default LanguageScreen;

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
    gap: 10,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E8EDF5',
    padding: 22,
    alignItems: 'center',
    marginBottom: 6,
  },
  iconWrap: {
    width: 68,
    height: 68,
    borderRadius: 20,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  title: {
    fontSize: 18,
    color: colors.text,
    fontFamily: fonts.BOLD,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 20,
    color: colors.mutedText,
    fontFamily: fonts.BOLD,
    textAlign: 'center',
  },
  loadingWrap: {
    paddingVertical: 28,
    alignItems: 'center',
  },
  rowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E8EDF5',
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 10,
  },
  rowCardSelected: {
    borderColor: colors.primaryBorder,
    backgroundColor: colors.primarySoft,
  },
  rowTextWrap: {
    flex: 1,
  },
  rowLabel: {
    fontSize: 15,
    color: colors.text,
    fontFamily: fonts.BOLD,
    marginBottom: 2,
  },
  rowLabelMuted: {
    color: colors.mutedText,
  },
  rowHint: {
    fontSize: 12,
    color: colors.mutedText,
    fontFamily: fonts.BOLD,
  },
});
