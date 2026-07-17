import React, { useMemo, useState } from 'react';
import {
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { colors, fonts } from '../../../helpers/styles';
import { CreateRequestShopOffer } from '../../../types/createRequest';
import { showAppAlert } from '../../../services/appAlert';

type CreateRequestResultsViewProps = {
  product: string;
  bestPrice: number;
  marketPrice: number;
  youSave: number;
  offers: CreateRequestShopOffer[];
  onBack: () => void;
};

type FilterTab = 'price' | 'near' | 'newest';

const PRIMARY = colors.primary;
const GREEN = '#1B8A3E';
const SAVE = '#E65A24';

const CreateRequestResultsView: React.FC<CreateRequestResultsViewProps> = ({
  product,
  bestPrice,
  marketPrice,
  youSave,
  offers,
  onBack,
}) => {
  const [filter, setFilter] = useState<FilterTab>('price');

  const sortedOffers = useMemo(() => {
    const next = [...offers];
    if (filter === 'near') {
      return next.sort((a, b) => a.distanceKm - b.distanceKm);
    }
    if (filter === 'newest') {
      return next;
    }
    return next.sort((a, b) => a.price - b.price);
  }, [offers, filter]);

  const avgPrice = useMemo(() => {
    if (!offers.length) {
      return marketPrice;
    }
    const sum = offers.reduce((total, item) => total + item.price, 0);
    return Math.round(sum / offers.length);
  }, [offers, marketPrice]);

  const handleCall = (offer: CreateRequestShopOffer) => {
    if (!offer.phone) {
      showAppAlert('Call unavailable', 'Phone number is not available for this shop.');
      return;
    }
    Linking.openURL(`tel:${offer.phone}`);
  };

  const handleChat = (offer: CreateRequestShopOffer) => {
    showAppAlert('Chat', `Chat with ${offer.shopName} will be available soon.`, [{ text: 'OK' }]);
  };

  return (
    <View style={styles.root}>
      <View style={styles.bgBlob} />

      <SafeAreaView edges={['top']} style={styles.headerBlock}>
        <View style={styles.navRow}>
          <TouchableOpacity onPress={onBack} style={styles.backHit} hitSlop={10}>
            <MaterialCommunityIcons name="arrow-left" size={22} color={colors.text} />
          </TouchableOpacity>
          <View style={styles.navCenter}>
            <Text style={styles.navProduct} numberOfLines={1}>
              {product}
            </Text>
            <Text style={styles.navSub}>{offers.length} offers received</Text>
          </View>
          <View style={styles.backHit} />
        </View>

        <View style={styles.summaryCard}>
          <View style={styles.summaryCol}>
            <Text style={styles.summaryLabel}>Best Price</Text>
            <Text style={[styles.summaryValue, { color: GREEN }]}>
              ₹{bestPrice.toLocaleString('en-IN')}
            </Text>
          </View>
          <View style={styles.vLine} />
          <View style={styles.summaryCol}>
            <Text style={styles.summaryLabel}>Avg Price</Text>
            <Text style={styles.summaryValue}>₹{avgPrice.toLocaleString('en-IN')}</Text>
          </View>
          <View style={styles.vLine} />
          <View style={styles.summaryCol}>
            <Text style={styles.summaryLabel}>You Save</Text>
            <Text style={[styles.summaryValue, { color: SAVE }]}>
              ₹{youSave.toLocaleString('en-IN')}
            </Text>
          </View>
        </View>
      </SafeAreaView>

      <View style={styles.filterRow}>
        {(
          [
            { id: 'price' as const, label: 'Lowest Price' },
            { id: 'near' as const, label: 'Nearest' },
            { id: 'newest' as const, label: 'Most Recent' },
          ] as const
        ).map(tab => {
          const active = filter === tab.id;
          return (
            <TouchableOpacity
              key={tab.id}
              style={[styles.filterPill, active && styles.filterPillOn]}
              onPress={() => setFilter(tab.id)}
              activeOpacity={0.85}>
              <Text style={[styles.filterText, active && styles.filterTextOn]}>{tab.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}>
        {sortedOffers.map(offer => {
          const saveBadge = offer.badges?.find(b => b.toLowerCase().includes('save'));
          return (
            <View key={offer.id} style={styles.card}>
              <View style={styles.cardTop}>
                <View style={styles.cardTopLeft}>
                  <Text style={styles.shopName}>{offer.shopName}</Text>
                  <View style={styles.metaRow}>
                    <MaterialCommunityIcons name="star" size={13} color="#F5A623" />
                    <Text style={styles.metaText}>{offer.rating.toFixed(1)}</Text>
                    <Text style={styles.metaDot}>·</Text>
                    <Text style={styles.metaText}>{offer.distanceKm.toFixed(1)} km</Text>
                  </View>
                </View>
                <Text style={styles.price}>₹{offer.price.toLocaleString('en-IN')}</Text>
              </View>

              <View style={styles.badges}>
                {saveBadge ? (
                  <View style={styles.saveChip}>
                    <Text style={styles.saveChipText}>{saveBadge}</Text>
                  </View>
                ) : null}
                {offer.perks.slice(0, 2).map(perk => (
                  <View key={perk} style={styles.perkChip}>
                    <Text style={styles.perkChipText}>{perk}</Text>
                  </View>
                ))}
                {(offer.badges ?? [])
                  .filter(b => !b.toLowerCase().includes('save'))
                  .map(badge => (
                    <View key={badge} style={styles.perkChip}>
                      <Text style={styles.perkChipText}>{badge}</Text>
                    </View>
                  ))}
              </View>

              <Text style={styles.responded}>{offer.responseTime}</Text>

              <View style={styles.actions}>
                <TouchableOpacity
                  style={styles.callBtn}
                  activeOpacity={0.9}
                  onPress={() => handleCall(offer)}>
                  <MaterialCommunityIcons name="phone" size={16} color={colors.white} />
                  <Text style={styles.callText}>Call</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.chatBtn}
                  activeOpacity={0.9}
                  onPress={() => handleChat(offer)}>
                  <MaterialCommunityIcons name="message-outline" size={16} color={PRIMARY} />
                  <Text style={styles.chatText}>Chat</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
};

export default CreateRequestResultsView;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F5F7FB',
  },
  bgBlob: {
    position: 'absolute',
    top: -60,
    right: -40,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: colors.primarySoft,
  },
  flex: {
    flex: 1,
  },
  headerBlock: {
    paddingBottom: 4,
  },
  navRow: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  backHit: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navCenter: {
    flex: 1,
    alignItems: 'center',
  },
  navProduct: {
    fontSize: 18,
    color: colors.text,
    fontFamily: fonts.BOLD,
  },
  navSub: {
    marginTop: 2,
    fontSize: 12,
    color: '#8A93A6',
    fontFamily: fonts.BOLD,
  },
  summaryCard: {
    marginHorizontal: 16,
    marginTop: 8,
    backgroundColor: colors.white,
    borderRadius: 20,
    paddingVertical: 18,
    paddingHorizontal: 6,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#1B2430',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 4,
  },
  summaryCol: {
    flex: 1,
    alignItems: 'center',
  },
  vLine: {
    width: 1,
    height: 40,
    backgroundColor: '#E8ECF3',
  },
  summaryLabel: {
    fontSize: 11,
    color: '#8A93A6',
    fontFamily: fonts.BOLD,
    marginBottom: 6,
  },
  summaryValue: {
    fontSize: 16,
    color: colors.text,
    fontFamily: fonts.BOLD,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  filterPill: {
    borderRadius: 20,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: '#E4E8F0',
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  filterPillOn: {
    backgroundColor: PRIMARY,
    borderColor: PRIMARY,
  },
  filterText: {
    fontSize: 12,
    color: '#7A8499',
    fontFamily: fonts.BOLD,
  },
  filterTextOn: {
    color: colors.white,
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 28,
    gap: 14,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 16,
    shadowColor: '#1B2430',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.07,
    shadowRadius: 14,
    elevation: 3,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  cardTopLeft: {
    flex: 1,
  },
  shopName: {
    fontSize: 16,
    color: colors.text,
    fontFamily: fonts.BOLD,
  },
  metaRow: {
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: '#8A93A6',
    fontFamily: fonts.BOLD,
  },
  metaDot: {
    color: '#C5CAD6',
    marginHorizontal: 2,
  },
  price: {
    fontSize: 22,
    color: GREEN,
    fontFamily: fonts.BOLD,
    letterSpacing: -0.3,
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 14,
  },
  saveChip: {
    backgroundColor: '#FFEDE6',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  saveChipText: {
    fontSize: 11,
    color: SAVE,
    fontFamily: fonts.BOLD,
  },
  perkChip: {
    backgroundColor: '#F3F5F9',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  perkChipText: {
    fontSize: 11,
    color: '#5B6475',
    fontFamily: fonts.BOLD,
  },
  responded: {
    marginTop: 12,
    fontSize: 11,
    color: '#9AA3B2',
    fontFamily: fonts.BOLD,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  callBtn: {
    flex: 1,
    height: 46,
    borderRadius: 14,
    backgroundColor: '#22A45A',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  callText: {
    color: colors.white,
    fontSize: 14,
    fontFamily: fonts.BOLD,
  },
  chatBtn: {
    flex: 1,
    height: 46,
    borderRadius: 14,
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: PRIMARY,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  chatText: {
    color: PRIMARY,
    fontSize: 14,
    fontFamily: fonts.BOLD,
  },
});
