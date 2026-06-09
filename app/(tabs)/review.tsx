import { DbCard, DbDeck, getAllDecks, getDueCards, rateCard } from '@/src/database';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';

export default function ReviewScreen({ isFocused }: { isFocused?: boolean }) {
    const [decks, setDecks] = useState<DbDeck[]>([]);
    const [selectedDeckIdFilter, setSelectedDeckIdFilter] = useState<string>('All');
    const [dueCards, setDueCards] = useState<DbCard[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [showAnswer, setShowAnswer] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isPickerVisible, setIsPickerVisible] = useState(false);
    
    // Non-destructive safe mode flag
    const [isReViewMode, setIsReViewMode] = useState(false);

    async function refreshReviewQueue(deckFilter: string, reViewActive: boolean) {
        setIsLoading(true);
        try {
            const activeDecks = await getAllDecks();
            
            // Fallback to 'All' if the currently selected deck filter no longer exists in database
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
        setIsPickerVisible(false);
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

    // Check if the currently filtered custom deck is empty vs caught up
    const currentFilteredDeckObj = decks.find(d => String(d.id) === selectedDeckIdFilter);
    const isSelectedDeckEmpty = selectedDeckIdFilter !== 'All' && currentFilteredDeckObj && (!dueCards.length && !currentCard);

    // Dynamic label and dynamic background matching logic for main screen trigger
    const currentDeckName = selectedDeckIdFilter === 'All' ? '🌌 All Terminal Scopes' : (currentFilteredDeckObj?.name || 'Unknown Scope');
    const dynamicTriggerBg = selectedDeckIdFilter === 'All' 
        ? (isReViewMode ? '#1E293B' : '#1F2937') 
        : (currentFilteredDeckObj?.color || '#1F2937');

    return (
        <View style={styles.screenWrapper}>
            {/* Header Controls Menu Bar Row */}
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

            {/* Main Screen Dropdown Trigger Button - Syncs with the selected deck color */}
            <TouchableOpacity 
                style={[
                    styles.dropdownTrigger, 
                    { backgroundColor: dynamicTriggerBg },
                    isReViewMode && selectedDeckIdFilter === 'All' && styles.dropdownTriggerReViewDefault,
                    selectedDeckIdFilter !== 'All' && { borderColor: '#FFFFFF', borderWidth: 1.5 }
                ]} 
                onPress={() => setIsPickerVisible(true)}
            >
                <Text style={styles.dropdownTriggerText} numberOfLines={1}>
                    Scope Target: {currentDeckName}
                </Text>
                <Text style={styles.dropdownArrow}>▼</Text>
            </TouchableOpacity>

            {/* Options Picker Modal List */}
            <Modal transparent visible={isPickerVisible} animationType="fade" onRequestClose={() => setIsPickerVisible(false)}>
                <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setIsPickerVisible(false)}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>[ SELECT SYSTEM TARGET SCOPE ]</Text>
                        <ScrollView style={{ maxHeight: 300 }} showsVerticalScrollIndicator={false}>
                            
                            {/* "All" Scope Row Selection */}
                            <TouchableOpacity 
                                style={[styles.modalOption, selectedDeckIdFilter === 'All' && styles.modalOptionActive]} 
                                onPress={() => handleFilterPress('All')}
                            >
                                <Text style={styles.modalOptionText}>🌌 All Terminal Scopes</Text>
                            </TouchableOpacity>

                            {/* Custom User Decks - Kept dark uniform unless it is the active chosen one */}
                            {decks.map((deck) => {
                                const isCurrentSelected = selectedDeckIdFilter === String(deck.id);
                                return (
                                    <TouchableOpacity 
                                        key={deck.id} 
                                        style={[
                                            styles.modalOption, 
                                            isCurrentSelected && { backgroundColor: deck.color || '#2563EB', borderColor: '#FFFFFF', borderWidth: 1.5 }
                                        ]} 
                                        onPress={() => handleFilterPress(String(deck.id))}
                                    >
                                        <Text style={styles.modalOptionText}>📁 {deck.name}</Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>
                    </View>
                </TouchableOpacity>
            </Modal>

            {dueCards.length === 0 ? (
                <View style={styles.emptyStateContainer}>
                    <Text style={styles.clearedIcon}>🚀</Text>
                    <Text style={styles.clearedPrimaryText}>
                        {isSelectedDeckEmpty ? "Deck Database Empty" : "Queue Matrix Secure"}
                    </Text>
                    <Text style={styles.clearedSecondaryText}>
                        {isSelectedDeckEmpty 
                          ? "There are no cards built in this deck yet. Please add cards to get started!"
                          : isReViewMode 
                            ? "No items match your library categories. Add cards first!"
                            : "All cards caught up. Switch on Cheat Re-View Mode above to practice concepts ahead of schedule!"}
                    </Text>
                </View>
            ) : (
                <View style={styles.adaptiveContentGrid}>
                    
                    {/* Compact Front Box Container */}
                    <View style={[styles.questionCardBox, isReViewMode && styles.cardBoxReView]}>
                        <View style={styles.cardMetaHeaderRow}>
                            <Text style={[styles.deckLabelCode, isReViewMode && styles.deckLabelCodeReView]}>{currentCard?.deck_name || 'SYSTEM CORE'}</Text>
                            <Text style={styles.typeTagBadge}>{currentCard?.card_type}</Text>
                        </View>
                        <Text style={styles.questionOutputText}>{currentCard?.front}</Text>
                        <Text style={styles.trackerIndexLabel}>Card(s): {currentIndex + 1} / {dueCards.length}</Text>
                    </View>

                    {/* Elastic Lower Box */}
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

                                {/* Rating Buttons Lane Container */}
                                {!isReViewMode ? (
                                    <View style={styles.srsButtonRatingRow}>
                                        <TouchableOpacity style={[styles.ratingBtn, { backgroundColor: '#EF4444' }]} onPress={() => handleScoreCard('again')}>
                                            <Text style={styles.ratingBtnText}>Again</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity style={[styles.ratingBtn, { backgroundColor: '#F59E0B' }]} onPress={() => handleScoreCard('hard')}>
                                            <Text style={styles.ratingBtnText}>Hard</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity style={[styles.ratingBtn, { backgroundColor: '#2563EB' }]} onPress={() => handleScoreCard('good')}>
                                            <Text style={styles.ratingBtnText}>Good</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity style={[styles.ratingBtn, { backgroundColor: '#10B981' }]} onPress={() => handleScoreCard('easy')}>
                                            <Text style={styles.ratingBtnText}>Easy</Text>
                                        </TouchableOpacity>
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
    
    // Main Dropdown Button Interface
    dropdownTrigger: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 16, borderRadius: 12, borderWidth: 1, borderColor: '#374151', marginBottom: 18 },
    dropdownTriggerReViewDefault: { borderColor: '#10B981', borderWidth: 1.5 },
    dropdownTriggerText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700', flex: 1 },
    dropdownArrow: { color: '#9CA3AF', fontSize: 12, marginLeft: 8 },
    
    // Uniform, Clean Terminal Popup Styles
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center', padding: 24 },
    modalContent: { width: '100%', backgroundColor: '#1F2937', borderRadius: 16, borderWidth: 1, borderColor: '#374151', padding: 16 },
    modalTitle: { color: '#6B7280', fontSize: 11, fontWeight: '800', letterSpacing: 1, marginBottom: 14, textAlign: 'center' },
    modalOption: { backgroundColor: '#111827', padding: 14, borderRadius: 10, marginBottom: 8, borderWidth: 1, borderColor: '#374151' }, // Clean dark default styling
    modalOptionActive: { backgroundColor: '#2563EB', borderColor: '#3B82F6' },
    modalOptionText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700', textShadowColor: 'rgba(0, 0, 0, 0.4)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 },

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