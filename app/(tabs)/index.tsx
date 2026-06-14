import { getAllCards, getAllDecks, getAllWins, getHomeSummaryStats } from '@/src/database';
import { useEffect, useState } from 'react';
import { DeviceEventEmitter, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const WISDOM_QUOTES = [
  'One card today still counts.',
  'Small reviews build strong memory.',
  'Confusion is data. Use it.',
  'Your future self needs reps.',
  'Do the simple cards too.',
  'Consistency beats intensity.',
  'Review first. Improve second.',
  'Tiny progress is still progress.',
  'The basics are the root system.',
  'Your deck grows when you show up.',
  'One clear card is a win.',
  'Mistakes are just map markers.',
  'Repeat until it feels lighter.',
  'Systems beat motivation.',
  'Focus is part of security.',
  'Slow learning is still learning.',
  'Strong skills come from small reps.',
  'Review the weak spots gently.',
  'Build the habit, then scale.',
  'A clear deck clears the mind.',
  'Keep forging. Keep reviewing.'
];

type DeckStats = {
  id: number;
  name: string;
  color: string;
  count: number;
};

export default function HomeScreen({ isFocused }: { isFocused?: boolean }) {
  const [stats, setStats] = useState({ dueCount: 0, newCount: 0, totalCards: 0, totalReviews: 0, totalDecks: 0 });
  const [latestWin, setLatestWin] = useState<string | null>(null);
  const [quote, setQuote] = useState('');
  const [deckBreakdown, setDeckBreakdown] = useState<DeckStats[]>([]);

  async function loadDashboardData() {
    try {
      const currentStats = await getHomeSummaryStats();
      const historicWins = await getAllWins();
      const loadedDecks = await getAllDecks();
      const loadedCards = await getAllCards();

      setStats({ ...currentStats, totalDecks: loadedDecks.length });

      if (historicWins && historicWins.length > 0) {
        setLatestWin(historicWins[0].text);
      } else {
        setLatestWin(null);
      }

      const nowStr = new Date().toISOString();
      const countsMap: { [key: number]: number } = {};

      loadedDecks.forEach(deck => {
        countsMap[deck.id] = 0;
      });

      loadedCards.forEach(card => {
        const isDue = !card.due_at || card.due_at <= nowStr;

        if (isDue && countsMap[card.deck_id] !== undefined) {
          countsMap[card.deck_id]++;
        }
      });

      const breakdownData: DeckStats[] = loadedDecks
        .filter(deck => (countsMap[deck.id] || 0) > 0)
        .map(deck => ({
          id: deck.id,
          name: deck.name,
          color: deck.color || '#374151',
          count: countsMap[deck.id] || 0
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
  let statusTitle = 'Review Clear';
  let statusSubtext = 'No due cards right now. You can practice in Re-View Mode.';

  if (stats.totalCards === 0) {
    statusColor = '#60A5FA';
    statusTitle = 'Fresh Vault';
    statusSubtext = 'Create or merge import your first deck to begin.';
  } else if (stats.dueCount > 20) {
    statusColor = '#EF4444';
    statusTitle = 'Heavy Review Queue';
    statusSubtext = 'Start with a small batch. You do not need to finish all at once.';
  } else if (stats.dueCount > 5) {
    statusColor = '#F59E0B';
    statusTitle = 'Active Review Queue';
    statusSubtext = 'A focused review session would help today.';
  } else if (stats.dueCount > 0) {
    statusColor = '#EAB308';
    statusTitle = 'Light Review Queue';
    statusSubtext = 'A few cards are ready for review.';
  }

  const shouldCenterContent = deckBreakdown.length <= 3;

  return (
    <View style={styles.screenContainer}>
      <View style={styles.topCenteredHeaderSection}>
        <Text style={styles.title}>CYBERDECK</Text>

        <View style={[styles.statusPanel, { borderColor: statusColor }]}>
          <View style={styles.statusHeaderRow}>
            <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
            <Text style={[styles.statusTitle, { color: statusColor }]}>{statusTitle}</Text>
          </View>
          <Text style={styles.statusSubtext}>{statusSubtext}</Text>
        </View>

        <Text style={styles.wisdomQuote}>"{quote}"</Text>
      </View>

      <View style={styles.mainGrid}>
        <TouchableOpacity style={styles.indicatorCardBox} onPress={() => triggerTabShift(1)}>
          <Text style={styles.cardLabel}>🚨 Due Now</Text>
          <Text style={[styles.cardNumber, { color: statusColor }]}>{stats.dueCount}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.indicatorCardBox} onPress={() => triggerTabShift(1)}>
          <Text style={styles.cardLabel}>✨ New Cards</Text>
          <Text style={styles.cardNumber}>{stats.newCount}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.quickAccessActionsWrapper}>
        <TouchableOpacity style={[styles.actionRowStripButton, styles.forgeActionButton]} onPress={() => triggerTabShift(2)}>
          <View style={styles.actionRowInner}>
            <Text style={[styles.actionButtonMainText, styles.actionButtonForgeText]}>
              ➕ Forge Card
            </Text>
            <View style={styles.badgeNew}><Text style={styles.badgeTextNew}>ADD</Text></View>
          </View>
          <Text style={styles.actionButtonSecondaryText}>Create one manual flashcard</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.actionRowStripButton, styles.browseActionButton]} onPress={() => triggerTabShift(3)}>
          <View style={styles.actionRowInner}>
            <Text style={[styles.actionButtonMainText, styles.actionButtonBrowseText]}>
              🔍 Browse Vault
            </Text>
            <View style={styles.badgeOpen}><Text style={styles.badgeTextOpen}>OPEN</Text></View>
          </View>
          <Text style={styles.actionButtonSecondaryText}>Edit, search, move, and clean cards</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.breakdownListSectionContainer}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitleLabel}>📁 DUE BY DECK</Text>
          <Text style={styles.sectionCountLabel}>{deckBreakdown.length} active</Text>
        </View>

        <ScrollView
          style={styles.innerElementScroller}
          contentContainerStyle={[
            styles.baseBreakdownContent,
            shouldCenterContent ? styles.centeredBreakdownContent : styles.startBreakdownContent
          ]}
          showsVerticalScrollIndicator={true}
          nestedScrollEnabled={true}
        >
          {deckBreakdown.length === 0 ? (
            <View style={styles.caughtUpWrapper}>
              <Text style={styles.caughtUpEmoji}>✨</Text>
              <Text style={styles.caughtUpText}>No due cards right now</Text>
              <Text style={styles.caughtUpSubText}>
                {stats.totalCards === 0 ? 'Create or import cards to begin.' : 'Use Re-View Mode if you still want practice.'}
              </Text>
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
        <View style={[styles.winCardContainer, !latestWin && styles.emptyWinCardContainer]}>
          <Text style={[styles.winHeaderTitle, !latestWin && styles.emptyWinHeaderTitle]}>
            🏆 Latest Win
          </Text>

          <ScrollView style={styles.winTextScrollView} nestedScrollEnabled={true} showsVerticalScrollIndicator={false}>
            <Text style={[styles.winTextContents, !latestWin && styles.emptyWinTextContents]}>
              {latestWin ? `${latestWin}` : 'No win logged yet. Add one when something finally clicks.'}
            </Text>
          </ScrollView>
        </View>

        <View style={styles.footerHealthDetailsBar}>
          <Text style={styles.footerInlineStatsText}>Decks: {stats.totalDecks}</Text>
          <Text style={styles.footerInlineDivider}>|</Text>
          <Text style={styles.footerInlineStatsText}>Cards: {stats.totalCards}</Text>
          <Text style={styles.footerInlineDivider}>|</Text>
          <Text style={styles.footerInlineStatsText}>Reviews: {stats.totalReviews}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    backgroundColor: '#111827',
    paddingHorizontal: 24,
    paddingTop: 64,
    paddingBottom: 16
  },
  topCenteredHeaderSection: {
    alignItems: 'center',
    marginBottom: 16
  },
  title: {
    fontSize: 42,
    fontWeight: '300',
    color: '#FFFFFF',
    marginBottom: 12,
    textAlign: 'center',
    letterSpacing: 4
  },
  statusPanel: {
    width: '100%',
    backgroundColor: '#1F2937',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: 1.5,
    marginBottom: 10,
    alignItems: 'center'
  },
  statusHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8
  },
  statusTitle: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    textAlign: 'center'
  },
  statusSubtext: {
    color: '#9CA3AF',
    fontSize: 12,
    lineHeight: 16,
    textAlign: 'center',
    fontWeight: '600'
  },
  wisdomQuote: {
    color: '#9CA3AF',
    fontSize: 12,
    fontStyle: 'italic',
    lineHeight: 16,
    textAlign: 'center',
    paddingHorizontal: 8
  },

  mainGrid: {
    flexDirection: 'row',
    gap: 14,
    marginBottom: 14
  },
  indicatorCardBox: {
    flex: 1,
    backgroundColor: '#1F2937',
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#374151'
  },
  cardLabel: {
    color: '#9CA3AF',
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    marginBottom: 4,
    letterSpacing: 0.5,
    textAlign: 'center'
  },
  cardNumber: {
    fontSize: 30,
    fontWeight: 'bold',
    color: '#FFFFFF'
  },

  quickAccessActionsWrapper: {
    gap: 10,
    marginBottom: 14
  },
  actionRowStripButton: {
    width: '100%',
    backgroundColor: '#1F2937',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 14,
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    borderTopWidth: 0,
    borderBottomWidth: 0,
    borderLeftWidth: 4,
    borderRightWidth: 4
  },
  forgeActionButton: {
    borderLeftColor: '#10B981',
    borderRightColor: '#10B981'
  },
  browseActionButton: {
    borderLeftColor: '#60A5FA',
    borderRightColor: '#60A5FA'
  },
  actionRowInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    position: 'relative',
    marginBottom: 3
  },
  badgeNew: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#10B981',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    position: 'absolute',
    right: 4
  },
  badgeTextNew: {
    color: '#10B981',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5
  },
  badgeOpen: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#60A5FA',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    position: 'absolute',
    right: 4
  },
  badgeTextOpen: {
    color: '#60A5FA',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5
  },
  actionButtonMainText: {
    fontWeight: '900',
    fontSize: 17,
    marginBottom: 2,
    textAlign: 'center',
    letterSpacing: 0.3
  },
  actionButtonForgeText: {
    color: '#A7F3D0'
  },
  actionButtonBrowseText: {
    color: '#BFDBFE'
  },
  actionButtonSecondaryText: {
    color: '#9CA3AF',
    fontWeight: '600',
    fontSize: 11,
    letterSpacing: 0.2,
    textAlign: 'center'
  },

  breakdownListSectionContainer: {
    flex: 1,
    minHeight: 120,
    backgroundColor: '#1F2937',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#374151',
    marginBottom: 14
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6
  },
  sectionTitleLabel: {
    color: '#D1D5DB',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1
  },
  sectionCountLabel: {
    color: '#6B7280',
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase'
  },
  innerElementScroller: {
    flex: 1
  },
  baseBreakdownContent: {
    flexGrow: 1
  },
  centeredBreakdownContent: {
    justifyContent: 'center'
  },
  startBreakdownContent: {
    justifyContent: 'flex-start'
  },
  breakdownRowLine: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#2D3748'
  },
  deckIndicatorMiniDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginRight: 10
  },
  deckBreakdownNameText: {
    color: '#D1D5DB',
    fontSize: 13,
    fontWeight: '700',
    flex: 1
  },
  deckBreakdownCountText: {
    color: '#9CA3AF',
    fontSize: 11,
    fontWeight: '800'
  },

  caughtUpWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8
  },
  caughtUpEmoji: {
    fontSize: 24,
    marginBottom: 4
  },
  caughtUpText: {
    color: '#10B981',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.3,
    textAlign: 'center'
  },
  caughtUpSubText: {
    color: '#6B7280',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 3,
    textAlign: 'center'
  },

  anchoredBottomSection: {
    marginTop: 'auto',
    gap: 10
  },
  winCardContainer: {
    backgroundColor: '#1F2937',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 78
  },
  winHeaderTitle: {
    color: '#10B981',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5,
    marginBottom: 5,
    textAlign: 'center'
  },
  winTextScrollView: {
    maxHeight: 46,
    width: '100%'
  },
  winTextContents: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
    textAlign: 'center'
  },
  emptyWinCardContainer: {
    borderColor: '#374151'
  },
  emptyWinHeaderTitle: {
    color: '#FFFFFF'
  },
  emptyWinTextContents: {
    color: '#6B7280',
    fontStyle: 'italic',
    fontWeight: '500'
  },

  footerHealthDetailsBar: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
    flexWrap: 'wrap'
  },
  footerInlineStatsText: {
    color: '#6B7280',
    fontSize: 11,
    fontWeight: '800'
  },
  footerInlineDivider: {
    color: '#2D3748',
    fontSize: 11
  }
});