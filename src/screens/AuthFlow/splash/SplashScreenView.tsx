import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import AnimatedScreen from '../../../components/AnimatedScreen';
import LogoSVG from '../../../assets/image/BachatBazaarLogo.svg';
import VectorSVG from '../../../assets/image/Vector.svg';
import { colors, fonts } from '../../../helpers/styles';

const SplashScreenView = () => {
  return (
    <View style={styles.container}>
      <View style={styles.topRightVector}>
        <VectorSVG width={170} height={180} />
      </View>

      <AnimatedScreen style={styles.content}>
        <LogoSVG width={120} height={120} />
        <View style={styles.titleRow}>
          <Text style={styles.titleBachat}>Bachat</Text>
          <Text style={styles.titleBazaar}> Bazaar</Text>
        </View>
        <Text style={styles.subtitle}>Discover Local Deals Near You</Text>
      </AnimatedScreen>
    </View>
  );
};

export default SplashScreenView;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  topRightVector: {
    position: 'absolute',
    top: 40,
    right: 0,
    opacity: 0.55,
  },
  content: {
    alignItems: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    marginTop: 12,
  },
  titleBachat: {
    fontSize: 30,
    fontFamily: fonts.BOLD,
    color: colors.primary,
  },
  titleBazaar: {
    fontSize: 30,
    fontFamily: fonts.BOLD,
    color: colors.primary,
  },
  subtitle: {
    fontSize: 15,
    color: colors.text,
    fontFamily: fonts.BOLD,
    marginTop: 6,
  },
});
