import { DbCard, deleteCard, getAllCards, updateCard } from '@/src/database';
import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

const DEFAULT_CATEGORY = 'Uncategorized';

export default function BrowseScreen() {
  const [cards, setCards] = useState<DbCard[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchText, setSearchText] = useState('');

  const [editingCard, setEditingCard] = useState<DbCard | null>(null);
  const [editCategory, setEditCategory] = useState('');
  const [editQuestion, setEditQuestion] = useState('');
  const [editAnswer, setEditAnswer] = useState('');

  const isSearching = searchText.trim().length > 0;

  async function loadCards() {
    const savedCards = await getAllCards();
    setCards(savedCards);
    keepSelectedCategorySafe(savedCards);
  }

  useFocusEffect(
    useCallback(() => {
      loadCards();
    }, [])
  );

  function getCardCategory(card: DbCard) {
    return card.category?.trim() || DEFAULT_CATEGORY;
  }

  function keepSelectedCategorySafe(updatedCards: DbCard[]) {
    if (!selectedCategory) return;

    const stillExists = updatedCards.some(
      (card) => getCardCategory(card) === selectedCategory
    );

    if (!stillExists) {
      setSelectedCategory(null);
    }
  }

  const searchedCards = useMemo(() => {
    const cleanSearch = searchText.trim().toLowerCase();

    if (!cleanSearch) {
      return cards;
    }

    return cards.filter((card) => {
      const category = getCardCategory(card).toLowerCase();
      const question = card.question.toLowerCase();
      const answer = card.answer.toLowerCase();

      return (
        category.includes(cleanSearch) ||
        question.includes(cleanSearch) ||
        answer.includes(cleanSearch)
      );
    });
  }, [cards, searchText]);

  const groupedCards = cards.reduce((groups, card) => {
    const category = getCardCategory(card);

    if (!groups[category]) {
      groups[category] = [];
    }

    groups[category].push(card);
    return groups;
  }, {} as Record<string, DbCard[]>);

  const visibleCards =
    selectedCategory === null ? [] : groupedCards[selectedCategory] ?? [];

  function openEdit(card: DbCard) {
    setEditingCard(card);
    setEditCategory(getCardCategory(card));
    setEditQuestion(card.question);
    setEditAnswer(card.answer);
  }

  async function saveEdit() {
    if (!editingCard) return;

    if (!editQuestion.trim() || !editAnswer.trim()) {
      Alert.alert('Missing text', 'Question and answer cannot be empty.');
      return;
    }

    await updateCard(
      editingCard.id,
      editCategory.trim() || DEFAULT_CATEGORY,
      editQuestion.trim(),
      editAnswer.trim()
    );

    setEditingCard(null);
    setEditCategory('');
    setEditQuestion('');
    setEditAnswer('');

    const updatedCards = await getAllCards();
    setCards(updatedCards);
    keepSelectedCategorySafe(updatedCards);
  }

  function confirmDelete(cardId: number) {
    Alert.alert('Delete Card?', 'This will remove the card from CyberDeck.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteCard(cardId);

          const updatedCards = await getAllCards();
          setCards(updatedCards);
          keepSelectedCategorySafe(updatedCards);
        },
      },
    ]);
  }

  function renderCard(card: DbCard) {
    return (
      <View key={card.id} style={styles.cardBox}>
        <Text style={styles.categoryLabel}>{getCardCategory(card)}</Text>
        <Text style={styles.question}>{card.question}</Text>
        <Text style={styles.answer}>{card.answer}</Text>

        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.editButton} onPress={() => openEdit(card)}>
            <Text style={styles.actionButtonText}>Edit</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => confirmDelete(card.id)}
          >
            <Text style={styles.actionButtonText}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.contentBox}>
        <Text style={styles.title}>
          {isSearching
            ? 'Search Results'
            : selectedCategory === null
              ? 'Browse Categories'
              : selectedCategory}
        </Text>

        <TextInput
          style={styles.searchInput}
          value={searchText}
          onChangeText={(text) => {
            setSearchText(text);

            if (text.trim().length > 0) {
              setSelectedCategory(null);
            }
          }}
          placeholder="Search category, question, or answer..."
          placeholderTextColor="#9CA3AF"
        />

        {isSearching && (
          <TouchableOpacity style={styles.clearSearchButton} onPress={() => setSearchText('')}>
            <Text style={styles.clearSearchText}>Clear search</Text>
          </TouchableOpacity>
        )}

        {cards.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.subtitle}>No cards yet.</Text>
            <Text style={styles.emptyHint}>Add your first card to begin.</Text>
          </View>
        ) : isSearching ? (
          <ScrollView style={styles.scrollArea} showsVerticalScrollIndicator={false}>
            {searchedCards.length === 0 ? (
              <View style={styles.emptyBox}>
                <Text style={styles.subtitle}>No results found.</Text>
                <Text style={styles.emptyHint}>Try a different search word.</Text>
              </View>
            ) : (
              searchedCards.map(renderCard)
            )}
          </ScrollView>
        ) : selectedCategory === null ? (
          <ScrollView style={styles.scrollArea} showsVerticalScrollIndicator={false}>
            {Object.entries(groupedCards).map(([category, categoryCards]) => (
              <TouchableOpacity
                key={category}
                style={styles.folderBox}
                onPress={() => setSelectedCategory(category)}
              >
                <Text style={styles.folderTitle}>📁 {category}</Text>
                <Text style={styles.folderCount}>{categoryCards.length} card(s)</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        ) : (
          <>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => setSelectedCategory(null)}
            >
              <Text style={styles.backButtonText}>← Back to Categories</Text>
            </TouchableOpacity>

            <ScrollView style={styles.scrollArea} showsVerticalScrollIndicator={false}>
              {visibleCards.length === 0 ? (
                <View style={styles.emptyBox}>
                  <Text style={styles.subtitle}>No cards here now.</Text>
                  <Text style={styles.emptyHint}>This category may be empty now.</Text>
                </View>
              ) : (
                visibleCards.map(renderCard)
              )}
            </ScrollView>
          </>
        )}
      </View>

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

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setEditingCard(null)}
            >
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
    justifyContent: 'center',
  },
  contentBox: {
    width: '100%',
    maxHeight: '100%',
  },
  title: {
    fontSize: 34,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    marginBottom: 18,
  },
  searchInput: {
    backgroundColor: '#1F2937',
    color: 'white',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    fontSize: 16,
  },
  clearSearchButton: {
    alignItems: 'center',
    marginBottom: 12,
  },
  clearSearchText: {
    color: '#60A5FA',
    fontWeight: '600',
  },
  scrollArea: {
    width: '100%',
  },
  folderBox: {
    backgroundColor: '#1F2937',
    padding: 20,
    borderRadius: 16,
    marginBottom: 12,
  },
  folderTitle: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  folderCount: {
    color: '#9CA3AF',
    marginTop: 6,
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
  backButton: {
    marginBottom: 16,
    alignItems: 'center',
  },
  backButtonText: {
    color: '#60A5FA',
    fontSize: 16,
    fontWeight: '600',
  },
  cardBox: {
    backgroundColor: '#1F2937',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  categoryLabel: {
    color: '#60A5FA',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
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
    flex: 1,
  },
  deleteButton: {
    backgroundColor: '#7F1D1D',
    padding: 10,
    borderRadius: 8,
    flex: 1,
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