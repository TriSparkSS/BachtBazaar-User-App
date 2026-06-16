import { AuthResponse, UserProfile } from '../types/auth';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value && typeof value === 'object' && !Array.isArray(value));

const pickString = (...values: unknown[]): string | undefined => {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) {
      return value;
    }

    if (typeof value === 'number' && !Number.isNaN(value)) {
      return String(value);
    }
  }

  return undefined;
};

const collectRecords = (payload: unknown): Record<string, unknown>[] => {
  if (!isRecord(payload)) {
    return [];
  }

  const records: Record<string, unknown>[] = [payload];

  for (const key of ['data', 'result', 'response', 'payload']) {
    if (isRecord(payload[key])) {
      records.push(payload[key]);
    }
  }

  return records;
};

const extractToken = (records: Record<string, unknown>[]): string | undefined => {
  for (const record of records) {
    const direct = pickString(
      record.token,
      record.accessToken,
      record.sessionToken,
      record.jwt,
      record.authToken,
      record.session_token,
      record.access_token,
      record.auth_token,
    );

    if (direct) {
      return direct;
    }

    if (isRecord(record.token)) {
      const nested = pickString(
        record.token.accessToken,
        record.token.access_token,
        record.token.token,
        record.token.jwt,
      );

      if (nested) {
        return nested;
      }
    }
  }

  return undefined;
};

const normalizeGenderValue = (value: unknown): UserProfile['gender'] | undefined => {
  if (typeof value === 'number') {
    if (value === 1) {
      return 'female';
    }

    if (value === 2) {
      return 'other';
    }

    if (value === 0) {
      return 'male';
    }
  }

  if (typeof value !== 'string') {
    return undefined;
  }

  const normalized = value.trim().toLowerCase();
  if (normalized === 'male' || normalized === 'm') {
    return 'male';
  }

  if (normalized === 'female' || normalized === 'f') {
    return 'female';
  }

  if (normalized === 'other') {
    return 'other';
  }

  return undefined;
};

const normalizeUser = (value: unknown, fallbackPhone?: string): UserProfile | undefined => {
  if (!isRecord(value)) {
    return undefined;
  }

  const id = pickString(value._id, value.id, value.userId);
  if (!id) {
    return undefined;
  }

  return {
    _id: id,
    phone: pickString(value.phone, fallbackPhone) ?? '',
    name: pickString(value.name),
    gender: normalizeGenderValue(value.gender ?? value.sex),
    address: pickString(value.address),
    profileImage: pickString(
      value.profileImage,
      value.profile_image,
      value.imageUrl,
      value.image_url,
      value.avatar,
      value.photo,
      value.image,
    ),
    isVerified: Boolean(value.isVerified ?? true),
    createdAt: pickString(value.createdAt),
    updatedAt: pickString(value.updatedAt),
  };
};

const extractUser = (
  records: Record<string, unknown>[],
  fallbackPhone?: string,
): UserProfile | undefined => {
  for (const record of records) {
    const user =
      normalizeUser(record.user, fallbackPhone) ??
      normalizeUser(record.profile, fallbackPhone) ??
      normalizeUser(record, fallbackPhone);

    if (user) {
      return user;
    }
  }

  return undefined;
};

const extractUserId = (
  records: Record<string, unknown>[],
  user?: UserProfile,
): string | undefined =>
  pickString(
    user?._id,
    ...records.flatMap(record => [record.userId, record.user_id, record.id, record._id]),
  );

const extractProfileImagePath = (records: Record<string, unknown>[]): string | undefined => {
  for (const record of records) {
    const path = pickString(
      record.profileImage,
      record.profile_image,
      record.profileImageUrl,
      record.profile_image_url,
      record.url,
      record.imageUrl,
      record.image_url,
      record.avatar,
      record.photo,
      record.image,
      record.path,
      record.file,
      record.filePath,
      record.file_path,
    );

    if (path) {
      return path;
    }

    for (const nestedKey of ['user', 'data', 'result', 'profile']) {
      if (isRecord(record[nestedKey])) {
        const nested = extractProfileImagePath([record[nestedKey]]);
        if (nested) {
          return nested;
        }
      }
    }
  }

  return undefined;
};

export const parseProfileImagePath = (payload: unknown): string | undefined => {
  if (typeof payload === 'string' && payload.trim()) {
    const trimmed = payload.trim();
    if (
      trimmed.startsWith('http://') ||
      trimmed.startsWith('https://') ||
      trimmed.startsWith('/') ||
      trimmed.startsWith('data:image/')
    ) {
      return trimmed;
    }
  }

  return extractProfileImagePath(collectRecords(payload));
};

export type VerifyOtpResult =
  | AuthResponse
  | {
      success: boolean;
      sessionToken: string;
      userId: string;
      user?: UserProfile;
    };

