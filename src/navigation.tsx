import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer, DarkTheme, DefaultTheme } from '@react-navigation/native';
import { useColorScheme } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HomeScreen } from './screens/HomeScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { AchievementsScreen } from './screens/AchievementsScreen';
import { VoiceLibraryScreen } from './screens/VoiceLibraryScreen';
import { getTabBarMetrics } from './platform/safeArea';

const Tab = createBottomTabNavigator();

function Tabs() {
  const insets = useSafeAreaInsets();
  const tabBar = getTabBarMetrics(insets.bottom);
  return (
    <Tab.Navigator screenOptions={{
      headerShown: false,
      tabBarStyle: { height: tabBar.height, paddingTop: tabBar.paddingTop, paddingBottom: tabBar.paddingBottom }
    }}>
      <Tab.Screen name="Home" component={HomeScreen} options={{ title: 'Routines', tabBarLabel: 'Routines' }} />
      <Tab.Screen name="Settings" component={SettingsScreen} options={{ title: 'Settings', tabBarLabel: 'Settings' }} />
      <Tab.Screen name="Achievements" component={AchievementsScreen} options={{ title: 'Achievements', tabBarLabel: 'Progress' }} />
      <Tab.Screen name="VoiceLibrary" component={VoiceLibraryScreen} options={{ title: 'Voice Library', tabBarLabel: 'Voices' }} />
    </Tab.Navigator>
  );
}

export function AppNavigation() {
  const scheme = useColorScheme();
  return <NavigationContainer theme={scheme === 'dark' ? DarkTheme : DefaultTheme}><Tabs /></NavigationContainer>;
}
