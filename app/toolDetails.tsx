// @ts-nocheck
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Linking,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useRecentlyViewed } from './RecentlyViewedContext';

const allTools = [
  {
    icon: <Ionicons name="calculator" size={24} color="#3b82f6" />,
    title: 'Budget Calculator',
    desc: 'Easily create and manage a monthly budget.',
    category: 'Budgeting',
    links: [],
    bgColor: '#E0F2FE',
  },
  {
    icon: <MaterialCommunityIcons name="piggy-bank-outline" size={24} color="#10b981" />,
    title: 'Savings Tips',
    desc: 'Learn easy ways to boost your savings.',
    category: 'Savings',
    links: [
      {
        title: 'How to Save Money',
        url: 'https://www.nerdwallet.com/article/finance/how-to-save-money',
      },
      {
        title: 'Simple ways to save money',
        url: 'https://moneysmart.gov.au/saving/simple-ways-to-save-money',
      },
    ],
    bgColor: '#DCFCE7',
  },
  {
    icon: <Ionicons name="trending-up-outline" size={24} color="#f59e42" />,
    title: 'Investment 101',
    desc: 'Start investing with beginner-friendly guides.',
    category: 'Investing',
    links: [
      {
        title: 'Investing 101 Beginner Guide',
        url: 'https://www.morganstanley.com/atwork/employees/learning-center/articles/investing-101-beginners-guide',
      },
      {
        title: 'Investing',
        url: 'https://www.investor.gov/introduction-investing',
      },
    ],
    bgColor: '#FEF3C7',
  },
  {
    icon: <MaterialCommunityIcons name="credit-card-check-outline" size={24} color="#ef4444" />,
    title: 'Debt Payoff Planner',
    desc: 'Plan and track your debt payoff journey.',
    category: 'Debt Management',
    links: [],
    bgColor: '#FEE2E2',
  },
];

export default function ToolDetailPage() {
  const { category } = useLocalSearchParams();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(category || 'All');
  const router = useRouter();
  const { addRecentlyViewed } = useRecentlyViewed();

  // Sync category on navigation
  useEffect(() => {
    if (category && category !== selectedCategory) {
      setSelectedCategory(category);
    }
  }, [category]);

  const categories = ['All', 'Budgeting', 'Savings', 'Investing', 'Debt Management'];

  // Filtering logic: parent + links
  const filteredTools = allTools.filter((tool) => {
    const matchesCategory = selectedCategory === 'All' || tool.category === selectedCategory;
    const matchesParent =
      tool.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tool.desc.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesLinks =
      (tool.links || []).some((link) =>
        link.title.toLowerCase().includes(searchQuery.toLowerCase())
      );
    return matchesCategory && (matchesParent || matchesLinks || searchQuery.trim() === '');
  });

  return (
    <ScrollView style={styles.container}>
      {/* ======= CUSTOM HEADER ======= */}
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={28} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Tools</Text>
      </View>

      <TextInput
        style={styles.search}
        placeholder="Search your tools..."
        value={searchQuery}
        onChangeText={setSearchQuery}
      />

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryRow}>
        {categories.map((cat, idx) => (
          <TouchableOpacity
            key={idx}
            style={[styles.categoryBtn, selectedCategory === cat && styles.categoryBtnSelected]}
            onPress={() => setSelectedCategory(cat)}
          >
            <Text style={{ color: selectedCategory === cat ? '#fff' : '#000', fontWeight: 'bold' }}>
              {cat}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={styles.grid}>
        {filteredTools.flatMap((tool, idx) =>
          tool.links.length > 0
            ? tool.links.map((link, linkIdx) => (
                <View key={tool.title + link.title} style={[styles.card, { backgroundColor: tool.bgColor }]}>
                  <View style={styles.cardHeader}>
                    <Text style={styles.cardCategory}>{tool.category}</Text>
                  </View>
                  <Text style={styles.title}>{link.title}</Text>
                  <Text style={styles.desc}>{tool.desc}</Text>
                  <TouchableOpacity
                    style={styles.viewLinkBtn}
                    onPress={() => {
                      addRecentlyViewed({ title: link.title, category: tool.category });
                      Linking.openURL(link.url);
                    }}
                  >
                    <Text style={styles.viewLinkText}>View Link</Text>
                  </TouchableOpacity>
                </View>
              ))
            : [
                <View key={tool.title} style={[styles.card, { backgroundColor: tool.bgColor }]}>
                  <View style={styles.cardHeader}>
                    <Text style={styles.cardCategory}>{tool.category}</Text>
                  </View>
                  <Text style={styles.title}>{tool.title}</Text>
                  <Text style={styles.desc}>{tool.desc}</Text>
                  <TouchableOpacity
                    disabled
                    style={styles.viewLinkBtnDisabled}
                    onPress={() => addRecentlyViewed({ title: tool.title, category: tool.category })}
                  >
                    <Text style={styles.viewLinkText}>No Link Available</Text>
                  </TouchableOpacity>
                </View>
              ]
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#fff' },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    marginTop: 15,
    gap: 4,
  },
  backBtn: {
    padding: 2,
    marginRight: 4,
    borderRadius: 999,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
  search: {
    borderColor: '#ccc',
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 10,
  },
  categoryRow: { flexDirection: 'row', marginBottom: 16 },
  categoryBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    marginRight: 8,
  },
  categoryBtnSelected: {
    backgroundColor: '#3b82f6',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
  },
  card: {
    width: '48%',
    backgroundColor: '#f9fafb',
    padding: 16,
    borderRadius: 14,
    borderColor: '#e5e7eb',
    borderWidth: 1,
    marginBottom: 16,
    marginRight: '2%',
  },
  cardHeader: {
    alignSelf: 'flex-start',
    backgroundColor: '#000',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginBottom: 6,
  },
  cardCategory: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  title: { fontWeight: 'bold', fontSize: 16, marginBottom: 4 },
  desc: { fontSize: 13, color: '#64748B', marginBottom: 8 },
  viewLinkBtn: {
    backgroundColor: '#fb5e36',
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  viewLinkBtnDisabled: {
    backgroundColor: '#9ca3af',
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  viewLinkText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
});
