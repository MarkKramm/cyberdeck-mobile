import { DbCard, DbDeck, deleteCard, getAllCards, getAllDecks, openDatabase, updateCard } from '@/src/database';
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

export default function BrowseScreen() {
  const [cards, setCards] = useState<DbCard[]>([]);
  const [decks, setDecks] = useState<DbDeck[]>([]);
  const [selectedDeckId, setSelectedDeckId] = useState<number | null>(null);
  const [searchText, setSearchText] = useState('');

  // Editing modal form bindings
  const [editingCard, setEditingCard] = useState<DbCard | null>(null);
  const [editDeckId, setEditDeckId] = useState<number>(0);
  const [editCardType, setEditCardType] = useState('Definition');
  const [editFront, setEditFront] = useState('');
  const [editBack, setEditBack] = useState('');
  const [editTags, setEditTags] = useState('');
  const [editNotes, setEditNotes] = useState('');

  const isSearching = searchText.trim().length > 0;

  async function loadData() {
    const savedCards = await getAllCards();
    const savedDecks = await getAllDecks();
    setCards(savedCards);
    setDecks(savedDecks);

    if (selectedDeckId !== null && !savedDecks.some(d => d.id === selectedDeckId)) {
      setSelectedDeckId(null);
    }
  }

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [selectedDeckId])
  );

  const searchedCards = useMemo(() => {
    const cleanSearch = searchText.trim().toLowerCase();
    if (!cleanSearch) return cards;

    return cards.filter((card) => {
      const deckName = (card.deck_name || '').toLowerCase();
      const type = (card.card_type || '').toLowerCase();
      const front = card.front.toLowerCase();
      const back = card.back.toLowerCase();
      const tags = (card.tags || '').toLowerCase();

      return (
        deckName.includes(cleanSearch) ||
        type.includes(cleanSearch) ||
        front.includes(cleanSearch) ||
        back.includes(cleanSearch) ||
        tags.includes(cleanSearch)
      );
    });
  }, [cards, searchText]);

  const groupedCards = useMemo(() => {
    return cards.reduce((groups, card) => {
      const dId = card.deck_id;
      if (!groups[dId]) groups[dId] = [];
      groups[dId].push(card);
      return groups;
    }, {} as Record<number, DbCard[]>);
  }, [cards]);

  const visibleCards = selectedDeckId === null ? [] : groupedCards[selectedDeckId] ?? [];

  function openEdit(card: DbCard) {
    setEditingCard(card);
    setEditDeckId(card.deck_id);
    setEditCardType(card.card_type || 'Definition');
    setEditFront(card.front);
    setEditBack(card.back);
    setEditTags(card.tags || '');
    setEditNotes(card.notes || '');
  }

  async function saveEdit() {
    if (!editingCard) return;

    if (!editFront.trim() || !editBack.trim()) {
      Alert.alert('Missing text', 'Question and answer fields cannot be left empty.');
      return;
    }

    try {
      await updateCard(
        editingCard.id,
        editDeckId,
        editCardType,
        editFront.trim(),
        editBack.trim(),
        editTags.trim(),
        editNotes.trim()
      );

      setEditingCard(null);
      await loadData();
      Alert.alert('Updated', 'Card updates written successfully.');
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Could not save modifications.');
    }
  }

  function confirmDelete(cardId: number) {
    Alert.alert('Destroy Card?', 'This will permanently delete this record from storage.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteCard(cardId);
          await loadData();
        },
      },
    ]);
  }

  function confirmDeleteDeck(deckId: number, deckName: string) {
    Alert.alert(
      'Destroy Entire Deck?', 
      `Are you sure you want to delete "${deckName}"? This will permanently wipe out the deck AND all cards stored inside it!`, 
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Wipe Deck',
          style: 'destructive',
          onPress: async () => {
            const db = await openDatabase();
            await db.runAsync('DELETE FROM decks WHERE id = ?;', [deckId]);
            setSelectedDeckId(null);
            await loadData();
            Alert.alert('Purged', 'Deck records completely removed.');
          },
        },
      ]
    );
  }

  function renderCard(card: DbCard) {
    return (
      <View key={card.id} style={styles.cardBox}>
        <View style={styles.cardHeaderRow}>
          <Text style={styles.categoryLabel}>📁 {card.deck_name || 'Unknown'}</Text>
          <Text style={styles.typeBadge}>{card.card_type}</Text>
        </View>
        <Text style={styles.question}>{card.front}</Text>
        <Text style={styles.answer}>{card.back}</Text>
        {card.tags ? <Text style={styles.tagsLabel}>🏷️ {card.tags}</Text> : null}
        {card.notes ? <Text style={styles.notesLabel}>💡 {card.notes}</Text> : null}

        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.editButton} onPress={() => openEdit(card)}>
            <Text style={styles.actionButtonText}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.deleteButton} onPress={() => confirmDelete(card.id)}>
            <Text style={styles.actionButtonText}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const selectedDeckObj = decks.find(d => d.id === selectedDeckId);

  return (
    <View style={styles.container}>
      <View style={styles.contentBox}>
        <Text style={styles.title}>
          {isSearching
            ? 'Search Results'
            : selectedDeckId === null
              ? 'Browse Vault'
              : selectedDeckObj?.name}
        </Text>

        <TextInput
          style={styles.searchInput}
          value={searchText}
          onChangeText={(text) => {
            setSearchText(text);
            if (text.trim().length > 0) {
              setSelectedDeckId(null);
            }
          }}
          placeholder="Search decks, types, content, tags..."
          placeholderTextColor="#6B7280"
        />

        {isSearching && (
          <TouchableOpacity style={styles.clearSearchButton} onPress={() => setSearchText('')}>
            <Text style={styles.clearSearchText}>Clear search query</Text>
          </TouchableOpacity>
        )}

        {cards.length === 0 && decks.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.subtitle}>Vault Empty</Text>
            <Text style={styles.emptyHint}>No categories initialized yet.</Text>
          </View>
        ) : isSearching ? (
          <ScrollView style={styles.scrollArea} showsVerticalScrollIndicator={false}>
            {searchedCards.length === 0 ? (
              <View style={styles.emptyBox}>
                <Text style={styles.subtitle}>No matching artifacts</Text>
              </View>
            ) : (
              searchedCards.map(renderCard)
            )}
          </ScrollView>
        ) : selectedDeckId === null ? (
          <ScrollView style={styles.scrollArea} showsVerticalScrollIndicator={false}>
            {decks.map((deck) => {
              const count = groupedCards[deck.id]?.length || 0;
              return (
                <TouchableOpacity
                  key={deck.id}
                  style={[styles.folderBox, { borderLeftColor: deck.color || '#3B82F6' }]}
                  onPress={() => setSelectedDeckId(deck.id)}
                >
                  <Text style={styles.folderTitle}>📁 {deck.name}</Text>
                  {deck.description ? <Text style={styles.folderDescription}>{deck.description}</Text> : null}
                  <Text style={styles.folderCount}>{count} concept card(s)</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        ) : (
          <>
            <View style={styles.deckControlHeaderRow}>
              <TouchableOpacity style={styles.backButton} onPress={() => setSelectedDeckId(null)}>
                <Text style={styles.backButtonText}>← Return</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.deleteDeckActionButton} onPress={() => confirmDeleteDeck(selectedDeckObj!.id, selectedDeckObj!.name)}>
                <Text style={styles.deleteDeckActionText}>🗑 Delete Deck</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.scrollArea} showsVerticalScrollIndicator={false}>
              {visibleCards.length === 0 ? (
                <View style={styles.emptyBox}>
                  <Text style={styles.subtitle}>No contents</Text>
                  <Text style={styles.emptyHint}>No items added to this profile yet.</Text>
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
          <ScrollView style={styles.modalScrollBox}>
            <View style={styles.modalBox}>
              <Text style={styles.modalTitle}>Modify Card Specs</Text>

              <Text style={styles.label}>Parent Deck Allocation</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalSelectorRow}>
                {decks.map((d) => (
                  <TouchableOpacity
                    key={d.id}
                    style={[
                      styles.selectorOptionButton,
                      editDeckId === d.id && { backgroundColor: d.color || '#2563EB', borderColor: '#FFF' }
                    ]}
                    onPress={() => setEditDeckId(d.id)}
                  >
                    <Text style={styles.selectorOptionButtonText}>📁 {d.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={styles.label}>Card Context Type</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalSelectorRow}>
                {CARD_TYPES.map((t) => (
                  <TouchableOpacity
                    key={t}
                    style={[styles.selectorOptionButton, editCardType === t && styles.activeTypeOptionButton]}
                    onPress={() => setEditCardType(t)}
                  >
                    <Text style={styles.selectorOptionButtonText}>{t}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={styles.label}>Front (Concept)</Text>
              <TextInput style={styles.input} value={editFront} onChangeText={setEditFront} multiline />

              <Text style={styles.label}>Back (Logic Engine)</Text>
              <TextInput style={[styles.input, styles.answerInput]} value={editBack} onChangeText={setEditBack} multiline />

              <Text style={styles.label}>Metadata Tags</Text>
              <TextInput style={styles.input} value={editTags} onChangeText={setEditTags} autoCapitalize="none" />

              <Text style={styles.label}>Context Reference Notes</Text>
              <TextInput style={styles.input} value={editNotes} onChangeText={setEditNotes} multiline />

              <TouchableOpacity style={styles.saveButton} onPress={saveEdit}>
                <Text style={styles.actionButtonText}>Save Changes</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setEditingCard(null)}>
                <Text style={styles.actionButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111827',
    paddingHorizontal: 24,
    paddingTop: 64, // Pushes header down away from the status bar
  },
  contentBox: { width: '100%', maxHeight: '100%' },
  title: { fontSize: 34, fontWeight: 'bold', color: 'white', textAlign: 'center', marginBottom: 18 },
  searchInput: { backgroundColor: '#1F2937', color: 'white', borderRadius: 14, padding: 14, marginBottom: 10, fontSize: 16, borderWidth: 1, borderColor: '#374151' },
  clearSearchButton: { alignItems: 'center', marginBottom: 12 },
  clearSearchText: { color: '#3B82F6', fontWeight: '600' },
  scrollArea: { width: '100%', marginBottom: 80 },
  folderBox: { backgroundColor: '#1F2937', padding: 18, borderRadius: 16, marginBottom: 12, borderLeftWidth: 6, borderWidth: 1, borderColor: '#374151' },
  folderTitle: { color: 'white', fontSize: 20, fontWeight: 'bold' },
  folderDescription: { color: '#9CA3AF', fontSize: 13, marginTop: 4 },
  folderCount: { color: '#6B7280', marginTop: 10, fontSize: 12, fontWeight: '600' },
  emptyBox: { backgroundColor: '#1F2937', padding: 24, borderRadius: 16, alignItems: 'center', borderWidth: 1, borderColor: '#374151' },
  subtitle: { color: 'white', fontSize: 20, fontWeight: 'bold' },
  emptyHint: { color: '#9CA3AF', marginTop: 8, textAlign: 'center' },
  deckControlHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  backButton: { paddingVertical: 6, paddingHorizontal: 12 },
  backButtonText: { color: '#3B82F6', fontSize: 16, fontWeight: '600' },
  deleteDeckActionButton: { backgroundColor: '#7F1D1D', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8 },
  deleteDeckActionText: { color: '#FCA5A5', fontSize: 12, fontWeight: '700' },
  cardBox: { backgroundColor: '#1F2937', padding: 16, borderRadius: 14, marginBottom: 12, borderWidth: 1, borderColor: '#374151' },
  cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  categoryLabel: { color: '#60A5FA', fontSize: 13, fontWeight: '700' },
  typeBadge: { backgroundColor: '#374151', color: '#F3F4F6', paddingVertical: 3, paddingHorizontal: 8, borderRadius: 6, fontSize: 11, fontWeight: '700' },
  question: { color: 'white', fontSize: 18, fontWeight: 'bold', marginBottom: 8 },
  answer: { color: '#D1D5DB', fontSize: 15, marginBottom: 12, lineHeight: 20 },
  tagsLabel: { color: '#9CA3AF', fontSize: 12, marginBottom: 4 },
  notesLabel: { color: '#6B7280', fontSize: 12, fontStyle: 'italic', marginBottom: 12 },
  actionRow: { flexDirection: 'row', gap: 10 },
  editButton: { backgroundColor: '#1F2937', padding: 10, borderRadius: 8, flex: 1, borderWidth: 1, borderColor: '#4B5563' },
  deleteButton: { backgroundColor: '#7F1D1D', padding: 10, borderRadius: 8, flex: 1 },
  actionButtonText: { color: 'white', fontWeight: '600', textAlign: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.8)', justifyContent: 'center', padding: 24 },
  modalScrollBox: { marginVertical: 32 },
  modalBox: { backgroundColor: '#1F2937', borderRadius: 20, padding: 20, borderWidth: 1, borderColor: '#374151' },
  modalTitle: { color: 'white', fontSize: 26, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  horizontalSelectorRow: { marginBottom: 16, flexDirection: 'row' },
  selectorOptionButton: { backgroundColor: '#111827', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, marginRight: 6, borderWidth: 1, borderColor: '#374151' },
  activeTypeOptionButton: { backgroundColor: '#2563EB', borderColor: '#3B82F6' },
  selectorOptionButtonText: { color: 'white', fontSize: 13, fontWeight: '600' },
  input: { backgroundColor: '#111827', color: 'white', borderRadius: 12, padding: 12, marginBottom: 16, fontSize: 15, borderWidth: 1, borderColor: '#374151' },
  answerInput: { minHeight: 80, textAlignVertical: 'top' },
  saveButton: { backgroundColor: '#2563EB', paddingVertical: 14, borderRadius: 12, marginBottom: 10, alignItems: 'center' },
  cancelButton: { backgroundColor: '#374151', paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
});