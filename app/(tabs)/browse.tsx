import { DbCard, deleteCard, getAllCards, updateCard } from '@/src/database';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
    Alert,
    Modal,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

export default function BrowseScreen() {
    const [cards, setCards] = useState<DbCard[]>([]);
    const [editingCard, setEditingCard] = useState<DbCard | null>(null);
    const [editCategory, setEditCategory] = useState('');
    const [editQuestion, setEditQuestion] = useState('');
    const [editAnswer, setEditAnswer] = useState('');

    async function loadCards() {
        const savedCards = await getAllCards();
        setCards(savedCards);
    }

    useFocusEffect(
        useCallback(() => {
            loadCards();
        }, [])
    );

    function openEdit(card: DbCard) {
        setEditingCard(card);
        setEditCategory(card.category || 'General');
        setEditQuestion(card.question);
        setEditAnswer(card.answer);
    }

    async function saveEdit() {
        if (!editingCard) return;

        await updateCard(
            editingCard.id,
            editCategory.trim() || 'General',
            editQuestion.trim(),
            editAnswer.trim()
        );

        setEditingCard(null);
        setEditCategory('');
        setEditQuestion('');
        setEditAnswer('');

        await loadCards();
    }

    function confirmDelete(cardId: number) {
        Alert.alert('Delete Card?', 'This will remove the card from CyberDeck.', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete',
                style: 'destructive',
                onPress: async () => {
                    await deleteCard(cardId);
                    await loadCards();
                },
            },
        ]);
    }

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Browse Cards</Text>

            {cards.length === 0 ? (
                <Text style={styles.subtitle}>No cards yet. Add your first card.</Text>
            ) : (
                cards.map((card) => (
                    <View key={card.id} style={styles.cardBox}>
                        <Text style={styles.category}>{card.category || 'General'}</Text>
                        <Text style={styles.question}>{card.question}</Text>
                        <Text style={styles.answer}>{card.answer}</Text>

                        <View style={styles.actionRow}>
                            <TouchableOpacity style={styles.editButton} onPress={() => openEdit(card)}>
                                <Text style={styles.actionButtonText}>Edit</Text>
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.deleteButton} onPress={() => confirmDelete(card.id)}>
                                <Text style={styles.actionButtonText}>Delete</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                ))
            )}

            <Modal visible={editingCard !== null} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalBox}>
                        <Text style={styles.modalTitle}>Edit Card</Text>

                        <Text style={styles.label}>Category</Text>
                        <TextInput
                            style={styles.input}
                            value={editCategory}
                            onChangeText={setEditCategory}
                            placeholder="Linux, Networking, THM..."
                            placeholderTextColor="#9CA3AF"
                        />

                        <Text style={styles.label}>Question</Text>
                        <TextInput
                            style={styles.input}
                            value={editQuestion}
                            onChangeText={setEditQuestion}
                            placeholder="Question"
                            placeholderTextColor="#9CA3AF"
                        />

                        <Text style={styles.label}>Answer</Text>
                        <TextInput
                            style={[styles.input, styles.answerInput]}
                            value={editAnswer}
                            onChangeText={setEditAnswer}
                            placeholder="Answer"
                            placeholderTextColor="#9CA3AF"
                            multiline
                        />

                        <TouchableOpacity style={styles.saveButton} onPress={saveEdit}>
                            <Text style={styles.actionButtonText}>Save Changes</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.cancelButton} onPress={() => setEditingCard(null)}>
                            <Text style={styles.actionButtonText}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#111827',
        padding: 24,
        paddingTop: 60,
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        color: 'white',
        marginBottom: 24,
    },
    subtitle: {
        color: '#D1D5DB',
        fontSize: 18,
    },
    cardBox: {
        backgroundColor: '#1F2937',
        padding: 16,
        borderRadius: 12,
        marginBottom: 12,
    },
    category: {
        color: '#60A5FA',
        fontSize: 14,
        fontWeight: '700',
        marginBottom: 8,
        textTransform: 'uppercase',
    },
    question: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 8,
    },
    answer: {
        color: '#D1D5DB',
        fontSize: 16,
        marginBottom: 12,
    },
    actionRow: {
        flexDirection: 'row',
        gap: 10,
    },
    editButton: {
        backgroundColor: '#2563EB',
        padding: 10,
        borderRadius: 8,
    },
    deleteButton: {
        backgroundColor: '#7F1D1D',
        padding: 10,
        borderRadius: 8,
    },
    actionButtonText: {
        color: 'white',
        fontWeight: '600',
        textAlign: 'center',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        justifyContent: 'center',
        padding: 24,
    },
    modalBox: {
        backgroundColor: '#1F2937',
        borderRadius: 16,
        padding: 20,
    },
    modalTitle: {
        color: 'white',
        fontSize: 26,
        fontWeight: 'bold',
        marginBottom: 20,
    },
    label: {
        color: 'white',
        marginBottom: 8,
        fontSize: 16,
    },
    input: {
        backgroundColor: '#111827',
        color: 'white',
        borderRadius: 12,
        padding: 14,
        marginBottom: 16,
    },
    answerInput: {
        minHeight: 100,
        textAlignVertical: 'top',
    },
    saveButton: {
        backgroundColor: '#2563EB',
        paddingVertical: 14,
        paddingHorizontal: 24,
        borderRadius: 10,
        marginBottom: 10,
        alignItems: 'center',
    },
    cancelButton: {
        backgroundColor: '#374151',
        paddingVertical: 14,
        paddingHorizontal: 24,
        borderRadius: 10,
        alignItems: 'center',
    },
}); 