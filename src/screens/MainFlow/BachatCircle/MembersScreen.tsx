import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { RouteProp, useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAppContext } from '../../../context/AppContext';
import { fonts } from '../../../helpers/styles';
import { MainStackParamList } from '../../../navigation/types';
import { showAppAlert } from '../../../services/appAlert';
import { BachatCircleDto, bachatCircleApi } from '../../../services/bachatCircleApi';
import MemberAvatar from './components/MemberAvatar';
import { circleStorage, emptyCircleState } from './circleStorage';
import { circleColors, circleShadow } from './theme';
import { maskPhoneNumber } from '../../../utils/phone';

const MembersScreen = () => {
  const navigation =
    useNavigation<StackNavigationProp<MainStackParamList, 'BachatCircleMembers'>>();
  const route = useRoute<RouteProp<MainStackParamList, 'BachatCircleMembers'>>();
  const { authToken } = useAppContext();
  const [circle, setCircle] = useState<BachatCircleDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'all' | 'pending'>('all');

  const load = useCallback(async () => {
    const token = authToken?.trim();
    const stored = await circleStorage.load();
    const circleId = route.params?.circleId || stored.circleId;
    if (!token || !circleId) {
      setLoading(false);
      return;
    }
    try {
      const detail = await bachatCircleApi.getCircle(token, circleId);
      setCircle(detail);
    } catch (error) {
      showAppAlert(
        'Could not load members',
        error instanceof Error ? error.message : 'Please try again.',
      );
    }
  }, [authToken, route.params?.circleId]);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      (async () => {
        setLoading(true);
        await load();
        if (alive) {
          setLoading(false);
        }
      })();
      return () => {
        alive = false;
      };
    }, [load]),
  );

  const leaveLocal = () => {
    showAppAlert('Leave Circle', 'Clear this circle from this device?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Leave',
        style: 'destructive',
        onPress: async () => {
          await circleStorage.save(emptyCircleState());
          navigation.replace('BachatCircle');
        },
      },
    ]);
  };

  if (loading || !circle) {
    return (
      <SafeAreaView style={[styles.safe, styles.center]} edges={['top']}>
        <ActivityIndicator color={circleColors.green} />
      </SafeAreaView>
    );
  }

  const pending = circle.pendingInvitations || [];
  const members = circle.members || [];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
          <MaterialCommunityIcons name="arrow-left" size={22} color={circleColors.green} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Members</Text>
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={() =>
            navigation.navigate('BachatCircleAddMembers', {
              circleName: circle.name,
              category: 'Friends',
              circleId: circle.id,
              description: circle.description,
            })
          }
        >
          <MaterialCommunityIcons name="account-plus" size={22} color={circleColors.green} />
        </TouchableOpacity>
      </View>

      <View style={[styles.summary, circleShadow.soft]}>
        <Text style={styles.summaryTitle}>{circle.name}</Text>
        <Text style={styles.summaryMeta}>
          {circle.memberCount} members
          {circle.myRole ? ` · You are ${circle.myRole}` : ''}
        </Text>
      </View>

      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, tab === 'all' && styles.tabActive]}
          onPress={() => setTab('all')}
        >
          <Text style={[styles.tabText, tab === 'all' && styles.tabTextActive]}>
            All ({members.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, tab === 'pending' && styles.tabActive]}
          onPress={() => setTab('pending')}
        >
          <Text style={[styles.tabText, tab === 'pending' && styles.tabTextActive]}>
            Pending ({pending.length})
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {tab === 'all'
          ? members.map(member => (
              <View key={member.userId} style={styles.row}>
                <MemberAvatar
                  name={member.name}
                  initial={member.name.slice(0, 1).toUpperCase()}
                  color={circleColors.greenSoft}
                  size={46}
                />
                <View style={styles.rowText}>
                  <Text style={styles.name}>{member.name}</Text>
                  <Text style={styles.phone}>
                    {member.phone ? maskPhoneNumber(member.phone) : member.role}
                  </Text>
                </View>
                <View style={styles.rolePill}>
                  <Text style={styles.roleText}>{member.role}</Text>
                </View>
              </View>
            ))
          : pending.length === 0
            ? (
              <Text style={styles.empty}>No pending invitations.</Text>
            )
            : pending.map(invite => (
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
                </View>
              ))}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.leaveBtn} onPress={leaveLocal}>
          <Text style={styles.leaveText}>Leave</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

export default MembersScreen;

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: circleColors.cream },
  center: { alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: circleColors.white,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 17,
    fontFamily: fonts.BOLD,
    color: circleColors.text,
  },
  summary: {
    marginHorizontal: 16,
    marginBottom: 10,
    backgroundColor: circleColors.greenSoft,
    borderRadius: 14,
    padding: 14,
  },
  summaryTitle: {
    fontSize: 16,
    fontFamily: fonts.BOLD,
    color: circleColors.text,
  },
  summaryMeta: { marginTop: 4, color: circleColors.muted, fontSize: 12 },
  tabs: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 8,
    gap: 8,
  },
  tab: {
    flex: 1,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: circleColors.white,
  },
  tabActive: { backgroundColor: circleColors.green },
  tabText: { fontFamily: fonts.BOLD, color: circleColors.muted },
  tabTextActive: { color: circleColors.white },
  content: { padding: 16, paddingBottom: 30 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: circleColors.white,
    borderRadius: 14,
    padding: 10,
    marginBottom: 8,
  },
  rowText: { flex: 1 },
  name: { fontSize: 15, fontFamily: fonts.BOLD, color: circleColors.text },
  phone: { fontSize: 12, color: circleColors.muted, marginTop: 2 },
  rolePill: {
    backgroundColor: circleColors.greenSoft,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  roleText: {
    fontSize: 10,
    fontFamily: fonts.BOLD,
    color: circleColors.green,
  },
  pendingAvatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: circleColors.orangeSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  empty: { color: circleColors.muted, fontSize: 13 },
  footer: {
    padding: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: circleColors.border,
  },
  leaveBtn: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: circleColors.red,
    alignItems: 'center',
    justifyContent: 'center',
  },
  leaveText: {
    color: circleColors.red,
    fontFamily: fonts.BOLD,
  },
});
