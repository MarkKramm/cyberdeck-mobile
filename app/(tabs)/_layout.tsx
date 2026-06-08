import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useEffect, useRef, useState } from 'react';
import { DeviceEventEmitter, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import PagerView from 'react-native-pager-view';

// Import your exact screen components safely
import AddScreen from './add';
import BrowseScreen from './browse';
import HomeScreen from './index';
import MoreScreen from './more';
import ReviewScreen from './review';

export default function TabLayout() {
  const [activeIndex, setActiveIndex] = useState(0);
  const pagerRef = useRef<PagerView>(null);

  function handleTabPress(index: number) {
    setActiveIndex(index);
    pagerRef.current?.setPage(index);
  }

  function handlePageSelect(e: any) {
    setActiveIndex(e.nativeEvent.position);
  }

  useEffect(() => {
    const tabSubscription = DeviceEventEmitter.addListener('switchTabSignal', (targetIndex: number) => {
      handleTabPress(targetIndex);
    });
    return () => tabSubscription.remove();
  }, []);

  return (
    <View style={styles.container}>
      {/* PASSES THE DYNAMIC isFocused PROP TO RE-TRIGGER DATA LOADING HOOKS ON SWIPE */}
      <PagerView
        ref={pagerRef}
        style={styles.pagerView}
        initialPage={0}
        onPageSelected={handlePageSelect}
      >
        <View key="1" style={styles.pageWrapper}><HomeScreen isFocused={activeIndex === 0} /></View>
        <View key="2" style={styles.pageWrapper}><ReviewScreen isFocused={activeIndex === 1} /></View>
        <View key="3" style={styles.pageWrapper}><AddScreen isFocused={activeIndex === 2} /></View>
        <View key="4" style={styles.pageWrapper}><BrowseScreen isFocused={activeIndex === 3} /></View>
        <View key="5" style={styles.pageWrapper}><MoreScreen /></View>
      </PagerView>

      <View style={styles.tabBarContainer}>
        <TouchableOpacity style={styles.tabButton} onPress={() => handleTabPress(0)}>
          <Ionicons name="home" size={24} color={activeIndex === 0 ? '#2563EB' : '#9CA3AF'} />
          <Text style={[styles.tabLabel, activeIndex === 0 && styles.activeTabLabel]}>Home</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.tabButton} onPress={() => handleTabPress(1)}>
          <Ionicons name="book" size={24} color={activeIndex === 1 ? '#2563EB' : '#9CA3AF'} />
          <Text style={[styles.tabLabel, activeIndex === 1 && styles.activeTabLabel]}>Review</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.tabButton} onPress={() => handleTabPress(2)}>
          <Ionicons name="add-circle" size={24} color={activeIndex === 2 ? '#2563EB' : '#9CA3AF'} />
          <Text style={[styles.tabLabel, activeIndex === 2 && styles.activeTabLabel]}>Add</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.tabButton} onPress={() => handleTabPress(3)}>
          <Ionicons name="search" size={24} color={activeIndex === 3 ? '#2563EB' : '#9CA3AF'} />
          <Text style={[styles.tabLabel, activeIndex === 3 && styles.activeTabLabel]}>Browse</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.tabButton} onPress={() => handleTabPress(4)}>
          <Ionicons name="ellipsis-horizontal" size={24} color={activeIndex === 4 ? '#2563EB' : '#9CA3AF'} />
          <Text style={[styles.tabLabel, activeIndex === 4 && styles.activeTabLabel]}>More</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111827' },
  pagerView: { flex: 1 },
  pageWrapper: { flex: 1 },
  tabBarContainer: {
    flexDirection: 'row',
    height: Platform.OS === 'ios' ? 88 : 68,
    backgroundColor: '#1F2937',
    borderTopWidth: 1,
    borderTopColor: '#374151',
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 24 : 8,
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  tabButton: { alignItems: 'center', justifyContent: 'center', flex: 1 },
  tabLabel: { fontSize: 11, fontWeight: '600', color: '#9CA3AF', marginTop: 4 },
  activeTabLabel: { color: '#2563EB' },
});