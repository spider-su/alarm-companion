import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppNavigation } from './src/navigation';

export default function App() {
  return (
    <SafeAreaProvider>
      <AppNavigation />
      <StatusBar style="auto" />
    </SafeAreaProvider>
  );
}
