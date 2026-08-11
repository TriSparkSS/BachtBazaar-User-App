import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { RouteProp, useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
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
  HelpTicketDetail,
  helpApi,
  isClosedLikeTicket,
} from '../../../services/helpApi';

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

const HelpTicketDetailScreen = () => {
  const navigation =
    useNavigation<StackNavigationProp<MainStackParamList, 'HelpTicketDetail'>>();
  const route = useRoute<RouteProp<MainStackParamList, 'HelpTicketDetail'>>();
  const { authToken } = useAppContext();
  const insets = useSafeAreaInsets();
  const ticketId = route.params.ticketId;

  const [ticket, setTicket] = useState<HelpTicketDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [reply, setReply] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadDetail = useCallback(
    async (mode: 'initial' | 'refresh' = 'initial') => {
      const token = authToken?.trim();
      if (!token) {
        setTicket(null);
        setError('Please log in to view this ticket.');
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
        const detail = await helpApi.fetchTicketDetail(ticketId, token);
        setTicket(detail);
        setError(null);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Could not load ticket detail.';
        setError(message);
        if (mode === 'initial') {
          setTicket(null);
        }
        showAppAlert('Could not load ticket', message);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [authToken, ticketId],
  );

  useFocusEffect(
    useCallback(() => {
      void loadDetail('initial');
    }, [loadDetail]),
  );

  const sendReply = async () => {
    const token = authToken?.trim();
    const message = reply.trim();
    if (!token) {
      showAppAlert('Login required', 'Please log in to reply.');
      return;
    }
    if (!message) {
      showAppAlert('Message required', 'Please type a reply before sending.');
      return;
    }

    try {
      setIsSending(true);
      await helpApi.replyTicket(ticketId, message, token);
      setReply('');
      await loadDetail('refresh');
    } catch (err) {
      showAppAlert(
        'Could not send reply',
        err instanceof Error ? err.message : 'Please try again.',
      );
    } finally {
      setIsSending(false);
    }
  };

  const tone = statusTone(ticket?.status);
  const isClosed = ticket ? isClosedLikeTicket(ticket) : false;
  // Header sits outside KAV; offset keeps composer clear of keyboard.
  const keyboardOffset =
    Platform.OS === 'ios' ? insets.top + 52 : Math.max(insets.top, 0);

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
          <Text style={styles.headerTitle} numberOfLines={1}>
            Ticket
          </Text>
          <View style={styles.backBtn} />
        </View>
      </SafeAreaView>

      <KeyboardAvoidingView
        style={styles.body}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={keyboardOffset}>
        {isLoading && !ticket ? (
          <View style={styles.center}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={styles.centerText}>Loading ticket...</Text>
          </View>
        ) : !ticket ? (
          <View style={styles.center}>
            <Text style={styles.emptyTitle}>Unable to load ticket</Text>
            <Text style={styles.emptySub}>{error || 'Please try again.'}</Text>
            <TouchableOpacity
              style={styles.retryBtn}
              onPress={() => loadDetail('initial')}
              activeOpacity={0.85}>
              <Text style={styles.retryText}>Try again</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.flex}>
            <ScrollView
              style={styles.flex}
              contentContainerStyle={styles.content}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              refreshControl={
                <RefreshControl
                  refreshing={isRefreshing}
                  onRefresh={() => loadDetail('refresh')}
                  tintColor={colors.primary}
                />
              }>
              <View style={styles.metaCard}>
                <Text style={styles.subject}>{ticket.subject}</Text>
                <View style={styles.chipRow}>
                  {ticket.status ? (
                    <View style={[styles.badge, { backgroundColor: tone.bg }]}>
                      <Text style={[styles.badgeText, { color: tone.text }]}>
                        {ticket.status}
                      </Text>
                    </View>
                  ) : null}
                  {ticket.category ? (
                    <View style={styles.softBadge}>
                      <Text style={styles.softBadgeText}>{ticket.category}</Text>
                    </View>
                  ) : null}
                  {ticket.priority ? (
                    <View style={styles.softBadge}>
                      <Text style={styles.softBadgeText}>{ticket.priority}</Text>
                    </View>
                  ) : null}
                </View>
                {ticket.createdAt ? (
                  <Text style={styles.date}>{formatDate(ticket.createdAt)}</Text>
                ) : null}
              </View>

              {ticket.messages.length === 0 ? (
                <View style={styles.emptyThread}>
                  <Text style={styles.emptySub}>No messages in this ticket yet.</Text>
                </View>
              ) : (
                ticket.messages.map(message => {
                  const staff = Boolean(message.isStaff);
                  return (
                    <View
                      key={message.id}
                      style={[
                        styles.bubble,
                        staff ? styles.staffBubble : styles.userBubble,
                      ]}>
                      <Text style={styles.bubbleAuthor}>
                        {staff
                          ? message.senderName || 'Support'
                          : message.senderName || 'You'}
                      </Text>
                      <Text style={styles.bubbleText}>{message.message}</Text>
                      {message.createdAt ? (
                        <Text style={styles.bubbleDate}>
                          {formatDate(message.createdAt)}
                        </Text>
                      ) : null}
                    </View>
                  );
                })
              )}
            </ScrollView>

            {!isClosed ? (
              <SafeAreaView edges={['bottom']} style={styles.replySafe}>
                <View style={styles.replyBar}>
                  <TextInput
                    style={styles.replyInput}
                    value={reply}
                    onChangeText={setReply}
                    placeholder="Write a reply..."
                    placeholderTextColor={colors.mutedText}
                    multiline
                    maxLength={2000}
                    textAlignVertical="top"
                  />
                  <TouchableOpacity
                    style={[styles.sendBtn, isSending && styles.sendDisabled]}
                    onPress={sendReply}
                    disabled={isSending}
                    activeOpacity={0.85}>
                    {isSending ? (
                      <ActivityIndicator size="small" color={colors.white} />
                    ) : (
                      <MaterialCommunityIcons
                        name="send"
                        size={18}
                        color={colors.white}
                      />
                    )}
                  </TouchableOpacity>
                </View>
              </SafeAreaView>
            ) : (
              <SafeAreaView edges={['bottom']} style={styles.replySafe}>
                <View style={styles.closedBar}>
                  <Text style={styles.closedText}>This ticket is closed.</Text>
                </View>
              </SafeAreaView>
            )}
          </View>
        )}
      </KeyboardAvoidingView>
    </View>
  );
};

