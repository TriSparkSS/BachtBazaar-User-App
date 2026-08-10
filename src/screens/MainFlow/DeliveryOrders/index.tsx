import React, { useCallback, useEffect, useState } from 'react';
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
import { colors, fonts } from '../../../helpers/styles';
import { MainStackParamList } from '../../../navigation/types';
import { showAppAlert } from '../../../services/appAlert';
import {
  DeliveryOrderListItem,
  deliveryApi,
} from '../../../services/deliveryApi';
import { shopApi } from '../../../services/shopApi';

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

const statusTone = (status?: string) => {
  const normalized = (status || '').toLowerCase();
  if (
    normalized.includes('accept') ||
    normalized.includes('assign') ||
    normalized.includes('deliver') ||
    normalized.includes('complete') ||
    normalized.includes('success')
  ) {
    return { bg: '#E8F5E9', text: '#2E7D32' };
  }
  if (
    normalized.includes('cancel') ||
    normalized.includes('reject') ||
    normalized.includes('fail')
  ) {
    return { bg: '#FFEBEE', text: '#C62828' };
  }
  if (
    normalized.includes('pending') ||
    normalized.includes('wait') ||
    normalized.includes('request') ||
    normalized.includes('sent') ||
    normalized.includes('open')
  ) {
    return { bg: '#FFF8E1', text: '#F57F17' };
  }
  return { bg: colors.primarySoft, text: colors.primary };
};

const DeliveryOrders = () => {
  const navigation =
    useNavigation<StackNavigationProp<MainStackParamList, 'DeliveryOrders'>>();
  const { authToken } = useAppContext();
  const [orders, setOrders] = useState<DeliveryOrderListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadOrders = useCallback(
    async (mode: 'initial' | 'refresh' = 'initial') => {
      const token = authToken?.trim();
      if (!token) {
        setOrders([]);
        setError('Please log in to view your delivery orders.');
        setIsLoading(false);
        setIsRefreshing(false);
        return;
      }

      if (mode === 'refresh') {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      try {
        const list = await deliveryApi.fetchDeliveryOrders(token);
        setOrders(list);
        setError(null);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Could not load delivery orders.';
        setError(message);
        if (mode === 'initial') {
          setOrders([]);
        }
        showAppAlert('Could not load delivery orders', message);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [authToken],
  );

  useEffect(() => {
    loadOrders('initial');
  }, [loadOrders]);

  const openOrderDetail = useCallback(
    (order: DeliveryOrderListItem) => {
      if (!order.id || order.id.startsWith('order-')) {
        return;
      }
      navigation.navigate('DeliveryOrderDetail', { orderId: order.id });
    },
    [navigation],
  );

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
          <Text style={styles.headerTitle}>Delivery</Text>
          <View style={styles.backBtn} />
        </View>
      </SafeAreaView>

      <View style={styles.body}>
        {isLoading && orders.length === 0 ? (
          <View style={styles.center}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={styles.centerText}>Loading delivery orders...</Text>
          </View>
        ) : !isLoading && orders.length === 0 ? (
          <ScrollView
            contentContainerStyle={styles.centerScroll}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={() => loadOrders('refresh')}
                tintColor={colors.primary}
              />
            }>
            <View style={styles.center}>
              <View style={styles.emptyIcon}>
                <MaterialCommunityIcons
                  name="moped-outline"
                  size={28}
                  color={colors.primary}
                />
              </View>
              <Text style={styles.emptyTitle}>
                {error ? 'Unable to load orders' : 'No delivery orders yet'}
              </Text>
              <Text style={styles.emptySub}>
                {error ||
                  'When you request delivery from a store, your orders will show up here.'}
              </Text>
              {error ? (
                <TouchableOpacity
                  style={styles.retryBtn}
                  onPress={() => loadOrders('initial')}
                  activeOpacity={0.85}>
                  <Text style={styles.retryText}>Try again</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </ScrollView>
        ) : (
          <ScrollView
            style={styles.flex}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={() => loadOrders('refresh')}
                tintColor={colors.primary}
              />
            }>
            {orders.map(order => {
              const tone = statusTone(order.status);
              const canOpen = Boolean(order.id) && !order.id.startsWith('order-');
              const thumbnailUri = shopApi.resolveImageUrl(order.productThumbnail);

              return (
                <TouchableOpacity
                  key={order.id}
                  style={styles.card}
                  activeOpacity={canOpen ? 0.85 : 1}
                  disabled={!canOpen}
                  onPress={() => openOrderDetail(order)}>
                  <View style={styles.cardTop}>
                    <View style={styles.thumbWrap}>
                      {thumbnailUri ? (
                        <Image
                          source={{ uri: thumbnailUri }}
                          style={styles.thumb}
                          resizeMode="cover"
                        />
                      ) : (
                        <MaterialCommunityIcons
                          name="image-outline"
                          size={26}
                          color={colors.primary}
                        />
                      )}
                    </View>
                    <View style={styles.copy}>
                      <Text style={styles.title} numberOfLines={1}>
                        {order.productName || 'Delivery order'}
                      </Text>
                      <Text style={styles.orderId} numberOfLines={1}>
                        #{order.id}
                      </Text>
                    </View>
                    {order.status ? (
                      <View style={[styles.badge, { backgroundColor: tone.bg }]}>
                        <Text style={[styles.badgeText, { color: tone.text }]}>
                          {order.status}
                        </Text>
                      </View>
                    ) : null}
                  </View>

                  {order.merchantName ? (
                    <Text style={styles.meta} numberOfLines={1}>
                      {order.merchantName}
                    </Text>
                  ) : null}
                  {order.address ? (
                    <Text style={styles.meta} numberOfLines={2}>
                      {order.address}
                    </Text>
                  ) : null}

                  <View style={styles.footerRow}>
                    <Text style={styles.date}>{formatDate(order.createdAt)}</Text>
                    <Text style={styles.amount}>
                      {order.totalAmount || order.itemPrice || ''}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}
      </View>
    </View>
  );
};

export default DeliveryOrders;

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
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 36,
  },
  centerScroll: {
    flexGrow: 1,
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
  list: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 28,
    gap: 12,
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
    alignItems: 'center',
    gap: 12,
  },
  thumbWrap: {
    width: 60,
    height: 60,
    borderRadius: 14,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  thumb: {
    width: '100%',
    height: '100%',
  },
  copy: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    color: colors.text,
    fontFamily: fonts.BOLD,
  },
  orderId: {
    marginTop: 2,
    fontSize: 11,
    color: colors.mutedText,
    fontFamily: fonts.BOLD,
  },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  badgeText: {
    fontSize: 11,
    fontFamily: fonts.BOLD,
    textTransform: 'capitalize',
  },
  meta: {
    marginTop: 8,
    fontSize: 12,
    color: colors.mutedText,
    fontFamily: fonts.BOLD,
  },
  footerRow: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  date: {
    flex: 1,
    fontSize: 12,
    color: colors.mutedText,
    fontFamily: fonts.BOLD,
  },
  amount: {
    fontSize: 14,
    color: colors.text,
    fontFamily: fonts.BOLD,
  },
});
