import { createDeck, getAllDecks, saveCard } from '@/src/database';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    Alert,
    Keyboard,
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

type DeckOption = {
    id: number;
    name: string;
    description?: string | null;
    color?: string | null;
};

const CARD_TYPES = [
    'Q&A',
    'Definition',
    'ELI5',
    'Abbreviation',
    'Command',
    'Difference',
    'Port',
    'Scenario',
    'What to Check',
    'Interview'
];

const CARD_TYPE_HELPERS: Record<string, string> = {
    'Q&A': 'Best for simple question-and-answer recall.',
    'Definition': 'Best for terms, concepts, and meanings.',
    'ELI5': 'Best for explaining hard ideas in simple words.',
    'Abbreviation': 'Best for acronyms like DNS, DHCP, CIA, MFA.',
    'Command': 'Best for Linux, PowerShell, Nmap, Git, or tool commands.',
    'Difference': 'Best for confusing pairs like authn vs authz.',
    'Port': 'Best for service/port memory like 443 = HTTPS.',
    'Scenario': 'Best for “what would you do if…” thinking.',
    'What to Check': 'Best for troubleshooting or investigation checklists.',
    'Interview': 'Best for job-prep answers and practice explanations.'
};

const FRONT_PLACEHOLDERS: Record<string, string> = {
    'Q&A': 'Example: What does pwd show in Linux?',
    'Definition': 'Example: What is DNS?',
    'ELI5': 'Example: Explain DNS like I am 5.',
    'Abbreviation': 'Example: What does DHCP stand for?',
    'Command': 'Example: What does ls -la do?',
    'Difference': 'Example: Authentication vs Authorization',
    'Port': 'Example: What service usually uses port 443?',
    'Scenario': 'Example: A user reports no internet. What do you check first?',
    'What to Check': 'Example: Website does not load — what should I check?',
    'Interview': 'Example: How would you investigate a suspicious login?'
};

const BACK_PLACEHOLDERS: Record<string, string> = {
    'Q&A': 'Write the direct answer in your own words.',
    'Definition': 'Write the meaning clearly and simply.',
    'ELI5': 'Use simple words, like explaining to a beginner.',
    'Abbreviation': 'Write the full meaning and a tiny explanation.',
    'Command': 'Write what the command does and when to use it.',
    'Difference': 'Explain both sides and the main difference.',
    'Port': 'Write the service name, protocol, and memory clue.',
    'Scenario': 'Write the steps you would take and why.',
    'What to Check': 'Write a short checklist in order.',
    'Interview': 'Write a calm, structured answer.'
};

const DECK_COLORS = ['#2563EB', '#10B981', '#EF4444', '#F59E0B', '#8B5CF6', '#EC4899', '#6B7280'];

