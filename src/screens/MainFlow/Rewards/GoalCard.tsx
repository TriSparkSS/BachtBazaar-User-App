import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { colors, fonts } from '../../../helpers/styles';
import {
  formatActionTypeLabel,
  formatMilestoneDate,
  formatMilestoneStatusLabel,
  formatMilestoneTimeLeft,
  getMerchantDisplayName,
  getMilestoneBucket,
} from '../../../services/milestonesApi';
import { Milestone } from '../../../types/milestone';

type Props = {
  item: Milestone;
  onPress: () => void;
};

const statusTone = (item: Milestone) => {
  switch (getMilestoneBucket(item)) {
    case 'done':
      return { bg: colors.pastelGreen, text: colors.darkgreen };
    case 'cancelled':
      return { bg: '#FFE5E5', text: colors.red };
    case 'expired':
      return { bg: colors.searchBg, text: colors.mutedText };
    default:
      return { bg: colors.primarySoft, text: colors.primary };
  }
};

const GoalCard = ({ item, onPress }: Props) => {
  const tone = statusTone(item);
  const actionLabel = formatActionTypeLabel(item.actionType);
  const merchantName = getMerchantDisplayName(item);
  const timeLeft = formatMilestoneTimeLeft(item.expiresAt);
  const expires = formatMilestoneDate(item.expiresAt);

  return (
    <TouchableOpacity style={styles.card} activeOpacity={0.88} onPress={onPress}>
      <View style={styles.topRow}>
        <Text style={styles.title} numberOfLines={1}>
          {item.title}
        </Text>
        <View style={[styles.badge, { backgroundColor: tone.bg }]}>
          <Text style={[styles.badgeText, { color: tone.text }]}>
            {formatMilestoneStatusLabel(item)}
          </Text>
        </View>
      </View>

      <Text style={styles.meta}>
        {actionLabel} · {item.currentCount}/{item.targetCount}
      </Text>

      <View style={styles.merchantRow}>
        <MaterialCommunityIcons name="storefront-outline" size={16} color={colors.primary} />
        <Text style={styles.merchantText} numberOfLines={1}>
          {merchantName}
          {item.merchantPhone ? ` · ${item.merchantPhone}` : ''}
        </Text>
      </View>

      {item.rewardDescription ? (
        <View style={styles.rewardBox}>
          <MaterialCommunityIcons name="gift" size={16} color="#B45309" />
          <Text style={styles.rewardText} numberOfLines={1}>
            {item.rewardDescription}
          </Text>
        </View>
      ) : null}

      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${item.progressPercentage}%` }]} />
      </View>
      <Text style={styles.percent}>{item.progressPercentage}% complete</Text>

      <View style={styles.footer}>
        <Text style={styles.expires}>
          {expires ? `Expires: ${expires}` : 'No expiry'}
        </Text>
        {timeLeft ? <Text style={styles.timeLeft}>{timeLeft}</Text> : null}
      </View>
    </TouchableOpacity>
  );
};

export default GoalCard;

const cardShadow = Platform.select({
  ios: {
    shadowColor: '#1B2430',
    shadowOpacity: 0.07,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
  },
  android: { elevation: 2 },
  default: {},
});

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    ...cardShadow,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  title: {
    flex: 1,
    fontSize: 17,
    fontFamily: fonts.BOLD,
    color: colors.text,
  },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: {
    fontSize: 12,
    fontFamily: fonts.BOLD,
  },
  meta: {
    marginTop: 6,
    fontSize: 13,
    color: colors.mutedText,
  },
  merchantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  merchantText: {
    flex: 1,
    fontSize: 13,
    color: colors.text,
  },
  rewardBox: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFF6E5',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  rewardText: {
    flex: 1,
    fontSize: 13,
    fontFamily: fonts.BOLD,
    color: '#B45309',
  },
  progressTrack: {
    marginTop: 14,
    height: 6,
    borderRadius: 999,
    backgroundColor: colors.searchBg,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: colors.primary,
  },
  percent: {
    marginTop: 6,
    fontSize: 12,
    color: colors.mutedText,
  },
  footer: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  expires: {
    fontSize: 12,
    color: colors.mutedText,
  },
  timeLeft: {
    fontSize: 13,
    fontFamily: fonts.BOLD,
    color: colors.primary,
  },
});
