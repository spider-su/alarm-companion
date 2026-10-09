import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { appSafeAreaEdges } from '../platform/safeArea';

export function SettingsScreen() {
  return (
    <SafeAreaView edges={appSafeAreaEdges} style={styles.safe}>
      <View style={styles.content}>
        <Text style={styles.title}>Settings</Text>
        <Text style={styles.body}>Add app preferences and account controls here.</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F5F7FA' },
  content: { flex: 1, padding: 24, paddingTop: 32 },
  title: { color: '#172033', fontSize: 28, fontWeight: '700' },
  body: { color: '#526178', fontSize: 16, lineHeight: 24, marginTop: 12 }
});
