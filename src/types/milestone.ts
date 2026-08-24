export type MilestoneStatus = 'IN_PROGRESS' | 'COMPLETED' | 'EXPIRED' | string;

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
  shopId?: string | null;
};
