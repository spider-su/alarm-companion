import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppNavigation } from './src/navigation';
import * as Notifications from 'expo-notifications';
import { useEffect } from 'react';

Notifications.setNotificationHandler({ handleNotification: async () => ({ shouldPlaySound: true, shouldSetBadge: false, shouldShowBanner: true, shouldShowList: true }) });

export default function App() {
  useEffect(() => {
    void Notifications.setNotificationChannelAsync('routines', { name: 'Routine reminders', importance: Notifications.AndroidImportance.HIGH, vibrationPattern: [0, 200, 100, 200], sound: 'default' });
  }, []);
  return (
    <SafeAreaProvider>
      <AppNavigation />
      <StatusBar style="auto" />
    </SafeAreaProvider>
  );
}
