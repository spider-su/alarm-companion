import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { appSafeAreaEdges } from '../platform/safeArea';

export function HomeScreen() {
  return (
    <SafeAreaView edges={appSafeAreaEdges} style={styles.safe}>
      <View style={styles.content}>
        <Text style={styles.eyebrow}>STARTER APP</Text>
        <Text style={styles.title}>Your app starts here</Text>
        <Text style={styles.body}>Replace this screen with a first useful flow.</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F5F7FA' },
  content: { flex: 1, justifyContent: 'center', padding: 24 },
  eyebrow: { color: '#526178', fontSize: 12, fontWeight: '700', letterSpacing: 1.2 },
  title: { color: '#172033', fontSize: 30, fontWeight: '700', marginTop: 8 },
  body: { color: '#526178', fontSize: 16, lineHeight: 24, marginTop: 12 }
});
