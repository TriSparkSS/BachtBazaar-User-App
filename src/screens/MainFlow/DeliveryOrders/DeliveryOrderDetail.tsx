import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAppContext } from '../../../context/AppContext';
import { usePendingDeliveryRequest } from '../../../context/PendingDeliveryRequestContext';
import { openChatWithNumber, openPhoneDialer } from '../../../helpers/contactActions';
import { colors, fonts } from '../../../helpers/styles';
import { MainStackParamList } from '../../../navigation/types';
import { showAppAlert } from '../../../services/appAlert';
import {
  DeliveryOrderDetail as DeliveryOrderDetailData,
  DeliveryOrderItemDetail,
  deliveryApi,
  isWaitingDeliveryStatus,
} from '../../../services/deliveryApi';
import { shopApi } from '../../../services/shopApi';
import { ShopProduct, ShopWithOffers } from '../../../types/shop';
import {
  DELIVERY_PROGRESS_STEPS,
  DeliveryProgressState,
  resolveDeliveryProgress,
} from '../../../utils/deliveryProgress';
import { formatShopAddress } from '../../../utils/shop';

const PRODUCT_PLACEHOLDER =
  'https://images.pexels.com/photos/264636/pexels-photo-264636.jpeg?auto=compress&cs=tinysrgb&dpr=1&w=200';
const SHOP_LOGO_PLACEHOLDER =
  'https://images.pexels.com/photos/264636/pexels-photo-264636.jpeg?auto=compress&cs=tinysrgb&dpr=1&w=200';

const DEFAULT_CANCEL_REASON = 'Order placed by mistake.';
const STEP_DONE_COLOR = colors.darkgreen;
const STEP_MUTED_COLOR = '#C5CDD9';
const STEP_LINE_MUTED = '#E0E5EE';

/** MaterialCommunityIcons that match each delivery status banner label. */
const STATUS_BANNER_ICON: Record<string, string> = {
  Waiting: 'clock-outline',
  Accepted: 'check-circle',
  'Order picked': 'package-variant',
  'On the way': 'truck-delivery',
  Dispatched: 'truck-fast',
  Arrived: 'map-marker-check',
  Delivered: 'check-decagram',
  Complete: 'home-check',
  Cancelled: 'close-circle',
};

const resolveStatusBannerIcon = (progress: DeliveryProgressState): string => {
  if (progress.isCancelled) {
    return STATUS_BANNER_ICON.Cancelled;
  }
  if (progress.isWaiting) {
    return STATUS_BANNER_ICON.Waiting;
  }
  if (progress.isAccepted) {
    return STATUS_BANNER_ICON.Accepted;
  }
  return STATUS_BANNER_ICON[progress.banner.label] || progress.banner.icon;
};

const formatDate = (value?: string) => {
  if (!value) {
    return '';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatRupee = (value?: number | string) => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return `₹${value.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
  }
  if (typeof value === 'string' && value.trim()) {
    if (value.trim().startsWith('₹')) {
      return value.trim();
    }
    const num = Number(String(value).replace(/[^\d.-]/g, ''));
    if (Number.isFinite(num)) {
      return `₹${num.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
    }
    return value.trim();
  }
  return undefined;
};

type EnrichmentResult = {
  shop: ShopWithOffers | null;
  product: ShopProduct | null;
};

/**
 * Resolve shop via GET /api/users/shop/:shopId, then find product in shop inventory.
 * Falls back to search when merchantId ≠ shopId or product is missing from inventory.
 */
