import { StyleSheet, Text, View } from 'react-native';

export default function MoreScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>More</Text>

      <Text style={styles.subtitle}>
        Settings, Mistake Bank, Win Log, Backup.
      </Text>
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
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
  },
  subtitle: {
    color: '#D1D5DB',
    marginTop: 10,
    fontSize: 18,
  },
});