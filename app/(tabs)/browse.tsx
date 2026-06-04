import { DbCard, deleteCard, getAllCards } from '@/src/database';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function BrowseScreen() {
    const [cards, setCards] = useState<DbCard[]>([]);

    async function loadCards() {
        const savedCards = await getAllCards();
        setCards(savedCards);
    }

    useFocusEffect(
        useCallback(() => {
            loadCards();
        }, [])
    );

    function confirmDelete(cardId: number) {
        Alert.alert('Delete Card?', 'This will remove the card from CyberDeck.', [
            {
                text: 'Cancel',
                style: 'cancel',
            },
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
                        <Text style={styles.question}>{card.question}</Text>
                        <Text style={styles.answer}>{card.answer}</Text>

                        <TouchableOpacity
                            style={styles.deleteButton}
                            onPress={() => confirmDelete(card.id)}>
                            <Text style={styles.deleteButtonText}>Delete</Text>
                        </TouchableOpacity>
                    </View>
                ))
            )}
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
    deleteButton: {
        backgroundColor: '#7F1D1D',
        padding: 10,
        borderRadius: 8,
        alignSelf: 'flex-start',
    },
    deleteButtonText: {
        color: 'white',
        fontWeight: '600',
    },
});