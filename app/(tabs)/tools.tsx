// @ts-nocheck
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Linking,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  Dimensions,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRecentlyViewed } from '../RecentlyViewedContext';
import api from '../../lib/api';


const { width } = Dimensions.get('window');


type Tip = {
  title: string;
  desc: string;
  link: string;
  category: string;
  color: string;
};


export default function FinancialTipsPage() {
  const navigation = useNavigation();
  const { recentlyViewed, addRecentlyViewed } = useRecentlyViewed();
  const [tips, setTips] = useState<Tip[]>([]);
  const [loading, setLoading] = useState(true);


  // ✅ Fetch data
  useEffect(() => {
    const fetchTips = async () => {
      try {
      const token = await AsyncStorage.getItem('token');
      const res = await api.get('/tools', {
        headers: { Authorization: `Bearer ${token}` },
      });


        const today = new Date();
        const filtered = res.data.filter((tip: any) => {
          const notExpired =
            !tip.expiryDate || new Date(tip.expiryDate) >= today;
          return tip.visible !== false && notExpired;
        });


        setTips(filtered);
      } catch (err) {
        console.error('Error fetching tips:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchTips();
  }, []);


  const handleOpenLink = (tip: Tip) => {
    addRecentlyViewed({
      title: tip.title,
      category: tip.category,
    });
    Linking.openURL(tip.link).catch((err) =>
      console.error('Error opening link:', err)
    );
  };


  const handleBackPress = () => {
    navigation.goBack();
  };


  const getCategoryEmoji = (category: string) => {
    const emojiMap: { [key: string]: string } = {
      'Information': '📋',
      'Article': '📄',
      'Guide': '📚',
      'Tips': '💡',
      'Budgeting': '💰',
      'Investment': '📈',
      'Saving': '🏦',
      'Credit': '💳',
      'Insurance': '🛡️',
      'Tax': '📋',
      'Retirement': '🏖️',
      'Education': '🎓',
      default: '💡',
    };
    return emojiMap[category] || emojiMap.default;
  };


  const getCategoryColor = (category: string) => {
    const colorMap: { [key: string]: string } = {
      'Information': '#6B1C23', // Maroon
      'Article': '#6B1C23', // Maroon
      'Guide': '#F4B942', // Gold
      'Tips': '#6B1C23', // Maroon
      'Budgeting': '#6B1C23', // Maroon
      'Investment': '#6B1C23', // Maroon
      'Saving': '#6B1C23', // Maroon
      'Credit': '#F4B942', // Gold
      'Insurance': '#6B1C23', // Maroon
      'Tax': '#6B1C23', // Maroon
      'Retirement': '#6B1C23', // Maroon
      'Education': '#F4B942', // Gold
    };
    return colorMap[category] || '#6B1C23';
  };


  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#6B1C23" />
     
      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Gradient Header Section */}
        <LinearGradient
          colors={['#6B1C23', '#8B2635']} // ✅ Maroon gradient
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.headerContainer}
        >
          {/* Combined header row */}
          <View
            style={[
              styles.headerRow,
              Platform.OS === 'web' && styles.headerRowWeb
            ]}
          >
            {Platform.OS == 'web' && (
              <TouchableOpacity
                style={styles.backButton}
                onPress={handleBackPress}
                activeOpacity={0.8}
              >
                <Ionicons name="arrow-back" size={24} color="#F4B942" />
              </TouchableOpacity>
            )}


            <Text style={styles.mainHeading}>Financial Tips</Text>
          </View>


          <Text
            style={styles.subHeading}
            numberOfLines={1}
            adjustsFontSizeToFit
            ellipsizeMode="tail"
          >
            Discover expert advice to boost your financial wellness
          </Text>


          {/* Main Header Content */}
          <View style={[
            styles.headerContent,
            Platform.OS === 'web' && styles.headerContentWeb
          ]}>


            {/* Stats Row */}
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{tips.length}</Text>
                <Text style={styles.statLabel}>Total Tips</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{recentlyViewed.length}</Text>
                <Text style={styles.statLabel}>Recently Viewed</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>
                  {new Set(tips.map(tip => tip.category)).size}
                </Text>
                <Text style={styles.statLabel}>Categories</Text>
              </View>
            </View>
          </View>


          {/* Wave Shape Bottom */}
          <View style={styles.waveContainer}>
            <View style={styles.wave} />
          </View>
        </LinearGradient>


        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#6B1C23" /> {/* ✅ Maroon */}
            <Text style={styles.loadingText}>Loading financial tips...</Text>
          </View>
        ) : (
          <>
            {/* Tips Grid */}
            <View style={styles.sectionContainer}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>📚 Browse Tips</Text>
                <View style={styles.sectionBadge}>
                  <Text style={styles.sectionBadgeText}>{tips.length} tips</Text>
                </View>
              </View>
             
              <View style={styles.gridWrapper}>
                {tips.map((tip, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={[
                      styles.card,
                      { backgroundColor: '#FFF8E7' }, // ✅ Soft cream/yellow - very readable!
                    ]}
                    onPress={() => handleOpenLink(tip)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.cardHeader}>
                      <View style={[
                        styles.categoryContainer,
                        { backgroundColor: getCategoryColor(tip.category) + '15' }
                      ]}>
                        <Text style={styles.categoryEmoji}>
                          {getCategoryEmoji(tip.category)}
                        </Text>
                        <Text style={[
                          styles.categoryTag,
                          { color: getCategoryColor(tip.category) }
                        ]}>
                          {tip.category}
                        </Text>
                      </View>
                    </View>
                   
                    <Text style={styles.title} numberOfLines={2}>
                      {tip.title}
                    </Text>
                   
                    <Text style={styles.desc} numberOfLines={3}>
                      {tip.desc}
                    </Text>
                   
                    <View style={styles.cardFooter}>
                      <View style={styles.readMoreContainer}>
                        <Text style={[
                          styles.readMoreText,
                          { color: getCategoryColor(tip.category) }
                        ]}>
                          Read More
                        </Text>
                        <View style={[
                          styles.arrow,
                          { backgroundColor: getCategoryColor(tip.category) }
                        ]}>
                          <Ionicons name="arrow-forward" size={12} color="#ffffff" />
                        </View>
                      </View>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </View>


            {/* Recently Viewed Section */}
            <View style={styles.sectionContainer}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>🕑 Recently Viewed</Text>
                <View style={styles.sectionBadge}>
                  <Text style={styles.sectionBadgeText}>
                    {recentlyViewed.length} {recentlyViewed.length === 1 ? 'item' : 'items'}
                  </Text>
                </View>
              </View>
             
              {recentlyViewed.length === 0 ? (
                <View style={styles.emptyStateContainer}>
                  <LinearGradient
                    colors={['#FFF8E7', '#FFF4D6']} // ✅ Soft cream gradient
                    style={styles.emptyStateIcon}
                  >
                    <Text style={styles.emptyStateEmoji}>📖</Text>
                  </LinearGradient>
                  <Text style={styles.emptyStateTitle}>No tips viewed yet</Text>
                  <Text style={styles.emptyStateDesc}>
                    Start exploring financial tips above to see your reading history here
                  </Text>
                </View>
              ) : (
                <View style={styles.recentList}>
                  {recentlyViewed.slice(0, 5).map((item, index) => (
                    <View key={index} style={styles.recentCard}>
                      <View style={styles.recentCardContent}>
                        <View style={[
                          styles.recentCategoryIcon,
                          { backgroundColor: getCategoryColor(item.category) + '15' }
                        ]}>
                          <Text style={styles.recentCategoryEmoji}>
                            {getCategoryEmoji(item.category)}
                          </Text>
                        </View>
                        <View style={styles.recentTextContainer}>
                          <Text style={styles.recentTitle} numberOfLines={2}>
                            {item.title}
                          </Text>
                          <View style={styles.recentCategoryContainer}>
                            <Text style={[
                              styles.recentCategoryTag,
                              {
                                color: getCategoryColor(item.category),
                                backgroundColor: getCategoryColor(item.category) + '10'
                              }
                            ]}>
                              {item.category}
                            </Text>
                          </View>
                        </View>
                      </View>
                      <View style={[
                        styles.recentIndicator,
                        { backgroundColor: getCategoryColor(item.category) }
                      ]} />
                    </View>
                  ))}
                </View>
              )}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}


const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#6B1C23', // ✅ Maroon
  },
  container: {
    flex: 1,
    backgroundColor: '#FFFCF5', // ✅ Very light cream background
  },
  scrollContent: {
    paddingBottom: 30,
  },
 
  // Header Styles
  headerContainer: {
    paddingBottom: 40,
    position: 'relative',
  },
  navigationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingHorizontal: 24,
    paddingBottom: 16,
    height: 56,
    paddingTop: Platform.OS === 'ios' ? 24 : 50,
    marginTop: Platform.OS === 'ios' ? 30 : 20,
    marginBottom: -8,
  },
  placeholder: {
    width: 40,
  },
  headerContent: {
    paddingHorizontal: 24,
    paddingTop: 4,
    alignItems: 'center',
  },
  headerContentWeb: {
    paddingTop: 40,
  },
  subHeading: {
    fontSize: 13,
    color: '#F4B942', // ✅ Gold
    textAlign: 'center',
    lineHeight: 15,
    paddingHorizontal: 15,
    marginBottom: 5,
    flexShrink: 1,
    flexWrap: 'nowrap',
    width: 'auto',
    maxWidth: '100%',
    alignSelf: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 20,
    paddingVertical: 5,
    paddingHorizontal: 0,
    backdropFilter: 'blur(10px)',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: '500',
    textAlign: 'center',
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginHorizontal: 2,
  },
  waveContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 20,
    overflow: 'hidden',
  },
  wave: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 40,
    backgroundColor: '#FFFCF5', // ✅ Match container background
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
  },


  // Loading Styles
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B1C23', // ✅ Maroon
    fontWeight: '500',
  },


  // Section Styles
  sectionContainer: {
    marginBottom: 40,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: 24,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#6B1C23', // ✅ Maroon
    letterSpacing: -0.3,
  },
  sectionBadge: {
    backgroundColor: '#FFF8E7', // ✅ Soft cream
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F4B94230', // ✅ Light gold border
  },
  sectionBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B1C23', // ✅ Maroon
  },


  // Grid Styles
  gridWrapper: {
    paddingHorizontal: 20,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  card: {
    width: '48%',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#6B1C23', // ✅ Maroon
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
    borderWidth: 1.5,
    borderColor: '#F4B94240', // ✅ Gold border
  },
  cardHeader: {
    marginBottom: 10,
  },
  categoryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  categoryEmoji: {
    fontSize: 14,
    marginRight: 6,
  },
  categoryTag: {
    fontSize: 12,
    fontWeight: '600',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#6B1C23', // ✅ Maroon
    lineHeight: 24,
    marginBottom: 12,
  },
  desc: {
    fontSize: 14,
    color: '#6B1C23', // ✅ Maroon (darker for better readability)
    lineHeight: 20,
    marginBottom: 20,
    opacity: 0.8,
  },
  cardFooter: {
    marginTop: 'auto',
  },
  readMoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  readMoreText: {
    fontSize: 14,
    fontWeight: '600',
  },
  arrow: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },


  // Empty State
  emptyStateContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 24,
  },
  emptyStateIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyStateEmoji: {
    fontSize: 36,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6B1C23', // ✅ Maroon
    marginBottom: 8,
  },
  emptyStateDesc: {
    fontSize: 14,
    color: '#6B1C23', // ✅ Maroon
    textAlign: 'center',
    lineHeight: 20,
    opacity: 0.7,
  },


  // Recent List Styles
  recentList: {
    paddingHorizontal: 24,
  },
  recentCard: {
    backgroundColor: '#FFF8E7', // ✅ Soft cream
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: '#F4B94230', // ✅ Light gold border
    shadowColor: '#6B1C23', // ✅ Maroon
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    position: 'relative',
    overflow: 'hidden',
  },
  recentCardContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  recentCategoryIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  recentCategoryEmoji: {
    fontSize: 18,
  },
  recentTextContainer: {
    flex: 1,
  },
  recentTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B1C23', // ✅ Maroon
    lineHeight: 22,
    marginBottom: 8,
  },
  recentCategoryContainer: {
    alignSelf: 'flex-start',
  },
  recentCategoryTag: {
    fontSize: 12,
    fontWeight: '500',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    overflow: 'hidden',
  },
  recentIndicator: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    marginTop: Platform.OS === 'ios' ? 20 : 60,
    marginBottom: 8,
  },
  headerRowWeb: {
    marginTop: 40,
  },
  backButton: {
    position: 'absolute',
    left: 24,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mainHeading: {
    fontSize: 26,
    fontWeight: '800',
    color: '#ffffff',
    textAlign: 'center',
    letterSpacing: -0.5,
  },
});

