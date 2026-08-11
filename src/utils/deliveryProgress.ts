/**
 * Delivery order progress stepper: status → step index + banner tone.
 * Step indices are 0-based across DELIVERY_PROGRESS_STEPS.
 */

export const DELIVERY_PROGRESS_STEPS = [
  { key: 'picked', label: 'Order\npicked' },
  { key: 'on_the_way', label: 'On the\nway' },
  { key: 'dispatched', label: 'Dispatched' },
  { key: 'arrived', label: 'Arrived' },
  { key: 'delivered', label: 'Delivered' },
  { key: 'complete', label: 'Complete' },
] as const;

export type DeliveryProgressStepKey = (typeof DELIVERY_PROGRESS_STEPS)[number]['key'];

export type DeliveryBannerTone = {
  bg: string;
  text: string;
  banner: string;
  icon: string;
  label: string;
};

export type DeliveryProgressState = {
  /** Highest reached step (0–5), or -1 when not started (waiting / accepted). */
  stepIndex: number;
  /** Steps with index <= completedThrough are filled. -1 = none filled. */
  completedThrough: number;
  /** Step highlighted as current; -1 when none. */
  currentStep: number;
  isCancelled: boolean;
  isWaiting: boolean;
  isAccepted: boolean;
  banner: DeliveryBannerTone;
  normalizedStatus: string;
};

const normalizeStatus = (status?: string | null): string =>
  String(status ?? '')
    .toLowerCase()
    .trim()
    .replace(/[\s-]+/g, '_');

const CANCELLED_BANNER: DeliveryBannerTone = {
  bg: '#FFEBEE',
  text: '#C62828',
  banner: '#C62828',
  icon: 'close-circle',
  label: 'Cancelled',
};

const WAITING_BANNER: DeliveryBannerTone = {
  bg: '#FFF8E1',
  text: '#F57F17',
  banner: '#366FE0',
  icon: 'clock-outline',
  label: 'Waiting',
};

const ACCEPTED_BANNER: DeliveryBannerTone = {
  bg: '#E8F5E9',
  text: '#2E7D32',
  banner: '#22A45A',
  icon: 'check-circle',
  label: 'Accepted',
};

const ON_WAY_BANNER: DeliveryBannerTone = {
  bg: '#E3F2FD',
  text: '#1565C0',
  banner: '#366FE0',
  icon: 'truck-delivery',
  label: 'On the way',
};

const DELIVERED_BANNER: DeliveryBannerTone = {
  bg: '#E8F5E9',
  text: '#2E7D32',
  banner: '#22A45A',
  icon: 'check-decagram',
  label: 'Delivered',
};

const COMPLETE_BANNER: DeliveryBannerTone = {
  bg: '#E8F5E9',
  text: '#2E7D32',
  banner: '#22A45A',
  icon: 'home-check',
  label: 'Complete',
};

const DISPATCHED_BANNER: DeliveryBannerTone = {
  bg: '#E3F2FD',
  text: '#1565C0',
  banner: '#366FE0',
  icon: 'truck-fast',
  label: 'Dispatched',
};

const ARRIVED_BANNER: DeliveryBannerTone = {
  bg: '#E8F5E9',
  text: '#2E7D32',
  banner: '#22A45A',
  icon: 'map-marker-check',
  label: 'Arrived',
};

const PICKED_BANNER: DeliveryBannerTone = {
  bg: '#E8F5E9',
  text: '#2E7D32',
  banner: '#22A45A',
  icon: 'package-variant',
  label: 'Order picked',
};

const isCancelledStatus = (n: string) =>
  n.includes('cancel') ||
  n.includes('reject') ||
  n.includes('declin') ||
  n.includes('fail');

const isWaitingStatus = (n: string) => {
  if (!n) {
    return true;
  }
  if (isCancelledStatus(n)) {
    return false;
  }
  return (
    n.includes('await') ||
    n.includes('waiting') ||
    n.includes('pending') ||
    n.includes('requested') ||
    n === 'request' ||
    n.includes('waiting_for_acceptance') ||
    n.includes('awaiting_acceptance') ||
    n.includes('sent') ||
    n === 'open' ||
    n === 'created' ||
    n === 'new' ||
    n === 'placed'
  );
};

const isAcceptedStatus = (n: string) => {
  if (isWaitingStatus(n) || isCancelledStatus(n)) {
    return false;
  }
  return (
    n === 'accepted' ||
    n === 'confirmed' ||
    n === 'assigned' ||
    n.includes('accept') ||
    n.includes('confirm') ||
    n.includes('assign')
  );
};

/**
 * Resolve step from trackingMeta when status alone is coarse
 * (e.g. accepted + trackingMeta.step / stage / currentStep).
 */
