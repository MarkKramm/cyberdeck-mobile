import { getHomeSummaryStats } from '@/src/database';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function HomeScreen() {
  const [stats, setStats] = useState({ dueCount: 0, newCount: 0, totalCards: 0, totalReviews: 0 });

  useFocusEffect(
    useCallback(() => {
      async function loadStats() {
        const currentStats = await getHomeSummaryStats();
        setStats(currentStats);
      }
      loadStats();
    }, [])
  );

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>CyberDeck</Text>
      <Text style={styles.subtitle}>Today is not a race.</Text>

      <View style={styles.statsContainer}>
        <View style={styles.statsBox}>
          <Text style={styles.statsLabel}>Due Cards</Text>
          <Text style={[styles.statsNumber, stats.dueCount > 0 ? styles.alertText : null]}>
            {stats.dueCount}
          </Text>
        </View>

        <View style={styles.statsBox}>
          <Text style={styles.statsLabel}>New Cards</Text>
          <Text style={styles.statsNumber}>{stats.newCount}</Text>
        </View>
      </View>

      <View style={styles.globalMetrics}>
        <Text style={styles.metricText}>Total Collection: {stats.totalCards} cards</Text>
        <Text style={styles.metricText}>Lifetime Reviews: {stats.totalReviews}</Text>
      </View>

      <TouchableOpacity style={[styles.button, styles.primaryButton]} onPress={() => router.push('/review')}>
        <Text style={styles.buttonText}>Start Review</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.button} onPress={() => router.push('/add')}>
        <Text style={styles.buttonText}>Add New Card</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.button} onPress={() => router.push('/browse')}>
        <Text style={styles.buttonText}>Browse Vault</Text>
      </TouchableOpacity>

      <View style={styles.footer}>
        <Text style={styles.footerText}>"One remembered concept counts."</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#111827',
    padding: 24,
    justifyContent: 'center',
  },
  title: {
    fontSize: 42,
    fontWeight: 'bold',
    color: '#F9FAFB',
    marginBottom: 4,
    textAlign: 'center',
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 16,
    color: '#9CA3AF',
    marginBottom: 32,
    textAlign: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
  },
  statsBox: {
    flex: 1,
    backgroundColor: '#1F2937',
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#374151',
  },
  statsLabel: {
    color: '#9CA3AF',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
  },
  statsNumber: {
    color: '#FFFFFF',
    fontSize: 36,
    fontWeight: 'bold',
  },
  alertText: {
    color: '#3B82F6',
  },
  globalMetrics: {
    backgroundColor: '#111827',
    alignItems: 'center',
    marginBottom: 32,
    gap: 4,
  },
  metricText: {
    color: '#6B7280',
    fontSize: 13,
  },
  button: {
    backgroundColor: '#1F2937',
    padding: 18,
    borderRadius: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#374151',
  },
  primaryButton: {
    backgroundColor: '#2563EB',
    borderColor: '#3B82F6',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  footer: {
    marginTop: 24,
  },
  footerText: {
    color: '#4B5563',
    textAlign: 'center',
    fontSize: 14,
    fontStyle: 'italic',
  },
});