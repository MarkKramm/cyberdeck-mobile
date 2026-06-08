import { getAllCards, getAllDecks, getAllWins, getHomeSummaryStats } from '@/src/database';
import { useEffect, useState } from 'react';
import { DeviceEventEmitter, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const WISDOM_QUOTES = [
  "One card a day is progress. Consistency is your greatest defense.",
  "Learning is a process of decryption. Keep studying.",
  "Your database is a weapon. Keep it sharp.",
  "Knowledge is the only asset that compounds over time.",
  "Don't worry about the algorithm; worry about the habit.",
  "Small daily adjustments build unbreakable mental foundations.",
  "In cybersecurity, curiosity is your primary exploitation vector.",
  "Every failure in active recall is just a data correction event.",
  "Secure your future self by mastering the fundamentals today.",
  "The quiet repetition behind closed doors builds elite execution.",
  "Be patient with your learning path. Systems outperform intent.",
  "Stay focused. Confusion is just unorganized telemetry data.",
  "A deck fully reviewed is an entry point thoroughly secured.",
  "Mistakes are data. Analyze them, resolve them, grow stronger.",
  "Great architects master simple structures before scaling up.",
  "Protect your attention span. Focus is your greatest shield.",
  "The best defense against a difficult subject is relentless exposure.",
  "Brick by brick, card by card, entry by entry. Keep forging.",
  "Do not skip the simple cards. The root exploit is always basic.",
  "Commitment means showing up when the novelty has worn off.",
  "Your mind is a vault. Treat it with structural integrity."
];

type DeckStats = {
  id: number;
  name: string;
  color: string;
  count: number;
};

export default function HomeScreen({ isFocused }: { isFocused?: boolean }) {
  const [stats, setStats] = useState({ dueCount: 0, newCount: 0, totalCards: 0, totalReviews: 0 });
  const [latestWin, setLatestWin] = useState<string | null>(null);
  const [quote, setQuote] = useState("");
  const [deckBreakdown, setDeckBreakdown] = useState<DeckStats[]>([]);

  async function loadDashboardData() {
    try {
      const currentStats = await getHomeSummaryStats();
      const historicWins = await getAllWins();
      const loadedDecks = await getAllDecks();
      const loadedCards = await getAllCards();

      setStats(currentStats);
      
      if (historicWins && historicWins.length > 0) {
        setLatestWin(historicWins[0].text);
      } else {
        setLatestWin(null);
      }

      // Filter breakdown strictly by cards that are CURRENTLY DUE or NEW
      const nowStr = new Date().toISOString();
      const countsMap: { [key: number]: number } = {};
      loadedDecks.forEach(d => { countsMap[d.id] = 0; });
      
      loadedCards.forEach(c => {
        const isDue = !c.due_at || c.due_at <= nowStr;
        if (isDue && countsMap[c.deck_id] !== undefined) {
          countsMap[c.deck_id]++;
        }
      });

      const breakdownData: DeckStats[] = loadedDecks
        .filter(d => (countsMap[d.id] || 0) > 0)
        .map(d => ({
          id: d.id,
          name: d.name,
          color: d.color || '#374151',
          count: countsMap[d.id] || 0
        }))
        .sort((a, b) => b.count - a.count);
      
      setDeckBreakdown(breakdownData);

      const randomQuote = WISDOM_QUOTES[Math.floor(Math.random() * WISDOM_QUOTES.length)];
      setQuote(randomQuote);
    } catch (error) {
      console.error('Error loading dashboard payload:', error);
    }
  }

  useEffect(() => {
    if (isFocused) {
      loadDashboardData();
    }
  }, [isFocused]);

  function triggerTabShift(targetPageNum: number) {
    DeviceEventEmitter.emit('switchTabSignal', targetPageNum);
  }

  let statusColor = '#10B981'; 
  let statusText = 'SYSTEM STATUS: SECURE (All items caught up)';
  
  if (stats.dueCount > 20) { statusColor = '#EF4444'; statusText = 'SYSTEM STATUS: OVERFLOW (Action required)'; }
  else if (stats.dueCount > 5) { statusColor = '#F59E0B'; statusText = 'SYSTEM STATUS: STAGED (Active queue loaded)'; }
  else if (stats.dueCount > 0) { statusColor = '#EAB308'; statusText = 'SYSTEM STATUS: WARN (Remaining targets pending)'; }

  return (
    <View style={styles.screenContainer}>
      <View style={styles.topCenteredHeaderSection}>
        <Text style={styles.title}>CYBERDECK</Text>
        <View style={[styles.statusBadgeWrapper, { borderColor: statusColor }]}>
          <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
          <Text style={[styles.statusText, { color: statusColor }]}>{statusText}</Text>
        </View>
        <Text style={styles.wisdomQuote}>"{quote}"</Text>
      </View>

      <View style={styles.mainGrid}>
        <TouchableOpacity style={styles.indicatorCardBox} onPress={() => triggerTabShift(1)}>
          <Text style={styles.cardLabel}>🚨 Due Cards</Text>
          <Text style={[styles.cardNumber, { color: statusColor }]}>{stats.dueCount}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.indicatorCardBox} onPress={() => triggerTabShift(1)}>
          <Text style={styles.cardLabel}>✨ New Cards</Text>
          <Text style={[styles.cardNumber, { color: '#FFFFFF' }]}>{stats.newCount}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.quickAccessActionsWrapper}>
        <TouchableOpacity style={styles.actionRowStripButton} onPress={() => triggerTabShift(2)}>
          <View style={styles.actionRowInner}>
            <Text style={styles.actionButtonMainText}>➕ Forge Card Entry</Text>
            <View style={styles.badgeNew}><Text style={styles.badgeTextNew}>NEW</Text></View>
          </View>
          <Text style={styles.actionButtonSecondaryText}>Add a new card to your personal database</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionRowStripButton} onPress={() => triggerTabShift(3)}>
          <View style={styles.actionRowInner}>
            <Text style={styles.actionButtonMainText}>🔍 Browse Cards Vault</Text>
            <View style={styles.badgeOpen}><Text style={styles.badgeTextOpen}>OPEN</Text></View>
          </View>
          <Text style={styles.actionButtonSecondaryText}>Review and organize your stored knowledge</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.breakdownListSectionContainer}>
        <Text style={styles.sectionTitleLabel}>📁 DECK SECURED DEPLOYMENT</Text>
        <ScrollView 
            style={styles.innerElementScroller} 
            contentContainerStyle={[
              styles.baseBreakdownContent, 
              deckBreakdown.length <= 3 ? styles.centeredBreakdownContent : styles.startBreakdownContent
            ]}
            showsVerticalScrollIndicator={true} 
            nestedScrollEnabled={true}
        >
          {deckBreakdown.length === 0 ? (
            <View style={styles.caughtUpWrapper}>
              <Text style={styles.caughtUpEmoji}>✨</Text>
              <Text style={styles.caughtUpText}>ALL COMPARTMENTS SECURED</Text>
              <Text style={styles.caughtUpSubText}>0 targets pending review logs</Text>
            </View>
          ) : (
            deckBreakdown.map((item) => (
              <View key={item.id} style={styles.breakdownRowLine}>
                <View style={[styles.deckIndicatorMiniDot, { backgroundColor: item.color }]} />
                <Text style={styles.deckBreakdownNameText} numberOfLines={1}>{item.name}</Text>
                <Text style={styles.deckBreakdownCountText}>{item.count} due</Text>
              </View>
            ))
          )}
        </ScrollView>
      </View>

      <View style={styles.anchoredBottomSection}>
        {latestWin && (
          <View style={styles.winCardContainer}>
            <Text style={styles.winHeaderTitle}>🏆 LATEST SYSTEM BREAKTHROUGH</Text>
            <Text style={styles.winTextContents}>✨ {latestWin}</Text>
          </View>
        )}
        <View style={styles.footerHealthDetailsBar}>
          <Text style={styles.footerInlineStatsText}>Total Cards: {stats.totalCards}</Text>
          <Text style={styles.footerInlineDivider}>|</Text>
          <Text style={styles.footerInlineStatsText}>Total Card Reviews: {stats.totalReviews}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screenContainer: { flex: 1, backgroundColor: '#111827', paddingHorizontal: 24, paddingTop: 80, paddingBottom: 16 },
  topCenteredHeaderSection: { alignItems: 'center', marginBottom: 20 },
  title: { fontSize: 44, fontWeight: '300', color: '#FFFFFF', marginBottom: 16, textAlign: 'center', letterSpacing: 4 },
  wisdomQuote: { color: '#9CA3AF', fontSize: 13, fontStyle: 'italic', lineHeight: 18, textAlign: 'center', paddingHorizontal: 8 },
  statusBadgeWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1F2937', paddingVertical: 6, paddingHorizontal: 14, borderRadius: 20, borderWidth: 1, marginBottom: 14 },
  statusDot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  statusText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5, textTransform: 'uppercase' },
  mainGrid: { flexDirection: 'row', gap: 14, marginBottom: 16 },
  indicatorCardBox: { flex: 1, backgroundColor: '#1F2937', paddingVertical: 16, borderRadius: 16, alignItems: 'center', borderWidth: 1, borderColor: '#374151' },
  cardLabel: { color: '#9CA3AF', fontSize: 12, fontWeight: '700', textTransform: 'uppercase', marginBottom: 6, letterSpacing: 0.5 },
  cardNumber: { fontSize: 30, fontWeight: 'bold' },
  quickAccessActionsWrapper: { gap: 10, marginBottom: 18 },
  
  actionRowStripButton: { width: '100%', backgroundColor: '#1F2937', paddingVertical: 6, paddingHorizontal: 16, borderRadius: 12, flexDirection: 'column', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#374151' },
  actionRowInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', width: '100%', position: 'relative', marginBottom: 4 },
  
  badgeNew: { backgroundColor: 'transparent', borderWidth: 1, borderColor: '#10B981', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, position: 'absolute', right: 4 },
  badgeTextNew: { color: '#10B981', fontSize: 9, fontWeight: '900', letterSpacing: 0.5 },
  badgeOpen: { backgroundColor: 'transparent', borderWidth: 1, borderColor: '#60A5FA', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, position: 'absolute', right: 4 },
  badgeTextOpen: { color: '#60A5FA', fontSize: 9, fontWeight: '900', letterSpacing: 0.5 },
  
  actionButtonMainText: { color: '#60A5FA', fontWeight: '800', fontSize: 19, marginBottom: 2, textAlign: 'center' },
  actionButtonSecondaryText: { color: '#9CA3AF', fontWeight: '500', fontSize: 11, letterSpacing: 0.2, textAlign: 'center' },
  
  // Kept original comfortable padding settings
  breakdownListSectionContainer: { flex: 1, minHeight: 120, backgroundColor: '#1F2937', padding: 14, borderRadius: 16, borderWidth: 1, borderColor: '#374151', marginBottom: 16 },
  innerElementScroller: { flex: 1 },
  
  baseBreakdownContent: { flexGrow: 1 },
  centeredBreakdownContent: { justifyContent: 'center' },
  startBreakdownContent: { justifyContent: 'flex-start' },
  
  // Shrunk title space tightly down to 2 so list starts immediately and avoids cutting the 4th row
  sectionTitleLabel: { color: '#6B7280', fontSize: 10, fontWeight: '800', letterSpacing: 1, marginBottom: 2 },
  
  // RESTORED original beautiful vertical spacing heights so HR lines breathe nicely around text
  breakdownRowLine: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#2D3748' },
  deckIndicatorMiniDot: { width: 6, height: 6, borderRadius: 3, marginRight: 10 },
  deckBreakdownNameText: { color: '#D1D5DB', fontSize: 13, fontWeight: '600', flex: 1 },
  deckBreakdownCountText: { color: '#9CA3AF', fontSize: 11, fontWeight: '600' },
  
  caughtUpWrapper: { alignItems: 'center', justifyContent: 'center', paddingVertical: 8 },
  caughtUpEmoji: { fontSize: 24, marginBottom: 4 },
  caughtUpText: { color: '#10B981', fontSize: 12, fontWeight: '800', letterSpacing: 0.5, textAlign: 'center' },
  caughtUpSubText: { color: '#6B7280', fontSize: 11, fontWeight: '500', marginTop: 2, textAlign: 'center' },
  anchoredBottomSection: { marginTop: 'auto', gap: 12 },
  winCardContainer: { backgroundColor: '#1F2937', padding: 14, borderRadius: 16, borderWidth: 1, borderColor: '#10B981', alignItems: 'center', justifyContent: 'center' },
  winHeaderTitle: { color: '#10B981', fontSize: 10, fontWeight: '800', letterSpacing: 0.5, marginBottom: 4, textAlign: 'center' },
  winTextContents: { color: '#FFFFFF', fontSize: 13, fontWeight: '600', lineHeight: 18, textAlign: 'center' },
  footerHealthDetailsBar: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, paddingVertical: 4 },
  footerInlineStatsText: { color: '#6B7280', fontSize: 11, fontWeight: '700' },
  footerInlineDivider: { color: '#2D3748', fontSize: 11 }
});