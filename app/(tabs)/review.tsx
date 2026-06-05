import {
    DbCard,
    getCardsByCategory,
    getCategories,
    incrementReviewCount,
} from '@/src/database';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function ReviewScreen() {
    const [cards, setCards] = useState<DbCard[]>([]);
    const [categories, setCategories] = useState<string[]>([]);
    const [selectedCategory, setSelectedCategory] = useState('Uncategorized');
    const [currentIndex, setCurrentIndex] = useState(0);
    const [showAnswer, setShowAnswer] = useState(false);

    async function loadReviewData(category: string) {
        const savedCategories = await getCategories();

        let activeCategory = category;

        if (savedCategories.length > 0 && !savedCategories.includes(category)) {
            activeCategory = savedCategories[0];
            setSelectedCategory(savedCategories[0]);
        }

        const savedCards = await getCardsByCategory(activeCategory);

        setCategories(savedCategories);
        setCards(savedCards);
        setCurrentIndex(0);
        setShowAnswer(false);
    }

    useFocusEffect(
        useCallback(() => {
            loadReviewData(selectedCategory);
        }, [selectedCategory])
    );

    const currentCard = cards[currentIndex];

    async function chooseCategory(category: string) {
        setSelectedCategory(category);
        await loadReviewData(category);
    }

    async function showNextCard() {
        if (!currentCard || cards.length === 0) return;

        await incrementReviewCount(currentCard.id);

        const updatedCards = await getCardsByCategory(selectedCategory);
        setCards(updatedCards);

        const nextIndex = (currentIndex + 1) % updatedCards.length;
        setCurrentIndex(nextIndex);
        setShowAnswer(false);
    }

    return (
        <View style={styles.container}>
            <View style={styles.contentBox}>
                <Text style={styles.title}>Review</Text>

                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.categoryScroll}
                    contentContainerStyle={styles.categoryRow}>
                    {categories.map((category) => (
                        <TouchableOpacity
                            key={category}
                            style={[
                                styles.categoryButton,
                                selectedCategory === category && styles.selectedCategoryButton,
                            ]}
                            onPress={() => chooseCategory(category)}>
                            <Text
                                style={[
                                    styles.categoryButtonText,
                                    selectedCategory === category && styles.selectedCategoryButtonText,
                                ]}>
                                {category}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>

                {cards.length === 0 ? (
                    <View style={styles.emptyBox}>
                        <Text style={styles.subtitle}>No cards found.</Text>
                        <Text style={styles.emptyHint}>Add a card first to start reviewing.</Text>
                    </View>
                ) : (
                    <View style={styles.cardBox}>
                        <Text style={styles.counter}>
                            Card {currentIndex + 1} of {cards.length}
                        </Text>

                        <Text style={styles.categoryLabel}>
                            {currentCard.category || 'Uncategorized'}
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

                                <TouchableOpacity style={styles.button} onPress={showNextCard}>
                                    <Text style={styles.buttonText}>Reviewed ✓</Text>
                                </TouchableOpacity>
                            </>
                        ) : (
                            <TouchableOpacity style={styles.button} onPress={() => setShowAnswer(true)}>
                                <Text style={styles.buttonText}>Show Answer</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#111827',
        padding: 24,
        justifyContent: 'center',
    },
    contentBox: {
        width: '100%',
    },
    title: {
        fontSize: 36,
        fontWeight: 'bold',
        color: 'white',
        textAlign: 'center',
        marginBottom: 18,
    },
    categoryScroll: {
        maxHeight: 44,
        marginBottom: 24,
    },
    categoryRow: {
        flexGrow: 1,
        justifyContent: 'center',
        gap: 10,
    },
    categoryButton: {
        backgroundColor: '#1F2937',
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 999,
        justifyContent: 'center',
    },
    selectedCategoryButton: {
        backgroundColor: '#2563EB',
    },
    categoryButtonText: {
        color: '#D1D5DB',
        fontWeight: '600',
    },
    selectedCategoryButtonText: {
        color: 'white',
    },
    emptyBox: {
        backgroundColor: '#1F2937',
        padding: 20,
        borderRadius: 16,
        alignItems: 'center',
    },
    subtitle: {
        color: 'white',
        fontSize: 20,
        fontWeight: 'bold',
    },
    emptyHint: {
        color: '#9CA3AF',
        marginTop: 8,
        textAlign: 'center',
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
    categoryLabel: {
        color: '#60A5FA',
        fontSize: 14,
        fontWeight: '700',
        marginBottom: 8,
        textTransform: 'uppercase',
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