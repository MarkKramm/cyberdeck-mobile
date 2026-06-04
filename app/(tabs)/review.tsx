import { DbCard, getAllCards, incrementReviewCount } from '@/src/database';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function ReviewScreen() {
    const [cards, setCards] = useState<DbCard[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [showAnswer, setShowAnswer] = useState(false);

    useFocusEffect(
        useCallback(() => {
            async function loadCards() {
                const savedCards = await getAllCards();
                setCards(savedCards);
                setCurrentIndex(0);
                setShowAnswer(false);
            }

            loadCards();
        }, [])
    );

    const currentCard = cards[currentIndex];

    async function showNextCard() {
        if (cards.length === 0) {
            return;
        }

        await incrementReviewCount(currentCard.id);

        const updatedCards = await getAllCards();
        setCards(updatedCards);

        const nextIndex = (currentIndex + 1) % cards.length;

        setCurrentIndex(nextIndex);
        setShowAnswer(false);
    }

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Review</Text>

            {cards.length === 0 ? (
                <Text style={styles.subtitle}>No cards yet. Add a card first.</Text>
            ) : (
                <View style={styles.cardBox}>
                    <Text style={styles.counter}>
                        Card {currentIndex + 1} of {cards.length}
                    </Text>

                    <Text style={styles.reviewCount}>
                        Reviews: {currentCard.review_count ?? 0}
                    </Text>

                    <Text style={styles.label}>Question</Text>
                    <Text style={styles.question}>{currentCard.question}</Text>

                    {showAnswer ? (
                        <>
                            <Text style={styles.label}>Answer</Text>
                            <Text style={styles.answer}>{currentCard.answer}</Text>

                            <TouchableOpacity
                                style={styles.button}
                                onPress={showNextCard}>
                                <Text style={styles.buttonText}>Reviewed ✓</Text>
                            </TouchableOpacity>
                        </>
                    ) : (
                        <TouchableOpacity
                            style={styles.button}
                            onPress={() => setShowAnswer(true)}>
                            <Text style={styles.buttonText}>Show Answer</Text>
                        </TouchableOpacity>
                    )}
                </View>
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
        padding: 20,
        borderRadius: 16,
    },
    counter: {
        color: '#9CA3AF',
        marginBottom: 8,
        fontSize: 14,
    },
    reviewCount: {
        color: '#10B981',
        marginBottom: 16,
        fontSize: 14,
        fontWeight: '600',
    },
    label: {
        color: '#60A5FA',
        fontWeight: 'bold',
        marginBottom: 8,
        marginTop: 8,
    },
    question: {
        color: 'white',
        fontSize: 22,
        fontWeight: 'bold',
        marginBottom: 20,
    },
    answer: {
        color: '#D1D5DB',
        fontSize: 18,
        marginBottom: 24,
    },
    button: {
        backgroundColor: '#2563EB',
        padding: 16,
        borderRadius: 12,
        marginTop: 10,
        alignItems: 'center',
    },
    buttonText: {
        color: 'white',
        fontWeight: '600',
        fontSize: 18,
    },
});