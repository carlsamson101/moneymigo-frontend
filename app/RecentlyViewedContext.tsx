// @ts-nocheck
import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getToken } from '../lib/auth';

type RecentlyViewedItem = {
  title: string;
  category: string;
};

const RecentlyViewedContext = createContext({
  recentlyViewed: [],
  addRecentlyViewed: (_: RecentlyViewedItem) => {},
});

export function RecentlyViewedProvider({ children }) {
  const [recentlyViewed, setRecentlyViewed] = useState<RecentlyViewedItem[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // 🔥 Poll for user changes every 2 seconds
  useEffect(() => {
    const checkUser = async () => {
      try {
        const token = await getToken();
        const userId = token?.id || 'guest';
        
        // 🚨 User changed! Reload their data
        if (userId !== currentUserId) {
          console.log('🔄 User changed from', currentUserId, 'to', userId);
          setCurrentUserId(userId);
          await loadUserData(userId);
        }
      } catch (err) {
        console.error('Failed to check user:', err);
      }
    };

    checkUser(); // Check immediately
    const interval = setInterval(checkUser, 2000); // Check every 2s

    return () => clearInterval(interval);
  }, [currentUserId]);

  // 📦 Load data for specific user
  const loadUserData = async (userId: string) => {
    const storageKey = `recentlyViewed_${userId}`;
    
    try {
      const raw = await AsyncStorage.getItem(storageKey);
      
      if (!raw) {
        console.log('📭 No data for user:', userId);
        setRecentlyViewed([]);
        return;
      }

      const parsed = JSON.parse(raw);
      const lastUpdated = parsed.lastUpdated ? new Date(parsed.lastUpdated) : null;
      const now = new Date();

      // Check if data expired (24h)
      if (lastUpdated && now.getTime() - lastUpdated.getTime() > 24 * 60 * 60 * 1000) {
        await AsyncStorage.removeItem(storageKey);
        setRecentlyViewed([]);
        console.log(`🕓 Cleared expired data for ${userId}`);
      } else {
        setRecentlyViewed(parsed.items || []);
        console.log(`✅ Loaded ${parsed.items?.length || 0} items for ${userId}`);
      }
    } catch (err) {
      console.error('Failed to load recently viewed:', err);
      setRecentlyViewed([]);
    }
  };

  // ➕ Add new item
  const addRecentlyViewed = (item: RecentlyViewedItem) => {
    if (!currentUserId) {
      console.warn('⚠️ No user loaded yet');
      return;
    }

    const storageKey = `recentlyViewed_${currentUserId}`;
    
    setRecentlyViewed((prev) => {
      // Remove duplicates
      const filtered = prev.filter(
        (x) => !(x.title === item.title && x.category === item.category)
      );
      
      // Add to front, keep max 10
      const updated = [item, ...filtered].slice(0, 10);

      // Save to storage
      AsyncStorage.setItem(
        storageKey,
        JSON.stringify({
          items: updated,
          lastUpdated: new Date().toISOString(),
          userId: currentUserId,
        })
      ).catch(err => console.error('Failed to save:', err));

      console.log(`💾 Saved to ${storageKey}:`, item.title);
      return updated;
    });
  };

  return (
    <RecentlyViewedContext.Provider value={{ recentlyViewed, addRecentlyViewed }}>
      {children}
    </RecentlyViewedContext.Provider>
  );
}

export function useRecentlyViewed() {
  return useContext(RecentlyViewedContext);
}