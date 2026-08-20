import React from 'react';
import { ImageStyle, StyleProp, StyleSheet } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

export type AppIconName =
  | 'menu'
  | 'bell'
  | 'search'
  | 'qr'
  | 'google'
  | 'apple'
  | 'eye'
  | 'eye-off'
  | 'close'
  | 'phone'
  | 'location'
  | 'logout'
  | 'overview'
  | 'shop'
  | 'delivery'
  | 'discover-product'
  | 'offers'
  | 'wallet'
  | 'saving-summary'
  | 'target'
  | 'tips'
  | 'coupons'
  | 'saved-stores'
  | 'saved-products'
  | 'password'
  | 'edit-profile'
  | 'notification'
  | 'delete-account'
  | 'create-request'
  | 'reward'
  | 'nearby-coupons'
  | 'scan-save'
  | 'invite-earn'
  | 'saved-offers'
  | 'hot-deals'
  | 'jewelry'
  | 'grocery'
  | 'food'
  | 'privacy-policy'
  | 'terms-conditions'
  | 'help-support'
  | 'faq'
  | 'video-guide'
  | 'help-articles'
  | 'contact'
  | 'language'
  | 'bachat-circle';

const iconMap: Record<AppIconName, string> = {
  menu: 'menu',
  bell: 'bell-outline',
  search: 'magnify',
  qr: 'qrcode',
  google: 'google',
  apple: 'apple',
  eye: 'eye-outline',
  'eye-off': 'eye-off-outline',
  close: 'close',
  phone: 'phone-outline',
  location: 'map-marker-outline',
  logout: 'logout',
  overview: 'view-dashboard-outline',
  shop: 'store-outline',
  delivery: 'truck-delivery-outline',
  'discover-product': 'package-variant',
  offers: 'tag-multiple-outline',
  wallet: 'wallet-outline',
  'saving-summary': 'chart-line',
  target: 'bullseye-arrow',
  tips: 'lightbulb-on-outline',
  coupons: 'ticket-percent-outline',
  'saved-stores': 'store-marker-outline',
  'saved-products': 'bookmark-box-outline',
  password: 'lock-outline',
  'edit-profile': 'account-edit-outline',
  notification: 'bell-badge-outline',
  'delete-account': 'delete-outline',
  'create-request': 'handshake-outline',
  reward: 'gift-outline',
  'nearby-coupons': 'map-marker-radius-outline',
  'scan-save': 'qrcode-scan',
  'invite-earn': 'account-plus-outline',
  'saved-offers': 'bookmark-outline',
  'hot-deals': 'fire',
  jewelry: 'diamond-stone',
  grocery: 'cart-outline',
  food: 'food-outline',
  'privacy-policy': 'shield-lock-outline',
  'terms-conditions': 'file-document-outline',
  'help-support': 'headset',
  faq: 'help-circle-outline',
  'video-guide': 'play-circle-outline',
  'help-articles': 'book-open-page-variant-outline',
  contact: 'email-outline',
  language: 'translate',
  'bachat-circle': 'account-group-outline',
};

interface AppIconProps {
  name: AppIconName;
  size?: number;
  color?: string;
  style?: StyleProp<ImageStyle>;
}

const AppIcon: React.FC<AppIconProps> = ({
  name,
  size = 20,
  color = '#202843',
  style,
}) => {
  const flatStyle = StyleSheet.flatten(style);
  const iconColor =
    (flatStyle?.tintColor as string | undefined) ?? color;

  return (
    <MaterialCommunityIcons
      name={iconMap[name]}
      size={size}
      color={iconColor}
    />
  );
};

export default AppIcon;
