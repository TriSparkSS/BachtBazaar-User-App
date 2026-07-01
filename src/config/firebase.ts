import googleServices from '../../android/app/google-services.json';

type OAuthClient = {
  client_id?: string;
  client_type?: number;
};

const pickWebClientId = (oauthClients?: OAuthClient[]) =>
  oauthClients?.find(client => client.client_type === 3)?.client_id?.trim();

/**
 * Optional override when `google-services.json` has empty `oauth_client` entries.
 * Firebase Console → Authentication → Sign-in method → Google → Web client ID.
 */
export const GOOGLE_WEB_CLIENT_ID_OVERRIDE = '921834163028-cao4is9obbqoom8jh1jd9hppr21ad991.apps.googleusercontent.com';

const extractWebClientIdFromGoogleServices = (): string | undefined => {
  const clients = googleServices?.client;
  if (!Array.isArray(clients)) {
    return undefined;
  }

  for (const client of clients) {
    const fromOAuth = pickWebClientId(client.oauth_client as OAuthClient[] | undefined);
    if (fromOAuth) {
      return fromOAuth;
    }

    const otherPlatform =
      client.services?.appinvite_service?.other_platform_oauth_client as
        | OAuthClient[]
        | undefined;
    const fromOtherPlatform = pickWebClientId(otherPlatform);
    if (fromOtherPlatform) {
      return fromOtherPlatform;
    }
  }

  return undefined;
};

export const getGoogleWebClientId = (): string => {
  const override = GOOGLE_WEB_CLIENT_ID_OVERRIDE.trim();
  if (override) {
    return override;
  }

  const fromGoogleServices = extractWebClientIdFromGoogleServices();
  if (fromGoogleServices) {
    return fromGoogleServices;
  }

  throw new Error(
    'Google Sign-In needs a Web client ID. Add your debug/release SHA-1 in Firebase Console, download the updated google-services.json, or set GOOGLE_WEB_CLIENT_ID_OVERRIDE in src/config/firebase.ts.',
  );
};
