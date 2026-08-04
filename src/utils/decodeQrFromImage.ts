// eslint-disable-next-line @typescript-eslint/no-require-imports
const jsQR = require('jsqr') as (
  data: Uint8ClampedArray,
  width: number,
  height: number,
  options?: { inversionAttempts?: 'dontInvert' | 'onlyInvert' | 'attemptBoth' | 'invertFirst' },
) => { data: string } | null;

// eslint-disable-next-line @typescript-eslint/no-require-imports
const jpeg = require('jpeg-js') as {
  decode: (
    data: Uint8Array,
    options?: { useTArray?: boolean; formatAsRGBA?: boolean },
  ) => { data: Uint8Array; width: number; height: number };
};

const base64ToUint8Array = (base64: string): Uint8Array => {
  const normalized = base64.includes(',') ? base64.split(',').pop() || '' : base64;
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
  let outputLength = Math.floor((normalized.length * 3) / 4);
  if (normalized.endsWith('==')) {
    outputLength -= 2;
  } else if (normalized.endsWith('=')) {
    outputLength -= 1;
  }

  const bytes = new Uint8Array(outputLength);
  let byteIndex = 0;

  for (let i = 0; i < normalized.length; i += 4) {
    const enc1 = chars.indexOf(normalized.charAt(i));
    const enc2 = chars.indexOf(normalized.charAt(i + 1));
    const enc3 = chars.indexOf(normalized.charAt(i + 2));
    const enc4 = chars.indexOf(normalized.charAt(i + 3));

    bytes[byteIndex++] = (enc1 << 2) | (enc2 >> 4);
    if (enc3 !== 64 && byteIndex < outputLength) {
      bytes[byteIndex++] = ((enc2 & 15) << 4) | (enc3 >> 2);
    }
    if (enc4 !== 64 && byteIndex < outputLength) {
      bytes[byteIndex++] = ((enc3 & 3) << 6) | enc4;
    }
  }

  return bytes;
};

export const decodeQrFromBase64Image = (base64?: string | null): string | null => {
  if (!base64?.trim()) {
    return null;
  }

  try {
    const bytes = base64ToUint8Array(base64.trim());
    const decoded = jpeg.decode(bytes, { useTArray: true, formatAsRGBA: true });
    const code = jsQR(new Uint8ClampedArray(decoded.data), decoded.width, decoded.height, {
      inversionAttempts: 'attemptBoth',
    });
    return code?.data?.trim() || null;
  } catch {
    return null;
  }
};
