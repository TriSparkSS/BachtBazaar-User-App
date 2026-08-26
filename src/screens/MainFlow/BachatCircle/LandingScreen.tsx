import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  BackHandler,
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
import { fonts, colors } from '../../../helpers/styles';
import { useAppContext } from '../../../context/AppContext';
import { MainStackParamList } from '../../../navigation/types';
import { showAppAlert } from '../../../services/appAlert';
import {
  BachatCircleDto,
  CircleInvitationDto,
  bachatCircleApi,
} from '../../../services/bachatCircleApi';
import { circleStorage } from './circleStorage';
import { circleColors, circleShadow } from './theme';
import { exitBachatCircleToHome } from './circleNav';

const FEATURES = [
  {
    icon: 'account-group',
    color: circleColors.green,
    soft: circleColors.greenSoft,
    title: 'Apna trusted circle banayein',
    subtitle: 'Family, friends aur close ones ko add karein',
  },
  {
    icon: 'share-variant',
    color: circleColors.orange,
    soft: circleColors.orangeSoft,
    title: 'Best offers share karein',
    subtitle: 'Apne area ke dhamakedar offers share karein',
  },
  {
    icon: 'tag',
    color: circleColors.green,
    soft: circleColors.greenSoft,
    title: 'Sabko mile extra bachat',
    subtitle: 'Aapke circle wale bhi paayen best deals',
  },
];

const HERO_SIZE = 220;
const RING_RADIUS = 88;
const AVATAR_SIZE = 46;
const HERO_AVATARS = [
  { color: colors.primarySoft, initial: 'A' },
  { color: colors.pastelBlue, initial: 'P' },
  { color: colors.pastelPurple, initial: 'M' },
  { color: colors.pastelOrange, initial: 'I' },
  { color: colors.pastelGreen, initial: 'S' },
];

const AVATAR_COLORS = [
  colors.pastelBlue,
  colors.pastelPurple,
  colors.pastelOrange,
  colors.pastelGreen,
  colors.pastelYellow,
  colors.primarySoft,
];

const formatRole = (role?: string) => {
  const value = role?.trim();
  if (!value) {
    return undefined;
  }
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
};

