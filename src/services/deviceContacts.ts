import { PermissionsAndroid, Platform } from 'react-native';
import Contacts from 'react-native-contacts';

export type DeviceContactInput = {
  name: string;
  phone: string;
};

const normalizeDigits = (value: string) => value.replace(/\D/g, '');

/**
 * Request READ_CONTACTS and return phone-book entries for contacts/sync.
 */
export const loadDeviceContactsForSync = async (): Promise<DeviceContactInput[]> => {
  if (Platform.OS === 'android') {
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.READ_CONTACTS,
      {
        title: 'Contacts permission',
        message:
          'Bachat Bazaar needs contacts access to find registered friends for your circle.',
        buttonPositive: 'Allow',
        buttonNegative: 'Deny',
      },
    );
    if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
      throw new Error('Contacts permission is required to find registered users.');
    }
  } else {
    const permission = await Contacts.requestPermission();
    if (permission !== 'authorized' && permission !== 'limited') {
      throw new Error('Contacts permission is required to find registered users.');
    }
  }

  const all = await Contacts.getAll();
  const byPhone = new Map<string, DeviceContactInput>();

  for (const contact of all) {
    const name =
      [contact.givenName, contact.familyName].filter(Boolean).join(' ').trim() ||
      contact.displayName?.trim() ||
      'Contact';

    for (const phoneEntry of contact.phoneNumbers || []) {
      const phone = phoneEntry.number?.trim();
      if (!phone) {
        continue;
      }
      const digits = normalizeDigits(phone);
      if (digits.length < 10) {
        continue;
      }
      const key = digits.slice(-10);
      if (!byPhone.has(key)) {
        byPhone.set(key, { name, phone });
      }
    }
  }

  return Array.from(byPhone.values());
};
