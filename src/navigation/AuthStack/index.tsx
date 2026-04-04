import React from "react";
import { createStackNavigator } from "@react-navigation/stack";
import screens from "../../screens";
import { StyleSheet } from "react-native";
import { colors } from "../../helpers/styles";


const AuthStackNav = createStackNavigator();

export const AuthStack = () => {
    return (
        <AuthStackNav.Navigator
            screenOptions={{
                headerShown: false,
                cardStyle: styles.container
            }}
            initialRouteName='Splash'
        >
            <AuthStackNav.Screen component={screens.Splash} name='Splash' />
            <AuthStackNav.Screen component={screens.Login} name='Login' />
            <AuthStackNav.Screen component={screens.Forgot} name='Forgot' />
            <AuthStackNav.Screen component={screens.OTPCode} name='OTPCode' />
            <AuthStackNav.Screen component={screens.Successfull} name='Successfull' />
            <AuthStackNav.Screen component={screens.ProfileSetup} name='ProfileSetup' />
        </AuthStackNav.Navigator>
    )
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: colors.white
    }
});