const loadShopAndProduct = async (
  order: DeliveryOrderDetailData,
  token: string,
): Promise<EnrichmentResult> => {
  const productId = String(order.productId || '').trim();
  const merchantOrShopId = String(order.merchantId || '').trim();
  const merchantName = String(order.merchantName || '').trim();

  let shop: ShopWithOffers | null = null;
  let product: ShopProduct | null = null;
  let resolvedShopId = '';

  const tryFetchShop = async (shopId: string): Promise<ShopWithOffers | null> => {
    const id = shopId.trim();
    if (!id) {
      return null;
    }
    try {
      return await shopApi.fetchShopByIdWithOffers(id, token);
    } catch {
      return null;
    }
  };

  // 1) Treat order.merchantId as a possible shopId first (common when API sends shopId).
  if (merchantOrShopId) {
    shop = await tryFetchShop(merchantOrShopId);
    if (shop) {
      resolvedShopId = shop.id;
    } else {
      // 2) merchantId ≠ shopId — resolve like QR scan, then fetch shop detail.
      try {
        const resolved = await shopApi.resolveShopIdByMerchantId(
          { merchantId: merchantOrShopId, shopName: merchantName || undefined },
          token,
        );
        if (resolved) {
          shop = await tryFetchShop(resolved);
          if (shop) {
            resolvedShopId = shop.id;
          }
        }
      } catch {
        // Keep going — product search may still discover shopId.
      }
    }
  }

  // 3) Find product on shop inventory (same path Product Detail / QR product scan uses).
  if (shop && productId) {
    product = shop.products?.find(item => item.id === productId) ?? null;
  }

  // 4) If product missing, search by productId (and optionally discover shopId).
  if (productId && !product) {
    try {
      const search = await shopApi.searchShopsProductsAndOffers(productId, token);
      const searchHit = search.products.find(item => item.id === productId);
      if (searchHit) {
        product = searchHit;
        const searchShopId = searchHit.shopId?.trim() || '';
        if (searchShopId && searchShopId !== resolvedShopId) {
          const fromSearch = await tryFetchShop(searchShopId);
          if (fromSearch) {
            shop = fromSearch;
            resolvedShopId = fromSearch.id;
            // Prefer inventory product when available (richer fields).
            product =
              fromSearch.products?.find(item => item.id === productId) ?? searchHit;
          }
        }
      }
    } catch {
      // Keep order fallback fields.
    }
  }

  return { shop, product };
};

const SkeletonBlock = ({
  width,
  height,
  radius = 10,
  style,
}: {
  width: number | string;
  height: number;
  radius?: number;
  style?: object;
}) => (
  <View
    style={[
      {
        width,
        height,
        borderRadius: radius,
        backgroundColor: '#E8EDF5',
      },
      style,
    ]}
  />
);

