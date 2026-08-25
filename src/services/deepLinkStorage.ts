import AsyncStorage from '@react-native-async-storage/async-storage';

const REFERRAL_KEY = '@bachatbazaar/pending_referral_code';
const OFFER_KEY = '@bachatbazaar/pending_offer_deep_link';

export type PendingOfferDeepLink = {
  offerId: string;
  shopId?: string;
};

export const deepLinkStorage = {
  async savePendingReferralCode(code: string): Promise<void> {
    const normalized = code.trim();
    if (!normalized) {
      return;
    }
    await AsyncStorage.setItem(REFERRAL_KEY, normalized);
  },

  async peekPendingReferralCode(): Promise<string | null> {
    const value = await AsyncStorage.getItem(REFERRAL_KEY);
    return value?.trim() || null;
  },

  async consumePendingReferralCode(): Promise<string | null> {
    const value = await this.peekPendingReferralCode();
    if (value) {
      await AsyncStorage.removeItem(REFERRAL_KEY);
    }
    return value;
  },

  async clearPendingReferralCode(): Promise<void> {
    await AsyncStorage.removeItem(REFERRAL_KEY);
  },

  async savePendingOffer(offer: PendingOfferDeepLink): Promise<void> {
    const offerId = offer.offerId.trim();
    if (!offerId) {
      return;
    }
    await AsyncStorage.setItem(
      OFFER_KEY,
      JSON.stringify({
        offerId,
        shopId: offer.shopId?.trim() || undefined,
      }),
    );
  },

  async peekPendingOffer(): Promise<PendingOfferDeepLink | null> {
    const raw = await AsyncStorage.getItem(OFFER_KEY);
    if (!raw) {
      return null;
    }
    try {
      const parsed = JSON.parse(raw) as PendingOfferDeepLink;
      if (!parsed?.offerId?.trim()) {
        return null;
      }
      return {
        offerId: parsed.offerId.trim(),
        shopId: parsed.shopId?.trim() || undefined,
      };
    } catch {
      return null;
    }
  },

  async consumePendingOffer(): Promise<PendingOfferDeepLink | null> {
    const value = await this.peekPendingOffer();
    if (value) {
      await AsyncStorage.removeItem(OFFER_KEY);
    }
    return value;
  },

  async clearPendingOffer(): Promise<void> {
    await AsyncStorage.removeItem(OFFER_KEY);
  },
};
