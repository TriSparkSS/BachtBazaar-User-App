import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { colors, fonts } from '../../../helpers/styles';
import { MOCK_NOTIFIED_SHOPS } from '../../../utils/createRequestMocks';

type CreateRequestSearchingViewProps = {
  product: string;
  onComplete: () => void;
};

const PRIMARY = colors.primary;

const CreateRequestSearchingView: React.FC<CreateRequestSearchingViewProps> = ({
  product,
  onComplete,
}) => {
  const [visibleCount, setVisibleCount] = useState(1);
  const [secondsLeft, setSecondsLeft] = useState(20 * 60);
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1.08,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  useEffect(() => {
    const revealTimer = setInterval(() => {
      setVisibleCount(current => {
        if (current >= MOCK_NOTIFIED_SHOPS.length) {
          clearInterval(revealTimer);
          return current;
        }
        return current + 1;
      });
    }, 700);
    return () => clearInterval(revealTimer);
  }, []);

  useEffect(() => {
    const countdown = setInterval(() => {
      setSecondsLeft(current => Math.max(0, current - 1));
    }, 1000);
    return () => clearInterval(countdown);
  }, []);

  useEffect(() => {
    if (visibleCount < MOCK_NOTIFIED_SHOPS.length) {
      return;
    }
    const finishTimer = setTimeout(onComplete, 1200);
    return () => clearTimeout(finishTimer);
  }, [visibleCount, onComplete]);

  const minutes = Math.floor(secondsLeft / 60);
  const notified = MOCK_NOTIFIED_SHOPS.length;

  return (
    <View style={styles.root}>
      <View style={styles.bgBlobTop} />
      <View style={styles.bgBlobBottom} />

      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.body}>
          <Animated.View style={[styles.ring, { transform: [{ scale: pulse }] }]}>
            <View style={styles.circle}>
              <MaterialCommunityIcons name="magnify" size={46} color={colors.white} />
            </View>
          </Animated.View>

          <Text style={styles.title}>Finding Best Deals</Text>
          <Text style={styles.subtitle}>
            Searching for <Text style={styles.productName}>{product}</Text> from nearby shops...
          </Text>

          <View style={styles.pill}>
            <View style={styles.pillDot} />
            <Text style={styles.pillText}>{notified} shops notified</Text>
          </View>

          <View style={styles.listCard}>
            {MOCK_NOTIFIED_SHOPS.map((shop, index) => {
              const done = index < visibleCount;
              return (
                <View
                  key={shop}
                  style={[styles.row, index < MOCK_NOTIFIED_SHOPS.length - 1 && styles.rowBorder]}>
                  <View style={styles.rowLeft}>
                    {done ? (
                      <MaterialCommunityIcons name="check-circle" size={20} color="#22A45A" />
                    ) : (
                      <View style={styles.pendingDot} />
                    )}
                    <Text style={[styles.shop, !done && styles.shopPending]}>{shop}</Text>
                  </View>
                  {!done ? <ActivityIndicator size="small" color="#C5CAD6" /> : null}
                </View>
              );
            })}
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerMain}>
            {visibleCount} of {notified} responses received
          </Text>
          <Text style={styles.footerSub}>Request expires in {minutes} minutes</Text>
        </View>
      </SafeAreaView>
    </View>
  );
};

export default CreateRequestSearchingView;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F7F9FC',
  },
  bgBlobTop: {
    position: 'absolute',
    top: -80,
    right: -40,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: colors.primarySoft,
  },
  bgBlobBottom: {
    position: 'absolute',
    bottom: 60,
    left: -70,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: colors.primarySoft,
    opacity: 0.55,
  },
  safe: {
    flex: 1,
  },
  body: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 56,
  },
  ring: {
    width: 124,
    height: 124,
    borderRadius: 62,
    borderWidth: 3,
    borderColor: colors.primaryBorder,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
    backgroundColor: 'rgba(54,111,224,0.06)',
  },
  circle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: PRIMARY,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: PRIMARY,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.35,
    shadowRadius: 18,
    elevation: 8,
  },
  title: {
    fontSize: 26,
    color: colors.text,
    fontFamily: fonts.BOLD,
    marginBottom: 10,
    letterSpacing: -0.2,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 21,
    color: '#7A8499',
    textAlign: 'center',
    fontFamily: fonts.BOLD,
    marginBottom: 18,
    paddingHorizontal: 8,
  },
  productName: {
    color: colors.text,
    fontFamily: fonts.BOLD,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.white,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 9,
    marginBottom: 28,
    borderWidth: 1.5,
    borderColor: colors.primaryBorder,
  },
  pillDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: PRIMARY,
  },
  pillText: {
    fontSize: 13,
    color: PRIMARY,
    fontFamily: fonts.BOLD,
  },
  listCard: {
    width: '100%',
    borderRadius: 20,
    backgroundColor: colors.white,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#E8EDF5',
    shadowColor: '#1B2430',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 3,
  },
  row: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#EEF1F6',
  },
  rowLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  pendingDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#D5DBE6',
  },
  shop: {
    fontSize: 15,
    color: colors.text,
    fontFamily: fonts.BOLD,
  },
  shopPending: {
    color: '#A0A8B8',
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 20,
    paddingTop: 12,
    alignItems: 'center',
    gap: 4,
  },
  footerMain: {
    fontSize: 13,
    color: colors.text,
    fontFamily: fonts.BOLD,
  },
  footerSub: {
    fontSize: 12,
    color: '#8A93A6',
    fontFamily: fonts.BOLD,
  },
});
