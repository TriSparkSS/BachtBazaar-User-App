import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { colors, fonts } from '../helpers/styles';
import { formatMilestoneTimeLeft } from '../services/milestonesApi';
import { Milestone } from '../types/milestone';

const COLLAPSED_COUNT = 4;

type Accent = {
  color: string;
  soft: string;
  icon: string;
};

const accentForAction = (actionType: string, index: number): Accent => {
  const type = actionType.trim().toUpperCase();
  if (type.includes('PRODUCT') || type.includes('GIFT')) {
    return { color: colors.darkgreen, soft: colors.pastelGreen, icon: 'gift-outline' };
  }
  if (type.includes('BANNER') || type.includes('IMAGE') || type.includes('CREATE')) {
    return { color: colors.primary, soft: colors.pastelBlue, icon: 'image-outline' };
  }
  if (type.includes('CLAIM') || type.includes('REDEEM') || type.includes('OFFER')) {
    return { color: colors.primary, soft: colors.primarySoft, icon: 'ticket-percent-outline' };
  }
  return index % 2 === 0
    ? { color: colors.primary, soft: colors.pastelBlue, icon: 'flag-checkered' }
    : { color: colors.darkgreen, soft: colors.pastelGreen, icon: 'trophy-outline' };
};

type Props = {
  milestones: Milestone[];
  isLoading?: boolean;
  onPressViewAll?: () => void;
  onPressMilestone?: (milestone: Milestone) => void;
};

const RewardProgressSection = ({
  milestones,
  isLoading,
  onPressViewAll,
  onPressMilestone,
}: Props) => {
  const [expanded, setExpanded] = useState(false);

  const completedCount = useMemo(
    () => milestones.filter(m => m.isCompleted || m.status === 'COMPLETED').length,
    [milestones],
  );

  const visible = useMemo(() => {
    if (expanded || milestones.length <= COLLAPSED_COUNT) {
      return milestones;
    }
    return milestones.slice(0, COLLAPSED_COUNT);
  }, [expanded, milestones]);

  const canToggle = milestones.length > COLLAPSED_COUNT;

  if (!isLoading && milestones.length === 0) {
    return (
      <View style={styles.wrap}>
        <View style={styles.headerRow}>
          <View style={styles.headerText}>
            <Text style={styles.title}>Rewards</Text>
            <Text style={styles.subtitle}>Milestone tasks from merchants</Text>
          </View>
          {onPressViewAll ? (
            <TouchableOpacity activeOpacity={0.8} onPress={onPressViewAll}>
              <Text style={styles.viewAll}>View all</Text>
            </TouchableOpacity>
          ) : null}
        </View>
        <TouchableOpacity
          style={styles.card}
          activeOpacity={onPressViewAll ? 0.85 : 1}
          disabled={!onPressViewAll}
          onPress={onPressViewAll}
        >
          <View style={styles.row}>
            <View style={[styles.iconBox, { backgroundColor: colors.primarySoft }]}>
              <MaterialCommunityIcons
                name="trophy-outline"
                size={22}
                color={colors.primary}
              />
            </View>
            <View style={styles.body}>
              <Text style={styles.goalTitle}>Open Rewards</Text>
              <Text style={styles.meta} numberOfLines={2}>
                See goals assigned by merchants and track your progress
              </Text>
            </View>
            <MaterialCommunityIcons
              name="chevron-right"
              size={22}
              color={colors.mutedText}
            />
          </View>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.headerRow}>
        <View style={styles.headerText}>
          <Text style={styles.title}>Rewards</Text>
          <Text style={styles.subtitle}>
            {completedCount}/{milestones.length} completed
          </Text>
        </View>
        {onPressViewAll ? (
          <TouchableOpacity activeOpacity={0.8} onPress={onPressViewAll}>
            <Text style={styles.viewAll}>View all</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      <View style={styles.card}>
        {isLoading && milestones.length === 0 ? (
          <View style={styles.loading}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : (
          visible.map((item, index) => {
            const accent = accentForAction(item.actionType, index);
            const timeLeft = formatMilestoneTimeLeft(item.expiresAt);
            const metaParts = [
              `${item.currentCount}/${item.targetCount}`,
              item.rewardDescription || undefined,
              timeLeft || undefined,
            ].filter(Boolean);

            return (
              <TouchableOpacity
                key={item.id}
                style={[
                  styles.row,
                  index < visible.length - 1 && styles.rowBorder,
                ]}
                activeOpacity={onPressMilestone ? 0.82 : 1}
                disabled={!onPressMilestone}
                onPress={() => onPressMilestone?.(item)}
              >
                <View style={[styles.iconBox, { backgroundColor: accent.soft }]}>
                  <MaterialCommunityIcons
                    name={accent.icon}
                    size={22}
                    color={accent.color}
                  />
                </View>

                <View style={styles.body}>
                  <Text style={styles.goalTitle} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <Text style={styles.meta} numberOfLines={1}>
                    {metaParts.join(' · ')}
                  </Text>
                  <View style={styles.progressTrack}>
                    <View
                      style={[
                        styles.progressFill,
                        {
                          width: `${item.progressPercentage}%`,
                          backgroundColor: accent.color,
                        },
                      ]}
                    />
                  </View>
                </View>

                <Text style={[styles.percent, { color: accent.color }]}>
                  {item.progressPercentage}%
                </Text>
              </TouchableOpacity>
            );
          })
        )}

        {canToggle ? (
          <TouchableOpacity
            style={styles.toggleBtn}
            activeOpacity={0.8}
            onPress={() => setExpanded(prev => !prev)}
          >
            <Text style={styles.toggleText}>
              {expanded ? 'Show Less' : 'Show More'}
            </Text>
            <MaterialCommunityIcons
              name={expanded ? 'chevron-up' : 'chevron-down'}
              size={18}
              color={colors.primary}
            />
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
};

export default RewardProgressSection;

const styles = StyleSheet.create({
  wrap: {
    marginTop: 8,
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  headerText: {
    flex: 1,
  },
  viewAll: {
    fontSize: 13,
    color: colors.primary,
    fontFamily: fonts.BOLD,
    marginTop: 4,
  },
  title: {
    fontSize: 18,
    fontFamily: fonts.BOLD,
    color: colors.text,
  },
  subtitle: {
    marginTop: 2,
    fontSize: 13,
    color: colors.mutedText,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderGray,
    overflow: 'hidden',
  },
  loading: {
    paddingVertical: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 12,
  },
  rowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderGray,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flex: 1,
    minWidth: 0,
  },
  goalTitle: {
    fontSize: 15,
    fontFamily: fonts.BOLD,
    color: colors.text,
  },
  meta: {
    marginTop: 2,
    fontSize: 12,
    color: colors.mutedText,
  },
  progressTrack: {
    marginTop: 8,
    height: 5,
    borderRadius: 999,
    backgroundColor: colors.searchBg,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
  },
  percent: {
    fontSize: 14,
    fontFamily: fonts.BOLD,
    minWidth: 40,
    textAlign: 'right',
  },
  toggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderGray,
  },
  toggleText: {
    fontSize: 14,
    fontFamily: fonts.BOLD,
    color: colors.primary,
  },
});
