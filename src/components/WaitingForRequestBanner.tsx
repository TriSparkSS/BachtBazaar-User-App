import React, { useMemo } from 'react';
import {
  Image,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { CommonActions, useNavigationState } from '@react-navigation/native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  getBannerStatusLabel,
  usePendingDeliveryRequest,
} from '../context/PendingDeliveryRequestContext';
import { colors, fonts } from '../helpers/styles';
import { navigationRef } from '../navigation/navigationService';
import { isWaitingDeliveryStatus } from '../services/deliveryApi';
import { shopApi } from '../services/shopApi';

const HIDDEN_ON_ROUTES = new Set([
  'RequestDeliverySent',
  'RequestDeliveryAccepted',
  'DeliveryOrderDetail',
]);

const getActiveRouteName = (state: unknown): string | undefined => {
  if (!state || typeof state !== 'object') {
    return undefined;
  }
  const navState = state as {
    index?: number;
    routes?: Array<{ name?: string; state?: unknown }>;
  };
  const index = typeof navState.index === 'number' ? navState.index : 0;
  const route = navState.routes?.[index];
  if (!route) {
    return undefined;
  }
  if (route.state) {
    return getActiveRouteName(route.state);
  }
  return typeof route.name === 'string' ? route.name : undefined;
};

const formatItemSubtitle = (quantity?: string): string => {
  const n = Number(String(quantity ?? '').replace(/[^\d.]/g, ''));
  if (Number.isFinite(n) && n > 0) {
    return n === 1 ? '1 item' : `${Math.trunc(n)} items`;
  }
  return '1 item';
};

/**
 * Swiggy-style floating chip while a delivery request is waiting or accepted.
 * Driven by GET /delivery/user/delivery-orders. Dismiss (X) persists per
 * orderId+status fingerprint until a new order or status update arrives.
 * Hidden on Request Sent / Accepted / Order Detail (Cancel overlap).
 */
const WaitingForRequestBanner = () => {
  const insets = useSafeAreaInsets();
  const { pendingRequest, bannerDismissed, dismissBanner } =
    usePendingDeliveryRequest();
  const activeRoute = useNavigationState(state => getActiveRouteName(state));

  const title = useMemo(() => {
    if (!pendingRequest) {
      return '';
    }
    return (
      pendingRequest.merchantName ||
      pendingRequest.shop?.name ||
      pendingRequest.productName ||
      pendingRequest.product?.title ||
      'Delivery request'
    );
  }, [pendingRequest]);

  const thumbnailUri = useMemo(() => {
    if (!pendingRequest) {
      return undefined;
    }
    const raw =
      pendingRequest.productThumbnail ||
      pendingRequest.product?.image ||
      pendingRequest.shop?.logo;
    return shopApi.resolveImageUrl(raw) ?? (raw || undefined);
  }, [pendingRequest]);

  const statusLabel = getBannerStatusLabel(pendingRequest?.status);
  const itemSubtitle = formatItemSubtitle(pendingRequest?.quantity);
  // Single-line pill copy only (no nested subtitle that forces wrap).
  const ctaText = isWaitingDeliveryStatus(pendingRequest?.status)
    ? statusLabel
    : `${statusLabel} · ${itemSubtitle}`;

  if (!pendingRequest || bannerDismissed) {
    return null;
  }

  if (activeRoute && HIDDEN_ON_ROUTES.has(activeRoute)) {
    return null;
  }

  const openOrder = () => {
    if (!navigationRef.isReady()) {
      return;
    }
    const orderId =
      pendingRequest.orderIds?.[0] || pendingRequest.requestId || '';
    if (!orderId) {
      return;
    }
    navigationRef.dispatch(
      CommonActions.navigate({
        name: 'MainStack',
        params: {
          screen: 'DeliveryOrderDetail',
          params: {
            orderId,
          },
        },
      }),
    );
  };

  return (
    <View
      pointerEvents="box-none"
      style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, 10) }]}>
      <View style={styles.chip}>
        <TouchableOpacity
          style={styles.mainPress}
          activeOpacity={0.92}
          onPress={openOrder}
          accessibilityRole="button"
          accessibilityLabel={`${title}. ${ctaText}. View order.`}>
          <View style={styles.thumbWrap}>
            {thumbnailUri ? (
              <Image source={{ uri: thumbnailUri }} style={styles.thumb} />
            ) : (
              <View style={styles.thumbFallback}>
                <MaterialCommunityIcons
                  name="storefront-outline"
                  size={20}
                  color={colors.primary}
                />
              </View>
            )}
          </View>

          <View style={styles.copy}>
            <Text style={styles.title} numberOfLines={1}>
              {title}
            </Text>
            <Text style={styles.link} numberOfLines={1}>
              View order {'>'}
            </Text>
          </View>

          <View style={styles.ctaPill}>
            <Text
              style={styles.ctaLabel}
              numberOfLines={1}
              ellipsizeMode="tail"
              adjustsFontSizeToFit={Platform.OS === 'android'}
              minimumFontScale={0.85}>
              {ctaText}
            </Text>
          </View>
        </TouchableOpacity>

        <View style={styles.divider} />

        <TouchableOpacity
          style={styles.dismissBtn}
          onPress={dismissBanner}
          hitSlop={{ top: 10, bottom: 10, left: 8, right: 10 }}
          accessibilityRole="button"
          accessibilityLabel="Dismiss delivery banner">
          <MaterialCommunityIcons name="close" size={18} color="#8A93A6" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default WaitingForRequestBanner;

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 12,
    zIndex: 50,
    elevation: 50,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 28,
    paddingLeft: 10,
    paddingRight: 4,
    paddingVertical: 8,
    minHeight: 64,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.14,
    shadowRadius: 14,
    elevation: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(15, 23, 42, 0.06)',
  },
  mainPress: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 0,
    gap: 10,
  },
  thumbWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
    backgroundColor: colors.primarySoft,
  },
  thumb: {
    width: '100%',
    height: '100%',
  },
  thumbFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: {
    flex: 1,
    flexShrink: 1,
    minWidth: 0,
    justifyContent: 'center',
    gap: 2,
  },
  title: {
    fontSize: 14,
    color: colors.text,
    fontFamily: fonts.BOLD,
  },
  link: {
    fontSize: 12,
    color: colors.primary,
    fontFamily: fonts.BOLD,
  },
  ctaPill: {
    backgroundColor: colors.primary,
    borderRadius: 22,
    paddingHorizontal: 14,
    paddingVertical: 10,
    minWidth: 96,
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaLabel: {
    fontSize: 13,
    color: colors.white,
    fontFamily: fonts.BOLD,
    flexShrink: 1,
  },
  divider: {
    width: StyleSheet.hairlineWidth,
    alignSelf: 'stretch',
    marginVertical: 10,
    marginLeft: 8,
    backgroundColor: '#D7DCE6',
  },
  dismissBtn: {
    width: 36,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
