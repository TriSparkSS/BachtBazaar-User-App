import React, { useCallback } from 'react';
import {
  Image,
  Linking,
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
import { colors, fonts } from '../../../helpers/styles';
import { MainStackParamList } from '../../../navigation/types';

type GuideVideo = {
  id: string;
  title: string;
  subtitle: string;
  youtubeId: string;
};

/** Placeholder shopping/how-to guides (public YouTube). */
const GUIDE_VIDEOS: GuideVideo[] = [
  {
    id: 'shop-safe',
    title: 'How to shop online safely',
    subtitle: 'Tips to browse stores, spot scams, and buy with confidence.',
    youtubeId: '0QPctmPaeOk',
  },
  {
    id: 'shop-basics',
    title: 'Online shopping basics (2026)',
    subtitle: 'A quick walkthrough of safer checkout habits for everyday shopping.',
    youtubeId: 'Uth9FVfyXx4',
  },
  {
    id: 'stay-safe-short',
    title: 'Stay safe while shopping online',
    subtitle: 'Short checklist for HTTPS, passwords, and secure payments.',
    youtubeId: '0t8mXRYRwkM',
  },
];

const youtubeWatchUrl = (youtubeId: string) =>
  `https://www.youtube.com/watch?v=${youtubeId}`;

const youtubeThumbUrl = (youtubeId: string) =>
  `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`;

const VideoGuideScreen = () => {
  const navigation =
    useNavigation<StackNavigationProp<MainStackParamList, 'VideoGuide'>>();

  const openVideo = useCallback(async (youtubeId: string) => {
    const url = youtubeWatchUrl(youtubeId);
    try {
      await Linking.openURL(url);
    } catch {
      // Ignore open failures; user can retry.
    }
  }, []);

  return (
    <View style={styles.root}>
      <SafeAreaView edges={['top']} style={styles.headerSafe}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
            activeOpacity={0.85}>
            <MaterialCommunityIcons
              name="arrow-left"
              size={22}
              color={colors.white}
            />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Video Guide</Text>
          <View style={styles.backBtn} />
        </View>
      </SafeAreaView>

      <ScrollView
        style={styles.body}
        contentContainerStyle={styles.bodyContent}
        showsVerticalScrollIndicator={false}>
        <Text style={styles.introTitle}>Learn Bachat Bazaar</Text>
        <Text style={styles.introSubtitle}>
          Short guides to help you shop, checkout, and find local deals. Tap a
          card to watch on YouTube.
        </Text>

        {GUIDE_VIDEOS.map(video => (
          <TouchableOpacity
            key={video.id}
            style={styles.card}
            activeOpacity={0.88}
            onPress={() => openVideo(video.youtubeId)}>
            <View style={styles.thumbWrap}>
              <Image
                source={{ uri: youtubeThumbUrl(video.youtubeId) }}
                style={styles.thumb}
                resizeMode="cover"
              />
              <View style={styles.playBadge}>
                <MaterialCommunityIcons
                  name="play"
                  size={22}
                  color={colors.white}
                />
              </View>
            </View>
            <View style={styles.cardBody}>
              <Text style={styles.cardTitle}>{video.title}</Text>
              <Text style={styles.cardSubtitle}>{video.subtitle}</Text>
              <View style={styles.watchRow}>
                <MaterialCommunityIcons
                  name="youtube"
                  size={18}
                  color="#FF0000"
                />
                <Text style={styles.watchText}>Watch on YouTube</Text>
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

export default VideoGuideScreen;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.primary,
  },
  headerSafe: {
    backgroundColor: colors.primary,
  },
  header: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  backBtn: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 17,
    color: colors.white,
    fontFamily: fonts.BOLD,
  },
  body: {
    flex: 1,
    backgroundColor: '#F4F6FA',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  bodyContent: {
    padding: 16,
    paddingBottom: 28,
  },
  introTitle: {
    fontSize: 18,
    color: colors.text,
    fontFamily: fonts.BOLD,
    marginBottom: 6,
  },
  introSubtitle: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.mutedText,
    marginBottom: 16,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E8EDF5',
    overflow: 'hidden',
    marginBottom: 14,
  },
  thumbWrap: {
    width: '100%',
    height: 168,
    backgroundColor: '#E2E8F0',
  },
  thumb: {
    width: '100%',
    height: '100%',
  },
  playBadge: {
    position: 'absolute',
    alignSelf: 'center',
    top: '50%',
    left: '50%',
    marginTop: -22,
    marginLeft: -22,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(15, 23, 42, 0.62)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: {
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 14,
  },
  cardTitle: {
    fontSize: 16,
    color: colors.text,
    fontFamily: fonts.BOLD,
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.mutedText,
    marginBottom: 10,
  },
  watchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  watchText: {
    fontSize: 13,
    color: colors.primary,
    fontFamily: fonts.BOLD,
  },
});
