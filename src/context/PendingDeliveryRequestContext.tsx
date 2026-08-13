import React, {
  PropsWithChildren,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AppState, AppStateStatus } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAppContext } from './AppContext';
import {
  DeliveryOrderListItem,
  deliveryApi,
  isAcceptedDeliveryStatus,
  isBannerTrackableDeliveryStatus,
  isWaitingDeliveryStatus,
} from '../services/deliveryApi';
import { ShopProduct, ShopWithOffers } from '../types/shop';

const POLL_INTERVAL_MS = 45_000;
const BANNER_DISMISS_FINGERPRINT_KEY =
  '@bachatbazaar/delivery_banner_dismiss_fingerprint';

export type PendingDeliveryRequest = {
  shop?: ShopWithOffers;
  product?: ShopProduct;
  requestId: string;
  /** All delivery order ids still in banner-trackable statuses. */
  orderIds: string[];
  /** Primary order status (waiting / accepted / …). */
  status?: string;
  /** Normalized status per order id — used for dismiss fingerprint. */
  statusesByOrderId?: Record<string, string>;
  merchantName?: string;
  productName?: string;
  productThumbnail?: string;
  quantity?: string;
  address?: string;
  mobile?: string;
  note?: string;
  itemPrice?: number;
  deliveryFee?: number;
  platformFee?: number;
  totalAmount?: number;
};

type PendingDeliveryRequestContextValue = {
  pendingRequest: PendingDeliveryRequest | null;
  /** Optimistic local set (e.g. right after create). Prefer refreshPendingFromApi. */
  setPendingRequest: (value: PendingDeliveryRequest | null) => void;
  clearPendingRequest: () => void;
  /** Re-check GET /delivery/user/delivery-orders and sync banner state. */
  refreshPendingFromApi: () => Promise<void>;
  /**
   * True after user dismisses the waiting banner (X) for the current
   * orderId+status fingerprint (persisted in AsyncStorage).
   */
  bannerDismissed: boolean;
  /** Hide waiting banner locally — does not cancel the order. */
  dismissBanner: () => void;
};

const defaultValue: PendingDeliveryRequestContextValue = {
  pendingRequest: null,
  setPendingRequest: () => undefined,
  clearPendingRequest: () => undefined,
  refreshPendingFromApi: async () => undefined,
  bannerDismissed: false,
  dismissBanner: () => undefined,
};

const PendingDeliveryRequestContext =
  createContext<PendingDeliveryRequestContextValue>(defaultValue);

const parseMoney = (value?: string): number | undefined => {
  if (!value) {
    return undefined;
  }
  const num = Number(String(value).replace(/[^\d.-]/g, ''));
  return Number.isFinite(num) ? num : undefined;
};

const normalizeStatusKey = (status?: string | null): string =>
  String(status ?? '')
    .toLowerCase()
    .trim()
    .replace(/[\s-]+/g, '_') || 'unknown';

/** Stable key of tracked order ids + statuses. Changes when a new order or status appears. */
export const buildBannerDismissFingerprint = (
  request: PendingDeliveryRequest | null,
): string => {
  if (!request) {
    return '';
  }
  const ids = (
    request.orderIds?.length
      ? request.orderIds
      : request.requestId
        ? [request.requestId]
        : []
  )
    .map(id => String(id || '').trim())
    .filter(Boolean);
  if (ids.length === 0) {
    return '';
  }
  return ids
    .map(id => {
      const status =
        request.statusesByOrderId?.[id] || request.status || 'waiting';
      return `${id}:${normalizeStatusKey(status)}`;
    })
    .sort()
    .join('|');
};

const orderRecency = (order: DeliveryOrderListItem): number => {
  const raw = order.updatedAt || order.createdAt || '';
  const ts = Date.parse(raw);
  return Number.isFinite(ts) ? ts : 0;
};

/** Prefer waiting orders, then most recent accepted / trackable. */
const sortTrackableOrders = (
  orders: DeliveryOrderListItem[],
): DeliveryOrderListItem[] => {
  return [...orders].sort((a, b) => {
    const aWait = isWaitingDeliveryStatus(a.status) ? 0 : 1;
    const bWait = isWaitingDeliveryStatus(b.status) ? 0 : 1;
    if (aWait !== bWait) {
      return aWait - bWait;
    }
    return orderRecency(b) - orderRecency(a);
  });
};

