import AsyncStorage from '@react-native-async-storage/async-storage';

/** Clear this key to retest the first-time Home feature walkthrough. */
export const FEATURE_WALKTHROUGH_DONE_KEY = '@bachatbazaar/feature_walkthrough_done';

/**
 * Bump this when a deploy should re-show the guide once (e.g. new coach-mark UI).
 * After one reset, Skip/Done persists normally again.
 */
const FEATURE_WALKTHROUGH_FORCE_VERSION = 'coachmark-v3';
const FEATURE_WALKTHROUGH_FORCE_KEY = `@bachatbazaar/feature_walkthrough_force_${FEATURE_WALKTHROUGH_FORCE_VERSION}`;

export const featureWalkthroughStorage = {
  async isDone(): Promise<boolean> {
    try {
      const value = await AsyncStorage.getItem(FEATURE_WALKTHROUGH_DONE_KEY);
      return value === '1' || value === 'true';
    } catch {
      return false;
    }
  },

  async markDone(): Promise<void> {
    try {
      await AsyncStorage.setItem(FEATURE_WALKTHROUGH_DONE_KEY, '1');
    } catch {
      // Ignore persistence failures; walkthrough can show again next launch.
    }
  },

  /** Dev/test helper — clear completion so the guide auto-shows again. */
  async reset(): Promise<void> {
    try {
      await AsyncStorage.removeItem(FEATURE_WALKTHROUGH_DONE_KEY);
    } catch {
      // no-op
    }
  },

  /**
   * One-shot QA helper: clears the done flag the first time this version runs,
   * then never forces again on that device.
   */
  async ensureForcedOnceForVersion(): Promise<void> {
    try {
      const already = await AsyncStorage.getItem(FEATURE_WALKTHROUGH_FORCE_KEY);
      if (already === '1') {
        return;
      }
      await AsyncStorage.removeItem(FEATURE_WALKTHROUGH_DONE_KEY);
      await AsyncStorage.setItem(FEATURE_WALKTHROUGH_FORCE_KEY, '1');
    } catch {
      // no-op
    }
  },
};
