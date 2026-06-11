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

    // Non-destructive practice mode flag.
    const [isReViewMode, setIsReViewMode] = useState(false);

    async function refreshReviewQueue(deckFilter: string, reViewActive: boolean) {
        setIsLoading(true);
        try {
            const activeDecks = await getAllDecks();

            // Fallback to "All" if the currently selected deck filter no longer exists.
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

    const currentFilteredDeckObj = decks.find(d => String(d.id) === selectedDeckIdFilter);
    const isSelectedDeckEmpty = selectedDeckIdFilter !== 'All' && currentFilteredDeckObj && (!dueCards.length && !currentCard);

    const currentDeckName = selectedDeckIdFilter === 'All' ? 'All Decks' : (currentFilteredDeckObj?.name || 'Unknown Deck');

    const activeCardDeckObj = currentCard ? decks.find(d => d.id === currentCard.deck_id) : undefined;
    const deckAccentColor = activeCardDeckObj?.color || currentFilteredDeckObj?.color || '#60A5FA';

    // Re-View Mode is a full visual override.
    // Normal mode follows the selected/current deck color.
    const activeCardAccent = isReViewMode ? '#10B981' : deckAccentColor;
    const dropdownBackground = isReViewMode
        ? '#0F241E'
        : selectedDeckIdFilter === 'All'
            ? '#1F2937'
            : (currentFilteredDeckObj?.color || '#1F2937');

    const visibleMainText = showAnswer ? (currentCard?.back || '') : (currentCard?.front || '');
    const visibleNotesText = showAnswer ? (currentCard?.notes || '') : '';
    const payloadLength = visibleMainText.length + visibleNotesText.length;

    // Short cards should feel like real flashcards.
    // Long cards should start near the top and scroll naturally.
    const isCompactPayload = payloadLength <= 160;
    const isMediumPayload = payloadLength > 160 && payloadLength <= 420;
    const shouldCenterPayload = isCompactPayload || isMediumPayload;
    const shouldCenterMainText = isCompactPayload;
    const hasNotes = Boolean(currentCard?.notes && currentCard.notes.trim().length > 0);

    const sideLabel = showAnswer ? 'BACK' : 'FRONT';

    return (
        <View style={styles.screenWrapper}>
            {/* Header Controls */}
            <View style={styles.headerControlSection}>
                <Text style={[styles.screenTitle, isReViewMode && styles.screenTitleReView]}>
                    {isReViewMode ? '🔄 Re-View Mode' : '📖 Study Cards'}
                </Text>

                <View style={styles.switchControlWrapper}>
                    <Text style={[styles.switchControlLabel, isReViewMode && styles.switchControlLabelActive]}>
                        Re-View
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

            {/* Deck Selector */}
            <TouchableOpacity
                style={[
                    styles.dropdownTrigger,
                    { backgroundColor: dropdownBackground },
                    isReViewMode
                        ? styles.dropdownTriggerReView
                        : selectedDeckIdFilter !== 'All'
                            ? { borderColor: '#FFFFFF', borderWidth: 1.5 }
                            : null
                ]}
                onPress={() => setIsPickerVisible(true)}
            >
                <Text style={styles.dropdownTriggerText} numberOfLines={1}>
                    Deck 📚: {currentDeckName}
                </Text>
                <Text style={[styles.dropdownArrow, isReViewMode && styles.dropdownArrowReView]}>▼</Text>
            </TouchableOpacity>

            {isReViewMode && (
                <View style={styles.reViewModeBanner}>
                    <Text style={styles.reViewModeBannerTitle}>🔄 RE-VIEW MODE ACTIVE</Text>
                    <Text style={styles.reViewModeBannerSubtext}>Free practice only • SRS schedule protected</Text>
                </View>
            )}

            {/* Deck Picker Modal */}
            <Modal transparent visible={isPickerVisible} animationType="fade" onRequestClose={() => setIsPickerVisible(false)}>
                <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setIsPickerVisible(false)}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>SELECT DECK</Text>
                        <ScrollView style={{ maxHeight: 300 }} showsVerticalScrollIndicator={false}>
                            <TouchableOpacity
                                style={[
                                    styles.modalOption,
                                    selectedDeckIdFilter === 'All' && (isReViewMode ? styles.modalOptionActiveReView : styles.modalOptionActive)
                                ]}
                                onPress={() => handleFilterPress('All')}
                            >
                                <Text style={styles.modalOptionText}>📚 All Decks</Text>
                            </TouchableOpacity>

                            {decks.map((deck) => {
                                const isCurrentSelected = selectedDeckIdFilter === String(deck.id);
                                return (
                                    <TouchableOpacity
                                        key={deck.id}
                                        style={[
                                            styles.modalOption,
                                            isCurrentSelected && (
                                                isReViewMode
                                                    ? styles.modalOptionActiveReView
                                                    : { backgroundColor: deck.color || '#2563EB', borderColor: '#FFFFFF', borderWidth: 1.5 }
                                            )
                                        ]}
                                        onPress={() => handleFilterPress(String(deck.id))}
                                    >
                                        <View style={styles.modalDeckRow}>
                                            <View style={[styles.modalDeckDot, { backgroundColor: deck.color || '#60A5FA' }]} />
                                            <Text style={styles.modalOptionText} numberOfLines={1}>📁 {deck.name}</Text>
                                        </View>
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
                        {isSelectedDeckEmpty ? 'Deck Empty' : 'Review Queue Clear'}
                    </Text>
                    <Text style={styles.clearedSecondaryText}>
                        {isSelectedDeckEmpty
                            ? 'There are no cards in this deck yet. Add cards to get started.'
                            : isReViewMode
                                ? 'No cards found for this deck. Add cards first.'
                                : 'All due cards are caught up. Turn on Re-View Mode to practice ahead of schedule.'}
                    </Text>
                </View>
            ) : (
                <View style={styles.reviewWorkspace}>
                    {/* Unified Flashcard */}
                    <View
                        style={[
                            styles.flashcardShell,
                            { borderColor: activeCardAccent },
                            isReViewMode && styles.flashcardShellReView
                        ]}
                    >
                        {/* Top metadata: deck + front/back indicator */}
                        <View style={styles.flashcardMetaPanel}>
                            <View style={styles.metaTopRow}>
                                <View style={styles.deckIdentityRow}>
                                    <View style={[styles.deckColorDot, { backgroundColor: deckAccentColor }]} />
                                    <Text style={[styles.deckLabelCode, { color: activeCardAccent }]} numberOfLines={1}>
                                        {currentCard?.deck_name || 'Unknown Deck'}
                                    </Text>
                                </View>

                                <View style={[styles.sidePill, isReViewMode && styles.sidePillReView]}>
                                    <Text style={[styles.sidePillText, isReViewMode && styles.sidePillTextReView]}>
                                        [{sideLabel}]
                                    </Text>
                                </View>
                            </View>

                            {/* Second metadata row: card type + counter */}
                            <View style={styles.metaBottomRow}>
                                <View style={[
                                    styles.cardTypePill,
                                    { borderColor: activeCardAccent },
                                    isReViewMode && styles.cardTypePillReView
                                ]}>
                                    <Text style={[styles.cardTypePillText, isReViewMode && styles.cardTypePillTextReView]}>
                                        {currentCard?.card_type || 'Card'}
                                    </Text>
                                </View>

                                <Text style={[styles.trackerIndexLabel, isReViewMode && styles.trackerIndexLabelReView]}>
                                    Card(s): {currentIndex + 1} / {dueCards.length}
                                </Text>
                            </View>
                        </View>

                        <View style={[styles.flashcardDivider, { backgroundColor: activeCardAccent }]} />

                        {/* Card body */}
                        <ScrollView
                            style={styles.flashcardBodyScroller}
                            contentContainerStyle={[
                                styles.flashcardBodyContent,
                                shouldCenterPayload ? styles.flashcardBodyContentCentered : styles.flashcardBodyContentTop
                            ]}
                            showsVerticalScrollIndicator={false}
                        >
                            {!showAnswer ? (
                                <View style={styles.payloadBlock}>
                                    <Text style={[styles.frontText, shouldCenterMainText && styles.centeredPayloadText]}>
                                        {currentCard?.front}
                                    </Text>
                                </View>
                            ) : (
                                <View style={styles.payloadBlock}>
                                    <Text style={[styles.answerSectionLabel, shouldCenterMainText && styles.centeredPayloadText]}>
                                        [ ANSWER ]
                                    </Text>

                                    <Text style={[styles.backText, shouldCenterMainText && styles.centeredPayloadText]}>
                                        {currentCard?.back}
                                    </Text>

                                    {hasNotes ? (
                                        <View
                                            style={[
                                                styles.notesBlockQuote,
                                                { borderLeftColor: activeCardAccent },
                                                shouldCenterMainText && styles.notesBlockCompact
                                            ]}
                                        >
                                            <Text style={[styles.notesSectionLabel, shouldCenterMainText && styles.centeredPayloadText]}>
                                                [ ADDITIONAL NOTES ]
                                            </Text>
                                            <Text style={[styles.notesOutputText, shouldCenterMainText && styles.centeredPayloadText]}>
                                                {currentCard.notes}
                                            </Text>
                                        </View>
                                    ) : null}
                                </View>
                            )}
                        </ScrollView>
                    </View>

                    {/* Action Controls */}
                    {!showAnswer ? (
                        <TouchableOpacity
                            style={[
                                styles.revealButton,
                                { borderColor: activeCardAccent },
                                isReViewMode && styles.revealButtonReView
                            ]}
                            onPress={() => setShowAnswer(true)}
                        >
                            <Text style={[styles.revealActionLabel, isReViewMode && styles.revealActionLabelReView]}>
                                Reveal Answer
                            </Text>
                        </TouchableOpacity>
                    ) : !isReViewMode ? (
                        <View style={styles.srsButtonRatingRow}>
                            <TouchableOpacity style={[styles.ratingBtn, styles.ratingBtnAgain]} onPress={() => handleScoreCard('again')}>
                                <Text style={styles.ratingBtnText}>😵 Again</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.ratingBtn, styles.ratingBtnHard]} onPress={() => handleScoreCard('hard')}>
                                <Text style={styles.ratingBtnText}>🤔 Hard</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.ratingBtn, styles.ratingBtnGood]} onPress={() => handleScoreCard('good')}>
                                <Text style={styles.ratingBtnText}>👍 Good</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.ratingBtn, styles.ratingBtnEasy]} onPress={() => handleScoreCard('easy')}>
                                <Text style={styles.ratingBtnText}>🚀 Easy</Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <TouchableOpacity style={styles.readOnlyNextButton} onPress={handleReViewNext}>
                            <Text style={styles.readOnlyNextButtonText}>Next Card</Text>
                        </TouchableOpacity>
                    )}
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    screenWrapper: {
        flex: 1,
        backgroundColor: '#111827',
        paddingHorizontal: 16,
        paddingTop: 54,
        paddingBottom: 16
    },
    centeringWrapper: {
        flex: 1,
        backgroundColor: '#111827',
        justifyContent: 'center',
        alignItems: 'center'
    },

    // Header
    headerControlSection: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16
    },
    screenTitle: {
        fontSize: 22,
        fontWeight: '300',
        color: '#FFFFFF',
        flex: 1,
        letterSpacing: 1
    },
    screenTitleReView: {
        color: '#10B981'
    },
    switchControlWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8
    },
    switchControlLabel: {
        color: '#9CA3AF',
        fontSize: 11,
        fontWeight: '800',
        textTransform: 'uppercase',
        letterSpacing: 0.5
    },
    switchControlLabelActive: {
        color: '#10B981'
    },

    // Deck selector
    dropdownTrigger: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#ffffff',
        marginBottom: 18
    },
    dropdownTriggerReView: {
        borderColor: '#10B981',
        borderWidth: 1.5
    },
    dropdownTriggerText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '800',
        flex: 1
    },
    dropdownArrow: {
        color: '#9CA3AF',
        fontSize: 12,
        marginLeft: 8
    },
    dropdownArrowReView: {
        color: '#A7F3D0'
    },

    // Re-View Mode identity banner
    reViewModeBanner: {
        backgroundColor: 'rgba(16, 185, 129, 0.10)',
        borderColor: '#10B981',
        borderWidth: 1,
        borderRadius: 14,
        paddingVertical: 10,
        paddingHorizontal: 14,
        marginTop: -8,
        marginBottom: 14,
        alignItems: 'center'
    },
    reViewModeBannerTitle: {
        color: '#10B981',
        fontSize: 12,
        fontWeight: '900',
        letterSpacing: 1
    },
    reViewModeBannerSubtext: {
        color: '#A7F3D0',
        fontSize: 11,
        fontWeight: '600',
        marginTop: 2,
        textAlign: 'center'
    },

    // Modal
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.8)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24
    },
    modalContent: {
        width: '100%',
        backgroundColor: '#1F2937',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#374151',
        padding: 16
    },
    modalTitle: {
        color: '#9CA3AF',
        fontSize: 12,
        fontWeight: '900',
        letterSpacing: 1,
        marginBottom: 14,
        textAlign: 'center'
    },
    modalOption: {
        backgroundColor: '#111827',
        padding: 14,
        borderRadius: 10,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: '#374151'
    },
    modalOptionActive: {
        backgroundColor: '#2563EB',
        borderColor: '#FFFFFF',
        borderWidth: 1.5
    },
    modalOptionActiveReView: {
        backgroundColor: '#064E3B',
        borderColor: '#10B981',
        borderWidth: 1.5
    },
    modalOptionText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '800',
        flexShrink: 1
    },
    modalDeckRow: {
        flexDirection: 'row',
        alignItems: 'center'
    },
    modalDeckDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginRight: 8
    },

    // Review workspace
    reviewWorkspace: {
        flex: 1,
        gap: 12
    },
    flashcardShell: {
        flex: 1,
        backgroundColor: '#1F2937',
        borderRadius: 22,
        borderWidth: 1.5,
        overflow: 'hidden',
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.25,
        shadowRadius: 12,
        elevation: 6
    },
    flashcardShellReView: {
        backgroundColor: '#0F241E',
        borderColor: '#10B981',
        shadowColor: '#10B981',
        shadowOpacity: 0.20
    },

    // Metadata panel
    flashcardMetaPanel: {
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 12,
        backgroundColor: 'rgba(17, 24, 39, 0.45)'
    },
    metaTopRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10
    },
    deckIdentityRow: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: 8
    },
    deckColorDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginRight: 8
    },
    deckLabelCode: {
        fontSize: 12,
        fontWeight: '900',
        textTransform: 'uppercase',
        flex: 1,
        letterSpacing: 0.5
    },
    sidePill: {
        backgroundColor: '#111827',
        borderColor: '#374151',
        borderWidth: 1,
        borderRadius: 999,
        paddingVertical: 5,
        paddingHorizontal: 11
    },
    sidePillReView: {
        backgroundColor: 'rgba(16, 185, 129, 0.16)',
        borderColor: '#10B981'
    },
    sidePillText: {
        color: '#F3F4F6',
        fontSize: 10,
        fontWeight: '900',
        letterSpacing: 1
    },
    sidePillTextReView: {
        color: '#D1FAE5'
    },
    metaBottomRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 10
    },
    cardTypePill: {
        backgroundColor: '#111827',
        borderWidth: 1.5,
        borderRadius: 999,
        paddingVertical: 6,
        paddingHorizontal: 12,
        maxWidth: '65%'
    },
    cardTypePillReView: {
        backgroundColor: 'rgba(16, 185, 129, 0.14)',
        borderColor: '#10B981'
    },
    cardTypePillText: {
        color: '#FFFFFF',
        fontSize: 11,
        fontWeight: '900',
        textTransform: 'uppercase',
        letterSpacing: 0.7
    },
    cardTypePillTextReView: {
        color: '#D1FAE5'
    },
    trackerIndexLabel: {
        color: '#9CA3AF',
        fontSize: 11,
        fontWeight: '800'
    },
    trackerIndexLabelReView: {
        color: '#A7F3D0'
    },
    flashcardDivider: {
        height: 1,
        opacity: 0.35
    },

    // Card body
    flashcardBodyScroller: {
        flex: 1
    },
    flashcardBodyContent: {
        flexGrow: 1,
        paddingHorizontal: 24,
        paddingVertical: 24
    },
    flashcardBodyContentCentered: {
        justifyContent: 'center'
    },
    flashcardBodyContentTop: {
        justifyContent: 'flex-start'
    },
    payloadBlock: {
        width: '100%'
    },
    centeredPayloadText: {
        textAlign: 'center',
        alignSelf: 'center'
    },
    frontText: {
        color: '#FFFFFF',
        fontSize: 25,
        fontWeight: '800',
        lineHeight: 34,
        textAlign: 'left',
        letterSpacing: 0.1
    },
    answerSectionLabel: {
        color: '#9CA3AF',
        fontSize: 11,
        fontWeight: '900',
        letterSpacing: 1.2,
        marginBottom: 10,
        textTransform: 'uppercase',
        textAlign: 'left'
    },
    backText: {
        color: '#E5E7EB',
        fontSize: 20,
        fontWeight: '600',
        lineHeight: 30,
        textAlign: 'left'
    },
    notesBlockQuote: {
        borderLeftWidth: 3,
        paddingLeft: 12,
        marginTop: 18,
        paddingVertical: 8,
        paddingRight: 10,
        backgroundColor: 'rgba(17, 24, 39, 0.32)',
        borderRadius: 10
    },
    notesBlockCompact: {
        borderLeftWidth: 0,
        paddingLeft: 10,
        paddingRight: 10
    },
    notesSectionLabel: {
        color: '#9CA3AF',
        fontSize: 10,
        fontWeight: '900',
        letterSpacing: 1,
        marginBottom: 6,
        textTransform: 'uppercase'
    },
    notesOutputText: {
        color: '#CBD5E1',
        fontSize: 14,
        fontStyle: 'italic',
        lineHeight: 21,
        textAlign: 'left'
    },

    // Action controls
    revealButton: {
        minHeight: 56,
        backgroundColor: '#111827',
        borderRadius: 16,
        borderWidth: 1.5,
        borderStyle: 'dashed',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 16
    },
    revealButtonReView: {
        backgroundColor: 'rgba(16, 185, 129, 0.14)',
        borderColor: '#10B981'
    },
    revealActionLabel: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '900',
        textAlign: 'center',
        letterSpacing: 0.2
    },
    revealActionLabelReView: {
        color: '#D1FAE5'
    },
    srsButtonRatingRow: {
        flexDirection: 'row',
        gap: 7,
        minHeight: 54
    },
    ratingBtn: {
        flex: 1,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderBottomWidth: 3,
        borderBottomColor: 'rgba(0,0,0,0.25)',
        paddingHorizontal: 2
    },
    ratingBtnAgain: {
        backgroundColor: '#EF4444',
        borderColor: '#F87171'
    },
    ratingBtnHard: {
        backgroundColor: '#F59E0B',
        borderColor: '#FBBF24'
    },
    ratingBtnGood: {
        backgroundColor: '#2563EB',
        borderColor: '#60A5FA'
    },
    ratingBtnEasy: {
        backgroundColor: '#10B981',
        borderColor: '#34D399'
    },
    ratingBtnText: {
        color: '#FFFFFF',
        fontWeight: '900',
        fontSize: 12,
        textAlign: 'center',
        textShadowColor: 'rgba(0, 0, 0, 0.35)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 2
    },
    readOnlyNextButton: {
        backgroundColor: '#10B981',
        minHeight: 54,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#34D399',
        borderBottomWidth: 3,
        borderBottomColor: 'rgba(0,0,0,0.25)'
    },
    readOnlyNextButtonText: {
        color: '#FFFFFF',
        fontWeight: '900',
        fontSize: 15
    },

    // Empty state
    emptyStateContainer: {
        flex: 1,
        backgroundColor: '#1F2937',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#374151',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 32
    },
    clearedIcon: {
        fontSize: 44,
        marginBottom: 14
    },
    clearedPrimaryText: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 6
    },
    clearedSecondaryText: {
        color: '#9CA3AF',
        fontSize: 13,
        textAlign: 'center',
        lineHeight: 18
    }
});