const buildPendingFromTrackableOrders = (
  trackable: DeliveryOrderListItem[],
  previous: PendingDeliveryRequest | null,
): PendingDeliveryRequest => {
  const sorted = sortTrackableOrders(trackable);
  const orderIds = sorted
    .map(order => String(order.id || '').trim())
    .filter(Boolean);
  const primary = sorted[0];
  const statusesByOrderId: Record<string, string> = {};
  for (const order of sorted) {
    const id = String(order.id || '').trim();
    if (id) {
      statusesByOrderId[id] = normalizeStatusKey(order.status);
    }
  }
  const overlapsPrevious =
    previous != null &&
    orderIds.some(
      id => previous.orderIds?.includes(id) || previous.requestId === id,
    );

  const merchantName =
    primary?.merchantName ||
    (overlapsPrevious
      ? previous?.merchantName || previous?.shop?.name
      : undefined);
  const productName =
    primary?.productName ||
    (overlapsPrevious
      ? previous?.productName || previous?.product?.title
      : undefined);
  const productThumbnail =
    primary?.productThumbnail ||
    (overlapsPrevious
      ? previous?.productThumbnail ||
        previous?.product?.image ||
        previous?.shop?.logo
      : undefined);

  return {
    shop: overlapsPrevious ? previous?.shop : undefined,
    product: overlapsPrevious ? previous?.product : undefined,
    requestId: orderIds[0] || previous?.requestId || '',
    orderIds,
    status: primary?.status || (overlapsPrevious ? previous?.status : undefined),
    statusesByOrderId,
    merchantName,
    productName,
    productThumbnail,
    quantity:
      primary?.quantity ||
      (overlapsPrevious ? previous?.quantity : undefined),
    address: primary?.address || (overlapsPrevious ? previous?.address : undefined),
    mobile: primary?.phone || (overlapsPrevious ? previous?.mobile : undefined),
    note: primary?.note || (overlapsPrevious ? previous?.note : undefined),
    itemPrice:
      parseMoney(primary?.itemPrice) ??
      (overlapsPrevious ? previous?.itemPrice : undefined),
    deliveryFee:
      parseMoney(primary?.deliveryFee) ??
      (overlapsPrevious ? previous?.deliveryFee : undefined),
    totalAmount:
      parseMoney(primary?.totalAmount) ??
      (overlapsPrevious ? previous?.totalAmount : undefined),
    platformFee: overlapsPrevious ? previous?.platformFee : undefined,
  };
};

const enrichOptimisticPending = (
  value: PendingDeliveryRequest | null,
): PendingDeliveryRequest | null => {
  if (!value) {
    return null;
  }
  const orderIds = (
    value.orderIds?.length
      ? value.orderIds
      : value.requestId
        ? [value.requestId]
        : []
  )
    .map(id => String(id || '').trim())
    .filter(Boolean);
  const status = value.status || 'waiting';
  const statusesByOrderId: Record<string, string> = {
    ...(value.statusesByOrderId || {}),
  };
  for (const id of orderIds) {
    if (!statusesByOrderId[id]) {
      statusesByOrderId[id] = normalizeStatusKey(status);
    }
  }
  return {
    ...value,
    orderIds,
    status,
    statusesByOrderId,
    merchantName: value.merchantName || value.shop?.name,
    productName: value.productName || value.product?.title,
    productThumbnail:
      value.productThumbnail || value.product?.image || value.shop?.logo,
    quantity: value.quantity || '1',
  };
};

