import { getCardCount, getTotalReviews } from '@/src/database';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function HomeScreen() {
  const [totalCards, setTotalCards] = useState(0);
  const [totalReviews, setTotalReviews] = useState(0);

  useFocusEffect(
    useCallback(() => {
      async function loadStats() {
        const cardCount = await getCardCount();
        const reviewCount = await getTotalReviews();

        setTotalCards(cardCount);
        setTotalReviews(reviewCount);
      }

      loadStats();
    }, [])
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>CyberDeck</Text>

      <Text style={styles.subtitle}>
        One remembered concept counts.
      </Text>

      <View style={styles.statsContainer}>
        <View style={styles.statsBox}>
          <Text style={styles.statsLabel}>Total Cards</Text>
          <Text style={styles.statsNumber}>{totalCards}</Text>
        </View>

        <View style={styles.statsBox}>
          <Text style={styles.statsLabel}>Total Reviews</Text>
          <Text style={styles.statsNumber}>{totalReviews}</Text>
        </View>
      </View>

      <TouchableOpacity
        style={styles.button}
        onPress={() => router.push('/review')}>
        <Text style={styles.buttonText}>Start Review</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.button}
        onPress={() => router.push('/add')}>
        <Text style={styles.buttonText}>Add Card</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.button}
        onPress={() => router.push('/browse')}>
        <Text style={styles.buttonText}>Browse Cards</Text>
      </TouchableOpacity>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Build knowledge one card at a time.
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
    marginBottom: 10,
    textAlign: 'center',
  },

  subtitle: {
    fontSize: 18,
    color: '#D1D5DB',
    marginBottom: 28,
    textAlign: 'center',
  },

  statsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 28,
  },

  statsBox: {
    flex: 1,
    backgroundColor: '#1F2937',
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
  },

  statsLabel: {
    color: '#9CA3AF',
    fontSize: 14,
    marginBottom: 8,
  },

  statsNumber: {
    color: 'white',
    fontSize: 34,
    fontWeight: 'bold',
  },

  button: {
    backgroundColor: '#2563EB',
    padding: 18,
    borderRadius: 12,
    marginBottom: 14,
  },

  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },

  footer: {
    marginTop: 20,
  },

  footerText: {
    color: '#9CA3AF',
    textAlign: 'center',
    fontSize: 16,
  },
});                        