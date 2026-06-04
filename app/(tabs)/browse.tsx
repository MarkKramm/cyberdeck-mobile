import { getCards } from '@/src/cardStore';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

export default function BrowseScreen() {
  const [refreshKey, setRefreshKey] = useState(0);
  const currentCards = getCards();

  useFocusEffect(
    useCallback(() => {
      setRefreshKey((current) => current + 1);
    }, [])
  );

  return (
    <View key={refreshKey} style={styles.container}>
      <Text style={styles.title}>Browse Cards</Text>

      {currentCards.length === 0 ? (
        <Text style={styles.subtitle}>No cards yet. Add your first card.</Text>
      ) : (
        currentCards.map((card) => (
          <View key={card.id} style={styles.cardBox}>
            <Text style={styles.question}>{card.question}</Text>
            <Text style={styles.answer}>{card.answer}</Text>
          </View>
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111827',
    padding: 24,
    paddingTop: 60,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 24,
  },
  subtitle: {
    color: '#D1D5DB',
    fontSize: 18,
  },
  cardBox: {
    backgroundColor: '#1F2937',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  question: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  answer: {
    color: '#D1D5DB',
    fontSize: 16,
  },
});