export const PendingDeliveryRequestProvider = ({ children }: PropsWithChildren) => {
  const { authToken } = useAppContext();
  const [pendingRequest, setPendingRequestState] = useState<PendingDeliveryRequest | null>(
    null,
  );
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const pendingRef = useRef<PendingDeliveryRequest | null>(null);
  const dismissFingerprintRef = useRef('');
  const refreshGenRef = useRef(0);

  const bannerFingerprint = useMemo(
    () => buildBannerDismissFingerprint(pendingRequest),
    [pendingRequest],
  );

  // Persist / restore dismiss keyed by orderId+status fingerprint.
  useEffect(() => {
    let cancelled = false;

    const syncDismissState = async () => {
      if (!bannerFingerprint) {
        dismissFingerprintRef.current = '';
        if (!cancelled) {
          setBannerDismissed(false);
        }
        return;
      }

      try {
        const stored = await AsyncStorage.getItem(BANNER_DISMISS_FINGERPRINT_KEY);
        if (cancelled) {
          return;
        }
        if (stored && stored === bannerFingerprint) {
          dismissFingerprintRef.current = bannerFingerprint;
          setBannerDismissed(true);
          return;
        }
        // Fingerprint changed (new order or new status) — show again and clear old dismiss.
        if (stored && stored !== bannerFingerprint) {
          await AsyncStorage.removeItem(BANNER_DISMISS_FINGERPRINT_KEY);
        }
        dismissFingerprintRef.current = '';
        if (!cancelled) {
          setBannerDismissed(false);
        }
      } catch {
        if (!cancelled) {
          setBannerDismissed(false);
        }
      }
    };

    void syncDismissState();
    return () => {
      cancelled = true;
    };
  }, [bannerFingerprint]);

  useEffect(() => {
    pendingRef.current = pendingRequest;
  }, [pendingRequest]);

  const setPendingRequest = useCallback((value: PendingDeliveryRequest | null) => {
    const next = enrichOptimisticPending(value);
    pendingRef.current = next;
    setPendingRequestState(next);
  }, []);

  const clearPendingRequest = useCallback(() => {
    pendingRef.current = null;
    setPendingRequestState(null);
  }, []);

  const dismissBanner = useCallback(() => {
    const fingerprint =
      dismissFingerprintRef.current ||
      buildBannerDismissFingerprint(pendingRef.current);
    if (!fingerprint) {
      setBannerDismissed(true);
      return;
    }
    dismissFingerprintRef.current = fingerprint;
    setBannerDismissed(true);
    void AsyncStorage.setItem(BANNER_DISMISS_FINGERPRINT_KEY, fingerprint).catch(
      () => undefined,
    );
  }, []);

  const refreshPendingFromApi = useCallback(async () => {
    const token = authToken?.trim();
    if (!token) {
      pendingRef.current = null;
      setPendingRequestState(null);
      return;
    }

    const gen = ++refreshGenRef.current;
    try {
      const list = await deliveryApi.fetchDeliveryOrders(token);
      if (gen !== refreshGenRef.current) {
        return;
      }
      const trackable = list.filter(order =>
        isBannerTrackableDeliveryStatus(order.status),
      );
      if (trackable.length === 0) {
        pendingRef.current = null;
        setPendingRequestState(null);
        return;
      }
      const next = buildPendingFromTrackableOrders(trackable, pendingRef.current);
      pendingRef.current = next;
      setPendingRequestState(next);
    } catch {
      // Keep last known state on transient network failures.
    }
  }, [authToken]);

  // App load / MainStack mount / auth change
  useEffect(() => {
    refreshPendingFromApi();
  }, [refreshPendingFromApi]);

  // Re-check when app returns to foreground
  useEffect(() => {
    const onChange = (state: AppStateStatus) => {
      if (state === 'active') {
        refreshPendingFromApi();
      }
    };
    const sub = AppState.addEventListener('change', onChange);
    return () => sub.remove();
  }, [refreshPendingFromApi]);

  // Poll while banner-worthy pending exists so status/dismiss fingerprint can update
  useEffect(() => {
    if (!pendingRequest) {
      return;
    }
    const timer = setInterval(() => {
      refreshPendingFromApi();
    }, POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [pendingRequest, refreshPendingFromApi]);

  const value = useMemo(
    () => ({
      pendingRequest,
      setPendingRequest,
      clearPendingRequest,
      refreshPendingFromApi,
      bannerDismissed,
      dismissBanner,
    }),
    [
      bannerDismissed,
      clearPendingRequest,
      dismissBanner,
      pendingRequest,
      refreshPendingFromApi,
      setPendingRequest,
    ],
  );

  return (
    <PendingDeliveryRequestContext.Provider value={value}>
      {children}
    </PendingDeliveryRequestContext.Provider>
  );
};

export const usePendingDeliveryRequest = () =>
  useContext(PendingDeliveryRequestContext);

export const getBannerStatusLabel = (status?: string | null): string => {
  if (isWaitingDeliveryStatus(status)) {
    return 'Waiting';
  }
  if (isAcceptedDeliveryStatus(status)) {
    return 'Accepted';
  }
  const raw = String(status || '')
    .trim()
    .replace(/[_-]+/g, ' ');
  if (!raw) {
    return 'Waiting';
  }
  return raw.replace(/\b\w/g, c => c.toUpperCase());
};