const DeliveryOrderDetail = () => {
  const navigation =
    useNavigation<StackNavigationProp<MainStackParamList, 'DeliveryOrderDetail'>>();
  const route = useRoute();
  const { orderId } = route.params as MainStackParamList['DeliveryOrderDetail'];
  const { authToken } = useAppContext();
  const { refreshPendingFromApi } = usePendingDeliveryRequest();

  const [order, setOrder] = useState<DeliveryOrderDetailData | null>(null);
  const [shop, setShop] = useState<ShopWithOffers | null>(null);
  const [product, setProduct] = useState<ShopProduct | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isEnriching, setIsEnriching] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadDetail = useCallback(
    async (mode: 'initial' | 'refresh' = 'initial') => {
      const token = authToken?.trim();
      const id = String(orderId || '').trim();
      if (!token) {
        setOrder(null);
        setShop(null);
        setProduct(null);
        setError('Please log in to view this delivery order.');
        setIsLoading(false);
        setIsRefreshing(false);
        setIsEnriching(false);
        return;
      }
      if (!id) {
        setOrder(null);
        setShop(null);
        setProduct(null);
        setError('Missing delivery order id.');
        setIsLoading(false);
        setIsRefreshing(false);
        setIsEnriching(false);
        return;
      }

      if (mode === 'refresh') {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      try {
        const detail = await deliveryApi.fetchDeliveryOrderDetail(id, token);
        setOrder(detail);
        setError(null);

        // Enrich with product + shop APIs in parallel after order loads.
        setIsEnriching(true);
        try {
          const enriched = await loadShopAndProduct(detail, token);
          setShop(enriched.shop);
          setProduct(enriched.product);
        } catch {
          setShop(null);
          setProduct(null);
        } finally {
          setIsEnriching(false);
        }
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Could not load delivery order.';
        setError(message);
        if (mode === 'initial') {
          setOrder(null);
          setShop(null);
          setProduct(null);
        }
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [authToken, orderId],
  );

  useEffect(() => {
    loadDetail('initial');
  }, [loadDetail]);

  const progress = useMemo(
    () => resolveDeliveryProgress(order?.status, order?.trackingMeta),
    [order?.status, order?.trackingMeta],
  );
  const canCancel = isWaitingDeliveryStatus(order?.status);

  const orderItems: DeliveryOrderItemDetail[] = useMemo(() => {
    if (order?.items && order.items.length > 0) {
      return order.items;
    }
    if (!order) {
      return [];
    }
    return [
      {
        id: order.productId || order.id,
        productId: order.productId,
        productName: order.productName,
        quantity: order.quantity,
        unitPrice: order.itemPrice,
        unitPriceRaw: order.itemPriceRaw,
        itemTotal: order.itemPrice,
        itemTotalRaw: order.itemPriceRaw,
        productThumbnail: order.productImage,
      },
    ];
  }, [order]);

  const primaryItem = orderItems[0];

  // Prefer API response fields; shop/product enrichment is secondary.
  const productName =
    primaryItem?.productName?.trim() ||
    order?.productName?.trim() ||
    product?.title?.trim() ||
    'Delivery item';
  const productImage =
    shopApi.resolveImageUrl(primaryItem?.productThumbnail) ||
    shopApi.resolveImageUrl(order?.productImage) ||
    shopApi.resolveImageUrl(product?.image) ||
    PRODUCT_PLACEHOLDER;

  const shopAddress = shop ? formatShopAddress(shop) : undefined;
  const merchantName =
    order?.merchantName?.trim() || shop?.name?.trim() || 'Merchant';
  const merchantLogo =
    shopApi.resolveImageUrl(order?.merchantLogo) ||
    shopApi.resolveImageUrl(shop?.logo) ||
    SHOP_LOGO_PLACEHOLDER;
  const merchantPhone = order?.merchantPhone || shop?.phone;
  const merchantAddress =
    order?.merchantAddress || shopAddress || undefined;

  const customerName = order?.userName?.trim() || 'Customer';
  const customerPhone =
    order?.userPhone || order?.contactPhone || order?.phone;

  const callPhone = merchantPhone;

  const itemPrice =
    formatRupee(order?.itemPriceRaw) ||
    formatRupee(order?.itemPrice) ||
    formatRupee(primaryItem?.itemTotalRaw) ||
    formatRupee(primaryItem?.unitPriceRaw) ||
    formatRupee(product?.price);
  const deliveryFee =
    formatRupee(order?.deliveryFeeRaw) || formatRupee(order?.deliveryFee);
  const platformFee =
    formatRupee(order?.platformFeeRaw) || formatRupee(order?.platformFee);
  const totalAmount =
    formatRupee(order?.totalAmountRaw) ||
    formatRupee(order?.totalAmount) ||
    (() => {
      const parts = [
        order?.itemPriceRaw,
        order?.deliveryFeeRaw,
        order?.platformFeeRaw,
      ].filter((n): n is number => typeof n === 'number' && Number.isFinite(n));
      if (parts.length === 0) {
        return undefined;
      }
      return formatRupee(parts.reduce((sum, n) => sum + n, 0));
    })();

  const displayOrderNumber = order?.orderNumber || order?.id;
  const hasMerchantBasics = Boolean(
    order?.merchantName || order?.merchantPhone || shop,
  );
  const hasCustomerBasics = Boolean(order?.userName || customerPhone);

  const handleCall = async () => {
    try {
      await openPhoneDialer(callPhone);
    } catch (err) {
      showAppAlert(
        'Call unavailable',
        err instanceof Error ? err.message : 'Phone number is not available.',
      );
    }
  };

  const handleChat = async () => {
    try {
      await openChatWithNumber(
        callPhone,
        `Hi, I'm following up on my Bachat Bazaar delivery order${
          displayOrderNumber ? ` (#${displayOrderNumber})` : ''
        } for "${productName}".`,
      );
    } catch (err) {
      showAppAlert(
        'Chat unavailable',
        err instanceof Error ? err.message : 'Mobile number is not available for chat.',
      );
    }
  };

  const handleCancel = () => {
    const token = authToken?.trim();
    const id = String(order?.id || orderId || '').trim();
    if (!token || !id) {
      showAppAlert('Cancel failed', 'Missing delivery order id.');
      return;
    }

    showAppAlert('Cancel this request?', 'Do you want to cancel this delivery request?', [
      { text: 'Keep order', style: 'cancel' },
      {
        text: 'Cancel Request',
        style: 'destructive',
        onPress: async () => {
          try {
            setIsCancelling(true);
            const response = await deliveryApi.cancelOrder(
              id,
              DEFAULT_CANCEL_REASON,
              token,
            );
            // Re-check list API so banner clears only when no waiting orders remain.
            await refreshPendingFromApi();
            showAppAlert(
              'Cancelled',
              response.message || 'Your delivery request was cancelled.',
            );
            await loadDetail('refresh');
          } catch (err) {
            showAppAlert(
              'Cancel failed',
              err instanceof Error ? err.message : 'Could not cancel this request.',
            );
          } finally {
            setIsCancelling(false);
          }
        },
      },
    ]);
  };

  const renderItemRow = (item: DeliveryOrderItemDetail, index: number) => {
    const name =
      item.productName?.trim() ||
      (index === 0 ? product?.title?.trim() : undefined) ||
      'Item';
    const thumb =
      shopApi.resolveImageUrl(item.productThumbnail) ||
      (index === 0 ? shopApi.resolveImageUrl(product?.image) : undefined) ||
      (index === 0 ? productImage : PRODUCT_PLACEHOLDER);
    const unitPrice =
      formatRupee(item.unitPriceRaw) ||
      formatRupee(item.unitPrice) ||
      (index === 0 ? formatRupee(product?.price) : undefined);
    const lineTotal =
      formatRupee(item.itemTotalRaw) ||
      formatRupee(item.itemTotal) ||
      unitPrice;

    return (
      <View
        key={item.id || `${item.productId || 'item'}-${index}`}
        style={[styles.itemRow, index > 0 && styles.itemRowSpaced]}>
        <Image source={{ uri: thumb }} style={styles.itemThumb} />
        <View style={styles.itemCopy}>
          <Text style={styles.itemName} numberOfLines={2}>
            {name}
          </Text>
          {item.quantity ? (
            <Text style={styles.itemMeta}>Qty {item.quantity}</Text>
          ) : null}
          {unitPrice ? (
            <Text style={styles.itemMeta}>Unit {unitPrice}</Text>
          ) : null}
          {item.variantInfo ? (
            <Text style={styles.itemMeta} numberOfLines={1}>
              {item.variantInfo}
            </Text>
          ) : null}
          {lineTotal ? <Text style={styles.itemPrice}>{lineTotal}</Text> : null}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.root}>
      <SafeAreaView edges={['top']} style={styles.headerSafe}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
            activeOpacity={0.85}>
            <MaterialCommunityIcons name="arrow-left" size={22} color={colors.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Order Detail</Text>
          <View style={styles.backBtn} />
        </View>
      </SafeAreaView>

      <View style={styles.body}>
        {isLoading && !order ? (
          <View style={styles.center}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={styles.centerText}>Loading order...</Text>
          </View>
        ) : error && !order ? (
          <View style={styles.center}>
            <View style={styles.emptyIcon}>
              <MaterialCommunityIcons
                name="alert-circle-outline"
                size={28}
                color={colors.primary}
              />
            </View>
            <Text style={styles.emptyTitle}>Unable to load order</Text>
            <Text style={styles.emptySub}>{error}</Text>
            <TouchableOpacity
              style={styles.retryBtn}
              onPress={() => loadDetail('initial')}
              activeOpacity={0.85}>
              <Text style={styles.retryText}>Try again</Text>
            </TouchableOpacity>
          </View>
        ) : order ? (
          <>
            <ScrollView
              style={styles.flex}
              contentContainerStyle={styles.scroll}
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl
                  refreshing={isRefreshing}
                  onRefresh={() => loadDetail('refresh')}
                  tintColor={colors.primary}
                />
              }>
              <View
                style={[
                  styles.statusBanner,
                  { backgroundColor: progress.banner.banner },
                ]}>
                <View style={styles.statusBannerIcon}>
                  <MaterialCommunityIcons
                    name={resolveStatusBannerIcon(progress)}
                    size={18}
                    color={progress.banner.banner}
                  />
                </View>
                <Text style={styles.statusBannerText}>{progress.banner.label}</Text>
              </View>

              <View
                style={[
                  styles.stepperCard,
                  progress.isCancelled && styles.stepperCardMuted,
                ]}>
                <Text style={styles.cardTitle}>Delivery progress</Text>
                <View style={styles.stepperRow}>
                  {DELIVERY_PROGRESS_STEPS.map((step, index) => {
                    const isDone =
                      !progress.isCancelled && index <= progress.completedThrough;
                    const isCurrent =
                      !progress.isCancelled && index === progress.currentStep;
                    const isLast = index === DELIVERY_PROGRESS_STEPS.length - 1;
                    const lineDone =
                      !progress.isCancelled && index < progress.completedThrough;
                    const dotColor = progress.isCancelled
                      ? STEP_MUTED_COLOR
                      : isDone || isCurrent
                        ? STEP_DONE_COLOR
                        : STEP_MUTED_COLOR;
                    const lineColor = progress.isCancelled
                      ? STEP_LINE_MUTED
                      : lineDone
                        ? STEP_DONE_COLOR
                        : STEP_LINE_MUTED;

                    return (
                      <View key={step.key} style={styles.stepCol}>
                        <View style={styles.stepTrackRow}>
                          <View
                            style={[
                              styles.stepDot,
                              { backgroundColor: dotColor },
                              isCurrent && !progress.isCancelled
                                ? styles.stepDotCurrent
                                : null,
                            ]}>
                            {isDone && !isCurrent ? (
                              <MaterialCommunityIcons
                                name="check"
                                size={12}
                                color={colors.white}
                              />
                            ) : isCurrent && !progress.isCancelled ? (
                              <View style={styles.stepDotInner} />
                            ) : null}
                          </View>
                          {!isLast ? (
                            <View
                              style={[styles.stepLine, { backgroundColor: lineColor }]}
                            />
                          ) : null}
                        </View>
                        <Text
                          style={[
                            styles.stepLabel,
                            (isDone || isCurrent) && !progress.isCancelled
                              ? styles.stepLabelActive
                              : null,
                            progress.isCancelled ? styles.stepLabelMuted : null,
                          ]}>
                          {step.label}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </View>

              <View style={styles.orderIdCard}>
                <Text style={styles.sectionLabel}>
                  {order.orderNumber ? 'Order number' : 'Order ID'}
                </Text>
                <Text style={styles.orderIdValue} selectable>
                  {order.orderNumber ? order.orderNumber : `#${order.id}`}
                </Text>
                {order.orderNumber ? (
                  <Text style={styles.metaMuted} selectable>
                    ID #{order.id}
                  </Text>
                ) : null}
                {order.paymentStatus ? (
                  <Text style={styles.metaMuted}>
                    Payment {order.paymentStatus}
                  </Text>
                ) : null}
                {order.createdAt ? (
                  <Text style={styles.metaMuted}>Placed {formatDate(order.createdAt)}</Text>
                ) : null}
                {order.eta ? (
                  <Text style={styles.metaMuted}>ETA {order.eta}</Text>
                ) : null}
                {order.expectedDeliveryAt ? (
                  <Text style={styles.metaMuted}>
                    Expected {formatDate(order.expectedDeliveryAt)}
                  </Text>
                ) : null}
              </View>

              {hasCustomerBasics ? (
                <View style={styles.card}>
                  <Text style={styles.cardTitle}>Customer</Text>
                  <View style={styles.personRow}>
                    <View style={styles.personIcon}>
                      <MaterialCommunityIcons
                        name="account-outline"
                        size={22}
                        color={colors.primary}
                      />
                    </View>
                    <View style={styles.merchantCopy}>
                      <Text style={styles.merchantName} numberOfLines={1}>
                        {customerName}
                      </Text>
                      {customerPhone ? (
                        <Text style={styles.metaMuted}>{customerPhone}</Text>
                      ) : null}
                    </View>
                  </View>
                </View>
              ) : null}

              <View style={styles.card}>
                <Text style={styles.cardTitle}>Merchant</Text>
                {isEnriching && !hasMerchantBasics ? (
                  <View style={styles.merchantRow}>
                    <SkeletonBlock width={52} height={52} radius={26} />
                    <View style={styles.merchantCopy}>
                      <SkeletonBlock width="70%" height={16} />
                      <SkeletonBlock width="90%" height={12} style={{ marginTop: 8 }} />
                      <SkeletonBlock width="50%" height={12} style={{ marginTop: 8 }} />
                    </View>
                  </View>
                ) : (
                  <View style={styles.merchantRow}>
                    <Image source={{ uri: merchantLogo }} style={styles.merchantLogo} />
                    <View style={styles.merchantCopy}>
                      <Text style={styles.merchantName} numberOfLines={1}>
                        {merchantName}
                      </Text>
                      {merchantAddress ? (
                        <Text style={styles.metaMuted} numberOfLines={2}>
                          {merchantAddress}
                        </Text>
                      ) : null}
                      {merchantPhone ? (
                        <Text style={styles.metaMuted}>{merchantPhone}</Text>
                      ) : null}
                    </View>
                  </View>
                )}
              </View>

              <View style={styles.card}>
                <Text style={styles.cardTitle}>
                  {orderItems.length > 1 ? 'Items' : 'Item'}
                </Text>
                {isEnriching && !primaryItem?.productName && !order.productName ? (
                  <View style={styles.itemRow}>
                    <SkeletonBlock width={72} height={72} radius={14} />
                    <View style={styles.itemCopy}>
                      <SkeletonBlock width="80%" height={16} />
                      <SkeletonBlock width="40%" height={12} style={{ marginTop: 8 }} />
                      <SkeletonBlock width="35%" height={14} style={{ marginTop: 10 }} />
                    </View>
                  </View>
                ) : (
                  orderItems.map((item, index) => renderItemRow(item, index))
                )}
              </View>

              <View style={styles.card}>
                <Text style={styles.cardTitle}>Delivery</Text>
                <View style={styles.infoRow}>
                  <View style={styles.infoIcon}>
                    <MaterialCommunityIcons
                      name="map-marker-outline"
                      size={18}
                      color={colors.primary}
                    />
                  </View>
                  <View style={styles.infoCopy}>
                    <Text style={styles.infoLabel}>Address</Text>
                    <Text style={styles.infoValue}>
                      {order.address || 'Address not available'}
                    </Text>
                  </View>
                </View>
                {order.contactPhone || order.phone ? (
                  <View style={[styles.infoRow, styles.infoRowSpaced]}>
                    <View style={styles.infoIcon}>
                      <MaterialCommunityIcons
                        name="phone-outline"
                        size={18}
                        color={colors.primary}
                      />
                    </View>
                    <View style={styles.infoCopy}>
                      <Text style={styles.infoLabel}>Contact phone</Text>
                      <Text style={styles.infoValue}>
                        {order.contactPhone || order.phone}
                      </Text>
                    </View>
                  </View>
                ) : null}
                {order.eta || order.expectedDeliveryAt ? (
                  <View style={[styles.infoRow, styles.infoRowSpaced]}>
                    <View style={styles.infoIcon}>
                      <MaterialCommunityIcons
                        name="clock-outline"
                        size={18}
                        color={colors.primary}
                      />
                    </View>
                    <View style={styles.infoCopy}>
                      <Text style={styles.infoLabel}>Estimated delivery</Text>
                      {order.eta ? (
                        <Text style={styles.infoValue}>{order.eta}</Text>
                      ) : null}
                      {order.expectedDeliveryAt ? (
                        <Text style={styles.infoValue}>
                          {formatDate(order.expectedDeliveryAt)}
                        </Text>
                      ) : null}
                    </View>
                  </View>
                ) : null}
                {order.note ? (
                  <View style={[styles.noteBox, styles.infoRowSpaced]}>
                    <Text style={styles.noteLabel}>Note</Text>
                    <Text style={styles.noteText}>{order.note}</Text>
                  </View>
                ) : null}
              </View>

              {(itemPrice || deliveryFee || platformFee || totalAmount) && (
                <View style={styles.card}>
                  <Text style={styles.cardTitle}>Charges</Text>
                  {itemPrice ? (
                    <View style={styles.chargeRow}>
                      <Text style={styles.chargeLabel}>Item Price</Text>
                      <Text style={styles.chargeValue}>{itemPrice}</Text>
                    </View>
                  ) : null}
                  {deliveryFee ? (
                    <View style={styles.chargeRow}>
                      <Text style={styles.chargeLabel}>Delivery Fee</Text>
                      <Text style={styles.chargeValue}>{deliveryFee}</Text>
                    </View>
                  ) : null}
                  {platformFee ? (
                    <View style={styles.chargeRow}>
                      <Text style={styles.chargeLabel}>Platform Fee</Text>
                      <Text style={styles.chargeValue}>{platformFee}</Text>
                    </View>
                  ) : null}
                  {totalAmount ? (
                    <>
                      <View style={styles.totalDivider} />
                      <View style={styles.chargeRow}>
                        <Text style={styles.totalLabel}>Total</Text>
                        <Text style={styles.totalValue}>{totalAmount}</Text>
                      </View>
                    </>
                  ) : null}
                </View>
              )}

              {order.cancelReason ? (
                <View style={styles.card}>
                  <Text style={styles.cardTitle}>Cancellation</Text>
                  <Text style={styles.infoValue}>{order.cancelReason}</Text>
                </View>
              ) : null}

              {error ? (
                <Text style={styles.refreshError}>{error}</Text>
              ) : null}
            </ScrollView>

            <SafeAreaView edges={['bottom']} style={styles.footer}>
              <View style={styles.actionsRow}>
                <TouchableOpacity
                  style={styles.outlineBtn}
                  activeOpacity={0.88}
                  onPress={handleCall}
                  disabled={!callPhone}>
                  <MaterialCommunityIcons
                    name="phone-outline"
                    size={18}
                    color={callPhone ? colors.primary : colors.mutedText}
                  />
                  <Text
                    style={[
                      styles.outlineText,
                      !callPhone && styles.outlineTextDisabled,
                    ]}>
                    Call
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.chatBtn, !callPhone && styles.chatBtnDisabled]}
                  activeOpacity={0.88}
                  onPress={handleChat}
                  disabled={!callPhone}>
                  <MaterialCommunityIcons
                    name="whatsapp"
                    size={18}
                    color={callPhone ? '#22A45A' : colors.mutedText}
                  />
                  <Text
                    style={[
                      styles.chatText,
                      !callPhone && styles.outlineTextDisabled,
                    ]}>
                    Chat
                  </Text>
                </TouchableOpacity>
              </View>
              {canCancel ? (
                <TouchableOpacity
                  style={styles.cancelBtn}
                  activeOpacity={0.88}
                  onPress={handleCancel}
                  disabled={isCancelling}>
                  {isCancelling ? (
                    <ActivityIndicator size="small" color={colors.white} />
                  ) : (
                    <>
                      <MaterialCommunityIcons
                        name="close-circle-outline"
                        size={18}
                        color={colors.white}
                      />
                      <Text style={styles.cancelText}>Cancel Request</Text>
                    </>
                  )}
                </TouchableOpacity>
              ) : null}
            </SafeAreaView>
          </>
        ) : null}
      </View>
    </View>
  );
};

