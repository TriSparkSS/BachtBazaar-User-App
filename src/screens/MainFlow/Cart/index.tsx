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
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAppContext } from '../../../context/AppContext';
import { usePendingDeliveryRequest } from '../../../context/PendingDeliveryRequestContext';
import { MainStackParamList } from '../../../navigation/types';
import {
  cartApi,
  CartItem,
  CartSummary,
  formatCartPrice,
} from '../../../services/cartApi';
import {
  deliveryApi,
  extractDeliveryOrderId,
} from '../../../services/deliveryApi';
import { shopApi } from '../../../services/shopApi';
import { showAppAlert } from '../../../services/appAlert';
import { colors, fonts } from '../../../helpers/styles';
import { cartItemToDeliveryTarget } from '../../../utils/cartDelivery';
import {
  REQUEST_DELIVERY_FEE,
  REQUEST_PLATFORM_FEE,
} from '../../../utils/shopDelivery';

const PRODUCT_PLACEHOLDER =
  'https://images.pexels.com/photos/4110251/pexels-photo-4110251.jpeg?auto=compress&cs=tinysrgb&dpr=1&w=200';

const EMPTY_SUMMARY: CartSummary = {
  subtotal: 0,
  totalDiscount: 0,
  totalAmount: 0,
  totalItemsCount: 0,
  totalUniqueProducts: 0,
};

