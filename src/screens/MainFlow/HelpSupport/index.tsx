import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAppContext } from '../../../context/AppContext';
import { colors, fonts } from '../../../helpers/styles';
import { MainStackParamList } from '../../../navigation/types';
import { showAppAlert } from '../../../services/appAlert';
import { HelpTicketListItem, helpApi } from '../../../services/helpApi';

type StatusTab = 'Open' | 'All' | 'Closed';

const STATUS_TABS: StatusTab[] = ['Open', 'All', 'Closed'];

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
  if (normalized.includes('close') || normalized.includes('resolve')) {
    return { bg: '#E8F5E9', text: '#2E7D32' };
  }
  if (normalized.includes('pending') || normalized.includes('wait')) {
    return { bg: '#FFF8E1', text: '#F57F17' };
  }
  return { bg: colors.primarySoft, text: colors.primary };
};

const priorityTone = (priority?: string) => {
  const normalized = (priority || '').toLowerCase();
  if (normalized.includes('high')) {
    return { bg: '#FFEBEE', text: '#C62828' };
  }
  if (normalized.includes('low')) {
    return { bg: '#E8F5E9', text: '#2E7D32' };
  }
  return { bg: '#FFF8E1', text: '#F57F17' };
};

const HelpSupport = () => {
  const navigation =
    useNavigation<StackNavigationProp<MainStackParamList, 'HelpSupport'>>();
  const { authToken } = useAppContext();
  const [activeTab, setActiveTab] = useState<StatusTab>('Open');
  const [tickets, setTickets] = useState<HelpTicketListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadTickets = useCallback(
    async (mode: 'initial' | 'refresh' = 'initial') => {
      const token = authToken?.trim();
      if (!token) {
        setTickets([]);
        setError('Please log in to view your support tickets.');
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
        const list = await helpApi.fetchMyTickets(
          token,
          activeTab === 'All' ? undefined : activeTab,
        );
        setTickets(list);
        setError(null);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Could not load support tickets.';
        setError(message);
        if (mode === 'initial') {
          setTickets([]);
        }
        showAppAlert('Could not load tickets', message);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [authToken, activeTab],
  );

  useFocusEffect(
    useCallback(() => {
      void loadTickets('initial');
    }, [loadTickets]),
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
          <Text style={styles.headerTitle}>Help & Support</Text>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.navigate('CreateHelpTicket')}
            activeOpacity={0.85}>
            <MaterialCommunityIcons name="plus" size={24} color={colors.white} />
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <View style={styles.body}>
        <View style={styles.tabs}>
          {STATUS_TABS.map(tab => {
            const active = tab === activeTab;
            return (
              <TouchableOpacity
                key={tab}
                style={[styles.tab, active && styles.tabActive]}
                onPress={() => setActiveTab(tab)}
                activeOpacity={0.85}>
                <Text style={[styles.tabText, active && styles.tabTextActive]}>
                  {tab}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {isLoading && tickets.length === 0 ? (
          <View style={styles.center}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={styles.centerText}>Loading tickets...</Text>
          </View>
        ) : !isLoading && tickets.length === 0 ? (
          <ScrollView
            contentContainerStyle={styles.centerScroll}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={() => loadTickets('refresh')}
                tintColor={colors.primary}
              />
            }>
            <View style={styles.center}>
              <View style={styles.emptyIcon}>
                <MaterialCommunityIcons
                  name="headset"
                  size={28}
                  color={colors.primary}
                />
              </View>
              <Text style={styles.emptyTitle}>
                {error ? 'Unable to load tickets' : 'No tickets yet'}
              </Text>
              <Text style={styles.emptySub}>
                {error ||
                  'Need help? Create a support ticket and our team will get back to you.'}
              </Text>
              {error ? (
                <TouchableOpacity
                  style={styles.primaryBtn}
                  onPress={() => loadTickets('initial')}
                  activeOpacity={0.85}>
                  <Text style={styles.primaryBtnText}>Try again</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.primaryBtn}
                  onPress={() => navigation.navigate('CreateHelpTicket')}
                  activeOpacity={0.85}>
                  <Text style={styles.primaryBtnText}>New ticket</Text>
                </TouchableOpacity>
              )}
            </View>
          </ScrollView>
        ) : (
          <View style={styles.flex}>
            <ScrollView
              style={styles.flex}
              contentContainerStyle={styles.list}
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl
                  refreshing={isRefreshing}
                  onRefresh={() => loadTickets('refresh')}
                  tintColor={colors.primary}
                />
              }>
              {tickets.map(ticket => {
                const status = statusTone(ticket.status);
                const priority = priorityTone(ticket.priority);
                return (
                  <TouchableOpacity
                    key={ticket.id}
                    style={styles.card}
                    activeOpacity={0.85}
                    onPress={() =>
                      navigation.navigate('HelpTicketDetail', {
                        ticketId: ticket.id,
                      })
                    }>
                    <View style={styles.cardTop}>
                      <Text style={styles.subject} numberOfLines={2}>
                        {ticket.subject}
                      </Text>
                      {ticket.status ? (
                        <View style={[styles.badge, { backgroundColor: status.bg }]}>
                          <Text style={[styles.badgeText, { color: status.text }]}>
                            {ticket.status}
                          </Text>
                        </View>
                      ) : null}
                    </View>

                    <View style={styles.metaRow}>
                      {ticket.category ? (
                        <Text style={styles.meta} numberOfLines={1}>
                          {ticket.category}
                        </Text>
                      ) : null}
                      {ticket.priority ? (
                        <View
                          style={[styles.badge, { backgroundColor: priority.bg }]}>
                          <Text
                            style={[styles.badgeText, { color: priority.text }]}>
                            {ticket.priority}
                          </Text>
                        </View>
                      ) : null}
                    </View>

                    <Text style={styles.date}>{formatDate(ticket.createdAt)}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <TouchableOpacity
              style={styles.fab}
              onPress={() => navigation.navigate('CreateHelpTicket')}
              activeOpacity={0.9}>
              <MaterialCommunityIcons name="plus" size={24} color={colors.white} />
              <Text style={styles.fabText}>New ticket</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
};

export default HelpSupport;

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
  tabs: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 4,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: '#E8EDF5',
  },
  tabActive: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primaryBorder,
  },
  tabText: {
    fontSize: 13,
    color: colors.mutedText,
    fontFamily: fonts.BOLD,
  },
  tabTextActive: {
    color: colors.primary,
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
  primaryBtn: {
    marginTop: 16,
    backgroundColor: colors.primary,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
  },
  primaryBtnText: {
    color: colors.white,
    fontSize: 13,
    fontFamily: fonts.BOLD,
  },
  list: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 100,
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
    alignItems: 'flex-start',
    gap: 12,
  },
  subject: {
    flex: 1,
    fontSize: 15,
    color: colors.text,
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
  metaRow: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  meta: {
    flex: 1,
    fontSize: 12,
    color: colors.mutedText,
    fontFamily: fonts.BOLD,
  },
  date: {
    marginTop: 10,
    fontSize: 12,
    color: colors.mutedText,
    fontFamily: fonts.BOLD,
  },
  fab: {
    position: 'absolute',
    right: 18,
    bottom: 22,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primary,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: '#1B2430',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 6,
  },
  fabText: {
    color: colors.white,
    fontSize: 13,
    fontFamily: fonts.BOLD,
  },
});
