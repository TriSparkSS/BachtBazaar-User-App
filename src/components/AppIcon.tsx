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
  | 'reward'
  | 'nearby-coupons'
  | 'scan-save'
  | 'invite-earn'
  | 'saved-offers'
  | 'hot-deals'
  | 'jewelry'
  | 'grocery'
  | 'food';

const iconMap: Record<AppIconName, string> = {
  menu: 'menu',
  bell: 'bell-outline',
  search: 'magnify',
  qr: 'qrcode-scan',
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
  reward: 'gift-outline',
  'nearby-coupons': 'map-marker-radius-outline',
  'scan-save': 'qrcode-scan',
  'invite-earn': 'account-plus-outline',
  'saved-offers': 'bookmark-outline',
  'hot-deals': 'fire',
  jewelry: 'diamond-stone',
  grocery: 'cart-outline',
  food: 'food-outline',
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
