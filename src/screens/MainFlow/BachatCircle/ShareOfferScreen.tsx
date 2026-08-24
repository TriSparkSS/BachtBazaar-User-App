import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
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
import { useAppContext } from '../../../context/AppContext';
import { fonts } from '../../../helpers/styles';
import { MainStackParamList } from '../../../navigation/types';
import { showAppAlert } from '../../../services/appAlert';
import {
  BachatCircleDto,
  bachatCircleApi,
} from '../../../services/bachatCircleApi';
import MemberAvatar from './components/MemberAvatar';
import { circleStorage } from './circleStorage';
import { circleColors, circleShadow } from './theme';
import { maskPhoneNumber } from '../../../utils/phone';

const ShareOfferScreen = () => {
  const navigation =
    useNavigation<StackNavigationProp<MainStackParamList, 'BachatCircleShareOffer'>>();
  const route = useRoute<RouteProp<MainStackParamList, 'BachatCircleShareOffer'>>();
  const { authToken, currentUser } = useAppContext();
  const {
    offerId,
    offerTitle,
    offerSubtitle,
    discount,
    circleId: paramCircleId,
  } = route.params;

  const [circle, setCircle] = useState<BachatCircleDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [sharing, setSharing] = useState(false);
  const [entireCircle, setEntireCircle] = useState(true);
  const [selected, setSelected] = useState<Record<string, true>>({});

  useEffect(() => {
    let alive = true;
    (async () => {
      const token = authToken?.trim();
      if (!token) {
        setLoading(false);
        return;
      }
      const stored = await circleStorage.load();
      const circleId = paramCircleId || stored.circleId;
      if (!circleId) {
        setLoading(false);
        showAppAlert('No circle', 'Create or join a Bachat Circle first.');
        return;
      }
      try {
        const detail = await bachatCircleApi.getCircle(token, circleId);
        if (!alive) {
          return;
        }
        setCircle(detail);
        const defaults: Record<string, true> = {};
        detail.members.forEach(m => {
          if (m.userId !== currentUser?._id) {
            defaults[m.userId] = true;
          }
        });
        setSelected(defaults);
      } catch (error) {
        showAppAlert(
          'Could not load circle',
          error instanceof Error ? error.message : 'Please try again.',
        );
      } finally {
        if (alive) {
          setLoading(false);
        }
      }
    })();
    return () => {
      alive = false;
    };
  }, [authToken, currentUser?._id, paramCircleId]);

  const selectable = (circle?.members || []).filter(
    m => m.userId !== currentUser?._id,
  );

  const toggle = (id: string) => {
    setEntireCircle(false);
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

  const onShare = useCallback(async () => {
    const token = authToken?.trim();
    if (!token || !circle) {
      return;
    }
    const memberIds = entireCircle
      ? selectable.map(m => m.userId)
      : Object.keys(selected);
    if (!entireCircle && memberIds.length === 0) {
      showAppAlert('Select members', 'Choose at least one member or Entire Circle.');
      return;
    }

    setSharing(true);
    try {
      await bachatCircleApi.shareOffer(token, circle.id, {
        offerId,
        visibilityType: entireCircle ? 'ENTIRE_CIRCLE' : 'SELECTED_MEMBERS',
        visibleToMembers: entireCircle ? undefined : memberIds,
      });
      showAppAlert('Shared', 'Offer shared to your Bachat Circle.', [
        {
          text: 'Open Circle',
          onPress: () =>
            navigation.navigate('BachatCircleFeed', { circleId: circle.id }),
        },
        { text: 'OK', style: 'cancel' },
      ]);
    } catch (error) {
      showAppAlert(
        'Share failed',
        error instanceof Error ? error.message : 'Please try again.',
      );
    } finally {
      setSharing(false);
    }
  }, [
    authToken,
    circle,
    entireCircle,
    navigation,
    offerId,
    selectable,
    selected,
  ]);

  if (loading) {
    return (
      <SafeAreaView style={[styles.safe, styles.center]} edges={['top']}>
        <ActivityIndicator color={circleColors.green} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <MaterialCommunityIcons name="arrow-left" size={22} color={circleColors.green} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Share Offer to Circle</Text>
          <Text style={styles.headerSub}>
            {circle?.name || 'Select members to share this offer.'}
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.offerCard, circleShadow.card]}>
          <Text style={styles.offerTitle}>{offerTitle || 'Offer'}</Text>
          {offerSubtitle ? (
            <Text style={styles.offerSub}>{offerSubtitle}</Text>
          ) : null}
          {discount ? <Text style={styles.discount}>{discount}</Text> : null}
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
            <View style={[styles.check, entireCircle && styles.checkOn]}>
              {entireCircle ? (
                <MaterialCommunityIcons name="check" size={16} color={circleColors.white} />
              ) : null}
            </View>
          </TouchableOpacity>

          {selectable.map(member => {
            const isOn = entireCircle || Boolean(selected[member.userId]);
            return (
              <TouchableOpacity
                key={member.userId}
                style={styles.row}
                onPress={() => toggle(member.userId)}
              >
                <MemberAvatar
                  name={member.name}
                  initial={member.name.slice(0, 1).toUpperCase()}
                  color={circleColors.greenSoft}
                  size={42}
                />
                <View style={styles.rowText}>
                  <Text style={styles.name}>{member.name}</Text>
                  <Text style={styles.phone}>
                    {member.phone ? maskPhoneNumber(member.phone) : member.role}
                  </Text>
                </View>
                <View style={[styles.check, isOn && styles.checkOn]}>
                  {isOn ? (
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
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.shareBtn, circleShadow.cta, sharing && styles.disabled]}
          disabled={sharing || !circle}
          onPress={() => {
            void onShare();
          }}
        >
          {sharing ? (
            <ActivityIndicator color={circleColors.white} />
          ) : (
            <Text style={styles.shareText}>Share to Circle</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

export default ShareOfferScreen;

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: circleColors.cream },
  center: { alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: circleColors.white,
  },
  headerTitle: {
    fontSize: 17,
    fontFamily: fonts.BOLD,
    color: circleColors.text,
  },
  headerSub: { fontSize: 12, color: circleColors.muted, marginTop: 2 },
  content: { padding: 16, paddingBottom: 30 },
  offerCard: {
    backgroundColor: circleColors.white,
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
  },
  offerTitle: {
    fontSize: 16,
    fontFamily: fonts.BOLD,
    color: circleColors.text,
  },
  offerSub: { marginTop: 4, color: circleColors.muted, fontSize: 13 },
  discount: {
    marginTop: 8,
    color: circleColors.orange,
    fontFamily: fonts.BOLD,
  },
  shareCard: {
    backgroundColor: circleColors.white,
    borderRadius: 14,
    padding: 12,
  },
  sectionLabel: {
    fontSize: 14,
    fontFamily: fonts.BOLD,
    color: circleColors.text,
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: circleColors.border,
  },
  entireIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: circleColors.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: { flex: 1 },
  name: { fontSize: 14, fontFamily: fonts.BOLD, color: circleColors.text },
  phone: { fontSize: 12, color: circleColors.muted, marginTop: 2 },
  check: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: circleColors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkOn: {
    backgroundColor: circleColors.green,
    borderColor: circleColors.green,
  },
  footer: {
    padding: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: circleColors.border,
  },
  shareBtn: {
    height: 52,
    borderRadius: 14,
    backgroundColor: circleColors.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareText: {
    color: circleColors.white,
    fontSize: 16,
    fontFamily: fonts.BOLD,
  },
  disabled: { opacity: 0.7 },
});
