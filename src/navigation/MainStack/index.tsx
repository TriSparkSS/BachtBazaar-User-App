import React, { useCallback } from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { StyleSheet, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { colors } from '../../helpers/styles';
import { BottomStack } from './BottomStack';
import StoreDetail from '../../screens/MainFlow/StoreDetail';
import BannerDetail from '../../screens/MainFlow/BannerDetail';
import OfferDetail from '../../screens/MainFlow/OfferDetail';
import ProductDetail from '../../screens/MainFlow/ProductDetail';
import ServiceDetail from '../../screens/MainFlow/ServiceDetail';
import Cart from '../../screens/MainFlow/Cart';
import DeliveryOrders from '../../screens/MainFlow/DeliveryOrders';
import DeliveryOrderDetail from '../../screens/MainFlow/DeliveryOrders/DeliveryOrderDetail';
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
import LegalWebScreen from '../../screens/MainFlow/LegalWebScreen';
import HelpSupport from '../../screens/MainFlow/HelpSupport';
import CreateHelpTicket from '../../screens/MainFlow/HelpSupport/CreateHelpTicket';
import HelpTicketDetail from '../../screens/MainFlow/HelpSupport/HelpTicketDetail';
import FAQ from '../../screens/MainFlow/FAQ';
import VideoGuide from '../../screens/MainFlow/VideoGuide';
import HelpArticles from '../../screens/MainFlow/HelpArticles';
import Contact from '../../screens/MainFlow/Contact';
import InviteEarn from '../../screens/MainFlow/InviteEarn';
import Notifications from '../../screens/MainFlow/Notifications';
import Language from '../../screens/MainFlow/Language';
import BachatCircleLanding from '../../screens/MainFlow/BachatCircle/LandingScreen';
import BachatCircleCreate from '../../screens/MainFlow/BachatCircle/CreateCircleScreen';
import BachatCircleAddMembers from '../../screens/MainFlow/BachatCircle/AddMembersScreen';
import BachatCircleFeed from '../../screens/MainFlow/BachatCircle/CircleFeedScreen';
import BachatCircleMembers from '../../screens/MainFlow/BachatCircle/MembersScreen';
import BachatCircleShareOffer from '../../screens/MainFlow/BachatCircle/ShareOfferScreen';
import BachatCircleOfferDetail from '../../screens/MainFlow/BachatCircle/CircleOfferDetailScreen';
import BachatCircleNotifications from '../../screens/MainFlow/BachatCircle/CircleNotificationsScreen';
import Rewards from '../../screens/MainFlow/Rewards';
import RewardDetail from '../../screens/MainFlow/Rewards/RewardDetail';
import WaitingForRequestBanner from '../../components/WaitingForRequestBanner';
import {
  PendingDeliveryRequestProvider,
  usePendingDeliveryRequest,
} from '../../context/PendingDeliveryRequestContext';
import { MainStackParamList } from '../types';

const MainStackNav = createStackNavigator<MainStackParamList>();

/** Refresh waiting-order banner when MainStack (re)gains focus. */
const PendingDeliveryFocusSync = () => {
  const { refreshPendingFromApi } = usePendingDeliveryRequest();
  useFocusEffect(
    useCallback(() => {
      void refreshPendingFromApi();
    }, [refreshPendingFromApi]),
  );
  return null;
};

export const MainStack = () => {
    return (
        <PendingDeliveryRequestProvider>
            <View style={styles.root}>
                <PendingDeliveryFocusSync />
                <MainStackNav.Navigator
                    screenOptions={{
                        headerShown: false,
                        cardStyle: styles.container
                    }}
                    initialRouteName={'BottomStack'}
                >
                    <MainStackNav.Screen component={BottomStack} name={'BottomStack'} />
                    <MainStackNav.Screen component={StoreDetail} name={'StoreDetail'} />
                    <MainStackNav.Screen component={BannerDetail} name={'BannerDetail'} />
                    <MainStackNav.Screen component={OfferDetail} name={'OfferDetail'} />
                    <MainStackNav.Screen component={ProductDetail} name={'ProductDetail'} />
                    <MainStackNav.Screen component={ServiceDetail} name={'ServiceDetail'} />
                    <MainStackNav.Screen component={Cart} name={'Cart'} />
                    <MainStackNav.Screen component={DeliveryOrders} name={'DeliveryOrders'} />
                    <MainStackNav.Screen
                      component={DeliveryOrderDetail}
                      name={'DeliveryOrderDetail'}
                    />
                    <MainStackNav.Screen component={RequestDelivery} name={'RequestDelivery'} />
                    <MainStackNav.Screen
                      component={RequestDeliverySent}
                      name={'RequestDeliverySent'}
                      options={{ gestureEnabled: false }}
                    />
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
                    <MainStackNav.Screen component={LegalWebScreen} name={'LegalWebScreen'} />
                    <MainStackNav.Screen component={HelpSupport} name={'HelpSupport'} />
                    <MainStackNav.Screen component={CreateHelpTicket} name={'CreateHelpTicket'} />
                    <MainStackNav.Screen component={HelpTicketDetail} name={'HelpTicketDetail'} />
                    <MainStackNav.Screen component={FAQ} name={'FAQ'} />
                    <MainStackNav.Screen component={VideoGuide} name={'VideoGuide'} />
                    <MainStackNav.Screen
                      component={HelpArticles}
                      name={'HelpArticles'}
                    />
                    <MainStackNav.Screen component={Contact} name={'Contact'} />
                    <MainStackNav.Screen component={InviteEarn} name={'InviteEarn'} />
                    <MainStackNav.Screen component={Notifications} name={'Notifications'} />
                    <MainStackNav.Screen component={Language} name={'Language'} />
                    <MainStackNav.Screen
                      component={BachatCircleLanding}
                      name={'BachatCircle'}
                    />
                    <MainStackNav.Screen
                      component={BachatCircleCreate}
                      name={'BachatCircleCreate'}
                    />
                    <MainStackNav.Screen
                      component={BachatCircleAddMembers}
                      name={'BachatCircleAddMembers'}
                    />
                    <MainStackNav.Screen
                      component={BachatCircleFeed}
                      name={'BachatCircleFeed'}
                    />
                    <MainStackNav.Screen
                      component={BachatCircleMembers}
                      name={'BachatCircleMembers'}
                    />
                    <MainStackNav.Screen
                      component={BachatCircleShareOffer}
                      name={'BachatCircleShareOffer'}
                    />
                    <MainStackNav.Screen
                      component={BachatCircleOfferDetail}
                      name={'BachatCircleOfferDetail'}
                    />
                    <MainStackNav.Screen
                      component={BachatCircleNotifications}
                      name={'BachatCircleNotifications'}
                    />
                    <MainStackNav.Screen component={Rewards} name={'Rewards'} />
                    <MainStackNav.Screen component={RewardDetail} name={'RewardDetail'} />
                </MainStackNav.Navigator>
                <WaitingForRequestBanner />
            </View>
        </PendingDeliveryRequestProvider>
    );
};

const styles = StyleSheet.create({
    root: {
        flex: 1,
    },
    container: {
        backgroundColor: colors.white
    }
});
