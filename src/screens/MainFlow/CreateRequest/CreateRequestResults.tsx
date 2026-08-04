import React from 'react';
import { useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import CreateRequestResultsView from './CreateRequestResultsView';
import { MainStackParamList } from '../../../navigation/types';

const CreateRequestResults = () => {
  const navigation =
    useNavigation<StackNavigationProp<MainStackParamList, 'CreateRequestResults'>>();
  const route = useRoute();
  const params = route.params as MainStackParamList['CreateRequestResults'];

  return (
    <CreateRequestResultsView
      product={params.product}
      bestPrice={params.bestPrice}
      marketPrice={params.marketPrice}
      youSave={params.youSave}
      offers={params.offers}
      onBack={() => navigation.navigate('BottomStack')}
    />
  );
};

export default CreateRequestResults;
