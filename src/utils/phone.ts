/** Mask a phone for display — keep last 4 digits only. */
export const maskPhoneNumber = (value?: string | null): string => {
  if (!value || !value.trim()) {
    return '';
  }

  const raw = value.trim();
  const digits = raw.replace(/\D/g, '');
  if (digits.length < 4) {
    return '****';
  }

  const last4 = digits.slice(-4);
  const hasCountry = digits.length > 10 || raw.includes('+');
  return hasCountry ? `+91 ******${last4}` : `******${last4}`;
};