export default DeliveryOrderDetail;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.primary,
  },
  flex: {
    flex: 1,
  },
  headerSafe: {
    backgroundColor: colors.primary,
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
    color: colors.white,
    fontFamily: fonts.BOLD,
  },
  body: {
    flex: 1,
    backgroundColor: '#F4F6FA',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  scroll: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 28,
    gap: 12,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 36,
  },
  centerText: {
    marginTop: 10,
    fontSize: 13,
    color: colors.mutedText,
    fontFamily: fonts.BOLD,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E8EDF5',
  },
  emptyTitle: {
    fontSize: 17,
    color: colors.text,
    fontFamily: fonts.BOLD,
    marginBottom: 6,
    textAlign: 'center',
  },
  emptySub: {
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
    color: colors.mutedText,
    fontFamily: fonts.BOLD,
  },
  retryBtn: {
    marginTop: 16,
    backgroundColor: colors.primary,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
  },
  retryText: {
    color: colors.white,
    fontSize: 13,
    fontFamily: fonts.BOLD,
  },
  statusBanner: {
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  statusBannerIcon: {
    width: 28,
    height: 28,
    borderRadius: 10,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusBannerText: {
    color: colors.white,
    fontSize: 16,
    fontFamily: fonts.BOLD,
  },
  stepperCard: {
    backgroundColor: colors.white,
    borderRadius: 18,
    paddingTop: 16,
    paddingHorizontal: 12,
    paddingBottom: 14,
    borderWidth: 1,
    borderColor: '#E8EDF5',
    shadowColor: '#1B2430',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  stepperCardMuted: {
    opacity: 0.72,
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingTop: 4,
  },
  stepCol: {
    flex: 1,
    alignItems: 'stretch',
  },
  stepTrackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 22,
    marginBottom: 8,
  },
  stepDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  stepDotCurrent: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 3,
    borderColor: '#C8E6C9',
  },
  stepDotFailed: {
    backgroundColor: '#EF9A9A',
  },
  stepDotInner: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.white,
  },
  stepLine: {
    flex: 1,
    height: 3,
    marginHorizontal: 2,
    borderRadius: 2,
  },
  stepLabel: {
    fontSize: 10,
    lineHeight: 13,
    color: colors.mutedText,
    fontFamily: fonts.BOLD,
    textAlign: 'left',
    paddingRight: 2,
  },
  stepLabelActive: {
    color: colors.text,
  },
  stepLabelMuted: {
    color: STEP_MUTED_COLOR,
  },
  orderIdCard: {
    backgroundColor: colors.white,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E8EDF5',
  },
  sectionLabel: {
    fontSize: 12,
    color: colors.mutedText,
    fontFamily: fonts.BOLD,
    marginBottom: 4,
  },
  orderIdValue: {
    fontSize: 15,
    color: colors.text,
    fontFamily: fonts.BOLD,
  },
  metaMuted: {
    marginTop: 6,
    fontSize: 12,
    color: colors.mutedText,
    fontFamily: fonts.BOLD,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E8EDF5',
    shadowColor: '#1B2430',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 13,
    color: colors.mutedText,
    fontFamily: fonts.BOLD,
    marginBottom: 12,
  },
  personRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  personIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  itemRowSpaced: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#EEF2F8',
  },
  itemThumb: {
    width: 72,
    height: 72,
    borderRadius: 14,
    backgroundColor: colors.primarySoft,
  },
  itemCopy: {
    flex: 1,
  },
  itemName: {
    fontSize: 15,
    color: colors.text,
    fontFamily: fonts.BOLD,
  },
  itemMeta: {
    marginTop: 4,
    fontSize: 12,
    color: colors.mutedText,
    fontFamily: fonts.BOLD,
  },
  itemPrice: {
    marginTop: 6,
    fontSize: 15,
    color: colors.primary,
    fontFamily: fonts.BOLD,
  },
  noteBox: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#EEF2F8',
  },
  noteLabel: {
    fontSize: 11,
    color: colors.mutedText,
    fontFamily: fonts.BOLD,
    marginBottom: 4,
  },
  noteText: {
    fontSize: 13,
    color: colors.text,
    fontFamily: fonts.BOLD,
    lineHeight: 18,
  },
  merchantRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  merchantLogo: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.primarySoft,
  },
  merchantCopy: {
    flex: 1,
  },
  merchantName: {
    fontSize: 15,
    color: colors.text,
    fontFamily: fonts.BOLD,
  },
  infoRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  infoRowSpaced: {
    marginTop: 14,
  },
  infoIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoCopy: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 11,
    color: colors.mutedText,
    fontFamily: fonts.BOLD,
    marginBottom: 3,
  },
  infoValue: {
    fontSize: 13,
    color: colors.text,
    fontFamily: fonts.BOLD,
    lineHeight: 19,
  },
  chargeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  chargeLabel: {
    fontSize: 13,
    color: colors.mutedText,
    fontFamily: fonts.BOLD,
  },
  chargeValue: {
    fontSize: 13,
    color: colors.text,
    fontFamily: fonts.BOLD,
  },
  totalDivider: {
    height: 1,
    backgroundColor: '#EEF2F8',
    marginBottom: 10,
  },
  totalLabel: {
    fontSize: 14,
    color: colors.text,
    fontFamily: fonts.BOLD,
  },
  totalValue: {
    fontSize: 15,
    color: colors.primary,
    fontFamily: fonts.BOLD,
  },
  refreshError: {
    textAlign: 'center',
    color: '#C62828',
    fontSize: 12,
    fontFamily: fonts.BOLD,
  },
  footer: {
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: '#E8EDF5',
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
    paddingBottom: 4,
  },
  outlineBtn: {
    flex: 1,
    minHeight: 48,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.primaryBorder,
    backgroundColor: colors.primarySoft,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  outlineText: {
    fontSize: 14,
    color: colors.primary,
    fontFamily: fonts.BOLD,
  },
  outlineTextDisabled: {
    color: colors.mutedText,
  },
  chatBtn: {
    flex: 1,
    minHeight: 48,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#22A45A',
    backgroundColor: colors.white,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  chatBtnDisabled: {
    borderColor: '#D0D5DD',
  },
  chatText: {
    fontSize: 14,
    color: '#22A45A',
    fontFamily: fonts.BOLD,
  },
  cancelBtn: {
    marginTop: 10,
    minHeight: 48,
    borderRadius: 14,
    backgroundColor: '#C62828',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 4,
  },
  cancelText: {
    fontSize: 14,
    color: colors.white,
    fontFamily: fonts.BOLD,
  },
});
