import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAppContext } from '../../../context/AppContext';
import { usePendingDeliveryRequest } from '../../../context/PendingDeliveryRequestContext';
import { colors, fonts } from '../../../helpers/styles';
import { MainStackParamList } from '../../../navigation/types';
import { showAppAlert } from '../../../services/appAlert';
import { cartApi } from '../../../services/cartApi';
import {
  deliveryApi,
  extractDeliveryOrderId,
} from '../../../services/deliveryApi';
import {
  REQUEST_DELIVERY_FEE,
  REQUEST_PLATFORM_FEE,
  parsePriceAmount,
} from '../../../utils/shopDelivery';
import { extractCityFromAddress } from '../../../utils/location';

const formatRupee = (amount: number) => `₹${Math.max(0, Math.round(amount)).toLocaleString('en-IN')}`;

const resolveDeliveryCity = (...candidates: Array<string | undefined | null>) => {
  for (const candidate of candidates) {
    const trimmed = candidate?.trim();
    if (trimmed) {
      return trimmed;
    }
  }
  return '';
};

const RequestDelivery = () => {
  const navigation =
    useNavigation<StackNavigationProp<MainStackParamList, 'RequestDelivery'>>();
  const route = useRoute();
  const params = (route.params as MainStackParamList['RequestDelivery'] | undefined) ?? undefined;
  const { authToken, currentUser } = useAppContext();
  const { setPendingRequest, refreshPendingFromApi } = usePendingDeliveryRequest();

  // Capture once from initial mount params so later address-only merges never drop product/shop.
  const [shop] = useState(() => params?.shop);
  const [product] = useState(() => params?.product);

  const itemPrice = useMemo(
    () => parsePriceAmount(product?.price),
    [product?.price],
  );
  const deliveryFee = REQUEST_DELIVERY_FEE;
  const platformFee = REQUEST_PLATFORM_FEE;
  const totalAmount = itemPrice + deliveryFee + platformFee;

  const initialAddress = currentUser?.address?.trim() || 'Add delivery address';
  const [address, setAddress] = useState(initialAddress);
  const [city, setCity] = useState(() =>
    resolveDeliveryCity(
      currentUser?.city,
      initialAddress !== 'Add delivery address'
        ? extractCityFromAddress(initialAddress)
        : undefined,
    ),
  );
  const [mobile, setMobile] = useState(currentUser?.phone?.replace(/^\+91/, '') || '');
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const selected = params?.selectedAddress?.trim();
    if (!selected) {
      return;
    }
    setAddress(selected);
    const selectedCity = resolveDeliveryCity(
      params?.selectedCity,
      extractCityFromAddress(selected),
    );
    if (selectedCity) {
      setCity(selectedCity);
    }
    navigation.setParams({ selectedAddress: undefined, selectedCity: undefined });
  }, [navigation, params?.selectedAddress, params?.selectedCity]);

  useEffect(() => {
    if (!product || !shop) {
      showAppAlert('Missing product', 'Could not load delivery details. Please try again.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    }
  }, [navigation, product, shop]);

  const handleChangeAddress = useCallback(() => {
    const current =
      address.trim() && address.trim() !== 'Add delivery address' ? address.trim() : undefined;
    const seedAddress = current || currentUser?.address?.trim() || undefined;
    navigation.navigate('AddAddress', {
      initialAddress: seedAddress,
      initialCity:
        resolveDeliveryCity(
          city,
          currentUser?.city,
          seedAddress ? extractCityFromAddress(seedAddress) : undefined,
        ) || undefined,
      initialLatitude: currentUser?.latitude,
      initialLongitude: currentUser?.longitude,
    });
  }, [
    address,
    city,
    currentUser?.address,
    currentUser?.city,
    currentUser?.latitude,
    currentUser?.longitude,
    navigation,
  ]);

  const handleSendRequest = useCallback(async () => {
    if (!product || !shop) {
      showAppAlert('Missing product', 'Could not load delivery details. Please try again.');
      return;
    }
    if (!authToken?.trim()) {
      showAppAlert('Login required', 'Please log in again to request delivery.');
      return;
    }

    const merchantId = shop.merchantId?.trim() || '';
    const productId = product.id?.trim() || '';
    if (!merchantId) {
      showAppAlert('Merchant required', 'Could not find the merchant for this product.');
      return;
    }
    if (!productId) {
      showAppAlert('Product required', 'Could not find the product for this delivery request.');
      return;
    }
    const deliveryAddress = address.trim();
    if (!deliveryAddress || deliveryAddress === 'Add delivery address') {
      showAppAlert('Address required', 'Please set a delivery address to continue.');
      return;
    }
    const normalizedMobile = mobile.replace(/\D/g, '');
    if (normalizedMobile.length < 10) {
      showAppAlert('Mobile required', 'Please enter a valid 10-digit mobile number.');
      return;
    }

    try {
      setIsSubmitting(true);

      const response = await deliveryApi.createOrder(
        {
          merchantId,
          productId,
          customItemName: product.title?.trim() || 'Item',
          quantity: 1,
          itemPrice,
          note: note.trim(),
          deliveryAddress,
          phone: normalizedMobile,
        },
        authToken,
      );

      if (response.success === false) {
        throw new Error(response.message || 'Could not send your delivery request.');
      }

      const orderId = extractDeliveryOrderId(response);
      const requestId = orderId || productId;
      const sentParams = {
        shop,
        product,
        requestId,
        orderIds: [requestId],
        address: deliveryAddress,
        mobile: normalizedMobile,
        note: note.trim() || undefined,
        itemPrice,
        deliveryFee,
        platformFee,
        totalAmount,
      };
      setPendingRequest({
        ...sentParams,
        orderIds: [requestId],
      });
      // Source of truth is the list API — confirm waiting orders after create.
      void refreshPendingFromApi();

      // Order placed — clear cart; ignore clear failures so Sent still opens.
      try {
        await cartApi.clearCart(authToken);
      } catch (clearError) {
        console.warn('[RequestDelivery] clearCart after createOrder failed', clearError);
      }

      navigation.replace('RequestDeliverySent', sentParams);
    } catch (error) {
      showAppAlert(
        'Request failed',
        error instanceof Error ? error.message : 'Could not send your delivery request.',
      );
    } finally {
      setIsSubmitting(false);
    }
  }, [
    address,
    authToken,
    deliveryFee,
    itemPrice,
    mobile,
    navigation,
    note,
    platformFee,
    product,
    refreshPendingFromApi,
    setPendingRequest,
    shop,
    totalAmount,
  ]);

  if (!product || !shop) {
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
            <Text style={styles.headerTitle}>Request Delivery</Text>
            <View style={styles.backBtn} />
          </View>
        </SafeAreaView>
        <View style={styles.missingState}>
          <ActivityIndicator size="small" color={colors.primary} />
        </View>
      </View>
    );
  }

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
          <Text style={styles.headerTitle}>Request Delivery</Text>
          <View style={styles.backBtn} />
        </View>
      </SafeAreaView>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <Text style={styles.sectionLabel}>Delivery Address</Text>
          <View style={styles.addressCard}>
            <View style={styles.addressIcon}>
              <MaterialCommunityIcons name="home-outline" size={20} color={colors.primary} />
            </View>
            <View style={styles.addressBody}>
              <View style={styles.addressTopRow}>
                <Text style={styles.addressTitle}>
                  {currentUser?.name?.trim() ? 'Home' : 'Delivery location'}
                </Text>
                <TouchableOpacity onPress={handleChangeAddress} activeOpacity={0.8}>
                  <Text style={styles.changeText}>Change</Text>
                </TouchableOpacity>
              </View>
              {currentUser?.name?.trim() ? (
                <Text style={styles.addressName}>{currentUser.name.trim()}</Text>
              ) : null}
              <Text style={styles.addressText}>
                {city.trim() ? `${address}\n${city.trim()}` : address}
              </Text>
            </View>
          </View>

          <Text style={styles.sectionLabel}>Mobile Number</Text>
          <View style={styles.inputBox}>
            <Text style={styles.prefix}>+91</Text>
            <TextInput
              style={styles.input}
              value={mobile}
              onChangeText={setMobile}
              keyboardType="phone-pad"
              maxLength={10}
              placeholder="Enter mobile number"
              placeholderTextColor="#B0B7C3"
              underlineColorAndroid="transparent"
            />
          </View>

          <Text style={styles.sectionLabel}>Note (Optional)</Text>
          <TextInput
            style={styles.noteInput}
            value={note}
            onChangeText={setNote}
            placeholder="Add instructions for the merchant"
            placeholderTextColor="#B0B7C3"
            multiline
            textAlignVertical="top"
            underlineColorAndroid="transparent"
          />

          <Text style={styles.sectionLabel}>Charges Details</Text>
          <View style={styles.chargesCard}>
            <View style={styles.chargeRow}>
              <Text style={styles.chargeLabel}>Item Price</Text>
              <Text style={styles.chargeValue}>{formatRupee(itemPrice)}</Text>
            </View>
            <View style={styles.chargeRow}>
              <Text style={styles.chargeLabel}>Delivery Fee</Text>
              <Text style={styles.chargeValue}>{formatRupee(deliveryFee)}</Text>
            </View>
            <View style={styles.chargeRow}>
              <Text style={styles.chargeLabel}>Platform Fee</Text>
              <Text style={styles.chargeValue}>{formatRupee(platformFee)}</Text>
            </View>
            <View style={styles.totalDivider} />
            <View style={styles.chargeRow}>
              <Text style={styles.totalLabel}>Total Amount</Text>
              <Text style={styles.totalValue}>{formatRupee(totalAmount)}</Text>
            </View>
          </View>
        </ScrollView>

        <SafeAreaView edges={['bottom']} style={styles.footer}>
          <TouchableOpacity
            style={[styles.cta, isSubmitting && styles.ctaOff]}
            activeOpacity={0.9}
            disabled={isSubmitting}
            onPress={handleSendRequest}>
            {isSubmitting ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <Text style={styles.ctaText}>Send Request</Text>
            )}
          </TouchableOpacity>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </View>
  );
};

