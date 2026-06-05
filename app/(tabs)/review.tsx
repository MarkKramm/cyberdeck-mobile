import { DbCard, DbDeck, getAllDecks, getDueCards, rateCard } from '@/src/database';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function ReviewScreen() {
    const [decks, setDecks] = useState<DbDeck[]>([]);
    const [selectedDeckIdFilter, setSelectedDeckIdFilter] = useState<string>('All');
    const [dueCards, setDueCards] = useState<DbCard[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [showAnswer, setShowAnswer] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    async function refreshReviewQueue(deckFilter: string) {
        setIsLoading(true);
        try {
            const activeDecks = await getAllDecks();
            const targetedDueQueue = await getDueCards(30, deckFilter);
            
            setDecks(activeDecks);
            setDueCards(targetedDueQueue);
            setCurrentIndex(0);
            setShowAnswer(false);
        } catch (error) {
            console.error('Error fetching review queue data:', error);
        } finally {
            setIsLoading(false);
        }
    }

    useFocusEffect(
        useCallback(() => {
            refreshReviewQueue(selectedDeckIdFilter);
        }, [selectedDeckIdFilter])
    );

    async function handleFilterChange(deckIdStr: string) {
        setSelectedDeckIdFilter(deckIdStr);
    }

    async function handleScoreSelection(rating: string) {
        if (dueCards.length === 0 || currentIndex >= dueCards.length) return;
        const currentCard = dueCards[currentIndex];

        // Process mathematical scheduling algorithm updates
        await rateCard(currentCard.id, currentCard.interval_days, rating);

        if (currentIndex + 1 < dueCards.length) {
            setCurrentIndex(currentIndex + 1);
            setShowAnswer(false);
        } else {
            // Re-query the database cleanly once index finishes
            await refreshReviewQueue(selectedDeckIdFilter);
        }
    }

    // Bug Fix: Check bounds defensively so it never breaks on array boundaries
    const currentCard = dueCards[currentIndex];
    const isCardValid = dueCards.length > 0 && currentIndex < dueCards.length && currentCard;

    if (isLoading) {
        return (
            <View style={styles.container}>
                <Text style={styles.stateMessageText}>Accessing Secure Vault...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.contentBox}>
                <Text style={styles.title}>Review Deck</Text>

                {/* HORIZONTAL DECK FILTER SELECTOR BAR */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.deckScroll} contentContainerStyle={styles.deckRow}>
                    <TouchableOpacity
                        style={[styles.deckButton, selectedDeckIdFilter === 'All' && styles.selectedDeckButton]}
                        onPress={() => handleFilterChange('All')}
                    >
                        <Text style={[styles.deckButtonText, selectedDeckIdFilter === 'All' && styles.selectedDeckButtonText]}>
                            🌐 All Decks
                        </Text>
                    </TouchableOpacity>
                    {decks.map((deck) => (
                        <TouchableOpacity
                            key={deck.id}
                            style={[
                                styles.deckButton,
                                selectedDeckIdFilter === deck.id.toString() && { backgroundColor: deck.color || '#2563EB' }
                            ]}
                            onPress={() => handleFilterChange(deck.id.toString())}
                        >
                            <Text style={[
                                styles.deckButtonText, 
                                selectedDeckIdFilter === deck.id.toString() && styles.selectedDeckButtonText
                            ]}>
                                📁 {deck.name}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>

                {/* EMPTY REVIEW STATE */}
                {!isCardValid ? (
                    <View style={styles.emptyBox}>
                        <Text style={styles.subtitle}>Queue Clear ✓</Text>
                        <Text style={styles.emptyHint}>
                            Your memory paths are stable. No cyber concepts are currently due for execution review.
                        </Text>
                    </View>
                ) : (
                    <View style={styles.cardBox}>
                        <View style={styles.cardMetaHeader}>
                            <Text style={styles.counter}>
                                Concepts: {currentIndex + 1} / {dueCards.length}
                            </Text>
                            <Text style={styles.typeBadge}>
                                {currentCard.card_type}
                            </Text>
                        </View>

                        <Text style={styles.deckLabel}>
                            DECK: {currentCard.deck_name || 'Unassigned'}
                        </Text>

                        <View style={styles.divider} />

                        <Text style={styles.sectionLabel}>FRONT (CONCEPT)</Text>
                        <ScrollView style={styles.scrollableTextContainer}>
                            <Text style={styles.questionText}>{currentCard.front}</Text>
                        </ScrollView>

                        {showAnswer ? (
                            <>
                                <View style={styles.divider} />
                                <Text style={styles.sectionLabel}>BACK (LOGIC ENGINE)</Text>
                                <ScrollView style={styles.scrollableTextContainer}>
                                    <Text style={styles.answerText}>{currentCard.back}</Text>
                                    {currentCard.notes ? (
                                        <Text style={styles.notesText}>💡 Note: {currentCard.notes}</Text>
                                    ) : null}
                                </ScrollView>

                                <View style={styles.ratingButtonWrapper}>
                                    <TouchableOpacity style={[styles.rateBtn, { backgroundColor: '#7F1D1D' }]} onPress={() => handleScoreSelection('Again')}>
                                        <Text style={styles.rateBtnText}>Again</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={[styles.rateBtn, { backgroundColor: '#B45309' }]} onPress={() => handleScoreSelection('Hard')}>
                                        <Text style={styles.rateBtnText}>Hard</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={[styles.rateBtn, { backgroundColor: '#047857' }]} onPress={() => handleScoreSelection('Good')}>
                                        <Text style={styles.rateBtnText}>Good</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={[styles.rateBtn, { backgroundColor: '#1D4ED8' }]} onPress={() => handleScoreSelection('Easy')}>
                                        <Text style={styles.rateBtnText}>Easy</Text>
                                    </TouchableOpacity>
                                </View>
                            </>
                        ) : (
                            <TouchableOpacity style={styles.primaryActionButton} onPress={() => setShowAnswer(true)}>
                                <Text style={styles.primaryActionText}>Reveal Answer</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#111827', padding: 24, justifyContent: 'center' },
    contentBox: { width: '100%' },
    title: { fontSize: 34, fontWeight: 'bold', color: '#FFFFFF', textAlign: 'center', marginBottom: 16 },
    stateMessageText: { color: '#9CA3AF', fontSize: 16, textAlign: 'center' },
    deckScroll: { maxHeight: 46, marginBottom: 20 },
    deckRow: { flexGrow: 1, justifyContent: 'flex-start', gap: 8 },
    deckButton: { backgroundColor: '#1F2937', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 12, justifyContent: 'center', borderWidth: 1, borderColor: '#374151' },
    selectedDeckButton: { backgroundColor: '#2563EB', borderColor: '#3B82F6' },
    deckButtonText: { color: '#D1D5DB', fontWeight: '600', fontSize: 14 },
    selectedDeckButtonText: { color: '#FFFFFF' },
    emptyBox: { backgroundColor: '#1F2937', padding: 32, borderRadius: 20, alignItems: 'center', borderWidth: 1, borderColor: '#374151' },
    subtitle: { color: '#FFFFFF', fontSize: 24, fontWeight: 'bold', marginBottom: 10 },
    emptyHint: { color: '#9CA3AF', marginTop: 4, textAlign: 'center', fontSize: 15, lineHeight: 22 },
    cardBox: { backgroundColor: '#1F2937', padding: 20, borderRadius: 20, borderWidth: 1, borderColor: '#374151', minHeight: 380, justifyContent: 'space-between' },
    cardMetaHeader: { flexDirection: 'row', justify_content: 'space-between', alignItems: 'center', marginBottom: 6 },
    counter: { color: '#9CA3AF', fontSize: 13, fontWeight: '500' },
    typeBadge: { backgroundColor: '#374151', color: '#F3F4F6', paddingVertical: 4, paddingHorizontal: 10, borderRadius: 6, fontSize: 12, fontWeight: '700', textTransform: 'uppercase' },
    deckLabel: { color: '#60A5FA', fontSize: 12, fontWeight: '700', letterSpacing: 0.5 },
    divider: { height: 1, backgroundColor: '#374151', marginVertical: 14 },
    sectionLabel: { color: '#6B7280', fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 8 },
    scrollableTextContainer: { maxHeight: 110 },
    questionText: { color: '#FFFFFF', fontSize: 22, fontWeight: 'bold', lineHeight: 28 },
    answerText: { color: '#E5E7EB', fontSize: 18, lineHeight: 26 },
    notesText: { color: '#9CA3AF', fontSize: 13, fontStyle: 'italic', marginTop: 10 },
    primaryActionButton: { backgroundColor: '#2563EB', padding: 16, borderRadius: 12, marginTop: 14, alignItems: 'center', borderWidth: 1, borderColor: '#3B82F6' },
    primaryActionText: { color: '#FFFFFF', fontWeight: '600', fontSize: 18 },
    ratingButtonWrapper: { flexDirection: 'row', gap: 6, marginTop: 16 },
    rateBtn: { flex: 1, paddingVertical: 14, borderRadius: 10, alignItems: 'center' },
    rateBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 }
});