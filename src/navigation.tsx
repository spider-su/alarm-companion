import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer, DarkTheme, DefaultTheme } from '@react-navigation/native';
import { useColorScheme } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DashboardScreen } from './screens/DashboardScreen';
import { RoutinesScreen } from './screens/HomeScreen';
import { FamilyScreen } from './screens/FamilyScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { getTabBarMetrics } from './platform/safeArea';
import type { AppTabParamList } from './navigationTypes';

const Tab = createBottomTabNavigator<AppTabParamList>();

function Tabs() {
  const insets = useSafeAreaInsets();
  const tabBar = getTabBarMetrics(insets.bottom);
  return (
    <Tab.Navigator screenOptions={{
      headerShown: false,
      tabBarStyle: { height: tabBar.height, paddingTop: tabBar.paddingTop, paddingBottom: tabBar.paddingBottom }
    }}>
      <Tab.Screen name="Home" component={DashboardScreen} options={{ title: 'Home', tabBarLabel: 'Home', tabBarIcon: ({ color, size }) => <Ionicons name="home-outline" color={color} size={size} /> }} />
      <Tab.Screen name="Routines" component={RoutinesScreen} options={{ title: 'Routines', tabBarLabel: 'Routines', tabBarIcon: ({ color, size }) => <Ionicons name="alarm-outline" color={color} size={size} /> }} />
      <Tab.Screen name="Family" component={FamilyScreen} options={{ title: 'Family', tabBarLabel: 'Family', tabBarIcon: ({ color, size }) => <Ionicons name="people-outline" color={color} size={size} /> }} />
      <Tab.Screen name="Settings" component={SettingsScreen} options={{ title: 'Settings', tabBarLabel: 'Settings', tabBarIcon: ({ color, size }) => <Ionicons name="settings-outline" color={color} size={size} /> }} />
    </Tab.Navigator>
  );
}

export function AppNavigation() {
  const scheme = useColorScheme();
  return <NavigationContainer theme={scheme === 'dark' ? DarkTheme : DefaultTheme}><Tabs /></NavigationContainer>;
}
