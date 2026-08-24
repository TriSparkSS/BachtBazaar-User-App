import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Platform,
  RefreshControl,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import LinearGradient from 'react-native-linear-gradient';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAppContext } from '../../../context/AppContext';
import { colors, fonts } from '../../../helpers/styles';
import { MainStackParamList } from '../../../navigation/types';
import { showAppAlert } from '../../../services/appAlert';
import { referralsApi } from '../../../services/referralsApi';
import { ReferralCodeInfo, ReferralListItem } from '../../../types/referral';
import { maskPhoneNumber } from '../../../utils/phone';

const PAGE_BG = '#F4F6FA';

const buildShareMessage = (code: string) =>
  `Join me on Bachat Bazaar! Use my referral code ${code} when you sign up and start saving together.\n\nhttps://bachatbazaar.tech`;

const InviteEarnScreen = () => {
  const navigation =
    useNavigation<StackNavigationProp<MainStackParamList, 'InviteEarn'>>();
  const insets = useSafeAreaInsets();
  const { authToken } = useAppContext();

  const [codeInfo, setCodeInfo] = useState<ReferralCodeInfo | null>(null);
  const [referrals, setReferrals] = useState<ReferralListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sharing, setSharing] = useState(false);

  const load = useCallback(async () => {
    const token = authToken?.trim();
    if (!token) {
      setCodeInfo(null);
      setReferrals([]);
      setLoading(false);
      return;
    }

    try {
      const [code, list] = await Promise.all([
        referralsApi.fetchMyCode(token),
        referralsApi.fetchList(token).catch(() => [] as ReferralListItem[]),
      ]);
      setCodeInfo(code);
      setReferrals(list);
    } catch (error) {
      showAppAlert(
        'Could not load referral',
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

  const onShareInvite = async () => {
    const token = authToken?.trim();
    if (!token) {
      showAppAlert('Login required', 'Please log in to invite friends.');
      return;
    }
    if (sharing) {
      return;
    }

    setSharing(true);
    try {
      let code = codeInfo?.referralCode;
      if (!code) {
        const fresh = await referralsApi.fetchMyCode(token);
        setCodeInfo(fresh);
        code = fresh.referralCode;
      }

      await Share.share({
        message: buildShareMessage(code),
        title: 'Invite to Bachat Bazaar',
      });
    } catch (error) {
      if (
        error instanceof Error &&
        /share.*cancel|User did not share/i.test(error.message)
      ) {
        return;
      }
      showAppAlert(
        'Share failed',
        error instanceof Error ? error.message : 'Please try again.',
      );
    } finally {
      setSharing(false);
    }
  };

  const totalCount = codeInfo?.totalReferrals ?? referrals.length;
  const bottomPad = Math.max(insets.bottom, 16) + 28;

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.headerSafe} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <MaterialCommunityIcons name="arrow-left" size={22} color={colors.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Invite & Earn</Text>
          <View style={styles.headerSpacer} />
        </View>
      </SafeAreaView>

      <View style={styles.body}>
        {loading ? (
          <View style={styles.loading}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : (
          <FlatList
            data={referrals}
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
            ListHeaderComponent={
              <View>
                <LinearGradient
                  colors={['#EEF4FF', '#FFFFFF']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.heroCard}
                >
                  <View style={styles.heroTop}>
                    <View style={styles.heroIcon}>
                      <MaterialCommunityIcons
                        name="gift-outline"
                        size={26}
                        color={colors.primary}
                      />
                    </View>
                    <View style={styles.heroCopy}>
                      <Text style={styles.heroTitle}>Invite friends, earn rewards</Text>
                      <Text style={styles.heroSubtitle}>
                        Share your referral code. Friends who join with it show
                        up in your list below.
                      </Text>
                    </View>
                  </View>

                  <View style={styles.codeBox}>
                    <Text style={styles.codeLabel}>Your referral code</Text>
                    <Text style={styles.codeValue}>
                      {codeInfo?.referralCode || '—'}
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={[styles.shareBtn, sharing && styles.shareBtnDisabled]}
                    activeOpacity={0.9}
                    disabled={sharing || !codeInfo?.referralCode}
                    onPress={() => {
                      void onShareInvite();
                    }}
                  >
                    {sharing ? (
                      <ActivityIndicator color={colors.white} />
                    ) : (
                      <>
                        <MaterialCommunityIcons
                          name="share-variant"
                          size={20}
                          color={colors.white}
                        />
                        <Text style={styles.shareBtnText}>Share invite</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </LinearGradient>

                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Your referrals</Text>
                  <View style={styles.countPill}>
                    <Text style={styles.countText}>{totalCount}</Text>
                  </View>
                </View>
              </View>
            }
            ListEmptyComponent={
              <View style={styles.emptyCard}>
                <View style={styles.emptyIconWrap}>
                  <MaterialCommunityIcons
                    name="account-multiple-outline"
                    size={30}
                    color={colors.primary}
                  />
                </View>
                <Text style={styles.emptyTitle}>No referrals yet</Text>
                <Text style={styles.emptyText}>
                  Share your code to start inviting friends.
                </Text>
              </View>
            }
            renderItem={({ item }) => (
              <View style={styles.row}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {item.name.trim().slice(0, 1).toUpperCase() || 'R'}
                  </Text>
                </View>
                <View style={styles.rowText}>
                  <Text style={styles.name} numberOfLines={1}>
                    {item.name}
                  </Text>
                  {item.phone ? (
                    <Text style={styles.meta}>{maskPhoneNumber(item.phone)}</Text>
                  ) : item.status ? (
                    <Text style={styles.meta}>{item.status}</Text>
                  ) : null}
                </View>
                {item.status ? (
                  <View style={styles.statusPill}>
                    <Text style={styles.statusText}>{item.status}</Text>
                  </View>
                ) : null}
              </View>
            )}
          />
        )}
      </View>
    </View>
  );
};

export default InviteEarnScreen;

const cardShadow = Platform.select({
  ios: {
    shadowColor: '#1B2430',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  android: { elevation: 3 },
  default: {},
});

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.primary,
  },
  headerSafe: {
    backgroundColor: colors.primary,
  },
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
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 17,
    fontFamily: fonts.BOLD,
    color: colors.white,
  },
  headerSpacer: { width: 40, height: 40 },
  body: {
    flex: 1,
    backgroundColor: PAGE_BG,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 18,
  },
  heroCard: {
    borderRadius: 20,
    padding: 18,
    marginBottom: 22,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    ...cardShadow,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  heroIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.primaryBorder,
  },
  heroCopy: { flex: 1 },
  heroTitle: {
    fontSize: 18,
    fontFamily: fonts.BOLD,
    color: colors.text,
  },
  heroSubtitle: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 19,
    color: colors.mutedText,
  },
  codeBox: {
    marginTop: 16,
    backgroundColor: colors.white,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E8EDF5',
  },
  codeLabel: {
    fontSize: 12,
    color: colors.mutedText,
    fontFamily: fonts.BOLD,
  },
  codeValue: {
    marginTop: 6,
    fontSize: 30,
    letterSpacing: 4,
    fontFamily: fonts.BOLD,
    color: colors.primary,
  },
  shareBtn: {
    marginTop: 14,
    height: 52,
    borderRadius: 14,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  shareBtnDisabled: { opacity: 0.7 },
  shareBtnText: {
    color: colors.white,
    fontSize: 15,
    fontFamily: fonts.BOLD,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  sectionTitle: {
    flex: 1,
    fontSize: 16,
    fontFamily: fonts.BOLD,
    color: colors.text,
  },
  countPill: {
    minWidth: 28,
    height: 28,
    borderRadius: 14,
    paddingHorizontal: 8,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countText: {
    fontSize: 13,
    fontFamily: fonts.BOLD,
    color: colors.primary,
  },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 20,
    backgroundColor: colors.white,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E8EDF5',
    marginBottom: 8,
    ...cardShadow,
  },
  emptyIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: {
    marginTop: 12,
    fontSize: 15,
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E8EDF5',
    ...cardShadow,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 16,
    fontFamily: fonts.BOLD,
    color: colors.primary,
  },
  rowText: { flex: 1 },
  name: {
    fontSize: 15,
    fontFamily: fonts.BOLD,
    color: colors.text,
  },
  meta: {
    marginTop: 2,
    fontSize: 12,
    color: colors.mutedText,
  },
  statusPill: {
    backgroundColor: colors.pastelGreen,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  statusText: {
    fontSize: 11,
    fontFamily: fonts.BOLD,
    color: colors.darkgreen,
  },
});
