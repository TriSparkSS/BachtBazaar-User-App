import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { RouteProp, useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAppContext } from '../../../context/AppContext';
import { colors, fonts } from '../../../helpers/styles';
import { MainStackParamList } from '../../../navigation/types';
import { showAppAlert } from '../../../services/appAlert';
import {
  BachatCircleDto,
  CircleInviteableUserDto,
  bachatCircleApi,
} from '../../../services/bachatCircleApi';
import { maskPhoneNumber } from '../../../utils/phone';
import MemberAvatar from './components/MemberAvatar';
import { circleStorage } from './circleStorage';
import { circleColors, circleShadow } from './theme';

const AVATAR_COLORS = [
  colors.pastelBlue,
  colors.pastelPurple,
  colors.pastelOrange,
  colors.pastelGreen,
  colors.pastelYellow,
  colors.primarySoft,
];

const normalizePhone = (value: string) =>
  value.replace(/\D/g, '').replace(/^91/, '').slice(-10);

type InviteStatus = 'invite' | 'invited' | 'member';

const AddMembersScreen = () => {
  const navigation =
    useNavigation<
      StackNavigationProp<MainStackParamList, 'BachatCircleAddMembers'>
    >();
  const route =
    useRoute<RouteProp<MainStackParamList, 'BachatCircleAddMembers'>>();
  const { circleName, category, circleId, description } = route.params;
  const { authToken, currentUser } = useAppContext();

  const [query, setQuery] = useState('');
  const [circle, setCircle] = useState<BachatCircleDto | null>(null);
  const [users, setUsers] = useState<CircleInviteableUserDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [invitingPhone, setInvitingPhone] = useState<string | null>(null);
  const [locallyInvited, setLocallyInvited] = useState<Record<string, true>>({});

  const myPhone = normalizePhone(currentUser?.phone || '');

  const load = useCallback(async () => {
    const token = authToken?.trim();
    if (!token || !circleId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const [detail, inviteableResult] = await Promise.all([
        bachatCircleApi.getCircle(token, circleId),
        bachatCircleApi.listInviteableUsers(token).then(
          list => ({ ok: true as const, list }),
          error => ({
            ok: false as const,
            list: [] as CircleInviteableUserDto[],
            error:
              error instanceof Error ? error.message : 'Could not load users.',
          }),
        ),
      ]);
      setCircle(detail);
      setUsers(inviteableResult.list);
      await circleStorage.save({
        created: true,
        circleId: detail.id,
        name: detail.name || circleName,
        category,
        description: detail.description || description,
        memberIds: detail.members.map(m => m.userId),
        pendingInviteIds: detail.pendingInvitations.map(i => i.id),
      });
    } catch (error) {
      showAppAlert(
        'Could not load members',
        error instanceof Error ? error.message : 'Please try again.',
      );
    } finally {
      setLoading(false);
    }
  }, [authToken, category, circleId, circleName, description]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const memberPhones = useMemo(() => {
    const set = new Set<string>();
    for (const member of circle?.members || []) {
      if (member.phone) {
        set.add(normalizePhone(member.phone));
      }
    }
    return set;
  }, [circle?.members]);

  const pendingPhones = useMemo(() => {
    const set = new Set<string>();
    for (const invite of circle?.pendingInvitations || []) {
      set.add(normalizePhone(invite.phone));
    }
    return set;
  }, [circle?.pendingInvitations]);

  const filteredUsers = useMemo(() => {
    const q = query.trim().toLowerCase();
    return users
      .filter(user => {
        if (myPhone && user.phone === myPhone) {
          return false;
        }
        if (!q) {
          return true;
        }
        return (
          user.name.toLowerCase().includes(q) ||
          user.phone.includes(q) ||
          maskPhoneNumber(user.phone).toLowerCase().includes(q)
        );
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [myPhone, query, users]);

  const getStatus = (phone: string): InviteStatus => {
    if (memberPhones.has(phone)) {
      return 'member';
    }
    if (pendingPhones.has(phone) || locallyInvited[phone]) {
      return 'invited';
    }
    return 'invite';
  };

  const onInvite = async (user: CircleInviteableUserDto) => {
    const token = authToken?.trim();
    if (!token) {
      showAppAlert('Login required', 'Please log in to invite members.');
      return;
    }
    if (invitingPhone || getStatus(user.phone) !== 'invite') {
      return;
    }

    setInvitingPhone(user.phone);
    try {
      const result = await bachatCircleApi.inviteByPhone(token, circleId, user.phone);
      setLocallyInvited(prev => ({ ...prev, [user.phone]: true }));
      showAppAlert(
        result.isRegistered ? 'Invite sent' : 'Invite created',
        result.message ||
          (result.isRegistered
            ? `Invitation sent to ${user.name}.`
            : `${user.name} will join once they register.`),
      );
      await load();
    } catch (error) {
      showAppAlert(
        'Invite failed',
        error instanceof Error ? error.message : 'Please try again.',
      );
    } finally {
      setInvitingPhone(null);
    }
  };

  const onContinue = () => {
    navigation.replace('BachatCircleFeed', { circleId });
  };

  const pending = circle?.pendingInvitations || [];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <MaterialCommunityIcons name="arrow-left" size={22} color={circleColors.green} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add Members</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.banner}>
        <Text style={styles.bannerText}>
          Sirf Bachat Bazaar registered users dikhaye ja rahe hain. Invite par tap
          karke invitation bhejein.
        </Text>
        <View style={styles.bannerIcon}>
          <MaterialCommunityIcons
            name="shield-account"
            size={28}
            color={circleColors.green}
          />
        </View>
      </View>

      <View style={styles.searchRow}>
        <MaterialCommunityIcons name="magnify" size={20} color={circleColors.muted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search users..."
          placeholderTextColor={circleColors.muted}
          value={query}
          onChangeText={setQuery}
        />
      </View>

      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={circleColors.green} />
        </View>
      ) : (
        <FlatList
          data={[{ key: 'body' }]}
          keyExtractor={item => item.key}
          contentContainerStyle={styles.listContent}
          renderItem={() => (
            <View>
              <View style={[styles.sectionHeader, styles.sectionGreen]}>
                <MaterialCommunityIcons
                  name="account-group"
                  size={18}
                  color={circleColors.green}
                />
                <Text style={[styles.sectionTitle, { color: circleColors.green }]}>
                  Registered Users
                </Text>
                <View style={[styles.countBadge, styles.countGreen]}>
                  <Text style={[styles.countText, { color: circleColors.green }]}>
                    {filteredUsers.length}
                  </Text>
                </View>
              </View>

              {filteredUsers.length === 0 ? (
                <Text style={styles.empty}>No users</Text>
              ) : (
                filteredUsers.map((user, index) => {
                  const status = getStatus(user.phone);
                  const busy = invitingPhone === user.phone;
                  const initial = user.name.trim().slice(0, 1).toUpperCase() || 'U';
                  const avatarColor = AVATAR_COLORS[index % AVATAR_COLORS.length];
                  const label =
                    status === 'member'
                      ? 'Member'
                      : status === 'invited'
                        ? 'Invited'
                        : 'Invite';

                  return (
                    <View key={user.id} style={styles.row}>
                      <MemberAvatar
                        name={user.name}
                        initial={initial}
                        color={avatarColor}
                        size={46}
                      />
                      <View style={styles.rowText}>
                        <Text style={styles.name}>{user.name}</Text>
                        <Text style={styles.phone}>{maskPhoneNumber(user.phone)}</Text>
                      </View>
                      <TouchableOpacity
                        style={[
                          styles.inviteBtn,
                          status !== 'invite' && styles.inviteBtnDone,
                        ]}
                        disabled={status !== 'invite' || busy}
                        onPress={() => {
                          void onInvite(user);
                        }}
                      >
                        {busy ? (
                          <ActivityIndicator color={circleColors.orange} size="small" />
                        ) : (
                          <Text
                            style={[
                              styles.inviteText,
                              status !== 'invite' && styles.inviteTextDone,
                            ]}
                          >
                            {label}
                          </Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  );
                })
              )}

              <View style={[styles.sectionHeader, styles.sectionOrange]}>
                <MaterialCommunityIcons
                  name="account-clock"
                  size={18}
                  color={circleColors.orange}
                />
                <Text style={[styles.sectionTitle, { color: circleColors.orange }]}>
                  Pending Invites
                </Text>
                <View style={[styles.countBadge, styles.countOrange]}>
                  <Text style={[styles.countText, { color: circleColors.orange }]}>
                    {pending.length}
                  </Text>
                </View>
              </View>

              {pending.length === 0 ? (
                <Text style={styles.empty}>No pending invites yet.</Text>
              ) : (
                pending.map(invite => (
                  <View key={invite.id} style={styles.row}>
                    <View style={styles.pendingAvatar}>
                      <MaterialCommunityIcons
                        name="clock-outline"
                        size={22}
                        color={circleColors.orange}
                      />
                    </View>
                    <View style={styles.rowText}>
                      <Text style={styles.name}>{maskPhoneNumber(invite.phone)}</Text>
                      <Text style={styles.phone}>{invite.status}</Text>
                    </View>
                    <View style={[styles.inviteBtn, styles.inviteBtnDone]}>
                      <Text style={[styles.inviteText, styles.inviteTextDone]}>
                        Invited
                      </Text>
                    </View>
                  </View>
                ))
              )}
            </View>
          )}
        />
      )}

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.doneBtn, circleShadow.cta]}
          activeOpacity={0.9}
          onPress={onContinue}
        >
          <Text style={styles.doneText}>Go to Circle Feed</Text>
          <MaterialCommunityIcons name="arrow-right" size={20} color={circleColors.white} />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

export default AddMembersScreen;

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: circleColors.white },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: circleColors.greenSoft,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 17,
    fontFamily: fonts.BOLD,
    color: circleColors.green,
  },
  headerSpacer: { width: 40, height: 40 },
  banner: {
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: circleColors.greenBanner,
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  bannerText: {
    flex: 1,
    color: circleColors.green,
    fontSize: 13,
    lineHeight: 19,
  },
  bannerIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: circleColors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchRow: {
    marginHorizontal: 16,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: circleColors.chipGray,
    borderRadius: 14,
    paddingHorizontal: 14,
    minHeight: 46,
  },
  searchInput: { flex: 1, color: circleColors.text, paddingVertical: 8 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  listContent: { paddingBottom: 16 },
  sectionHeader: {
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 4,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 11,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionGreen: { backgroundColor: circleColors.greenSoft },
  sectionOrange: { backgroundColor: circleColors.orangeSoft },
  sectionTitle: { flex: 1, fontFamily: fonts.BOLD, fontSize: 13 },
  countBadge: {
    minWidth: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  countGreen: { backgroundColor: circleColors.white },
  countOrange: { backgroundColor: circleColors.white },
  countText: { fontFamily: fonts.BOLD, fontSize: 12 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: circleColors.borderSoft,
  },
  rowText: { flex: 1 },
  name: { fontFamily: fonts.BOLD, color: circleColors.text, fontSize: 15 },
  phone: { color: circleColors.muted, fontSize: 12, marginTop: 2 },
  inviteBtn: {
    minWidth: 78,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: circleColors.orange,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 7,
    backgroundColor: circleColors.orangeSoft,
  },
  inviteBtnDone: {
    borderColor: circleColors.greenBorder,
    backgroundColor: circleColors.greenSoft,
  },
  inviteText: {
    color: circleColors.orange,
    fontFamily: fonts.BOLD,
    fontSize: 13,
  },
  inviteTextDone: { color: circleColors.green },
  pendingAvatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: circleColors.orangeSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  empty: {
    color: circleColors.muted,
    fontSize: 13,
    marginHorizontal: 16,
    marginVertical: 10,
  },
  footer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: circleColors.borderSoft,
    backgroundColor: circleColors.white,
  },
  doneBtn: {
    backgroundColor: circleColors.green,
    borderRadius: 16,
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  doneText: {
    color: circleColors.white,
    fontFamily: fonts.BOLD,
    fontSize: 15,
  },
});
