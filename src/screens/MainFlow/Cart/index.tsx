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
  DeliveryFeeEstimate,
  deliveryApi,
  extractDeliveryOrderId,
} from '../../../services/deliveryApi';
import { shopApi } from '../../../services/shopApi';
import { cartProductCache } from '../../../services/cartProductCache';
import { showAppAlert } from '../../../services/appAlert';
import { colors, fonts } from '../../../helpers/styles';
import { cartItemToDeliveryTarget } from '../../../utils/cartDelivery';
import {
  deliveryEstimateTierLabel,
  estimateDeliveryFeeForShop,
  formatEstimateMeta,
} from '../../../utils/estimateDeliveryFee';
import {
  formatRupeeAmount,
  matchShopProduct,
  quoteFromShopProduct,
} from '../../../utils/productPrice';
import { loadCartShopProducts } from '../../../utils/resolveCartShop';
import { extractCityFromAddress } from '../../../utils/location';
import { ShopProduct } from '../../../types/shop';

const PRODUCT_PLACEHOLDER =
  'https://images.pexels.com/photos/4110251/pexels-photo-4110251.jpeg?auto=compress&cs=tinysrgb&dpr=1&w=200';

const withLiveProductPrice = (item: CartItem, products: ShopProduct[]): CartItem => {
  const product = matchShopProduct(products, item);
  if (!product) {
    return item;
  }
  const live = quoteFromShopProduct(product);
  return {
    ...item,
    productId: item.productId || product.id,
    shopId: item.shopId || product.shopId,
    shopName: item.shopName || product.shopName || item.merchantName,
    unitPrice: live.saleAmount,
    originalUnitPrice: live.originalAmount,
    itemTotal: live.saleAmount * item.quantity,
    itemDiscount: live.discountAmount * item.quantity,
    price: formatRupeeAmount(live.saleAmount),
  };
};

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
  const [shopDeliveryFee, setShopDeliveryFee] = useState<number | undefined>();
  const [feeEstimate, setFeeEstimate] = useState<DeliveryFeeEstimate | null>(null);
  const [isEstimatingFee, setIsEstimatingFee] = useState(false);
  const [liveProducts, setLiveProducts] = useState<ShopProduct[]>([]);

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
        const cached = await cartProductCache.readAll();
        const hydrated = result.items.map(item => {
          const hit = cartProductCache.find(cached, item);
          if (!hit) {
            return item;
          }
          return {
            ...item,
            productId: item.productId || hit.productId,
            shopId: item.shopId || hit.shopId,
            merchantId: item.merchantId || hit.merchantId,
            shopName: item.shopName || hit.shopName || item.merchantName,
            unitPrice: hit.saleAmount,
            originalUnitPrice: hit.originalAmount,
            itemTotal: hit.saleAmount * item.quantity,
            itemDiscount:
              hit.originalAmount != null
                ? Math.max(0, hit.originalAmount - hit.saleAmount) * item.quantity
                : item.itemDiscount,
            price: formatRupeeAmount(hit.saleAmount),
          };
        });
        setItems(hydrated);
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

  const firstItem = items[0];
  const firstShopId = firstItem?.shopId?.trim();
  const firstMerchantId = firstItem?.merchantId?.trim();
  const firstShopName = firstItem?.shopName || firstItem?.merchantName;
  const productIdsKey = items.map(item => item.productId || '').join('|');

  useEffect(() => {
    const token = authToken?.trim();
    if (!token || items.length === 0) {
      setFeeEstimate(null);
      setShopDeliveryFee(undefined);
      setLiveProducts([]);
      setIsEstimatingFee(false);
      return;
    }

    let cancelled = false;
    setIsEstimatingFee(true);

    const loadQuoteAndPrices = async () => {
      const shopRef = {
        shopId: firstShopId,
        merchantId: firstMerchantId,
        shopName: firstShopName,
        city: currentUser?.city || extractCityFromAddress(currentUser?.address),
        productId: firstItem?.productId,
        productName: firstItem?.productName,
      };

      const catalog = await loadCartShopProducts(shopRef, token);
      if (cancelled) {
        return;
      }
      if (catalog.products.length) {
        setLiveProducts(catalog.products);
        for (const item of items) {
          const product = matchShopProduct(catalog.products, item);
          if (product) {
            void cartProductCache.rememberFromShop(product, {
              id: catalog.shopId || product.shopId || '',
              name: firstShopName || product.shopName || 'Store',
              merchantId: firstMerchantId,
              offers: [],
            });
          }
        }
      }

      try {
        const estimate = await estimateDeliveryFeeForShop(
          {
            ...shopRef,
            shopId: catalog.shopId || firstShopId,
          },
          token,
        );
        if (cancelled) {
          return;
        }
        setFeeEstimate(estimate);
        setShopDeliveryFee(estimate.deliveryFee);

        const estimateShopId = estimate.shopId?.trim();
        if (estimateShopId && estimateShopId !== catalog.shopId) {
          try {
            const shop = await shopApi.fetchShopByIdWithOffers(estimateShopId, token);
            if (!cancelled && shop.products?.length) {
              setLiveProducts(shop.products);
            }
          } catch {
            // Keep the catalog already loaded above.
          }
        }
      } catch {
        if (!cancelled) {
          setFeeEstimate(null);
          setShopDeliveryFee(undefined);
        }
      }

      if (!cancelled) {
        setIsEstimatingFee(false);
      }
    };

    void loadQuoteAndPrices();

    return () => {
      cancelled = true;
    };
  }, [
    authToken,
    currentUser?.city,
    firstItem?.productId,
    firstItem?.productName,
    firstMerchantId,
    firstShopId,
    firstShopName,
    items.length,
    productIdsKey,
  ]);

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

  const pricedItems = useMemo(
    () => items.map(item => withLiveProductPrice(item, liveProducts)),
    [items, liveProducts],
  );

  const itemCountLabel =
    summary.totalItemsCount === 1
      ? '1 item'
      : `${summary.totalItemsCount} items`;
  const deliveryTierLabel = deliveryEstimateTierLabel(feeEstimate);
  const deliveryMeta = formatEstimateMeta(feeEstimate);

  const paymentDetails = useMemo(() => {
    const saleTotal = pricedItems.reduce(
      (sum, item) => sum + (item.unitPrice ?? 0) * item.quantity,
      0,
    );
    const originalTotal = pricedItems.reduce((sum, item) => {
      const unit = item.originalUnitPrice ?? item.unitPrice ?? 0;
      return sum + unit * item.quantity;
    }, 0);
    const discount = Math.max(0, originalTotal - saleTotal);
    const deliveryFee = feeEstimate?.deliveryFee ?? shopDeliveryFee;
    return {
      itemPrice: saleTotal,
      originalPrice: originalTotal > saleTotal ? originalTotal : undefined,
      discount,
      deliveryFee,
      totalPayable: saleTotal + (deliveryFee ?? 0),
    };
  }, [feeEstimate, pricedItems, shopDeliveryFee]);

  const handleProceed = async () => {
    if (isProceeding || mutatingItemId || isClearing || items.length === 0) {
      return;
    }

    const token = requireToken();
    if (!token) {
      return;
    }

    const targets = pricedItems
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

    const merchantIds = Array.from(
      new Set(targets.map(target => target.merchantId).filter(Boolean)),
    );
    if (merchantIds.length > 1) {
      showAppAlert(
        'Different stores',
        'Cart has items from more than one store. Please keep items from one store and try again.',
      );
      return;
    }

    try {
      setIsProceeding(true);

      const primary = targets[0];
      const checkoutItems = targets.map(target => ({
        productId: target.productId,
        quantity: target.quantity,
      }));
      console.log('[API] cart checkout single request', {
        merchantId: primary.merchantId,
        itemCount: checkoutItems.length,
        items: checkoutItems,
      });
      const response = await deliveryApi.createOrder(
        {
          merchantId: primary.merchantId,
          items: checkoutItems,
          deliveryAddress,
          phone: normalizedMobile,
          city: currentUser?.city || extractCityFromAddress(deliveryAddress),
          latitude: currentUser?.latitude,
          longitude: currentUser?.longitude,
          estimatedMinutes: 30,
        },
        token,
      );

      if (response.success === false) {
        throw new Error(response.message || 'Could not send delivery request.');
      }

      const orderId = extractDeliveryOrderId(response) || primary.productId;
      const orderIds = [orderId];
      const itemPrice = paymentDetails.itemPrice;
      const deliveryFee = feeEstimate?.deliveryFee ?? shopDeliveryFee ?? 0;
      const totalAmount = itemPrice + deliveryFee;
      const sentParams = {
        shop: primary.shop,
        product: primary.product,
        requestId: orderId,
        orderIds,
        address: deliveryAddress,
        mobile: normalizedMobile,
        itemPrice,
        deliveryFee,
        totalAmount,
      };

      setPendingRequest({
        ...sentParams,
        orderIds,
      });
      // Source of truth is the list API — confirm waiting orders after create.
      void refreshPendingFromApi();

      // Order placed — clear cart; ignore clear failures so Sent still opens.
      try {
        await cartApi.clearCart(token);
      } catch (clearError) {
        console.warn('[Cart] clearCart after createOrder failed', clearError);
      }

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
    const saleUnit = item.unitPrice ?? 0;
    const lineTotal = formatCartPrice(saleUnit * item.quantity);
    const unitLabel = formatCartPrice(saleUnit) ?? item.price;
    const originalLabel =
      item.originalUnitPrice != null && item.originalUnitPrice > saleUnit
        ? formatCartPrice(item.originalUnitPrice)
        : undefined;
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
              <View style={styles.pricePair}>
                <Text style={styles.unitPrice}>{unitLabel}</Text>
                {originalLabel ? (
                  <Text style={styles.originalUnitPrice}>{originalLabel}</Text>
                ) : null}
              </View>
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
              {pricedItems.map(renderItem)}
            </ScrollView>

            <SafeAreaView edges={['bottom']} style={styles.summarySafe}>
              <View style={styles.summaryCard}>
                <Text style={styles.chargesTitle}>Payment Details</Text>
                <View style={styles.chargesCard}>
                  <View style={styles.chargeRow}>
                    <Text style={styles.chargeLabel}>Item Price</Text>
                    <View style={styles.pricePair}>
                      <Text style={styles.chargeValue}>
                        {formatCartPrice(paymentDetails.itemPrice) ?? '₹0'}
                      </Text>
                      {paymentDetails.originalPrice != null ? (
                        <Text style={styles.originalUnitPrice}>
                          {formatCartPrice(paymentDetails.originalPrice)}
                        </Text>
                      ) : null}
                    </View>
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
                    <Text style={styles.chargeLabel}>
                      {deliveryTierLabel ? `Delivery Fee (${deliveryTierLabel})` : 'Delivery Fee'}
                    </Text>
                    {isEstimatingFee && paymentDetails.deliveryFee == null ? (
                      <ActivityIndicator size="small" color={colors.primary} />
                    ) : (
                      <Text style={styles.chargeValue}>
                        {formatCartPrice(paymentDetails.deliveryFee) ?? '₹0'}
                      </Text>
                    )}
                  </View>
                  {deliveryMeta ? <Text style={styles.chargeHint}>{deliveryMeta}</Text> : null}
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
  pricePair: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 1,
  },
  originalUnitPrice: {
    fontSize: 12,
    color: colors.lighterGray,
    fontFamily: fonts.BOLD,
    textDecorationLine: 'line-through',
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
  chargeHint: {
    marginTop: -6,
    marginBottom: 12,
    fontSize: 12,
    color: colors.mutedText,
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
