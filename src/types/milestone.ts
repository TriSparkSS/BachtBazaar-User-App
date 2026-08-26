export type MilestoneStatus = 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'EXPIRED' | string;

export type Milestone = {
  id: string;
  title: string;
  actionType: string;
  rewardDescription: string;
  rewardClaimCode?: string | null;
  currentCount: number;
  targetCount: number;
  progressPercentage: number;
  isCompleted: boolean;
  status: MilestoneStatus;
  expiresAt?: string;
  createdAt?: string;
  shopId?: string | null;
  shopName?: string | null;
  merchantId?: string | null;
  merchantName?: string | null;
  merchantPhone?: string | null;
};
