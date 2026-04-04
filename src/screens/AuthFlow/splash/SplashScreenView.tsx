import { View, StyleSheet, Dimensions } from 'react-native';
import React from 'react';
import SplashSVG from '../../../assets/image/splash.svg';

const { width, height } = Dimensions.get('window');

const SplashScreenView = () => {
  return (
    <View style={styles.container}>
      <SplashSVG 
        width={width} 
        height={height} 
        preserveAspectRatio="xMidYMid slice" 
      />
    </View>
  );
};

export default SplashScreenView;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
});
