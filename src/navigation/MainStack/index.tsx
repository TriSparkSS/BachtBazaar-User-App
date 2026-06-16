import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { StyleSheet } from 'react-native';
import { colors } from '../../helpers/styles';
import { BottomStack } from './BottomStack';
import StoreDetail from '../../screens/MainFlow/StoreDetail';
import OfferDetail from '../../screens/MainFlow/OfferDetail';
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
        </MainStackNav.Navigator>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: colors.white
    }
});


