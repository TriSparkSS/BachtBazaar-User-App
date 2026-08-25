import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAppContext } from '../../../context/AppContext';
import { colors, fonts } from '../../../helpers/styles';
import { MainStackParamList } from '../../../navigation/types';
import { showAppAlert } from '../../../services/appAlert';
import {
  formatNotificationTime,
  notifyApi,
} from '../../../services/notifyApi';
import {
  parsePushFromAppNotification,
  routePushNotification,
} from '../../../services/pushNotificationRouter';
import { AppNotification } from '../../../types/notification';

const PAGE_BG = '#F4F6FA';

const iconForType = (type: string): { name: string; color: string; soft: string } => {
  const t = type.toUpperCase();
  if (t.includes('CIRCLE')) {
    return { name: 'account-group', color: colors.primary, soft: colors.primarySoft };
  }
  if (t.includes('OFFER') || t.includes('REWARD') || t.includes('MILESTONE')) {
    return { name: 'tag-outline', color: colors.darkgreen, soft: colors.pastelGreen };
  }
  if (t.includes('REFERRAL')) {
    return { name: 'gift-outline', color: '#E65A24', soft: '#FFF0EB' };
  }
  if (t.includes('PRICE')) {
    return { name: 'trending-down', color: '#E11D48', soft: '#FFE4E6' };
  }
  if (t.includes('BIRTHDAY')) {
    return { name: 'cake-variant', color: '#7C3AED', soft: '#F3E8FF' };
  }
  if (t.includes('ORDER') || t.includes('DELIVERY') || t.includes('BID')) {
    return { name: 'truck-delivery-outline', color: '#E65A24', soft: '#FFF0EB' };
  }
  return { name: 'bell-outline', color: colors.primary, soft: colors.primarySoft };
};

const NotificationsScreen = () => {
  const navigation =
    useNavigation<StackNavigationProp<MainStackParamList, 'Notifications'>>();
  const insets = useSafeAreaInsets();
  const { authToken } = useAppContext();

  const [items, setItems] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const token = authToken?.trim();
    if (!token) {
      setItems([]);
      setUnreadCount(0);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      const page = await notifyApi.list(token);
      setItems(page.items);
      setUnreadCount(page.unreadCount);
    } catch (error) {
      showAppAlert(
        'Could not load notifications',
        error instanceof Error ? error.message : 'Please try again.',
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [authToken]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      void load();
    }, [load]),
  );

  const onRefresh = () => {
    setRefreshing(true);
    void load();
  };

  const onMarkAllRead = async () => {
    const token = authToken?.trim();
    if (!token || markingAll || unreadCount === 0) {
      return;
    }
    setMarkingAll(true);
    try {
      await notifyApi.markAllRead(token);
      setItems(prev => prev.map(item => ({ ...item, isRead: true })));
      setUnreadCount(0);
    } catch (error) {
      showAppAlert(
        'Could not mark all read',
        error instanceof Error ? error.message : 'Please try again.',
      );
    } finally {
      setMarkingAll(false);
    }
  };

  const onOpenNotification = async (item: AppNotification) => {
    const token = authToken?.trim();
    if (token && !item.isRead) {
      setBusyId(item.id);
      try {
        await notifyApi.markRead(token, item.id);
        setItems(prev =>
          prev.map(n => (n.id === item.id ? { ...n, isRead: true } : n)),
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      } catch {
        // Still allow navigation even if mark-read fails.
      } finally {
        setBusyId(null);
      }
    }

    const payload = parsePushFromAppNotification(item);
    if (payload) {
      await routePushNotification(payload);
    }
  };

  const onDelete = (item: AppNotification) => {
    showAppAlert('Delete notification?', item.title, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            const token = authToken?.trim();
            if (!token) {
              return;
            }
            setBusyId(item.id);
            try {
              await notifyApi.remove(token, item.id);
              setItems(prev => prev.filter(n => n.id !== item.id));
              if (!item.isRead) {
                setUnreadCount(prev => Math.max(0, prev - 1));
              }
            } catch (error) {
              showAppAlert(
                'Delete failed',
                error instanceof Error ? error.message : 'Please try again.',
              );
            } finally {
              setBusyId(null);
            }
          })();
        },
      },
    ]);
  };

  const bottomPad = Math.max(insets.bottom, 16) + 24;

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.headerSafe} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <MaterialCommunityIcons name="arrow-left" size={22} color={colors.white} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Notifications</Text>
            {unreadCount > 0 ? (
              <Text style={styles.headerSub}>{unreadCount} unread</Text>
            ) : null}
          </View>
          <TouchableOpacity
            onPress={() => {
              void onMarkAllRead();
            }}
            disabled={markingAll || unreadCount === 0}
            style={styles.markAllBtn}
          >
            {markingAll ? (
              <ActivityIndicator color={colors.white} size="small" />
            ) : (
              <Text
                style={[
                  styles.markAllText,
                  unreadCount === 0 && styles.markAllTextDisabled,
                ]}
              >
                Mark all
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <View style={styles.body}>
        {loading ? (
          <View style={styles.loading}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : (
          <FlatList
            data={items}
            keyExtractor={item => item.id}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={colors.primary}
                colors={[colors.primary]}
              />
            }
            contentContainerStyle={[styles.listContent, { paddingBottom: bottomPad }]}
            ListEmptyComponent={
              <View style={styles.emptyCard}>
                <View style={styles.emptyIconWrap}>
                  <MaterialCommunityIcons
                    name="bell-sleep-outline"
                    size={30}
                    color={colors.primary}
                  />
                </View>
                <Text style={styles.emptyTitle}>You're all caught up</Text>
                <Text style={styles.emptyText}>
                  New invites, offers, and updates will show up here.
                </Text>
              </View>
            }
            renderItem={({ item }) => {
              const icon = iconForType(item.type);
              const busy = busyId === item.id;
              return (
                <TouchableOpacity
                  style={[styles.card, !item.isRead && styles.cardUnread]}
                  activeOpacity={0.88}
                  disabled={busy}
                  onPress={() => {
                    void onOpenNotification(item);
                  }}
                  onLongPress={() => onDelete(item)}
                >
                  <View style={[styles.iconBox, { backgroundColor: icon.soft }]}>
                    <MaterialCommunityIcons
                      name={icon.name}
                      size={22}
                      color={icon.color}
                    />
                  </View>
                  <View style={styles.cardBody}>
                    <View style={styles.cardTop}>
                      <Text style={styles.cardTitle} numberOfLines={1}>
                        {item.title}
                      </Text>
                      {!item.isRead ? <View style={styles.dot} /> : null}
                    </View>
                    {item.body ? (
                      <Text style={styles.cardBodyText} numberOfLines={3}>
                        {item.body}
                      </Text>
                    ) : null}
                    <Text style={styles.cardTime}>
                      {formatNotificationTime(item.createdAt)}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.deleteBtn}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    onPress={() => onDelete(item)}
                  >
                    {busy ? (
                      <ActivityIndicator size="small" color={colors.mutedText} />
                    ) : (
                      <MaterialCommunityIcons
                        name="trash-can-outline"
                        size={18}
                        color={colors.mutedText}
                      />
                    )}
                  </TouchableOpacity>
                </TouchableOpacity>
              );
            }}
          />
        )}
      </View>
    </View>
  );
};

