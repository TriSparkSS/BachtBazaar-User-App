import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { StyleSheet } from 'react-native';
import { colors } from '../../helpers/styles';
import { BottomStack } from './BottomStack';

const MainStackNav = createStackNavigator();

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
        
        </MainStackNav.Navigator>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: colors.white
    }
});


