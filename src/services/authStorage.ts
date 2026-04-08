import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserProfile } from '../types/auth';

const AUTH_TOKEN_KEY = '@bachatbazaar/auth-token';
const AUTH_USER_KEY = '@bachatbazaar/auth-user';

export const authStorage = {
  async setSession(token: string, user: UserProfile) {
    await AsyncStorage.multiSet([
      [AUTH_TOKEN_KEY, token],
      [AUTH_USER_KEY, JSON.stringify(user)],
    ]);
  },

  async getSession() {
    const [[, token], [, userJson]] = await AsyncStorage.multiGet([
      AUTH_TOKEN_KEY,
      AUTH_USER_KEY,
    ]);

    return {
      token,
      user: userJson ? (JSON.parse(userJson) as UserProfile) : null,
    };
  },

  async clearSession() {
    await AsyncStorage.multiRemove([AUTH_TOKEN_KEY, AUTH_USER_KEY]);
  },
};
