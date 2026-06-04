import { router } from 'expo-router';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>CyberDeck</Text>

      <Text style={styles.subtitle}>
        Today is not a race.
      </Text>

      <TouchableOpacity 
        style={styles.button}
        onPress={() => router.push('/review')}>
        <Text style={styles.buttonText}>Tiny Review (5 Cards)</Text>
      </TouchableOpacity>

      <TouchableOpacity style={
        styles.button}
        onPress={() => router.push('/add')}>
        <Text style={styles.buttonText}>Add Card</Text>
      </TouchableOpacity>

      <TouchableOpacity style={
        styles.button}
        onPress={() => router.push('/browse')}>
        <Text style={styles.buttonText}>Browse Cards</Text>
      </TouchableOpacity>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          One remembered concept counts.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111827',
    padding: 24,
    justifyContent: 'center',
  },

  title: {
    fontSize: 40,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 12,
  },

  subtitle: {
    fontSize: 18,
    color: '#D1D5DB',
    marginBottom: 40,
  },

  button: {
    backgroundColor: '#2563EB',
    padding: 18,
    borderRadius: 12,
    marginBottom: 16,
  },

  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },

  footer: {
    marginTop: 30,
  },

  footerText: {
    color: '#9CA3AF',
    fontSize: 16,
    textAlign: 'center',
  },
});