import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAppContext } from '../../../context/AppContext';
import { fonts } from '../../../helpers/styles';
import { MainStackParamList } from '../../../navigation/types';
import { showAppAlert } from '../../../services/appAlert';
import { bachatCircleApi } from '../../../services/bachatCircleApi';
import { CircleCategory } from './types';
import { circleStorage } from './circleStorage';
import { circleColors, circleShadow } from './theme';

const CATEGORIES: {
  key: CircleCategory;
  icon: string;
}[] = [
  { key: 'Family', icon: 'home-heart' },
  { key: 'Friends', icon: 'account-group' },
  { key: 'Office Team', icon: 'briefcase-outline' },
  { key: 'Other', icon: 'dots-horizontal' },
];

const CreateCircleScreen = () => {
  const navigation =
    useNavigation<
      StackNavigationProp<MainStackParamList, 'BachatCircleCreate'>
    >();
  const { currentUser, authToken } = useAppContext();
  const defaultName = useMemo(() => {
    const first = (currentUser?.name || 'My').trim().split(/\s+/)[0];
    return `${first}'s Family Circle`;
  }, [currentUser?.name]);

  const [name, setName] = useState(defaultName);
  const [category, setCategory] = useState<CircleCategory>('Family');
  const [creating, setCreating] = useState(false);

  const onCreate = async () => {
    const trimmed = name.trim();
    if (!trimmed || creating) {
      return;
    }
    const token = authToken?.trim();
    if (!token) {
      showAppAlert('Login required', 'Please log in to create a Bachat Circle.');
      return;
    }

    setCreating(true);
    try {
      const description = `${category} circle`;
      const circle = await bachatCircleApi.createCircle(token, {
        name: trimmed,
        description,
      });
      await circleStorage.save({
        created: true,
        circleId: circle.id,
        name: circle.name,
        category,
        description: circle.description || description,
        memberIds: circle.members.map(m => m.userId),
        pendingInviteIds: [],
      });
      navigation.navigate('BachatCircleAddMembers', {
        circleName: circle.name,
        category,
        circleId: circle.id,
        description: circle.description || description,
      });
    } catch (error) {
      showAppAlert(
        'Could not create circle',
        error instanceof Error ? error.message : 'Please try again.',
      );
    } finally {
      setCreating(false);
    }
  };

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
          <Text style={styles.headerTitle}>Create Bachat Circle</Text>
          <View style={styles.headerUnderline} />
        </View>
        <View style={styles.iconBtn} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.introRow}>
          <Text style={styles.introText}>
            Apne circle ko naam dein aur apne friends aur family ko add karein.
          </Text>
          <View style={styles.introArt}>
            <View style={styles.introShield}>
              <MaterialCommunityIcons
                name="shield-check"
                size={16}
                color={circleColors.white}
              />
            </View>
            <MaterialCommunityIcons
              name="account-group"
              size={34}
              color={circleColors.orange}
            />
          </View>
        </View>

        <View style={[styles.card, circleShadow.soft]}>
          <Text style={styles.label}>Circle Name</Text>
          <View style={styles.inputRow}>
            <MaterialCommunityIcons
              name="account-group-outline"
              size={20}
              color={circleColors.green}
            />
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Enter circle name"
              placeholderTextColor={circleColors.muted}
            />
            {name ? (
              <TouchableOpacity onPress={() => setName('')}>
                <MaterialCommunityIcons
                  name="close-circle"
                  size={18}
                  color={circleColors.greenMid}
                />
              </TouchableOpacity>
            ) : null}
          </View>

          <View style={styles.chips}>
            {CATEGORIES.map(item => {
              const selected = category === item.key;
              return (
                <TouchableOpacity
                  key={item.key}
                  style={[styles.chip, selected && styles.chipSelected]}
                  onPress={() => setCategory(item.key)}
                  activeOpacity={0.85}
                >
                  <MaterialCommunityIcons
                    name={item.icon}
                    size={16}
                    color={selected ? circleColors.white : circleColors.green}
                  />
                  <Text
                    style={[
                      styles.chipText,
                      selected && styles.chipTextSelected,
                    ]}
                  >
                    {item.key}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.privacyNote}>
            <MaterialCommunityIcons
              name="shield-check-outline"
              size={16}
              color={circleColors.green}
            />
            <Text style={styles.privacyText}>
              Ye circle sirf aapke add kiye gaye members ke saath private
              rahega.
            </Text>
          </View>
        </View>

        <View style={[styles.infoCard, circleShadow.soft]}>
          <View style={styles.infoHeader}>
            <View style={styles.bulbWrap}>
              <MaterialCommunityIcons
                name="lightbulb-on"
                size={16}
                color={circleColors.orange}
              />
            </View>
            <Text style={styles.infoTitle}>Bachat Circle Kya Hai?</Text>
          </View>
          <Text style={styles.infoBody}>
            Apne trusted circle ke saath offers share karke zyada bachat
            karein.
          </Text>
          <View style={styles.infoGrid}>
            {[
              {
                icon: 'tag-outline',
                label: 'Best Offers\nShare Karein',
                color: circleColors.orange,
              },
              {
                icon: 'map-marker-outline',
                label: 'Nearby Deals\nPao',
                color: circleColors.green,
              },
              {
                icon: 'account-group-outline',
                label: 'Trusted Circle\nBanayein',
                color: circleColors.orange,
              },
            ].map(item => (
              <View key={item.label} style={styles.infoItem}>
                <View style={styles.infoIconWrap}>
                  <MaterialCommunityIcons
                    name={item.icon}
                    size={22}
                    color={item.color}
                  />
                </View>
                <Text style={styles.infoItemText}>{item.label}</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.nextBtn,
            circleShadow.cta,
            (!name.trim() || creating) && styles.nextBtnDisabled,
          ]}
          disabled={!name.trim() || creating}
          activeOpacity={0.9}
          onPress={() => {
            void onCreate();
          }}
        >
          {creating ? (
            <ActivityIndicator color={circleColors.white} />
          ) : (
            <>
              <Text style={styles.nextText}>Create & Add Members</Text>
              <MaterialCommunityIcons
                name="arrow-right"
                size={20}
                color={circleColors.white}
              />
            </>
          )}
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
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: circleColors.white,
  },
  iconBtn: { padding: 6, width: 40 },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: {
    fontFamily: fonts.BOLD,
    fontSize: 17,
    color: circleColors.green,
  },
  headerUnderline: {
    marginTop: 5,
    width: 42,
    height: 3,
    borderRadius: 2,
    backgroundColor: circleColors.orange,
  },
  content: { padding: 16, paddingBottom: 24 },
  introRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
    alignItems: 'center',
  },
  introText: {
    flex: 1,
    color: circleColors.muted,
    fontSize: 14,
    lineHeight: 21,
  },
  introArt: {
    width: 78,
    height: 78,
    borderRadius: 39,
    backgroundColor: circleColors.greenSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  introShield: {
    position: 'absolute',
    top: 6,
    right: 8,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: circleColors.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    backgroundColor: circleColors.white,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: circleColors.borderSoft,
    padding: 16,
    marginBottom: 14,
  },
  label: {
    fontFamily: fonts.BOLD,
    color: circleColors.text,
    marginBottom: 10,
    fontSize: 14,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderColor: circleColors.green,
    borderRadius: 14,
    paddingHorizontal: 12,
    minHeight: 50,
    backgroundColor: circleColors.greenWash,
  },
  input: {
    flex: 1,
    color: circleColors.text,
    fontSize: 15,
    paddingVertical: 8,
    fontFamily: fonts.BOLD,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 16,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1.5,
    borderColor: circleColors.greenBorder,
    borderRadius: 22,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: circleColors.white,
  },
  chipSelected: {
    backgroundColor: circleColors.green,
    borderColor: circleColors.green,
  },
  chipText: {
    color: circleColors.green,
    fontSize: 13,
    fontFamily: fonts.BOLD,
  },
  chipTextSelected: { color: circleColors.white },
  privacyNote: {
    marginTop: 16,
    backgroundColor: circleColors.greenSoft,
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-start',
  },
  privacyText: {
    flex: 1,
    color: circleColors.green,
    fontSize: 12,
    lineHeight: 18,
  },
  infoCard: {
    backgroundColor: circleColors.orangeSoft,
    borderRadius: 18,
    padding: 16,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  bulbWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: circleColors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoTitle: {
    fontFamily: fonts.BOLD,
    color: circleColors.orange,
    fontSize: 15,
  },
  infoBody: {
    color: circleColors.muted,
    fontSize: 12,
    marginBottom: 14,
    lineHeight: 18,
  },
  infoGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  infoItem: { width: '30%', alignItems: 'center', gap: 8 },
  infoIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: circleColors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoItemText: {
    textAlign: 'center',
    fontSize: 11,
    color: circleColors.text,
    lineHeight: 15,
    fontFamily: fonts.BOLD,
  },
  footer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: circleColors.borderSoft,
    backgroundColor: circleColors.white,
  },
  nextBtn: {
    backgroundColor: circleColors.green,
    borderRadius: 16,
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  nextBtnDisabled: { opacity: 0.5 },
  nextText: {
    color: circleColors.white,
    fontFamily: fonts.BOLD,
    fontSize: 15,
  },
});

export default CreateCircleScreen;
