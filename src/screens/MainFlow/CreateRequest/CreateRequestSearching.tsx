import React, { useCallback } from 'react';
import { CommonActions, useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import CreateRequestSearchingView from './CreateRequestSearchingView';
import { MainStackParamList } from '../../../navigation/types';
import { buildMockOffers } from '../../../utils/createRequestMocks';

const CreateRequestSearching = () => {
  const navigation =
    useNavigation<StackNavigationProp<MainStackParamList, 'CreateRequestSearching'>>();
  const route = useRoute();
  const params = route.params as MainStackParamList['CreateRequestSearching'];

  const handleComplete = useCallback(() => {
    const offers = buildMockOffers(params.product, params.budget);
    const bestPrice = offers[0]?.price ?? 0;
    const marketPrice = offers[0]?.originalPrice ?? Math.round(bestPrice * 1.08);
    const youSave = Math.max(0, marketPrice - bestPrice);

    navigation.dispatch(
      CommonActions.reset({
        index: 1,
        routes: [
          { name: 'BottomStack' },
          {
            name: 'CreateRequestResults',
            params: {
              product: params.product,
              category: params.category,
              categoryId: params.categoryId,
              budget: params.budget,
              urgency: params.urgency,
              location: params.location,
              requestId: params.requestId,
              expiresAt: params.expiresAt,
              bestPrice,
              marketPrice,
              youSave,
              offers,
            },
          },
        ],
      }),
    );
  }, [navigation, params]);

  return (
    <CreateRequestSearchingView product={params.product} onComplete={handleComplete} />
  );
};

export default CreateRequestSearching;
