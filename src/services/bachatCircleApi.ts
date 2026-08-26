import {
  API_BASE_URL,
  API_ENDPOINTS,
  BACHAT_CIRCLE_API_BASE_URL,
  resolveProfileImageUrl,
} from '../config/api';
import { apiRequest } from './apiClient';

const encodeFormBody = (fields: Record<string, string>) =>
  Object.entries(fields)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join('&');

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value && typeof value === 'object' && !Array.isArray(value));

const pickString = (...values: unknown[]): string | undefined => {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
    if (typeof value === 'number' && !Number.isNaN(value)) {
      return String(value);
    }
  }
  return undefined;
};

const pickBoolean = (...values: unknown[]): boolean | undefined => {
  for (const value of values) {
    if (typeof value === 'boolean') {
      return value;
    }
  }
  return undefined;
};

export type CircleReactionKey =
  | 'LIKE'
  | 'USEFUL'
  | 'HOT_DEAL'
  | 'AMAZING'
  | 'GREAT'
  | 'WOW';

export const CIRCLE_REACTIONS: Array<{
  key: CircleReactionKey;
  emoji: string;
  label: string;
}> = [
  { key: 'LIKE', emoji: '❤️', label: 'Like' },
  { key: 'USEFUL', emoji: '👍', label: 'Useful' },
  { key: 'HOT_DEAL', emoji: '🔥', label: 'Hot Deal' },
  { key: 'AMAZING', emoji: '🤩', label: 'Amazing' },
  { key: 'GREAT', emoji: '💯', label: 'Great' },
  { key: 'WOW', emoji: '😮', label: 'Wow' },
];

export type CircleMemberDto = {
  userId: string;
  name: string;
  phone?: string;
  role: string;
  joinedAt?: string;
};

export type CirclePendingInviteDto = {
  id: string;
  phone: string;
  status: string;
  roleAssigned?: string;
  expiresAt?: string;
  invitedByName?: string;
};

export type CircleInviteableUserDto = {
  id: string;
  name: string;
  phone: string;
  /** Always true for inviteable list entries — unregistered contacts are excluded. */
  isRegistered: boolean;
};

export type BachatCircleDto = {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  myRole?: string;
  memberCount: number;
  isActive?: boolean;
  members: CircleMemberDto[];
  pendingInvitations: CirclePendingInviteDto[];
  createdByName?: string;
};

export type CircleInvitationDto = {
  id: string;
  circleId: string;
  circleName: string;
  circleDescription?: string;
  memberCount?: number;
  invitedByName?: string;
  invitedByPhone?: string;
  roleAssigned?: string;
  expiresAt?: string;
};

export type SharedCircleOfferDto = {
  id: string;
  circleId: string;
  offerId: string;
  title: string;
  description?: string;
  thumbnail?: string;
  merchantName?: string;
  merchantId?: string;
  discountLabel?: string;
  minimumPurchaseAmount?: number;
  startDate?: string;
  endDate?: string;
  sharedByName?: string;
  sharedById?: string;
  note?: string;
  visibilityType?: string;
  createdAt?: string;
  myReaction?: CircleReactionKey | null;
  reactionCounts?: Partial<Record<CircleReactionKey, number>>;
  totalReactions?: number;
};

const parseUserRef = (
  value: unknown,
): { id?: string; name?: string; phone?: string } => {
  if (!isRecord(value)) {
    return {};
  }
  return {
    id: pickString(value._id, value.id),
    name: pickString(value.name),
    phone: pickString(value.phone),
  };
};

const parseMember = (value: unknown): CircleMemberDto | undefined => {
  if (!isRecord(value)) {
    return undefined;
  }
  const user = parseUserRef(value.userId);
  const userId = user.id || pickString(value.userId);
  if (!userId) {
    return undefined;
  }
  return {
    userId,
    name: user.name || 'Member',
    phone: user.phone,
    role: pickString(value.role) || 'MEMBER',
    joinedAt: pickString(value.joinedAt, value.joined_at),
  };
};

const parsePendingInvite = (value: unknown): CirclePendingInviteDto | undefined => {
  if (!isRecord(value)) {
    return undefined;
  }
  const id = pickString(value._id, value.id);
  const phone = pickString(value.phone);
  if (!id || !phone) {
    return undefined;
  }
  const invitedBy = parseUserRef(value.invitedBy);
  return {
    id,
    phone,
    status: pickString(value.status) || 'PENDING',
    roleAssigned: pickString(value.roleAssigned, value.role_assigned),
    expiresAt: pickString(value.expiresAt, value.expires_at),
    invitedByName: invitedBy.name,
  };
};

