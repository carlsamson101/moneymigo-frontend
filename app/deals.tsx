import { LogBox } from "react-native";

LogBox.ignoreLogs([
  "Unexpected text node",                     // 🧘 hides RN-Web text node spam
  "Warning: Text strings must be rendered",   // companion message
]);

import React, { useEffect, useState, useCallback } from 'react';


import { router } from "expo-router";  
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Picker } from '@react-native-picker/picker';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Platform,
  StatusBar,
  Dimensions,
  ScrollView,
  RefreshControl,
} from 'react-native';
import api from '../lib/api';
import UniversalMap from '../components/UniversalMap';

const { width } = Dimensions.get('window');
const isMobile = Platform.OS === 'ios' || Platform.OS === 'android';

type Deal = {
  _id: string;
  storeName: string;
  itemName: string;
  price: number;
  location: { type: string; coordinates: [number, number] };
  distance?: number;
  unit?: string;
  category?: string;
  stock?: number; // ✅ added
};


// Add this helper function to get category display info
const getCategoryInfo = (category?: string) => {
  const categoryMap: Record<string, { label: string; color: string; bgColor: string; icon: string }> = {
    'food': { label: 'Food', color: '#DC2626', bgColor: '#FEE2E2', icon: 'restaurant' },
    'beverage': { label: 'Beverage', color: '#2563EB', bgColor: '#DBEAFE', icon: 'cafe' },
    'personal care': { label: 'Personal Care', color: '#7C3AED', bgColor: '#EDE9FE', icon: 'sparkles' },
    'household': { label: 'Household', color: '#059669', bgColor: '#D1FAE5', icon: 'home' },
    'medicine': { label: 'Medicine', color: '#DC2626', bgColor: '#FEE2E2', icon: 'medical' },
    'electronics': { label: 'Electronics', color: '#0891B2', bgColor: '#CFFAFE', icon: 'phone-portrait' },
    'clothing': { label: 'Clothing', color: '#DB2777', bgColor: '#FCE7F3', icon: 'shirt' },
    'tools': { label: 'Tools', color: '#CA8A04', bgColor: '#FEF9C3', icon: 'construct' },
    'other': { label: 'Other', color: '#6B7280', bgColor: '#F3F4F6', icon: 'ellipsis-horizontal' },
  };

  return categoryMap[category?.toLowerCase() || 'other'] || categoryMap['other'];
};

