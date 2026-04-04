import React, { useState } from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import Screens from '../../../screens';
import { colors } from '../../../helpers/styles';
import { StyleSheet } from 'react-native';

const BottomStackNav = createStackNavigator();

export const BottomStack = () => {
	const [currentRoute, setCurrentRoute] = useState('HomeScreen');

	return (
		<>
			<BottomStackNav.Navigator
				screenOptions={{
					headerShown: false,
					cardStyle: styles.container
				}}
				screenListeners={{
					state: (e) => {
						const state = e.data.state;
						if (state) {
							const routeName = state.routes[state.index]?.name;
							if (routeName) {
								setCurrentRoute(routeName);
							}
						}
					}
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
