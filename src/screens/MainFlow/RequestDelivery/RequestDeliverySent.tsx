import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import LinearGradient from 'react-native-linear-gradient';
import { useAppContext } from '../../../context/AppContext';
import { colors, fonts } from '../../../helpers/styles';
import { MainStackParamList } from '../../../navigation/types';
import { showAppAlert } from '../../../services/appAlert';
import { bestRequestApi } from '../../../services/bestRequestApi';

const SCOOTER_IMAGE =
  'https://images.pexels.com/photos/4391470/pexels-photo-4391470.jpeg?auto=compress&cs=tinysrgb&dpr=1&w=600';

const RequestDeliverySent = () => {
  const navigation =
    useNavigation<StackNavigationProp<MainStackParamList, 'RequestDeliverySent'>>();
  const route = useRoute();
  const params = route.params as MainStackParamList['RequestDeliverySent'];
  const { authToken } = useAppContext();
  const [isCancelling, setIsCancelling] = useState(false);
  const [isPolling, setIsPolling] = useState(true);
  const acceptedRef = useRef(false);

  const openAccepted = useCallback(
    (orderId: string, bidId?: string) => {
      if (acceptedRef.current) {
        return;
      }
      acceptedRef.current = true;
      navigation.replace('RequestDeliveryAccepted', {
        shop: params.shop,
        product: params.product,
        requestId: params.requestId,
        orderId,
        deliveryFee: params.deliveryFee,
        eta: '30-40 mins',
        bidId,
      });
    },
    [navigation, params.deliveryFee, params.product, params.requestId, params.shop],
  );

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setInterval> | undefined;

    const poll = async () => {
      if (!authToken?.trim() || acceptedRef.current) {
        return;
      }
      try {
        const bids = await bestRequestApi.fetchBidsForRequest(params.requestId, authToken);
        if (cancelled || acceptedRef.current) {
          return;
        }
        const accepted =
          bids.find(bid => {
            const status = (bid.status || '').toLowerCase();
            return status.includes('accept') || status.includes('close');
          }) || bids[0];
        if (accepted) {
          const orderId = `#B${String(accepted._id || params.requestId)
            .replace(/[^a-zA-Z0-9]/g, '')
            .slice(-10)
            .toUpperCase()}`;
          openAccepted(orderId, accepted._id);
        }
      } catch {
        // Keep waiting UI if polling fails briefly.
      }
    };

    poll();
    timer = setInterval(poll, 5000);
    setIsPolling(true);

    return () => {
      cancelled = true;
      if (timer) {
        clearInterval(timer);
      }
    };
  }, [authToken, openAccepted, params.requestId]);

  const handleCancel = () => {
    if (!authToken?.trim()) {
      return;
    }

    showAppAlert('Cancel request?', 'Do you want to cancel this delivery request?', [
      { text: 'Keep waiting', style: 'cancel' },
      {
        text: 'Cancel Request',
        style: 'destructive',
        onPress: async () => {
          try {
            setIsCancelling(true);
            const response = await bestRequestApi.cancel(params.requestId, authToken);
            if (!response.success) {
              throw new Error(response.message || 'Could not cancel this request.');
            }
            showAppAlert('Cancelled', response.message || 'Your delivery request was cancelled.');
            navigation.popToTop();
          } catch (error) {
            showAppAlert(
              'Cancel failed',
              error instanceof Error ? error.message : 'Could not cancel this request.',
            );
          } finally {
            setIsCancelling(false);
          }
        },
      },
    ]);
  };

  return (
    <View style={styles.root}>
      <SafeAreaView edges={['top']} style={styles.headerSafe}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
            activeOpacity={0.85}>
            <MaterialCommunityIcons name="arrow-left" size={22} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Request Sent</Text>
          <View style={styles.backBtn} />
        </View>
      </SafeAreaView>

      <View style={styles.body}>
        <LinearGradient colors={['#EEF4FF', '#F8FBFF']} style={styles.hero}>
          <Image source={{ uri: SCOOTER_IMAGE }} style={styles.heroImage} resizeMode="cover" />
        </LinearGradient>

        <Text style={styles.title}>Request Sent!</Text>
        <Text style={styles.subtitle}>
          We have sent your delivery request to {params.shop.name}.
        </Text>

        <View style={styles.waitingCard}>
          {isPolling ? <ActivityIndicator size="small" color={colors.primary} /> : null}
          <Text style={styles.waitingTitle}>Waiting for response...</Text>
          <Text style={styles.waitingMeta}>Estimated response time: 2 Minutes</Text>
        </View>
      </View>

      <SafeAreaView edges={['bottom']} style={styles.footer}>
        <TouchableOpacity
          style={[styles.cancelBtn, isCancelling && styles.cancelBtnOff]}
          activeOpacity={0.88}
          disabled={isCancelling}
          onPress={handleCancel}>
          {isCancelling ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Text style={styles.cancelText}>Cancel Request</Text>
          )}
        </TouchableOpacity>
      </SafeAreaView>
    </View>
  );
};

export default RequestDeliverySent;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.white,
  },
  headerSafe: {
    backgroundColor: colors.white,
  },
  header: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  backBtn: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 17,
    color: colors.text,
    fontFamily: fonts.BOLD,
  },
  body: {
    flex: 1,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hero: {
    width: 220,
    height: 220,
    borderRadius: 110,
    overflow: 'hidden',
    marginBottom: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  title: {
    fontSize: 26,
    color: colors.text,
    fontFamily: fonts.BOLD,
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 21,
    color: colors.mutedText,
    fontFamily: fonts.BOLD,
    textAlign: 'center',
    marginBottom: 28,
    paddingHorizontal: 12,
  },
  waitingCard: {
    width: '100%',
    backgroundColor: '#F4F7FC',
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 16,
    alignItems: 'center',
    gap: 8,
  },
  waitingTitle: {
    fontSize: 15,
    color: colors.text,
    fontFamily: fonts.BOLD,
  },
  waitingMeta: {
    fontSize: 13,
    color: colors.mutedText,
    fontFamily: fonts.BOLD,
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  cancelBtn: {
    height: 52,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
  },
  cancelBtnOff: {
    opacity: 0.7,
  },
  cancelText: {
    color: colors.primary,
    fontSize: 15,
    fontFamily: fonts.BOLD,
  },
});