const parseCircle = (value: unknown): BachatCircleDto | undefined => {
  if (!isRecord(value)) {
    return undefined;
  }
  const id = pickString(value._id, value.id);
  const name = pickString(value.name);
  if (!id || !name) {
    return undefined;
  }
  const members = Array.isArray(value.members)
    ? value.members.map(parseMember).filter((m): m is CircleMemberDto => Boolean(m))
    : [];
  const pendingInvitations = Array.isArray(value.pendingInvitations)
    ? value.pendingInvitations
        .map(parsePendingInvite)
        .filter((i): i is CirclePendingInviteDto => Boolean(i))
    : [];
  const createdBy = parseUserRef(value.createdBy);
  const memberCount =
    typeof value.memberCount === 'number'
      ? value.memberCount
      : members.length;

  return {
    id,
    name,
    description: pickString(value.description),
    icon: pickString(value.icon),
    myRole: pickString(value.myRole, value.my_role),
    memberCount,
    isActive: pickBoolean(value.isActive, value.is_active),
    members,
    pendingInvitations,
    createdByName: createdBy.name,
  };
};

const isPendingInviteStatus = (status?: string): boolean => {
  if (!status) {
    return true;
  }
  const normalized = status.trim().toUpperCase().replace(/[\s-]+/g, '_');
  return ![
    'ACCEPTED',
    'REJECTED',
    'DECLINED',
    'EXPIRED',
    'CANCELLED',
    'CANCELED',
  ].includes(normalized);
};

const parseInvitation = (value: unknown): CircleInvitationDto | undefined => {
  if (!isRecord(value)) {
    return undefined;
  }
  const record = isRecord(value.invitation) ? value.invitation : value;
  const nestedCircle = isRecord(record.circle)
    ? record.circle
    : isRecord(record.bachatCircle)
      ? record.bachatCircle
      : isRecord(record.group)
        ? record.group
        : undefined;
  const status = pickString(
    record.status,
    record.invitationStatus,
    record.inviteStatus,
    value.status,
  );
  if (!isPendingInviteStatus(status)) {
    return undefined;
  }
  const id = pickString(record._id, record.id, value._id, value.id);
  const circleId = pickString(
    nestedCircle?._id,
    nestedCircle?.id,
    record.circleId,
    record.circle_id,
    record.bachatCircleId,
    record.bachatCircle_id,
    value.circleId,
    value.circle_id,
    typeof record.circle === 'string' ? record.circle : undefined,
    typeof value.circle === 'string' ? value.circle : undefined,
  );
  const circleName =
    pickString(
      nestedCircle?.name,
      record.circleName,
      record.circle_name,
      record.name,
      value.circleName,
      value.circle_name,
    ) || 'Bachat Circle';
  if (!id || !circleId) {
    return undefined;
  }
  const invitedBy = parseUserRef(
    record.invitedBy ??
      record.invitedByUser ??
      record.from ??
      record.sender ??
      value.invitedBy,
  );
  const memberCountRaw =
    nestedCircle?.memberCount ?? record.memberCount ?? value.memberCount;
  return {
    id,
    circleId,
    circleName,
    circleDescription: pickString(
      nestedCircle?.description,
      record.circleDescription,
      record.description,
    ),
    memberCount:
      typeof memberCountRaw === 'number' ? memberCountRaw : undefined,
    invitedByName: invitedBy.name,
    invitedByPhone: invitedBy.phone,
    roleAssigned: pickString(record.roleAssigned, record.role_assigned),
    expiresAt: pickString(record.expiresAt, record.expires_at),
  };
};

const buildDiscountLabel = (offer: Record<string, unknown>): string | undefined => {
  const pct = offer.discount_percentage ?? offer.discountPercentage;
  const val = offer.discount_value ?? offer.discountValue;
  if (typeof pct === 'number' && pct > 0) {
    return `${pct}% OFF`;
  }
  if (typeof val === 'number' && val > 0) {
    return `₹${val} OFF`;
  }
  return pickString(offer.discount, offer.discountLabel);
};

const parseReactionCounts = (
  value: unknown,
): Partial<Record<CircleReactionKey, number>> | undefined => {
  if (!isRecord(value)) {
    return undefined;
  }
  const counts: Partial<Record<CircleReactionKey, number>> = {};
  for (const item of CIRCLE_REACTIONS) {
    const raw = value[item.key] ?? value[item.emoji] ?? value[item.label];
    if (typeof raw === 'number' && raw > 0) {
      counts[item.key] = raw;
    }
  }
  return Object.keys(counts).length ? counts : undefined;
};

