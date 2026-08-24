export type ReferralCodeInfo = {
  referralCode: string;
  totalReferrals: number;
};

export type ReferralListItem = {
  id: string;
  name: string;
  phone?: string;
  status?: string;
  joinedAt?: string;
};
