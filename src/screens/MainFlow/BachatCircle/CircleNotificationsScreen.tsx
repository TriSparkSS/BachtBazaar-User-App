import React, { useState } from 'react';
import {
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
import { fonts } from '../../../helpers/styles';
import { MainStackParamList } from '../../../navigation/types';
import MemberAvatar from './components/MemberAvatar';
import { MOCK_NOTIFICATIONS } from './mockData';
import { circleColors, circleShadow } from './theme';

const FILTERS: {
  key: 'All' | 'Offers' | 'Circle' | 'Messages' | 'System';
  icon?: string;
}[] = [
  { key: 'All' },
  { key: 'Offers', icon: 'tag-outline' },
  { key: 'Circle', icon: 'account-group-outline' },
  { key: 'Messages', icon: 'message-outline' },
  { key: 'System', icon: 'bell-outline' },
];

const CircleNotificationsScreen = () => {
  const navigation =
    useNavigation<
      StackNavigationProp<MainStackParamList, 'BachatCircleNotifications'>
    >();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]['key']>('All');
  const [items, setItems] = useState(MOCK_NOTIFICATIONS);

  const visible = items.filter(item => {
    if (filter === 'All') return true;
    if (filter === 'Offers') {
      return item.type === 'shared' || item.type === 'new-offer';
    }
    if (filter === 'Circle') {
      return item.type === 'joined' || item.type === 'welcome';
    }
    if (filter === 'System') {
      return item.type === 'welcome' || item.type === 'reward';
    }
    return false;
  });

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
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Notifications</Text>
          <View style={styles.titleUnderline} />
        </View>
        <TouchableOpacity
          onPress={() =>
            setItems(prev => prev.map(n => ({ ...n, unread: false })))
          }
        >
          <Text style={styles.markRead}>Mark all read</Text>
        </TouchableOpacity>
        <MaterialCommunityIcons
          name="cog-outline"
          size={20}
          color={circleColors.muted}
          style={{ marginLeft: 8 }}
        />
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filters}
      >
        {FILTERS.map(item => {
          const active = filter === item.key;
          return (
            <TouchableOpacity
              key={item.key}
              style={[styles.filterChip, active && styles.filterChipActive]}
              onPress={() => setFilter(item.key)}
            >
              {item.icon ? (
                <MaterialCommunityIcons
                  name={item.icon}
                  size={14}
                  color={active ? circleColors.white : circleColors.muted}
                />
              ) : null}
              <Text
                style={[
                  styles.filterText,
                  active && styles.filterTextActive,
                ]}
              >
                {item.key}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <ScrollView contentContainerStyle={styles.list}>
        {visible.length === 0 ? (
          <View style={styles.empty}>
            <MaterialCommunityIcons
              name="bell-sleep-outline"
              size={40}
              color={circleColors.mutedSoft}
            />
            <Text style={styles.emptyTitle}>No notifications</Text>
            <Text style={styles.emptySub}>
              You're all caught up in this filter.
            </Text>
          </View>
        ) : null}
        {visible.map(item => (
          <TouchableOpacity
            key={item.id}
            style={[
              styles.card,
              circleShadow.soft,
              item.unread && styles.cardUnread,
            ]}
            activeOpacity={0.9}
            onPress={() => {
              if (item.type === 'shared' || item.type === 'new-offer') {
                navigation.navigate('BachatCircleOfferDetail', {
                  offerId: 'offer-1',
                });
              }
            }}
          >
            {item.type === 'shared' ? (
              <View>
                <MemberAvatar name="A" initial="A" color={circleColors.greenSoft} size={44} />
                <View style={styles.avatarBadge}>
                  <MaterialCommunityIcons
                    name="account-group"
                    size={10}
                    color={circleColors.white}
                  />
                </View>
              </View>
            ) : (
              <View
                style={[
                  styles.iconCircle,
                  {
                    backgroundColor:
                      item.type === 'joined'
                        ? circleColors.green
                        : item.type === 'reward'
                          ? circleColors.orangeSoft
                          : circleColors.greenSoft,
                  },
                ]}
              >
                <MaterialCommunityIcons
                  name={
                    item.type === 'joined'
                      ? 'account-plus'
                      : item.type === 'welcome'
                        ? 'shield-star'
                        : item.type === 'reward'
                          ? 'medal'
                          : 'bell'
                  }
                  size={18}
                  color={
                    item.type === 'joined'
                      ? circleColors.white
                      : item.type === 'reward'
                        ? circleColors.orange
                        : circleColors.green
                  }
                />
              </View>
            )}
            <View style={styles.cardBody}>
              <Text style={styles.cardTitle}>{item.title}</Text>
              <Text style={styles.cardSub}>{item.subtitle}</Text>
              <View style={styles.cardMeta}>
                {item.circleName ? (
                  <View style={styles.circleMetaRow}>
                    <MaterialCommunityIcons
                      name="account-group"
                      size={12}
                      color={circleColors.green}
                    />
                    <Text style={styles.circleMeta}>{item.circleName}</Text>
                  </View>
                ) : null}
                <Text style={styles.time}>{item.timeAgo}</Text>
              </View>
            </View>
            {item.badge ? (
              <View style={styles.thumb}>
                <MaterialCommunityIcons
                  name="food"
                  size={22}
                  color={circleColors.orange}
                />
                <View style={styles.thumbBadge}>
                  <Text style={styles.thumbBadgeText}>{item.badge}</Text>
                </View>
              </View>
            ) : null}
            {item.points ? (
              <View style={styles.pointsCard}>
                <MaterialCommunityIcons
                  name="star"
                  size={14}
                  color={circleColors.orange}
                />
                <Text style={styles.pointsText}>{item.points}</Text>
              </View>
            ) : null}
            <MaterialCommunityIcons
              name="chevron-right"
              size={18}
              color={circleColors.mutedSoft}
            />
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: circleColors.page },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: circleColors.white,
  },
  backBtn: { padding: 4, marginRight: 4 },
  title: {
    fontFamily: fonts.BOLD,
    fontSize: 22,
    color: circleColors.green,
  },
  titleUnderline: {
    width: 32,
    height: 3,
    borderRadius: 2,
    backgroundColor: circleColors.orange,
    marginTop: 4,
  },
  markRead: {
    color: circleColors.green,
    fontFamily: fonts.BOLD,
    fontSize: 12,
  },
  filters: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 8,
    backgroundColor: circleColors.white,
  },
  filterChip: {
    borderWidth: 1,
    borderColor: circleColors.border,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: circleColors.white,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  filterChipActive: {
    backgroundColor: circleColors.green,
    borderColor: circleColors.green,
  },
  filterText: { color: circleColors.muted, fontSize: 13 },
  filterTextActive: {
    color: circleColors.white,
    fontFamily: fonts.BOLD,
  },
  list: { padding: 12, paddingBottom: 24, gap: 10 },
  empty: {
    alignItems: 'center',
    paddingVertical: 48,
    gap: 8,
  },
  emptyTitle: {
    fontFamily: fonts.BOLD,
    color: circleColors.text,
    fontSize: 15,
  },
  emptySub: { color: circleColors.muted, fontSize: 12 },
  card: {
    flexDirection: 'row',
    gap: 10,
    borderWidth: 1,
    borderColor: circleColors.borderSoft,
    borderRadius: 16,
    padding: 12,
    backgroundColor: circleColors.white,
    alignItems: 'center',
  },
  cardUnread: { backgroundColor: circleColors.greenWash },
  avatarBadge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: circleColors.orange,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: circleColors.white,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: { flex: 1 },
  cardTitle: {
    fontFamily: fonts.BOLD,
    color: circleColors.green,
    fontSize: 13,
  },
  cardSub: {
    color: circleColors.muted,
    fontSize: 12,
    marginTop: 4,
    lineHeight: 16,
  },
  cardMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 6,
    alignItems: 'center',
  },
  circleMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  circleMeta: { color: circleColors.green, fontSize: 11, fontFamily: fonts.BOLD },
  time: { color: circleColors.mutedSoft, fontSize: 11 },
  thumb: {
    width: 54,
    height: 54,
    borderRadius: 12,
    backgroundColor: circleColors.redSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbBadge: {
    position: 'absolute',
    top: 4,
    left: 4,
    backgroundColor: circleColors.badgeRed,
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  thumbBadgeText: {
    color: circleColors.white,
    fontSize: 8,
    fontFamily: fonts.BOLD,
  },
  pointsCard: {
    backgroundColor: circleColors.orangeSoft,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 8,
    alignItems: 'center',
    gap: 2,
  },
  pointsText: {
    color: circleColors.orange,
    fontFamily: fonts.BOLD,
    fontSize: 10,
  },
});

export default CircleNotificationsScreen;
