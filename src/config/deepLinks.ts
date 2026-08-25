export const DEEP_LINK_SCHEME = 'bachatbazaar';
export const DEEP_LINK_HOST = 'bachatbazaar.tech';
export const DEEP_LINK_HTTPS_ORIGIN = `https://${DEEP_LINK_HOST}`;

export type ParsedDeepLink =
  | { type: 'invite'; code: string }
  | { type: 'offer'; offerId: string; shopId?: string };

export const buildInviteDeepLink = (code: string): string => {
  const normalized = code.trim();
  return `${DEEP_LINK_HTTPS_ORIGIN}/invite?code=${encodeURIComponent(normalized)}`;
};

export const buildOfferDeepLink = (offerId: string, shopId?: string): string => {
  const id = offerId.trim();
  const base = `${DEEP_LINK_HTTPS_ORIGIN}/offer/${encodeURIComponent(id)}`;
  const shop = shopId?.trim();
  return shop ? `${base}?shopId=${encodeURIComponent(shop)}` : base;
};

const pathSegments = (pathname: string): string[] =>
  pathname
    .replace(/^\/+/, '')
    .split('/')
    .filter(Boolean)
    .map(segment => decodeURIComponent(segment));

/**
 * Parse invite/offer deep links from https://bachatbazaar.tech/... or bachatbazaar://...
 */
export const parseDeepLink = (rawUrl?: string | null): ParsedDeepLink | null => {
  if (!rawUrl?.trim()) {
    return null;
  }

  try {
    let normalized = rawUrl.trim();

    // Custom scheme → URL-parseable https form while keeping path/query.
    if (normalized.startsWith(`${DEEP_LINK_SCHEME}://`)) {
      normalized = normalized.replace(
        `${DEEP_LINK_SCHEME}://`,
        `${DEEP_LINK_HTTPS_ORIGIN}/`,
      );
    }

    const url = new URL(normalized);
    const host = url.hostname.toLowerCase();
    if (
      host &&
      host !== DEEP_LINK_HOST &&
      host !== 'www.bachatbazaar.tech' &&
      host !== 'localhost'
    ) {
      // Allow custom-scheme rewritten URLs (hostname = bachatbazaar.tech).
      // Reject unrelated hosts.
      return null;
    }

    const segments = pathSegments(url.pathname);
    const first = segments[0]?.toLowerCase();

    if (first === 'invite') {
      const code =
        url.searchParams.get('code')?.trim() ||
        url.searchParams.get('referralCode')?.trim() ||
        segments[1]?.trim() ||
        '';
      if (!code) {
        return null;
      }
      return { type: 'invite', code };
    }

    if (first === 'offer') {
      const offerId =
        segments[1]?.trim() ||
        url.searchParams.get('offerId')?.trim() ||
        '';
      if (!offerId) {
        return null;
      }
      const shopId =
        url.searchParams.get('shopId')?.trim() ||
        url.searchParams.get('shop_id')?.trim() ||
        undefined;
      return { type: 'offer', offerId, shopId };
    }

    return null;
  } catch {
    return null;
  }
};
