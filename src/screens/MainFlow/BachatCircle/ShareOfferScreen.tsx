import React, { useMemo, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
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
import { ALL_CONTACTS, MOCK_SHARED_OFFERS } from './mockData';
import { circleColors, circleShadow } from './theme';

const ShareOfferScreen = () => {
  const navigation =
    useNavigation<
      StackNavigationProp<MainStackParamList, 'BachatCircleShareOffer'>
    >();
  const route =
    useRoute<RouteProp<MainStackParamList, 'BachatCircleShareOffer'>>();
  const offer =
    MOCK_SHARED_OFFERS.find(o => o.id === route.params.offerId) ||
    MOCK_SHARED_OFFERS[0];

  const members = useMemo(
    () => ALL_CONTACTS.filter(c => c.registered),
    [],
  );
  const [entireCircle, setEntireCircle] = useState(false);
  const [selected, setSelected] = useState<Record<string, true>>({
    imran: true,
    papa: true,
    mama: true,
    sister: true,
  });

  const selectable = members.filter(m => !m.isYou);
  const selectedCount = entireCircle
    ? selectable.length
    : Object.keys(selected).length;

  const toggle = (id: string) => {
    setEntireCircle(false);
    setSelected(prev => {
      const next = { ...prev };
      if (next[id]) delete next[id];
      else next[id] = true;
      return next;
    });
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
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Share Offer to Circle</Text>
          <Text style={styles.headerSub}>
            Select members to share this offer.
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.offerCard, circleShadow.card]}>
          <View
            style={[styles.offerImage, { backgroundColor: offer.imageColor }]}
          >
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{offer.badge}</Text>
            </View>
            <MaterialCommunityIcons
              name="food"
              size={30}
              color={circleColors.orange}
            />
          </View>
          <View style={styles.offerInfo}>
            <Text style={styles.brand}>{offer.brand}</Text>
            <Text style={styles.offerTitle}>{offer.title}</Text>
            <View style={styles.metaRow}>
              <View style={styles.metaChip}>
                <MaterialCommunityIcons
                  name="map-marker-outline"
                  size={12}
                  color={circleColors.green}
                />
                <Text style={styles.meta}>{offer.distance}</Text>
              </View>
              <View style={styles.metaChip}>
                <MaterialCommunityIcons
                  name="clock-outline"
                  size={12}
                  color={circleColors.green}
                />
                <Text style={styles.meta}>Till {offer.validTill}</Text>
              </View>
              <View style={styles.metaChip}>
                <MaterialCommunityIcons
                  name="star"
                  size={12}
                  color={circleColors.star}
                />
                <Text style={styles.meta}>{offer.rating}</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={[styles.shareCard, circleShadow.soft]}>
          <Text style={styles.sectionLabel}>Share with</Text>
          <TouchableOpacity
            style={styles.row}
            onPress={() => {
              setEntireCircle(v => !v);
              if (!entireCircle) {
                setSelected({});
              }
            }}
          >
            <View style={styles.entireIcon}>
              <MaterialCommunityIcons
                name="account-group"
                size={20}
                color={circleColors.white}
              />
            </View>
            <View style={styles.rowText}>
              <Text style={styles.name}>Entire Circle</Text>
              <Text style={styles.phone}>
                Share with all {selectable.length} members.
              </Text>
            </View>
            <View
              style={[
                styles.checkbox,
                entireCircle && styles.checkboxChecked,
              ]}
            >
              {entireCircle ? (
                <MaterialCommunityIcons
                  name="check"
                  size={16}
                  color={circleColors.white}
                />
              ) : null}
            </View>
          </TouchableOpacity>

          <View style={styles.selectHeader}>
            <Text style={styles.selectLeft}>Select Members</Text>
            <Text style={styles.selectRight}>{selectedCount} Selected</Text>
          </View>

          {members.map(member => {
            if (member.isYou) {
              return (
                <View key={member.id} style={styles.row}>
                  <MemberAvatar
                    name={member.name}
                    initial={member.initial}
                    color={member.avatarColor}
                    size={44}
                  />
                  <View style={styles.rowText}>
                    <Text style={styles.name}>You ({member.name})</Text>
                    <Text style={styles.phone}>{member.phone}</Text>
                  </View>
                  <View style={styles.ownerBadge}>
                    <Text style={styles.ownerText}>Owner</Text>
                  </View>
                </View>
              );
            }
            const checked = entireCircle || Boolean(selected[member.id]);
            return (
              <TouchableOpacity
                key={member.id}
                style={styles.row}
                onPress={() => toggle(member.id)}
              >
                <MemberAvatar
                  name={member.name}
                  initial={member.initial}
                  color={member.avatarColor}
                  size={44}
                />
                <View style={styles.rowText}>
                  <Text style={styles.name}>{member.name}</Text>
                  <Text style={styles.phone}>{member.phone}</Text>
                </View>
                <View
                  style={[styles.checkbox, checked && styles.checkboxChecked]}
                >
                  {checked ? (
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
        </View>

        <View style={styles.privacyBox}>
          <MaterialCommunityIcons
            name="shield-check"
            size={18}
            color={circleColors.green}
          />
          <View style={{ flex: 1 }}>
            <Text style={styles.privacyTitle}>Private Sharing</Text>
            <Text style={styles.privacyBody}>
              Only selected circle members will see this offer in Bachat Circle
              feed.
            </Text>
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.shareBtn,
            circleShadow.cta,
            selectedCount === 0 && styles.shareDisabled,
          ]}
          disabled={selectedCount === 0}
          onPress={() => {
            showAppAlert(
              'Offer shared',
              `Shared with ${selectedCount} member${selectedCount === 1 ? '' : 's'}.`,
            );
            navigation.goBack();
          }}
        >
          <MaterialCommunityIcons
            name="send"
            size={18}
            color={circleColors.white}
          />
          <Text style={styles.shareText}>Share Offer ({selectedCount})</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: circleColors.page },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: circleColors.white,
  },
  backBtn: { padding: 4 },
  headerTitle: {
    fontFamily: fonts.BOLD,
    fontSize: 17,
    color: circleColors.green,
  },
  headerSub: { color: circleColors.muted, fontSize: 12, marginTop: 2 },
  content: { padding: 16, paddingBottom: 24 },
  offerCard: {
    flexDirection: 'row',
    gap: 12,
    borderWidth: 1,
    borderColor: circleColors.borderSoft,
    borderRadius: 16,
    padding: 12,
    marginBottom: 14,
    backgroundColor: circleColors.white,
  },
  offerImage: {
    width: 78,
    height: 78,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: 6,
    left: 6,
    backgroundColor: circleColors.badgeRed,
    borderRadius: 5,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  badgeText: {
    color: circleColors.white,
    fontSize: 9,
    fontFamily: fonts.BOLD,
  },
  offerInfo: { flex: 1 },
  brand: { fontFamily: fonts.BOLD, color: circleColors.text, fontSize: 15 },
  offerTitle: { color: circleColors.muted, fontSize: 12, marginTop: 4 },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: circleColors.chipGray,
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 4,
  },
  meta: { color: circleColors.muted, fontSize: 10, fontFamily: fonts.BOLD },
  shareCard: {
    backgroundColor: circleColors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: circleColors.borderSoft,
    padding: 14,
  },
  sectionLabel: {
    fontFamily: fonts.BOLD,
    color: circleColors.text,
    marginBottom: 8,
    fontSize: 15,
  },
  entireIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: circleColors.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 11,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: circleColors.borderSoft,
  },
  rowText: { flex: 1 },
  name: { fontFamily: fonts.BOLD, color: circleColors.text },
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
  selectHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 14,
    marginBottom: 4,
  },
  selectLeft: { color: circleColors.green, fontFamily: fonts.BOLD },
  selectRight: {
    color: circleColors.green,
    fontSize: 12,
    fontFamily: fonts.BOLD,
  },
  ownerBadge: {
    backgroundColor: circleColors.greenSoft,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  ownerText: {
    color: circleColors.green,
    fontFamily: fonts.BOLD,
    fontSize: 12,
  },
  privacyBox: {
    marginTop: 16,
    backgroundColor: circleColors.greenSoft,
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    gap: 10,
  },
  privacyTitle: {
    color: circleColors.green,
    fontFamily: fonts.BOLD,
    marginBottom: 2,
  },
  privacyBody: { color: circleColors.green, fontSize: 12, lineHeight: 17 },
  footer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: circleColors.borderSoft,
    backgroundColor: circleColors.white,
  },
  shareBtn: {
    backgroundColor: circleColors.green,
    borderRadius: 16,
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  shareDisabled: { opacity: 0.5 },
  shareText: {
    color: circleColors.white,
    fontFamily: fonts.BOLD,
    fontSize: 15,
  },
});

export default ShareOfferScreen;
