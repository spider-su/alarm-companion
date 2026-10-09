import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer, DarkTheme, DefaultTheme } from '@react-navigation/native';
import { useColorScheme } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HomeScreen } from './screens/HomeScreen';
import { SettingsScreen } from './screens/SettingsScreen';
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
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
}

export function AppNavigation() {
  const scheme = useColorScheme();
  return <NavigationContainer theme={scheme === 'dark' ? DarkTheme : DefaultTheme}><Tabs /></NavigationContainer>;
}
