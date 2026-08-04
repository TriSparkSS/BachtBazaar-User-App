import React, { useMemo, useState } from 'react';
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
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { colors, fonts } from '../../../helpers/styles';
import { openChatWithNumber, openPhoneDialer } from '../../../helpers/contactActions';
import { MerchantBidData } from '../../../services/bestRequestApi';
import { showAppAlert } from '../../../services/appAlert';

type FilterTab = 'price' | 'near' | 'newest';

type MerchantBidsViewProps = {
  bids: MerchantBidData[];
  isLoading: boolean;
  onRefresh: () => void;
  showFilters?: boolean;
  requestTitle?: string;
  onBidPress?: (bid: MerchantBidData) => void;
};

const formatDate = (value?: string) => {
  if (!value) {
    return 'Just now';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'Just now';
  }
  const mins = Math.max(1, Math.round((Date.now() - date.getTime()) / 60000));
  if (mins < 60) {
    return `Responded ${mins} min ago`;
  }
  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const MerchantBidsView: React.FC<MerchantBidsViewProps> = ({
  bids,
  isLoading,
  onRefresh,
  showFilters = true,
  requestTitle,
  onBidPress,
}) => {
  const [filter, setFilter] = useState<FilterTab>('price');

  const sortedBids = useMemo(() => {
    const next = [...bids];
    if (filter === 'near') {
      return next.sort((a, b) => (a.distanceKm ?? 99) - (b.distanceKm ?? 99));
    }
    if (filter === 'newest') {
      return next.sort((a, b) => {
        const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return bTime - aTime;
      });
    }
    return next.sort((a, b) => {
      const aPrice = a.bidAmount ?? a.price ?? a.offerPrice ?? Number.MAX_SAFE_INTEGER;
      const bPrice = b.bidAmount ?? b.price ?? b.offerPrice ?? Number.MAX_SAFE_INTEGER;
      return aPrice - bPrice;
    });
  }, [bids, filter]);

  const handleCall = async (bid: MerchantBidData) => {
    try {
      await openPhoneDialer(bid.phone || bid.whatsapp);
    } catch (error) {
      showAppAlert(
        'Call unavailable',
        error instanceof Error ? error.message : 'Phone number is not available for this merchant.',
      );
    }
  };

  const handleChat = async (bid: MerchantBidData) => {
    const shop = bid.shopName || bid.merchantName || 'Merchant';
    const chatMessage = requestTitle
      ? `Hi, I saw your offer on Bachat Bazaar for "${requestTitle}".`
      : `Hi, I saw your offer on Bachat Bazaar from ${shop}.`;

    try {
      await openChatWithNumber(bid.whatsapp || bid.phone, chatMessage);
    } catch (error) {
      showAppAlert(
        'Chat unavailable',
        error instanceof Error ? error.message : 'Mobile number is not available for chat.',
      );
    }
  };

  if (isLoading && bids.length === 0) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="small" color={colors.primary} />
        <Text style={styles.centerText}>Finding shop offers...</Text>
      </View>
    );
  }

  if (!isLoading && bids.length === 0) {
    return (
      <View style={styles.center}>
        <View style={styles.emptyIcon}>
          <MaterialCommunityIcons name="storefront-outline" size={28} color={colors.primary} />
        </View>
        <Text style={styles.emptyTitle}>No offers yet</Text>
        <Text style={styles.emptySub}>
          Nearby shops will send offers soon. Pull down to refresh.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={styles.list}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={isLoading} onRefresh={onRefresh} tintColor={colors.primary} />
      }>
      {showFilters ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filters}>
          {(
            [
              { id: 'price' as const, label: 'Lowest Price' },
              { id: 'near' as const, label: 'Nearest' },
              { id: 'newest' as const, label: 'Newest' },
            ] as const
          ).map(tab => {
            const active = filter === tab.id;
            return (
              <TouchableOpacity
                key={tab.id}
                style={[styles.filterPill, active && styles.filterPillOn]}
                activeOpacity={0.85}
                onPress={() => setFilter(tab.id)}>
                <Text style={[styles.filterText, active && styles.filterTextOn]}>{tab.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      ) : null}

      {sortedBids.map(bid => {
        const shop = bid.shopName || 'Merchant';
        const merchant = bid.merchantName?.trim();
        const price = bid.bidAmount ?? bid.price ?? bid.offerPrice;
        const locationLine = [bid.address, !bid.address?.includes(bid.city || '') ? bid.city : null]
          .filter(Boolean)
          .join(', ');
        const detailText = bid.message || bid.details || bid.note;
        const contactNumber = bid.phone || bid.whatsapp;

        return (
          <TouchableOpacity
            key={bid._id}
            style={styles.card}
            activeOpacity={0.9}
            onPress={() => onBidPress?.(bid)}>
            <View style={styles.cardTop}>
              <View style={styles.avatar}>
                {bid.logo ? (
                  <Image source={{ uri: bid.logo }} style={styles.avatarImage} />
                ) : (
                  <MaterialCommunityIcons
                    name="storefront-outline"
                    size={22}
                    color={colors.primary}
                  />
                )}
              </View>
              <View style={styles.copy}>
                <Text style={styles.shop} numberOfLines={1}>
                  {shop}
                </Text>
                {merchant ? (
                  <Text style={styles.merchantName} numberOfLines={1}>
                    Merchant: {merchant}
                  </Text>
                ) : null}
                <View style={styles.metaRow}>
                  {bid.rating != null ? (
                    <>
                      <MaterialCommunityIcons name="star" size={13} color="#F5A623" />
                      <Text style={styles.metaText}>{bid.rating.toFixed(1)}</Text>
                      <Text style={styles.dot}>·</Text>
                    </>
                  ) : null}
                  {bid.distanceKm != null ? (
                    <Text style={styles.metaText}>{bid.distanceKm.toFixed(1)} km away</Text>
                  ) : (
                    <Text style={styles.metaText}>{formatDate(bid.createdAt)}</Text>
                  )}
                </View>
              </View>
              {price != null ? (
                <Text style={styles.price}>₹{Number(price).toLocaleString('en-IN')}</Text>
              ) : null}
            </View>

            {locationLine ? (
              <View style={styles.detailRow}>
                <MaterialCommunityIcons name="map-marker-outline" size={14} color="#7B8496" />
                <Text style={styles.detailText} numberOfLines={2}>
                  {locationLine}
                </Text>
              </View>
            ) : null}

            {contactNumber ? (
              <View style={styles.detailRow}>
                <MaterialCommunityIcons name="phone-outline" size={14} color="#7B8496" />
                <Text style={styles.detailText} numberOfLines={1}>
                  {contactNumber}
                </Text>
              </View>
            ) : null}

            {bid.email ? (
              <View style={styles.detailRow}>
                <MaterialCommunityIcons name="email-outline" size={14} color="#7B8496" />
                <Text style={styles.detailText} numberOfLines={1}>
                  {bid.email}
                </Text>
              </View>
            ) : null}

            {detailText ? (
              <View style={styles.offerBox}>
                <Text style={styles.offerLabel}>Store / offer details</Text>
                <Text style={styles.offerText}>{detailText}</Text>
              </View>
            ) : null}

            {bid.status ? (
              <View style={styles.statusChip}>
                <Text style={styles.statusChipText}>{bid.status}</Text>
              </View>
            ) : null}

            <Text style={styles.responded}>{formatDate(bid.createdAt)}</Text>

            <View style={styles.actions}>
              <TouchableOpacity
                style={styles.callBtn}
                activeOpacity={0.88}
                onPress={() => handleCall(bid)}>
                <MaterialCommunityIcons name="phone" size={15} color={colors.white} />
                <Text style={styles.callText}>Call</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.chatBtn}
                activeOpacity={0.88}
                onPress={() => handleChat(bid)}>
                <MaterialCommunityIcons name="whatsapp" size={15} color="#22A45A" />
                <Text style={styles.chatText}>Chat</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
};

export default MerchantBidsView;

const styles = StyleSheet.create({
  flex: { flex: 1 },
  list: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 28,
    gap: 12,
  },
  filters: {
    gap: 8,
    paddingBottom: 4,
  },
  filterPill: {
    borderRadius: 20,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: '#E5E9F2',
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  filterPillOn: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterText: {
    fontSize: 12,
    color: colors.mutedText,
    fontFamily: fonts.BOLD,
  },
  filterTextOn: {
    color: colors.white,
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
  },
  emptySub: {
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
    color: colors.mutedText,
    fontFamily: fonts.BOLD,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: 18,
    padding: 16,
    shadowColor: '#1B2430',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#EEF4FF',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  copy: { flex: 1 },
  shop: {
    fontSize: 15,
    color: colors.text,
    fontFamily: fonts.BOLD,
  },
  merchantName: {
    marginTop: 2,
    fontSize: 12,
    color: '#5B6475',
    fontFamily: fonts.BOLD,
  },
  metaRow: {
    marginTop: 5,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: colors.mutedText,
    fontFamily: fonts.BOLD,
  },
  dot: {
    color: '#C5CAD6',
    marginHorizontal: 2,
  },
  price: {
    fontSize: 20,
    color: '#1B8A3E',
    fontFamily: fonts.BOLD,
  },
  detailRow: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
  detailText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
    color: '#5B6475',
    fontFamily: fonts.BOLD,
  },
  offerBox: {
    marginTop: 12,
    backgroundColor: '#F3F5F9',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  offerLabel: {
    fontSize: 11,
    color: '#7B8496',
    fontFamily: fonts.BOLD,
    marginBottom: 4,
  },
  offerText: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.text,
    fontFamily: fonts.BOLD,
  },
  statusChip: {
    alignSelf: 'flex-start',
    marginTop: 10,
    backgroundColor: '#EEF4FF',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusChipText: {
    fontSize: 11,
    color: colors.primary,
    fontFamily: fonts.BOLD,
    textTransform: 'capitalize',
  },
  responded: {
    marginTop: 10,
    fontSize: 11,
    color: colors.mutedText,
    fontFamily: fonts.BOLD,
  },
  actions: {
    marginTop: 14,
    flexDirection: 'row',
    gap: 10,
  },
  callBtn: {
    flex: 1,
    height: 44,
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
    height: 44,
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
});
