import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
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
  const route = useRoute();
  const params = (route.params as MainStackParamList['CreateRequestForm']) ?? undefined;
  const { authToken, currentUser } = useAppContext();

  const [activeTab, setActiveTab] = useState<HubTab>('create');
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [requests, setRequests] = useState<BestRequestData[]>([]);
  const [isLoadingRequests, setIsLoadingRequests] = useState(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingRequest, setEditingRequest] = useState<BestRequestData | null>(null);

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
        const requestPayload = {
          title: payload.product,
          categoryId: payload.categoryId,
          budget: payload.budget,
          urgency: payload.urgency,
          formattedAddress: payload.location,
        };
        const response =
          payload.requestId?.trim()
            ? await bestRequestApi.edit(payload.requestId, requestPayload, authToken)
            : await bestRequestApi.create(requestPayload, authToken);

        if (!response.success || !response.data?._id) {
          throw new Error(response.message || 'Could not create your request.');
        }

        showAppAlert(
          payload.requestId ? 'Request updated' : 'Request created',
          response.message ||
            (payload.requestId
              ? 'Your request has been updated successfully.'
              : 'Nearby shops will start sending offers soon.'),
        );
        setEditingRequest(null);
        setActiveTab('mine');
        await loadMyRequests();
      } catch (error) {
        showAppAlert(
          'Request failed',
          error instanceof Error ? error.message : 'Could not save your best deal request.',
        );
      } finally {
        setIsSubmitting(false);
      }
    },
    [authToken, loadMyRequests],
  );

  const handleEdit = useCallback((request: BestRequestData) => {
    setEditingRequest(request);
    setActiveTab('create');
  }, []);

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

  const handleDelete = useCallback(
    (request: BestRequestData) => {
      if (!authToken?.trim()) {
        return;
      }

      showAppAlert('Delete request?', `Do you want to permanently delete “${request.title}”?`, [
        { text: 'Keep', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setDeletingId(request._id);
              const response = await bestRequestApi.delete(request._id, authToken);
              if (!response.success) {
                throw new Error(response.message || 'Could not delete this request.');
              }
              setRequests(current => current.filter(item => item._id !== request._id));
              if (editingRequest?._id === request._id) {
                setEditingRequest(null);
              }
              showAppAlert('Deleted', response.message || 'Your request has been deleted.');
            } catch (error) {
              showAppAlert(
                'Delete failed',
                error instanceof Error ? error.message : 'Could not delete this request.',
              );
            } finally {
              setDeletingId(null);
            }
          },
        },
      ]);
    },
    [authToken, editingRequest?._id],
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
            initialProduct={params?.initialProduct}
            categories={categories}
            isLoadingCategories={isLoadingCategories}
            isSubmitting={isSubmitting}
            showHeader={false}
            editingRequest={editingRequest}
            resolveCategoryImageUrl={categoryApi.resolveImageUrl}
            onBack={() => navigation.goBack()}
            onSubmit={handleSubmit}
          />
        ) : (
          <MyRequestsView
            requests={requests}
            isLoading={isLoadingRequests}
            cancellingId={cancellingId}
            deletingId={deletingId}
            onRefresh={loadMyRequests}
            onCancel={handleCancel}
            onDelete={handleDelete}
            onEdit={handleEdit}
            onCreateNew={() => {
              setEditingRequest(null);
              setActiveTab('create');
            }}
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