const parseSharedOffer = (value: unknown): SharedCircleOfferDto | undefined => {
  if (!isRecord(value)) {
    return undefined;
  }
  const id = pickString(value._id, value.id);
  const circleId = pickString(value.circleId, value.circle_id);
  if (!id || !circleId) {
    return undefined;
  }

  const offerRaw = isRecord(value.offerId) ? value.offerId : undefined;
  const offerId =
    pickString(offerRaw?._id, offerRaw?.id) ||
    pickString(typeof value.offerId === 'string' ? value.offerId : undefined);
  if (!offerId) {
    return undefined;
  }

  const merchant = isRecord(offerRaw?.merchant_id)
    ? offerRaw?.merchant_id
    : isRecord(offerRaw?.merchant)
      ? offerRaw?.merchant
      : undefined;
  const sharedBy = parseUserRef(value.sharedBy);
  const reactionCounts = parseReactionCounts(
    value.reactionCounts ?? value.reactions ?? value.reaction_counts,
  );
  const totalFromCounts = reactionCounts
    ? Object.values(reactionCounts).reduce((sum, n) => sum + (n || 0), 0)
    : undefined;

  return {
    id,
    circleId,
    offerId,
    title: pickString(offerRaw?.title, value.title) || 'Shared offer',
    description: pickString(offerRaw?.description, value.description, value.note),
    thumbnail: resolveProfileImageUrl(
      pickString(offerRaw?.thumbnail, offerRaw?.image, value.thumbnail),
    ),
    merchantName: pickString(merchant?.name, offerRaw?.merchantName, value.merchantName),
    merchantId: pickString(merchant?._id, merchant?.id),
    discountLabel: offerRaw ? buildDiscountLabel(offerRaw) : undefined,
    minimumPurchaseAmount:
      typeof offerRaw?.minimum_purchase_amount === 'number'
        ? offerRaw.minimum_purchase_amount
        : typeof offerRaw?.minimumPurchaseAmount === 'number'
          ? offerRaw.minimumPurchaseAmount
          : undefined,
    startDate: pickString(offerRaw?.start_date, offerRaw?.startDate),
    endDate: pickString(offerRaw?.end_date, offerRaw?.endDate),
    sharedByName: sharedBy.name,
    sharedById: sharedBy.id,
    note: pickString(value.note),
    visibilityType: pickString(value.visibilityType),
    createdAt: pickString(value.createdAt),
    myReaction: (pickString(value.myReaction, value.my_reaction) as CircleReactionKey) || null,
    reactionCounts,
    totalReactions:
      typeof value.totalReactions === 'number'
        ? value.totalReactions
        : totalFromCounts,
  };
};

const unwrapData = (payload: unknown): unknown => {
  if (isRecord(payload) && 'data' in payload) {
    return payload.data;
  }
  return payload;
};

/** Pull a list from common API wrappers: data[], data.items, data.circles, etc. */
const extractArray = (
  payload: unknown,
  keys: string[],
): unknown[] | null => {
  const data = unwrapData(payload);
  if (Array.isArray(data)) {
    return data;
  }
  if (Array.isArray(payload)) {
    return payload;
  }
  const sources = [data, payload].filter(isRecord);
  for (const source of sources) {
    for (const key of keys) {
      const value = source[key];
      if (Array.isArray(value)) {
        return value;
      }
    }
  }
  return null;
};

const asRegisteredArray = (payload: unknown): unknown[] | null => {
  const data = unwrapData(payload);
  const sources = [data, payload].filter(isRecord);
  for (const source of sources) {
    for (const key of [
      'registeredUsers',
      'registered',
      'registeredContacts',
    ]) {
      const value = source[key];
      if (Array.isArray(value)) {
        return value;
      }
    }
  }
  return null;
};

const normalizePhoneDigits = (value: string) =>
  value.replace(/\D/g, '').replace(/^91/, '').slice(-10);

const isRegisteredContact = (value: Record<string, unknown>): boolean => {
  if (value.isRegistered === true || value.registered === true) {
    return true;
  }
  if (value.isRegistered === false || value.registered === false) {
    return false;
  }
  const status = pickString(
    value.status,
    value.registrationStatus,
    value.userStatus,
  )?.toLowerCase();
  if (
    status === 'registered' ||
    status === 'active' ||
    status === 'verified'
  ) {
    return true;
  }
  if (
    status === 'unregistered' ||
    status === 'not_registered' ||
    status === 'pending' ||
    status === 'notregistered'
  ) {
    return false;
  }
  // Registered app users almost always have a real user id.
  const userId = pickString(value._id, value.id, value.userId);
  return Boolean(userId && userId.replace(/\D/g, '').length !== 10);
};

