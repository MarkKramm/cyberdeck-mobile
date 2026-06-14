import { DbCard, DbDeck, getAllDecks, getDueCards, logReViewPractice, rateCard } from '@/src/database';
import { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Animated,
    Easing,
    Modal,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

export default function ReviewScreen({ isFocused }: { isFocused?: boolean }) {
    const [decks, setDecks] = useState<DbDeck[]>([]);
    const [selectedDeckIdFilter, setSelectedDeckIdFilter] = useState<string>('All');
    const [dueCards, setDueCards] = useState<DbCard[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [showAnswer, setShowAnswer] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isPickerVisible, setIsPickerVisible] = useState(false);
    const [isAdvancing, setIsAdvancing] = useState(false);

    // Non-destructive practice mode flag.
    const [isReViewMode, setIsReViewMode] = useState(false);

    // Flip animation: 0 = front side, 1 = back side.
    const flipAnim = useRef(new Animated.Value(0)).current;

    // Stack transition animation: used only when moving to the next card.
    // This prevents the front side from flashing for a split second after rating a card.
    const cardTransitionAnim = useRef(new Animated.Value(1)).current;

    function resetCardSide() {
        flipAnim.stopAnimation();
        flipAnim.setValue(0);
        setShowAnswer(false);
    }

    function revealAnswer() {
        if (showAnswer) return;

        setShowAnswer(true);
        Animated.timing(flipAnim, {
            toValue: 1,
            duration: 320,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true
        }).start();
    }

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
            resetCardSide();
            cardTransitionAnim.setValue(1);
            setIsAdvancing(false);
        } catch (error) {
            console.error('Error fetching review queue data:', error);
        } finally {
            setIsLoading(false);
            setIsAdvancing(false);
        }
    }

    useEffect(() => {
        if (isFocused) {
            refreshReviewQueue(selectedDeckIdFilter, isReViewMode);
        }
    }, [isFocused, selectedDeckIdFilter, isReViewMode]);

    function handleFilterPress(id: string) {
        setIsAdvancing(false);
        setSelectedDeckIdFilter(id);
        setIsPickerVisible(false);
    }

    async function handleScoreCard(rating: 'again' | 'hard' | 'good' | 'easy') {
        const activeCard = dueCards[currentIndex];
        if (!activeCard || isAdvancing) return;

        setIsAdvancing(true);

        try {
            await rateCard(activeCard.id, rating);
            transitionToNextCard();
        } catch (error) {
            console.error('Error rating card:', error);
            setIsAdvancing(false);
        }
    }

    async function handleReViewNext() {
        const activeCard = dueCards[currentIndex];
        if (!activeCard || isAdvancing) return;

        setIsAdvancing(true);

        try {
            // Re-View is non-destructive: it logs practice only, without changing due_at or SRS interval.
            await logReViewPractice(activeCard.id);
            transitionToNextCard();
        } catch (error) {
            console.error('Error logging Re-View practice:', error);
            setIsAdvancing(false);
        }
    }

    function transitionToNextCard() {
        Animated.timing(cardTransitionAnim, {
            toValue: 0,
            duration: 170,
            easing: Easing.in(Easing.cubic),
            useNativeDriver: true
        }).start(() => {
            // The old card is now invisible, so it is safe to reset the flip state.
            // This is the key part that prevents the quick front-card flash.
            if (currentIndex < dueCards.length - 1) {
                setCurrentIndex((previousIndex) => previousIndex + 1);
                resetCardSide();

                cardTransitionAnim.setValue(0);
                requestAnimationFrame(() => {
                    Animated.timing(cardTransitionAnim, {
                        toValue: 1,
                        duration: 230,
                        easing: Easing.out(Easing.cubic),
                        useNativeDriver: true
                    }).start(() => {
                        setIsAdvancing(false);
                    });
                });
            } else {
                resetCardSide();
                cardTransitionAnim.setValue(1);
                refreshReviewQueue(selectedDeckIdFilter, isReViewMode);
            }
        });
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
    const isSelectedDeckEmpty = isReViewMode && selectedDeckIdFilter !== 'All' && currentFilteredDeckObj && (!dueCards.length && !currentCard);

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

    const frontText = currentCard?.front || '';
    const backText = currentCard?.back || '';
    const notesText = currentCard?.notes || '';
    const frontLength = frontText.length;
    const backLength = backText.length + notesText.length;

    const shouldCenterFrontPayload = frontLength <= 160;
    const shouldCenterBackPayload = backLength <= 420;
    const shouldCenterFrontText = frontLength <= 160;
    const shouldCenterBackText = backLength <= 160;
    const hasNotes = Boolean(currentCard?.notes && currentCard.notes.trim().length > 0);

    const frontRotation = flipAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '180deg']
    });

    const backRotation = flipAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['180deg', '360deg']
    });

    const cardTransitionOpacity = cardTransitionAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 1]
    });

    const cardTransitionTranslateY = cardTransitionAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [-18, 0]
    });

    const cardTransitionScale = cardTransitionAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0.985, 1]
    });

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
                        : selectedDeckIdFilter === 'All'
                            ? styles.dropdownTriggerAllDecks
                            : styles.dropdownTriggerSelectedDeck
                ]}
                onPress={() => setIsPickerVisible(true)}
            >
                <Text style={styles.dropdownTriggerText} numberOfLines={1}>
                    Deck 📚: {currentDeckName}
                </Text>
                <Text style={styles.dropdownArrow}>▼</Text>
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
                                ? 'No cards found. Add cards first.'
                                : selectedDeckIdFilter !== 'All'
                                    ? 'This deck has no due cards right now. Turn on Re-View Mode to practice it anyway.'
                                    : 'All due cards are caught up. Turn on Re-View Mode to practice ahead of schedule.'}
                    </Text>
                </View>
            ) : (
                <View style={styles.reviewWorkspace}>
                    <Animated.View
                        style={[
                            styles.animatedCardStack,
                            {
                                opacity: cardTransitionOpacity,
                                transform: [
                                    { translateY: cardTransitionTranslateY },
                                    { scale: cardTransitionScale }
                                ]
                            }
                        ]}
                    >
                        {/* Unified Flashcard */}
                        <View
                            style={[
                                styles.flashcardShell,
                                { borderColor: activeCardAccent },
                                isReViewMode && styles.flashcardShellReView
                            ]}
                        >
                            {/* Metadata: long deck names can wrap normally here */}
                            <View style={styles.flashcardMetaPanel}>
                                <View style={styles.deckIdentityRow}>
                                    <View style={[styles.deckColorDot, { backgroundColor: deckAccentColor }]} />
                                    <Text style={[styles.deckLabelCode, { color: activeCardAccent }]}>
                                        {currentCard?.deck_name || 'Unknown Deck'}
                                    </Text>
                                </View>

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

                            {/* Flip stage: front and back are both present, then rotate */}
                            <View style={styles.flipStage}>
                                <Animated.View
                                    pointerEvents={showAnswer ? 'none' : 'auto'}
                                    style={[
                                        styles.cardFace,
                                        {
                                            transform: [
                                                { perspective: 1000 },
                                                { rotateY: frontRotation }
                                            ]
                                        }
                                    ]}
                                >
                                    <ScrollView
                                        style={styles.flashcardBodyScroller}
                                        contentContainerStyle={[
                                            styles.flashcardBodyContent,
                                            shouldCenterFrontPayload ? styles.flashcardBodyContentCentered : styles.flashcardBodyContentTop
                                        ]}
                                        showsVerticalScrollIndicator={false}
                                    >
                                        <View style={styles.payloadBlock}>
                                            <Text style={[styles.frontText, shouldCenterFrontText && styles.centeredPayloadText]}>
                                                {currentCard?.front}
                                            </Text>
                                        </View>
                                    </ScrollView>
                                </Animated.View>

                                <Animated.View
                                    pointerEvents={showAnswer ? 'auto' : 'none'}
                                    style={[
                                        styles.cardFace,
                                        styles.backFace,
                                        {
                                            transform: [
                                                { perspective: 1000 },
                                                { rotateY: backRotation }
                                            ]
                                        }
                                    ]}
                                >
                                    <ScrollView
                                        style={styles.flashcardBodyScroller}
                                        contentContainerStyle={[
                                            styles.flashcardBodyContent,
                                            shouldCenterBackPayload ? styles.flashcardBodyContentCentered : styles.flashcardBodyContentTop
                                        ]}
                                        showsVerticalScrollIndicator={false}
                                    >
                                        <View style={styles.payloadBlock}>
                                            <Text style={[styles.answerSectionLabel, shouldCenterBackText && styles.centeredPayloadText]}>
                                                [ ANSWER ]
                                            </Text>

                                            <Text style={[styles.backText, shouldCenterBackText && styles.centeredPayloadText]}>
                                                {currentCard?.back}
                                            </Text>

                                            {hasNotes ? (
                                                <View
                                                    style={[
                                                        styles.notesBlockQuote,
                                                        { borderLeftColor: activeCardAccent },
                                                        shouldCenterBackText && styles.notesBlockCompact
                                                    ]}
                                                >
                                                    <Text style={[styles.notesSectionLabel, shouldCenterBackText && styles.centeredPayloadText]}>
                                                        [ ADDITIONAL NOTES ]
                                                    </Text>
                                                    <Text style={[styles.notesOutputText, shouldCenterBackText && styles.centeredPayloadText]}>
                                                        {currentCard.notes}
                                                    </Text>
                                                </View>
                                            ) : null}
                                        </View>
                                    </ScrollView>
                                </Animated.View>
                            </View>

                            {/* Side hint footer */}
                            <Text style={styles.cardSideFooter}>
                                {showAnswer ? '[ Back ]' : '[ Front ]'}
                            </Text>
                        </View>
                    </Animated.View>

                    {/* Action Controls */}
                    {!showAnswer ? (
                        <TouchableOpacity
                            style={[
                                styles.revealButton,
                                { borderColor: activeCardAccent },
                                isReViewMode && styles.revealButtonReView
                            ]}
                            onPress={revealAnswer}
                            disabled={isAdvancing}
                        >
                            <Text style={[styles.revealActionLabel, isReViewMode && styles.revealActionLabelReView]}>
                                Reveal Answer
                            </Text>
                        </TouchableOpacity>
                    ) : !isReViewMode ? (
                        <View style={styles.srsButtonRatingRow}>
                            <TouchableOpacity
                                style={[styles.ratingBtn, styles.ratingBtnAgain, isAdvancing && styles.actionButtonDisabled]}
                                onPress={() => handleScoreCard('again')}
                                disabled={isAdvancing}
                            >
                                <Text style={styles.ratingBtnText}>😵 Again</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.ratingBtn, styles.ratingBtnHard, isAdvancing && styles.actionButtonDisabled]}
                                onPress={() => handleScoreCard('hard')}
                                disabled={isAdvancing}
                            >
                                <Text style={styles.ratingBtnText}>🤔 Hard</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.ratingBtn, styles.ratingBtnGood, isAdvancing && styles.actionButtonDisabled]}
                                onPress={() => handleScoreCard('good')}
                                disabled={isAdvancing}
                            >
                                <Text style={styles.ratingBtnText}>👍 Good</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.ratingBtn, styles.ratingBtnEasy, isAdvancing && styles.actionButtonDisabled]}
                                onPress={() => handleScoreCard('easy')}
                                disabled={isAdvancing}
                            >
                                <Text style={styles.ratingBtnText}>🚀 Easy</Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <TouchableOpacity
                            style={[styles.readOnlyNextButton, isAdvancing && styles.actionButtonDisabled]}
                            onPress={handleReViewNext}
                            disabled={isAdvancing}
                        >
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
        borderWidth: 1.5,
        marginBottom: 18
    },
    dropdownTriggerAllDecks: {
        borderColor: '#FFFFFF'
    },
    dropdownTriggerSelectedDeck: {
        borderColor: '#FFFFFF'
    },
    dropdownTriggerReView: {
        borderColor: '#10B981'
    },
    dropdownTriggerText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '800',
        flex: 1
    },
    dropdownArrow: {
        color: '#FFFFFF',
        fontSize: 12,
        marginLeft: 8,
        fontWeight: '900'
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
    animatedCardStack: {
        flex: 1
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
    deckIdentityRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        width: '100%',
        marginBottom: 10
    },
    deckColorDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginRight: 8,
        marginTop: 5
    },
    deckLabelCode: {
        fontSize: 12,
        fontWeight: '900',
        textTransform: 'uppercase',
        flex: 1,
        letterSpacing: 0.5,
        lineHeight: 17
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

    // Flip stage
    flipStage: {
        flex: 1,
        position: 'relative'
    },
    cardFace: {
        ...StyleSheet.absoluteFillObject,
        backfaceVisibility: 'hidden'
    },
    backFace: {
        backfaceVisibility: 'hidden'
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

    // Side hint footer
    cardSideFooter: {
        color: '#6B7280',
        fontSize: 11,
        fontWeight: '900',
        letterSpacing: 1,
        textAlign: 'center',
        textTransform: 'uppercase',
        paddingVertical: 10,
        backgroundColor: 'rgba(17, 24, 39, 0.35)'
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
    actionButtonDisabled: {
        opacity: 0.55
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