export default function DealsPage() {
  const [q, setQ] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
    const [total, setTotal] = useState(0);

  // Product categories - FIXED to match backend
  const categories = [
    { value: "all", label: "All" }, // make it a string for Picker reliability
    { value: 'food', label: 'Food' },
    { value: 'beverage', label: 'Beverage' },
    { value: 'personal care', label: 'Personal Care' },
    { value: 'household', label: 'Household' },
    { value: 'medicine', label: 'Medicine' },
    { value: 'electronics', label: 'Electronics' },
    { value: 'clothing', label: 'Clothing' },
    { value: 'tools', label: 'Tools' },
    { value: 'other', label: 'Other' },
  ];

  const fetchDeals = useCallback(async (isRefreshing = false) => {
    if (isRefreshing) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const params: any = {
        lat: 8.228,
        lng: 124.245,
        radius: 10000,
        limit: 50,
      };

      // ✅ Send search query OR category, not both
      if (q.trim()) {
        params.item = q.trim();
      } else if (selectedCategory && selectedCategory !== "all") {
        params.category = selectedCategory;
      }


      console.log('Fetching with params:', params); // Debug log

      const res = await api.get('/deals', { params });
      setDeals(res.data);
      setError(null);
    } catch (err: any) {
      console.error('Fetch deals error:', err.response?.data || err.message);
      const errorMsg = err.response?.data?.message || 'Failed to load deals. Please check your connection.';
      setError(errorMsg);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [q, selectedCategory]);

  const fetchTotal = useCallback(async () => {
  try {
    const res = await api.get("/deals/total"); // backend route
    console.log("🧮 Total deals:", res.data);
    setTotal(res.data.total || 0);
  } catch (err: any) {
    console.error("Fetch total error:", err.response?.data || err.message);
    setTotal(0);
  }
}, []);

useEffect(() => {
  fetchDeals();
  if (!selectedCategory) fetchTotal(); // ✅ Only fetch total if "All" selected
}, [selectedCategory, q]);




const onRefresh = () => {
  fetchDeals(true);
  fetchTotal();
};


  const cheapestPrice = deals.length ? Math.min(...deals.map(d => d.price)) : null;

  // Error State
  if (error && !refreshing && deals.length === 0) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#1E40AF" />
        
        {/* Header */}
        <LinearGradient colors={['#1f4b81ff', '#7fb1d6ff']} style={styles.header}>
          <View style={styles.headerRow}>
            {isMobile && (
              <TouchableOpacity 
                style={styles.backButton}
                onPress={() => router.back()}
                activeOpacity={0.7}
              >
                <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            )}
            
            <View style={styles.headerContent}>
              <Text style={styles.title}>Marketplace</Text>
              <Text style={styles.subtitle}>Iligan City</Text>
            </View>
            
            {isMobile && <View style={styles.headerSpacer} />}
          </View>
        </LinearGradient>

        <View style={styles.errorContainer}>
          <View style={styles.errorIconCircle}>
            <Ionicons name="alert-circle" size={48} color="#EF4444" />
          </View>
          <Text style={styles.errorTitle}>Oops! Something went wrong</Text>
          <Text style={styles.errorMessage}>{error}</Text>
          <TouchableOpacity
            onPress={() => fetchDeals()}
            style={styles.retryButton}
          >
            <Ionicons name="refresh" size={20} color="white" />
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
<ScrollView
    style={styles.container}
    showsVerticalScrollIndicator={false}
    contentContainerStyle={{ paddingBottom: 80 }}
    refreshControl={
      <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#3B82F6']} />
    }
  >      <StatusBar barStyle="light-content" backgroundColor="#1E40AF" />
      
      {/* Header */}
      <LinearGradient colors={['#1f4b81ff', '#7fb1d6ff']} style={styles.header}>
        <View style={styles.headerRow}>
          {isMobile && (
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => router.back()}
              activeOpacity={0.7}
            >
              <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          )}
          
          <View style={styles.headerContent}>
            <Text style={styles.title}>Marketplace</Text>
            <Text style={styles.subtitle}>Iligan City</Text>
          </View>
          
          {isMobile && <View style={styles.headerSpacer} />}
        </View>
      </LinearGradient>

      {/* Search */}
      <View style={styles.searchContainer}>
        <View style={styles.searchWrapper}>
          <Ionicons name="search" size={18} color="#6B7280" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search items..."
            placeholderTextColor="#9CA3AF"
            value={q}
            onChangeText={setQ}
            onSubmitEditing={() => fetchDeals()}
          />
          {q.length > 0 && (
            <TouchableOpacity 
              style={styles.clearButton}
              onPress={() => setQ('')}
            >
              <Ionicons name="close-circle" size={18} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        </View>
        
        <TouchableOpacity 
          style={[styles.searchButton, loading && styles.searchButtonDisabled]} 
          onPress={() => fetchDeals()}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <Ionicons name="search" size={16} color="white" />
          )}
        </TouchableOpacity>
      </View>

      {/* Category Filter */}
     {/* Category Dropdown */}
<View style={styles.dropdownContainer}>
  <Text style={styles.dropdownLabel}>Category:</Text>
  <View style={styles.dropdownWrapper}>
    <Picker
      selectedValue={selectedCategory || "all"}
      onValueChange={(itemValue) => {
        setSelectedCategory(itemValue === "all" ? null : itemValue);
        setQ("");
      }}
      style={styles.picker}
      dropdownIconColor="#1f4b81ff"
    >
      {categories.map((cat) => (
        <Picker.Item key={cat.value} label={cat.label} value={cat.value} />
      ))}
    </Picker>
  </View>
</View>



      {/* Results Header */}
      {!loading && deals.length > 0 && (
  <View style={styles.resultsHeader}>
    <Text style={styles.resultsText}>
      {selectedCategory === null
        ? `Showing ${total || deals.length} total deal${(total || deals.length) !== 1 ? "s" : ""}`
        : `Showing ${deals.length} deal${deals.length !== 1 ? "s" : ""} in ${
            categories.find(c => c.value === selectedCategory)?.label
          }`}
    </Text>

    {cheapestPrice && (
      <Text style={styles.bestPriceText}>
        Best price: ₱{cheapestPrice}
      </Text>
    )}
  </View>
)}

      {/* Map */}
      {!loading && deals.length > 0 && (
        <View style={styles.mapContainer}>
          <UniversalMap deals={deals} />
        </View>
      )}

      {/* Loading */}
      {loading && !refreshing && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={styles.loadingText}>Finding best deals...</Text>
        </View>
      )}

      {/* Empty State */}
      {!loading && deals.length === 0 && !error && (
        <ScrollView
          contentContainerStyle={styles.emptyStateScroll}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#3B82F6']} />
          }
        >
          <View style={styles.emptyState}>
            <View style={styles.emptyIconCircle}>
              <Ionicons 
                name={q || selectedCategory ? "search-outline" : "pricetags-outline"} 
                size={48} 
                color="#3B82F6" 
              />
            </View>
            <Text style={styles.emptyStateTitle}>No deals found</Text>
            <Text style={styles.emptyStateMessage}>
              {q 
                ? `No results for "${q}". Try a different search term.`
                : selectedCategory
                ? `No deals available in ${categories.find(c => c.value === selectedCategory)?.label} category.`
                : 'No deals available at the moment. Pull down to refresh.'}
            </Text>
            {(q || selectedCategory) && (
              <TouchableOpacity
               onPress={() => {
                setQ('');
                setSelectedCategory(null); // will automatically map back to "All"
              }}

                style={styles.clearFiltersButton}
              >
                <Ionicons name="close-circle" size={20} color="white" />
                <Text style={styles.clearFiltersText}>Clear Filters</Text>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
      )}

     {/* List - Product Cards */}
{!loading && deals.length > 0 && (
  <FlatList
    data={deals}
    keyExtractor={(item) => item._id}
    contentContainerStyle={styles.listContainer}
    showsVerticalScrollIndicator={false}
    nestedScrollEnabled // ✅ allow inner list inside ScrollView
    scrollEnabled={false} // ✅ disable FlatList’s own scrolling to avoid conflict
    refreshControl={
      <RefreshControl
        refreshing={refreshing}
        onRefresh={onRefresh}
        colors={['#3B82F6']}
      />
    }
    renderItem={({ item }) => {
      const distanceKm = item.distance ? (item.distance / 1000).toFixed(2) : '';
      const isCheapest = cheapestPrice !== null && item.price === cheapestPrice;
      const [lng, lat] = item.location?.coordinates || [null, null];
      const categoryInfo = getCategoryInfo(item.category);

      return (
        <View
          style={[
            styles.dealCard,
            isCheapest && styles.cheapestCard,
          ]}
        >
          {isCheapest && (
            <View style={styles.cheapestBadge}>
              <Ionicons name="star" size={10} color="white" />
              <Text style={styles.cheapestBadgeText}>Lowest Price</Text>
            </View>
          )}

          <View style={styles.dealInfo}>
            <Text style={styles.itemName} numberOfLines={1}>{item.itemName}</Text>

            {/* Category Badge */}
            <View
              style={[
                styles.categoryBadge,
                { backgroundColor: categoryInfo.bgColor, alignSelf: 'flex-start' },
              ]}
            >
              <Ionicons name={categoryInfo.icon as any} size={9} color={categoryInfo.color} />
              <Text
                style={[
                  styles.categoryBadgeText,
                  { color: categoryInfo.color },
                ]}
              >
                {categoryInfo.label}
              </Text>
            </View>

            <View style={styles.storeInfo}>
              <Ionicons name="storefront-outline" size={12} color="#6B7280" />
              <Text style={styles.storeName} numberOfLines={1}>
                {item.storeName}
              </Text>
              {item.unit && (
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={styles.separator}>•</Text>
                  <Text style={styles.unit}>{item.unit}</Text>
                </View>
              )}
            </View>

            {distanceKm && (
              <View style={styles.distanceInfo}>
                <Ionicons name="location-outline" size={12} color="#9CA3AF" />
                <Text style={styles.distance}>{distanceKm} km</Text>
              </View>
            )}
          </View>

          {/* 🧮 Stock Info */}
          {item.stock === 0 ? (
            <View style={styles.outOfStockContainer}>
              <Text style={styles.outOfStockText}>No stock available</Text>
            </View>
          ) : (
            <View style={styles.stockContainer}>
              <Ionicons name="cube-outline" size={12} color="#059669" />
              <Text style={styles.stockText}>
                {typeof item.stock === 'number'
                  ? `${item.stock} in stock`
                  : 'Stock unavailable'}
              </Text>
            </View>
          )}

          <View style={styles.priceSection}>
            <Text style={[styles.price, isCheapest && styles.cheapestPrice]}>
              ₱{item.price}
            </Text>

            {lat && lng && (
              <TouchableOpacity
                onPress={() =>
                  router.push(
                    `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`
                  )
                }
                style={styles.directionsButton}
              >
                <Ionicons name="navigate" size={12} color="#2563EB" />
                <Text style={styles.directionsText}>Directions</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      );
    }}
  />
)}
  </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },

  header: {
    paddingTop: Platform.OS === 'ios' ? 50 : 16,
    paddingBottom: 14,
    paddingHorizontal: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 36,
    marginTop: 10,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerContent: { 
    marginTop: 12,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerSpacer: { width: 36 },
  title: { 
    fontSize: 22, 
    fontWeight: '700', 
    color: '#FFFFFF',
  },
  subtitle: { 
    fontSize: 13, 
    color: 'rgba(255,255,255,0.85)', 
    fontWeight: '500',
    marginTop: 2,
  },

  // Search - Compact
  searchContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    gap: 8,
  },
  searchWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    paddingHorizontal: 10,
    height: 42,
  },
  searchIcon: { marginRight: 6 },
  searchInput: { 
    flex: 1, 
    fontSize: 14, 
    color: '#111827',
    paddingVertical: 0,
  },
  clearButton: { padding: 4 },
  searchButton: {
    width: 42, 
    height: 42, 
    borderRadius: 10,
    backgroundColor: '#3B82F6',
    justifyContent: 'center', 
    alignItems: 'center',
  },
  searchButtonDisabled: { backgroundColor: '#9CA3AF' },

  itemName: { 
    fontSize: 15, 
    fontWeight: '700', 
    color: '#111827',
    textTransform: 'capitalize',
    flex: 1,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 3,
    marginTop: 4,
    marginBottom: 4,
  },
  categoryBadgeText: {
    fontSize: 9,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  separator: { 
    color: '#D1D5DB', 
    marginHorizontal: 2,
    fontSize: 10,
  },
  unit: { 
    fontSize: 11, 
    color: '#6B7280',
    textTransform: 'capitalize',
  },

  // Category Filter
  categoryContainer: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  categoryScrollContent: {
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  categoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryChipActive: { 
    backgroundColor: '#1f4b81ff', 
    borderColor: '#1f4b81ff',
  },
  categoryText: { 
    color: '#374151', 
    fontSize: 13, 
    fontWeight: '600',
  },
  categoryTextActive: { color: '#FFFFFF' },

  resultsHeader: {
    paddingHorizontal: 16, 
    paddingVertical: 10,
    backgroundColor: '#FFFFFF', 
    borderBottomWidth: 1, 
    borderBottomColor: '#F3F4F6',
  },
  resultsText: { fontSize: 14, fontWeight: '600', color: '#374151' },
  bestPriceText: { fontSize: 13, color: '#1f4b81ff', fontWeight: '500', marginTop: 2 },

  mapContainer: {
    margin: 12, 
    borderRadius: 12, 
    overflow: 'hidden',
    height: 200,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },

  loadingContainer: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    paddingVertical: 40 
  },
  loadingText: { 
    marginTop: 16, 
    fontSize: 14, 
    color: '#6B7280', 
    fontWeight: '500' 
  },

  // Error State
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  errorIconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 8,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3B82F6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },

  // Empty State
  emptyStateScroll: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyState: {
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyIconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#DBEAFE',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 8,
  },
  emptyStateMessage: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  clearFiltersButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3B82F6',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 8,
    gap: 8,
  },
  clearFiltersText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '600',
  },

  // Product Cards
  listContainer: { 
    paddingHorizontal: 16, 
    paddingVertical: 8, 
    paddingBottom: 32 
  },
  dealCard: {
    flexDirection: 'row', 
    backgroundColor: '#FFFFFF',
    borderRadius: 12, 
    padding: 10,
    marginBottom: 8,
    borderWidth: 1, 
    borderColor: '#E5E7EB', 
    position: 'relative',
  },
  cheapestCard: { 
    borderColor: '#1f4b81ff', 
    borderWidth: 1.5 
  },
  cheapestBadge: {
    position: 'absolute', 
    top: -1, 
    right: 10, 
    backgroundColor: '#1f4b81ff',
    flexDirection: 'row', 
    alignItems: 'center',
    paddingHorizontal: 6, 
    paddingVertical: 3, 
    borderRadius: 6, 
    gap: 3,
  },
  cheapestBadgeText: { 
    color: '#FFFFFF', 
    fontSize: 9, 
    fontWeight: '700' 
  },
  
  dealInfo: { flex: 1, paddingRight: 8 },

  storeInfo: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginBottom: 3,
    gap: 4,
  },
  storeName: { 
    fontSize: 12, 
    color: '#6B7280', 
    fontWeight: '500',
    flex: 1,
  },
  distanceInfo: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 3,
  },
  distance: { fontSize: 11, color: '#9CA3AF' },

  priceSection: { 
    alignItems: 'flex-end', 
    justifyContent: 'space-between',
    minWidth: 80,
  },
  price: { 
    fontSize: 17, 
    fontWeight: '800', 
    color: '#111827',
  },
  cheapestPrice: { color: '#1f4b81ff', fontSize: 18 },

  directionsButton: { 
    flexDirection: 'row', 
    alignItems: 'center',
    marginTop: 4,
    gap: 3,
  },
  directionsText: { 
    color: '#2563EB', 
    fontSize: 11, 
    fontWeight: '600',
  },
  stockContainer: {
  flexDirection: 'row',
  alignItems: 'center',
  marginTop: 4,
  gap: 4,
},