export default NotificationsScreen;

const cardShadow = Platform.select({
  ios: {
    shadowColor: '#1B2430',
    shadowOpacity: 0.07,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
  },
  android: { elevation: 2 },
  default: {},
});

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.primary },
  headerSafe: { backgroundColor: colors.primary },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingBottom: 14,
    paddingTop: 4,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: {
    fontSize: 17,
    fontFamily: fonts.BOLD,
    color: colors.white,
  },
  headerSub: {
    marginTop: 2,
    fontSize: 12,
    color: 'rgba(255,255,255,0.85)',
  },
  markAllBtn: {
    minWidth: 72,
    height: 36,
    alignItems: 'flex-end',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  markAllText: {
    fontSize: 13,
    fontFamily: fonts.BOLD,
    color: colors.white,
  },
  markAllTextDisabled: { opacity: 0.45 },
  body: {
    flex: 1,
    backgroundColor: PAGE_BG,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  listContent: { paddingHorizontal: 16, paddingTop: 18 },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: 36,
    paddingHorizontal: 20,
    backgroundColor: colors.white,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E8EDF5',
    ...cardShadow,
  },
  emptyIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    marginTop: 14,
    fontSize: 16,
    fontFamily: fonts.BOLD,
    color: colors.text,
  },
  emptyText: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 19,
    color: colors.mutedText,
    textAlign: 'center',
  },
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E8EDF5',
    ...cardShadow,
  },
  cardUnread: {
    borderColor: colors.primaryBorder,
    backgroundColor: '#F7FAFF',
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: { flex: 1, minWidth: 0 },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardTitle: {
    flex: 1,
    fontSize: 15,
    fontFamily: fonts.BOLD,
    color: colors.text,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  cardBodyText: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 18,
    color: colors.mutedText,
  },
  cardTime: {
    marginTop: 8,
    fontSize: 11,
    color: colors.lighterGray,
    fontFamily: fonts.BOLD,
  },
  deleteBtn: {
    paddingTop: 2,
    paddingLeft: 2,
  },
});
