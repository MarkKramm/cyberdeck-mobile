import {
  addMistake,
  addWin,
  DbMistake,
  DbWin,
  deleteMistake,
  deleteWin,
  getAllMistakes,
  getAllWins,
  updateMistakeStatus
} from '@/src/database';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';

export default function MoreScreen() {
  const [activeTab, setActiveTab] = useState<'mistakes' | 'wins'>('mistakes');
  
  // State elements matching operational requirements
  const [mistakes, setMistakes] = useState<DbMistake[]>([]);
  const [wins, setWins] = useState<DbWin[]>([]);
  
  // Form input field state hooks
  const [mistakeTitle, setMistakeTitle] = useState('');
  const [mistakeExplanation, setMistakeExplanation] = useState('');
  const [winText, setWinText] = useState('');

  async function loadData() {
    try {
      if (activeTab === 'mistakes') {
        const data = await getAllMistakes();
        setMistakes(data);
      } else {
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

  // ==========================================
  // 📁 MISTAKE ENGINE LOGIC HANDLERS
  // ==========================================
  async function handleAddMistake() {
    if (!mistakeTitle.trim()) {
      Alert.alert('Missing Entry', 'Please identify the concept or error causing confusion.');
      return;
    }
    await addMistake(mistakeTitle.trim(), mistakeExplanation.trim(), null);
    setMistakeTitle('');
    setMistakeExplanation('');
    await loadData();
    Alert.alert('Logged', 'Confusion captured. Use it to construct a card later.');
  }

  async function toggleMistakeStatus(item: DbMistake) {
    const nextStatus = item.status === 'open' ? 'resolved' : 'open';
    await updateMistakeStatus(item.id, nextStatus);
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

  // ==========================================
  // 🏆 WIN LOG LOGIC HANDLERS
  // ==========================================
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

  return (
    <View style={styles.container}>
      <Text style={styles.headerTitle}>Learning Support</Text>
      
      {/* SEGMENTED SWITCH PANEL ROW */}
      <View style={styles.tabBarRow}>
        <TouchableOpacity 
          style={[styles.tabButton, activeTab === 'mistakes' && styles.activeTabButton]} 
          onPress={() => setActiveTab('mistakes')}
        >
          <Text style={[styles.tabButtonText, activeTab === 'mistakes' && styles.activeTabButtonText]}>
            ⚠️ Mistake Bank
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tabButton, activeTab === 'wins' && styles.activeTabButton]} 
          onPress={() => setActiveTab('wins')}
        >
          <Text style={[styles.tabButtonText, activeTab === 'wins' && styles.activeTabButtonText]}>
            🏆 Win Log
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollWrapper} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {activeTab === 'mistakes' ? (
          <View style={styles.sectionContainer}>
            <View style={styles.cardInputBox}>
              <Text style={styles.fieldLabel}>Capture Confusion</Text>
              <TextInput 
                style={styles.inputField}
                placeholder="What concept is tripping you up? (e.g., Auth vs Authz)"
                placeholderTextColor="#6B7280"
                value={mistakeTitle}
                onChangeText={setMistakeTitle}
              />
              <TextInput 
                style={[styles.inputField, styles.areaInput]}
                placeholder="Context or explanation parameters (Optional)..."
                placeholderTextColor="#6B7280"
                multiline
                value={mistakeExplanation}
                onChangeText={setMistakeExplanation}
              />
              <TouchableOpacity style={styles.actionButton} onPress={handleAddMistake}>
                <Text style={styles.actionButtonText}>Add to Mistake Bank</Text>
              </TouchableOpacity>
            </View>

            {mistakes.length === 0 ? (
              <View style={styles.emptyStateBox}>
                <Text style={styles.emptyTitle}>"Confusion is data."</Text>
                <Text style={styles.emptySubtitle}>No entries here. Your understanding across modules is pristine.</Text>
              </View>
            ) : (
              mistakes.map((item) => (
                <View key={item.id} style={[styles.itemCard, item.status === 'resolved' && styles.resolvedItemCard]}>
                  <View style={styles.itemHeaderRow}>
                    <Text style={[styles.itemMainText, item.status === 'resolved' && styles.strikeText]}>
                      {item.title}
                    </Text>
                    <TouchableOpacity 
                      style={[styles.statusBadge, item.status === 'resolved' ? styles.resolvedBadge : styles.openBadge]}
                      onPress={() => toggleMistakeStatus(item)}
                    >
                      <Text style={styles.badgeText}>{item.status === 'resolved' ? 'Resolved' : 'Open'}</Text>
                    </TouchableOpacity>
                  </View>
                  
                  {item.explanation ? (
                    <Text style={styles.itemSecondaryText}>{item.explanation}</Text>
                  ) : null}

                  <TouchableOpacity style={styles.purgeItemButton} onPress={() => confirmDeleteMistake(item.id)}>
                    <Text style={styles.purgeText}>Remove Log Item</Text>
                  </TouchableOpacity>
                </View>
              ))
            )}
          </View>
        ) : (
          <View style={styles.sectionContainer}>
            <View style={styles.cardInputBox}>
              <Text style={styles.fieldLabel}>Record a Victory</Text>
              <TextInput 
                style={[styles.inputField, styles.areaInput]}
                placeholder="e.g., Remembered port 443 on first attempt during a mock interview!"
                placeholderTextColor="#6B7280"
                multiline
                value={winText}
                onChangeText={setWinText}
              />
              <TouchableOpacity style={[styles.actionButton, styles.winActionButton]} onPress={handleAddWin}>
                <Text style={styles.actionButtonText}>Log Small Win</Text>
              </TouchableOpacity>
            </View>

            {wins.length === 0 ? (
              <View style={styles.emptyStateBox}>
                <Text style={styles.emptyTitle}>Small progress still counts.</Text>
                <Text style={styles.emptySubtitle}>Every step toward security knowledge matters. Log a victory above.</Text>
              </View>
            ) : (
              wins.map((item) => (
                <View key={item.id} style={styles.itemCard}>
                  <Text style={styles.winItemText}>✨ {item.text}</Text>
                  <TouchableOpacity style={styles.purgeItemButton} onPress={() => confirmDeleteWin(item.id)}>
                    <Text style={styles.purgeText}>Remove Log Item</Text>
                  </TouchableOpacity>
                </View>
              ))
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111827',
    paddingHorizontal: 24,
    paddingTop: 54,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 20,
    letterSpacing: 0.5,
  },
  tabBarRow: {
    flexDirection: 'row',
    backgroundColor: '#1F2937',
    padding: 6,
    borderRadius: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#374151',
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  activeTabButton: {
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: '#374151',
  },
  tabButtonText: {
    color: '#9CA3AF',
    fontWeight: '600',
    fontSize: 14,
  },
  activeTabButtonText: {
    color: '#FFFFFF',
  },
  scrollWrapper: {
    flex: 1,
  },
  sectionContainer: {
    paddingBottom: 40,
  },
  cardInputBox: {
    backgroundColor: '#1F2937',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#374151',
    marginBottom: 24,
  },
  fieldLabel: {
    color: '#F3F4F6',
    fontSize: 14,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  inputField: {
    backgroundColor: '#111827',
    color: '#FFFFFF',
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#374151',
    marginBottom: 12,
  },
  areaInput: {
    minHeight: 64,
    textAlignVertical: 'top',
  },
  actionButton: {
    backgroundColor: '#EF4444',
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  winActionButton: {
    backgroundColor: '#10B981',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
  emptyStateBox: {
    backgroundColor: '#1F2937',
    padding: 32,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#374151',
    marginTop: 8,
  },
  emptyTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  emptySubtitle: {
    color: '#9CA3AF',
    textAlign: 'center',
    fontSize: 14,
    lineHeight: 20,
  },
  itemCard: {
    backgroundColor: '#1F2937',
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#374151',
    marginBottom: 12,
  },
  resolvedItemCard: {
    opacity: 0.5,
    borderColor: '#111827',
  },
  itemHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  itemMainText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
  },
  strikeText: {
    textDecorationLine: 'line-through',
    color: '#9CA3AF',
  },
  statusBadge: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  openBadge: {
    backgroundColor: '#7F1D1D',
  },
  resolvedBadge: {
    backgroundColor: '#065F46',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  itemSecondaryText: {
    color: '#D1D5DB',
    fontSize: 14,
    marginTop: 8,
    lineHeight: 18,
  },
  winItemText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 22,
  },
  purgeItemButton: {
    alignSelf: 'flex-end',
    marginTop: 12,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  purgeText: {
    color: '#6B7280',
    fontSize: 12,
    fontWeight: '600',
  },
});