const parseInviteableUser = (
  value: unknown,
  options?: { fromRegisteredBucket?: boolean },
): CircleInviteableUserDto | undefined => {
  if (!isRecord(value)) {
    return undefined;
  }
  const nested = isRecord(value.user) ? value.user : value;
  const record = isRecord(nested) ? nested : value;

  if (!options?.fromRegisteredBucket) {
    if (!isRegisteredContact(value) && !isRegisteredContact(record)) {
      return undefined;
    }
  }

  const id =
    pickString(record._id, record.id, value._id, value.id, value.userId) || '';
  const phoneRaw = pickString(
    record.phone,
    value.phone,
    record.formattedPhone,
    value.formattedPhone,
    record.mobile,
    value.mobile,
    record.phoneNumber,
    value.phoneNumber,
  );
  if (!phoneRaw) {
    return undefined;
  }
  const phone = normalizePhoneDigits(phoneRaw);
  if (phone.length !== 10) {
    return undefined;
  }
  // Without a registered bucket, require a real user id (not phone-only stub).
  if (!options?.fromRegisteredBucket && (!id || id === phone)) {
    return undefined;
  }
  const name =
    pickString(
      record.name,
      value.name,
      record.contactBookName,
      value.contactBookName,
      record.fullName,
      value.fullName,
    ) || `User ${phone.slice(-4)}`;
  return {
    id: id || phone,
    name,
    phone,
    isRegistered: true,
  };
};