const Cart = () => {
  const navigation = useNavigation<StackNavigationProp<MainStackParamList, 'Cart'>>();
  const { authToken, currentUser } = useAppContext();
  const { setPendingRequest, refreshPendingFromApi } = usePendingDeliveryRequest();
  const [items, setItems] = useState<CartItem[]>([]);
  const [summary, setSummary] = useState<CartSummary>(EMPTY_SUMMARY);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [mutatingItemId, setMutatingItemId] = useState<string | null>(null);
  const [isClearing, setIsClearing] = useState(false);
  const [isProceeding, setIsProceeding] = useState(false);

  const loadCart = useCallback(
    async (opts?: { refresh?: boolean }) => {
      const token = authToken?.trim();
      if (!token) {
        setItems([]);
        setSummary(EMPTY_SUMMARY);
        setIsLoading(false);
        setIsRefreshing(false);
        showAppAlert('Login required', 'Please log in again to view your cart.');
        return;
      }

      try {
        if (opts?.refresh) {
          setIsRefreshing(true);
        } else {
          setIsLoading(true);
        }
        const result = await cartApi.fetchCart(token);
        setItems(result.items);
        setSummary(result.summary);
      } catch (error) {
        showAppAlert(
          'Could not load cart',
          error instanceof Error ? error.message : 'Please try again.',
        );
        setItems([]);
        setSummary(EMPTY_SUMMARY);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [authToken],
  );

  useEffect(() => {
    loadCart();
  }, [loadCart]);

  const requireToken = () => {
    const token = authToken?.trim();
    if (!token) {
      showAppAlert('Login required', 'Please log in again to update your cart.');
      return null;
    }
    return token;
  };

  const handleQuantityChange = async (item: CartItem, nextQty: number) => {
    if (mutatingItemId || isClearing) {
      return;
    }
    if (nextQty < 1) {
      handleRemoveItem(item);
      return;
    }

    const token = requireToken();
    if (!token) {
      return;
    }

    try {
      setMutatingItemId(item.id);
      await cartApi.updateItemQuantity(item.id, nextQty, token);
      await loadCart({ refresh: true });
    } catch (error) {
      showAppAlert(
        'Could not update quantity',
        error instanceof Error ? error.message : 'Please try again.',
      );
    } finally {
      setMutatingItemId(null);
    }
  };

  const handleRemoveItem = (item: CartItem) => {
    if (mutatingItemId || isClearing) {
      return;
    }

    showAppAlert('Remove item', `Remove "${item.productName}" from your cart?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          const token = requireToken();
          if (!token) {
            return;
          }
          try {
            setMutatingItemId(item.id);
            await cartApi.deleteItem(item.id, token);
            await loadCart({ refresh: true });
          } catch (error) {
            showAppAlert(
              'Could not remove item',
              error instanceof Error ? error.message : 'Please try again.',
            );
          } finally {
            setMutatingItemId(null);
          }
        },
      },
    ]);
  };

  const handleClearCart = () => {
    if (mutatingItemId || isClearing || items.length === 0) {
      return;
    }

    showAppAlert('Clear cart', 'Remove all items from your cart?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear',
        style: 'destructive',
        onPress: async () => {
          const token = requireToken();
          if (!token) {
            return;
          }
          try {
            setIsClearing(true);
            await cartApi.clearCart(token);
            await loadCart({ refresh: true });
          } catch (error) {
            showAppAlert(
              'Could not clear cart',
              error instanceof Error ? error.message : 'Please try again.',
            );
          } finally {
            setIsClearing(false);
          }
        },
      },
    ]);
  };

  const itemCountLabel =
    summary.totalItemsCount === 1
      ? '1 item'
      : `${summary.totalItemsCount} items`;

  const paymentDetails = useMemo(() => {
    const subtotal =
      summary.subtotal > 0
        ? summary.subtotal
        : items.reduce(
            (sum, item) =>
              sum + (item.itemTotal ?? (item.unitPrice ?? 0) * item.quantity),
            0,
          );
    const discount = Math.max(0, summary.totalDiscount);
    // Prefer cart API fees when present; otherwise mirror Request Delivery demo fees.
    const deliveryFee =
      summary.deliveryFee != null ? summary.deliveryFee : REQUEST_DELIVERY_FEE;
    const platformFee =
      summary.platformFee != null ? summary.platformFee : REQUEST_PLATFORM_FEE;
    const itemsTotal =
      summary.totalAmount > 0
        ? summary.totalAmount
        : Math.max(0, subtotal - discount);
    // Cart API totals are item-only; add client-side (or parsed) fees for payable total.
    const totalPayable = itemsTotal + deliveryFee + platformFee;
    return { subtotal, discount, deliveryFee, platformFee, totalPayable };
  }, [items, summary]);

  const handleProceed = async () => {
    if (isProceeding || mutatingItemId || isClearing || items.length === 0) {
      return;
    }

    const token = requireToken();
    if (!token) {
      return;
    }

    const targets = items
      .map(cartItemToDeliveryTarget)
      .filter((target): target is NonNullable<typeof target> => Boolean(target));

    if (targets.length === 0) {
      showAppAlert(
        'Missing product details',
        'Some cart items are missing merchant or product info. Please remove them and try again.',
      );
      return;
    }

    const deliveryAddress = currentUser?.address?.trim() || '';
    const normalizedMobile = (currentUser?.phone || '').replace(/\D/g, '').slice(-10);

    // No saved address — reuse Request Delivery form with the first cart item.
    if (!deliveryAddress) {
      const primary = targets[0];
      navigation.navigate('RequestDelivery', {
        shop: primary.shop,
        product: primary.product,
      });
      return;
    }

    if (normalizedMobile.length < 10) {
      showAppAlert(
        'Mobile required',
        'Please update your profile mobile number, or request delivery from a product page.',
      );
      return;
    }

    try {
      setIsProceeding(true);

      const orderIds: string[] = [];
      let lastError: Error | null = null;

      for (let index = 0; index < targets.length; index += 1) {
        const target = targets[index];
        const extraNote =
          targets.length > 1
            ? `Cart checkout item ${index + 1} of ${targets.length}`
            : '';
        try {
          const response = await deliveryApi.createOrder(
            {
              merchantId: target.merchantId,
              productId: target.productId,
              customItemName: target.product.title?.trim() || 'Item',
              quantity: target.quantity,
              itemPrice: target.itemPrice,
              note: extraNote,
              deliveryAddress,
              phone: normalizedMobile,
            },
            token,
          );

          if (response.success === false) {
            throw new Error(response.message || 'Could not send delivery request.');
          }

          const orderId = extractDeliveryOrderId(response);
          if (orderId) {
            orderIds.push(orderId);
          } else {
            orderIds.push(target.productId);
          }
        } catch (error) {
          lastError =
            error instanceof Error
              ? error
              : new Error('Could not send delivery request.');
        }
      }

      if (orderIds.length === 0) {
        throw lastError || new Error('Could not send your delivery request.');
      }

      const primary = targets[0];
      const requestId = orderIds[0];
      const itemPrice = primary.itemPrice;
      const deliveryFee = REQUEST_DELIVERY_FEE;
      const platformFee = REQUEST_PLATFORM_FEE;
      const totalAmount = itemPrice + deliveryFee + platformFee;
      const sentParams = {
        shop: primary.shop,
        product: primary.product,
        requestId,
        orderIds,
        address: deliveryAddress,
        mobile: normalizedMobile,
        note: targets.length > 1 ? `Cart checkout (${orderIds.length} orders)` : undefined,
        itemPrice,
        deliveryFee,
        platformFee,
        totalAmount,
      };

      setPendingRequest({
        ...sentParams,
        orderIds,
      });
      // Source of truth is the list API — confirm waiting orders after create.
      void refreshPendingFromApi();

      navigation.replace('RequestDeliverySent', sentParams);
    } catch (error) {
      showAppAlert(
        'Request failed',
        error instanceof Error ? error.message : 'Could not send your delivery request.',
      );
    } finally {
      setIsProceeding(false);
    }
  };

  const renderItem = (item: CartItem) => {
    const imageUri = shopApi.resolveImageUrl(item.image) ?? PRODUCT_PLACEHOLDER;
    const merchantLabel = item.merchantName || item.shopName;
    const lineTotal =
      formatCartPrice(item.itemTotal) ??
      formatCartPrice(
        item.unitPrice != null ? item.unitPrice * item.quantity : undefined,
      ) ??
      item.price;
    const unitLabel = item.price ?? formatCartPrice(item.unitPrice);
    const busy = mutatingItemId === item.id || isClearing;

    return (
      <View key={item.id} style={styles.itemCard}>
        <Image source={{ uri: imageUri }} style={styles.thumb} />
        <View style={styles.itemBody}>
          <Text style={styles.productName} numberOfLines={2}>
            {item.productName}
          </Text>
          {merchantLabel ? (
            <Text style={styles.merchantName} numberOfLines={1}>
              {merchantLabel}
            </Text>
          ) : null}
          {item.variantInfo ? (
            <Text style={styles.variant} numberOfLines={1}>
              {item.variantInfo}
            </Text>
          ) : null}
          <View style={styles.itemMetaRow}>
            {unitLabel ? (
              <Text style={styles.unitPrice}>{unitLabel}</Text>
            ) : (
              <View />
            )}
            <View style={styles.qtyStepper}>
              <TouchableOpacity
                style={[styles.qtyBtn, busy && styles.qtyBtnDisabled]}
                activeOpacity={0.85}
                disabled={busy}
                onPress={() => handleQuantityChange(item, item.quantity - 1)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <MaterialCommunityIcons
                  name="minus"
                  size={16}
                  color={busy ? colors.lighterGray : colors.primary}
                />
              </TouchableOpacity>
              <Text style={styles.qtyValue}>{item.quantity}</Text>
              <TouchableOpacity
                style={[styles.qtyBtn, busy && styles.qtyBtnDisabled]}
                activeOpacity={0.85}
                disabled={busy}
                onPress={() => handleQuantityChange(item, item.quantity + 1)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <MaterialCommunityIcons
                  name="plus"
                  size={16}
                  color={busy ? colors.lighterGray : colors.primary}
                />
              </TouchableOpacity>
            </View>
          </View>
        </View>
        <View style={styles.lineTotalCol}>
          <TouchableOpacity
            style={styles.removeBtn}
            activeOpacity={0.85}
            disabled={busy}
            onPress={() => handleRemoveItem(item)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            {busy && mutatingItemId === item.id ? (
              <ActivityIndicator size="small" color={colors.mutedText} />
            ) : (
              <MaterialCommunityIcons
                name="trash-can-outline"
                size={20}
                color={busy ? colors.lighterGray : '#C62828'}
              />
            )}
          </TouchableOpacity>
          {lineTotal ? <Text style={styles.lineTotal}>{lineTotal}</Text> : null}
        </View>
      </View>
    );
  };

  const showEmpty = !isLoading && items.length === 0;
  const showList = items.length > 0;

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
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>My Cart</Text>
            {showList || summary.totalItemsCount > 0 ? (
              <Text style={styles.headerSubtitle}>{itemCountLabel}</Text>
            ) : null}
          </View>
          {showList ? (
            <TouchableOpacity
              style={styles.backBtn}
              onPress={handleClearCart}
              activeOpacity={0.85}
              disabled={isClearing || Boolean(mutatingItemId)}>
              {isClearing ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <MaterialCommunityIcons
                  name="cart-remove"
                  size={22}
                  color={colors.white}
                />
              )}
            </TouchableOpacity>
          ) : (
            <View style={styles.backBtn} />
          )}
        </View>
      </SafeAreaView>

      <View style={styles.body}>
        {isLoading && items.length === 0 ? (
          <View style={styles.center}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={styles.centerText}>Loading cart...</Text>
          </View>
        ) : showEmpty ? (
          <View style={styles.center}>
            <View style={styles.emptyIcon}>
              <MaterialCommunityIcons name="cart-outline" size={36} color={colors.primary} />
            </View>
            <Text style={styles.emptyTitle}>Your cart is empty</Text>
            <Text style={styles.emptySub}>
              Browse products and add them to your cart to get started.
            </Text>
            <TouchableOpacity
              style={styles.browseBtn}
              activeOpacity={0.9}
              onPress={() => navigation.goBack()}>
              <Text style={styles.browseBtnText}>Continue shopping</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <ScrollView
              style={styles.flex}
              contentContainerStyle={styles.list}
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl
                  refreshing={isRefreshing}
                  onRefresh={() => loadCart({ refresh: true })}
                  tintColor={colors.primary}
                  colors={[colors.primary]}
                />
              }>
              {items.map(renderItem)}
            </ScrollView>

            <SafeAreaView edges={['bottom']} style={styles.summarySafe}>
              <View style={styles.summaryCard}>
                <Text style={styles.chargesTitle}>Payment Details</Text>
                <View style={styles.chargesCard}>
                  <View style={styles.chargeRow}>
                    <Text style={styles.chargeLabel}>Subtotal</Text>
                    <Text style={styles.chargeValue}>
                      {formatCartPrice(paymentDetails.subtotal) ?? '₹0'}
                    </Text>
                  </View>
                  {paymentDetails.discount > 0 ? (
                    <View style={styles.chargeRow}>
                      <Text style={styles.chargeLabel}>Discount</Text>
                      <Text style={styles.discountValue}>
                        -{formatCartPrice(paymentDetails.discount)}
                      </Text>
                    </View>
                  ) : null}
                  <View style={styles.chargeRow}>
                    <Text style={styles.chargeLabel}>Delivery Fee</Text>
                    <Text style={styles.chargeValue}>
                      {formatCartPrice(paymentDetails.deliveryFee) ?? '₹0'}
                    </Text>
                  </View>
                  <View style={styles.chargeRow}>
                    <Text style={styles.chargeLabel}>Platform Fee</Text>
                    <Text style={styles.chargeValue}>
                      {formatCartPrice(paymentDetails.platformFee) ?? '₹0'}
                    </Text>
                  </View>
                  <View style={styles.totalDivider} />
                  <View style={styles.chargeRowLast}>
                    <Text style={styles.totalLabel}>Total Payable</Text>
                    <Text style={styles.totalValue}>
                      {formatCartPrice(paymentDetails.totalPayable) ?? '₹0'}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={[styles.proceedBtn, isProceeding && styles.proceedBtnOff]}
                  activeOpacity={0.9}
                  disabled={isProceeding || Boolean(mutatingItemId) || isClearing}
                  onPress={handleProceed}>
                  {isProceeding ? (
                    <ActivityIndicator size="small" color={colors.white} />
                  ) : (
                    <>
                      <Text style={styles.proceedBtnText}>Proceed</Text>
                      <MaterialCommunityIcons
                        name="arrow-right"
                        size={18}
                        color={colors.white}
                      />
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </SafeAreaView>
          </>
        )}
      </View>
    </View>
  );
};

export default Cart;

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
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingBottom: 4,
  },
  backBtn: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    color: colors.white,
    fontFamily: fonts.BOLD,
  },
  headerSubtitle: {
    marginTop: 2,
    fontSize: 12,
    color: 'rgba(255,255,255,0.85)',
    fontFamily: fonts.BOLD,
  },
  body: {
    flex: 1,
    backgroundColor: '#F4F6FA',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
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
    width: 72,
    height: 72,
    borderRadius: 22,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E8EDF5',
  },
  emptyTitle: {
    fontSize: 18,
    color: colors.text,
    fontFamily: fonts.BOLD,
    marginBottom: 6,
  },
  emptySub: {
    fontSize: 13,
    color: colors.mutedText,
    textAlign: 'center',
    lineHeight: 20,
    fontFamily: fonts.BOLD,
    marginBottom: 20,
  },
  browseBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 14,
  },
  browseBtnText: {
    color: colors.white,
    fontSize: 14,
    fontFamily: fonts.BOLD,
  },
  list: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 20,
    gap: 12,
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E8EDF5',
  },
  thumb: {
    width: 72,
    height: 72,
    borderRadius: 12,
    backgroundColor: colors.primarySoft,
  },
  itemBody: {
    flex: 1,
    minWidth: 0,
    marginLeft: 12,
    marginRight: 8,
  },
  productName: {
    fontSize: 15,
    color: colors.text,
    fontFamily: fonts.BOLD,
    lineHeight: 20,
  },
  merchantName: {
    marginTop: 4,
    fontSize: 12,
    color: colors.mutedText,
    fontFamily: fonts.BOLD,
  },
  variant: {
    marginTop: 2,
    fontSize: 11,
    color: colors.lighterGray,
    fontFamily: fonts.BOLD,
  },
  itemMetaRow: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  unitPrice: {
    fontSize: 13,
    color: colors.text,
    fontFamily: fonts.BOLD,
  },
  qtyStepper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    paddingHorizontal: 2,
    paddingVertical: 2,
  },
  qtyBtn: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyBtnDisabled: {
    opacity: 0.55,
  },
  qtyValue: {
    minWidth: 24,
    textAlign: 'center',
    fontSize: 13,
    color: colors.primary,
    fontFamily: fonts.BOLD,
  },
  lineTotalCol: {
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    minWidth: 56,
    minHeight: 72,
    paddingTop: 2,
  },
  removeBtn: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  lineTotal: {
    fontSize: 15,
    color: colors.text,
    fontFamily: fonts.BOLD,
  },
  summarySafe: {
    backgroundColor: colors.white,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E4EAF3',
  },
  summaryCard: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 10,
  },
  chargesTitle: {
    fontSize: 13,
    color: colors.mutedText,
    fontFamily: fonts.BOLD,
    marginBottom: 10,
  },
  chargesCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E8EDF5',
    padding: 16,
  },
  chargeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  chargeRowLast: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  chargeLabel: {
    fontSize: 14,
    color: colors.mutedText,
    fontFamily: fonts.BOLD,
  },
  chargeValue: {
    fontSize: 14,
    color: colors.text,
    fontFamily: fonts.BOLD,
  },
  discountValue: {
    fontSize: 14,
    color: colors.darkgreen,
    fontFamily: fonts.BOLD,
  },
  totalDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#E4EAF3',
    marginBottom: 12,
  },
  totalLabel: {
    fontSize: 15,
    color: colors.text,
    fontFamily: fonts.BOLD,
  },
  totalValue: {
    fontSize: 16,
    color: colors.primary,
    fontFamily: fonts.BOLD,
  },
  proceedBtn: {
    marginTop: 12,
    backgroundColor: colors.primary,
    borderRadius: 16,
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  proceedBtnOff: {
    opacity: 0.7,
  },
  proceedBtnText: {
    color: colors.white,
    fontSize: 16,
    fontFamily: fonts.BOLD,
  },
});
