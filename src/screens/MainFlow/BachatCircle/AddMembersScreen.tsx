import React, { useMemo, useState } from 'react';
import {
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { fonts } from '../../../helpers/styles';
import { MainStackParamList } from '../../../navigation/types';
import { showAppAlert } from '../../../services/appAlert';
import MemberAvatar from './components/MemberAvatar';
import { circleStorage } from './circleStorage';
import { ALL_CONTACTS, DEFAULT_SELECTED_MEMBER_IDS } from './mockData';
import { circleColors, circleShadow } from './theme';

const AddMembersScreen = () => {
  const navigation =
    useNavigation<
      StackNavigationProp<MainStackParamList, 'BachatCircleAddMembers'>
    >();
  const route =
    useRoute<RouteProp<MainStackParamList, 'BachatCircleAddMembers'>>();
  const { circleName, category } = route.params;

  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Record<string, true>>(
    Object.fromEntries(DEFAULT_SELECTED_MEMBER_IDS.map(id => [id, true])),
  );
  const [invited, setInvited] = useState<Record<string, true>>({});
  const [saving, setSaving] = useState(false);

  const registered = useMemo(
    () => ALL_CONTACTS.filter(c => c.registered && !c.isYou),
    [],
  );
  const pending = useMemo(
    () => ALL_CONTACTS.filter(c => !c.registered),
    [],
  );

  const filteredRegistered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return registered;
    return registered.filter(
      c =>
        c.name.toLowerCase().includes(q) ||
        c.phone.toLowerCase().includes(q),
    );
  }, [query, registered]);

  const selectedCount = Object.keys(selected).length;

  const toggle = (id: string) => {
    setSelected(prev => {
      const next = { ...prev };
      if (next[id]) {
        delete next[id];
      } else {
        next[id] = true;
      }
      return next;
    });
  };

  const onInvite = (id: string, name: string) => {
    setInvited(prev => ({ ...prev, [id]: true }));
    showAppAlert('Invite sent', `Invite sent to ${name}.`);
  };

  const onAdd = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const existing = await circleStorage.load();
      const mergedMemberIds = Array.from(
        new Set([
          'you',
          ...(existing.created ? existing.memberIds : []),
          ...Object.keys(selected),
        ]),
      );
      const mergedPending = Array.from(
        new Set([
          ...(existing.created ? existing.pendingInviteIds : []),
          ...Object.keys(invited),
        ]),
      );
      await circleStorage.save({
        created: true,
        name: circleName,
        category,
        memberIds: mergedMemberIds,
        pendingInviteIds: mergedPending,
      });
      if (existing.created) {
        navigation.navigate('BachatCircleFeed');
      } else {
        navigation.replace('BachatCircleFeed');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
        >
          <MaterialCommunityIcons
            name="arrow-left"
            size={22}
            color={circleColors.green}
          />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add Members</Text>
        <View style={styles.headerArt}>
          <MaterialCommunityIcons
            name="account-multiple-plus"
            size={22}
            color={circleColors.green}
          />
        </View>
      </View>

      <View style={styles.banner}>
        <Text style={styles.bannerText}>
          Sirf wahi contacts dikhaye ja rahe hain jo Bachat Bazaar par
          registered hain.
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
        <MaterialCommunityIcons
          name="magnify"
          size={20}
          color={circleColors.muted}
        />
        <TextInput
          style={styles.searchInput}
          placeholder="Search from contacts..."
          placeholderTextColor={circleColors.muted}
          value={query}
          onChangeText={setQuery}
        />
      </View>

      <FlatList
        data={[{ key: 'list' }]}
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
                Bachat Bazaar Par Registered Contacts
              </Text>
              <View style={[styles.countBadge, styles.countGreen]}>
                <Text style={[styles.countText, { color: circleColors.green }]}>
                  {filteredRegistered.length}
                </Text>
              </View>
            </View>

            {filteredRegistered.map(contact => {
              const isSelected = Boolean(selected[contact.id]);
              return (
                <TouchableOpacity
                  key={contact.id}
                  style={styles.row}
                  onPress={() => toggle(contact.id)}
                  activeOpacity={0.85}
                >
                  <MemberAvatar
                    name={contact.name}
                    initial={contact.initial}
                    color={contact.avatarColor}
                    size={46}
                  />
                  <View style={styles.rowText}>
                    <Text style={styles.name}>{contact.name}</Text>
                    <Text style={styles.phone}>{contact.phone}</Text>
                  </View>
                  <View
                    style={[
                      styles.checkbox,
                      isSelected && styles.checkboxChecked,
                    ]}
                  >
                    {isSelected ? (
                      <MaterialCommunityIcons
                        name="check"
                        size={16}
                        color={circleColors.white}
                      />
                    ) : null}
                  </View>
                </TouchableOpacity>
              );
            })}

            <View style={[styles.sectionHeader, styles.sectionOrange]}>
              <MaterialCommunityIcons
                name="account-clock"
                size={18}
                color={circleColors.orange}
              />
              <Text
                style={[styles.sectionTitle, { color: circleColors.orange }]}
              >
                Invites Pending
              </Text>
              <View style={[styles.countBadge, styles.countOrange]}>
                <Text style={[styles.countText, { color: circleColors.orange }]}>
                  {pending.length}
                </Text>
              </View>
            </View>

            {pending.map(contact => (
              <View key={contact.id} style={styles.row}>
                <MemberAvatar
                  name={contact.name}
                  initial={contact.initial}
                  color={contact.avatarColor}
                  size={46}
                />
                <View style={styles.rowText}>
                  <Text style={styles.name}>{contact.name}</Text>
                  <Text style={styles.phone}>{contact.phone}</Text>
                </View>
                <TouchableOpacity
                  style={[
                    styles.inviteBtn,
                    invited[contact.id] && styles.inviteBtnDone,
                  ]}
                  onPress={() => onInvite(contact.id, contact.name)}
                  disabled={Boolean(invited[contact.id])}
                >
                  <Text
                    style={[
                      styles.inviteText,
                      invited[contact.id] && styles.inviteTextDone,
                    ]}
                  >
                    {invited[contact.id] ? 'Invited' : 'Invite'}
                  </Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      />

      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.addBtn,
            circleShadow.cta,
            selectedCount === 0 && styles.addBtnDisabled,
          ]}
          disabled={selectedCount === 0 || saving}
          activeOpacity={0.9}
          onPress={onAdd}
        >
          <Text style={styles.addText}>
            {saving ? 'Saving...' : `Add ${selectedCount} Members`}
          </Text>
          <MaterialCommunityIcons
            name="arrow-right"
            size={20}
            color={circleColors.white}
          />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: circleColors.white },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 4,
  },
  backBtn: { padding: 6 },
  headerTitle: {
    flex: 1,
    fontFamily: fonts.BOLD,
    fontSize: 18,
    color: circleColors.green,
  },
  headerArt: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: circleColors.greenSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
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
  countGreen: { backgroundColor: circleColors.greenSoft },
  countOrange: { backgroundColor: circleColors.orangeSoft },
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
  checkbox: {
    width: 26,
    height: 26,
    borderRadius: 7,
    borderWidth: 1.5,
    borderColor: circleColors.mutedSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: circleColors.green,
    borderColor: circleColors.green,
  },
  inviteBtn: {
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
  footer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: circleColors.borderSoft,
    backgroundColor: circleColors.white,
  },
  addBtn: {
    backgroundColor: circleColors.green,
    borderRadius: 16,
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  addBtnDisabled: { opacity: 0.5 },
  addText: {
    color: circleColors.white,
    fontFamily: fonts.BOLD,
    fontSize: 15,
  },
});

export default AddMembersScreen;
