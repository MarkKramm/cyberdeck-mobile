import { DbCard, DbDeck, getAllDecks, getDueCards, rateCard } from '@/src/database';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';

export default function ReviewScreen({ isFocused }: { isFocused?: boolean }) {
    const [decks, setDecks] = useState<DbDeck[]>([]);
    const [selectedDeckIdFilter, setSelectedDeckIdFilter] = useState<string>('All');
    const [dueCards, setDueCards] = useState<DbCard[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [showAnswer, setShowAnswer] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    
    const [isReViewMode, setIsReViewMode] = useState(false);

    async function refreshReviewQueue(deckFilter: string, reViewActive: boolean) {
        setIsLoading(true);
        try {
            const activeDecks = await getAllDecks();
            let activeFilter = deckFilter;
            if (deckFilter !== 'All' && !activeDecks.some(deck => String(deck.id) === deckFilter)) {
                activeFilter = 'All';
                setSelectedDeckIdFilter('All');
            }
            const targetedDueQueue = await getDueCards(30, activeFilter, reViewActive);
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

    useEffect(() => {
        if (isFocused) {
            refreshReviewQueue(selectedDeckIdFilter, isReViewMode);
        }
    }, [isFocused, selectedDeckIdFilter, isReViewMode]);

    function handleFilterPress(id: string) {
        setSelectedDeckIdFilter(id);
    }

    async function handleScoreCard(rating: 'again' | 'hard' | 'good' | 'easy') {
        const activeCard = dueCards[currentIndex];
        if (!activeCard) return;
        await rateCard(activeCard.id, rating);
        advanceQueue();
    }

    function handleReViewNext() {
        advanceQueue();
    }

    function advanceQueue() {
        if (currentIndex < dueCards.length - 1) {
            setCurrentIndex(currentIndex + 1);
            setShowAnswer(false);
        } else {
            refreshReviewQueue(selectedDeckIdFilter, isReViewMode);
        }
    }

    if (isLoading) {
        return (
            <View style={styles.centeringWrapper}>
                <ActivityIndicator size="large" color="#2563EB" />
            </View>
        );
    }

    const currentCard = dueCards[currentIndex];
    const currentFilteredDeckObj = decks.find(d => String(d.id) === selectedDeckIdFilter);
    const isSelectedDeckEmpty = selectedDeckIdFilter !== 'All' && currentFilteredDeckObj && (!dueCards.length && !currentCard);

    return (
        <View style={styles.screenWrapper}>
            <View style={styles.headerControlSection}>
                <Text style={[styles.screenTitle, isReViewMode && styles.screenTitleReView]}>
                    {isReViewMode ? "🔄 | Re-Viewing..." : "📖 | Study Cards"}
                </Text>
                <View style={styles.switchControlWrapper}>
                    <Text style={[styles.switchControlLabel, isReViewMode && styles.switchControlLabelActive]}>
                        Re-View Mode
                    </Text>
                    <Switch
                        trackColor={{ false: '#374151', true: '#10B981' }}
                        thumbColor={isReViewMode ? '#FFFFFF' : '#9CA3AF'}
                        ios_backgroundColor="#374151"
                        onValueChange={() => setIsReViewMode(!isReViewMode)}
                        value={isReViewMode}
                    />
                </View>
            </View>

            <View style={{ maxHeight: 50, marginBottom: 14 }}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalFiltersContainer}>
                    <TouchableOpacity 
                        style={[styles.filterSelectorPill, selectedDeckIdFilter === 'All' && (isReViewMode ? styles.activeFilterSelectorPillReView : styles.activeFilterSelectorPill)]} 
                        onPress={() => handleFilterPress('All')}
                    >
                        <Text style={styles.filterPillText}>🌌 All Terminal Scopes</Text>
                    </TouchableOpacity>
                    {decks.map((deck) => (
                        <TouchableOpacity 
                            key={deck.id} 
                            style={[
                                styles.filterSelectorPill, 
                                selectedDeckIdFilter === String(deck.id) && (isReViewMode ? styles.activeFilterSelectorPillReView : styles.activeFilterSelectorPill)
                            ]} 
                            onPress={() => handleFilterPress(String(deck.id))}
                        >
                            <Text style={styles.filterPillText}>{deck.name}</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            {dueCards.length === 0 ? (
                <View style={styles.emptyStateContainer}>
                    <Text style={styles.clearedIcon}>🚀</Text>
                    <Text style={styles.clearedPrimaryText}>
                        {isSelectedDeckEmpty ? "Deck Database Empty" : "Queue Matrix Secure"}
                    </Text>
                    <Text style={styles.clearedSecondaryText}>
                        {isSelectedDeckEmpty ? "There are no cards built in this deck yet." : "All cards caught up."}
                    </Text>
                </View>
            ) : (
                <View style={styles.adaptiveContentGrid}>
                    <View style={[styles.questionCardBox, isReViewMode && styles.cardBoxReView]}>
                        <View style={styles.cardMetaHeaderRow}>
                            <Text style={[styles.deckLabelCode, isReViewMode && styles.deckLabelCodeReView]}>{currentCard?.deck_name || 'SYSTEM CORE'}</Text>
                            <Text style={styles.typeTagBadge}>{currentCard?.card_type}</Text>
                        </View>
                        <Text style={styles.questionOutputText}>{currentCard?.front}</Text>
                        <Text style={styles.trackerIndexLabel}>Card(s): {currentIndex + 1} / {dueCards.length}</Text>
                    </View>

                    <View style={[styles.answerCardBox, isReViewMode && styles.cardBoxReView]}>
                        {!showAnswer ? (
                            <TouchableOpacity style={[styles.fullPaneRevealButton, isReViewMode && styles.fullPaneRevealButtonReView]} onPress={() => setShowAnswer(true)}>
                                <Text style={[styles.revealActionLabel, isReViewMode && styles.revealActionLabelReView]}>
                                    📡 Decrypt Card Output Payload
                                </Text>
                            </TouchableOpacity>
                        ) : (
                            <View style={styles.answerPayloadLayoutContainer}>
                                <ScrollView style={styles.answerBodyScroller} showsVerticalScrollIndicator={false}>
                                    <Text style={styles.sectionHeadingLabel}>[ DECRYPTED DATA DEPLOYMENT ]</Text>
                                    <Text style={styles.answerOutputText}>{currentCard?.back}</Text>
                                    {currentCard?.notes && (
                                        <View style={styles.notesBlockQuote}>
                                            <Text style={styles.sectionHeadingLabel}>[ EXTRADITED SYSTEM TRACE NOTES ]</Text>
                                            <Text style={styles.notesOutputText}>{currentCard?.notes}</Text>
                                        </View>
                                    )}
                                </ScrollView>
                                {!isReViewMode ? (
                                    <View style={styles.srsButtonRatingRow}>
                                        <TouchableOpacity style={[styles.ratingBtn, { backgroundColor: '#EF4444' }]} onPress={() => handleScoreCard('again')}><Text style={styles.ratingBtnText}>Again</Text></TouchableOpacity>
                                        <TouchableOpacity style={[styles.ratingBtn, { backgroundColor: '#F59E0B' }]} onPress={() => handleScoreCard('hard')}><Text style={styles.ratingBtnText}>Hard</Text></TouchableOpacity>
                                        <TouchableOpacity style={[styles.ratingBtn, { backgroundColor: '#2563EB' }]} onPress={() => handleScoreCard('good')}><Text style={styles.ratingBtnText}>Good</Text></TouchableOpacity>
                                        <TouchableOpacity style={[styles.ratingBtn, { backgroundColor: '#10B981' }]} onPress={() => handleScoreCard('easy')}><Text style={styles.ratingBtnText}>Easy</Text></TouchableOpacity>
                                    </View>
                                ) : (
                                    <TouchableOpacity style={styles.readOnlyNextButton} onPress={handleReViewNext}>
                                        <Text style={styles.readOnlyNextButtonText}>👉 Next Re-View Concept</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        )}
                    </View>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    screenWrapper: { flex: 1, backgroundColor: '#111827', paddingHorizontal: 16, paddingTop: 54, paddingBottom: 16 },
    centeringWrapper: { flex: 1, backgroundColor: '#111827', justifyContent: 'center', alignItems: 'center' },
    headerControlSection: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    screenTitle: { fontSize: 22, fontWeight: 'bold', color: '#FFFFFF', flex: 1 },
    screenTitleReView: { color: '#10B981' },
    switchControlWrapper: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    switchControlLabel: { color: '#9CA3AF', fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
    switchControlLabelActive: { color: '#10B981' },
    horizontalFiltersContainer: { paddingHorizontal: 4, gap: 8 },
    filterSelectorPill: { backgroundColor: '#1F2937', paddingVertical: 8, paddingHorizontal: 14, borderRadius: 12, borderWidth: 1, borderColor: '#374151', justifyContent: 'center' },
    activeFilterSelectorPill: { backgroundColor: '#2563EB', borderColor: '#3B82F6' },
    activeFilterSelectorPillReView: { backgroundColor: '#10B981', borderColor: '#34D399' },
    filterPillText: { color: '#FFFFFF', fontSize: 13, fontWeight: '600' },
    adaptiveContentGrid: { flex: 1, flexDirection: 'column', gap: 12 },
    questionCardBox: { backgroundColor: '#1F2937', borderRadius: 16, borderWidth: 1, borderColor: '#374151', padding: 16 },
    cardBoxReView: { backgroundColor: '#1E293B', borderColor: '#10B981', borderWidth: 1.5 },
    answerCardBox: { flex: 1, backgroundColor: '#1F2937', borderRadius: 16, borderWidth: 1, borderColor: '#374151', padding: 16, overflow: 'hidden' },
    cardMetaHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    deckLabelCode: { color: '#60A5FA', fontSize: 12, fontWeight: '700', textTransform: 'uppercase', flex: 1, marginRight: 8 },
    deckLabelCodeReView: { color: '#10B981' },
    typeTagBadge: { backgroundColor: '#374151', color: '#F3F4F6', paddingVertical: 4, paddingHorizontal: 8, borderRadius: 6, fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
    questionOutputText: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold', lineHeight: 24, marginBottom: 7 },
    trackerIndexLabel: { color: '#6B7280', fontSize: 11, fontWeight: '600', alignSelf: 'flex-end' },
    fullPaneRevealButton: { flex: 1, backgroundColor: '#111827', borderRadius: 12, borderWidth: 1, borderColor: '#374151', justifyContent: 'center', alignItems: 'center', borderStyle: 'dashed' },
    fullPaneRevealButtonReView: { borderColor: '#10B981' },
    revealActionLabel: { color: '#60A5FA', fontSize: 15, fontWeight: '700' },
    revealActionLabelReView: { color: '#10B981' },
    answerPayloadLayoutContainer: { flex: 1, flexDirection: 'column', justifyContent: 'space-between' },
    answerBodyScroller: { flex: 1, marginBottom: 8 },
    sectionHeadingLabel: { color: '#6B7280', fontSize: 10, fontWeight: '700', letterSpacing: 1, marginBottom: 6 },
    answerOutputText: { color: '#E5E7EB', fontSize: 16, lineHeight: 24, marginBottom: 12 },
    notesBlockQuote: { borderLeftWidth: 3, borderLeftColor: '#2563EB', paddingLeft: 10, marginTop: 10 },
    notesOutputText: { color: '#9CA3AF', fontSize: 13, fontStyle: 'italic', lineHeight: 18 },
    srsButtonRatingRow: { flexDirection: 'row', gap: 6, height: 44, marginTop: 4 },
    ratingBtn: { flex: 1, borderRadius: 8, justifyContent: 'center', alignItems: 'center', borderBottomWidth: 3, borderBottomColor: 'rgba(0,0,0,0.25)' },
    ratingBtnText: { color: '#FFFFFF', fontWeight: '800', fontSize: 13, textShadowColor: 'rgba(0, 0, 0, 0.4)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 },
    readOnlyNextButton: { backgroundColor: '#10B981', paddingVertical: 12, borderRadius: 10, alignItems: 'center', marginTop: 4 },
    readOnlyNextButtonText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
    emptyStateContainer: { flex: 1, backgroundColor: '#1F2937', borderRadius: 16, borderWidth: 1, borderColor: '#374151', justifyContent: 'center', alignItems: 'center', padding: 32 },
    clearedIcon: { fontSize: 44, marginBottom: 14 },
    clearedPrimaryText: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold', marginBottom: 6 },
    clearedSecondaryText: { color: '#9CA3AF', fontSize: 13, textAlign: 'center', lineHeight: 18 }
});