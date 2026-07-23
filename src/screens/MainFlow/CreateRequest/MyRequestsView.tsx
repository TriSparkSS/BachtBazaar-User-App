import React from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { colors, fonts } from '../../../helpers/styles';
import { BestRequestData } from '../../../services/bestRequestApi';

type MyRequestsViewProps = {
  requests: BestRequestData[];
  isLoading: boolean;
  cancellingId?: string | null;
  onRefresh: () => void;
  onCancel: (request: BestRequestData) => void;
  onCreateNew: () => void;
  onOpenOffers: (request: BestRequestData) => void;
};

const statusTone = (status?: string) => {
  const value = (status || 'active').toLowerCase();
  if (value.includes('cancel')) {
    return { bg: '#F3F4F6', text: '#6B7280', label: 'Cancelled' };
  }
  if (value.includes('expir')) {
    return { bg: '#FEE2E2', text: '#B91C1C', label: 'Expired' };
  }
  if (value.includes('complete') || value.includes('closed')) {
    return { bg: '#E8F5E9', text: '#1B8A3E', label: 'Completed' };
  }
  return { bg: '#EAF8EF', text: '#1B8A3E', label: 'Active' };
};

const formatDate = (value?: string) => {
  if (!value) {
    return '';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
};

const MyRequestsView: React.FC<MyRequestsViewProps> = ({
  requests,
  isLoading,
  cancellingId,
  onRefresh,
  onCancel,
  onCreateNew,
  onOpenOffers,
}) => {
  if (isLoading && requests.length === 0) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="small" color={colors.primary} />
        <Text style={styles.centerText}>Loading your requests...</Text>
      </View>
    );
  }

  if (!isLoading && requests.length === 0) {
    return (
      <View style={styles.center}>
        <View style={styles.emptyIcon}>
          <MaterialCommunityIcons name="clipboard-text-outline" size={28} color={colors.primary} />
        </View>
        <Text style={styles.emptyTitle}>No requests yet</Text>
        <Text style={styles.emptySub}>
          Create a request and nearby shops will send their best offers.
        </Text>
        <TouchableOpacity style={styles.emptyBtn} activeOpacity={0.88} onPress={onCreateNew}>
          <Text style={styles.emptyBtnText}>Create Request</Text>
        </TouchableOpacity>
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
      {requests.map(request => {
        const tone = statusTone(request.status);
        const canCancel = (request.status || 'active').toLowerCase().includes('active');
        const isCancelling = cancellingId === request._id;

        return (
          <View key={request._id} style={styles.card}>
            <TouchableOpacity activeOpacity={0.9} onPress={() => onOpenOffers(request)}>
              <View style={styles.topRow}>
                <View style={styles.copy}>
                  <Text style={styles.title} numberOfLines={1}>
                    {request.title}
                  </Text>
                  <Text style={styles.meta}>
                    {request.timeframe || 'Flexible'}
                    {request.budget != null
                      ? `  ·  Budget ₹${request.budget.toLocaleString('en-IN')}`
                      : ''}
                  </Text>
                </View>
                <View style={[styles.badge, { backgroundColor: tone.bg }]}>
                  <Text style={[styles.badgeText, { color: tone.text }]}>{tone.label}</Text>
                </View>
              </View>

              <View style={styles.midRow}>
                <MaterialCommunityIcons name="storefront-outline" size={14} color={colors.primary} />
                <Text style={styles.offersText}>
                  {typeof request.bidCount === 'number'
                    ? `${request.bidCount} shop offers`
                    : 'Awaiting shop offers'}
                </Text>
                <MaterialCommunityIcons name="chevron-right" size={18} color={colors.primary} />
              </View>

              {request.formattedAddress ? (
                <View style={styles.addressRow}>
                  <MaterialCommunityIcons name="map-marker" size={14} color="#22A45A" />
                  <Text style={styles.address} numberOfLines={1}>
                    {request.formattedAddress}
                  </Text>
                </View>
              ) : null}
            </TouchableOpacity>

            <View style={styles.footer}>
              <Text style={styles.date}>
                {request.createdAt ? `Created ${formatDate(request.createdAt)}` : 'Recently created'}
              </Text>
              {canCancel ? (
                <TouchableOpacity
                  style={styles.cancelBtn}
                  activeOpacity={0.85}
                  disabled={isCancelling}
                  onPress={() => onCancel(request)}>
                  {isCancelling ? (
                    <ActivityIndicator size="small" color="#B91C1C" />
                  ) : (
                    <Text style={styles.cancelText}>Cancel Request</Text>
                  )}
                </TouchableOpacity>
              ) : null}
            </View>
          </View>
        );
      })}
    </ScrollView>
  );
};

export default MyRequestsView;

const styles = StyleSheet.create({
  flex: { flex: 1 },
  list: {
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
  },
  emptySub: {
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
    color: colors.mutedText,
    fontFamily: fonts.BOLD,
    marginBottom: 18,
  },
  emptyBtn: {
    backgroundColor: colors.primary,
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  emptyBtnText: {
    color: colors.white,
    fontSize: 13,
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
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  copy: { flex: 1 },
  title: {
    fontSize: 16,
    color: colors.text,
    fontFamily: fonts.BOLD,
  },
  meta: {
    marginTop: 4,
    fontSize: 12,
    color: colors.mutedText,
    fontFamily: fonts.BOLD,
    textTransform: 'capitalize',
  },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  badgeText: {
    fontSize: 10,
    fontFamily: fonts.BOLD,
  },
  midRow: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primarySoft,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  offersText: {
    flex: 1,
    fontSize: 12,
    color: colors.primary,
    fontFamily: fonts.BOLD,
  },
  addressRow: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  address: {
    flex: 1,
    fontSize: 12,
    color: '#667085',
    fontFamily: fonts.BOLD,
  },
  footer: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#EEF1F6',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  date: {
    flex: 1,
    fontSize: 11,
    color: colors.mutedText,
    fontFamily: fonts.BOLD,
  },
  cancelBtn: {
    minWidth: 110,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#FEF2F2',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  cancelText: {
    fontSize: 12,
    color: '#B91C1C',
    fontFamily: fonts.BOLD,
  },
});