export const parseAuthResponse = (
  payload: unknown,
  fallbackPhone?: string,
): AuthResponse => {
  const records = collectRecords(payload);
  const root = records[0] ?? {};
  const token = extractToken(records);
  let user = extractUser(records, fallbackPhone);

  if (!user) {
    const userId = extractUserId(records);
    if (userId) {
      user = {
        _id: userId,
        phone: pickString(...records.map(record => record.phone), fallbackPhone) ?? '',
        isVerified: Boolean(records.some(record => record.isVerified ?? record.is_verified ?? true)),
      };
    }
  }

  if (!token) {
    throw new Error('Authentication token was missing from the server response.');
  }

  if (!user) {
    throw new Error('User details were missing from the server response.');
  }

  return {
    success: Boolean(root.success ?? true),
    token,
    user,
  };
};

export const parseVerifyOtpResponse = (
  payload: unknown,
  fallbackPhone?: string,
  fallbackFirebaseToken?: string,
): VerifyOtpResult => {
  const records = collectRecords(payload);
  const root = records[0] ?? {};
  const token = extractToken(records) ?? fallbackFirebaseToken;
  const user = extractUser(records, fallbackPhone);
  const userId = extractUserId(records, user);

  if (token && user) {
    return {
      success: Boolean(root.success ?? true),
      token,
      user,
    };
  }

  if (token && userId) {
    return {
      success: Boolean(root.success ?? true),
      sessionToken: token,
      userId,
      user,
    };
  }

  if (Boolean(root.success ?? records.some(record => record.success)) && fallbackFirebaseToken) {
    if (userId) {
      return {
        success: true,
        sessionToken: fallbackFirebaseToken,
        userId,
        user,
      };
    }

    if (user) {
      return {
        success: true,
        sessionToken: fallbackFirebaseToken,
        userId: user._id,
        user,
      };
    }
  }

  throw new Error('Verify OTP response was incomplete. Expected token and user details.');
};

export const parseUpdateProfileResponse = (
  payload: unknown,
  fallbackUser: UserProfile,
  updates: Partial<UserProfile>,
): UserProfile => {
  const records = collectRecords(payload);
  const parsedUser = extractUser(records, fallbackUser.phone);
  const profileImagePath =
    extractProfileImagePath(records) ??
    parsedUser?.profileImage ??
    fallbackUser.profileImage;

  return {
    ...fallbackUser,
    ...parsedUser,
    ...updates,
    _id: parsedUser?._id ?? fallbackUser._id,
    phone: parsedUser?.phone ?? fallbackUser.phone,
    gender:
      normalizeGenderValue(parsedUser?.gender) ??
      normalizeGenderValue(updates.gender) ??
      fallbackUser.gender,
    profileImage: profileImagePath,
    isVerified: parsedUser?.isVerified ?? fallbackUser.isVerified ?? true,
  };
};

const extractProfileFields = (
  records: Record<string, unknown>[],
  fallbackPhone?: string,
): Partial<UserProfile> => {
  const merged: Partial<UserProfile> = {};

  for (const record of records) {
    const sources = [record.user, record.profile, record.data, record].filter(isRecord);

    for (const source of sources) {
      merged._id = merged._id ?? pickString(source._id, source.id, source.userId);
      merged.phone = merged.phone ?? pickString(source.phone, fallbackPhone);
      merged.name = merged.name ?? pickString(source.name);
      merged.address = merged.address ?? pickString(source.address);
      merged.gender =
        merged.gender ?? normalizeGenderValue(source.gender ?? source.sex);
      merged.profileImage =
        merged.profileImage ??
        pickString(
          source.profileImage,
          source.profile_image,
          source.imageUrl,
          source.image_url,
          source.avatar,
          source.photo,
          source.image,
        );

      if (source.isVerified !== undefined || source.is_verified !== undefined) {
        merged.isVerified = Boolean(source.isVerified ?? source.is_verified);
      }
    }
  }

  return merged;
};

export const parseFetchProfileResponse = (
  payload: unknown,
  fallbackUser: UserProfile,
): UserProfile => {
  const records = collectRecords(payload);
  const parsedUser = extractUser(records, fallbackUser.phone);
  const profileFields = extractProfileFields(records, fallbackUser.phone);
  const profileImagePath =
    extractProfileImagePath(records) ??
    parsedUser?.profileImage ??
    profileFields.profileImage ??
    fallbackUser.profileImage;

  return {
    ...fallbackUser,
    ...profileFields,
    ...parsedUser,
    _id: parsedUser?._id ?? profileFields._id ?? fallbackUser._id,
    phone: parsedUser?.phone ?? profileFields.phone ?? fallbackUser.phone,
    name: parsedUser?.name ?? profileFields.name ?? fallbackUser.name,
    address: parsedUser?.address ?? profileFields.address ?? fallbackUser.address,
    gender:
      normalizeGenderValue(parsedUser?.gender) ??
      normalizeGenderValue(profileFields.gender) ??
      fallbackUser.gender,
    profileImage: profileImagePath,
    isVerified:
      parsedUser?.isVerified ?? profileFields.isVerified ?? fallbackUser.isVerified ?? true,
  };
};
