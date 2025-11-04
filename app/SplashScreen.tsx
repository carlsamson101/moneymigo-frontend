// @ts-nocheck
import React, { useEffect, useRef } from "react";
import { View, Animated, StyleSheet, Text, Platform } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo from "@react-native-community/netinfo";
import api from "../lib/api";

// ✅ Prevent multiple navigations (web & hot reload safe)
if (typeof globalThis.__splashNavigated === "undefined")
  globalThis.__splashNavigated = false;

export default function SplashScreen() {
  const router = useRouter();

  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.85)).current;
  const taglineOpacity = useRef(new Animated.Value(0)).current;
  const taglineY = useRef(new Animated.Value(20)).current;
  const float = useRef(new Animated.Value(0)).current;
  const shimmer = useRef(new Animated.Value(0)).current;
  const fadeOut = useRef(new Animated.Value(1)).current;

  /* -------------------------------------------------------------------------- */
  /* ✅ AUTH CHECK — only runs ONCE per app session                             */
  /* -------------------------------------------------------------------------- */
  useEffect(() => {
   const checkAuth = async () => {
  if (globalThis.__splashNavigated) return;
  globalThis.__splashNavigated = true;

  try {
    const path = typeof window !== "undefined" ? window.location.pathname : "";

    // 🚫 Allow special pages to bypass this redirect
    if (
      path.startsWith("/AdminLoginPage") ||
      path.startsWith("/storeAuth") ||
      path.startsWith("/AdminHomePage") ||
      path.startsWith("/StoreDashboard")
    ) {
      console.log("🟡 Skipping user auth redirect for:", path);
      return;
    }

    const tokenData = await AsyncStorage.getItem("token");
    const expiry = await AsyncStorage.getItem("authExpiry");
    const net = await NetInfo.fetch();

    let nextRoute = "/login"; // default

    if (tokenData && expiry) {
      const now = new Date();
      const expiryDate = new Date(expiry);

      if (now < expiryDate) {
        if (net.isConnected) {
          try {
            await api.get("/auth/verify", {
              headers: { Authorization: `Bearer ${tokenData}` },
            });
            console.log("✅ Token verified online — go to tabs");
            nextRoute = "/(tabs)";
          } catch {
            console.log("❌ Invalid token — clearing");
            await AsyncStorage.multiRemove(["token", "authExpiry"]);
          }
        } else {
          console.log("📦 Offline mode — go to tabs");
          nextRoute = "/(tabs)";
        }
      } else {
        console.log("⏰ Token expired — go to login");
        await AsyncStorage.multiRemove(["token", "authExpiry"]);
      }
    } else {
      console.log("🔑 No token found — go to login");
    }

    // ⏳ Delay 3s before navigation (fade + route)
    Animated.timing(fadeOut, {
      toValue: 0,
      duration: 600,
      delay: 2500,
      useNativeDriver: true,
    }).start(() => router.replace(nextRoute));
  } catch (err) {
    console.error("⚠️ Auth check failed:", err);
    Animated.timing(fadeOut, {
      toValue: 0,
      duration: 600,
      delay: 2500,
      useNativeDriver: true,
    }).start(() => router.replace("/login"));
  }
};


    checkAuth();
  }, []);

  // ✅ Animation Setup
  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.spring(scale, {
          toValue: 1,
          tension: 45,
          friction: 6,
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.timing(taglineOpacity, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.spring(taglineY, {
          toValue: 0,
          tension: 40,
          friction: 7,
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    const floatAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(float, {
          toValue: 1,
          duration: 2500,
          useNativeDriver: true,
        }),
        Animated.timing(float, {
          toValue: 0,
          duration: 2500,
          useNativeDriver: true,
        }),
      ])
    );
    floatAnimation.start();

    const shimmerAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, {
          toValue: 1,
          duration: 3000,
          useNativeDriver: true,
        }),
        Animated.timing(shimmer, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ])
    );
    shimmerAnimation.start();

    return () => {
      floatAnimation.stop();
      shimmerAnimation.stop();
    };
  }, []);

  const floatY = float.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -10],
  });

  const shimmerX = shimmer.interpolate({
    inputRange: [0, 1],
    outputRange: [-300, 300],
  });

  return (
    <Animated.View style={[styles.container, { opacity: fadeOut }]}>
      <LinearGradient
        colors={['#1c5f93ff', '#1f4b81ff', '#7fb1d6ff']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      <Animated.View 
        style={[
          styles.shape1,
          { opacity: opacity.interpolate({ inputRange: [0, 1], outputRange: [0, 0.3] }) }
        ]} 
      />
      <Animated.View 
        style={[
          styles.shape2,
          { 
            opacity: opacity.interpolate({ inputRange: [0, 1], outputRange: [0, 0.25] }),
            transform: [{ translateY: floatY }]
          }
        ]} 
      />

      <Animated.View
        style={[
          styles.logoContainer,
          { opacity, transform: [{ scale }, { translateY: floatY }] }
        ]}
      >
        <Animated.View style={[styles.shimmer, { transform: [{ translateX: shimmerX }] }]} />
        <Animated.Image
          source={require('../assets/images/moneymigo-nobackg.png')}
          style={styles.logo}
          resizeMode="contain"
        />
      </Animated.View>

      <Animated.View
        style={[
          styles.textContainer,
          { opacity: taglineOpacity, transform: [{ translateY: taglineY }] }
        ]}
      >
        <View style={styles.taglineBox}>
          <Text style={styles.tagline}>Save Smarter. Live Better.</Text>
        </View>

        <View style={styles.brandBox}>
          <Text style={styles.brand}>You've got </Text>
          <View style={styles.accentBox}>
            <Text style={styles.brandAccent}>A Migo</Text>
          </View>
        </View>

        <View style={styles.featureRow}>
          <View style={styles.feature}>
            <Text style={styles.featureIcon}>💰</Text>
            <Text style={styles.featureText}>Track</Text>
          </View>
          <View style={styles.feature}>
            <Text style={styles.featureIcon}>📊</Text>
            <Text style={styles.featureText}>Analyze</Text>
          </View>
          <View style={styles.feature}>
            <Text style={styles.featureIcon}>🎯</Text>
            <Text style={styles.featureText}>Save</Text>
          </View>
        </View>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1f4b81ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shape1: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: '#ffffff',
    top: -100,
    right: -80,
  },
  shape2: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: '#fbbf24',
    bottom: -50,
    left: -60,
  },
  logoContainer: {
    position: 'relative',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 40,
    padding: 20,
    marginBottom: 40,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 15,
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  shimmer: {
    position: 'absolute',
    top: 0,
    left: -100,
    width: 100,
    height: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    transform: [{ skewX: '-20deg' }],
  },
  logo: {
    width: Platform.OS === 'web' ? 200 : 170,
    height: Platform.OS === 'web' ? 200 : 170,
  },
  textContainer: {
    alignItems: 'center',
    maxWidth: 340,
    paddingHorizontal: 20,
  },
  taglineBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 25,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  tagline: {
    fontSize: 19,
    color: '#ffffff',
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  brandBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  brand: {
    fontSize: 17,
    color: '#ffffff',
    fontWeight: '600',
  },
  accentBox: {
    backgroundColor: '#fbbf24',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  brandAccent: {
    color: '#065f46',
    fontWeight: '900',
    fontSize: 18,
    letterSpacing: 0.5,
  },
  featureRow: {
    flexDirection: 'row',
    gap: 20,
    marginTop: 8,
  },
  feature: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  featureIcon: {
    fontSize: 22,
    marginBottom: 4,
  },
  featureText: {
    fontSize: 11,
    color: '#ffffff',
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});