const stepFromTrackingMeta = (trackingMeta?: unknown): number | null => {
  if (!trackingMeta || typeof trackingMeta !== 'object') {
    return null;
  }
  const meta = trackingMeta as Record<string, unknown>;
  const candidates = [
    meta.step,
    meta.stepIndex,
    meta.currentStep,
    meta.stage,
    meta.progressStep,
    meta.status,
    meta.state,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === 'number' && Number.isFinite(candidate)) {
      const idx = Math.trunc(candidate);
      if (idx >= 0 && idx <= 5) {
        return idx;
      }
    }
    if (typeof candidate === 'string' && candidate.trim()) {
      const fromStatus = mapNormalizedToStep(normalizeStatus(candidate));
      if (fromStatus != null) {
        return fromStatus;
      }
    }
  }
  return null;
};

/** Map normalized API status to step index, or null if unknown / pre-progress. */
const mapNormalizedToStep = (n: string): number | null => {
  if (!n) {
    return null;
  }
  if (isCancelledStatus(n)) {
    return null;
  }
  if (n === 'completed' || n === 'complete' || n.includes('complete') || n.includes('success')) {
    return 5;
  }
  // Delivered finishes the stepper (Complete step filled), same as complete.
  if (n === 'delivered' || (n.includes('deliver') && !n.includes('out_for'))) {
    return 5;
  }
  if (n === 'arrived' || n.includes('arrived') || n.includes('at_door') || n.includes('reached')) {
    return 3;
  }
  if (n === 'dispatched' || n.includes('dispatch')) {
    return 2;
  }
  if (
    n === 'on_the_way' ||
    n === 'on_way' ||
    n === 'out_for_delivery' ||
    n.includes('on_the_way') ||
    n.includes('on_way') ||
    n.includes('out_for_delivery') ||
    n.includes('en_route') ||
    n.includes('in_transit')
  ) {
    return 1;
  }
  if (
    n === 'picked' ||
    n === 'order_picked' ||
    n === 'picked_up' ||
    n.includes('picked') ||
    n.includes('pickup')
  ) {
    return 0;
  }
  return null;
};

const bannerForStep = (stepIndex: number, fallbackLabel: string): DeliveryBannerTone => {
  switch (stepIndex) {
    case 0:
      return PICKED_BANNER;
    case 1:
      return ON_WAY_BANNER;
    case 2:
      return DISPATCHED_BANNER;
    case 3:
      return ARRIVED_BANNER;
    case 4:
      return DELIVERED_BANNER;
    case 5:
      return COMPLETE_BANNER;
    default:
      return {
        bg: '#EEF4FF',
        text: '#366FE0',
        banner: '#366FE0',
        icon: 'information-outline',
        label: fallbackLabel || 'Order',
      };
  }
};

/**
 * Drive stepper + status banner from order status (and optional trackingMeta).
 */
export const resolveDeliveryProgress = (
  status?: string | null,
  trackingMeta?: unknown,
): DeliveryProgressState => {
  const normalizedStatus = normalizeStatus(status);

  if (isCancelledStatus(normalizedStatus)) {
    return {
      stepIndex: -1,
      completedThrough: -1,
      currentStep: -1,
      isCancelled: true,
      isWaiting: false,
      isAccepted: false,
      banner: CANCELLED_BANNER,
      normalizedStatus,
    };
  }

  if (isWaitingStatus(normalizedStatus)) {
    return {
      stepIndex: -1,
      completedThrough: -1,
      currentStep: -1,
      isCancelled: false,
      isWaiting: true,
      isAccepted: false,
      banner: WAITING_BANNER,
      normalizedStatus,
    };
  }

  const fromMeta = stepFromTrackingMeta(trackingMeta);
  const fromStatus = mapNormalizedToStep(normalizedStatus);
  const stepIndex = fromMeta ?? fromStatus;

  if (stepIndex != null) {
    const isDeliveredOnly =
      (normalizedStatus === 'delivered' ||
        (normalizedStatus.includes('deliver') &&
          !normalizedStatus.includes('out_for') &&
          !normalizedStatus.includes('complete'))) &&
      stepIndex === 5;
    return {
      stepIndex,
      completedThrough: stepIndex,
      currentStep: stepIndex,
      isCancelled: false,
      isWaiting: false,
      isAccepted: false,
      // Keep "Delivered" banner when API says delivered; stepper is fully Complete.
      banner: isDeliveredOnly
        ? DELIVERED_BANNER
        : bannerForStep(stepIndex, status || ''),
      normalizedStatus,
    };
  }

  if (isAcceptedStatus(normalizedStatus)) {
    // Before Order picked: highlight first step as current, none filled yet.
    return {
      stepIndex: 0,
      completedThrough: -1,
      currentStep: 0,
      isCancelled: false,
      isWaiting: false,
      isAccepted: true,
      banner: ACCEPTED_BANNER,
      normalizedStatus,
    };
  }

  // Unknown positive status — show raw-ish label, treat like accepted (pre-pickup).
  const label =
    (status || '')
      .trim()
      .replace(/[_-]+/g, ' ')
      .replace(/\b\w/g, c => c.toUpperCase()) || 'In progress';

  return {
    stepIndex: 0,
    completedThrough: -1,
    currentStep: 0,
    isCancelled: false,
    isWaiting: false,
    isAccepted: true,
    banner: {
      ...ACCEPTED_BANNER,
      label,
    },
    normalizedStatus,
  };
};
