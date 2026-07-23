import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { colors, fonts } from '../../../helpers/styles';
import { MerchantBidData } from '../../../services/bestRequestApi';
import { showAppAlert } from '../../../services/appAlert';

type FilterTab = 'price' | 'near' | 'newest';

type MerchantBidsViewProps = {
  bids: MerchantBidData[];
  isLoading: boolean;
  onRefresh: () => void;
  showFilters?: boolean;
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
        const shop = bid.shopName || bid.merchantName || 'Merchant';
        const price = bid.bidAmount ?? bid.price ?? bid.offerPrice;
        const tags = [bid.message, bid.status].filter(Boolean) as string[];

        return (
          <View key={bid._id} style={styles.card}>
            <View style={styles.cardTop}>
              <View style={styles.copy}>
                <Text style={styles.shop} numberOfLines={1}>
                  {shop}
                </Text>
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

            {tags.length > 0 ? (
              <View style={styles.tags}>
                {tags.slice(0, 2).map(tag => (
                  <View key={tag} style={styles.tag}>
                    <Text style={styles.tagText} numberOfLines={1}>
                      {tag}
                    </Text>
                  </View>
                ))}
              </View>
            ) : null}

            <Text style={styles.responded}>{formatDate(bid.createdAt)}</Text>

            <View style={styles.actions}>
              <TouchableOpacity
                style={styles.callBtn}
                activeOpacity={0.88}
                onPress={() => {
                  if (!bid.phone) {
                    showAppAlert('Call unavailable', 'Phone number is not available for this shop.');
                    return;
                  }
                  Linking.openURL(`tel:${bid.phone}`).catch(() => {
                    showAppAlert('Call failed', 'Could not open the dialer for this shop.');
                  });
                }}>
                <MaterialCommunityIcons name="phone" size={15} color={colors.white} />
                <Text style={styles.callText}>Call</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.chatBtn}
                activeOpacity={0.88}
                onPress={() =>
                  showAppAlert('Chat', `Chat with ${shop} will be available soon.`, [{ text: 'OK' }])
                }>
                <MaterialCommunityIcons name="message-outline" size={15} color="#22A45A" />
                <Text style={styles.chatText}>Chat</Text>
              </TouchableOpacity>
            </View>
          </View>
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
  copy: { flex: 1 },
  shop: {
    fontSize: 15,
    color: colors.text,
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
  tags: {
    marginTop: 12,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    backgroundColor: '#F3F5F9',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    maxWidth: '100%',
  },
  tagText: {
    fontSize: 11,
    color: '#5B6475',
    fontFamily: fonts.BOLD,
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
