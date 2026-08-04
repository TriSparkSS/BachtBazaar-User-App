import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  PermissionsAndroid,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RouteProp, useIsFocused, useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { Camera, CameraType } from 'react-native-camera-kit';
import { launchImageLibrary } from 'react-native-image-picker';
import { useAppContext } from '../../context/AppContext';
import { colors, fonts } from '../../helpers/styles';
import {
  parseQrCodeValue,
  ParsedQrData,
  resolveMerchantIdFromQrPayload,
  resolveProductIdFromQrPayload,
  resolveShopIdFromQrPayload,
} from '../../helpers/offerQrCode';
import { MainStackParamList } from '../../navigation/types';
import { showAppAlert } from '../../services/appAlert';
import { logApiEvent } from '../../services/apiClient';
import { shopApi } from '../../services/shopApi';
import { decodeQrFromBase64Image } from '../../utils/decodeQrFromImage';

/** Compact scan log — keys + ids only (never dump huge buffers). */
const logScanPayload = (
  label: string,
  parsed: ParsedQrData,
  extras?: Record<string, unknown>,
) => {
  const payload = parsed.payload ?? null;
  const keys = payload ? Object.keys(payload) : [];
  const summary = {
    kind: parsed.kind,
    type: payload?.type,
    keys,
    shopId: resolveShopIdFromQrPayload(payload, {
      allowGenericId: parsed.kind === 'store',
      // Do not treat merchantId as shopId in logs — they are different ids.
      allowMerchantIdFallback: false,
    }) || undefined,
    merchantId: resolveMerchantIdFromQrPayload(payload) || undefined,
    productId: resolveProductIdFromQrPayload(payload) || undefined,
    offerId:
      String(payload?.offerId ?? payload?.offer_id ?? '').trim() || undefined,
    ...extras,
  };
  console.log(`[Scan] ${label}`, summary);
  logApiEvent(`QR ${label}`, summary);
};

const requestCameraPermission = async () => {
  if (Platform.OS !== 'android') {
    return true;
  }

  const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.CAMERA, {
    title: 'Camera permission',
    message: 'Allow camera access to scan offer QR codes.',
    buttonPositive: 'Allow',
    buttonNegative: 'Cancel',
  });

  return granted === PermissionsAndroid.RESULTS.GRANTED;
};

const resolveOfferIdFromScan = (result: ParsedQrData | null): string => {
  if (!result?.payload) {
    return '';
  }
  return String(result.payload.offerId ?? result.payload.offer_id ?? result.payload._id ?? '').trim();
};

const resolveUserIdFromScan = (result: ParsedQrData | null): string => {
  if (!result?.payload) {
    return '';
  }
  return String(result.payload.userId ?? result.payload.user_id ?? '').trim();
};

