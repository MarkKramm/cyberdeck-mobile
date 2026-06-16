import {
  addMistake,
  addWin,
  DbMistake,
  DbWin,
  deleteMistake,
  deleteWin,
  exportDatabaseToBackupObject,
  getAllMistakes,
  getAllWins,
  getReadyDatabase,
  resetCardsOnly,
  resetEverything,
  resetSrsStats,
  updateMistakeContent,
  updateMistakeStatus,
  updateWin
} from '@/src/database';
import { useEffect, useState } from 'react';
import {
  Alert,
  Clipboard,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';

type BackupPayload = {
  version?: number;
  exported_at?: string;
  decks?: any[];
  cards?: any[];
  mistakes?: any[];
  wins?: any[];
  reviewLogs?: any[];
};

export default function MoreScreen({ isFocused }: { isFocused?: boolean }) {
  const [activeTab, setActiveTab] = useState<'mistakes' | 'wins' | 'backup'>('mistakes');

  const [mistakes, setMistakes] = useState<DbMistake[]>([]);
  const [wins, setWins] = useState<DbWin[]>([]);

  const [mistakeTitle, setMistakeTitle] = useState('');
  const [mistakeExplanation, setMistakeExplanation] = useState('');
  const [winText, setWinText] = useState('');

  // Inline editing states
  const [editingMistakeId, setEditingMistakeId] = useState<number | null>(null);
  const [editMistakeTitle, setEditMistakeTitle] = useState('');
  const [editMistakeExplanation, setEditMistakeExplanation] = useState('');

  const [editingWinId, setEditingWinId] = useState<number | null>(null);
  const [editWinText, setEditWinText] = useState('');

  // Loading guard — prevents double-taps on export/import/merge/restore buttons
  const [isBusy, setIsBusy] = useState(false);

  const openMistakeCount = mistakes.filter(item => item.status !== 'resolved').length;
  const resolvedMistakeCount = mistakes.filter(item => item.status === 'resolved').length;
  const winCount = wins.length;

  async function loadData() {
    try {
      const [mistakeData, winData] = await Promise.all([
        getAllMistakes(),
        getAllWins()
      ]);

      setMistakes(mistakeData);
      setWins(winData);
    } catch (e) {
      console.error('Error fetching More screen data:', e);
    }
  }

  // Consistent with every other screen: reload data when the PagerView makes
  // this tab visible, and again whenever the user switches sub-tabs (activeTab).
  useEffect(() => {
    if (isFocused) {
      loadData();
    }
  }, [isFocused, activeTab]);

  function resetInlineEditors() {
    setEditingMistakeId(null);
    setEditMistakeTitle('');
    setEditMistakeExplanation('');
    setEditingWinId(null);
    setEditWinText('');
  }

  function normalizeBackupArray(value: unknown): any[] {
    return Array.isArray(value) ? value : [];
  }

  function formatDateLabel(value?: string | null) {
    if (!value) return 'Unknown date';

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return 'Unknown date';

    return parsed.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }

  function askForConfirmation(
    title: string,
    message: string,
    confirmText: string,
    isDestructive = true
  ): Promise<boolean> {
    return new Promise((resolve) => {
      Alert.alert(title, message, [
        { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
        {
          text: confirmText,
          style: isDestructive ? 'destructive' : undefined,
          onPress: () => resolve(true)
        }
      ]);
    });
  }

  function normalizeImportKey(value: unknown) {
    return String(value ?? '').trim().toLowerCase();
  }

  const IMPORT_TEMPLATE = JSON.stringify(
    {
      decks: [
        {
          name: 'Your Deck Name',
          description: 'Optional description of this deck',
          color: '#2563EB'
        }
      ],
      cards: [
        {
          deck_name: 'Your Deck Name',
          card_type: 'Q&A',
          front: 'Question or term here',
          back: 'Answer or definition here',
          tags: 'optional, comma, separated',
          notes: 'Optional extra context'
        },
        {
          deck_name: 'Your Deck Name',
          card_type: 'Q&A',
          front: 'Second question here',
          back: 'Second answer here',
          tags: null,
          notes: null
        }
      ]
    },
    null,
    2
  );

  function handleCopyImportTemplate() {
    Clipboard.setString(IMPORT_TEMPLATE);
    Alert.alert(
      'Template Copied ✓',
      'Paste this into ChatGPT or Claude and say:\n\n"Fill this JSON template with flashcards about [your topic]. Keep the exact structure."'
    );
  }

  function cleanOptionalText(value: unknown): string | null {
    const cleaned = String(value ?? '').trim();
    return cleaned.length > 0 ? cleaned : null;
  }

  // MISTAKE HANDLERS
  async function handleAddMistake() {
    if (!mistakeTitle.trim()) {
      Alert.alert('Missing Entry', 'Please identify the concept causing confusion.');
      return;
    }

    try {
      await addMistake(mistakeTitle.trim(), mistakeExplanation.trim(), null);
      setMistakeTitle('');
      setMistakeExplanation('');
      Keyboard.dismiss();
      await loadData();
      Alert.alert('Logged', 'Confusion captured in your Mistake Bank.');
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Could not save this mistake entry.');
    }
  }

  async function toggleMistakeStatus(item: DbMistake) {
    try {
      const nextStatus = item.status === 'open' ? 'resolved' : 'open';
      await updateMistakeStatus(item.id, nextStatus as 'open' | 'resolved');
      await loadData();
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Could not update mistake status.');
    }
  }

  function startEditMistake(item: DbMistake) {
    setEditingMistakeId(item.id);
    setEditMistakeTitle(item.title);
    setEditMistakeExplanation(item.explanation || '');
  }

  async function handleSaveMistakeEdit() {
    if (!editingMistakeId) return;

    if (!editMistakeTitle.trim()) {
      Alert.alert('Error', 'Mistake title cannot be left empty.');
      return;
    }

    try {
      await updateMistakeContent(
        editingMistakeId,
        editMistakeTitle.trim(),
        editMistakeExplanation.trim() || null
      );

      setEditingMistakeId(null);
      setEditMistakeTitle('');
      setEditMistakeExplanation('');
      Keyboard.dismiss();
      await loadData();
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Could not save mistake edits.');
    }
  }

  function confirmDeleteMistake(id: number) {
    Alert.alert('Remove Mistake?', 'Permanently remove this mistake entry?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteMistake(id);
            await loadData();
          } catch (e) {
            console.error(e);
            Alert.alert('Error', 'Could not remove mistake entry.');
          }
        }
      }
    ]);
  }

  // WIN HANDLERS
  async function handleAddWin() {
    if (!winText.trim()) {
      Alert.alert('Blank Win', 'Capture your milestone first.');
      return;
    }

    try {
      await addWin(winText.trim());
      setWinText('');
      Keyboard.dismiss();
      await loadData();
      Alert.alert('Saved ✓', 'Victory logged.');
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Could not save this win.');
    }
  }

  function startEditWin(item: DbWin) {
    setEditingWinId(item.id);
    setEditWinText(item.text);
  }

  async function handleSaveWinEdit() {
    if (!editingWinId) return;

    if (!editWinText.trim()) {
      Alert.alert('Error', 'Win description cannot be empty.');
      return;
    }

    try {
      await updateWin(editingWinId, editWinText.trim());

      setEditingWinId(null);
      setEditWinText('');
      Keyboard.dismiss();
      await loadData();
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Could not modify win record.');
    }
  }

  function confirmDeleteWin(id: number) {
    Alert.alert('Delete Win?', 'Remove this win from your history?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteWin(id);
            await loadData();
          } catch (e) {
            console.error(e);
            Alert.alert('Error', 'Could not delete win record.');
          }
        }
      }
    ]);
  }

  // SYSTEM RESET SUITE
  function triggerSystemReset(mode: 'cards' | 'stats' | 'all') {
    let title = '';
    let message = '';
    let confirmText = 'Confirm Reset';

    if (mode === 'cards') {
      title = 'Reset Flashcards?';
      message = 'This permanently deletes all cards and review logs. Decks, Mistakes, and Wins will remain.';
      confirmText = 'Delete Cards';
    } else if (mode === 'stats') {
      title = 'Reset Review Stats?';
      message = 'This deletes review logs and resets all cards to new, due now, 0 reviews, 0 lapses, and 0 interval days. Cards and decks will remain.';
      confirmText = 'Reset Stats';
    } else {
      title = '⚠️ Full App Wipe?';
      message = 'This deletes every deck, card, review log, mistake, and win. Export a backup first if you need your data.';
      confirmText = 'Full Wipe';
    }

    Alert.alert(title, message, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: confirmText,
        style: 'destructive',
        onPress: async () => {
          try {
            if (mode === 'cards') {
              await resetCardsOnly();
            } else if (mode === 'stats') {
              await resetSrsStats();
            } else {
              await resetEverything();
              setMistakes([]);
              setWins([]);
            }

            resetInlineEditors();
            await loadData();
            Alert.alert('Reset Complete', 'Selected data was reset successfully.');
          } catch (e) {
            console.error(e);
            Alert.alert('Error', 'Failed to execute reset.');
          }
        }
      }
    ]);
  }

  // EXPORT FILE PIPELINE
  async function handleExportBackup() {
    if (isBusy) return;
    setIsBusy(true);
    try {
      const backupData = await exportDatabaseToBackupObject();
      const stringifiedPayload = JSON.stringify(backupData, null, 2);

      const stamp = new Date().toISOString().slice(0, 10);
      const fileUri = `${FileSystem.cacheDirectory}flashcard_app_backup_${stamp}.json`;

      await FileSystem.writeAsStringAsync(fileUri, stringifiedPayload);

      await Share.share(
        Platform.OS === 'ios'
          ? { url: fileUri }
          : {
              title: 'Flashcard App Backup',
              url: fileUri,
              message: 'Backup file generated. Save this JSON somewhere safe.'
            }
      );
    } catch (error) {
      console.error(error);
      Alert.alert('Export Failure', 'Could not create backup file.');
    } finally {
      setIsBusy(false);
    }
  }

  async function restoreBackupPayload(parsed: BackupPayload) {
    const db = await getReadyDatabase();
    const now = new Date().toISOString();

    const parsedDecks = normalizeBackupArray(parsed.decks);
    const parsedCards = normalizeBackupArray(parsed.cards);
    const parsedMistakes = normalizeBackupArray(parsed.mistakes);
    const parsedWins = normalizeBackupArray(parsed.wins);
    const parsedReviewLogs = normalizeBackupArray(parsed.reviewLogs);

    // Everything — all five DELETEs and every INSERT — runs inside a single
    // exclusive transaction. If any step throws, SQLite rolls back automatically
    // and the database is left exactly as it was before restore was attempted.
    // Without this, a crash after the DELETEs would leave the database empty
    // with no way to recover the user's data.
    await db.withExclusiveTransactionAsync(async () => {
      // Clear dependent data first, then parent tables.
      await db.runAsync('DELETE FROM review_logs;');
      await db.runAsync('DELETE FROM cards;');
      await db.runAsync('DELETE FROM decks;');
      await db.runAsync('DELETE FROM mistakes;');
      await db.runAsync('DELETE FROM wins;');

      const validDeckIds = new Set<number>();
      const validCardIds = new Set<number>();

      for (const d of parsedDecks) {
        if (d?.id === undefined || d?.id === null || !d?.name) continue;

        const deckId = Number(d.id);
        if (Number.isNaN(deckId)) continue;

        validDeckIds.add(deckId);

        await db.runAsync(
          `INSERT OR REPLACE INTO decks 
           (id, name, description, color, created_at, updated_at) 
           VALUES (?, ?, ?, ?, ?, ?);`,
          [
            deckId,
            String(d.name),
            d.description ?? null,
            d.color ?? '#2563EB',
            d.created_at || now,
            d.updated_at || now
          ]
        );
      }

      for (const c of parsedCards) {
        if (c?.id === undefined || c?.id === null || c?.deck_id === undefined || c?.deck_id === null) continue;
        if (!c?.front || !c?.back) continue;

        const cardId = Number(c.id);
        const deckId = Number(c.deck_id);

        if (Number.isNaN(cardId) || Number.isNaN(deckId)) continue;
        if (!validDeckIds.has(deckId)) continue;

        validCardIds.add(cardId);

        await db.runAsync(
          `INSERT OR REPLACE INTO cards 
           (id, deck_id, card_type, front, back, tags, notes, difficulty, due_at, interval_days, review_count, lapse_count, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
          [
            cardId,
            deckId,
            c.card_type || 'Q&A',
            String(c.front),
            String(c.back),
            c.tags ?? null,
            c.notes ?? null,
            c.difficulty || 'new',
            c.due_at || now,
            Number(c.interval_days || 0),
            Number(c.review_count || 0),
            Number(c.lapse_count || 0),
            c.created_at || now,
            c.updated_at || now
          ]
        );
      }

      for (const m of parsedMistakes) {
        if (m?.id === undefined || m?.id === null || !m?.title) continue;

        const mistakeId = Number(m.id);
        if (Number.isNaN(mistakeId)) continue;

        const relatedCardId =
          m.related_card_id !== undefined &&
          m.related_card_id !== null &&
          validCardIds.has(Number(m.related_card_id))
            ? Number(m.related_card_id)
            : null;

        await db.runAsync(
          `INSERT OR REPLACE INTO mistakes 
           (id, title, explanation, related_card_id, status, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?);`,
          [
            mistakeId,
            String(m.title),
            m.explanation ?? null,
            relatedCardId,
            m.status === 'resolved' ? 'resolved' : 'open',
            m.created_at || now,
            m.updated_at || now
          ]
        );
      }

      for (const w of parsedWins) {
        if (w?.id === undefined || w?.id === null || !w?.text) continue;

        const winId = Number(w.id);
        if (Number.isNaN(winId)) continue;

        await db.runAsync(
          `INSERT OR REPLACE INTO wins 
           (id, text, created_at)
           VALUES (?, ?, ?);`,
          [
            winId,
            String(w.text),
            w.created_at || now
          ]
        );
      }

      for (const log of parsedReviewLogs) {
        if (log?.id === undefined || log?.id === null || log?.card_id === undefined || log?.card_id === null) continue;

        const logId = Number(log.id);
        const cardId = Number(log.card_id);

        if (Number.isNaN(logId) || Number.isNaN(cardId)) continue;
        if (!validCardIds.has(cardId)) continue;

        await db.runAsync(
          `INSERT OR REPLACE INTO review_logs 
           (id, card_id, mode, rating, created_at) 
           VALUES (?, ?, ?, ?, ?);`,
          [
            logId,
            cardId,
            log.mode === 're-view' ? 're-view' : 'srs',
            log.rating || null,
            log.created_at || now
          ]
        );
      }
    });
  }

  async function mergeDecksAndCardsPayload(parsed: BackupPayload) {
    const db = await getReadyDatabase();
    const now = new Date().toISOString();

    const parsedDecks = normalizeBackupArray(parsed.decks);
    const parsedCards = normalizeBackupArray(parsed.cards);

    const existingDeckRows = await db.getAllAsync<any>('SELECT id, name FROM decks;');
    const deckNameToId = new Map<string, number>();
    const importedDeckIdToTargetId = new Map<number, number>();
    const importedDeckNameToTargetId = new Map<string, number>();

    for (const row of existingDeckRows) {
      const deckKey = normalizeImportKey(row?.name);
      const deckId = Number(row?.id);

      if (deckKey && !Number.isNaN(deckId)) {
        deckNameToId.set(deckKey, deckId);
      }
    }

    const stats = {
      createdDecks: 0,
      mergedDecks: 0,
      importedCards: 0,
      skippedCards: 0,
      skippedDecks: 0
    };

    async function getLastInsertedId() {
      const row = await db.getFirstAsync<any>('SELECT last_insert_rowid() as id;');
      return Number(row?.id);
    }

    async function getOrCreateDeckFromImport(sourceDeck: any) {
      const rawName = sourceDeck?.name ?? sourceDeck?.deck_name;
      const deckName = cleanOptionalText(rawName);

      if (!deckName) {
        stats.skippedDecks += 1;
        return null;
      }

      const deckKey = normalizeImportKey(deckName);
      let targetDeckId = deckNameToId.get(deckKey);

      if (targetDeckId) {
        stats.mergedDecks += 1;
      } else {
        const insertResult = await db.runAsync(
          `INSERT INTO decks (name, description, color, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?);`,
          [
            deckName,
            cleanOptionalText(sourceDeck?.description),
            sourceDeck?.color || '#2563EB',
            sourceDeck?.created_at || now,
            sourceDeck?.updated_at || now
          ]
        );

        targetDeckId = Number((insertResult as any)?.lastInsertRowId);

        if (!targetDeckId || Number.isNaN(targetDeckId)) {
          targetDeckId = await getLastInsertedId();
        }

        if (!targetDeckId || Number.isNaN(targetDeckId)) {
          stats.skippedDecks += 1;
          return null;
        }

        deckNameToId.set(deckKey, targetDeckId);
        stats.createdDecks += 1;
      }

      if (sourceDeck?.id !== undefined && sourceDeck?.id !== null) {
        const importedDeckId = Number(sourceDeck.id);
        if (!Number.isNaN(importedDeckId)) {
          importedDeckIdToTargetId.set(importedDeckId, targetDeckId);
        }
      }

      importedDeckNameToTargetId.set(deckKey, targetDeckId);
      return targetDeckId;
    }

    async function getTargetDeckIdForCard(card: any) {
      if (card?.deck_id !== undefined && card?.deck_id !== null) {
        const importedDeckId = Number(card.deck_id);
        const mappedDeckId = importedDeckIdToTargetId.get(importedDeckId);

        if (mappedDeckId) {
          return mappedDeckId;
        }
      }

      const deckName = cleanOptionalText(card?.deck_name ?? card?.deckName ?? card?.deck);
      if (deckName) {
        const deckKey = normalizeImportKey(deckName);
        const existingMappedDeckId = deckNameToId.get(deckKey) ?? importedDeckNameToTargetId.get(deckKey);

        if (existingMappedDeckId) {
          return existingMappedDeckId;
        }

        return await getOrCreateDeckFromImport({
          name: deckName,
          description: null,
          color: '#2563EB'
        });
      }

      if (parsedDecks.length === 1) {
        const onlyDeck = parsedDecks[0];

        if (onlyDeck?.id !== undefined && onlyDeck?.id !== null) {
          const importedDeckId = Number(onlyDeck.id);
          const mappedDeckId = importedDeckIdToTargetId.get(importedDeckId);

          if (mappedDeckId) {
            return mappedDeckId;
          }
        }

        return await getOrCreateDeckFromImport(onlyDeck);
      }

      return null;
    }

    // Both passes wrapped in a single transaction.
    // This makes the import atomic (all-or-nothing) and dramatically speeds up
    // large imports since SQLite batches writes instead of auto-committing each one.
    await db.withExclusiveTransactionAsync(async () => {
      // First pass: prepare imported decks and map old backup deck IDs to local deck IDs.
      for (const d of parsedDecks) {
        await getOrCreateDeckFromImport(d);
      }

      // Second pass: add cards without overwriting existing cards.
      for (const c of parsedCards) {
        const front = cleanOptionalText(c?.front);
        const back = cleanOptionalText(c?.back);

        if (!front || !back) {
          stats.skippedCards += 1;
          continue;
        }

        const targetDeckId = await getTargetDeckIdForCard(c);

        if (!targetDeckId) {
          stats.skippedCards += 1;
          continue;
        }

        const duplicateCard = await db.getFirstAsync<any>(
          `SELECT id FROM cards
           WHERE deck_id = ?
           AND LOWER(TRIM(front)) = ?
           AND LOWER(TRIM(back)) = ?
           LIMIT 1;`,
          [targetDeckId, front.toLowerCase(), back.toLowerCase()]
        );

        if (duplicateCard?.id) {
          stats.skippedCards += 1;
          continue;
        }

        await db.runAsync(
          `INSERT INTO cards
           (deck_id, card_type, front, back, tags, notes, difficulty, due_at, interval_days, review_count, lapse_count, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
          [
            targetDeckId,
            c?.card_type || c?.type || 'Q&A',
            front,
            back,
            cleanOptionalText(c?.tags),
            cleanOptionalText(c?.notes),
            c?.difficulty || 'new',
            c?.due_at || now,
            Number(c?.interval_days || 0),
            Number(c?.review_count || 0),
            Number(c?.lapse_count || 0),
            c?.created_at || now,
            c?.updated_at || now
          ]
        );

        stats.importedCards += 1;
      }
    });

    return stats;
  }

  async function handleMergeDecksAndCardsFile() {
    if (isBusy) return;
    setIsBusy(true);
    try {
      const selection = await DocumentPicker.getDocumentAsync({
        type: ['application/json', 'text/plain', '*/*'],
        copyToCacheDirectory: true
      });

      if (selection.canceled || !selection.assets || selection.assets.length === 0) {
        return;
      }

      const targetFileUri = selection.assets[0].uri;
      const fileContentsStr = await FileSystem.readAsStringAsync(targetFileUri);

      if (!fileContentsStr) {
        throw new Error('Selected import file is empty.');
      }

      let parsed: BackupPayload;
      try {
        parsed = JSON.parse(fileContentsStr);
      } catch {
        Alert.alert('Invalid JSON', 'The selected file is not valid JSON.');
        return;
      }

      const parsedDecks = normalizeBackupArray(parsed.decks);
      const parsedCards = normalizeBackupArray(parsed.cards);

      if (parsedCards.length === 0) {
        Alert.alert('Invalid Import', 'This file must contain a cards array to merge into the app.');
        return;
      }

      const confirmed = await askForConfirmation(
        'Merge Decks & Cards?',
        `This will ADD data without deleting your current app data.\n\nFound in file:\n• ${parsedDecks.length} deck(s)\n• ${parsedCards.length} card(s)\n\nDuplicate cards with the same Front + Back inside the same deck will be skipped.`,
        'Merge Import',
        false
      );

      if (!confirmed) return;

      const stats = await mergeDecksAndCardsPayload(parsed);
      resetInlineEditors();
      await loadData();

      Alert.alert(
        'Merge Complete ✓',
        `Created decks: ${stats.createdDecks}\nMerged with existing decks: ${stats.mergedDecks}\nImported cards: ${stats.importedCards}\nSkipped cards: ${stats.skippedCards}`
      );
    } catch (e) {
      console.error(e);
      Alert.alert('Merge Import Error', 'Failed to merge selected decks/cards file.');
    } finally {
      setIsBusy(false);
    }
  }

  async function handleImportBackupFile() {
    if (isBusy) return;
    setIsBusy(true);
    try {
      const selection = await DocumentPicker.getDocumentAsync({
        type: ['application/json', 'text/plain', '*/*'],
        copyToCacheDirectory: true
      });

      if (selection.canceled || !selection.assets || selection.assets.length === 0) {
        return;
      }

      const targetFileUri = selection.assets[0].uri;
      const fileContentsStr = await FileSystem.readAsStringAsync(targetFileUri);

      if (!fileContentsStr) {
        throw new Error('Selected backup file is empty.');
      }

      let parsed: BackupPayload;
      try {
        parsed = JSON.parse(fileContentsStr);
      } catch {
        Alert.alert('Invalid JSON', 'The selected file is not valid JSON.');
        return;
      }

      if (!Array.isArray(parsed.decks) || !Array.isArray(parsed.cards)) {
        Alert.alert('Invalid Backup', 'This file is missing required decks/cards backup data.');
        return;
      }

      const confirmed = await askForConfirmation(
        'Restore Full Backup?',
        'This will REPLACE your current decks, cards, review logs, mistakes, and wins with the selected backup file. Use Merge Import instead if you only want to add decks/cards.',
        'Restore Backup',
        true
      );

      if (!confirmed) return;

      await restoreBackupPayload(parsed);
      resetInlineEditors();
      await loadData();

      Alert.alert(
        'Restore Complete ✓',
        'Full backup restored successfully, including decks, cards, review logs, mistakes, and wins.'
      );
    } catch (e) {
      console.error(e);
      Alert.alert('Restore Error', 'Failed to restore selected backup file.');
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: '#111827' }}>
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 20 : 0}
    >
      <Text style={styles.headerTitle}>Control Console</Text>

      <View style={styles.tabBarRow}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'mistakes' && styles.activeMistakeTabButton]}
          onPress={() => setActiveTab('mistakes')}
        >
          <View style={styles.tabInnerRow}>
            <Text style={[styles.tabButtonText, activeTab === 'mistakes' && styles.activeMistakeTabText]}>
              ⚠️ Mistakes
            </Text>

            {openMistakeCount > 0 ? (
              <View style={[styles.tabCounterBadge, styles.mistakeCounterBadge]}>
                <Text style={styles.tabCounterText}>{openMistakeCount}</Text>
              </View>
            ) : null}
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'wins' && styles.activeWinTabButton]}
          onPress={() => setActiveTab('wins')}
        >
          <View style={styles.tabInnerRow}>
            <Text style={[styles.tabButtonText, activeTab === 'wins' && styles.activeWinTabText]}>
              🏆 Wins
            </Text>

            {winCount > 0 ? (
              <View style={[styles.tabCounterBadge, styles.winCounterBadge]}>
                <Text style={styles.tabCounterText}>{winCount}</Text>
              </View>
            ) : null}
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'backup' && styles.activeBackupTabButton]}
          onPress={() => setActiveTab('backup')}
        >
          <View style={styles.tabInnerRow}>
            <Text style={[styles.tabButtonText, activeTab === 'backup' && styles.activeBackupTabText]}>
              💾 Backup
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollWrapper}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {activeTab === 'mistakes' && (
          <View style={styles.sectionContainer}>
            <View style={[styles.cardInputBox, styles.mistakeInputBox]}>
              <Text style={styles.fieldLabel}>🧠 Capture Confusion</Text>

              <TextInput
                style={styles.inputField}
                placeholder="What concept is tripping you up?"
                placeholderTextColor="#6B7280"
                value={mistakeTitle}
                onChangeText={setMistakeTitle}
              />

              <TextInput
                style={[styles.inputField, styles.areaInput]}
                placeholder="What confused you? Add context if needed."
                placeholderTextColor="#6B7280"
                multiline
                value={mistakeExplanation}
                onChangeText={setMistakeExplanation}
              />

              <TouchableOpacity style={styles.actionButton} onPress={handleAddMistake}>
                <Text style={styles.actionButtonText}>⚠️ Add to Mistake Bank</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.mistakeStatsRow}>
              <View style={[styles.mistakeStatPill, styles.openMistakeStatPill]}>
                <Text style={styles.mistakeStatLabel}>Open</Text>
                <Text style={styles.mistakeStatValue}>{openMistakeCount}</Text>
              </View>

              <View style={[styles.mistakeStatPill, styles.resolvedMistakeStatPill]}>
                <Text style={styles.mistakeStatLabel}>Resolved</Text>
                <Text style={styles.mistakeStatValue}>{resolvedMistakeCount}</Text>
              </View>
            </View>

            <Text style={styles.listSectionHeading}>CONFUSION JOURNAL</Text>

            {mistakes.length === 0 ? (
              <View style={styles.emptyStateBox}>
                <Text style={styles.emptyTitle}>No active confusions logged.</Text>
              </View>
            ) : mistakes.map((item) => (
              <View
                key={item.id}
                style={[
                  styles.itemCard,
                  item.status === 'resolved' ? styles.resolvedItemCard : styles.openMistakeItemCard
                ]}
              >
                {editingMistakeId === item.id ? (
                  <View style={{ width: '100%', alignItems: 'center' }}>
                    <Text style={styles.subEditLabel}>Edit Title</Text>
                    <TextInput
                      style={styles.inlineInput}
                      value={editMistakeTitle}
                      onChangeText={setEditMistakeTitle}
                    />

                    <Text style={styles.subEditLabel}>Edit Context</Text>
                    <TextInput
                      style={[styles.inlineInput, styles.areaInput]}
                      value={editMistakeExplanation}
                      onChangeText={setEditMistakeExplanation}
                      multiline
                    />

                    <View style={styles.inlineActionRow}>
                      <TouchableOpacity style={styles.inlineSaveButton} onPress={handleSaveMistakeEdit}>
                        <Text style={styles.inlineBtnText}>Save</Text>
                      </TouchableOpacity>

                      <TouchableOpacity style={styles.inlineCancelButton} onPress={() => setEditingMistakeId(null)}>
                        <Text style={styles.inlineBtnText}>Cancel</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <View style={{ width: '100%' }}>
                    <View style={styles.itemHeaderRow}>
                      <Text style={[styles.itemMainText, item.status === 'resolved' && styles.strikeText]}>
                        {item.title}
                      </Text>

                      <TouchableOpacity
                        style={[styles.statusBadge, item.status === 'resolved' ? styles.resolvedBadge : styles.openBadge]}
                        onPress={() => toggleMistakeStatus(item)}
                      >
                        <Text style={styles.badgeText}>{item.status}</Text>
                      </TouchableOpacity>
                    </View>

                    {item.explanation ? (
                      <Text style={[
                        styles.itemSecondaryText,
                        item.status === 'resolved' && styles.resolvedSecondaryText
                      ]}>
                        {item.explanation}
                      </Text>
                    ) : null}

                    <Text style={[
                      styles.timestampText,
                      item.status === 'resolved' && styles.resolvedTimestampText
                    ]}>
                      Logged: {formatDateLabel(item.created_at)}
                    </Text>

                    <View style={styles.itemFooterControlRow}>
                      <TouchableOpacity style={styles.inlineEditTrigger} onPress={() => startEditMistake(item)}>
                        <Text style={styles.editTriggerText}>Edit</Text>
                      </TouchableOpacity>

                      <TouchableOpacity style={styles.purgeItemButton} onPress={() => confirmDeleteMistake(item.id)}>
                        <Text style={styles.purgeText}>Remove</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>
            ))}
          </View>
        )}

        {activeTab === 'wins' && (
          <View style={styles.sectionContainer}>
            <View style={[styles.cardInputBox, styles.winInputBox]}>
              <Text style={styles.fieldLabel}>🏆 Record a Victory</Text>

              <TextInput
                style={[styles.inputField, styles.areaInput]}
                placeholder="Celebrate progress. Log a win..."
                placeholderTextColor="#6B7280"
                multiline
                value={winText}
                onChangeText={setWinText}
              />

              <TouchableOpacity style={[styles.actionButton, styles.winActionButton]} onPress={handleAddWin}>
                <Text style={styles.actionButtonText}>✨ Log Victory</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.listSectionHeading}>VICTORY HISTORY</Text>

            {wins.length === 0 ? (
              <View style={styles.emptyStateBox}>
                <Text style={styles.emptyTitle}>No milestones captured yet.</Text>
              </View>
            ) : wins.map((item) => (
              <View key={item.id} style={styles.itemCard}>
                {editingWinId === item.id ? (
                  <View style={{ width: '100%', alignItems: 'center' }}>
                    <Text style={styles.subEditLabel}>Edit Victory Log</Text>

                    <TextInput
                      style={[styles.inlineInput, styles.areaInput]}
                      value={editWinText}
                      onChangeText={setEditWinText}
                      multiline
                    />

                    <View style={styles.inlineActionRow}>
                      <TouchableOpacity style={styles.inlineSaveButton} onPress={handleSaveWinEdit}>
                        <Text style={styles.inlineBtnText}>Save</Text>
                      </TouchableOpacity>

                      <TouchableOpacity style={styles.inlineCancelButton} onPress={() => setEditingWinId(null)}>
                        <Text style={styles.inlineBtnText}>Cancel</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <View style={{ width: '100%' }}>
                    <Text style={styles.winItemText}>✨ {item.text}</Text>

                    <Text style={styles.winTimestampText}>
                      Logged: {formatDateLabel(item.created_at)}
                    </Text>

                    <View style={styles.itemFooterControlRow}>
                      <TouchableOpacity style={styles.inlineEditTrigger} onPress={() => startEditWin(item)}>
                        <Text style={styles.editTriggerText}>Edit</Text>
                      </TouchableOpacity>

                      <TouchableOpacity style={styles.purgeItemButton} onPress={() => confirmDeleteWin(item.id)}>
                        <Text style={styles.purgeText}>Remove</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>
            ))}
          </View>
        )}

        {activeTab === 'backup' && (
          <View style={styles.sectionContainer}>
            <View style={[styles.cardInputBox, styles.backupExportBox]}>
              <Text style={styles.fieldLabel}>📤 Export Full Backup</Text>
              <Text style={styles.infoDescription}>
                Create a JSON backup containing decks, cards, review logs, mistakes, and wins. Save this somewhere safe.
              </Text>

              <TouchableOpacity
                style={[styles.actionButton, styles.backupExportButton, isBusy && styles.busyButton]}
                onPress={handleExportBackup}
                disabled={isBusy}
              >
                <Text style={styles.actionButtonText}>
                  {isBusy ? '⏳ Exporting...' : '📤 Export Full Backup (.json)'}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={[styles.cardInputBox, styles.mergeImportBox]}>
              <Text style={styles.fieldLabel}>📚 Merge Import Decks & Cards</Text>
              <Text style={styles.infoDescription}>
                Add AI-generated decks/cards or deck packs without deleting current data. Existing decks with the same name are reused. Duplicate cards are skipped.
              </Text>

              <TouchableOpacity style={[styles.actionButton, styles.templateButton]} onPress={handleCopyImportTemplate}>
                <Text style={styles.actionButtonText}>📋 Copy Import Template</Text>
              </TouchableOpacity>

              <Text style={styles.templateHint}>
                Paste into ChatGPT or Claude → "Fill this with flashcards about [topic]" → save as .json → import below
              </Text>

              <TouchableOpacity
                style={[styles.actionButton, styles.mergeImportButton, isBusy && styles.busyButton]}
                onPress={handleMergeDecksAndCardsFile}
                disabled={isBusy}
              >
                <Text style={styles.actionButtonText}>
                  {isBusy ? '⏳ Importing...' : '📚 Merge Import Decks/Cards'}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={[styles.cardInputBox, styles.restoreDangerBox]}>
              <Text style={[styles.fieldLabel, styles.restoreLabel]}>♻️ Restore Full Backup</Text>
              <Text style={styles.infoDescription}>
                Disaster recovery only. This replaces current local data with the selected backup file.
              </Text>

              <View style={styles.warningBox}>
                <Text style={styles.warningText}>
                  ⚠️ Restore is not merge. It overwrites decks, cards, review logs, mistakes, and wins.
                </Text>
              </View>

              <TouchableOpacity
                style={[styles.actionButton, styles.restoreDangerButton, isBusy && styles.busyButton]}
                onPress={handleImportBackupFile}
                disabled={isBusy}
              >
                <Text style={styles.actionButtonText}>
                  {isBusy ? '⏳ Restoring...' : '⚠️ Restore Backup File'}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={[styles.cardInputBox, styles.resetDangerBox]}>
              <Text style={[styles.fieldLabel, styles.dangerLabel]}>⛔ Reset Console</Text>
              <Text style={styles.infoDescription}>
                Use carefully. Export a backup first before deleting or resetting important data.
              </Text>

              <TouchableOpacity style={styles.resetOptionBtn} onPress={() => triggerSystemReset('cards')}>
                <Text style={styles.resetOptionText}>Delete Flashcards Only</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.resetOptionBtn} onPress={() => triggerSystemReset('stats')}>
                <Text style={styles.resetOptionText}>Reset Review Stats Only</Text>
              </TouchableOpacity>

              <TouchableOpacity style={[styles.resetOptionBtn, styles.fullResetBtn]} onPress={() => triggerSystemReset('all')}>
                <Text style={[styles.resetOptionText, styles.fullResetText]}>🔥 Full App Wipe</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111827', paddingHorizontal: 24 },
  headerTitle: { fontSize: 32, fontWeight: 'bold', color: '#FFFFFF', textAlign: 'center', marginBottom: 20 },
  tabBarRow: { flexDirection: 'row', backgroundColor: '#1F2937', padding: 6, borderRadius: 14, marginBottom: 20, borderWidth: 1, borderColor: '#374151' },
  tabButton: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center', borderWidth: 1, borderColor: 'transparent' },
  activeMistakeTabButton: { backgroundColor: '#181111', borderColor: '#EF4444' },
  activeWinTabButton: { backgroundColor: '#0B1F17', borderColor: '#10B981' },
  activeBackupTabButton: { backgroundColor: '#111827', borderColor: '#60A5FA' },
  tabButtonText: { color: '#9CA3AF', fontWeight: '600', fontSize: 13 },
  activeMistakeTabText: { color: '#FCA5A5' },
  activeWinTabText: { color: '#A7F3D0' },
  activeBackupTabText: { color: '#BFDBFE' },
  tabInnerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5 },
  tabCounterBadge: { minWidth: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 },
  mistakeCounterBadge: { backgroundColor: '#EF4444' },
  winCounterBadge: { backgroundColor: '#10B981' },
  tabCounterText: { color: '#FFFFFF', fontSize: 10, fontWeight: '900' },
  scrollWrapper: { flex: 1 },
  scrollContent: { paddingBottom: 8 },
  sectionContainer: { paddingBottom: 0 },
  cardInputBox: { backgroundColor: '#1F2937', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#374151', marginBottom: 15 },
  mistakeInputBox: { borderColor: '#EF4444' },
  winInputBox: { borderColor: '#10B981' },
  backupExportBox: { borderColor: '#D1D5DB' },
  fieldLabel: { color: '#F3F4F6', fontSize: 14, fontWeight: '700', textTransform: 'uppercase', marginBottom: 12, textAlign: 'center' },
  infoDescription: { color: '#9CA3AF', fontSize: 13, lineHeight: 18, marginBottom: 16, textAlign: 'center' },
  inputField: { backgroundColor: '#111827', color: '#FFFFFF', borderRadius: 10, padding: 12, fontSize: 15, borderWidth: 1, borderColor: '#374151', marginBottom: 12, textAlign: 'center' },
  areaInput: { minHeight: 64, textAlignVertical: 'top' },
  actionButton: { backgroundColor: '#EF4444', padding: 14, borderRadius: 10, alignItems: 'center' },
  winActionButton: { backgroundColor: '#10B981' },
  backupExportButton: { backgroundColor: '#374151', borderWidth: 1, borderColor: '#D1D5DB' },
  backupImportButton: { backgroundColor: '#8B5CF6' },
  mergeImportBox: { borderColor: '#10B981' },
  mergeImportButton: { backgroundColor: '#10B981' },
  restoreDangerBox: { borderColor: '#92400E', backgroundColor: '#18140D' },
  restoreDangerButton: { backgroundColor: '#F59E0B' },
  warningBox: { backgroundColor: '#111827', borderColor: '#92400E', borderWidth: 1, borderRadius: 10, padding: 12, marginBottom: 14 },
  warningText: { color: '#FCD34D', fontSize: 12, lineHeight: 17, textAlign: 'center', fontWeight: '700' },
  actionButtonText: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },

  mistakeStatsRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  mistakeStatPill: { flex: 1, backgroundColor: '#111827', borderWidth: 1, borderRadius: 12, paddingVertical: 10, alignItems: 'center' },
  openMistakeStatPill: { borderColor: '#EF4444' },
  resolvedMistakeStatPill: { borderColor: '#10B981' },
  mistakeStatLabel: { color: '#9CA3AF', fontSize: 11, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 3 },
  mistakeStatValue: { color: '#FFFFFF', fontSize: 18, fontWeight: '900' },

  // Section headings & list headers
  listSectionHeading: { color: '#4B5563', fontSize: 11, fontWeight: '800', textAlign: 'center', letterSpacing: 2, marginBottom: 16 },
  emptyStateBox: { backgroundColor: '#1F2937', padding: 24, borderRadius: 16, alignItems: 'center', borderWidth: 1, borderColor: '#374151' },
  emptyTitle: { color: '#6B7280', fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },

  // Item cards
  itemCard: { backgroundColor: '#1F2937', padding: 16, borderRadius: 14, borderWidth: 1, borderColor: '#374151', marginBottom: 12 },
  openMistakeItemCard: {
    backgroundColor: '#1F2937',
    borderColor: '#7F1D1D'
  },
  resolvedItemCard: {
    backgroundColor: '#121820',
    borderColor: '#2D3748'
  },

  // Mistake layout
  itemHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, width: '100%' },
  itemMainText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700', flex: 1, textAlign: 'left' },
  strikeText: {
    textDecorationLine: 'line-through',
    color: '#9CA3AF'
  },
  statusBadge: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: 6 },
  openBadge: { backgroundColor: '#EF4444' },
  resolvedBadge: { backgroundColor: '#10B981' },
  badgeText: { color: '#FFFFFF', fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },

  // Card text
  itemSecondaryText: { color: '#D1D5DB', fontSize: 14, marginTop: 10, lineHeight: 18, textAlign: 'center' },
  winItemText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700', lineHeight: 22, textAlign: 'center' },
  timestampText: { color: '#6B7280', fontSize: 12, textAlign: 'center', marginTop: 12, fontStyle: 'italic' },
  resolvedSecondaryText: { color: '#8B949E' },
  resolvedTimestampText: { color: '#4B5563' },
  winTimestampText: { color: '#6B7280', fontSize: 12, textAlign: 'center', marginTop: 12, fontStyle: 'italic' },

  // Footer controls
  itemFooterControlRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 14, borderTopWidth: 1, borderColor: '#374151', paddingTop: 10, width: '100%' },
  inlineEditTrigger: { paddingVertical: 4, paddingHorizontal: 8 },
  editTriggerText: { color: '#3B82F6', fontSize: 13, fontWeight: '700' },
  purgeItemButton: { paddingVertical: 4, paddingHorizontal: 8 },
  purgeText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },

  // Inline editor inputs
  subEditLabel: { color: '#9CA3AF', fontSize: 12, textTransform: 'uppercase', fontWeight: '600', marginBottom: 6, textAlign: 'center' },
  inlineInput: { backgroundColor: '#111827', color: '#FFFFFF', borderRadius: 8, padding: 10, fontSize: 14, borderWidth: 1, borderColor: '#4B5563', marginBottom: 12, textAlign: 'center', width: '100%' },
  inlineActionRow: { flexDirection: 'row', justifyContent: 'center', gap: 12, marginTop: 4 },
  inlineSaveButton: { backgroundColor: '#2563EB', paddingVertical: 6, paddingHorizontal: 18, borderRadius: 6 },
  inlineCancelButton: { backgroundColor: '#4B5563', paddingVertical: 6, paddingHorizontal: 18, borderRadius: 6 },
  inlineBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },

  // Reset styles
  resetDangerBox: { borderColor: '#7F1D1D', backgroundColor: '#181111' },
  dangerLabel: { color: '#FCA5A5' },
  restoreLabel: { color: '#FCD34D' },
  resetOptionBtn: { backgroundColor: '#1F2937', padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#4B5563', marginBottom: 10, alignItems: 'center' },
  resetOptionText: { color: '#FCA5A5', fontWeight: '600', fontSize: 14 },
  fullResetBtn: { backgroundColor: '#7F1D1D' },
  fullResetText: { color: '#FFFFFF' },
  busyButton: { opacity: 0.5 },
  templateButton: { backgroundColor: '#1D4ED8', marginBottom: 10 },
  templateHint: { color: '#6B7280', fontSize: 11, lineHeight: 16, textAlign: 'center', marginBottom: 14, fontStyle: 'italic' }
});




/* 
{
  "decks": [
    {
      "name": "Linux Basics",
      "description": "Basic Linux commands and terminal concepts.",
      "color": "#2563EB"
    }
  ],
  "cards": [
    {
      "deck_name": "Linux Basics",
      "card_type": "Command",
      "front": "What does pwd do?",
      "back": "It prints the current working directory.",
      "tags": "linux, command",
      "notes": "pwd = print working directory"
    }
  ]
}
*/