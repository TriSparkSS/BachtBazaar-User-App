import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import CreateRequestFormView from './CreateRequestFormView';
import MyRequestsView from './MyRequestsView';
import { useAppContext } from '../../../context/AppContext';
import { MainStackParamList } from '../../../navigation/types';
import { CreateRequestFormParams } from '../../../types/createRequest';
import { Category } from '../../../types/category';
import { categoryApi } from '../../../services/categoryApi';
import { BestRequestData, bestRequestApi } from '../../../services/bestRequestApi';
import { showAppAlert } from '../../../services/appAlert';
import { colors, fonts } from '../../../helpers/styles';

type HubTab = 'create' | 'mine';

const TABS: { id: HubTab; label: string }[] = [
  { id: 'create', label: 'Create Request' },
  { id: 'mine', label: 'My Requests' },
];

const CreateRequestForm = () => {
  const navigation = useNavigation<StackNavigationProp<MainStackParamList, 'CreateRequestForm'>>();
  const { authToken, currentUser } = useAppContext();

  const [activeTab, setActiveTab] = useState<HubTab>('create');
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [requests, setRequests] = useState<BestRequestData[]>([]);
  const [isLoadingRequests, setIsLoadingRequests] = useState(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const initialLocation =
    currentUser?.address?.trim() ||
    currentUser?.city?.trim() ||
    'Select delivery location';

  const loadCategories = useCallback(async () => {
    try {
      setIsLoadingCategories(true);
      setCategories(await categoryApi.fetchCategories(authToken ?? undefined));
    } catch {
      setCategories([]);
    } finally {
      setIsLoadingCategories(false);
    }
  }, [authToken]);

  const loadMyRequests = useCallback(async () => {
    if (!authToken?.trim()) {
      setRequests([]);
      return;
    }
    try {
      setIsLoadingRequests(true);
      setRequests(await bestRequestApi.fetchMyRequests(authToken));
    } catch (error) {
      showAppAlert(
        'Could not load requests',
        error instanceof Error ? error.message : 'Please try again.',
      );
    } finally {
      setIsLoadingRequests(false);
    }
  }, [authToken]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  useEffect(() => {
    if (activeTab === 'mine') {
      loadMyRequests();
    }
  }, [activeTab, loadMyRequests]);

  const handleSubmit = useCallback(
    async (payload: CreateRequestFormParams) => {
      if (!authToken?.trim()) {
        showAppAlert('Login required', 'Please log in again to create a best deal request.');
        return;
      }
      if (!payload.categoryId?.trim()) {
        showAppAlert('Category required', 'Please select a category to continue.');
        return;
      }

      try {
        setIsSubmitting(true);
        const response = await bestRequestApi.create(
          {
            title: payload.product,
            categoryId: payload.categoryId,
            budget: payload.budget,
            urgency: payload.urgency,
            formattedAddress: payload.location,
          },
          authToken,
        );

        if (!response.success || !response.data?._id) {
          throw new Error(response.message || 'Could not create your request.');
        }

        showAppAlert(
          'Request created',
          response.message || 'Nearby shops will start sending offers soon.',
        );
        setActiveTab('mine');
        await loadMyRequests();
      } catch (error) {
        showAppAlert(
          'Request failed',
          error instanceof Error ? error.message : 'Could not create your best deal request.',
        );
      } finally {
        setIsSubmitting(false);
      }
    },
    [authToken, loadMyRequests],
  );

  const handleCancel = useCallback(
    (request: BestRequestData) => {
      if (!authToken?.trim()) {
        return;
      }

      showAppAlert('Cancel request?', `Do you want to cancel “${request.title}”?`, [
        { text: 'Keep', style: 'cancel' },
        {
          text: 'Cancel request',
          style: 'destructive',
          onPress: async () => {
            try {
              setCancellingId(request._id);
              const response = await bestRequestApi.cancel(request._id, authToken);
              if (!response.success) {
                throw new Error(response.message || 'Could not cancel this request.');
              }
              setRequests(current =>
                current.map(item =>
                  item._id === request._id
                    ? { ...item, status: response.data?.status || 'cancelled' }
                    : item,
                ),
              );
              showAppAlert('Cancelled', response.message || 'Your request has been cancelled.');
            } catch (error) {
              showAppAlert(
                'Cancel failed',
                error instanceof Error ? error.message : 'Could not cancel this request.',
              );
            } finally {
              setCancellingId(null);
            }
          },
        },
      ]);
    },
    [authToken],
  );

  return (
    <View style={styles.root}>
      <SafeAreaView edges={['top']} style={styles.headerSafe}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
            activeOpacity={0.85}>
            <MaterialCommunityIcons name="arrow-left" size={22} color={colors.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Request Best Deal</Text>
          <View style={styles.backBtn} />
        </View>

        <View style={styles.tabsWrap}>
          {TABS.map(tab => {
            const active = activeTab === tab.id;
            return (
              <TouchableOpacity
                key={tab.id}
                style={[styles.tab, active && styles.tabActive]}
                activeOpacity={0.88}
                onPress={() => setActiveTab(tab.id)}>
                <Text style={[styles.tabText, active && styles.tabTextActive]}>{tab.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </SafeAreaView>

      <View style={styles.body}>
        {activeTab === 'create' ? (
          <CreateRequestFormView
            initialLocation={initialLocation}
            categories={categories}
            isLoadingCategories={isLoadingCategories}
            isSubmitting={isSubmitting}
            showHeader={false}
            resolveCategoryImageUrl={categoryApi.resolveImageUrl}
            onBack={() => navigation.goBack()}
            onSubmit={handleSubmit}
          />
        ) : (
          <MyRequestsView
            requests={requests}
            isLoading={isLoadingRequests}
            cancellingId={cancellingId}
            onRefresh={loadMyRequests}
            onCancel={handleCancel}
            onCreateNew={() => setActiveTab('create')}
            onOpenOffers={request =>
              navigation.navigate('CreateRequestOffers', {
                requestId: request._id,
                title: request.title,
                status: request.status,
                budget: request.budget,
                timeframe: request.timeframe,
              })
            }
          />
        )}
      </View>
    </View>
  );
};

export default CreateRequestForm;

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
  tabsWrap: {
    marginHorizontal: 16,
    marginBottom: 14,
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 14,
    padding: 4,
  },
  tab: {
    flex: 1,
    height: 36,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabActive: {
    backgroundColor: colors.white,
  },
  tabText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.85)',
    fontFamily: fonts.BOLD,
  },
  tabTextActive: {
    color: colors.primary,
  },
  body: {
    flex: 1,
    backgroundColor: '#F4F6FA',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
});
