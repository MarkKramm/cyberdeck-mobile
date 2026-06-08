import { createDeck, getAllDecks, saveCard } from '@/src/database';
import { useCallback, useEffect, useState } from 'react';
import {
    Alert,
    Keyboard,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

const CARD_TYPES = [
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

const DECK_COLORS = ['#2563EB', '#10B981', '#EF4444', '#F59E0B', '#8B5CF6', '#EC4899', '#6B7280'];

export default function AddScreen({ isFocused }: { isFocused?: boolean }) {
    const [decks, setDecks] = useState<any[]>([]);
    const [selectedDeckId, setSelectedDeckId] = useState<number | null>(null);
    const [selectedType, setSelectedType] = useState('Definition');

    const [front, setFront] = useState('');
    const [back, setBack] = useState('');
    const [tags, setTags] = useState('');
    const [notes, setNotes] = useState('');

    const [isModalVisible, setIsModalVisible] = useState(false);
    const [newDeckName, setNewDeckName] = useState('');
    const [newDeckDesc, setNewDeckDesc] = useState('');
    const [newDeckColor, setNewDeckColor] = useState('#2563EB');

    const loadDecks = useCallback(async (autoSelectId?: number) => {
        try {
            const dbDecks = await getAllDecks();
            setDecks(dbDecks);
            
            if (autoSelectId) {
                setSelectedDeckId(Number(autoSelectId));
            } else if (dbDecks.length > 0 && selectedDeckId === null) {
                setSelectedDeckId(Number(dbDecks[0].id));
            }
        } catch (e) {
            console.error(e);
        }
    }, [selectedDeckId]);

    // BUG FIX: Refreshes selectors when the card insertion tab is swiped active
    useEffect(() => {
        if (isFocused) {
            loadDecks();
        }
  }, [isFocused, loadDecks]);

    async function handleCreateCustomDeck() {
        if (!newDeckName.trim()) {
            Alert.alert('Missing Name', 'Please give your custom deck a title.');
            return;
        }

        try {
            const currentDecks = await getAllDecks();
            if (currentDecks.some(d => d.name.toLowerCase() === newDeckName.trim().toLowerCase())) {
                Alert.alert('Naming Conflict', 'A deck with that title already exists in your vault.');
                return;
            }

            await createDeck(newDeckName.trim(), newDeckDesc.trim(), newDeckColor);
            
            const updatedDecks = await getAllDecks();
            const newlyCreated = updatedDecks.find(d => d.name.toLowerCase() === newDeckName.trim().toLowerCase());
            
            setNewDeckName('');
            setNewDeckDesc('');
            setIsModalVisible(false);
            
            if (newlyCreated) {
                setDecks(updatedDecks);
                setSelectedDeckId(Number(newlyCreated.id));
            } else {
                await loadDecks();
            }
            
            Alert.alert('Deck Forged ✓', 'Your custom category is live.');
        } catch (error) {
            Alert.alert('System Error', 'Could not register custom deck layout.');
        }
    }

    async function handleSaveCard() {
        if (selectedDeckId === null || selectedDeckId === undefined) {
            Alert.alert('System Missing Deck', 'Please select or create a deck first.');
            return;
        }
        
        if (!front.trim() || !back.trim()) {
            Alert.alert('Missing Info', 'Please add both a question (Front) and an answer (Back).');
            return;
        }

        try {
            await saveCard(
                Number(selectedDeckId),
                selectedType,
                front.trim(),
                back.trim(),
                tags.trim(),
                notes.trim()
            );

            Keyboard.dismiss();
            Alert.alert('Success', 'Card secured into your CyberVault.');

            setFront('');
            setBack('');
            setTags('');
            setNotes('');
        } catch (error) {
            console.error(error);
            Alert.alert('Database Error', 'Could not save card properties.');
        }
    }

    return (
        <ScrollView style={{ flex: 1, backgroundColor: '#111827' }} contentContainerStyle={styles.container} keyboardShouldPersistTaps="always">
            <View style={styles.formBox}>
                <Text style={styles.title}>Forge Card</Text>

                <View style={styles.headerLabelRow}>
                    <Text style={styles.label}>Target Deck</Text>
                    <TouchableOpacity style={styles.plusTriggerButton} onPress={() => setIsModalVisible(true)}>
                        <Text style={styles.plusTriggerText}>➕ Custom Deck</Text>
                    </TouchableOpacity>
                </View>

                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.selectorScroll}>
                    {decks.map((deck) => (
                        <TouchableOpacity
                            key={deck.id}
                            style={[
                                styles.selectorItem,
                                selectedDeckId === deck.id && { backgroundColor: deck.color || '#2563EB', borderColor: '#FFFFFF' }
                            ]}
                            onPress={() => setSelectedDeckId(Number(deck.id))}
                        >
                            <Text style={styles.selectorText}>📁 {deck.name}</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>

                <Text style={styles.label}>Card Type</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.selectorScroll}>
                    {CARD_TYPES.map((type) => (
                        <TouchableOpacity
                            key={type}
                            style={[
                                styles.selectorItem,
                                selectedType === type && styles.activeTypeItem
                            ]}
                            onPress={() => setSelectedType(type)}
                        >
                            <Text style={styles.selectorText}>{type}</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>

                <Text style={styles.label}>Front (Question / Concept)</Text>
                <TextInput
                    style={styles.input}
                    placeholder="Enter concept query..."
                    placeholderTextColor="#6B7280"
                    value={front}
                    onChangeText={setFront}
                    multiline
                />

                <Text style={styles.label}>Back (Answer / Core Logic)</Text>
                <TextInput
                    style={[styles.input, styles.answerInput]}
                    placeholder="Enter explanatory answer logic..."
                    placeholderTextColor="#6B7280"
                    multiline
                    value={back}
                    onChangeText={setBack}
                />

                <Text style={styles.label}>Tags (Comma separated)</Text>
                <TextInput
                    style={styles.input}
                    placeholder="e.g., flashcard, notes"
                    placeholderTextColor="#6B7280"
                    value={tags}
                    onChangeText={setTags}
                    autoCapitalize="none"
                />

                <Text style={styles.label}>Context Notes (Optional)</Text>
                <TextInput
                    style={styles.input}
                    placeholder="Enter optional hint context rules..."
                    placeholderTextColor="#6B7280"
                    value={notes}
                    onChangeText={setNotes}
                    multiline
                />

                <TouchableOpacity style={styles.button} onPress={handleSaveCard}>
                    <Text style={styles.buttonText}>Save Card</Text>
                </TouchableOpacity>
            </View>

            <Modal visible={isModalVisible} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalBox}>
                        <Text style={styles.modalTitle}>Create Custom Deck</Text>
                        
                        <Text style={styles.modalLabel}>Deck Name</Text>
                        <TextInput 
                            style={styles.modalInput} 
                            placeholder="e.g., Spanish Vocab" 
                            placeholderTextColor="#6B7280"
                            value={newDeckName}
                            onChangeText={setNewDeckName}
                        />

                        <Text style={styles.modalLabel}>Description (Optional)</Text>
                        <TextInput 
                            style={styles.modalInput} 
                            placeholder="What are you studying here?" 
                            placeholderTextColor="#6B7280"
                            value={newDeckDesc}
                            onChangeText={setNewDeckDesc}
                        />

                        <Text style={styles.modalLabel}>Branding Theme Color</Text>
                        <View style={styles.colorPaletteRow}>
                            {DECK_COLORS.map((color) => (
                                <TouchableOpacity
                                    key={color}
                                    style={[styles.colorBubble, { backgroundColor: color }, newDeckColor === color && styles.activeColorBubble]}
                                    onPress={() => setNewDeckColor(color)}
                                />
                            ))}
                        </View>

                        <TouchableOpacity style={styles.modalForgeButton} onPress={handleCreateCustomDeck}>
                            <Text style={styles.modalForgeButtonText}>Forge Deck Structure</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.modalCancelButton} onPress={() => setIsModalVisible(false)}>
                            <Text style={styles.modalCancelButtonText}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { padding: 24, paddingTop: 64, justifyContent: 'center' },
    formBox: { width: '100%' },
    title: { fontSize: 34, fontWeight: 'bold', color: '#FFFFFF', marginBottom: 28, textAlign: 'center', letterSpacing: 0.5 },
    headerLabelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    plusTriggerButton: { backgroundColor: '#1F2937', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1, borderColor: '#374151' },
    plusTriggerText: { color: '#60A5FA', fontSize: 12, fontWeight: '700' },
    label: { color: '#9CA3AF', fontSize: 14, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
    selectorScroll: { marginBottom: 20, flexDirection: 'row' },
    selectorItem: { backgroundColor: '#1F2937', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 10, marginRight: 8, borderWidth: 1, borderColor: '#374151' },
    activeTypeItem: { backgroundColor: '#2563EB', borderColor: '#3B82F6' },
    selectorText: { color: '#FFFFFF', fontWeight: '600', fontSize: 14 },
    input: { backgroundColor: '#1F2937', color: '#FFFFFF', borderRadius: 12, padding: 14, marginBottom: 20, borderWidth: 1, borderColor: '#374151', fontSize: 16 },
    answerInput: { minHeight: 90, textAlignVertical: 'top' },
    button: { backgroundColor: '#2563EB', padding: 18, borderRadius: 12, marginTop: 8, alignItems: 'center', borderWidth: 1, borderColor: '#3B82F6' },
    buttonText: { color: '#FFFFFF', fontWeight: '600', fontSize: 18 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.85)', justifyContent: 'center', padding: 24 },
    modalBox: { backgroundColor: '#1F2937', borderRadius: 20, padding: 24, borderWidth: 1, borderColor: '#374151' },
    modalTitle: { color: '#FFFFFF', fontSize: 24, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
    modalLabel: { color: '#9CA3AF', fontSize: 12, fontWeight: '700', textTransform: 'uppercase', marginBottom: 8, letterSpacing: 0.5 },
    modalInput: { backgroundColor: '#111827', color: '#FFFFFF', borderRadius: 10, padding: 12, marginBottom: 18, fontSize: 15, borderWidth: 1, borderColor: '#374151' },
    colorPaletteRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24, paddingHorizontal: 4 },
    colorBubble: { width: 32, height: 32, borderRadius: 16, borderWidth: 2, borderColor: 'transparent' },
    activeColorBubble: { borderColor: '#FFFFFF', transform: [{ scale: 1.15 }] },
    modalForgeButton: { backgroundColor: '#10B981', padding: 14, borderRadius: 12, alignItems: 'center', marginBottom: 10 },
    modalForgeButtonText: { color: '#FFFFFF', fontWeight: '700', fontSize: 16 },
    modalCancelButton: { backgroundColor: '#374151', padding: 14, borderRadius: 12, alignItems: 'center' },
    modalCancelButtonText: { color: '#9CA3AF', fontWeight: '600', fontSize: 16 }
});