import { Linking } from 'react-native';

export const normalizeDialNumber = (raw?: string | null): string | undefined => {
  if (!raw) {
    return undefined;
  }

  const cleaned = raw.trim().replace(/[^\d+]/g, '');
  if (!cleaned) {
    return undefined;
  }

  return cleaned;
};

export const toWhatsAppDigits = (raw?: string | null): string | undefined => {
  if (!raw) {
    return undefined;
  }

  let digits = raw.replace(/\D/g, '');
  if (!digits) {
    return undefined;
  }

  // Indian 10-digit mobiles → add country code for WhatsApp
  if (digits.length === 10) {
    digits = `91${digits}`;
  }

  return digits;
};

export const openPhoneDialer = async (rawPhone?: string | null) => {
  const dialNumber = normalizeDialNumber(rawPhone);
  if (!dialNumber) {
    throw new Error('Phone number is not available for this merchant.');
  }

  await Linking.openURL(`tel:${dialNumber}`);
};

export const openChatWithNumber = async (
  rawPhone?: string | null,
  message?: string,
) => {
  const whatsappDigits = toWhatsAppDigits(rawPhone);
  const dialNumber = normalizeDialNumber(rawPhone);

  if (!whatsappDigits && !dialNumber) {
    throw new Error('Mobile number is not available for chat.');
  }

  const textQuery = message ? `?text=${encodeURIComponent(message)}` : '';
  const candidates = [
    whatsappDigits ? `https://wa.me/${whatsappDigits}${textQuery}` : null,
    whatsappDigits
      ? `whatsapp://send?phone=${whatsappDigits}${
          message ? `&text=${encodeURIComponent(message)}` : ''
        }`
      : null,
    dialNumber
      ? `sms:${dialNumber}${message ? `?body=${encodeURIComponent(message)}` : ''}`
      : null,
  ].filter(Boolean) as string[];

  let lastError: unknown;
  for (const url of candidates) {
    try {
      await Linking.openURL(url);
      return;
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error('Could not open WhatsApp or Messages for this number.');
};
