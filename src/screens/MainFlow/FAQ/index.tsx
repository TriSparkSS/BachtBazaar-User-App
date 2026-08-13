import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  LayoutAnimation,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  UIManager,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAppContext } from '../../../context/AppContext';
import { colors, fonts } from '../../../helpers/styles';
import { MainStackParamList } from '../../../navigation/types';
import { FaqItem, faqApi } from '../../../services/faqApi';

if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const FaqScreen = () => {
  const navigation =
    useNavigation<StackNavigationProp<MainStackParamList, 'FAQ'>>();
  const { authToken } = useAppContext();
  const [faqs, setFaqs] = useState<FaqItem[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loadingDetailIds, setLoadingDetailIds] = useState<
    Record<string, boolean>
  >({});
  const [detailErrors, setDetailErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadFaqs = useCallback(
    async (mode: 'initial' | 'refresh' = 'initial') => {
      if (mode === 'refresh') {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      try {
        const list = await faqApi.fetchUserFaqs(authToken);
        setFaqs(list);
        setError(null);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Could not load FAQs.';
        setError(message);
        if (mode === 'initial') {
          setFaqs([]);
        }
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [authToken],
  );

  useFocusEffect(
    useCallback(() => {
      void loadFaqs('initial');
    }, [loadFaqs]),
  );

  const ensureAnswer = useCallback(
    async (item: FaqItem) => {
      if (item.answer?.trim()) {
        return;
      }

      setLoadingDetailIds(prev => ({ ...prev, [item.id]: true }));
      setDetailErrors(prev => {
        const next = { ...prev };
        delete next[item.id];
        return next;
      });

      try {
        const detail = await faqApi.fetchFaqDetail(item.id, authToken);
        setFaqs(prev =>
          prev.map(faq =>
            faq.id === item.id
              ? {
                  ...faq,
                  question: detail.question || faq.question,
                  answer: detail.answer || faq.answer,
                  videoUrl: detail.videoUrl || faq.videoUrl,
                  category: detail.category || faq.category,
                  raw: detail.raw,
                }
              : faq,
          ),
        );
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Could not load answer.';
        setDetailErrors(prev => ({ ...prev, [item.id]: message }));
      } finally {
        setLoadingDetailIds(prev => {
          const next = { ...prev };
          delete next[item.id];
          return next;
        });
      }
    },
    [authToken],
  );

  const toggleFaq = useCallback(
    (item: FaqItem) => {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      const nextId = expandedId === item.id ? null : item.id;
      setExpandedId(nextId);
      if (nextId) {
        void ensureAnswer(item);
      }
    },
    [ensureAnswer, expandedId],
  );

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
          <Text style={styles.headerTitle}>FAQ</Text>
          <View style={styles.backBtn} />
        </View>
      </SafeAreaView>

      <View style={styles.body}>
        {isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator color={colors.primary} size="large" />
            <Text style={styles.centerText}>Loading FAQs…</Text>
          </View>
        ) : error && faqs.length === 0 ? (
          <ScrollView
            contentContainerStyle={[styles.center, styles.centerScroll]}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={() => void loadFaqs('refresh')}
                tintColor={colors.primary}
                colors={[colors.primary]}
              />
            }>
            <View style={styles.emptyIcon}>
              <MaterialCommunityIcons
                name="help-circle-outline"
                size={28}
                color={colors.primary}
              />
            </View>
            <Text style={styles.emptyTitle}>Could not load FAQs</Text>
            <Text style={styles.emptySub}>{error}</Text>
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={() => void loadFaqs('initial')}
              activeOpacity={0.85}>
              <Text style={styles.primaryBtnText}>Try again</Text>
            </TouchableOpacity>
          </ScrollView>
        ) : (
          <ScrollView
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={() => void loadFaqs('refresh')}
                tintColor={colors.primary}
                colors={[colors.primary]}
              />
            }>
            {faqs.length === 0 ? (
              <View style={styles.center}>
                <View style={styles.emptyIcon}>
                  <MaterialCommunityIcons
                    name="help-circle-outline"
                    size={28}
                    color={colors.primary}
                  />
                </View>
                <Text style={styles.emptyTitle}>No FAQs yet</Text>
                <Text style={styles.emptySub}>
                  Check back later for answers to common questions.
                </Text>
              </View>
            ) : (
              faqs.map(item => {
                const open = expandedId === item.id;
                const loadingAnswer = Boolean(loadingDetailIds[item.id]);
                const detailError = detailErrors[item.id];

                return (
                  <View key={item.id} style={styles.card}>
                    <TouchableOpacity
                      style={styles.row}
                      onPress={() => toggleFaq(item)}
                      activeOpacity={0.85}>
                      <Text style={styles.question}>{item.question}</Text>
                      <MaterialCommunityIcons
                        name={open ? 'chevron-up' : 'chevron-down'}
                        size={22}
                        color={colors.primary}
                      />
                    </TouchableOpacity>
                    {open ? (
                      <View style={styles.answerWrap}>
                        {loadingAnswer ? (
                          <ActivityIndicator
                            color={colors.primary}
                            style={styles.answerLoader}
                          />
                        ) : detailError ? (
                          <Text style={styles.answerError}>{detailError}</Text>
                        ) : (
                          <Text style={styles.answer}>
                            {item.answer?.trim() || 'No answer available.'}
                          </Text>
                        )}
                      </View>
                    ) : null}
                  </View>
                );
              })
            )}
          </ScrollView>
        )}
      </View>
    </View>
  );
};

export default FaqScreen;

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
    overflow: 'hidden',
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
    gap: 10,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E8EDF5',
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 10,
  },
  question: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    color: colors.text,
    fontFamily: fonts.BOLD,
  },
  answerWrap: {
    paddingHorizontal: 14,
    paddingBottom: 14,
    borderTopWidth: 1,
    borderTopColor: '#EEF2F8',
  },
  answer: {
    marginTop: 10,
    fontSize: 13,
    lineHeight: 19,
    color: colors.mutedText,
    fontFamily: fonts.BOLD,
  },
  answerError: {
    marginTop: 10,
    fontSize: 13,
    lineHeight: 19,
    color: colors.red,
    fontFamily: fonts.BOLD,
  },
  answerLoader: {
    marginTop: 12,
    marginBottom: 4,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 36,
  },
  centerScroll: {
    flexGrow: 1,
  },
  centerText: {
    marginTop: 10,
    fontSize: 13,
    color: colors.mutedText,
    fontFamily: fonts.BOLD,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E8EDF5',
  },
  emptyTitle: {
    fontSize: 17,
    color: colors.text,
    fontFamily: fonts.BOLD,
    marginBottom: 6,
    textAlign: 'center',
  },
  emptySub: {
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
    color: colors.mutedText,
    fontFamily: fonts.BOLD,
  },
  primaryBtn: {
    marginTop: 16,
    backgroundColor: colors.primary,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
  },
  primaryBtnText: {
    color: colors.white,
    fontSize: 13,
    fontFamily: fonts.BOLD,
  },
});