const ScannerScreen = () => {
  const navigation = useNavigation<StackNavigationProp<MainStackParamList, 'ScannerScreen'>>();
  const route = useRoute<RouteProp<MainStackParamList, 'ScannerScreen'>>();
  const isFocused = useIsFocused();
  const { authToken, currentUser } = useAppContext();
  const expectedOfferId = route.params?.expectedOfferId?.trim() || '';
  const expectedOfferTitle = route.params?.expectedOfferTitle?.trim() || '';
  const requireOfferMatch = Boolean(expectedOfferId);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isScanning, setIsScanning] = useState(true);
  const [isGalleryScanning, setIsGalleryScanning] = useState(false);
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const [scanResult, setScanResult] = useState<ParsedQrData | null>(null);
  const lastScanRef = useRef('');

  useEffect(() => {
    let mounted = true;
    requestCameraPermission().then(granted => {
      if (mounted) {
        setHasPermission(granted);
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  const resetToScanning = useCallback(() => {
    lastScanRef.current = '';
    setScanResult(null);
    setIsRedeeming(false);
    setIsNavigating(false);
    setIsScanning(true);
  }, []);

  const openStoreFromScan = useCallback(
    async (parsed: ParsedQrData) => {
      const payload = parsed.payload ?? null;
      const explicitShopId = resolveShopIdFromQrPayload(payload, { allowGenericId: true });
      const merchantId = resolveMerchantIdFromQrPayload(payload);
      const shopName =
        String(payload?.shopName ?? payload?.storeName ?? payload?.name ?? '').trim() || undefined;
      const city = String(payload?.city ?? '').trim() || undefined;

      console.log(
        `[Scan] store QR merchantId=${merchantId || '—'} shopName=${shopName || '—'} city=${city || '—'}`,
      );
      logScanPayload('store QR', parsed, {
        explicitShopId: explicitShopId || undefined,
        merchantId: merchantId || undefined,
        shopName,
        city,
      });

      // Prefer real shopId from QR when present (and not just merchantId reused as id).
      if (explicitShopId && explicitShopId !== merchantId) {
        console.log('[Scan] extracted shopId', explicitShopId, { merchantId: merchantId || undefined });
        logApiEvent('QR navigate store', {
          shopId: explicitShopId,
          merchantId: merchantId || undefined,
          kind: parsed.kind,
          source: 'qr_shopId',
        });
        navigation.replace('StoreDetail', {
          shopId: explicitShopId,
          shop: { id: explicitShopId },
        });
        return;
      }

      if (!merchantId) {
        showAppAlert(
          'Invalid store QR',
          'This QR does not contain a merchant id or store id.',
          [{ text: 'Scan again', onPress: resetToScanning }],
        );
        return;
      }

      setIsNavigating(true);
      try {
        // merchantId ≠ shopId — resolve via search / city list (never GET /shop/{merchantId}).
        const shopId = await shopApi.resolveShopIdByMerchantId(
          { merchantId, shopName, city },
          authToken ?? undefined,
        );

        if (!shopId) {
          throw new Error(
            shopName
              ? `Could not find store "${shopName}" for this merchant. Check your connection and try again.`
              : 'Could not find a store for this merchant. Check your connection and try again.',
          );
        }

        console.log('[Scan] extracted shopId', shopId, { merchantId });
        logApiEvent('QR navigate store', {
          shopId,
          merchantId,
          kind: parsed.kind,
          source: 'merchant_lookup',
        });
        navigation.replace('StoreDetail', { shopId, shop: { id: shopId } });
      } catch (error) {
        setIsNavigating(false);
        const message =
          error instanceof Error
            ? error.message
            : 'Could not load this store from the merchant QR.';
        showAppAlert('Store not found', message, [
          { text: 'Scan again', style: 'cancel', onPress: resetToScanning },
          {
            text: 'Retry',
            onPress: () => {
              void openStoreFromScan(parsed);
            },
          },
        ]);
      }
    },
    [authToken, navigation, resetToScanning],
  );

  const openProductFromScan = useCallback(
    async (parsed: ParsedQrData) => {
      const productId = resolveProductIdFromQrPayload(parsed.payload);
      if (!productId) {
        showAppAlert(
          'Invalid product QR',
          'This QR does not contain a valid product id.',
          [{ text: 'Scan again', onPress: resetToScanning }],
        );
        return;
      }

      try {
        setIsNavigating(true);
        let shopId = resolveShopIdFromQrPayload(parsed.payload);

        // If QR only has productId, discover shopId via search (same product shape as Home).
        if (!shopId) {
          const search = await shopApi.searchShopsProductsAndOffers(
            productId,
            authToken ?? undefined,
          );
          const searchHit = search.products.find(item => item.id === productId);
          shopId = searchHit?.shopId?.trim() || '';
        }

        if (!shopId) {
          throw new Error('This product QR is missing a store id.');
        }

        const shop = await shopApi.fetchShopByIdWithOffers(shopId, authToken ?? undefined);
        const product = shop.products?.find(item => item.id === productId);
        if (!product) {
          throw new Error('Product not found for this store.');
        }

        logApiEvent('QR navigate product', {
          productId,
          shopId,
          productTitle: product.title,
        });
        navigation.replace('ProductDetail', { shop, product });
      } catch (error) {
        showAppAlert(
          'Product unavailable',
          error instanceof Error ? error.message : 'Could not load product details.',
          [{ text: 'Scan again', onPress: resetToScanning }],
        );
      } finally {
        setIsNavigating(false);
      }
    },
    [authToken, navigation, resetToScanning],
  );

  const applyScanResult = useCallback(
    (value: string) => {
      const trimmed = value.trim();
      if (!trimmed || trimmed === lastScanRef.current) {
        return;
      }

      lastScanRef.current = trimmed;
      setIsScanning(false);

      const parsed = parseQrCodeValue(trimmed);
      const scannedOfferId = resolveOfferIdFromScan(parsed);
      const scannedShopId = resolveShopIdFromQrPayload(parsed.payload, {
        allowGenericId: parsed.kind === 'store',
        allowMerchantIdFallback: parsed.kind === 'store',
      });
      const scannedProductId = resolveProductIdFromQrPayload(parsed.payload);

      logApiEvent('QR scanned raw', {
        raw: trimmed.length > 500 ? `${trimmed.slice(0, 500)}…` : trimmed,
        length: trimmed.length,
      });
      logScanPayload('parsed', parsed, {
        offerId: scannedOfferId || undefined,
        productId: scannedProductId || undefined,
        userId: resolveUserIdFromScan(parsed) || undefined,
        offerType: parsed.payload?.offerType ?? parsed.payload?.offer_type,
        shopId: scannedShopId || undefined,
        expectedOfferId: expectedOfferId || undefined,
        requireOfferMatch,
      });

      // When opened from Offer Detail, scanned QR must match that offer.
      if (requireOfferMatch) {
        if (!scannedOfferId) {
          showAppAlert(
            'Wrong QR code',
            expectedOfferTitle
              ? `Please scan the QR for "${expectedOfferTitle}". This code has no offer id.`
              : 'Please scan the QR for this offer. This code has no offer id.',
            [{ text: 'Scan again', onPress: resetToScanning }],
          );
          return;
        }

        if (scannedOfferId !== expectedOfferId) {
          showAppAlert(
            'Offer mismatch',
            expectedOfferTitle
              ? `This QR belongs to a different offer. Please scan the QR for "${expectedOfferTitle}".`
              : 'This QR belongs to a different offer. Please scan the QR for the offer you opened.',
            [{ text: 'Scan again', onPress: resetToScanning }],
          );
          return;
        }
      }

      if (parsed.kind === 'store') {
        void openStoreFromScan(parsed);
        return;
      }

      if (parsed.kind === 'product') {
        void openProductFromScan(parsed);
        return;
      }

      setScanResult(parsed);
    },
    [
      expectedOfferId,
      expectedOfferTitle,
      openProductFromScan,
      openStoreFromScan,
      requireOfferMatch,
      resetToScanning,
    ],
  );

  const handleReadCode = useCallback(
    (event: any) => {
      if (!isScanning) {
        return;
      }
      const value = String(event?.nativeEvent?.codeStringValue || '').trim();
      if (!value) {
        return;
      }
      applyScanResult(value);
    },
    [applyScanResult, isScanning],
  );

  const handleScanAgain = useCallback(() => {
    resetToScanning();
  }, [resetToScanning]);

  const handleRedeem = useCallback(async () => {
    const offerId = resolveOfferIdFromScan(scanResult);
    if (!offerId) {
      showAppAlert('Redeem unavailable', 'This QR does not contain a valid offer id.');
      return;
    }

    if (requireOfferMatch && offerId !== expectedOfferId) {
      showAppAlert(
        'Offer mismatch',
        expectedOfferTitle
          ? `This QR belongs to a different offer. Please scan the QR for "${expectedOfferTitle}".`
          : 'This QR belongs to a different offer. Please scan the QR for the offer you opened.',
        [{ text: 'Scan again', onPress: resetToScanning }],
      );
      return;
    }

    const userId = resolveUserIdFromScan(scanResult) || currentUser?._id?.trim() || '';
    if (!userId) {
      showAppAlert('Redeem unavailable', 'User id is missing for this redemption.');
      return;
    }

    const token = authToken?.trim();
    if (!token) {
      showAppAlert('Login required', 'Please log in again to redeem this offer.');
      return;
    }

    try {
      setIsRedeeming(true);
      const response = await shopApi.claimDirectUserOffer(offerId, userId, token);
      if (response.success === false) {
        throw new Error(response.message || 'Could not redeem this offer.');
      }

      const successMessage =
        response.message ||
        (response.data?.offerTitle
          ? `Offer successfully claimed: ${response.data.offerTitle}`
          : 'Offer successfully claimed: Show this confirmation screen to the shopkeeper.');

      showAppAlert('Redeemed successfully', successMessage, [
        { text: 'Scan again', style: 'cancel', onPress: handleScanAgain },
        {
          text: 'View history',
          onPress: () => navigation.navigate('OfferRedemptionHistory'),
        },
      ]);
    } catch (error) {
      showAppAlert(
        'Redeem failed',
        error instanceof Error ? error.message : 'Could not redeem this offer.',
      );
    } finally {
      setIsRedeeming(false);
    }
  }, [
    authToken,
    currentUser?._id,
    expectedOfferId,
    expectedOfferTitle,
    handleScanAgain,
    navigation,
    requireOfferMatch,
    resetToScanning,
    scanResult,
  ]);

  const scannedOfferId = resolveOfferIdFromScan(scanResult);
  const canRedeem = Boolean(scannedOfferId) && (scanResult?.kind === 'offer' || scanResult?.kind === 'unknown');

  const scanFromGallery = useCallback(async () => {
    try {
      setIsGalleryScanning(true);
      const response = await launchImageLibrary({
        mediaType: 'photo',
        quality: 0.9,
        includeBase64: true,
        selectionLimit: 1,
      });

      if (response.didCancel) {
        return;
      }
      if (response.errorCode) {
        showAppAlert('Gallery failed', response.errorMessage || 'Unable to open gallery.');
        return;
      }

      const decoded = decodeQrFromBase64Image(response.assets?.[0]?.base64);
      if (!decoded) {
        showAppAlert('No QR found', 'Could not detect a QR code in this image.');
        return;
      }

      applyScanResult(decoded);
    } catch (error) {
      showAppAlert(
        'Scan failed',
        error instanceof Error ? error.message : 'Unable to scan QR from gallery.',
      );
    } finally {
      setIsGalleryScanning(false);
    }
  }, [applyScanResult]);

  if (hasPermission === null) {
    return (
      <View style={styles.root}>
        <SafeAreaView edges={['top']} style={styles.headerSafe}>
          <View style={styles.header}>
            <TouchableOpacity style={styles.headerButton} onPress={() => navigation.goBack()}>
              <MaterialCommunityIcons name="arrow-left" size={22} color={colors.white} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Scan QR Code</Text>
            <View style={styles.headerButton} />
          </View>
        </SafeAreaView>
        <View style={styles.centerWrap}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.centerText}>Checking camera permission...</Text>
        </View>
      </View>
    );
  }

  if (!hasPermission) {
    return (
      <View style={styles.root}>
        <SafeAreaView edges={['top']} style={styles.headerSafe}>
          <View style={styles.header}>
            <TouchableOpacity style={styles.headerButton} onPress={() => navigation.goBack()}>
              <MaterialCommunityIcons name="arrow-left" size={22} color={colors.white} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Scan QR Code</Text>
            <View style={styles.headerButton} />
          </View>
        </SafeAreaView>
        <View style={styles.centerWrap}>
          <MaterialCommunityIcons name="camera-off-outline" size={42} color="#94A3B8" />
          <Text style={styles.centerTitle}>Camera access needed</Text>
          <Text style={styles.centerText}>
            Enable camera permission to scan offer and user QR codes.
          </Text>
          <TouchableOpacity
            style={styles.retryBtn}
            onPress={async () => setHasPermission(await requestCameraPermission())}>
            <Text style={styles.retryBtnText}>Try Again</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.galleryBtn}
            disabled={isGalleryScanning}
            onPress={scanFromGallery}>
            <Text style={styles.retryBtnText}>
              {isGalleryScanning ? 'Scanning...' : 'Scan from Gallery'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <SafeAreaView edges={['top']} style={styles.headerSafe}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.headerButton} onPress={() => navigation.goBack()}>
            <MaterialCommunityIcons name="arrow-left" size={22} color={colors.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Scan QR Code</Text>
          <TouchableOpacity
            style={styles.headerButton}
            disabled={isGalleryScanning}
            onPress={scanFromGallery}>
            <MaterialCommunityIcons name="image-outline" size={22} color={colors.white} />
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <View style={styles.scannerWrap}>
        {isScanning && isFocused ? (
          <Camera
            style={styles.camera}
            cameraType={CameraType.Back}
            scanBarcode
            showFrame
            laserColor={colors.primary}
            frameColor={colors.white}
            onReadCode={handleReadCode}
          />
        ) : (
          <View style={styles.pausedOverlay}>
            {isNavigating ? (
              <>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={styles.pausedTitle}>Loading details…</Text>
                <Text style={styles.pausedSub}>Fetching full store / product data</Text>
              </>
            ) : (
              <>
                <MaterialCommunityIcons name="check-decagram" size={48} color="#16A34A" />
                <Text style={styles.pausedTitle}>QR code scanned</Text>
                <Text style={styles.pausedSub}>Review the details below</Text>
              </>
            )}
          </View>
        )}
      </View>

      <ScrollView
        style={styles.resultScroll}
        contentContainerStyle={styles.resultContent}
        showsVerticalScrollIndicator={false}>
        {scanResult ? (
          <View style={styles.resultCard}>
            <View style={styles.resultHeader}>
              <View
                style={[
                  styles.kindBadge,
                  scanResult.kind === 'user'
                    ? styles.userBadge
                    : scanResult.kind === 'offer'
                      ? styles.offerBadge
                      : styles.unknownBadge,
                ]}>
                <Text style={styles.kindBadgeText}>
                  {scanResult.kind === 'user'
                    ? 'User QR'
                    : scanResult.kind === 'offer'
                      ? 'Offer QR'
                      : 'QR Data'}
                </Text>
              </View>
              <Text style={styles.resultTitle}>{scanResult.title}</Text>
              {scanResult.subtitle ? (
                <Text style={styles.resultSubtitle}>{scanResult.subtitle}</Text>
              ) : null}
            </View>

            {scanResult.fields.map(field => (
              <View key={`${field.label}-${field.value}`} style={styles.resultRow}>
                <Text style={styles.resultLabel}>{field.label}</Text>
                <Text style={styles.resultValue}>{field.value}</Text>
              </View>
            ))}

            {canRedeem ? (
              <TouchableOpacity
                style={[styles.redeemBtn, isRedeeming && styles.redeemBtnDisabled]}
                onPress={handleRedeem}
                disabled={isRedeeming}
                activeOpacity={0.9}>
                {isRedeeming ? (
                  <ActivityIndicator size="small" color={colors.white} />
                ) : (
                  <>
                    <MaterialCommunityIcons name="ticket-confirmation-outline" size={18} color={colors.white} />
                    <Text style={styles.redeemText}>Redeem</Text>
                  </>
                )}
              </TouchableOpacity>
            ) : null}

            <TouchableOpacity
              style={[styles.scanAgainBtn, canRedeem && styles.scanAgainBtnSecondary]}
              onPress={handleScanAgain}
              activeOpacity={0.9}>
              <MaterialCommunityIcons
                name="qrcode-scan"
                size={18}
                color={canRedeem ? colors.primary : colors.white}
              />
              <Text style={[styles.scanAgainText, canRedeem && styles.scanAgainTextSecondary]}>
                Scan Another QR
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.hintCard}>
            <MaterialCommunityIcons name="qrcode-scan" size={28} color={colors.primary} />
            <Text style={styles.hintTitle}>Point camera at QR code</Text>
            <Text style={styles.hintText}>
              Scan a store, product, offer, or user QR to open details instantly. You can also
              pick a QR image from gallery.
            </Text>
            <TouchableOpacity
              style={styles.galleryInlineBtn}
              disabled={isGalleryScanning}
              onPress={scanFromGallery}
              activeOpacity={0.88}>
              <MaterialCommunityIcons name="image-outline" size={18} color={colors.primary} />
              <Text style={styles.galleryInlineText}>
                {isGalleryScanning ? 'Scanning...' : 'Scan from Gallery'}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

export default ScannerScreen;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.primary,
  },
  headerSafe: {
    backgroundColor: colors.primary,
  },
  header: {
    height: 54,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  headerButton: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    color: colors.white,
    fontSize: 17,
    fontFamily: fonts.BOLD,
  },
  centerWrap: {
    flex: 1,
    backgroundColor: '#F4F6FA',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  centerTitle: {
    marginTop: 14,
    fontSize: 17,
    color: colors.text,
    fontFamily: fonts.BOLD,
  },
  centerText: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
    color: colors.mutedText,
    fontFamily: fonts.BOLD,
  },
  retryBtn: {
    marginTop: 18,
    backgroundColor: colors.primary,
    borderRadius: 999,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  galleryBtn: {
    marginTop: 10,
    backgroundColor: '#1F56C0',
    borderRadius: 999,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  retryBtnText: {
    color: colors.white,
    fontSize: 13,
    fontFamily: fonts.BOLD,
  },
  scannerWrap: {
    height: 320,
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#0A1220',
  },
  camera: {
    flex: 1,
  },
  pausedOverlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#101A2B',
    paddingHorizontal: 24,
  },
  pausedTitle: {
    marginTop: 12,
    fontSize: 18,
    color: colors.white,
    fontFamily: fonts.BOLD,
  },
  pausedSub: {
    marginTop: 6,
    fontSize: 13,
    color: 'rgba(255,255,255,0.75)',
    fontFamily: fonts.BOLD,
  },
  resultScroll: {
    flex: 1,
    marginTop: 14,
    backgroundColor: '#F4F6FA',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  resultContent: {
    padding: 16,
    paddingBottom: 28,
  },
  resultCard: {
    backgroundColor: colors.white,
    borderRadius: 18,
    padding: 16,
    shadowColor: '#1B2430',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  resultHeader: {
    marginBottom: 12,
  },
  kindBadge: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 10,
  },
  offerBadge: {
    backgroundColor: colors.primarySoft,
  },
  userBadge: {
    backgroundColor: '#E8F5E9',
  },
  unknownBadge: {
    backgroundColor: '#F3F4F6',
  },
  kindBadgeText: {
    fontSize: 11,
    color: colors.text,
    fontFamily: fonts.BOLD,
  },
  resultTitle: {
    fontSize: 17,
    color: colors.text,
    fontFamily: fonts.BOLD,
  },
  resultSubtitle: {
    marginTop: 4,
    fontSize: 12,
    color: colors.mutedText,
    fontFamily: fonts.BOLD,
  },
  resultRow: {
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E8EDF5',
  },
  resultLabel: {
    fontSize: 11,
    color: colors.mutedText,
    fontFamily: fonts.BOLD,
    marginBottom: 3,
  },
  resultValue: {
    fontSize: 14,
    color: colors.text,
    fontFamily: fonts.BOLD,
  },
  scanAgainBtn: {
    marginTop: 16,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  scanAgainBtnSecondary: {
    marginTop: 10,
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
  },
  scanAgainText: {
    color: colors.white,
    fontSize: 14,
    fontFamily: fonts.BOLD,
  },
  scanAgainTextSecondary: {
    color: colors.primary,
  },
  redeemBtn: {
    marginTop: 16,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#16A34A',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  redeemBtnDisabled: {
    opacity: 0.7,
  },
  redeemText: {
    color: colors.white,
    fontSize: 14,
    fontFamily: fonts.BOLD,
  },
  hintCard: {
    backgroundColor: colors.white,
    borderRadius: 18,
    padding: 18,
    alignItems: 'center',
  },
  hintTitle: {
    marginTop: 10,
    fontSize: 16,
    color: colors.text,
    fontFamily: fonts.BOLD,
  },
  hintText: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
    color: colors.mutedText,
    fontFamily: fonts.BOLD,
  },
  galleryInlineBtn: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  galleryInlineText: {
    fontSize: 13,
    color: colors.primary,
    fontFamily: fonts.BOLD,
  },
});
