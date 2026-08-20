import React, { useCallback, useMemo, useState } from 'react';
import {
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
import { colors, fonts } from '../../../helpers/styles';
import { MainStackParamList } from '../../../navigation/types';
import { showAppAlert } from '../../../services/appAlert';
import MemberAvatar from './components/MemberAvatar';
import { circleStorage, emptyCircleState } from './circleStorage';
import { ALL_CONTACTS } from './mockData';
import { BachatCircleState, MemberRole } from './types';
import { circleColors, circleShadow } from './theme';

const roleStyle = (role: MemberRole) => {
  if (role === 'Admin') {
    return {
      bg: circleColors.greenSoft,
      text: circleColors.green,
      icon: 'crown',
    };
  }
  if (role === 'Co-Admin') {
    return {
      bg: colors.pastelYellow,
      text: circleColors.adminGold,
      icon: 'shield-account',
    };
  }
  return {
    bg: circleColors.chipGray,
    text: circleColors.muted,
    icon: 'account',
  };
};

const MembersScreen = () => {
  const navigation =
    useNavigation<
      StackNavigationProp<MainStackParamList, 'BachatCircleMembers'>
    >();
  const [circle, setCircle] = useState<BachatCircleState | null>(null);
  const [tab, setTab] = useState<'all' | 'pending'>('all');

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      (async () => {
        const state = await circleStorage.load();
        if (!alive) return;
        setCircle(state);
      })();
      return () => {
        alive = false;
      };
    }, []),
  );

  const members = useMemo(() => {
    if (!circle) return [];
    return ALL_CONTACTS.filter(c => circle.memberIds.includes(c.id));
  }, [circle]);

  const pending = useMemo(() => {
    if (!circle) return [];
    return ALL_CONTACTS.filter(c => circle.pendingInviteIds.includes(c.id));
  }, [circle]);

  const leaveOrDelete = (mode: 'leave' | 'delete') => {
    showAppAlert(
      mode === 'leave' ? 'Leave Circle' : 'Delete Circle',
      mode === 'leave'
        ? 'Are you sure you want to leave this circle?'
        : 'Delete this circle permanently?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: mode === 'leave' ? 'Leave' : 'Delete',
          style: 'destructive',
          onPress: async () => {
            await circleStorage.save(emptyCircleState());
            navigation.replace('BachatCircle');
          },
        },
      ],
    );
  };

  if (!circle) {
    return <SafeAreaView style={styles.safe} edges={['top']} />;
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.iconBtn}
        >
          <MaterialCommunityIcons
            name="arrow-left"
            size={22}
            color={circleColors.green}
          />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Members</Text>
          <Text style={styles.headerSub}>{circle.name}</Text>
        </View>
        <TouchableOpacity
          style={styles.addMemberPill}
          onPress={() =>
            navigation.navigate('BachatCircleAddMembers', {
              circleName: circle.name,
              category: circle.category,
            })
          }
        >
          <MaterialCommunityIcons
            name="account-plus"
            size={16}
            color={circleColors.green}
          />
          <Text style={styles.addMemberText}>Add Member</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.iconBtn}>
          <MaterialCommunityIcons
            name="dots-vertical"
            size={20}
            color={circleColors.muted}
          />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.infoCard, circleShadow.soft]}>
          <View style={styles.infoIcon}>
            <MaterialCommunityIcons
              name="account-group"
              size={20}
              color={circleColors.white}
            />
          </View>
          <View style={styles.infoText}>
            <Text style={styles.infoTitle}>{members.length} Members</Text>
            <Text style={styles.infoSub}>
              Only circle members can see shared offers
            </Text>
          </View>
          <TouchableOpacity
            style={styles.inviteLink}
            onPress={() =>
              showAppAlert(
                'Invite via Link',
                'Invite link sharing will use a real API later.',
              )
            }
          >
            <MaterialCommunityIcons
              name="link-variant"
              size={14}
              color={circleColors.green}
            />
            <Text style={styles.inviteLinkText}>Invite via Link</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.tabs}>
          <TouchableOpacity style={styles.tab} onPress={() => setTab('all')}>
            <Text
              style={[styles.tabText, tab === 'all' && styles.tabTextActive]}
            >
              All Members ({members.length})
            </Text>
            {tab === 'all' ? <View style={styles.tabLine} /> : null}
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.tab}
            onPress={() => setTab('pending')}
          >
            <Text
              style={[
                styles.tabText,
                tab === 'pending' && styles.tabTextActive,
              ]}
            >
              Pending Invites ({pending.length})
            </Text>
            {tab === 'pending' ? <View style={styles.tabLine} /> : null}
          </TouchableOpacity>
        </View>

        {(tab === 'all' ? members : pending).map(member => {
          const tone = roleStyle(member.role);
          return (
            <View key={member.id} style={[styles.row, circleShadow.soft]}>
              <MemberAvatar
                name={member.name}
                initial={member.initial}
                color={member.avatarColor}
                online={member.online}
                size={46}
              />
              <View style={styles.rowText}>
                <Text style={styles.name}>
                  {member.isYou ? `${member.name} (You)` : member.name}
                </Text>
                <Text style={styles.phone}>{member.phone}</Text>
              </View>
              <View style={[styles.roleBadge, { backgroundColor: tone.bg }]}>
                <MaterialCommunityIcons
                  name={tone.icon}
                  size={12}
                  color={tone.text}
                />
                <Text style={[styles.roleText, { color: tone.text }]}>
                  {member.role}
                </Text>
              </View>
              <MaterialCommunityIcons
                name="dots-vertical"
                size={18}
                color={circleColors.mutedSoft}
              />
            </View>
          );
        })}

        <View style={styles.rolesCard}>
          {[
            {
              icon: 'crown',
              color: circleColors.green,
              title: 'Admin',
              body: 'Can manage circle, add or remove members.',
            },
            {
              icon: 'shield-account',
              color: circleColors.adminGold,
              title: 'Co-Admin',
              body: 'Can share offers and manage members.',
            },
            {
              icon: 'account-group',
              color: circleColors.muted,
              title: 'Member',
              body: 'Can view and share offers in the circle.',
            },
          ].map(item => (
            <View key={item.title} style={styles.roleRow}>
              <View
                style={[
                  styles.roleIconWrap,
                  { backgroundColor: `${item.color}22` },
                ]}
              >
                <MaterialCommunityIcons
                  name={item.icon}
                  size={18}
                  color={item.color}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.roleTitle}>{item.title}</Text>
                <Text style={styles.roleBody}>{item.body}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.dangerCard}>
          <Text style={styles.dangerTitle}>Leave or Delete Circle</Text>
          <Text style={styles.dangerSub}>
            You can leave this circle or permanently delete it.
          </Text>
          <View style={styles.dangerActions}>
            <TouchableOpacity
              style={styles.leaveBtn}
              onPress={() => leaveOrDelete('leave')}
            >
              <Text style={styles.leaveText}>Leave Circle</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.deleteBtn}
              onPress={() => leaveOrDelete('delete')}
            >
              <Text style={styles.deleteText}>Delete Circle</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: circleColors.page },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 10,
    gap: 4,
    backgroundColor: circleColors.white,
  },
  iconBtn: { padding: 6 },
  headerCenter: { flex: 1 },
  headerTitle: {
    fontFamily: fonts.BOLD,
    fontSize: 17,
    color: circleColors.text,
  },
  headerSub: { color: circleColors.green, fontSize: 12, marginTop: 2 },
  addMemberPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1.5,
    borderColor: circleColors.greenBorder,
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 7,
    backgroundColor: circleColors.greenSoft,
  },
  addMemberText: {
    color: circleColors.green,
    fontFamily: fonts.BOLD,
    fontSize: 12,
  },
  content: { padding: 16, paddingBottom: 28 },
  infoCard: {
    borderWidth: 1,
    borderColor: circleColors.greenBorder,
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
    backgroundColor: circleColors.greenWash,
  },
  infoIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: circleColors.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoText: { flex: 1 },
  infoTitle: { fontFamily: fonts.BOLD, color: circleColors.text },
  infoSub: { color: circleColors.muted, fontSize: 11, marginTop: 2 },
  inviteLink: {
    borderWidth: 1.5,
    borderColor: circleColors.green,
    borderRadius: 14,
    paddingHorizontal: 8,
    paddingVertical: 7,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: circleColors.white,
  },
  inviteLinkText: {
    color: circleColors.green,
    fontSize: 11,
    fontFamily: fonts.BOLD,
  },
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: circleColors.border,
    marginBottom: 12,
  },
  tab: { marginRight: 18, paddingVertical: 10, position: 'relative' },
  tabText: { color: circleColors.muted, fontSize: 13 },
  tabTextActive: { color: circleColors.green, fontFamily: fonts.BOLD },
  tabLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 3,
    backgroundColor: circleColors.green,
    borderTopLeftRadius: 2,
    borderTopRightRadius: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginBottom: 10,
    backgroundColor: circleColors.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: circleColors.borderSoft,
  },
  rowText: { flex: 1 },
  name: { fontFamily: fonts.BOLD, color: circleColors.text },
  phone: { color: circleColors.muted, fontSize: 12, marginTop: 2 },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 12,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  roleText: { fontSize: 11, fontFamily: fonts.BOLD },
  rolesCard: {
    marginTop: 8,
    backgroundColor: circleColors.greenSoft,
    borderRadius: 16,
    padding: 14,
    gap: 12,
  },
  roleRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  roleIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roleTitle: { fontFamily: fonts.BOLD, color: circleColors.text },
  roleBody: { color: circleColors.muted, fontSize: 12, marginTop: 2 },
  dangerCard: {
    marginTop: 16,
    backgroundColor: circleColors.redSoft,
    borderRadius: 16,
    padding: 14,
  },
  dangerTitle: {
    fontFamily: fonts.BOLD,
    color: circleColors.red,
    fontSize: 15,
  },
  dangerSub: { color: circleColors.muted, fontSize: 12, marginTop: 4 },
  dangerActions: { flexDirection: 'row', gap: 10, marginTop: 12 },
  leaveBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: circleColors.red,
    borderRadius: 12,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: circleColors.white,
  },
  leaveText: { color: circleColors.red, fontFamily: fonts.BOLD },
  deleteBtn: {
    flex: 1,
    backgroundColor: circleColors.red,
    borderRadius: 12,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteText: { color: circleColors.white, fontFamily: fonts.BOLD },
});

export default MembersScreen;
