import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAppContext } from '../../../context/AppContext';
import { colors, fonts } from '../../../helpers/styles';
import { openChatWithNumber, openPhoneDialer } from '../../../helpers/contactActions';
import { MainStackParamList } from '../../../navigation/types';
import { showAppAlert } from '../../../services/appAlert';
import { MerchantBidData, bestRequestApi } from '../../../services/bestRequestApi';
import { shopApi } from '../../../services/shopApi';
import { Shop } from '../../../types/shop';
import { formatShopAddress } from '../../../utils/shop';

const formatRespondedAt = (value?: string) => {
  if (!value) {
    return 'Just now';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const InfoRow = ({
  icon,
  label,
  value,
}: {
  icon: string;
  label: string;
  value?: string | null;
}) => {
  if (!value?.trim()) {
    return null;
  }

  return (
    <View style={styles.infoRow}>
      <View style={styles.infoIcon}>
        <MaterialCommunityIcons name={icon} size={16} color={colors.primary} />
      </View>
      <View style={styles.infoCopy}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
  );
};

const MerchantBidDetail = () => {
  const navigation =
    useNavigation<StackNavigationProp<MainStackParamList, 'MerchantBidDetail'>>();
  const route = useRoute();
  const params = route.params as MainStackParamList['MerchantBidDetail'];
  const insets = useSafeAreaInsets();
  const { authToken } = useAppContext();

  const [bid, setBid] = useState<MerchantBidData>(params.bid);
  const [requestStatus, setRequestStatus] = useState(params.requestStatus || 'active');
  const [shop, setShop] = useState<Shop | null>(null);
  const [isLoadingShop, setIsLoadingShop] = useState(Boolean(params.bid.shopId));
  const [isClosing, setIsClosing] = useState(false);

  const loadShopDetails = useCallback(async () => {
    const shopId = params.bid.shopId?.trim();
    if (!shopId || !authToken?.trim()) {
      setIsLoadingShop(false);
      return;
    }

    try {
      setIsLoadingShop(true);
      const detail = await shopApi.fetchShopById(shopId, authToken);
      setShop(detail);
      setBid(prev => ({
        ...prev,
        shopName: detail.name || prev.shopName,
        merchantName: detail.merchantName || prev.merchantName,
        address: formatShopAddress(detail) || prev.address,
        city: detail.city || prev.city,
        phone: detail.phone || prev.phone,
        whatsapp: detail.phone || prev.whatsapp || prev.phone,
        email: detail.email || prev.email,
        details: detail.tagline || prev.details,
        logo: detail.logo || prev.logo,
        rating:
          detail.rating != null && detail.rating !== ''
            ? Number(String(detail.rating).replace(/[^\d.]/g, '')) || prev.rating
            : prev.rating,
      }));
    } catch {
      // Keep bid payload if shop detail fails
    } finally {
      setIsLoadingShop(false);
    }
  }, [authToken, params.bid.shopId]);

  useEffect(() => {
    loadShopDetails();
  }, [loadShopDetails]);

  const price = bid.bidAmount ?? bid.price ?? bid.offerPrice;
  const storeName = bid.shopName || shop?.name || 'Store';
  const merchantName = bid.merchantName || shop?.merchantName;
  const address = bid.address || (shop ? formatShopAddress(shop) : undefined);
  const phone = bid.phone || bid.whatsapp || shop?.phone;
  const email = bid.email || shop?.email;
  const storeDetails = bid.details || shop?.tagline;
  const offerDetails = bid.message || bid.note;
  const logoUri = shopApi.resolveImageUrl(bid.logo || shop?.logo);
  const bannerUri = shopApi.resolveImageUrl(shop?.coverImage);

  const requestStatusMeta = useMemo(() => {
    const value = (requestStatus || 'active').toLowerCase();
    if (value.includes('cancel')) {
      return { label: 'Cancelled', tone: 'muted' as const };
    }
    if (value.includes('expir')) {
      return { label: 'Expired', tone: 'danger' as const };
    }
    if (value.includes('complete') || value.includes('closed')) {
      return { label: 'Completed', tone: 'success' as const };
    }
    if (value.includes('active') || value.includes('open') || value.includes('pending')) {
      return { label: 'Active', tone: 'active' as const };
    }
    const pretty = (requestStatus || 'Active').trim();
    return {
      label: pretty ? pretty.charAt(0).toUpperCase() + pretty.slice(1) : 'Active',
      tone: 'muted' as const,
    };
  }, [requestStatus]);

  const isRequestActive = useMemo(() => {
    const value = (requestStatus || 'active').toLowerCase();
    return (
      value.includes('active') ||
      value.includes('open') ||
      value.includes('pending') ||
      !requestStatus?.trim()
    );
  }, [requestStatus]);

  const isBidClosed = useMemo(() => {
    const status = (bid.status || '').toLowerCase();
    return ['closed', 'accepted', 'rejected', 'cancelled', 'canceled'].includes(status);
  }, [bid.status]);

  const canShowCloseBid = isRequestActive && !isBidClosed;

  const handleCall = async () => {
    try {
      await openPhoneDialer(phone);
    } catch (error) {
      showAppAlert(
        'Call unavailable',
        error instanceof Error ? error.message : 'Phone number is not available.',
      );
    }
  };

  const handleChat = async () => {
    try {
      await openChatWithNumber(
        phone,
        `Hi, I saw your offer on Bachat Bazaar for "${params.requestTitle}".`,
      );
    } catch (error) {
      showAppAlert(
        'Chat unavailable',
        error instanceof Error ? error.message : 'Mobile number is not available for chat.',
      );
    }
  };

  const performCloseBid = async () => {
    if (!authToken?.trim()) {
      showAppAlert('Login required', 'Please log in again to close this bid.');
      return;
    }

    const requestId =
      params.requestId?.trim() || bid.requestId?.trim() || bid._id?.trim() || '';
    if (!requestId) {
      showAppAlert('Request unavailable', 'Request id is missing for this bid.');
      return;
    }

    try {
      setIsClosing(true);
      const response = await bestRequestApi.closeBid(requestId, authToken);
      const nextStatus = response.data?.status || 'completed';
      setBid(prev => ({
        ...prev,
        status: nextStatus,
      }));
      setRequestStatus(nextStatus);
      showAppAlert('Bid closed', response.message || 'This bid has been closed successfully.', [
        {
          text: 'OK',
          onPress: () => navigation.goBack(),
        },
      ]);
    } catch (error) {
      showAppAlert(
        'Could not close bid',
        error instanceof Error ? error.message : 'Please try again.',
      );
    } finally {
      setIsClosing(false);
    }
  };

  const handleCloseBid = () => {
    showAppAlert(
      'Close bid?',
      `Close the offer from ${storeName} for "${params.requestTitle}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Close bid',
          style: 'destructive',
          onPress: () => {
            void performCloseBid();
          },
        },
      ],
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
          <View style={styles.headerCopy}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              Offer details
            </Text>
            <Text style={styles.headerSub} numberOfLines={1}>
              {storeName}
            </Text>
          </View>
          <View style={styles.backBtn} />
        </View>
      </SafeAreaView>

      <View style={styles.body}>
        <ScrollView
          style={styles.flex}
          contentContainerStyle={[
            styles.content,
            { paddingBottom: Math.max(insets.bottom, 16) + 88 },
          ]}
          showsVerticalScrollIndicator={false}>
          <View style={styles.heroCard}>
            {bannerUri ? (
              <Image source={{ uri: bannerUri }} style={styles.banner} resizeMode="contain" />
            ) : (
              <View style={styles.bannerFallback}>
                <MaterialCommunityIcons name="storefront-outline" size={36} color="#9DB4E8" />
              </View>
            )}
            <View style={styles.heroRow}>
              <View style={styles.logoWrap}>
                {logoUri ? (
                  <Image source={{ uri: logoUri }} style={styles.logo} />
                ) : (
                  <MaterialCommunityIcons
                    name="storefront-outline"
                    size={26}
                    color={colors.primary}
                  />
                )}
              </View>
              <View style={styles.heroCopy}>
                <Text style={styles.storeName}>{storeName}</Text>
                {merchantName ? (
                  <Text style={styles.merchantLine}>Merchant: {merchantName}</Text>
                ) : null}
                {bid.rating != null ? (
                  <View style={styles.ratingRow}>
                    <MaterialCommunityIcons name="star" size={14} color="#F5A623" />
                    <Text style={styles.ratingText}>{bid.rating.toFixed(1)}</Text>
                  </View>
                ) : null}
              </View>
              {price != null ? (
                <View style={styles.pricePill}>
                  <Text style={styles.pricePillLabel}>Offer</Text>
                  <Text style={styles.pricePillValue}>₹{Number(price).toLocaleString('en-IN')}</Text>
                </View>
              ) : null}
            </View>
            {isLoadingShop ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={styles.loadingText}>Loading store details...</Text>
              </View>
            ) : null}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Your request</Text>
            <InfoRow icon="tag-outline" label="Request" value={params.requestTitle} />
            <InfoRow
              icon="cash"
              label="Budget"
              value={
                params.budget != null ? `₹${params.budget.toLocaleString('en-IN')}` : undefined
              }
            />
            <InfoRow icon="clock-outline" label="Needed" value={params.timeframe} />
            <View style={styles.statusRow}>
              <View style={styles.infoIcon}>
                <MaterialCommunityIcons name="information-outline" size={16} color={colors.primary} />
              </View>
              <View style={styles.infoCopy}>
                <Text style={styles.infoLabel}>Request status</Text>
                <View
                  style={[
                    styles.statusChip,
                    requestStatusMeta.tone === 'active' && styles.statusChipActive,
                    requestStatusMeta.tone === 'success' && styles.statusChipSuccess,
                    requestStatusMeta.tone === 'danger' && styles.statusChipDanger,
                    requestStatusMeta.tone === 'muted' && styles.statusChipMuted,
                  ]}>
                  <Text
                    style={[
                      styles.statusChipText,
                      requestStatusMeta.tone === 'active' && styles.statusChipTextActive,
                      requestStatusMeta.tone === 'success' && styles.statusChipTextSuccess,
                      requestStatusMeta.tone === 'danger' && styles.statusChipTextDanger,
                      requestStatusMeta.tone === 'muted' && styles.statusChipTextMuted,
                    ]}>
                    {requestStatusMeta.label}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>This offer</Text>
            <InfoRow
              icon="currency-inr"
              label="Offered price"
              value={price != null ? `₹${Number(price).toLocaleString('en-IN')}` : undefined}
            />
            <InfoRow icon="progress-check" label="Bid status" value={bid.status} />
            <InfoRow
              icon="calendar-clock"
              label="Responded"
              value={formatRespondedAt(bid.createdAt)}
            />
            {offerDetails ? (
              <View style={styles.noteBox}>
                <Text style={styles.noteLabel}>Offer message</Text>
                <Text style={styles.noteText}>{offerDetails}</Text>
              </View>
            ) : null}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Store details</Text>
            <InfoRow icon="storefront-outline" label="Store name" value={storeName} />
            <InfoRow icon="map-marker-outline" label="Address" value={address} />
            <InfoRow icon="city-variant-outline" label="City" value={bid.city || shop?.city} />
            <InfoRow icon="phone-outline" label="Phone" value={phone} />
            <InfoRow icon="email-outline" label="Email" value={email} />
            {storeDetails ? (
              <View style={styles.noteBox}>
                <Text style={styles.noteLabel}>About store</Text>
                <Text style={styles.noteText}>{storeDetails}</Text>
              </View>
            ) : null}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Merchant details</Text>
            <InfoRow icon="account-outline" label="Merchant name" value={merchantName} />
            <InfoRow icon="card-account-details-outline" label="Merchant ID" value={bid.merchantId} />
            <InfoRow icon="phone-outline" label="Contact" value={phone} />
            <InfoRow icon="email-outline" label="Email" value={email} />
          </View>

          <View style={styles.contactActions}>
            <TouchableOpacity style={styles.callBtn} activeOpacity={0.88} onPress={handleCall}>
              <MaterialCommunityIcons name="phone" size={16} color={colors.white} />
              <Text style={styles.callText}>Call</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.chatBtn} activeOpacity={0.88} onPress={handleChat}>
              <MaterialCommunityIcons name="whatsapp" size={16} color="#22A45A" />
              <Text style={styles.chatText}>Chat</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>

        {canShowCloseBid ? (
          <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
            <TouchableOpacity
              style={[styles.closeBidBtn, isClosing && styles.closeBidBtnDisabled]}
              activeOpacity={0.88}
              disabled={isClosing}
              onPress={handleCloseBid}>
              {isClosing ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <>
                  <MaterialCommunityIcons name="close-circle-outline" size={18} color={colors.white} />
                  <Text style={styles.closeBidText}>Close bid</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          <View style={[styles.footer, styles.statusFooter, { paddingBottom: Math.max(insets.bottom, 12) }]}>
            <View
              style={[
                styles.footerStatusChip,
                requestStatusMeta.tone === 'active' && styles.statusChipActive,
                requestStatusMeta.tone === 'success' && styles.statusChipSuccess,
                requestStatusMeta.tone === 'danger' && styles.statusChipDanger,
                requestStatusMeta.tone === 'muted' && styles.statusChipMuted,
              ]}>
              <MaterialCommunityIcons
                name={
                  requestStatusMeta.tone === 'success'
                    ? 'check-circle'
                    : requestStatusMeta.tone === 'danger'
                      ? 'alert-circle'
                      : 'information'
                }
                size={16}
                color={
                  requestStatusMeta.tone === 'success'
                    ? '#1B8A3E'
                    : requestStatusMeta.tone === 'danger'
                      ? '#B91C1C'
                      : '#6B7280'
                }
              />
              <Text
                style={[
                  styles.footerStatusText,
                  requestStatusMeta.tone === 'success' && styles.statusChipTextSuccess,
                  requestStatusMeta.tone === 'danger' && styles.statusChipTextDanger,
                  requestStatusMeta.tone === 'muted' && styles.statusChipTextMuted,
                  requestStatusMeta.tone === 'active' && styles.statusChipTextActive,
                ]}>
                Request {requestStatusMeta.label.toLowerCase()}
              </Text>
            </View>
          </View>
        )}
      </View>
    </View>
  );
};

export default MerchantBidDetail;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.primary,
  },
  flex: { flex: 1 },
  headerSafe: {
    backgroundColor: colors.primary,
  },
  header: {
    minHeight: 52,
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
  headerCopy: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  headerTitle: {
    fontSize: 17,
    color: colors.white,
    fontFamily: fonts.BOLD,
  },
  headerSub: {
    marginTop: 2,
    fontSize: 12,
    color: 'rgba(255,255,255,0.9)',
    fontFamily: fonts.BOLD,
  },
  body: {
    flex: 1,
    backgroundColor: '#F4F6FA',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 12,
  },
  heroCard: {
    backgroundColor: colors.white,
    borderRadius: 18,
    overflow: 'hidden',
  },
  banner: {
    width: '100%',
    height: 140,
    backgroundColor: '#E8EEF8',
  },
  bannerFallback: {
    width: '100%',
    height: 110,
    backgroundColor: '#E8EEF8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 12,
  },
  logoWrap: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: '#EEF4FF',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  logo: {
    width: '100%',
    height: '100%',
  },
  heroCopy: {
    flex: 1,
    gap: 2,
  },
  storeName: {
    fontSize: 17,
    color: colors.text,
    fontFamily: fonts.BOLD,
  },
  merchantLine: {
    fontSize: 12,
    color: '#5B6475',
    fontFamily: fonts.BOLD,
  },
  ratingRow: {
    marginTop: 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    fontSize: 12,
    color: '#5B6475',
    fontFamily: fonts.BOLD,
  },
  pricePill: {
    backgroundColor: '#EAF8EF',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    alignItems: 'flex-end',
  },
  pricePillLabel: {
    fontSize: 10,
    color: '#1B8A3E',
    fontFamily: fonts.BOLD,
  },
  pricePillValue: {
    marginTop: 2,
    fontSize: 16,
    color: '#1B8A3E',
    fontFamily: fonts.BOLD,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingBottom: 14,
  },
  loadingText: {
    fontSize: 12,
    color: colors.mutedText,
    fontFamily: fonts.BOLD,
  },
  section: {
    backgroundColor: colors.white,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 8,
  },
  sectionTitle: {
    fontSize: 15,
    color: colors.text,
    fontFamily: fonts.BOLD,
    marginBottom: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E8ECF3',
  },
  infoIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#EEF4FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  infoCopy: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 11,
    color: '#8A93A6',
    fontFamily: fonts.BOLD,
  },
  infoValue: {
    marginTop: 2,
    fontSize: 14,
    lineHeight: 19,
    color: colors.text,
    fontFamily: fonts.BOLD,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E8ECF3',
  },
  statusChip: {
    alignSelf: 'flex-start',
    marginTop: 4,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusChipActive: {
    backgroundColor: '#EAF8EF',
  },
  statusChipSuccess: {
    backgroundColor: '#E8F5E9',
  },
  statusChipDanger: {
    backgroundColor: '#FEE2E2',
  },
  statusChipMuted: {
    backgroundColor: '#F3F4F6',
  },
  statusChipText: {
    fontSize: 12,
    fontFamily: fonts.BOLD,
  },
  statusChipTextActive: {
    color: '#1B8A3E',
  },
  statusChipTextSuccess: {
    color: '#1B8A3E',
  },
  statusChipTextDanger: {
    color: '#B91C1C',
  },
  statusChipTextMuted: {
    color: '#6B7280',
  },
  noteBox: {
    marginTop: 4,
    marginBottom: 8,
    backgroundColor: '#F3F5F9',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  noteLabel: {
    fontSize: 11,
    color: '#7B8496',
    fontFamily: fonts.BOLD,
    marginBottom: 4,
  },
  noteText: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.text,
    fontFamily: fonts.BOLD,
  },
  contactActions: {
    flexDirection: 'row',
    gap: 10,
  },
  callBtn: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    backgroundColor: '#22A45A',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  callText: {
    color: colors.white,
    fontSize: 14,
    fontFamily: fonts.BOLD,
  },
  chatBtn: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: '#22A45A',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  chatText: {
    color: '#22A45A',
    fontSize: 14,
    fontFamily: fonts.BOLD,
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    paddingTop: 10,
    backgroundColor: 'rgba(244,246,250,0.96)',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#DCE3EF',
  },
  statusFooter: {
    alignItems: 'center',
  },
  footerStatusChip: {
    minHeight: 44,
    borderRadius: 12,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    alignSelf: 'stretch',
  },
  footerStatusText: {
    fontSize: 14,
    fontFamily: fonts.BOLD,
  },
  closeBidBtn: {
    height: 50,
    borderRadius: 14,
    backgroundColor: '#E11D48',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  closeBidBtnDisabled: {
    opacity: 0.65,
  },
  closeBidText: {
    color: colors.white,
    fontSize: 15,
    fontFamily: fonts.BOLD,
  },
});
