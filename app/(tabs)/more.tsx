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
  openDatabase,
  updateMistakeStatus
} from '@/src/database';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  Alert,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';

export default function MoreScreen() {
  const [activeTab, setActiveTab] = useState<'mistakes' | 'wins' | 'backup'>('mistakes');
  
  const [mistakes, setMistakes] = useState<DbMistake[]>([]);
  const [wins, setWins] = useState<DbWin[]>([]);
  
  const [mistakeTitle, setMistakeTitle] = useState('');
  const [mistakeExplanation, setMistakeExplanation] = useState('');
  const [winText, setWinText] = useState('');
  const [jsonInput, setJsonInput] = useState('');

  async function loadData() {
    try {
      if (activeTab === 'mistakes') {
        const data = await getAllMistakes();
        setMistakes(data);
      } else if (activeTab === 'wins') {
        const data = await getAllWins();
        setWins(data);
      }
    } catch (e) {
      console.error('Error fetching auxiliary system datasets:', e);
    }
  }

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [activeTab])
  );

  // MISTAKE LOGIC HANDLERS
  async function handleAddMistake() {
    if (!mistakeTitle.trim()) {
      Alert.alert('Missing Entry', 'Please identify the concept or error causing confusion.');
      return;
    }
    await addMistake(mistakeTitle.trim(), mistakeExplanation.trim(), null);
    setMistakeTitle('');
    setMistakeExplanation('');
    await loadData();
    Alert.alert('Logged', 'Confusion captured.');
  }

  async function toggleMistakeStatus(item: DbMistake) {
    const nextStatus = item.status === 'open' ? 'resolved' : 'open';
    await updateMistakeStatus(item.id, nextStatus as 'open' | 'resolved');
    await loadData();
  }

  function confirmDeleteMistake(id: number) {
    Alert.alert('Purge Entry', 'Permanently remove this mistake item?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Purge', style: 'destructive', onPress: async () => {
          await deleteMistake(id);
          await loadData();
      }},
    ]);
  }

  // WIN LOG LOGIC HANDLERS
  async function handleAddWin() {
    if (!winText.trim()) {
      Alert.alert('Blank Win', 'Capture your milestone. Small progress still counts.');
      return;
    }
    await addWin(winText.trim());
    setWinText('');
    await loadData();
    Alert.alert('Saved ✓', 'Victory permanently logged.');
  }

  function confirmDeleteWin(id: number) {
    Alert.alert('Delete Win Record', 'Remove this history point entry?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
          await deleteWin(id);
          await loadData();
      }},
    ]);
  }

  // DATA BACKUP & EXPORT SPECIFICATIONS
  async function handleExportBackup() {
    try {
      const backupData = await exportDatabaseToBackupObject();
      const jsonString = JSON.stringify(backupData, null, 2);
      
      await Share.share({
        message: jsonString,
        title: 'CyberDeck Backup Object Export'
      });
    } catch (error) {
      console.error(error);
      Alert.alert('Export Failure', 'Could not assemble data structures.');
    }
  }

  async function handleImportBackup() {
    if (!jsonInput.trim()) {
      Alert.alert('Empty Input', 'Please paste a valid CyberDeck backup JSON text block.');
      return;
    }

    try {
      const parsed = JSON.parse(jsonInput.trim());
      if (!parsed.decks || !parsed.cards) {
        Alert.alert('Invalid Format', 'This configuration payload is missing essential card schema tables.');
        return;
      }

      const db = await openDatabase();
      const now = new Date().toISOString();

      // Safe relational insertion loop
      for (const d of parsed.decks) {
        await db.runAsync(
          `INSERT OR IGNORE INTO decks (id, name, description, color, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?);`,
          [d.id, d.name, d.description, d.color, d.created_at || now, d.updated_at || now]
        );
      }

      for (const c of parsed.cards) {
        await db.runAsync(
          `INSERT OR IGNORE INTO cards (id, deck_id, card_type, front, back, tags, notes, difficulty, due_at, interval_days, review_count, lapse_count, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
          [c.id, c.deck_id, c.card_type, c.front, c.back, c.tags, c.notes, c.difficulty || 'new', c.due_at || now, c.interval_days || 0, c.review_count || 0, c.lapse_count || 0, c.created_at || now, c.updated_at || now]
        );
      }

      setJsonInput('');
      Alert.alert('Import Complete ✓', 'Your CyberVault datasets have merged successfully.');
    } catch (e) {
      Alert.alert('Parsing Error', 'Failed to compile raw text string into system objects. Check spacing constraints.');
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.headerTitle}>Learning Support</Text>
      
      {/* SEGMENTED SWITCH PANEL ROW */}
      <View style={styles.tabBarRow}>
        <TouchableOpacity style={[styles.tabButton, activeTab === 'mistakes' && styles.activeTabButton]} onPress={() => setActiveTab('mistakes')}>
          <Text style={[styles.tabButtonText, activeTab === 'mistakes' && styles.activeTabButtonText]}>⚠️ Mistakes</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tabButton, activeTab === 'wins' && styles.activeTabButton]} onPress={() => setActiveTab('wins')}>
          <Text style={[styles.tabButtonText, activeTab === 'wins' && styles.activeTabButtonText]}>🏆 Wins</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tabButton, activeTab === 'backup' && styles.activeTabButton]} onPress={() => setActiveTab('backup')}>
          <Text style={[styles.tabButtonText, activeTab === 'backup' && styles.activeTabButtonText]}>💾 Backup</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollWrapper} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {activeTab === 'mistakes' && (
          <View style={styles.sectionContainer}>
            <View style={styles.cardInputBox}>
              <Text style={styles.fieldLabel}>Capture Confusion</Text>
              <TextInput style={styles.inputField} placeholder="What concept is tripping you up?" placeholderTextColor="#6B7280" value={mistakeTitle} onChangeText={setMistakeTitle} />
              <TextInput style={[styles.inputField, styles.areaInput]} placeholder="Context explanation metrics (Optional)..." placeholderTextColor="#6B7280" multiline value={mistakeExplanation} onChangeText={setMistakeExplanation} />
              <TouchableOpacity style={styles.actionButton} onPress={handleAddMistake}><Text style={styles.actionButtonText}>Add to Mistake Bank</Text></TouchableOpacity>
            </View>
            {mistakes.length === 0 ? (
              <View style={styles.emptyStateBox}><Text style={styles.emptyTitle}>"Confusion is data."</Text></View>
            ) : mistakes.map((item) => (
              <View key={item.id} style={[styles.itemCard, item.status === 'resolved' && styles.resolvedItemCard]}>
                <View style={styles.itemHeaderRow}>
                  <Text style={[styles.itemMainText, item.status === 'resolved' && styles.strikeText]}>{item.title}</Text>
                  <TouchableOpacity style={[styles.statusBadge, item.status === 'resolved' ? styles.resolvedBadge : styles.openBadge]} onPress={() => toggleMistakeStatus(item)}>
                    <Text style={styles.badgeText}>{item.status}</Text>
                  </TouchableOpacity>
                </View>
                {item.explanation && <Text style={styles.itemSecondaryText}>{item.explanation}</Text>}
                <TouchableOpacity style={styles.purgeItemButton} onPress={() => confirmDeleteMistake(item.id)}><Text style={styles.purgeText}>Remove</Text></TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {activeTab === 'wins' && (
          <View style={styles.sectionContainer}>
            <View style={styles.cardInputBox}>
              <Text style={styles.fieldLabel}>Record a Victory</Text>
              <TextInput style={[styles.inputField, styles.areaInput]} placeholder="Celebrate progress. Log a win..." placeholderTextColor="#6B7280" multiline value={winText} onChangeText={setWinText} />
              <TouchableOpacity style={[styles.actionButton, styles.winActionButton]} onPress={handleAddWin}><Text style={styles.actionButtonText}>Log Victory</Text></TouchableOpacity>
            </View>
            {wins.length === 0 ? (
              <View style={styles.emptyStateBox}><Text style={styles.emptyTitle}>Small adjustments count.</Text></View>
            ) : wins.map((item) => (
              <View key={item.id} style={styles.itemCard}>
                <Text style={styles.winItemText}>✨ {item.text}</Text>
                <TouchableOpacity style={styles.purgeItemButton} onPress={() => confirmDeleteWin(item.id)}><Text style={styles.purgeText}>Remove</Text></TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {activeTab === 'backup' && (
          <View style={styles.sectionContainer}>
            <View style={styles.cardInputBox}>
              <Text style={styles.fieldLabel}>Secure Device Data Object</Text>
              <Text style={styles.infoDescription}>Compile your decks, cards, mistake histories, and study trace matrices into an unencrypted copy-pasteable text string block.</Text>
              <TouchableOpacity style={[styles.actionButton, styles.backupExportButton]} onPress={handleExportBackup}>
                <Text style={styles.actionButtonText}>📤 Export Data payload</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.cardInputBox}>
              <Text style={styles.fieldLabel}>Restore / Merge Dataset</Text>
              <TextInput 
                style={[styles.inputField, styles.areaInput, styles.jsonStringAreaInput]} 
                placeholder="Paste backup string data block here..." 
                placeholderTextColor="#6B7280" 
                multiline 
                value={jsonInput}
                onChangeText={jsonInput => setJsonInput(jsonInput)}
              />
              <TouchableOpacity style={[styles.actionButton, styles.backupImportButton]} onPress={handleImportBackup}>
                <Text style={styles.actionButtonText}>📥 Inject & Merge Database</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111827', paddingHorizontal: 24, paddingTop: 54 },
  headerTitle: { fontSize: 32, fontWeight: 'bold', color: '#FFFFFF', textAlign: 'center', marginBottom: 20 },
  tabBarRow: { flexDirection: 'row', backgroundColor: '#1F2937', padding: 6, borderRadius: 14, marginBottom: 20, borderWidth: 1, borderColor: '#374151' },
  tabButton: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  activeTabButton: { backgroundColor: '#111827', borderWidth: 1, borderColor: '#374151' },
  tabButtonText: { color: '#9CA3AF', fontWeight: '600', fontSize: 13 },
  activeTabButtonText: { color: '#FFFFFF' },
  scrollWrapper: { flex: 1 },
  sectionContainer: { paddingBottom: 40 },
  cardInputBox: { backgroundColor: '#1F2937', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#374151', marginBottom: 20 },
  fieldLabel: { color: '#F3F4F6', fontSize: 14, fontWeight: '700', textTransform: 'uppercase', marginBottom: 12 },
  infoDescription: { color: '#9CA3AF', fontSize: 13, lineHeight: 18, marginBottom: 16 },
  inputField: { backgroundColor: '#111827', color: '#FFFFFF', borderRadius: 10, padding: 12, fontSize: 15, borderWidth: 1, borderColor: '#374151', marginBottom: 12 },
  areaInput: { minHeight: 64, textAlignVertical: 'top' },
  jsonStringAreaInput: { minHeight: 110, fontSize: 12, fontFamily: 'monospace' },
  actionButton: { backgroundColor: '#EF4444', padding: 14, borderRadius: 10, alignItems: 'center' },
  winActionButton: { backgroundColor: '#10B981' },
  backupExportButton: { backgroundColor: '#2563EB' },
  backupImportButton: { backgroundColor: '#8B5CF6' },
  actionButtonText: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },
  emptyStateBox: { backgroundColor: '#1F2937', padding: 24, borderRadius: 16, alignItems: 'center', borderWidth: 1, borderColor: '#374151' },
  emptyTitle: { color: '#9CA3AF', fontSize: 14, fontWeight: '600' },
  itemCard: { backgroundColor: '#1F2937', padding: 16, borderRadius: 14, borderWidth: 1, borderColor: '#374151', marginBottom: 12 },
  resolvedItemCard: { opacity: 0.5, borderColor: '#111827' },
  itemHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 },
  itemMainText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700', flex: 1 },
  strikeText: { textDecorationLine: 'line-through', color: '#9CA3AF' },
  statusBadge: { paddingVertical: 4, paddingHorizontal: 8, borderRadius: 6 },
  openBadge: { backgroundColor: '#7F1D1D' },
  resolvedBadge: { backgroundColor: '#065F46' },
  badgeText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  itemSecondaryText: { color: '#D1D5DB', fontSize: 14, marginTop: 8, lineHeight: 18 },
  winItemText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
  purgeItemButton: { alignSelf: 'flex-end', marginTop: 4 },
  purgeText: { color: '#6B7280', fontSize: 12, fontWeight: '600' }
});