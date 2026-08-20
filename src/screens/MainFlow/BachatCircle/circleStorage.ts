import AsyncStorage from '@react-native-async-storage/async-storage';
import { BachatCircleState, CircleCategory } from './types';

const STORAGE_KEY = 'bachat_circle_state_v1';

export const emptyCircleState = (): BachatCircleState => ({
  created: false,
  name: '',
  category: 'Family',
  memberIds: ['you'],
  pendingInviteIds: [],
});

export const circleStorage = {
  async load(): Promise<BachatCircleState> {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return emptyCircleState();
      }
      const parsed = JSON.parse(raw) as Partial<BachatCircleState>;
      return {
        ...emptyCircleState(),
        ...parsed,
        memberIds: Array.isArray(parsed.memberIds)
          ? parsed.memberIds
          : ['you'],
        pendingInviteIds: Array.isArray(parsed.pendingInviteIds)
          ? parsed.pendingInviteIds
          : [],
        category: (parsed.category as CircleCategory) || 'Family',
      };
    } catch {
      return emptyCircleState();
    }
  },

  async save(state: BachatCircleState): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  },

  async clear(): Promise<void> {
    await AsyncStorage.removeItem(STORAGE_KEY);
  },
};
