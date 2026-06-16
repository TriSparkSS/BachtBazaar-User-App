import { UserProfile } from '../types/auth';

export type GenderUi = 'Male' | 'Female' | 'Other';

export const mapGenderToUi = (value?: string | null): GenderUi => {
  const normalized = value?.trim().toLowerCase();

  if (normalized === 'female') {
    return 'Female';
  }

  if (normalized === 'other') {
    return 'Other';
  }

  return 'Male';
};

export const mapGenderToApi = (value: GenderUi): UserProfile['gender'] =>
  value.toLowerCase() as UserProfile['gender'];