stockText: {
  fontSize: 12,
  fontWeight: '600',
  color: '#059669',
},

outOfStockContainer: {
  backgroundColor: '#FEE2E2',
  borderColor: '#EF4444',
  borderWidth: 1,
  paddingVertical: 4,
  paddingHorizontal: 8,
  borderRadius: 6,
  marginTop: 6,
  alignSelf: 'flex-start',
},

outOfStockText: {
  color: '#B91C1C',
  fontSize: 13,
  fontWeight: '700',
  textTransform: 'uppercase',
},
dropdownContainer: {
  backgroundColor: '#FFFFFF',
  paddingHorizontal: 12,
  paddingVertical: 10,
  borderBottomWidth: 1,
  borderBottomColor: '#E5E7EB',
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 8,
},
dropdownLabel: {
  fontSize: 13,
  fontWeight: '600',
  color: '#374151',
  flexShrink: 0,
  minWidth: 60,
},
dropdownWrapper: {
  flex: 1,
  maxWidth: 200,
  borderWidth: 1,
  borderColor: '#E5E7EB',
  borderRadius: 6,
  backgroundColor: '#F9FAFB',
  height: 44,
  justifyContent: 'center',
},
picker: {
  height: 55,
  width: '100%',
  color: '#111827',
  fontSize: 13,
},
});