const LandingScreen = () => {
  const navigation =
    useNavigation<StackNavigationProp<MainStackParamList, 'BachatCircle'>>();
  const { authToken } = useAppContext();
  const [checking, setChecking] = useState(true);
  const [circles, setCircles] = useState<BachatCircleDto[]>([]);
  const [invitations, setInvitations] = useState<CircleInvitationDto[]>([]);
  const [respondingId, setRespondingId] = useState<string | null>(null);
  const hasLoadedRef = useRef(false);

  const avatarPositions = useMemo(() => {
    const center = HERO_SIZE / 2;
    return HERO_AVATARS.map((item, index) => {
      const angle = ((index * 72 - 90) * Math.PI) / 180;
      const left = center + RING_RADIUS * Math.cos(angle) - AVATAR_SIZE / 2;
      const top = center + RING_RADIUS * Math.sin(angle) - AVATAR_SIZE / 2;
      return { ...item, left, top };
    });
  }, []);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      (async () => {
        setChecking(!hasLoadedRef.current);
        const token = authToken?.trim();
        const local = await circleStorage.load();
        let nextCircles: BachatCircleDto[] = [];
        let nextInvites: CircleInvitationDto[] = [];

        if (token) {
          // First: my-circles. Empty result means landing + invitations, not GET /bachatcircle.
          nextCircles = await bachatCircleApi.listMyCircles(token);
          if (!alive) {
            return;
          }
          nextInvites = await bachatCircleApi.myInvitations(token);
        } else if (local.created && local.circleId) {
          nextCircles = [
            {
              id: local.circleId,
              name: local.name || 'My Circle',
              description: local.description,
              memberCount: local.memberIds.length,
              members: [],
              pendingInvitations: [],
            },
          ];
        }

        if (!alive) {
          return;
        }
        setCircles(nextCircles);
        setInvitations(nextInvites);
        hasLoadedRef.current = true;
        setChecking(false);
      })();
      return () => {
        alive = false;
      };
    }, [authToken]),
  );

  useFocusEffect(
    useCallback(() => {
      const onHardwareBack = () => {
        exitBachatCircleToHome(navigation);
        return true;
      };
      const sub = BackHandler.addEventListener('hardwareBackPress', onHardwareBack);
      return () => sub.remove();
    }, [navigation]),
  );

  const onRespondInvite = async (
    invite: CircleInvitationDto,
    action: 'ACCEPT' | 'REJECT',
  ) => {
    const token = authToken?.trim();
    if (!token) {
      return;
    }
    setRespondingId(invite.id);
    try {
      await bachatCircleApi.respondInvitation(token, invite.id, action);
      if (action === 'ACCEPT') {
        await circleStorage.save({
          created: true,
          circleId: invite.circleId,
          name: invite.circleName,
          category: 'Friends',
          description: invite.circleDescription,
          memberIds: [],
          pendingInviteIds: [],
        });
        navigation.navigate('BachatCircleFeed', { circleId: invite.circleId });
        return;
      }
      setInvitations(prev => prev.filter(item => item.id !== invite.id));
      showAppAlert('Invite declined', 'Invitation rejected.');
    } catch (error) {
      showAppAlert(
        'Could not respond',
        error instanceof Error ? error.message : 'Please try again.',
      );
    } finally {
      setRespondingId(null);
    }
  };

  const onBack = () => {
    exitBachatCircleToHome(navigation);
  };

  const renderInvitations = () =>
    invitations.length > 0 ? (
      <View style={styles.inviteBox}>
        <Text style={styles.inviteTitle}>Pending invitations</Text>
        {invitations.map(invite => (
          <View key={invite.id} style={styles.inviteCard}>
            <Text style={styles.inviteName}>{invite.circleName}</Text>
            <Text style={styles.inviteMeta}>
              From {invite.invitedByName || 'a friend'}
              {invite.memberCount != null
                ? ` · ${invite.memberCount} members`
                : ''}
            </Text>
            <View style={styles.inviteActions}>
              <TouchableOpacity
                style={styles.acceptBtn}
                disabled={respondingId === invite.id}
                onPress={() => {
                  void onRespondInvite(invite, 'ACCEPT');
                }}
              >
                {respondingId === invite.id ? (
                  <ActivityIndicator color={circleColors.white} size="small" />
                ) : (
                  <Text style={styles.acceptText}>Accept</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.rejectBtn}
                disabled={respondingId === invite.id}
                onPress={() => {
                  void onRespondInvite(invite, 'REJECT');
                }}
              >
                <Text style={styles.rejectText}>Decline</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </View>
    ) : null;

  const renderCreateButton = (label: string) => (
    <TouchableOpacity
      style={[styles.cta, circleShadow.cta]}
      activeOpacity={0.9}
      onPress={() => navigation.navigate('BachatCircleCreate')}
    >
      <MaterialCommunityIcons
        name="account-multiple-plus"
        size={22}
        color={circleColors.white}
      />
      <Text style={styles.ctaText}>{label}</Text>
    </TouchableOpacity>
  );

  if (checking) {
    return (
      <SafeAreaView style={[styles.safe, styles.loading]} edges={['top']}>
        <ActivityIndicator color={circleColors.green} />
      </SafeAreaView>
    );
  }

  if (circles.length > 0) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.listHeader}>
          <TouchableOpacity
            onPress={onBack}
            style={styles.listBackBtn}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <MaterialCommunityIcons
              name="chevron-left"
              size={28}
              color={circleColors.green}
            />
          </TouchableOpacity>
          <View style={styles.listTitleRow}>
            <Text style={styles.listTitleGreen}>Bachat </Text>
            <Text style={styles.listTitleOrange}>Circle</Text>
          </View>
          <View style={styles.listHeaderSpacer} />
        </View>

        <ScrollView
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        >
          {renderInvitations()}

          <Text style={styles.sectionTitle}>Your circles</Text>
          {circles.map((circle, index) => {
            const role = formatRole(circle.myRole);
            return (
              <TouchableOpacity
                key={circle.id}
                style={styles.circleCard}
                activeOpacity={0.85}
                onPress={() =>
                  navigation.navigate('BachatCircleFeed', { circleId: circle.id })
                }
              >
                <View
                  style={[
                    styles.circleAvatar,
                    {
                      backgroundColor: AVATAR_COLORS[index % AVATAR_COLORS.length],
                    },
                  ]}
                >
                  <Text style={styles.circleAvatarText}>
                    {(circle.name || 'C').charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.circleInfo}>
                  <Text style={styles.circleName} numberOfLines={1}>
                    {circle.name}
                  </Text>
                  <Text style={styles.circleMeta}>
                    {circle.memberCount}{' '}
                    {circle.memberCount === 1 ? 'member' : 'members'}
                    {role ? ` · ${role}` : ''}
                  </Text>
                </View>
                <MaterialCommunityIcons
                  name="chevron-right"
                  size={22}
                  color={circleColors.muted}
                />
              </TouchableOpacity>
            );
          })}

          {renderCreateButton('Create new circle')}
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <TouchableOpacity
        onPress={onBack}
        style={styles.backBtn}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <MaterialCommunityIcons
          name="chevron-left"
          size={28}
          color={circleColors.green}
        />
      </TouchableOpacity>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.titleRow}>
          <Text style={styles.titleGreen}>Bachat </Text>
          <Text style={styles.titleOrange}>Circle</Text>
          <View style={styles.newPill}>
            <Text style={styles.newPillText}>New</Text>
          </View>
        </View>

        <Text style={styles.subtitle}>
          Apne circle ke saath best offers share karein aur zyada bachat
          karein!
        </Text>

        <View style={styles.hero}>
          <View style={styles.heroRing} />
          {avatarPositions.map(item => (
            <View
              key={`${item.initial}-${item.left}`}
              style={[
                styles.heroAvatar,
                {
                  backgroundColor: item.color,
                  top: item.top,
                  left: item.left,
                },
              ]}
            >
              <Text style={styles.heroAvatarText}>{item.initial}</Text>
            </View>
          ))}

          <View style={[styles.heroHeart, { top: 58, left: 52 }]}>
            <MaterialCommunityIcons
              name="heart"
              size={11}
              color={circleColors.orangeMid}
            />
          </View>
          <View style={[styles.heroHeart, { top: 52, right: 48 }]}>
            <MaterialCommunityIcons
              name="heart"
              size={10}
              color={circleColors.orange}
            />
          </View>
          <View style={[styles.heroHeart, { bottom: 62, left: 72 }]}>
            <MaterialCommunityIcons
              name="heart"
              size={9}
              color={circleColors.orangeMid}
            />
          </View>

          <View style={styles.heroBagWrap}>
            <MaterialCommunityIcons
              name="shopping"
              size={72}
              color={circleColors.orange}
            />
            <View style={styles.percentBadge}>
              <Text style={styles.percentText}>%</Text>
            </View>
            <View style={[styles.spark, styles.sparkTL]} />
            <View style={[styles.spark, styles.sparkTR]} />
            <View style={[styles.spark, styles.sparkBL]} />
            <View style={[styles.spark, styles.sparkBR]} />
          </View>
        </View>

        <View style={styles.features}>
          {FEATURES.map(item => (
            <View key={item.title} style={styles.featureRow}>
              <View
                style={[styles.featureIcon, { backgroundColor: item.soft }]}
              >
                <MaterialCommunityIcons
                  name={item.icon}
                  size={22}
                  color={item.color}
                />
              </View>
              <View style={styles.featureText}>
                <Text style={styles.featureTitle}>{item.title}</Text>
                <Text style={styles.featureSubtitle}>{item.subtitle}</Text>
              </View>
            </View>
          ))}
        </View>

        {renderInvitations()}

        {renderCreateButton('Create Your Bachat Circle')}

        <TouchableOpacity
          onPress={() =>
            showAppAlert(
              'How it works?',
              '1. Create your private Bachat Circle\n2. Add family, friends aur close ones\n3. Share local offers so everyone gets extra bachat',
            )
          }
        >
          <Text style={styles.howLink}>How it works?</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: circleColors.cream },
  loading: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  inviteBox: {
    width: '100%',
    marginBottom: 16,
  },
  inviteTitle: {
    alignSelf: 'flex-start',
    fontSize: 15,
    fontFamily: fonts.BOLD,
    color: circleColors.text,
    marginBottom: 8,
  },
  inviteCard: {
    width: '100%',
    backgroundColor: circleColors.white,
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: circleColors.border,
  },
  inviteName: {
    fontSize: 15,
    fontFamily: fonts.BOLD,
    color: circleColors.text,
  },
  inviteMeta: {
    fontSize: 12,
    color: circleColors.muted,
    marginTop: 2,
    marginBottom: 10,
  },
  inviteActions: {
    flexDirection: 'row',
    gap: 8,
  },
  acceptBtn: {
    flex: 1,
    height: 40,
    borderRadius: 10,
    backgroundColor: circleColors.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  acceptText: {
    color: circleColors.white,
    fontFamily: fonts.BOLD,
  },
  rejectBtn: {
    flex: 1,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: circleColors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rejectText: {
    color: circleColors.text,
    fontFamily: fonts.BOLD,
  },
  backBtn: {
    position: 'absolute',
    top: 8,
    left: 8,
    zIndex: 2,
    padding: 4,
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 36,
    paddingBottom: 32,
    alignItems: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    marginBottom: 10,
  },
  titleGreen: {
    fontSize: 30,
    fontFamily: fonts.BOLD,
    color: circleColors.green,
  },
  titleOrange: {
    fontSize: 30,
    fontFamily: fonts.BOLD,
    color: circleColors.orange,
  },
  newPill: {
    marginLeft: 8,
    backgroundColor: circleColors.orange,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  newPillText: {
    color: circleColors.white,
    fontSize: 11,
    fontFamily: fonts.BOLD,
    letterSpacing: 0.3,
  },
  subtitle: {
    color: circleColors.muted,
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
    paddingHorizontal: 8,
    marginBottom: 8,
  },
  hero: {
    width: HERO_SIZE,
    height: HERO_SIZE,
    marginVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroRing: {
    position: 'absolute',
    width: RING_RADIUS * 2,
    height: RING_RADIUS * 2,
    borderRadius: RING_RADIUS,
    borderWidth: 1.5,
    borderColor: circleColors.greenBorder,
    borderStyle: 'dashed',
  },
  heroBagWrap: {
    width: 88,
    height: 88,
    alignItems: 'center',
    justifyContent: 'center',
  },
  percentBadge: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: circleColors.orange,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: circleColors.white,
  },
  percentText: {
    color: circleColors.white,
    fontFamily: fonts.BOLD,
    fontSize: 13,
  },
  spark: {
    position: 'absolute',
    width: 8,
    height: 2,
    borderRadius: 1,
    backgroundColor: circleColors.orangeMid,
  },
  sparkTL: { top: 10, left: 6, transform: [{ rotate: '-35deg' }] },
  sparkTR: { top: 10, right: 6, transform: [{ rotate: '35deg' }] },
  sparkBL: { bottom: 14, left: 4, transform: [{ rotate: '35deg' }] },
  sparkBR: { bottom: 14, right: 4, transform: [{ rotate: '-35deg' }] },
  heroAvatar: {
    position: 'absolute',
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2.5,
    borderColor: circleColors.white,
  },
  heroAvatarText: {
    fontFamily: fonts.BOLD,
    color: circleColors.green,
    fontSize: 15,
  },
  heroHeart: {
    position: 'absolute',
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  features: {
    width: '100%',
    marginTop: 8,
    marginBottom: 8,
  },
  featureRow: {
    flexDirection: 'row',
    gap: 14,
    marginBottom: 16,
    alignItems: 'center',
  },
  featureIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureText: { flex: 1 },
  featureTitle: {
    fontFamily: fonts.BOLD,
    color: circleColors.text,
    fontSize: 15,
  },
  featureSubtitle: {
    color: circleColors.muted,
    fontSize: 12.5,
    marginTop: 3,
    lineHeight: 18,
  },
  cta: {
    marginTop: 12,
    width: '100%',
    backgroundColor: circleColors.green,
    borderRadius: 999,
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 20,
  },
  ctaText: {
    color: circleColors.white,
    fontFamily: fonts.BOLD,
    fontSize: 16,
  },
  howLink: {
    textAlign: 'center',
    marginTop: 18,
    color: circleColors.green,
    fontFamily: fonts.BOLD,
    fontSize: 15,
  },
  listHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingTop: 4,
    paddingBottom: 8,
  },
  listBackBtn: {
    padding: 4,
  },
  listTitleRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  listTitleGreen: {
    fontSize: 20,
    fontFamily: fonts.BOLD,
    color: circleColors.green,
  },
  listTitleOrange: {
    fontSize: 20,
    fontFamily: fonts.BOLD,
    color: circleColors.orange,
  },
  listHeaderSpacer: {
    width: 36,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  sectionTitle: {
    alignSelf: 'flex-start',
    fontSize: 15,
    fontFamily: fonts.BOLD,
    color: circleColors.text,
    marginBottom: 10,
  },
  circleCard: {
    width: '100%',
    backgroundColor: circleColors.white,
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: circleColors.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  circleAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleAvatarText: {
    fontFamily: fonts.BOLD,
    fontSize: 18,
    color: circleColors.green,
  },
  circleInfo: {
    flex: 1,
  },
  circleName: {
    fontSize: 15,
    fontFamily: fonts.BOLD,
    color: circleColors.text,
  },
  circleMeta: {
    fontSize: 12,
    color: circleColors.muted,
    marginTop: 2,
  },
});

export default LandingScreen;
