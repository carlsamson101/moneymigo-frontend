// @ts-nocheck
// 🚫 Suppress "Unexpected text node" spam on web (robust version)
if (typeof window !== "undefined") {
  const origError = console.error;
  setTimeout(() => {
    console.error = (...args) => {
      const msg = args?.[0];
      if (
        typeof msg === "string" &&
        (msg.includes("Unexpected text node") ||
         msg.includes("A text node cannot be a child of a <View>") ||
         msg.includes("Text strings must be rendered within a <Text> component"))
      ) {
        return; // ignore this spammy RN Web warning
      }
      origError(...args);
    };
  }, 0);
}


import { LogBox, Alert } from "react-native";
LogBox.ignoreLogs([
  "setLayoutAnimationEnabledExperimental is currently a no-op",
  "expo-notifications: Android Push notifications",
   "Unexpected text node",
  "Warning: Text strings must be rendered",
]);


import React, { useState, useEffect, useRef } from "react";
import NetInfo from "@react-native-community/netinfo";
import * as Notifications from "expo-notifications";
import { Platform, Dimensions } from "react-native";
import { Stack, useRouter } from "expo-router";
import { initOfflineSyncListener, syncOfflineChanges } from "../lib/offlineCache";
import SplashScreen from "./SplashScreen";
import { RecentlyViewedProvider } from "./RecentlyViewedContext";
import { useIdleLogout } from "./hooks/useIdleLogout";
import { getToken } from "../lib/auth"; // ✅ Import getToken


/* ✅ Global one-time flags that persist even after hot reload (Expo Web or Native) */
if (typeof globalThis.__offlineInit === "undefined") globalThis.__offlineInit = false;
if (typeof globalThis.__notificationsInit === "undefined") globalThis.__notificationsInit = false;


export default function RootLayout() {
  const [showSplash, setShowSplash] = useState(true);
  const [isAuthChecked, setIsAuthChecked] = useState(false); // ✅ Track auth check
  const router = useRouter();
  const mountedRef = useRef(true);


  if (Platform.OS === "web") {
    console.log("📵 Notifications disabled on web.");
  } else {
    // initialize expo notifications here
  }


  useIdleLogout();


  // 🕒 Hide splash after 2.8 seconds
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (mountedRef.current) setShowSplash(false);
    }, 2800);
    return () => clearTimeout(timeout);
  }, []);


  // ✅ CHECK AUTH STATUS AFTER SPLASH (prevents logout on refresh)
  useEffect(() => {
    if (!showSplash && !isAuthChecked) {
      checkAuthStatus();
    }
  }, [showSplash, isAuthChecked]);


  const checkAuthStatus = async () => {
    try {
      const user = await getToken();
     
      if (user) {
        // ✅ User is logged in
        console.log('✅ User authenticated:', user.firstName);
       
        // Check current path to avoid unnecessary navigation
        const currentPath = window.location?.pathname || '';
       
        // Only redirect if on login/register/root pages
        if (!currentPath ||
            currentPath === '/' ||
            currentPath === '/login' ||
            currentPath === '/register') {
          console.log('🔄 Redirecting authenticated user to main app');
          router.replace('/(tabs)');
        } else {
          // User is on a valid page, stay there (handles refresh)
          console.log('✅ User on valid page, staying at:', currentPath);
        }
      } else {
        // ❌ User is not logged in
        console.log('❌ No auth token found');
       
        const currentPath = window.location?.pathname || '';
       
        // Only redirect to login if not already on public routes
        if (currentPath !== '/login' && currentPath !== '/register') {
          console.log('🔄 Redirecting to login');
          router.replace('/login');
        }
      }
    } catch (error) {
      console.error('⚠️ Auth check error:', error);
      router.replace('/login');
    } finally {
      setIsAuthChecked(true);
    }
  };


  // 🌐 Initialize offline sync once globally
  useEffect(() => {
    if (globalThis.__offlineInit) return;
    globalThis.__offlineInit = true;


    console.log("✅ RootLayout: initializing offline listener once...");


    const setupOffline = async () => {
      try {
        initOfflineSyncListener();


        const net = await NetInfo.fetch();
        if (net.isConnected) {
          console.log("🌐 App started online — checking offline queue (one-time)");
          await syncOfflineChanges(true);
        }
      } catch (err) {
        console.error("⚠️ Offline setup error:", err);
      }
    };


    setupOffline();
  }, []);


  // 🔔 Setup notifications only once
  useEffect(() => {
    if (globalThis.__notificationsInit) return;
    globalThis.__notificationsInit = true;


    console.log("🔔 RootLayout: initializing notifications once...");
    let subscription: any = null;


    (async () => {
      try {
        let { status } = await Notifications.getPermissionsAsync();
        if (status !== "granted") {
          const { status: newStatus } = await Notifications.requestPermissionsAsync();
          status = newStatus;
        }


        if (status !== "granted") {
          Alert.alert(
            "Notifications Disabled",
            "Please enable notifications in your device settings to receive updates."
          );
        }


        // ✅ Unified notification handler (modern Expo SDK 54+)
        Notifications.setNotificationHandler({
          handleNotification: async () => ({
            shouldShowAlert: true,
            shouldPlaySound: true,
            shouldSetBadge: false,
            shouldShowBanner: true,
            shouldShowList: true,
          }),
        });


        subscription = Notifications.addNotificationResponseReceivedListener((response) => {
          const data = response.notification.request.content.data;
          if (data?.goalId) router.push(`/goals/${data.goalId}`);
        });
      } catch (err) {
        console.error("❌ Notification setup error:", err);
      }
    })();


    return () => {
      if (subscription) subscription.remove();
    };
  }, [router]);


  // 🧹 Cleanup ref
  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);


  // 💫 Splashscreen render
  if (showSplash && !globalThis.__splashNavigated) return <SplashScreen />;


  return (
    <RecentlyViewedProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </RecentlyViewedProvider>
  );
}

