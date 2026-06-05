import { getAllDecks, saveCard } from '@/src/database';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
    Alert,
    Keyboard,
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

export default function AddScreen() {
    const [decks, setDecks] = useState<any[]>([]);
    const [selectedDeckId, setSelectedDeckId] = useState<number | null>(null);
    const [selectedType, setSelectedType] = useState('Definition');

    const [front, setFront] = useState('');
    const [back, setBack] = useState('');
    const [tags, setTags] = useState('');
    const [notes, setNotes] = useState('');

    useFocusEffect(
        useCallback(() => {
            async function loadDecks() {
                const dbDecks = await getAllDecks();
                setDecks(dbDecks);

                // Explicitly fallback select the first auto-seeded deck if none selected yet
                if (dbDecks.length > 0) {
                    setSelectedDeckId(dbDecks[0].id);
                }
            }
            loadDecks();
        }, [])
    );

    async function handleSaveCard() {
        // 1. Explicit protection checkpoint check
        if (selectedDeckId === null || selectedDeckId === undefined) {
            Alert.alert('System Initializing', 'Decks are still spinning up. Please wait a millisecond and try again.');
            return;
        }

        if (!front.trim() || !back.trim()) {
            Alert.alert('Missing Info', 'Please add both a question (Front) and an answer (Back).');
            return;
        }

        try {
            // 2. Strict type passing to bypass accidental constraints failures
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

            // Clear layout fields cleanly
            setFront('');
            setBack('');
            setTags('');
            setNotes('');
        } catch (error) {
            console.error('Save Failure Stack:', error);
            Alert.alert('Database Error', 'Could not link card to target deck constraint.');
        }
    }

    return (
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
            <View style={styles.formBox}>
                <Text style={styles.title}>Forge Card</Text>

                <Text style={styles.label}>Target Deck</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.selectorScroll}>
                    {decks.map((deck) => (
                        <TouchableOpacity
                            key={deck.id}
                            style={[
                                styles.selectorItem,
                                selectedDeckId === deck.id && { backgroundColor: deck.color || '#2563EB', borderColor: '#FFFFFF' }
                            ]}
                            onPress={() => setSelectedDeckId(deck.id)}
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
                    placeholder="e.g., What command shows current folder path?"
                    placeholderTextColor="#6B7280"
                    value={front}
                    onChangeText={setFront}
                    multiline
                />

                <Text style={styles.label}>Back (Answer / Core Logic)</Text>
                <TextInput
                    style={[styles.input, styles.answerInput]}
                    placeholder="e.g., pwd (print working directory)"
                    placeholderTextColor="#6B7280"
                    multiline
                    value={back}
                    onChangeText={setBack}
                />

                <Text style={styles.label}>Tags (Comma separated)</Text>
                <TextInput
                    style={styles.input}
                    placeholder="linux, commands, basics"
                    placeholderTextColor="#6B7280"
                    value={tags}
                    onChangeText={setTags}
                    autoCapitalize="none"
                />

                <Text style={styles.label}>Context Notes (Optional)</Text>
                <TextInput
                    style={styles.input}
                    placeholder="Use this when feeling lost in the file system tree."
                    placeholderTextColor="#6B7280"
                    value={notes}
                    onChangeText={setNotes}
                    multiline
                />

                <TouchableOpacity style={styles.button} onPress={handleSaveCard}>
                    <Text style={styles.buttonText}>Save Card</Text>
                </TouchableOpacity>
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
    formBox: {
        width: '100%',
    },
    title: {
        fontSize: 34,
        fontWeight: 'bold',
        color: '#FFFFFF',
        marginBottom: 28,
        textAlign: 'center',
        letterSpacing: 0.5,
    },
    label: {
        color: '#9CA3AF',
        marginBottom: 8,
        fontSize: 14,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    selectorScroll: {
        marginBottom: 20,
        flexDirection: 'row',
    },
    selectorItem: {
        backgroundColor: '#1F2937',
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 10,
        marginRight: 8,
        borderWidth: 1,
        borderColor: '#374151',
    },
    activeTypeItem: {
        backgroundColor: '#2563EB',
        borderColor: '#3B82F6',
    },
    selectorText: {
        color: '#FFFFFF',
        fontWeight: '600',
        fontSize: 14,
    },
    input: {
        backgroundColor: '#1F2937',
        color: '#FFFFFF',
        borderRadius: 12,
        padding: 14,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#374151',
        fontSize: 16,
    },
    answerInput: {
        minHeight: 90,
        textAlignVertical: 'top',
    },
    button: {
        backgroundColor: '#2563EB',
        padding: 18,
        borderRadius: 12,
        marginTop: 8,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#3B82F6',
    },
    buttonText: {
        color: '#FFFFFF',
        fontWeight: '600',
        fontSize: 18,
    },
});