export default HelpTicketDetailScreen;

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
  },
  replySafe: {
    backgroundColor: colors.white,
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
  content: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
    gap: 12,
  },
  metaCard: {
    backgroundColor: colors.white,
    borderRadius: 18,
    padding: 16,
    shadowColor: '#1B2430',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  subject: {
    fontSize: 17,
    color: colors.text,
    fontFamily: fonts.BOLD,
  },
  chipRow: {
    marginTop: 12,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
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
  softBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: '#EEF2F8',
  },
  softBadgeText: {
    fontSize: 11,
    color: colors.mutedText,
    fontFamily: fonts.BOLD,
  },
  date: {
    marginTop: 12,
    fontSize: 12,
    color: colors.mutedText,
    fontFamily: fonts.BOLD,
  },
  emptyThread: {
    paddingVertical: 28,
    alignItems: 'center',
  },
  bubble: {
    borderRadius: 16,
    padding: 14,
    maxWidth: '92%',
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
  },
  staffBubble: {
    alignSelf: 'flex-start',
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: '#E8EDF5',
  },
  bubbleAuthor: {
    fontSize: 11,
    color: colors.mutedText,
    fontFamily: fonts.BOLD,
    marginBottom: 4,
  },
  bubbleText: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.text,
    fontFamily: fonts.BOLD,
  },
  bubbleDate: {
    marginTop: 8,
    fontSize: 11,
    color: colors.mutedText,
    fontFamily: fonts.BOLD,
  },
  replyBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#E8EDF5',
    backgroundColor: colors.white,
  },
  replyInput: {
    flex: 1,
    minHeight: 42,
    maxHeight: 110,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E8EDF5',
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.text,
    fontFamily: fonts.BOLD,
    backgroundColor: '#F8FAFD',
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendDisabled: {
    opacity: 0.7,
  },
  closedBar: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: '#E8EDF5',
    backgroundColor: colors.white,
    alignItems: 'center',
  },
  closedText: {
    fontSize: 13,
    color: colors.mutedText,
    fontFamily: fonts.BOLD,
  },
});
