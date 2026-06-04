import { StyleSheet, Text, View } from 'react-native';

export default function ReviewScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Review Screen</Text>
      <Text style={styles.subtitle}>Review your cards here</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    backgroundColor: '#111827',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
  },
  subtitle: {
    marginTop: 12,
    fontSize: 18,
    color: 'white',
  },
});