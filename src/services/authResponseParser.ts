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
    gender: value.gender as UserProfile['gender'],
    address: pickString(value.address),
    profileImage: pickString(value.profileImage),
    isVerified: Boolean(value.isVerified ?? true),
    createdAt: pickString(value.createdAt),
    updatedAt: pickString(value.updatedAt),
  };
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