export const bachatCircleApi = {
  async createCircle(
    token: string,
    input: { name: string; description?: string },
  ): Promise<BachatCircleDto> {
    const body = encodeFormBody({
      name: input.name.trim(),
      description: (input.description || '').trim(),
    });
    const payload = await apiRequest<unknown>(API_ENDPOINTS.bachatCircleCreate, {
      method: 'POST',
      token,
      baseUrl: BACHAT_CIRCLE_API_BASE_URL,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });
    const circle = parseCircle(unwrapData(payload));
    if (!circle) {
      throw new Error('Could not create Bachat Circle.');
    }
    return circle;
  },

  async listMyCircles(token: string): Promise<BachatCircleDto[]> {
    try {
      const payload = await apiRequest<unknown>(API_ENDPOINTS.bachatCircleMine, {
        method: 'GET',
        token,
        baseUrl: BACHAT_CIRCLE_API_BASE_URL,
      });
      const list = extractArray(payload, [
        'circles',
        'bachatCircles',
        'myCircles',
        'items',
      ]);
      if (list) {
        return list
          .map(parseCircle)
          .filter((c): c is BachatCircleDto => Boolean(c));
      }
      const one = parseCircle(unwrapData(payload));
      return one ? [one] : [];
    } catch {
      return [];
    }
  },

  async getCircle(token: string, circleId: string): Promise<BachatCircleDto> {
    const payload = await apiRequest<unknown>(API_ENDPOINTS.bachatCircleById(circleId), {
      method: 'GET',
      token,
      baseUrl: BACHAT_CIRCLE_API_BASE_URL,
    });
    const circle = parseCircle(unwrapData(payload));
    if (!circle) {
      throw new Error('Circle not found.');
    }
    return circle;
  },

  async inviteByPhone(
    token: string,
    circleId: string,
    phone: string,
  ): Promise<{ isRegistered: boolean; message?: string }> {
    const normalized = normalizePhoneDigits(phone);
    const body = encodeFormBody({ phone: normalized });
    const payload = await apiRequest<unknown>(API_ENDPOINTS.bachatCircleInvite(circleId), {
      method: 'POST',
      token,
      baseUrl: BACHAT_CIRCLE_API_BASE_URL,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });
    const record = isRecord(payload) ? payload : {};
    const data = isRecord(record.data) ? record.data : {};
    const isRegistered = Boolean(
      record.isRegistered ?? data.isRegistered ?? record.registered ?? data.registered,
    );
    const message = pickString(record.message, data.message);

    // Never treat unregistered contacts as successfully invited/added.
    if (!isRegistered) {
      throw new Error(
        message ||
          'This number is not registered on Bachat Bazaar. Only registered users can be invited.',
      );
    }

    return {
      isRegistered: true,
      message,
    };
  },

  /**
   * POST /api/user/contacts/sync — returns only registered Bachat Bazaar users.
   * Unregistered contacts from the response are ignored.
   */
  async syncRegisteredContacts(
    token: string,
    contacts: Array<{ name: string; phone: string }>,
  ): Promise<CircleInviteableUserDto[]> {
    if (!contacts.length) {
      return [];
    }

    const payload = await apiRequest<unknown>(API_ENDPOINTS.contactsSync, {
      method: 'POST',
      token,
      baseUrl: API_BASE_URL,
      body: {
        contacts: contacts.map(contact => ({
          name: contact.name.trim() || 'Contact',
          phone: contact.phone.trim(),
        })),
      },
    });

    if (payload == null) {
      return [];
    }

    // Only use registeredUsers — never nonRegisteredContacts.
    const registered = asRegisteredArray(payload) ?? [];
    const users = registered
      .map(item => parseInviteableUser(item, { fromRegisteredBucket: true }))
      .filter((u): u is CircleInviteableUserDto => Boolean(u && u.isRegistered));

    const byPhone = new Map<string, CircleInviteableUserDto>();
    for (const user of users) {
      if (!byPhone.has(user.phone)) {
        byPhone.set(user.phone, user);
      }
    }
    return Array.from(byPhone.values());
  },

  /** @deprecated Use syncRegisteredContacts with device contacts body. */
  async listInviteableUsers(
    token: string,
    _query?: string,
  ): Promise<CircleInviteableUserDto[]> {
    return this.syncRegisteredContacts(token, []);
  },

  async myInvitations(token: string): Promise<CircleInvitationDto[]> {
    try {
      const payload = await apiRequest<unknown>(
        API_ENDPOINTS.bachatCircleMyInvitations,
        {
          method: 'GET',
          token,
          baseUrl: BACHAT_CIRCLE_API_BASE_URL,
        },
      );
      const list =
        extractArray(payload, [
          'invitations',
          'myInvitations',
          'pendingInvitations',
          'items',
        ]) || [];
      return list
        .map(parseInvitation)
        .filter((i): i is CircleInvitationDto => Boolean(i));
    } catch {
      return [];
    }
  },

  async respondInvitation(
    token: string,
    invitationId: string,
    action: 'ACCEPT' | 'REJECT',
  ): Promise<void> {
    const body = encodeFormBody({ action });
    await apiRequest<unknown>(API_ENDPOINTS.bachatCircleRespondInvitation(invitationId), {
      method: 'POST',
      token,
      baseUrl: BACHAT_CIRCLE_API_BASE_URL,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });
  },

  async shareOffer(
    token: string,
    circleId: string,
    input: {
      offerId: string;
      visibilityType: 'ENTIRE_CIRCLE' | 'SELECTED_MEMBERS';
      visibleToMembers?: string[];
      note?: string;
    },
  ): Promise<void> {
    await apiRequest<unknown>(API_ENDPOINTS.bachatCircleOffers(circleId), {
      method: 'POST',
      token,
      baseUrl: BACHAT_CIRCLE_API_BASE_URL,
      body: {
        offerId: input.offerId.trim(),
        visibilityType: input.visibilityType,
        visibleToMembers:
          input.visibilityType === 'SELECTED_MEMBERS'
            ? input.visibleToMembers || []
            : undefined,
        note: input.note?.trim() || '',
      },
    });
  },

  async listOffers(token: string, circleId: string): Promise<SharedCircleOfferDto[]> {
    const payload = await apiRequest<unknown>(API_ENDPOINTS.bachatCircleOffers(circleId), {
      method: 'GET',
      token,
      baseUrl: BACHAT_CIRCLE_API_BASE_URL,
    });
    const data = unwrapData(payload);
    const list = Array.isArray(data)
      ? data
      : isRecord(payload) && Array.isArray(payload.data)
        ? payload.data
        : [];
    return list
      .map(parseSharedOffer)
      .filter((o): o is SharedCircleOfferDto => Boolean(o));
  },

  async reactToOffer(
    token: string,
    circleId: string,
    sharedOfferId: string,
    reaction: CircleReactionKey,
  ): Promise<void> {
    await apiRequest<unknown>(
      API_ENDPOINTS.bachatCircleOfferReact(circleId, sharedOfferId),
      {
        method: 'POST',
        token,
        baseUrl: BACHAT_CIRCLE_API_BASE_URL,
        body: { reaction },
      },
    );
  },
};
