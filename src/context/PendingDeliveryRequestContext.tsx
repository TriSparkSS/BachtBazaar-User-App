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
import { useAppContext } from './AppContext';
import {
  DeliveryOrderListItem,
  deliveryApi,
  isWaitingDeliveryStatus,
} from '../services/deliveryApi';
import { ShopProduct, ShopWithOffers } from '../types/shop';

const POLL_INTERVAL_MS = 45_000;

export type PendingDeliveryRequest = {
  shop?: ShopWithOffers;
  product?: ShopProduct;
  requestId: string;
  /** All delivery order ids still waiting for acceptance. */
  orderIds: string[];
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
};

const defaultValue: PendingDeliveryRequestContextValue = {
  pendingRequest: null,
  setPendingRequest: () => undefined,
  clearPendingRequest: () => undefined,
  refreshPendingFromApi: async () => undefined,
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

const buildPendingFromWaitingOrders = (
  waiting: DeliveryOrderListItem[],
  previous: PendingDeliveryRequest | null,
): PendingDeliveryRequest => {
  const orderIds = waiting.map(order => String(order.id || '').trim()).filter(Boolean);
  const primary = waiting[0];
  const overlapsPrevious =
    previous != null &&
    orderIds.some(
      id => previous.orderIds?.includes(id) || previous.requestId === id,
    );

  return {
    shop: overlapsPrevious ? previous?.shop : undefined,
    product: overlapsPrevious ? previous?.product : undefined,
    requestId: orderIds[0] || previous?.requestId || '',
    orderIds,
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

export const PendingDeliveryRequestProvider = ({ children }: PropsWithChildren) => {
  const { authToken } = useAppContext();
  const [pendingRequest, setPendingRequestState] = useState<PendingDeliveryRequest | null>(
    null,
  );
  const pendingRef = useRef<PendingDeliveryRequest | null>(null);
  const refreshGenRef = useRef(0);

  useEffect(() => {
    pendingRef.current = pendingRequest;
  }, [pendingRequest]);

  const setPendingRequest = useCallback((value: PendingDeliveryRequest | null) => {
    pendingRef.current = value;
    setPendingRequestState(value);
  }, []);

  const clearPendingRequest = useCallback(() => {
    pendingRef.current = null;
    setPendingRequestState(null);
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
      const waiting = list.filter(order => isWaitingDeliveryStatus(order.status));
      if (waiting.length === 0) {
        pendingRef.current = null;
        setPendingRequestState(null);
        return;
      }
      const next = buildPendingFromWaitingOrders(waiting, pendingRef.current);
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

  // Poll while banner-worthy pending exists so it clears after merchant accepts
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
    }),
    [clearPendingRequest, pendingRequest, refreshPendingFromApi, setPendingRequest],
  );

  return (
    <PendingDeliveryRequestContext.Provider value={value}>
      {children}
    </PendingDeliveryRequestContext.Provider>
  );
};

export const usePendingDeliveryRequest = () => useContext(PendingDeliveryRequestContext);