export default RequestDelivery;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F4F7FC',
  },
  flex: {
    flex: 1,
  },
  missingState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerSafe: {
    backgroundColor: colors.white,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E4EAF3',
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
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 24,
  },
  sectionLabel: {
    fontSize: 13,
    color: colors.mutedText,
    fontFamily: fonts.BOLD,
    marginBottom: 10,
    marginTop: 6,
  },
  addressCard: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E8EDF5',
    marginBottom: 16,
  },
  addressIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addressBody: {
    flex: 1,
  },
  addressTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  addressTitle: {
    fontSize: 15,
    color: colors.text,
    fontFamily: fonts.BOLD,
  },
  changeText: {
    fontSize: 13,
    color: colors.primary,
    fontFamily: fonts.BOLD,
  },
  addressName: {
    marginTop: 4,
    fontSize: 13,
    color: colors.text,
    fontFamily: fonts.BOLD,
  },
  addressText: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 18,
    color: colors.mutedText,
    fontFamily: fonts.BOLD,
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E8EDF5',
    paddingHorizontal: 14,
    height: 52,
    marginBottom: 16,
  },
  prefix: {
    fontSize: 15,
    color: colors.text,
    fontFamily: fonts.BOLD,
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: colors.text,
    fontFamily: fonts.BOLD,
    paddingVertical: 0,
  },
  noteInput: {
    minHeight: 96,
    backgroundColor: colors.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E8EDF5',
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: colors.text,
    fontFamily: fonts.BOLD,
    marginBottom: 16,
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
  footer: {
    backgroundColor: colors.white,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E4EAF3',
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  cta: {
    height: 52,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaOff: {
    opacity: 0.7,
  },
  ctaText: {
    color: colors.white,
    fontSize: 16,
    fontFamily: fonts.BOLD,
  },
});
