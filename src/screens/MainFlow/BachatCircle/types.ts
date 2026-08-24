export type CircleCategory = 'Family' | 'Friends' | 'Office Team' | 'Other';

export type MemberRole = 'Admin' | 'Co-Admin' | 'Member';

export type CircleMember = {
  id: string;
  name: string;
  phone: string;
  role: MemberRole;
  isYou?: boolean;
  online?: boolean;
  avatarColor: string;
  initial: string;
  registered: boolean;
  invitePending?: boolean;
};

export type SharedOffer = {
  id: string;
  sharedById: string;
  sharedByName: string;
  timeAgo: string;
  brand: string;
  title: string;
  badge: string;
  distance: string;
  validTill: string;
  rating: string;
  ratingCount?: string;
  imageColor: string;
  about: string;
  address: string;
  hours: string;
  open: boolean;
};

export type CircleNotification = {
  id: string;
  type: 'shared' | 'joined' | 'welcome' | 'new-offer' | 'reward';
  title: string;
  subtitle: string;
  timeAgo: string;
  unread?: boolean;
  circleName?: string;
  badge?: string;
  points?: string;
};

export type BachatCircleState = {
  created: boolean;
  circleId: string;
  name: string;
  category: CircleCategory;
  description?: string;
  memberIds: string[];
  pendingInviteIds: string[];
};
