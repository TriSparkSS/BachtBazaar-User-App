import React from 'react';
import { Image, ImageStyle, StyleProp } from 'react-native';

const logoSource = require('../assets/image/BachatBazaarLogo.png');

type AppLogoProps = {
  width?: number;
  height?: number;
  size?: number;
  style?: StyleProp<ImageStyle>;
};

const AppLogo = ({ width, height, size = 72, style }: AppLogoProps) => (
  <Image
    source={logoSource}
    style={[{ width: width ?? size, height: height ?? size }, style]}
    resizeMode="contain"
    accessibilityRole="image"
    accessibilityLabel="Bachat Bazaar"
  />
);

export default AppLogo;
