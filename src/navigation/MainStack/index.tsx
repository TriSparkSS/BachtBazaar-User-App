import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { StyleSheet } from 'react-native';
import { colors } from '../../helpers/styles';
import { BottomStack } from './BottomStack';
import StoreDetail from '../../screens/MainFlow/StoreDetail';
import OfferDetail from '../../screens/MainFlow/OfferDetail';
import ProductDetail from '../../screens/MainFlow/ProductDetail';
import Cart from '../../screens/MainFlow/Cart';
import RequestDelivery from '../../screens/MainFlow/RequestDelivery';
import RequestDeliverySent from '../../screens/MainFlow/RequestDelivery/RequestDeliverySent';
import RequestDeliveryAccepted from '../../screens/MainFlow/RequestDelivery/RequestDeliveryAccepted';
import AddAddress from '../../screens/MainFlow/AddAddress';
import CreateRequestForm from '../../screens/MainFlow/CreateRequest';
import CreateRequestOffers from '../../screens/MainFlow/CreateRequest/CreateRequestOffers';
import MerchantBidDetail from '../../screens/MainFlow/CreateRequest/MerchantBidDetail';
import CreateRequestSearching from '../../screens/MainFlow/CreateRequest/CreateRequestSearching';
import CreateRequestResults from '../../screens/MainFlow/CreateRequest/CreateRequestResults';
import OfferRedemptionHistory from '../../screens/MainFlow/OfferRedemptionHistory';
import SavedOffers from '../../screens/MainFlow/SavedOffers';
import ScannerScreen from '../../screens/MainFlow/ScannerScreen';
import MyQrScreen from '../../screens/MainFlow/MyQrScreen';
import { MainStackParamList } from '../types';

const MainStackNav = createStackNavigator<MainStackParamList>();

export const MainStack = () => {
    return (
        <MainStackNav.Navigator
            screenOptions={{
                headerShown: false,
                cardStyle: styles.container
            }}
            initialRouteName={'BottomStack'}
        >
            <MainStackNav.Screen component={BottomStack} name={'BottomStack'} />
            <MainStackNav.Screen component={StoreDetail} name={'StoreDetail'} />
            <MainStackNav.Screen component={OfferDetail} name={'OfferDetail'} />
            <MainStackNav.Screen component={ProductDetail} name={'ProductDetail'} />
            <MainStackNav.Screen component={Cart} name={'Cart'} />
            <MainStackNav.Screen component={RequestDelivery} name={'RequestDelivery'} />
            <MainStackNav.Screen component={RequestDeliverySent} name={'RequestDeliverySent'} />
            <MainStackNav.Screen
              component={RequestDeliveryAccepted}
              name={'RequestDeliveryAccepted'}
            />
            <MainStackNav.Screen component={AddAddress} name={'AddAddress'} />
            <MainStackNav.Screen component={CreateRequestForm} name={'CreateRequestForm'} />
            <MainStackNav.Screen component={CreateRequestOffers} name={'CreateRequestOffers'} />
            <MainStackNav.Screen component={MerchantBidDetail} name={'MerchantBidDetail'} />
            <MainStackNav.Screen component={ScannerScreen} name={'ScannerScreen'} />
            <MainStackNav.Screen component={MyQrScreen} name={'MyQrScreen'} />
            <MainStackNav.Screen component={OfferRedemptionHistory} name={'OfferRedemptionHistory'} />
            <MainStackNav.Screen component={SavedOffers} name={'SavedOffers'} />
            <MainStackNav.Screen component={CreateRequestSearching} name={'CreateRequestSearching'} />
            <MainStackNav.Screen component={CreateRequestResults} name={'CreateRequestResults'} />
        </MainStackNav.Navigator>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: colors.white
    }
});


