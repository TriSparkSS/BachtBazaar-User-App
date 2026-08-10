import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { CommonActions, useNavigationState } from '@react-navigation/native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePendingDeliveryRequest } from '../context/PendingDeliveryRequestContext';
import { colors, fonts } from '../helpers/styles';
import { navigationRef } from '../navigation/navigationService';

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

/**
 * Sticky app-wide banner while a delivery request is pending acceptance
 * (driven by GET /delivery/user/delivery-orders waiting statuses).
 * Sits at the bottom of the main stack (above any future tab bar / safe area).
 * Hidden on Request Sent / Accepted / Order Detail — those screens already show waiting UI + Cancel.
 */
const WaitingForRequestBanner = () => {
  const insets = useSafeAreaInsets();
  const { pendingRequest } = usePendingDeliveryRequest();
  // Banner is a sibling of MainStackNav (not inside it), but MainStack is a root
  // screen — so this hooks the root NavigationContext and re-renders on nested changes.
  const activeRoute = useNavigationState(state => getActiveRouteName(state));

  if (!pendingRequest) {
    return null;
  }

  if (activeRoute && HIDDEN_ON_ROUTES.has(activeRoute)) {
    return null;
  }

  const openSentScreen = () => {
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
      style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      <TouchableOpacity
        style={styles.banner}
        activeOpacity={0.9}
        onPress={openSentScreen}
        accessibilityRole="button"
        accessibilityLabel="Waiting for request to accept. Tap to open request status.">
        <View style={styles.iconWrap}>
          <MaterialCommunityIcons name="clock-outline" size={18} color={colors.primary} />
        </View>
        <Text style={styles.text} numberOfLines={1}>
          Waiting for request to accept
        </Text>
        <MaterialCommunityIcons name="chevron-right" size={20} color={colors.primary} />
      </TouchableOpacity>
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
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    shadowColor: '#1B2430',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 6,
  },
  iconWrap: {
    width: 28,
    height: 28,
    borderRadius: 10,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    flex: 1,
    fontSize: 13,
    color: colors.text,
    fontFamily: fonts.BOLD,
  },
});
