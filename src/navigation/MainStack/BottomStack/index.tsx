import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import Screens from '../../../screens';
import { colors } from '../../../helpers/styles';
import { StyleSheet } from 'react-native';

const BottomStackNav = createStackNavigator();

export const BottomStack = () => {
	return (
		<>
			<BottomStackNav.Navigator
				screenOptions={{
					headerShown: false,
					cardStyle: styles.container
				}}
				initialRouteName={'HomeScreen'}
			>
				<BottomStackNav.Screen component={Screens.HomeScreen} name='HomeScreen' />
			</BottomStackNav.Navigator>
		</>
	);
};

const styles = StyleSheet.create({
	container: {
		backgroundColor: colors.bg,
		flex: 1
	},
	loadingContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		backgroundColor: colors.bg
	}
});
