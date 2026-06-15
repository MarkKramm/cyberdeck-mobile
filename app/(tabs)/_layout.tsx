import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { DeviceEventEmitter, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import PagerView from 'react-native-pager-view';

import AddScreen from './add';
import BrowseScreen from './browse';
import HomeScreen from './index';
import MoreScreen from './more';
import ReviewScreen from './review';

const TAB_COUNT = 5;

export default function TabLayout() {
  const [activeIndex, setActiveIndex] = useState(0);
  const pagerRef = useRef<PagerView>(null);

  const goToTab = useCallback((index: number) => {
    if (index < 0 || index >= TAB_COUNT) return;

    setActiveIndex(index);
    pagerRef.current?.setPage(index);
  }, []);

  function handlePageSelect(e: any) {
    const nextIndex = Number(e?.nativeEvent?.position);

    if (Number.isNaN(nextIndex)) return;

    setActiveIndex(nextIndex);
  }

  useEffect(() => {
    const tabSubscription = DeviceEventEmitter.addListener('switchTabSignal', (targetIndex: number) => {
      goToTab(Number(targetIndex));
    });

    return () => tabSubscription.remove();
  }, [goToTab]);

  function renderTab(index: number, iconName: keyof typeof Ionicons.glyphMap, label: string) {
    const isActive = activeIndex === index;

    return (
      <TouchableOpacity
        style={[styles.tabButton, isActive && styles.activeTabButton]}
        onPress={() => goToTab(index)}
        activeOpacity={0.8}
      >
        <Ionicons
          name={iconName}
          size={23}
          color={isActive ? '#60A5FA' : '#9CA3AF'}
        />
        <Text style={[styles.tabLabel, isActive && styles.activeTabLabel]}>
          {label}
        </Text>
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.container}>
      <PagerView
        ref={pagerRef}
        style={styles.pagerView}
        initialPage={0}
        onPageSelected={handlePageSelect}
      >
        <View key="home" style={styles.pageWrapper}>
          <HomeScreen isFocused={activeIndex === 0} />
        </View>

        <View key="review" style={styles.pageWrapper}>
          <ReviewScreen isFocused={activeIndex === 1} />
        </View>

        <View key="add" style={styles.pageWrapper}>
          <AddScreen isFocused={activeIndex === 2} />
        </View>

        <View key="browse" style={styles.pageWrapper}>
          <BrowseScreen isFocused={activeIndex === 3} />
        </View>

        <View key="more" style={styles.pageWrapper}>
          <MoreScreen isFocused={activeIndex === 4} />
        </View>
      </PagerView>

      <View style={styles.tabBarContainer}>
        {renderTab(0, 'home', 'Home')}
        {renderTab(1, 'book', 'Review')}
        {renderTab(2, 'add-circle', 'Add')}
        {renderTab(3, 'search', 'Browse')}
        {renderTab(4, 'ellipsis-horizontal', 'More')}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111827'
  },
  pagerView: {
    flex: 1
  },
  pageWrapper: {
    flex: 1,
    backgroundColor: '#111827'
  },
  tabBarContainer: {
    flexDirection: 'row',
    height: Platform.OS === 'ios' ? 88 : 68,
    backgroundColor: '#1F2937',
    borderTopWidth: 1,
    borderTopColor: '#374151',
    paddingTop: 7,
    paddingBottom: Platform.OS === 'ios' ? 24 : 7,
    paddingHorizontal: 8,
    justifyContent: 'space-around',
    alignItems: 'center'
  },
  tabButton: {
    flex: 1,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'transparent'
  },
  activeTabButton: {
    backgroundColor: '#111827',
    borderColor: '#374151'
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#9CA3AF',
    marginTop: 3
  },
  activeTabLabel: {
    color: '#60A5FA'
  }
});
