import { DbCard, DbDeck, getAllCards, getAllDecks, openDatabase, updateCard } from '@/src/database';
import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
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

const DECK_COLORS = ['#2563EB', '#10B981', '#EF4444', '#F59E0B', '#8B5CF6', '#EC4899', '#6B7280'];

type SearchScope = 'All' | 'Front' | 'Back' | 'Notes';

export default function BrowseScreen({ isFocused }: { isFocused?: boolean }) {
  const [cards, setCards] = useState<DbCard[]>([]);
  const [decks, setDecks] = useState<DbDeck[]>([]);
  const [selectedDeckId, setSelectedDeckId] = useState<number | null>(null);
  const [searchText, setSearchText] = useState('');
  const [searchScope, setSearchScope] = useState<SearchScope>('All');

  const [isBatchMode, setIsBatchMode] = useState(false);
  const [selectedCardIds, setSelectedCardIds] = useState<Set<number>>(new Set());
  const [isMoveModalVisible, setIsMoveModalVisible] = useState(false);

  const [editingCard, setEditingCard] = useState<DbCard | null>(null);
  const [editDeckId, setEditDeckId] = useState<number>(0);
  const [editCardType, setEditCardType] = useState('Q&A');
  const [editFront, setEditFront] = useState('');
  const [editBack, setEditBack] = useState('');
  const [editTags, setEditTags] = useState('');
  const [editNotes, setEditNotes] = useState('');

  const [isEditingDeck, setIsEditingDeck] = useState(false);
  const [deckFormName, setDeckFormName] = useState('');
  const [deckFormDesc, setDeckFormDesc] = useState('');
  const [deckFormColor, setDeckFormColor] = useState('#2563EB');

  const isSearching = searchText.trim().length > 0;

  async function loadData() {
    try {
      const savedCards = await getAllCards();
      const savedDecks = await getAllDecks();

      setCards(savedCards);
      setDecks(savedDecks);

      if (selectedDeckId !== null && !savedDecks.some(d => d.id === selectedDeckId)) {
        setSelectedDeckId(null);
        resetBatchSelection();
      }
    } catch (e) {
      console.error('Error loading Browse data:', e);
      Alert.alert('Load Error', 'Could not load cards and decks.');
    }
  }

  useEffect(() => {
    if (isFocused) {
      loadData();
    }
  }, [isFocused]);

  function resetBatchSelection() {
    setIsBatchMode(false);
    setSelectedCardIds(new Set());
    setIsMoveModalVisible(false);
  }

  function buildPlaceholders(ids: number[]) {
    return ids.map(() => '?').join(',');
  }

  const searchedCards = useMemo(() => {
    const cleanSearch = searchText.trim().toLowerCase();
    if (!cleanSearch) return cards;

    const tokens = cleanSearch.split(/\s+/).filter(t => t.length > 0);
    if (tokens.length === 0) return cards;

    return cards.filter((card) => {
      const deckName = (card.deck_name || '').toLowerCase();
      const cardType = (card.card_type || '').toLowerCase();
      const front = (card.front || '').toLowerCase();
      const back = (card.back || '').toLowerCase();
      const tags = (card.tags || '').toLowerCase();
      const notes = (card.notes || '').toLowerCase();

      return tokens.every((token) => {
        if (token.startsWith('#')) {
          const subToken = token.slice(1);
          return subToken ? tags.includes(subToken) : true;
        }

        if (token.startsWith('@')) {
          const subToken = token.slice(1);
          return subToken ? cardType.includes(subToken) : true;
        }

        if (token.startsWith('!')) {
          const subToken = token.slice(1);
          return subToken ? deckName.includes(subToken) : true;
        }

        switch (searchScope) {
          case 'Front':
            return front.includes(token);
          case 'Back':
            return back.includes(token);
          case 'Notes':
            return notes.includes(token);
          case 'All':
          default:
            return (
              front.includes(token) ||
              back.includes(token) ||
              notes.includes(token) ||
              deckName.includes(token) ||
              cardType.includes(token) ||
              tags.includes(token)
            );
        }
      });
    });
  }, [cards, searchText, searchScope]);

  const groupedCards = useMemo(() => {
    return cards.reduce((groups, card) => {
      const dId = card.deck_id;
      if (!groups[dId]) groups[dId] = [];
      groups[dId].push(card);
      return groups;
    }, {} as Record<number, DbCard[]>);
  }, [cards]);

  const visibleCards = selectedDeckId === null ? [] : groupedCards[selectedDeckId] ?? [];
  const selectedDeckObj = decks.find(d => d.id === selectedDeckId);

  const cardTypeOptionsForEdit = useMemo(() => {
    if (editCardType && !CARD_TYPES.includes(editCardType)) {
      return [editCardType, ...CARD_TYPES];
    }
    return CARD_TYPES;
  }, [editCardType]);

  function handleSearchTextChange(text: string) {
    setSearchText(text);

    if (text.trim().length > 0) {
      setSelectedDeckId(null);
      resetBatchSelection();
    }
  }

  function handleOpenDeck(deckId: number) {
    setSelectedDeckId(deckId);
    setSearchText('');
    resetBatchSelection();
  }

  function handleReturnToDeckRoot() {
    setSelectedDeckId(null);
    resetBatchSelection();
  }

  function openDeckEdit() {
    if (!selectedDeckObj) return;

    setDeckFormName(selectedDeckObj.name);
    setDeckFormDesc(selectedDeckObj.description || '');
    setDeckFormColor(selectedDeckObj.color || '#2563EB');
    setIsEditingDeck(true);
  }

  async function saveDeckEdit() {
    if (!selectedDeckId) return;

    if (!deckFormName.trim()) {
      Alert.alert('Missing Name', 'The deck must have a valid title.');
      return;
    }

    const duplicateDeck = decks.find(
      deck =>
        deck.id !== selectedDeckId &&
        deck.name.trim().toLowerCase() === deckFormName.trim().toLowerCase()
    );

    if (duplicateDeck) {
      Alert.alert('Duplicate Deck', 'Another deck already uses that name.');
      return;
    }

    try {
      const db = await openDatabase();
      await db.runAsync(
        'UPDATE decks SET name = ?, description = ?, color = ?, updated_at = ? WHERE id = ?;',
        [deckFormName.trim(), deckFormDesc.trim(), deckFormColor, new Date().toISOString(), selectedDeckId]
      );

      setIsEditingDeck(false);
      await loadData();
      Alert.alert('Saved', 'Deck details updated.');
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Could not update deck details.');
    }
  }

  function toggleCardSelection(id: number) {
    const updated = new Set(selectedCardIds);

    if (updated.has(id)) {
      updated.delete(id);
    } else {
      updated.add(id);
    }

    setSelectedCardIds(updated);
  }

  async function deleteCardsByIds(ids: number[]) {
    if (ids.length === 0) return;

    const db = await openDatabase();
    const placeholders = buildPlaceholders(ids);
    const now = new Date().toISOString();

    // Clean dependent records first. This keeps stats correct even if SQLite cascade behavior changes.
    await db.runAsync(`DELETE FROM review_logs WHERE card_id IN (${placeholders});`, ids);
    await db.runAsync(
      `UPDATE mistakes SET related_card_id = NULL, updated_at = ? WHERE related_card_id IN (${placeholders});`,
      [now, ...ids]
    );
    await db.runAsync(`DELETE FROM cards WHERE id IN (${placeholders});`, ids);
  }

  async function handleBatchDelete() {
    const ids = Array.from(selectedCardIds);
    if (ids.length === 0) return;

    Alert.alert(
      'Delete Selected Cards?',
      `This will permanently delete ${ids.length} selected card(s).`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Cards',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteCardsByIds(ids);

              setSelectedCardIds(new Set());
              setIsBatchMode(false);
              await loadData();
              Alert.alert('Deleted', 'Selected cards were removed.');
            } catch (e) {
              console.error(e);
              Alert.alert('Error', 'Failed to delete selected cards.');
            }
          }
        }
      ]
    );
  }

  async function handleBatchMove(targetDeckId: number) {
    const ids = Array.from(selectedCardIds);
    if (ids.length === 0) return;

    try {
      const db = await openDatabase();
      const placeholders = buildPlaceholders(ids);

      await db.runAsync(
        `UPDATE cards SET deck_id = ?, updated_at = ? WHERE id IN (${placeholders});`,
        [targetDeckId, new Date().toISOString(), ...ids]
      );

      setIsMoveModalVisible(false);
      setSelectedCardIds(new Set());
      setIsBatchMode(false);
      await loadData();
      Alert.alert('Moved ✓', 'Selected cards were moved.');
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Could not move selected cards.');
    }
  }

  function openEdit(card: DbCard) {
    setEditingCard(card);
    setEditDeckId(card.deck_id);
    setEditCardType(card.card_type || 'Q&A');
    setEditFront(card.front);
    setEditBack(card.back);
    setEditTags(card.tags || '');
    setEditNotes(card.notes || '');
  }

  async function saveEdit() {
    if (!editingCard) return;

    if (!editDeckId || !decks.some(deck => deck.id === editDeckId)) {
      Alert.alert('Missing Deck', 'Please choose a valid deck.');
      return;
    }

    if (!editFront.trim() || !editBack.trim()) {
      Alert.alert('Missing Text', 'Front and Back fields cannot be empty.');
      return;
    }

    try {
      await updateCard(
        Number(editingCard.id),
        Number(editDeckId),
        editCardType,
        editFront.trim(),
        editBack.trim(),
        editTags.trim(),
        editNotes.trim()
      );

      Keyboard.dismiss();
      setEditingCard(null);
      await loadData();
      Alert.alert('Updated', 'Card changes saved.');
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Could not save card changes.');
    }
  }

  function confirmDelete(cardId: number) {
    Alert.alert('Delete Card?', 'This will permanently delete this card and its review history.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteCardsByIds([Number(cardId)]);
            await loadData();
          } catch (e) {
            console.error(e);
            Alert.alert('Error', 'Could not delete card.');
          }
        },
      },
    ]);
  }

  function confirmDeleteDeck(deckId: number, deckName: string) {
    const count = groupedCards[deckId]?.length || 0;

    Alert.alert(
      'Delete Deck?',
      `This will permanently delete "${deckName}" and ${count} card(s) inside it. This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Deck',
          style: 'destructive',
          onPress: async () => {
            try {
              const db = await openDatabase();
              const now = new Date().toISOString();

              await db.runAsync(
                'DELETE FROM review_logs WHERE card_id IN (SELECT id FROM cards WHERE deck_id = ?);',
                [deckId]
              );
              await db.runAsync(
                'UPDATE mistakes SET related_card_id = NULL, updated_at = ? WHERE related_card_id IN (SELECT id FROM cards WHERE deck_id = ?);',
                [now, deckId]
              );
              await db.runAsync('DELETE FROM cards WHERE deck_id = ?;', [deckId]);
              await db.runAsync('DELETE FROM decks WHERE id = ?;', [deckId]);

              setSelectedDeckId(null);
              resetBatchSelection();
              await loadData();
              Alert.alert('Deleted', 'Deck and its cards were removed.');
            } catch (e) {
              console.error(e);
              Alert.alert('Error', 'Could not delete deck.');
            }
          },
        },
      ]
    );
  }

  function renderCard({ item }: { item: DbCard }) {
    const parentDeck = decks.find(d => d.id === item.deck_id);
    const accentColor = parentDeck?.color || '#374151';
    const isChecked = selectedCardIds.has(item.id);

    return (
      <TouchableOpacity
        activeOpacity={isBatchMode ? 0.7 : 1}
        onPress={() => (isBatchMode ? toggleCardSelection(item.id) : null)}
        style={[
          styles.cardBox,
          { borderColor: accentColor },
          isChecked && styles.selectedCardBoxOverride
        ]}
      >
        <View style={styles.cardMainContentWrapper}>
          {isBatchMode && (
            <View style={styles.topCheckboxContainerRow}>
              <View style={[styles.selectBoxIndicator, isChecked && { backgroundColor: '#2563EB', borderColor: '#3B82F6' }]}>
                {isChecked && <Text style={styles.checkIconMarker}>✓</Text>}
              </View>

              <Text style={styles.batchSelectionTapLabel}>
                {isChecked ? 'Selected' : 'Tap card to select'}
              </Text>
            </View>
          )}

          <View style={{ width: '100%' }}>
            <View style={styles.cardHeaderRow}>
              <Text style={[styles.categoryLabel, { color: accentColor }]} numberOfLines={2}>
                📁 {item.deck_name || 'Unknown'}
              </Text>
              <Text style={styles.typeBadge}>{item.card_type || 'Card'}</Text>
            </View>

            <Text style={styles.question}>{item.front}</Text>
            <Text style={styles.answer}>{item.back}</Text>

            {item.tags ? <Text style={styles.tagsLabel}>🏷️ {item.tags}</Text> : null}
            {item.notes ? <Text style={styles.notesLabel}>💡 {item.notes}</Text> : null}

            {!isBatchMode && (
              <View style={styles.actionRow}>
                <TouchableOpacity style={styles.editButton} onPress={() => openEdit(item)}>
                  <Text style={styles.actionButtonText}>Edit</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.deleteButton} onPress={() => confirmDelete(item.id)}>
                  <Text style={styles.actionButtonText}>Delete</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.contentBox}>
        <Text
          style={
            !isSearching && selectedDeckId === null
              ? styles.vaultTitle
              : styles.title
          }
          numberOfLines={selectedDeckId === null ? 1 : 2}
        >
          {isSearching
            ? 'Search Results'
            : selectedDeckId === null
              ? 'CARDS VAULT'
              : selectedDeckObj?.name}
        </Text>

        {!isSearching && selectedDeckId !== null && selectedDeckObj?.description ? (
          <Text style={styles.centeredDeckDescription}>
            {selectedDeckObj.description}
          </Text>
        ) : null}

        <TextInput
          style={styles.searchInput}
          value={searchText}
          onChangeText={handleSearchTextChange}
          placeholder="Search decks, cards, notes, tags ..."
          placeholderTextColor="#6B7280"
          autoCapitalize="none"
        />

        <View style={styles.scopeControlContainer}>
          <View style={styles.chipRow}>
            {(['All', 'Front', 'Back', 'Notes'] as SearchScope[]).map((scope) => (
              <TouchableOpacity
                key={scope}
                style={[styles.scopeChip, searchScope === scope && styles.activeScopeChip]}
                onPress={() => setSearchScope(scope)}
              >
                <Text style={[styles.scopeChipText, searchScope === scope && styles.activeScopeChipText]}>
                  {scope}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.legendText}>
            💡 Prefixes: <Text style={styles.boldLegend}>#</Text>tag, <Text style={styles.boldLegend}>@</Text>type, <Text style={styles.boldLegend}>!</Text>deck
          </Text>
        </View>

        {isSearching && (
          <TouchableOpacity
            style={styles.clearSearchButton}
            onPress={() => {
              setSearchText('');
              resetBatchSelection();
            }}
          >
            <Text style={styles.clearSearchText}>Clear search</Text>
          </TouchableOpacity>
        )}

        {cards.length === 0 && decks.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.subtitle}>Vault Empty</Text>
            <Text style={styles.emptyHint}>No decks or cards yet.</Text>
          </View>
        ) : isSearching ? (
          searchedCards.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.subtitle}>No Matches</Text>
              <Text style={styles.emptyHint}>Try a simpler word, #tag, @type, or !deck.</Text>
            </View>
          ) : (
            <FlatList
              data={searchedCards}
              renderItem={renderCard}
              keyExtractor={(item) => item.id.toString()}
              contentContainerStyle={[
                styles.cardListScrollContent,
                isBatchMode && selectedCardIds.size > 0 && styles.batchDockScrollPadding
              ]}
              keyboardShouldPersistTaps="always"
              showsVerticalScrollIndicator={false}
              initialNumToRender={10}
              maxToRenderPerBatch={10}
              windowSize={5}
            />
          )
        ) : selectedDeckId === null ? (
          <View style={{ flex: 1 }}>
            <ScrollView
              style={styles.scrollArea}
              contentContainerStyle={styles.deckRootScrollContent}
              keyboardShouldPersistTaps="always"
              showsVerticalScrollIndicator={false}
            >
              {decks.map((deck) => {
                const count = groupedCards[deck.id]?.length || 0;

                return (
                  <TouchableOpacity
                    key={deck.id}
                    style={[styles.folderBox, { borderLeftColor: deck.color || '#3B82F6' }]}
                    onPress={() => handleOpenDeck(Number(deck.id))}
                    onLongPress={() => confirmDeleteDeck(deck.id, deck.name)}
                  >
                    <Text style={styles.folderTitle}>📁 {deck.name}</Text>
                    {deck.description ? <Text style={styles.folderDescription}>{deck.description}</Text> : null}
                    <Text style={styles.folderCount}>{count} card(s)</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <Text style={styles.deckDeletionRootHint}>💡 Long tap a deck to delete it</Text>
          </View>
        ) : (
          <>
            <View style={styles.deckControlHeaderRow}>
              <TouchableOpacity style={styles.navBackButton} onPress={handleReturnToDeckRoot}>
                <Text style={styles.navBackButtonText}>← Return</Text>
              </TouchableOpacity>

              <View style={styles.deckActionRow}>
                <TouchableOpacity style={styles.editDeckActionButton} onPress={openDeckEdit}>
                  <Text style={styles.editDeckActionText}>✏️ Edit</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.batchTriggerActionButton, isBatchMode && styles.batchTriggerActionButtonActive]}
                  onPress={() => {
                    setIsBatchMode(!isBatchMode);
                    setSelectedCardIds(new Set());
                  }}
                >
                  <Text style={styles.batchTriggerActionText}>{isBatchMode ? '✕ Cancel' : 'Batch'}</Text>
                </TouchableOpacity>
              </View>
            </View>

            {visibleCards.length === 0 ? (
              <View style={styles.emptyBox}>
                <Text style={styles.subtitle}>No Cards</Text>
                <Text style={styles.emptyHint}>No cards added to this deck yet.</Text>
              </View>
            ) : (
              <FlatList
                data={visibleCards}
                renderItem={renderCard}
                keyExtractor={(item) => item.id.toString()}
                contentContainerStyle={[
                  styles.cardListScrollContent,
                  isBatchMode && selectedCardIds.size > 0 && styles.batchDockScrollPadding
                ]}
                keyboardShouldPersistTaps="always"
                showsVerticalScrollIndicator={false}
                initialNumToRender={10}
                maxToRenderPerBatch={10}
                windowSize={5}
              />
            )}
          </>
        )}
      </View>

      {isBatchMode && selectedCardIds.size > 0 && (
        <View style={styles.floatingActionDock}>
          <Text style={styles.dockSelectionCounterText}>Selected: {selectedCardIds.size} card(s)</Text>

          <View style={styles.dockActionBtnWrapper}>
            <TouchableOpacity style={styles.dockMoveBtn} onPress={() => setIsMoveModalVisible(true)}>
              <Text style={styles.dockBtnText}>📁 Move</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.dockDeleteBtn} onPress={handleBatchDelete}>
              <Text style={styles.dockBtnText}>🗑️ Delete</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <Modal visible={isMoveModalVisible} transparent animationType="fade" onRequestClose={() => setIsMoveModalVisible(false)}>
        <View style={styles.dropdownModalOverlay}>
          <View style={styles.dropdownContainerWindow}>
            <Text style={styles.dropdownModalTitle}>Move Cards To</Text>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 240, marginBottom: 16 }}>
              {decks
                .filter(d => d.id !== selectedDeckId)
                .map((d) => (
                  <TouchableOpacity
                    key={d.id}
                    style={[styles.dropdownSelectOptionRow, { borderLeftColor: d.color || '#3B82F6' }]}
                    onPress={() => handleBatchMove(d.id)}
                  >
                    <Text style={styles.dropdownSelectRowText}>📁 {d.name}</Text>
                  </TouchableOpacity>
                ))}

              {decks.filter(d => d.id !== selectedDeckId).length === 0 && (
                <Text style={styles.noDecksLabel}>No other decks available.</Text>
              )}
            </ScrollView>

            <TouchableOpacity style={styles.dropdownCancelBtn} onPress={() => setIsMoveModalVisible(false)}>
              <Text style={styles.actionButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={editingCard !== null} transparent animationType="slide" onRequestClose={() => setEditingCard(null)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <ScrollView style={styles.modalScrollBox} keyboardShouldPersistTaps="always" showsVerticalScrollIndicator={false}>
            <View style={styles.modalBox}>
              <Text style={styles.modalTitle}>Edit Card</Text>

              <Text style={styles.subLabel}>Deck</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalSelectorRow}>
                {decks.map((d) => (
                  <TouchableOpacity
                    key={d.id}
                    style={[
                      styles.selectorOptionButton,
                      editDeckId === d.id && { backgroundColor: d.color || '#2563EB', borderColor: '#FFFFFF' }
                    ]}
                    onPress={() => setEditDeckId(Number(d.id))}
                  >
                    <Text style={styles.selectorOptionButtonText}>📁 {d.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={styles.subLabel}>Card Type</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalSelectorRow}>
                {cardTypeOptionsForEdit.map((t) => (
                  <TouchableOpacity
                    key={t}
                    style={[styles.selectorOptionButton, editCardType === t && styles.activeTypeOptionButton]}
                    onPress={() => setEditCardType(t)}
                  >
                    <Text style={styles.selectorOptionButtonText}>{t}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={styles.subLabel}>Front</Text>
              <TextInput style={styles.input} value={editFront} onChangeText={setEditFront} multiline />

              <Text style={styles.subLabel}>Back</Text>
              <TextInput style={[styles.input, styles.answerInput]} value={editBack} onChangeText={setEditBack} multiline />

              <Text style={styles.subLabel}>Tags</Text>
              <TextInput style={styles.input} value={editTags} onChangeText={setEditTags} autoCapitalize="none" />

              <Text style={styles.subLabel}>Notes</Text>
              <TextInput style={styles.input} value={editNotes} onChangeText={setEditNotes} multiline />

              <TouchableOpacity style={styles.saveButton} onPress={saveEdit}>
                <Text style={styles.actionButtonText}>Save Changes</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.cancelButton} onPress={() => setEditingCard(null)}>
                <Text style={styles.actionButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={isEditingDeck} transparent animationType="slide" onRequestClose={() => setIsEditingDeck(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Edit Deck</Text>

            <Text style={styles.subLabel}>Deck Name</Text>
            <TextInput
              style={styles.input}
              value={deckFormName}
              onChangeText={setDeckFormName}
              placeholder="Deck name..."
              placeholderTextColor="#6B7280"
            />

            <Text style={styles.subLabel}>Description</Text>
            <TextInput
              style={styles.input}
              value={deckFormDesc}
              onChangeText={setDeckFormDesc}
              placeholder="What are you studying here?"
              placeholderTextColor="#6B7280"
              multiline
            />

            <Text style={styles.subLabel}>Deck Color</Text>
            <View style={styles.colorPickerRow}>
              {DECK_COLORS.map((color) => (
                <TouchableOpacity
                  key={color}
                  style={[
                    styles.colorDotButton,
                    { backgroundColor: color },
                    deckFormColor === color && styles.colorDotButtonActive
                  ]}
                  onPress={() => setDeckFormColor(color)}
                />
              ))}
            </View>

            <TouchableOpacity style={[styles.saveButton, { backgroundColor: deckFormColor }]} onPress={saveDeckEdit}>
              <Text style={styles.actionButtonText}>Save Deck</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.cancelButton} onPress={() => setIsEditingDeck(false)}>
              <Text style={styles.actionButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111827', paddingHorizontal: 24, paddingTop: 40 },
  contentBox: { width: '100%', height: '100%' },
  title: { fontSize: 24, fontWeight: 'bold', color: 'white', textAlign: 'center', marginBottom: 12 },
  vaultTitle: { fontSize: 37, fontWeight: '300', color: 'white', textAlign: 'center', marginBottom: 18, letterSpacing: 4 },
  centeredDeckDescription: { fontSize: 14, color: '#9CA3AF', textAlign: 'center', marginBottom: 18, paddingHorizontal: 16 },
  searchInput: { backgroundColor: '#1F2937', color: 'white', borderRadius: 14, padding: 14, marginBottom: 8, fontSize: 16, borderWidth: 1, borderColor: '#374151' },
  scopeControlContainer: { marginBottom: 16 },
  chipRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 6, marginBottom: 6 },
  scopeChip: { flex: 1, backgroundColor: '#1F2937', paddingVertical: 8, borderRadius: 10, alignItems: 'center', borderWidth: 1, borderColor: '#374151' },
  activeScopeChip: { backgroundColor: '#2563EB', borderColor: '#3B82F6' },
  scopeChipText: { color: '#9CA3AF', fontSize: 13, fontWeight: '600' },
  activeScopeChipText: { color: 'white' },
  legendText: { color: '#6B7280', fontSize: 11, textAlign: 'center', marginTop: 2 },
  boldLegend: { color: '#9CA3AF', fontWeight: 'bold' },
  clearSearchButton: { alignItems: 'center', marginBottom: 12 },
  clearSearchText: { color: '#3B82F6', fontWeight: '600' },
  scrollArea: { flex: 1 },
  deckRootScrollContent: { paddingBottom: 0 },
  cardListScrollContent: { paddingBottom: 12 },
  batchDockScrollPadding: { paddingBottom: 132 },
  folderBox: { backgroundColor: '#1F2937', padding: 18, borderRadius: 16, marginBottom: 12, borderLeftWidth: 6, borderWidth: 1, borderColor: '#374151' },
  folderTitle: { color: 'white', fontSize: 20, fontWeight: 'bold' },
  folderDescription: { color: '#9CA3AF', fontSize: 13, marginTop: 4 },
  folderCount: { color: '#6B7280', marginTop: 10, fontSize: 12, fontWeight: '600' },
  deckDeletionRootHint: { color: '#4B5563', fontSize: 11, textAlign: 'center', marginVertical: 8, fontStyle: 'italic' },
  emptyBox: { backgroundColor: '#1F2937', padding: 24, borderRadius: 16, alignItems: 'center', borderWidth: 1, borderColor: '#374151' },
  subtitle: { color: 'white', fontSize: 20, fontWeight: 'bold' },
  emptyHint: { color: '#9CA3AF', marginTop: 8, textAlign: 'center' },
  deckControlHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  navBackButton: { backgroundColor: '#064E3B', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1, borderColor: '#10B981' },
  navBackButtonText: { color: '#34D399', fontSize: 13, fontWeight: '700' },
  deckActionRow: { flexDirection: 'row', gap: 8 },
  editDeckActionButton: { backgroundColor: '#374151', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1, borderColor: '#4B5563' },
  editDeckActionText: { color: '#E5E7EB', fontSize: 12, fontWeight: '700' },
  batchTriggerActionButton: { backgroundColor: '#1F2937', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1, borderColor: '#374151' },
  batchTriggerActionButtonActive: { backgroundColor: '#2563EB', borderColor: '#3B82F6' },
  batchTriggerActionText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },

  cardBox: { backgroundColor: '#1F2937', padding: 16, borderRadius: 14, marginBottom: 12, borderWidth: 1.5 },
  selectedCardBoxOverride: { borderColor: '#2563EB', backgroundColor: '#1A2333' },
  cardMainContentWrapper: { width: '100%' },
  topCheckboxContainerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14, borderBottomWidth: 1, borderBottomColor: '#2D3748', paddingBottom: 8, width: '100%' },
  selectBoxIndicator: { width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, borderColor: '#4B5563', alignItems: 'center', justifyContent: 'center', marginBottom: 3 },
  checkIconMarker: { color: '#FFFFFF', fontSize: 11, fontWeight: 'bold' },
  batchSelectionTapLabel: { color: '#6B7280', fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 3 },
  cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10, width: '100%' },
  categoryLabel: { fontSize: 13, fontWeight: '700', flex: 1, marginRight: 12 },
  typeBadge: { backgroundColor: '#374151', color: '#F3F4F6', paddingVertical: 3, paddingHorizontal: 8, borderRadius: 6, fontSize: 11, fontWeight: '700', overflow: 'hidden' },
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
  subLabel: { color: '#9CA3AF', marginBottom: 8, fontSize: 13, fontWeight: '600', textTransform: 'uppercase' },
  input: { backgroundColor: '#111827', color: 'white', borderRadius: 12, padding: 12, marginBottom: 16, fontSize: 15, borderWidth: 1, borderColor: '#374151' },
  answerInput: { minHeight: 80, textAlignVertical: 'top' },
  colorPickerRow: { flexDirection: 'row', gap: 10, justifyContent: 'center', marginBottom: 18, flexWrap: 'wrap' },
  colorDotButton: { width: 34, height: 34, borderRadius: 17, borderWidth: 2, borderColor: 'transparent' },
  colorDotButtonActive: { borderColor: '#FFFFFF', transform: [{ scale: 1.08 }] },
  saveButton: { backgroundColor: '#2563EB', paddingVertical: 14, borderRadius: 12, marginBottom: 10, alignItems: 'center' },
  cancelButton: { backgroundColor: '#374151', paddingVertical: 14, borderRadius: 12, alignItems: 'center' },

  floatingActionDock: { position: 'absolute', bottom: 20, left: 24, right: 24, backgroundColor: '#1F2937', padding: 14, borderRadius: 16, borderWidth: 1.5, borderColor: '#2563EB', zIndex: 50 },
  dockSelectionCounterText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700', textAlign: 'center', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  dockActionBtnWrapper: { flexDirection: 'row', gap: 10 },
  dockMoveBtn: { flex: 1, backgroundColor: '#2563EB', paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  dockDeleteBtn: { flex: 1, backgroundColor: '#7F1D1D', paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  dockBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 13 },

  dropdownModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', padding: 24 },
  dropdownContainerWindow: { backgroundColor: '#1F2937', borderRadius: 20, padding: 20, borderWidth: 1, borderColor: '#374151' },
  dropdownModalTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold', marginBottom: 16, textAlign: 'center' },
  dropdownSelectOptionRow: { backgroundColor: '#111827', padding: 14, borderRadius: 10, marginBottom: 8, borderWidth: 1, borderColor: '#374151', borderLeftWidth: 5 },
  dropdownSelectRowText: { color: '#F3F4F6', fontSize: 15, fontWeight: '600' },
  noDecksLabel: { color: '#9CA3AF', fontSize: 13, textAlign: 'center', fontStyle: 'italic', marginVertical: 16 },
  dropdownCancelBtn: { backgroundColor: '#374151', paddingVertical: 12, borderRadius: 12, alignItems: 'center', marginTop: 4 }
});
