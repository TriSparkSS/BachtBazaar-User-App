import AsyncStorage from '@react-native-async-storage/async-storage';

export type AppLanguage = 'en' | 'hi';

const APP_LANGUAGE_KEY = '@bachatbazaar/app_language';
const DEFAULT_LANGUAGE: AppLanguage = 'en';

const isAppLanguage = (value: string | null): value is AppLanguage =>
  value === 'en' || value === 'hi';

export const languageStorage = {
  async getLanguage(): Promise<AppLanguage> {
    try {
      const stored = await AsyncStorage.getItem(APP_LANGUAGE_KEY);
      return isAppLanguage(stored) ? stored : DEFAULT_LANGUAGE;
    } catch {
      return DEFAULT_LANGUAGE;
    }
  },

  async setLanguage(language: AppLanguage): Promise<void> {
    await AsyncStorage.setItem(APP_LANGUAGE_KEY, language);
  },
};
