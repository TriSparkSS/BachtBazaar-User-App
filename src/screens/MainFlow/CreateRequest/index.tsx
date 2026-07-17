import React, { useCallback, useEffect, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import CreateRequestFormView from './CreateRequestFormView';
import { useAppContext } from '../../../context/AppContext';
import { MainStackParamList } from '../../../navigation/types';
import { CreateRequestFormParams } from '../../../types/createRequest';
import { Category } from '../../../types/category';
import { categoryApi } from '../../../services/categoryApi';
import { bestRequestApi } from '../../../services/bestRequestApi';
import { showAppAlert } from '../../../services/appAlert';

const CreateRequestForm = () => {
  const navigation = useNavigation<StackNavigationProp<MainStackParamList, 'CreateRequestForm'>>();
  const { authToken, currentUser } = useAppContext();
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const initialLocation =
    currentUser?.address?.trim() ||
    currentUser?.city?.trim() ||
    'Rajendra Nagar, Patna';

  useEffect(() => {
    let cancelled = false;

    const loadCategories = async () => {
      try {
        setIsLoadingCategories(true);
        const result = await categoryApi.fetchCategories(authToken ?? undefined);
        if (!cancelled) {
          setCategories(result);
        }
      } catch {
        if (!cancelled) {
          setCategories([]);
        }
      } finally {
        if (!cancelled) {
          setIsLoadingCategories(false);
        }
      }
    };

    loadCategories();

    return () => {
      cancelled = true;
    };
  }, [authToken]);

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

        navigation.navigate('CreateRequestSearching', {
          ...payload,
          requestId: response.data._id,
          expiresAt: response.data.expiresAt,
          location: response.data.formattedAddress?.trim() || payload.location,
        });
      } catch (error) {
        showAppAlert(
          'Request failed',
          error instanceof Error ? error.message : 'Could not create your best deal request.',
        );
      } finally {
        setIsSubmitting(false);
      }
    },
    [authToken, navigation],
  );

  return (
    <CreateRequestFormView
      initialLocation={initialLocation}
      categories={categories}
      isLoadingCategories={isLoadingCategories}
      isSubmitting={isSubmitting}
      resolveCategoryImageUrl={categoryApi.resolveImageUrl}
      onBack={() => navigation.goBack()}
      onSubmit={handleSubmit}
    />
  );
};

export default CreateRequestForm;
