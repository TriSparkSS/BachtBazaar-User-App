/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import React, { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AppNavigation } from './src/navigation';
import { AppProvider } from './src/context/AppContext';
import { AppAlertProvider } from './src/components/AppAlertProvider';
import { ensureFirebaseAppCheck } from './src/services/firebaseAppCheck';

function App(): React.JSX.Element {
  useEffect(() => {
    void ensureFirebaseAppCheck();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AppProvider>
        <AppAlertProvider>
          <AppNavigation />
        </AppAlertProvider>
      </AppProvider>
    </GestureHandlerRootView>
  );
}
export default App;
