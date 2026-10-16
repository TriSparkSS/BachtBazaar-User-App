const e164PhoneRegex = /^\+[1-9]\d{6,14}$/;

export const normalizePhoneNumber = (rawPhone: string) => {
  const digitsOnly = rawPhone.replace(/\D/g, '');

  if (!rawPhone.trim().startsWith('+') && digitsOnly.length === 10) {
    return `+91${digitsOnly}`;
  }

  const normalizedPhone = `+${digitsOnly}`;

  if (e164PhoneRegex.test(normalizedPhone)) {
    return normalizedPhone;
  }

  throw new Error('Please enter a valid international mobile number.');
};

export const looksLikeEmail = (value?: string | null): value is string =>
  Boolean(value?.trim() && value.includes('@'));

export const nationalPhoneDigits = (value?: string | null) => {
  const digits = (value ?? '').replace(/\D/g, '');

  if (digits.length === 12 && digits.startsWith('91')) {
    return digits.slice(2);
  }

  if (digits.length === 11 && digits.startsWith('0')) {
    return digits.slice(1);
  }

  return digits;
};

export const isValidDisplayPhone = (value?: string | null) => {
  if (!value?.trim() || looksLikeEmail(value)) {
    return false;
  }

  return nationalPhoneDigits(value).length === 10;
};

export const formatDisplayPhone = (value: string) => {
  const digits = nationalPhoneDigits(value);

  if (digits.length === 10) {
    return `+91 ${digits}`;
  }

  return value.trim().replace(/^(?:\+91[\s-]*)+/i, '+91 ').trim();
};

export const validatePhoneInput = (rawPhone: string) => {
  try {
    const normalizedPhone = normalizePhoneNumber(rawPhone);

    if (normalizedPhone.startsWith('+91')) {
      return /^\+91\d{10}$/.test(normalizedPhone);
    }

    return e164PhoneRegex.test(normalizedPhone);
  } catch {
    return false;
  }
};
