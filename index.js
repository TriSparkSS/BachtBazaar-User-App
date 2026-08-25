/**
 * @format
 */

import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';
import { registerBackgroundPushHandler } from './src/services/pushNotificationHandler';

// Must register before the app mounts (quit / background FCM).
registerBackgroundPushHandler();

AppRegistry.registerComponent(appName, () => App);
