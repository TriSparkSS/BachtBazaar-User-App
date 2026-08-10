import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  BackHandler,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { CommonActions, useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import LinearGradient from 'react-native-linear-gradient';
import { useAppContext } from '../../../context/AppContext';
import { usePendingDeliveryRequest } from '../../../context/PendingDeliveryRequestContext';
import { colors, fonts } from '../../../helpers/styles';
import { MainStackParamList } from '../../../navigation/types';
import { showAppAlert } from '../../../services/appAlert';
import { bestRequestApi } from '../../../services/bestRequestApi';
import { deliveryApi } from '../../../services/deliveryApi';

const SCOOTER_IMAGE =
  'https://images.pexels.com/photos/4391470/pexels-photo-4391470.jpeg?auto=compress&cs=tinysrgb&dpr=1&w=600';

const DEFAULT_CANCEL_REASON = 'Order placed by mistake.';

const RequestDeliverySent = () => {
  const navigation =
    useNavigation<StackNavigationProp<MainStackParamList, 'RequestDeliverySent'>>();
  const route = useRoute();
  const params = route.params as MainStackParamList['RequestDeliverySent'];
  const { authToken } = useAppContext();
  const { pendingRequest, setPendingRequest, refreshPendingFromApi } =
    usePendingDeliveryRequest();
  const [isCancelling, setIsCancelling] = useState(false);
  const [isPolling, setIsPolling] = useState(true);
  const acceptedRef = useRef(false);

  const orderIds = useMemo(() => {
    const fromParams = (params.orderIds || []).map(id => String(id).trim()).filter(Boolean);
    if (fromParams.length > 0) {
      return fromParams;
    }
    const fromPending = (pendingRequest?.orderIds || [])
      .map(id => String(id).trim())
      .filter(Boolean);
    if (fromPending.length > 0) {
      return fromPending;
    }
    const fallback = String(params.requestId || '').trim();
    return fallback ? [fallback] : [];
  }, [params.orderIds, params.requestId, pendingRequest?.orderIds]);

  // Optimistic pending for app-wide banner, then sync from list API.
  useEffect(() => {
    const fromParams = (params.orderIds || [])
      .map(id => String(id).trim())
      .filter(Boolean);
    const syncIds =
      fromParams.length > 0
        ? fromParams
        : String(params.requestId || '').trim()
          ? [String(params.requestId).trim()]
          : [];

    setPendingRequest({
      shop: params.shop,
      product: params.product,
      requestId: params.requestId,
      orderIds: syncIds,
      address: params.address,
      mobile: params.mobile,
      note: params.note,
      itemPrice: params.itemPrice,
      deliveryFee: params.deliveryFee,
      platformFee: params.platformFee,
      totalAmount: params.totalAmount,
    });
    void refreshPendingFromApi();
  }, [
    params.address,
    params.deliveryFee,
    params.itemPrice,
    params.mobile,
    params.note,
    params.orderIds,
    params.platformFee,
    params.product,
    params.requestId,
    params.shop,
    params.totalAmount,
    refreshPendingFromApi,
    setPendingRequest,
  ]);

  // Block Android hardware back — use Cancel or X instead.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => sub.remove();
  }, []);

  const goHome = useCallback(() => {
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: 'BottomStack' }],
      }),
    );
  }, [navigation]);

  const openAccepted = useCallback(
    (orderId: string, _bidId?: string) => {
      if (acceptedRef.current) {
        return;
      }
      acceptedRef.current = true;
      void refreshPendingFromApi();
      const resolvedId =
        String(orderId || '').trim() ||
        orderIds[0] ||
        String(params.requestId || '').trim();
      if (resolvedId && !resolvedId.startsWith('#')) {
        navigation.replace('DeliveryOrderDetail', { orderId: resolvedId });
        return;
      }
      // Fallback when poll fabricates a display id — use real delivery order id.
      const realId = orderIds[0] || String(params.requestId || '').trim();
      if (realId) {
        navigation.replace('DeliveryOrderDetail', { orderId: realId });
      }
    },
    [navigation, orderIds, params.requestId, refreshPendingFromApi],
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
    if (orderIds.length === 0) {
      showAppAlert('Cancel failed', 'Missing delivery order id.');
      return;
    }

    showAppAlert('Cancel this request?', 'Do you want to cancel this delivery request?', [
      { text: 'Keep waiting', style: 'cancel' },
      {
        text: 'Cancel Request',
        style: 'destructive',
        onPress: async () => {
          try {
            setIsCancelling(true);
            let lastMessage = 'Your delivery request was cancelled.';
            for (const orderId of orderIds) {
              const response = await deliveryApi.cancelOrder(
                orderId,
                DEFAULT_CANCEL_REASON,
                authToken,
              );
              if (response.message) {
                lastMessage = response.message;
              }
            }
            await refreshPendingFromApi();
            showAppAlert('Cancelled', lastMessage);
            goHome();
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
          <View style={styles.headerSide} />
          <Text style={styles.headerTitle}>Request Sent</Text>
          <TouchableOpacity
            style={styles.headerSide}
            onPress={goHome}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Close and go to Home">
            <MaterialCommunityIcons name="close" size={22} color={colors.text} />
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <ScrollView
        style={styles.body}
        contentContainerStyle={styles.bodyContent}
        showsVerticalScrollIndicator={false}
        bounces={false}>
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
        </View>
      </ScrollView>

      <SafeAreaView edges={['bottom']} style={styles.footer}>
        <TouchableOpacity
          style={[styles.cancelBtn, isCancelling && styles.cancelBtnOff]}
          activeOpacity={0.88}
          disabled={isCancelling}
          onPress={handleCancel}
          accessibilityRole="button"
          accessibilityLabel="Cancel Request">
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
  headerSide: {
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
  },
  bodyContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingVertical: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hero: {
    width: 200,
    height: 200,
    borderRadius: 100,
    overflow: 'hidden',
    marginBottom: 24,
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
    marginBottom: 24,
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
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    // Extra bottom pad beyond SafeAreaView inset so Cancel stays clear if a
    // sticky overlay ever appears above the home indicator.
    paddingBottom: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E6EAF2',
    backgroundColor: colors.white,
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