export default function AddScreen({ isFocused }: { isFocused?: boolean }) {
    const [decks, setDecks] = useState<DeckOption[]>([]);
    const [selectedDeckId, setSelectedDeckId] = useState<number | null>(null);
    const [selectedType, setSelectedType] = useState('Q&A');

    const [front, setFront] = useState('');
    const [back, setBack] = useState('');
    const [tags, setTags] = useState('');
    const [notes, setNotes] = useState('');

    const [isDeckPickerVisible, setIsDeckPickerVisible] = useState(false);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [newDeckName, setNewDeckName] = useState('');
    const [newDeckDesc, setNewDeckDesc] = useState('');
    const [newDeckColor, setNewDeckColor] = useState('#2563EB');

    const [isSavingCard, setIsSavingCard] = useState(false);
    const [isCreatingDeck, setIsCreatingDeck] = useState(false);

    const loadDecks = useCallback(async (autoSelectId?: number) => {
        try {
            const dbDecks = await getAllDecks();
            setDecks(dbDecks);

            if (autoSelectId) {
                setSelectedDeckId(Number(autoSelectId));
                return;
            }

            if (dbDecks.length > 0) {
                setSelectedDeckId(prev => {
                    const selectedStillExists = prev !== null && dbDecks.some(deck => Number(deck.id) === prev);
                    return selectedStillExists ? prev : Number(dbDecks[0].id);
                });
            } else {
                setSelectedDeckId(null);
            }
        } catch (e) {
            console.error(e);
            Alert.alert('Deck Load Error', 'Could not load your decks.');
        }
    }, []);

    useEffect(() => {
        if (isFocused) {
            loadDecks();
        }
    }, [isFocused, loadDecks]);

    const currentSelectedDeckObj = useMemo(
        () => decks.find(d => Number(d.id) === selectedDeckId),
        [decks, selectedDeckId]
    );

    const displayedDeckName = currentSelectedDeckObj ? currentSelectedDeckObj.name : 'Select Destination Deck';
    const dynamicTriggerBg = currentSelectedDeckObj ? (currentSelectedDeckObj.color || '#1F2937') : '#1F2937';
    const selectedTypeHelper = CARD_TYPE_HELPERS[selectedType] || 'Choose the format that fits the card.';
    const canSaveCard = Boolean(selectedDeckId !== null && front.trim() && back.trim() && !isSavingCard);

    async function handleCreateCustomDeck() {
        if (isCreatingDeck) return;

        const cleanedName = newDeckName.trim();
        const cleanedDesc = newDeckDesc.trim();

        if (!cleanedName) {
            Alert.alert('Missing Name', 'Please give your custom deck a title.');
            return;
        }

        setIsCreatingDeck(true);

        try {
            const currentDecks = await getAllDecks();
            if (currentDecks.some(d => d.name.trim().toLowerCase() === cleanedName.toLowerCase())) {
                Alert.alert('Naming Conflict', 'A deck with that title already exists.');
                setIsCreatingDeck(false); // Fix Bug #1: Reset flag on naming conflict early return
                return;
            }

            await createDeck(cleanedName, cleanedDesc || null, newDeckColor);

            const updatedDecks = await getAllDecks();
            const newlyCreated = updatedDecks.find(d => d.name.trim().toLowerCase() === cleanedName.toLowerCase());

            setNewDeckName('');
            setNewDeckDesc('');
            setNewDeckColor('#2563EB');
            setIsModalVisible(false);

            if (newlyCreated) {
                setDecks(updatedDecks);
                setSelectedDeckId(Number(newlyCreated.id));
            } else {
                await loadDecks();
            }

            Alert.alert('Deck Created ✓', 'Your new deck is ready.');
        } catch (error) {
            console.error(error);
            Alert.alert('Create Deck Error', 'Could not create this custom deck.');
        } finally {
            setIsCreatingDeck(false);
        }
    }

    async function handleSaveCard() {
        if (isSavingCard) return;

        if (selectedDeckId === null || selectedDeckId === undefined) {
            Alert.alert('Missing Deck', 'Please select or create a deck first.');
            return;
        }

        if (!front.trim() || !back.trim()) {
            Alert.alert('Missing Info', 'Please add both Front and Back before saving.');
            return;
        }

        try {
            setIsSavingCard(true);

            // Fix Bug #5: Cast empty strings to explicit nulls so empty placeholder rows aren't rendered
            const cleanedTags = tags.trim();
            const cleanedNotes = notes.trim();

            await saveCard(
                Number(selectedDeckId),
                selectedType,
                front.trim(),
                back.trim(),
                cleanedTags || null,
                cleanedNotes || null
            );

            Keyboard.dismiss();
            Alert.alert('Saved ✓', 'Card added to your deck.');

            setFront('');
            setBack('');
            setTags('');
            setNotes('');
        } catch (error) {
            console.error(error);
            Alert.alert('Database Error', 'Could not save this card.');
        } finally {
            setIsSavingCard(false);
        }
    }

    function closeCustomDeckModal() {
        if (isCreatingDeck) return;
        setIsModalVisible(false);
    }

    const saveButtonLabel = isSavingCard
        ? 'Saving...'
        : selectedDeckId === null
            ? 'Create Deck First'
            : !front.trim() && !back.trim()
                ? 'Front + Back Required'
                : !front.trim()
                    ? 'Front Required'
                    : !back.trim()
                        ? 'Back Required'
                        : 'Save Card';

    return (
        <KeyboardAvoidingView
            style={styles.screen}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 20 : 0}
        >
            <ScrollView
                style={styles.scrollRoot}
                contentContainerStyle={styles.container}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.formBox}>
                    <Text style={styles.title}>FORGE CARD</Text>
                    <Text style={styles.subtitle}>Manual card builder • Use Merge Import for bigger decks.</Text>

                    <View style={styles.panelCard}>
                        <View style={styles.headerLabelRow}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.label}>📁 Target Deck</Text>
                                <Text style={styles.helperText}>Where this card will live.</Text>
                            </View>

                            <TouchableOpacity style={styles.plusTriggerButton} onPress={() => setIsModalVisible(true)}>
                                <Text style={styles.plusTriggerIcon}>＋</Text>
                                <Text style={styles.plusTriggerText}>New Deck</Text>
                            </TouchableOpacity>
                        </View>

                        <TouchableOpacity
                            style={[
                                styles.dropdownTrigger,
                                { backgroundColor: dynamicTriggerBg },
                                selectedDeckId !== null && styles.dropdownTriggerSelected
                            ]}
                            onPress={() => setIsDeckPickerVisible(true)}
                        >
                            <Text style={styles.dropdownTriggerText} numberOfLines={2}>📁 {displayedDeckName}</Text>
                            <Text style={styles.dropdownArrow}>▼</Text>
                        </TouchableOpacity>

                        {currentSelectedDeckObj?.description ? (
                            <Text style={styles.deckDescriptionPreview}>{currentSelectedDeckObj.description}</Text>
                        ) : null}
                    </View>

                    <Modal transparent visible={isDeckPickerVisible} animationType="fade" onRequestClose={() => setIsDeckPickerVisible(false)}>
                        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setIsDeckPickerVisible(false)}>
                            <View style={styles.modalContent}>
                                <Text style={styles.modalTitle}>Choose Deck</Text>

                                <ScrollView style={{ maxHeight: 320 }} showsVerticalScrollIndicator={false}>
                                    {decks.length === 0 ? (
                                        <View style={styles.modalEmptyBox}>
                                            <Text style={styles.modalEmptyText}>No decks yet. Create one first.</Text>
                                        </View>
                                    ) : decks.map((deck) => {
                                        const isCurrentSelected = selectedDeckId === Number(deck.id);

                                        return (
                                            <TouchableOpacity
                                                key={deck.id}
                                                style={[
                                                    styles.modalOption,
                                                    { borderLeftColor: deck.color || '#2563EB' },
                                                    isCurrentSelected && {
                                                        backgroundColor: deck.color || '#2563EB',
                                                        borderColor: '#FFFFFF',
                                                        borderLeftColor: '#FFFFFF',
                                                        borderWidth: 1.5
                                                    }
                                                ]}
                                                onPress={() => {
                                                    setSelectedDeckId(Number(deck.id));
                                                    setIsDeckPickerVisible(false);
                                                }}
                                            >
                                                <Text style={[styles.modalOptionText, isCurrentSelected && styles.modalOptionTextSelected]}>
                                                    📁 {deck.name}
                                                </Text>
                                                {deck.description ? (
                                                    <Text style={[styles.modalOptionSubText, isCurrentSelected && styles.modalOptionSubTextSelected]}>
                                                        {deck.description}
                                                    </Text>
                                                ) : null}
                                            </TouchableOpacity>
                                        );
                                    })}
                                </ScrollView>
                            </View>
                        </TouchableOpacity>
                    </Modal>

                    <View style={styles.panelCard}>
                        <Text style={styles.label}>🧩 Card Type</Text>
                        <Text style={styles.helperText}>{selectedTypeHelper}</Text>

                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            style={styles.selectorScroll}
                            contentContainerStyle={styles.selectorContent}
                        >
                            {CARD_TYPES.map((type) => {
                                const isTypeActive = selectedType === type;

                                return (
                                    <TouchableOpacity
                                        key={type}
                                        style={[
                                            styles.selectorItem,
                                            isTypeActive && {
                                                backgroundColor: dynamicTriggerBg,
                                                borderColor: '#FFFFFF',
                                                borderWidth: 1.2
                                            }
                                        ]}
                                        onPress={() => setSelectedType(type)}
                                    >
                                        <Text style={styles.selectorText}>{type}</Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>
                    </View>

                    <View style={styles.inputCard}>
                        <View style={styles.inputHeaderRow}>
                            <Text style={styles.inputSectionTitle}>❓ Front</Text>
                            <Text style={[styles.requiredPill, front.trim() ? styles.requiredPillDone : styles.requiredPillMissing]}>
                                {front.trim() ? 'Ready' : 'Required'}
                            </Text>
                        </View>
                        <Text style={styles.inputHelper}>The question, prompt, command, term, or problem.</Text>

                        <TextInput
                            style={[styles.input, front.trim() ? styles.requiredInputFilled : styles.requiredInputEmpty]}
                            placeholder={FRONT_PLACEHOLDERS[selectedType] || 'Write the prompt for this card.'}
                            placeholderTextColor="#6B7280"
                            value={front}
                            onChangeText={setFront}
                            multiline
                        />
                    </View>

                    <View style={styles.inputCard}>
                        <View style={styles.inputHeaderRow}>
                            <Text style={styles.inputSectionTitle}>✅ Back</Text>
                            <Text style={[styles.requiredPill, back.trim() ? styles.requiredPillDone : styles.requiredPillMissing]}>
                                {back.trim() ? 'Ready' : 'Required'}
                            </Text>
                        </View>
                        <Text style={styles.inputHelper}>The answer you want future-you to remember.</Text>

                        <TextInput
                            style={[styles.input, styles.answerInput, back.trim() ? styles.requiredInputFilled : styles.requiredInputEmpty]}
                            placeholder={BACK_PLACEHOLDERS[selectedType] || 'Write the answer in your own words.'}
                            placeholderTextColor="#6B7280"
                            multiline
                            value={back}
                            onChangeText={setBack}
                        />
                    </View>

                    <View style={styles.optionalGrid}>
                        <View style={styles.optionalCard}>
                            <Text style={styles.inputSectionTitle}>🏷️ Tags</Text>
                            <Text style={styles.inputHelper}>Useful for search. Separate with commas.</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="linux, command, beginner"
                                placeholderTextColor="#6B7280"
                                value={tags}
                                onChangeText={setTags}
                                autoCapitalize="none"
                            />
                        </View>

                        <View style={styles.optionalCard}>
                            <Text style={styles.inputSectionTitle}>📝 Notes</Text>
                            <Text style={styles.inputHelper}>Hints, context, or extra memory clues.</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Optional extra context."
                                placeholderTextColor="#6B7280"
                                value={notes}
                                onChangeText={setNotes}
                                multiline
                            />
                        </View>
                    </View>
                </View>

                <Modal visible={isModalVisible} transparent animationType="slide" onRequestClose={closeCustomDeckModal}>
                    <KeyboardAvoidingView
                        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                        style={styles.modalOverlay}
                    >
                        <View style={styles.modalBox}>
                            <Text style={styles.modalTitle}>Create Custom Deck</Text>
                            <Text style={styles.modalSubtitle}>Make a new home for a topic you are learning.</Text>

                            <Text style={styles.modalLabel}>Deck Name</Text>
                            <TextInput
                                style={styles.modalInput}
                                placeholder="Example: Linux Basics"
                                placeholderTextColor="#6B7280"
                                value={newDeckName}
                                onChangeText={setNewDeckName}
                            />

                            <Text style={styles.modalLabel}>Description</Text>
                            <TextInput
                                style={styles.modalInput}
                                placeholder="Example: Commands, paths, permissions, and shell basics."
                                placeholderTextColor="#6B7280"
                                value={newDeckDesc}
                                onChangeText={setNewDeckDesc}
                                multiline
                            />

                            <Text style={styles.modalLabel}>Deck Color</Text>
                            <View style={styles.colorPaletteRow}>
                                {DECK_COLORS.map((color) => (
                                    <TouchableOpacity
                                        key={color}
                                        style={[
                                            styles.colorBubble,
                                            { backgroundColor: color },
                                            newDeckColor === color && styles.activeColorBubble
                                        ]}
                                        onPress={() => setNewDeckColor(color)}
                                    />
                                ))}
                            </View>

                            <TouchableOpacity
                                style={[styles.modalForgeButton, { backgroundColor: newDeckColor }, isCreatingDeck && styles.buttonDisabled]}
                                onPress={handleCreateCustomDeck}
                                disabled={isCreatingDeck}
                            >
                                <Text style={styles.modalForgeButtonText}>
                                    {isCreatingDeck ? 'Creating...' : 'Create Deck'}
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.modalCancelButton} onPress={closeCustomDeckModal}>
                                <Text style={styles.modalCancelButtonText}>Cancel</Text>
                            </TouchableOpacity>
                        </View>
                    </KeyboardAvoidingView>
                </Modal>
            </ScrollView>

            <View style={styles.floatingActionDock}>
                <View style={[styles.dockStatusBox, { borderColor: dynamicTriggerBg }]}>
                    <Text style={styles.dockDeckText} numberOfLines={2}>
                        📁 {currentSelectedDeckObj ? currentSelectedDeckObj.name : 'No deck selected'}
                    </Text>
                    <Text style={styles.dockTypeText} numberOfLines={1}>
                        Card Type: {selectedType}
                    </Text>
                </View>

                <TouchableOpacity
                    style={[
                        styles.dockSaveButton,
                        { backgroundColor: dynamicTriggerBg },
                        selectedDeckId !== null ? styles.buttonReady : styles.buttonWaiting,
                        !canSaveCard && styles.buttonDisabled
                    ]}
                    onPress={handleSaveCard}
                    disabled={isSavingCard}
                >
                    <Text style={styles.dockSaveText}>{saveButtonLabel}</Text>
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: '#111827' },
    scrollRoot: { flex: 1, backgroundColor: '#111827' },
    container: { padding: 24, paddingTop: 48, paddingBottom: 160 },
    formBox: { width: '100%' },
    title: {
        fontSize: 42,
        fontWeight: '300',
        color: '#FFFFFF',
        marginBottom: 6,
        textAlign: 'center',
        letterSpacing: 4
    },
    subtitle: {
        color: '#9CA3AF',
        fontSize: 12,
        textAlign: 'center',
        lineHeight: 17,
        marginBottom: 16,
        fontWeight: '700'
    },
    panelCard: {
        backgroundColor: '#1F2937',
        borderRadius: 18,
        padding: 16,
        borderWidth: 1,
        borderColor: '#374151',
        marginBottom: 14
    },
    headerLabelRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: 12,
        marginBottom: 12
    },
    plusTriggerButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#111827',
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: '#374151',
        gap: 5
    },
    plusTriggerIcon: { color: '#60A5FA', fontSize: 15, fontWeight: '900' },
    plusTriggerText: { color: '#E5E7EB', fontSize: 12, fontWeight: '800' },
    label: {
        color: '#F3F4F6',
        fontSize: 13,
        fontWeight: '900',
        textTransform: 'uppercase',
        letterSpacing: 0.8
    },
    helperText: {
        color: '#9CA3AF',
        fontSize: 12,
        lineHeight: 17,
        marginTop: 4
    },
    dropdownTrigger: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 13,
        paddingHorizontal: 16,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#374151'
    },
    dropdownTriggerSelected: {
        borderColor: '#FFFFFF',
        borderWidth: 1.5
    },
    dropdownTriggerText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '800',
        flex: 1,
        lineHeight: 19,
        textAlign: 'center'
    },
    dropdownArrow: {
        color: '#FFFFFF',
        fontSize: 12,
        marginLeft: 8,
        fontWeight: '900'
    },
    deckDescriptionPreview: {
        color: '#D1D5DB',
        fontSize: 12,
        lineHeight: 17,
        marginTop: 10,
        textAlign: 'center'
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        justifyContent: 'center',
        padding: 24
    },
    modalContent: {
        width: '100%',
        backgroundColor: '#1F2937',
        borderRadius: 18,
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
        borderRadius: 12,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: '#374151',
        borderLeftWidth: 5
    },
    modalOptionText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '800',
        textAlign: 'center'
    },
    modalOptionSubText: {
        color: '#9CA3AF',
        fontSize: 12,
        lineHeight: 16,
        marginTop: 4,
        textAlign: 'center'
    },
    modalOptionTextSelected: {
        color: '#FFFFFF', // Fix Bug #7: Text is now beautifully white when highlighted on colorful decks
        fontWeight: '900'
    },
    modalOptionSubTextSelected: {
        color: '#E5E7EB', // Fix Bug #7: Subtext is now highly readable light gray
        fontWeight: '800'
    },
    modalEmptyBox: {
        backgroundColor: '#111827',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#374151',
        padding: 16
    },
    modalEmptyText: {
        color: '#9CA3AF',
        fontSize: 13,
        textAlign: 'center'
    },
    selectorScroll: { flexDirection: 'row', marginTop: 12 },
    selectorContent: { paddingRight: 6 },
    selectorItem: {
        backgroundColor: '#111827',
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 999,
        marginRight: 8,
        borderWidth: 1,
        borderColor: '#374151',
        justifyContent: 'center'
    },
    selectorText: {
        color: '#FFFFFF',
        fontWeight: '700',
        fontSize: 14
    },
    inputCard: {
        backgroundColor: '#1F2937',
        borderRadius: 18,
        padding: 16,
        borderWidth: 1,
        borderColor: '#374151',
        marginBottom: 14
    },
    optionalGrid: {
        gap: 14
    },
    optionalCard: {
        backgroundColor: '#1F2937',
        borderRadius: 18,
        padding: 16,
        borderWidth: 1,
        borderColor: '#374151',
        marginBottom: 0
    },
    inputHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4
    },
    inputSectionTitle: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '900',
        textTransform: 'uppercase',
        letterSpacing: 0.7
    },
    requiredPill: {
        color: '#FFFFFF',
        fontSize: 10,
        fontWeight: '900',
        textTransform: 'uppercase',
        borderRadius: 999,
        paddingVertical: 4,
        paddingHorizontal: 8,
        overflow: 'hidden'
    },
    requiredPillMissing: {
        backgroundColor: '#7F1D1D',
        borderColor: '#EF4444',
        borderWidth: 1
    },
    requiredPillDone: {
        backgroundColor: '#065F46',
        borderColor: '#10B981',
        borderWidth: 1
    },
    inputHelper: {
        color: '#9CA3AF',
        fontSize: 12,
        lineHeight: 17,
        marginBottom: 10
    },
    input: {
        backgroundColor: '#111827',
        color: '#FFFFFF',
        borderRadius: 14,
        padding: 14,
        borderWidth: 1,
        borderColor: '#374151',
        fontSize: 16,
        textAlignVertical: 'top',
        textAlign: 'left',
        minHeight: 54
    },
    requiredInputEmpty: {
        borderColor: '#7F1D1D'
    },
    requiredInputFilled: {
        borderColor: '#10B981'
    },
    answerInput: {
        minHeight: 120,
        lineHeight: 23
    },
    button: {
        padding: 18,
        borderRadius: 16,
        marginTop: 18,
        alignItems: 'center',
        borderWidth: 1.5
    },
    buttonReady: {
        borderColor: '#FFFFFF'
    },
    buttonWaiting: {
        borderColor: '#3B82F6'
    },
    buttonDisabled: {
        opacity: 0.65
    },
    buttonText: {
        color: '#FFFFFF',
        fontWeight: '900',
        fontSize: 17,
        textAlign: 'center'
    },
    floatingActionDock: {
        position: 'absolute',
        left: 16,
        right: 16,
        bottom: 14,
        backgroundColor: '#1F2937',
        borderWidth: 1.5,
        borderColor: '#374151',
        borderRadius: 18,
        padding: 12,
        zIndex: 50
    },
    dockStatusBox: {
        backgroundColor: '#111827',
        borderRadius: 12,
        borderWidth: 1.5,
        borderStyle: 'dashed',
        borderColor: '#374151',
        paddingVertical: 8,
        paddingHorizontal: 10,
        marginBottom: 10,
        alignItems: 'center'
    },
    dockDeckText: {
        color: '#FFFFFF',
        fontSize: 13,
        fontWeight: '900',
        textAlign: 'center'
    },
    dockTypeText: {
        color: '#9CA3AF',
        fontSize: 11,
        fontWeight: '800',
        textAlign: 'center',
        marginTop: 3,
        textTransform: 'uppercase',
        letterSpacing: 0.4
    },
    dockSaveButton: {
        paddingVertical: 14,
        borderRadius: 14,
        alignItems: 'center',
        borderWidth: 1.5
    },
    dockSaveText: {
        color: '#FFFFFF',
        fontWeight: '900',
        fontSize: 16,
        textAlign: 'center'
    },
    modalBox: {
        backgroundColor: '#1F2937',
        borderRadius: 20,
        padding: 24,
        borderWidth: 1,
        borderColor: '#374151'
    },
    modalTitle: {
        color: '#FFFFFF',
        fontSize: 24,
        fontWeight: '900',
        marginBottom: 6,
        textAlign: 'center'
    },
    modalSubtitle: {
        color: '#9CA3AF',
        fontSize: 13,
        textAlign: 'center',
        lineHeight: 18,
        marginBottom: 20
    },
    modalLabel: {
        color: '#9CA3AF',
        fontSize: 12,
        fontWeight: '800',
        textTransform: 'uppercase',
        marginBottom: 8,
        letterSpacing: 0.5
    },
    modalInput: {
        backgroundColor: '#111827',
        color: '#FFFFFF',
        borderRadius: 12,
        padding: 12,
        marginBottom: 18,
        fontSize: 15,
        borderWidth: 1,
        borderColor: '#374151',
        textAlignVertical: 'top'
    },
    colorPaletteRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 24,
        paddingHorizontal: 4
    },
    colorBubble: {
        width: 32,
        height: 32,
        borderRadius: 16,
        borderWidth: 2,
        borderColor: 'transparent'
    },
    activeColorBubble: {
        borderColor: '#FFFFFF',
        transform: [{ scale: 1.15 }]
    },
    modalForgeButton: {
        padding: 14,
        borderRadius: 12,
        alignItems: 'center',
        marginBottom: 10
    },
    modalForgeButtonText: {
        color: '#FFFFFF',
        fontWeight: '900',
        fontSize: 16
    },
    modalCancelButton: {
        backgroundColor: '#374151',
        padding: 14,
        borderRadius: 12,
        alignItems: 'center'
    },
    modalCancelButtonText: {
        color: '#FFFFFF',
        fontWeight: '700',
        fontSize: 16
    }
});