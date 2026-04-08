import React from 'react';
import { Image, ImageSourcePropType, ImageStyle, StyleProp } from 'react-native';

export type AppIconName =
  | 'menu'
  | 'bell'
  | 'search'
  | 'qr'
  | 'google'
  | 'apple'
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

const iconMap: Record<AppIconName, ImageSourcePropType> = {
  menu: require('../assets/icon/Icon.png'),
  bell: require('../assets/icon/SVG.png'),
  search: require('../assets/icon/search.png'),
  qr: require('../assets/icon/Image (1).png'),
  google: require('../assets/icon/google.png'),
  apple: require('../assets/icon/apple-logo-svgrepo-com 1.png'),
  close: require('../assets/icon/icons8-cancel-50 2.png'),
  phone: require('../assets/icon/phone-receiver-silhouette 1.png'),
  location: require('../assets/icon/store 1.png'),
  logout: require('../assets/icon/icons8-logout-24 (1) 1.png'),
  overview: require('../assets/icon/dashboard 1.png'),
  shop: require('../assets/icon/store 1.png'),
  delivery: require('../assets/icon/package-box 1.png'),
  'discover-product': require('../assets/icon/package 1.png'),
  offers: require('../assets/icon/discount 1.png'),
  wallet: require('../assets/icon/wallet-filled-money-tool 1.png'),
  'saving-summary': require('../assets/icon/lamp 1.png'),
  target: require('../assets/icon/icons8-target-64 1.png'),
  tips: require('../assets/icon/mail 1.png'),
  coupons: require('../assets/icon/coupon 1.png'),
  'saved-stores': require('../assets/icon/store 1.png'),
  'saved-products': require('../assets/icon/package 1.png'),
  password: require('../assets/icon/icons8-password-64 1.png'),
  'edit-profile': require('../assets/icon/edit-03.png'),
  notification: require('../assets/icon/SVG.png'),
  'delete-account': require('../assets/icon/Trash Can.png'),
  reward: require('../assets/icon/discount 1.png'),
  'nearby-coupons': require('../assets/icon/coupon 1.png'),
  'scan-save': require('../assets/icon/Image (1).png'),
  'invite-earn': require('../assets/icon/icons8-person-30 1.png'),
  'saved-offers': require('../assets/icon/Image (1) 1.png'),
  'hot-deals': require('../assets/icon/discount 1.png'),
  jewelry: require('../assets/icon/Image (1) 1.png'),
  grocery: require('../assets/icon/shopping-cart 1.png'),
  food: require('../assets/icon/package-box 1.png'),
};

interface AppIconProps {
  name: AppIconName;
  size?: number;
  style?: StyleProp<ImageStyle>;
}

const AppIcon: React.FC<AppIconProps> = ({ name, size = 20, style }) => (
  <Image
    source={iconMap[name]}
    style={[{ width: size, height: size, resizeMode: 'contain' }, style]}
  />
);

export default AppIcon;
