import { DbCard, DbDeck, deleteCard, getAllCards, getAllDecks, openDatabase, updateCard } from '@/src/database';
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

type SearchScope = 'All' | 'Front' | 'Back' | 'Notes';

export default function BrowseScreen({ isFocused }: { isFocused?: boolean }) {
  const [cards, setCards] = useState<DbCard[]>([]);
  const [decks, setDecks] = useState<DbDeck[]>([]);
  const [selectedDeckId, setSelectedDeckId] = useState<number | null>(null);
  const [searchText, setSearchText] = useState('');
  const [searchScope, setSearchScope] = useState<SearchScope>('All');

  // Multi-Select Batch Matrix states
  const [isBatchMode, setIsBatchMode] = useState(false);
  const [selectedCardIds, setSelectedCardIds] = useState<Set<number>>(new Set());
  const [isMoveModalVisible, setIsMoveModalVisible] = useState(false);

  const [editingCard, setEditingCard] = useState<DbCard | null>(null);
  const [editDeckId, setEditDeckId] = useState<number>(0);
  const [editCardType, setEditCardType] = useState('Definition');
  const [editFront, setEditFront] = useState('');
  const [editBack, setEditBack] = useState('');
  const [editTags, setEditTags] = useState('');
  const [editNotes, setEditNotes] = useState('');

  const [isEditingDeck, setIsEditingDeck] = useState(false);
  const [deckFormName, setDeckFormName] = useState('');
  const [deckFormDesc, setDeckFormDesc] = useState('');

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

  useEffect(() => {
    if (isFocused) {
      loadData();
    }
  }, [isFocused, selectedDeckId]);

  const searchedCards = useMemo(() => {
    const cleanSearch = searchText.trim().toLowerCase();
    if (!cleanSearch) return cards;

    const tokens = cleanSearch.split(/\s+/).filter(t => t.length > 0);
    if (tokens.length === 0) return cards;

    return cards.filter((card) => {
      const deckName = (card.deck_name || '').toLowerCase();
      const cardType = (card.card_type || '').toLowerCase();
      const front = card.front.toLowerCase();
      const back = card.back.toLowerCase();
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

  function openDeckEdit() {
    if (!selectedDeckObj) return;
    setDeckFormName(selectedDeckObj.name);
    setDeckFormDesc(selectedDeckObj.description || '');
    setIsEditingDeck(true);
  }

  async function saveDeckEdit() {
    if (!deckFormName.trim()) {
      Alert.alert('Missing Name', 'The deck must have a valid title.');
      return;
    }
    if (!selectedDeckId) return;

    try {
      const db = await openDatabase();
      await db.runAsync(
        'UPDATE decks SET name = ?, description = ?, updated_at = ? WHERE id = ?;',
        [deckFormName.trim(), deckFormDesc.trim(), new Date().toISOString(), selectedDeckId]
      );
      
      setIsEditingDeck(false);
      await loadData();
      Alert.alert('Success', 'Deck properties modified securely.');
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Could not overwrite deck metadata profile rules.');
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

  async function handleBatchDelete() {
    if (selectedCardIds.size === 0) return;
    Alert.alert(
      'Destroy Selected Cards?',
      `Are you sure you want to permanently delete these ${selectedCardIds.size} flashcards from storage?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Block',
          style: 'destructive',
          onPress: async () => {
            try {
              const db = await openDatabase();
              const idsArray = Array.from(selectedCardIds).join(',');
              await db.runAsync(`DELETE FROM cards WHERE id IN (${idsArray});`);
              await db.runAsync(`DELETE FROM review_logs WHERE card_id IN (${idsArray});`);
              
              setSelectedCardIds(new Set());
              setIsBatchMode(false);
              await loadData();
              Alert.alert('Purged', 'Selected cards wiped clean.');
            } catch (e) {
              console.error(e);
              Alert.alert('Error', 'Failed to execute batch deletion.');
            }
          }
        }
      ]
    );
  }

  async function handleBatchMove(targetDeckId: number) {
    if (selectedCardIds.size === 0) return;
    try {
      const db = await openDatabase();
      const idsArray = Array.from(selectedCardIds).join(',');
      await db.runAsync(`UPDATE cards SET deck_id = ? WHERE id IN (${idsArray});`, [targetDeckId]);
      
      setIsMoveModalVisible(false);
      setSelectedCardIds(new Set());
      setIsBatchMode(false);
      await loadData();
      Alert.alert('Moved ✓', 'Cards re-allocated to destination profile.');
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Could not migrate block variables.');
    }
  }

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
          await deleteCard(Number(cardId));
          await loadData();
        },
      },
    ]);
  }

  function confirmDeleteDeck(deckId: number, deckName: string) {
    Alert.alert(
      'Wipe Entire Folder?', 
      `Wiping this deck will instantly destroy "${deckName}" AND all cards stored inside it permanently! This cannot be undone.`, 
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Wipe Deck',
          style: 'destructive',
          onPress: async () => {
            const db = await openDatabase();
            await db.runAsync('DELETE FROM cards WHERE deck_id = ?;', [deckId]);
            await db.runAsync('DELETE FROM decks WHERE id = ?;', [deckId]);
            setSelectedDeckId(null);
            await loadData();
            Alert.alert('Purged', 'Deck and internal structures completely removed.');
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
        onPress={() => isBatchMode ? toggleCardSelection(item.id) : null}
        style={[
          styles.cardBox, 
          { borderColor: accentColor }, 
          isChecked && styles.selectedCardBoxOverride
        ]}
      >
        <View style={styles.cardMainContentWrapper}>
          {/* Separate top row layout for checkboxes—prevents horizontal text compression entirely */}
          {isBatchMode && (
            <View style={styles.topCheckboxContainerRow}>
              <View style={[styles.selectBoxIndicator, isChecked && { backgroundColor: '#2563EB', borderColor: '#3B82F6' }]}>
                {isChecked && <Text style={styles.checkIconMarker}>✓</Text>}
              </View>
              <Text style={styles.batchSelectionTapLabel}>
                {isChecked ? "Profile targeted for transition" : "Tap card to select object"}
              </Text>
            </View>
          )}
          
          <View style={{ width: '100%' }}>
            <View style={styles.cardHeaderRow}>
              <Text style={[styles.categoryLabel, { color: accentColor }]} numberOfLines={1}>📁 {item.deck_name || 'Unknown'}</Text>
              <Text style={styles.typeBadge}>{item.card_type}</Text>
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
          onChangeText={(text) => {
            setSearchText(text);
            if (text.trim().length > 0) {
              setSelectedDeckId(null);
            }
          }}
          placeholder="Search decks, cards, notes, tags ..."
          placeholderTextColor="#6B7280"
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
            💡 Search Prefixes: <Text style={styles.boldLegend}>#</Text>tag, <Text style={styles.boldLegend}>@</Text>type,  <Text style={styles.boldLegend}>!</Text>deck + word/content
          </Text>
        </View>

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
          searchedCards.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.subtitle}>No matching artifacts</Text>
            </View>
          ) : (
            <FlatList
              data={searchedCards}
              renderItem={renderCard}
              keyExtractor={(item) => item.id.toString()}
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="always"
              showsVerticalScrollIndicator={false}
              initialNumToRender={10}
              maxToRenderPerBatch={10}
              windowSize={5}
            />
          )
        ) : selectedDeckId === null ? (
          <View style={{ flex: 1 }}>
            <ScrollView style={styles.scrollArea} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="always" showsVerticalScrollIndicator={false}>
              {decks.map((deck) => {
                const count = groupedCards[deck.id]?.length || 0;
                return (
                  <TouchableOpacity
                    key={deck.id}
                    style={[styles.folderBox, { borderLeftColor: deck.color || '#3B82F6' }]}
                    onPress={() => setSelectedDeckId(Number(deck.id))}
                    onLongPress={() => confirmDeleteDeck(deck.id, deck.name)}
                  >
                    <Text style={styles.folderTitle}>📁 {deck.name}</Text>
                    {deck.description ? <Text style={styles.folderDescription}>{deck.description}</Text> : null}
                    <Text style={styles.folderCount}>{count} concept card(s)</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <Text style={styles.deckDeletionRootHint}>💡 Hint: Long tap folder to delete deck profile</Text>
          </View>
        ) : (
          <>
            <View style={styles.deckControlHeaderRow}>
              <TouchableOpacity style={styles.navBackButton} onPress={() => { setSelectedDeckId(null); setIsBatchMode(false); setSelectedCardIds(new Set()); }}>
                <Text style={styles.navBackButtonText}>{"<--- Return"}</Text>
              </TouchableOpacity>
              
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TouchableOpacity style={styles.editDeckActionButton} onPress={openDeckEdit}>
                  <Text style={styles.editDeckActionText}>✏️ Edit Deck</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.batchTriggerActionButton, isBatchMode && { backgroundColor: '#2563EB', borderColor: '#3B82F6' }]} 
                  onPress={() => { setIsBatchMode(!isBatchMode); setSelectedCardIds(new Set()); }}
                >
                  <Text style={styles.batchTriggerActionText}>{isBatchMode ? '✕ Cancel' : '⛓️ Batch'}</Text>
                </TouchableOpacity>
              </View>
            </View>

            {visibleCards.length === 0 ? (
              <View style={styles.emptyBox}>
                <Text style={styles.subtitle}>No contents</Text>
                <Text style={styles.emptyHint}>No items added to this profile yet.</Text>
              </View>
            ) : (
              <FlatList
                data={visibleCards}
                renderItem={renderCard}
                keyExtractor={(item) => item.id.toString()}
                contentContainerStyle={styles.scrollContent}
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

      {/* DYNAMIC FLOATING BOTTOM OVERLAY DOCK */}
      {isBatchMode && selectedCardIds.size > 0 && (
        <View style={styles.floatingActionDock}>
          <Text style={styles.dockSelectionCounterText}>Selected: {selectedCardIds.size} object profiles</Text>
          <View style={styles.dockActionBtnWrapper}>
            <TouchableOpacity style={styles.dockMoveBtn} onPress={() => setIsMoveModalVisible(true)}>
              <Text style={styles.dockBtnText}>📁 Move Blocks</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.dockDeleteBtn} onPress={handleBatchDelete}>
              <Text style={styles.dockBtnText}>🗑️ Wipe Selected</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* FIXED MOVE MODAL DROPDOWN */}
      <Modal visible={isMoveModalVisible} transparent animationType="fade">
        <View style={styles.dropdownModalOverlay}>
          <View style={styles.dropdownContainerWindow}>
            <Text style={styles.dropdownModalTitle}>Select Target Destination Deck</Text>
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
                <Text style={styles.noDecksLabel}>No alternative allocation profiles initialized.</Text>
              )}
            </ScrollView>
            <TouchableOpacity style={styles.dropdownCancelBtn} onPress={() => setIsMoveModalVisible(false)}>
              <Text style={styles.actionButtonText}>Cancel Transition</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={editingCard !== null} transparent animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <ScrollView style={styles.modalScrollBox} keyboardShouldPersistTaps="always" showsVerticalScrollIndicator={false}>
            <View style={styles.modalBox}>
              <Text style={styles.modalTitle}>Modify Card Specs</Text>
              <Text style={styles.subLabel}>Parent Deck Allocation</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalSelectorRow}>
                {decks.map((d) => (
                  <TouchableOpacity
                    key={d.id}
                    style={[
                      styles.selectorOptionButton,
                      editDeckId === d.id && { backgroundColor: d.color || '#2563EB', borderColor: '#FFF' }
                    ]}
                    onPress={() => setEditDeckId(Number(d.id))}
                  >
                    <Text style={styles.selectorOptionButtonText}>📁 {d.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={styles.subLabel}>Card Context Type</Text>
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

              <Text style={styles.subLabel}>Front (Concept)</Text>
              <TextInput style={styles.input} value={editFront} onChangeText={setEditFront} multiline />
              <Text style={styles.subLabel}>Back (Logic Engine)</Text>
              <TextInput style={[styles.input, styles.answerInput]} value={editBack} onChangeText={setEditBack} multiline />
              <Text style={styles.subLabel}>Metadata Tags</Text>
              <TextInput style={styles.input} value={editTags} onChangeText={setEditTags} autoCapitalize="none" />
              <Text style={styles.subLabel}>Context Reference Notes</Text>
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

      <Modal visible={isEditingDeck} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Modify Deck Specs</Text>
            <Text style={styles.subLabel}>Deck Title</Text>
            <TextInput style={styles.input} value={deckFormName} onChangeText={setDeckFormName} placeholder="Deck name..." placeholderTextColor="#6B7280" />
            <Text style={styles.subLabel}>Description (Optional)</Text>
            <TextInput style={styles.input} value={deckFormDesc} onChangeText={setDeckFormDesc} placeholder="What are you studying here?" placeholderTextColor="#6B7280" multiline />

            <TouchableOpacity style={[styles.saveButton, { backgroundColor: '#10B981' }]} onPress={saveDeckEdit}>
              <Text style={styles.actionButtonText}>Save Deck Profile</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelButton} onPress={() => setIsEditingDeck(false)}>
              <Text style={styles.actionButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  // FIXED TOP MARGIN GAP OVERLAY CHANNELS FROM 64 -> 40 DOWNWARD
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
  scrollContent: { paddingBottom: 180 },
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
  editDeckActionButton: { backgroundColor: '#374151', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1, borderColor: '#4B5563' },
  editDeckActionText: { color: '#E5E7EB', fontSize: 12, fontWeight: '700' },
  batchTriggerActionButton: { backgroundColor: '#1F2937', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1, borderColor: '#374151' },
  batchTriggerActionText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  
  cardBox: { backgroundColor: '#1F2937', padding: 16, borderRadius: 14, marginBottom: 12, borderWidth: 1.5 },
  selectedCardBoxOverride: { borderColor: '#2563EB', backgroundColor: '#1A2333' },
  cardMainContentWrapper: { width: '100%' },
  
  // Clean, isolated top block row for checkboxes
  topCheckboxContainerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14, borderBottomWidth: 1, borderBottomColor: '#2D3748', paddingBottom: 8, width: '100%' },
  selectBoxIndicator: { width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, borderColor: '#4B5563', alignItems: 'center', justifyContent: 'center', marginBottom: 3 },
  checkIconMarker: { color: '#FFFFFF', fontSize: 11, fontWeight: 'bold' },
  batchSelectionTapLabel: { color: '#6B7280', fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 3 },
  
  cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, width: '100%' },
  categoryLabel: { fontSize: 13, fontWeight: '700', flex: 1, marginRight: 12 },
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
  subLabel: { color: '#9CA3AF', marginBottom: 8, fontSize: 13, fontWeight: '600', textTransform: 'uppercase' },
  input: { backgroundColor: '#111827', color: 'white', borderRadius: 12, padding: 12, marginBottom: 16, fontSize: 15, borderWidth: 1, borderColor: '#374151' },
  answerInput: { minHeight: 80, textAlignVertical: 'top' },
  saveButton: { backgroundColor: '#2563EB', paddingVertical: 14, borderRadius: 12, marginBottom: 10, alignItems: 'center' },
  cancelButton: { backgroundColor: '#374151', paddingVertical: 14, borderRadius: 12, alignItems: 'center' },

  // FLOATING ACTION DOCK
  floatingActionDock: { position: 'absolute', bottom: 20, left: 24, right: 24, backgroundColor: '#1F2937', padding: 14, borderRadius: 16, borderWidth: 1.5, borderColor: '#2563EB', zIndex: 50 },
  dockSelectionCounterText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700', textAlign: 'center', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  dockActionBtnWrapper: { flexDirection: 'row', gap: 10 },
  dockMoveBtn: { flex: 1, backgroundColor: '#2563EB', paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  dockDeleteBtn: { flex: 1, backgroundColor: '#7F1D1D', paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  dockBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 13 },

  // DROPDOWN SELECT MODAL WINDOW STYLES
  dropdownModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', padding: 24 },
  dropdownContainerWindow: { backgroundColor: '#1F2937', borderRadius: 20, padding: 20, borderWidth: 1, borderColor: '#374151' },
  dropdownModalTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold', marginBottom: 16, textAlign: 'center' },
  dropdownSelectOptionRow: { backgroundColor: '#111827', padding: 14, borderRadius: 10, marginBottom: 8, borderWidth: 1, borderColor: '#374151', borderLeftWidth: 5 },
  dropdownSelectRowText: { color: '#F3F4F6', fontSize: 15, fontWeight: '600' },
  noDecksLabel: { color: '#9CA3AF', fontSize: 13, textAlign: 'center', fontStyle: 'italic', marginVertical: 16 },
  dropdownCancelBtn: { backgroundColor: '#374151', paddingVertical: 12, borderRadius: 12, alignItems: 'center', marginTop: 4 }
});