// @ts-nocheck
import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  SafeAreaView,
  StatusBar,
  Platform,
  ActivityIndicator,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import api from "../lib/api"; // ✅ Make sure your baseURL points to your backend

const showAlert = (title, message) => {
  if (Platform.OS === "web") {
    window.alert(`${title}\n\n${message}`);
  } else {
    Alert.alert(title, message);
  }
};


export default function AdminLoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!username || !password) {
      return showAlert("Error", "Please enter both username and password.");
    }

    setLoading(true);
    try {
      // 🔐 Secure backend login
      const res = await api.post("/adminAuth/login", { username, password });
      const token = res.data.token;

      if (!token) {
        throw new Error("No token received");
      }

      // ✅ Save JWT token
      await AsyncStorage.setItem("adminToken", token);

      showAlert("✅ Success", "Welcome back, Admin!");
      router.replace("/AdminHomePage");
    } catch (err) {
      console.error("Admin login failed:", err.response?.data || err.message);
      showAlert(
        "Login Failed",
        err.response?.data?.message || "Invalid username or password."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#0D7C8A" />
      <LinearGradient
        colors={["#0D7C8A", "#16A9B8", "#4DD0E1"]}
        style={styles.loginContainer}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        {/* Background Decor */}
        <View style={styles.backgroundDecor}>
          <View style={styles.circle1} />
          <View style={styles.circle2} />
          <View style={styles.circle3} />
          <View style={styles.circle4} />
        </View>

        <ScrollView
          style={styles.loginScrollView}
          contentContainerStyle={styles.loginContent}
          showsVerticalScrollIndicator={false}
          bounces={true}
        >
          <View style={styles.loginHeader}>
            <View style={styles.logoContainer}>
              <View style={styles.logoCircle}>
                <Ionicons name="shield-checkmark" size={36} color="#16A9B8" />
              </View>
            </View>
            <Text style={styles.appTitle}>MoneyMigo Admin</Text>
            <Text style={styles.loginSubtitle}>Secure Admin Panel Access</Text>
          </View>

          <View style={styles.loginCard}>
            <View style={styles.inputContainer}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Username</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons
                    name="person-outline"
                    size={20}
                    color="#718096"
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="Enter username"
                    placeholderTextColor="#718096"
                    value={username}
                    onChangeText={setUsername}
                    autoCapitalize="none"
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Password</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons
                    name="lock-closed-outline"
                    size={20}
                    color="#718096"
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="Enter password"
                    placeholderTextColor="#718096"
                    secureTextEntry
                    value={password}
                    onChangeText={setPassword}
                  />
                </View>
              </View>

              <LinearGradient
                colors={["#16A9B8", "#0D7C8A"]}
                style={styles.loginButton}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <TouchableOpacity
                  onPress={handleLogin}
                  style={styles.buttonTouchable}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#ffffff" />
                  ) : (
                    <>
                      <Text style={styles.loginButtonText}>Sign In</Text>
                      <Ionicons name="arrow-forward" size={20} color="#ffffff" />
                    </>
                  )}
                </TouchableOpacity>
              </LinearGradient>
            </View>
          </View>

          <View style={styles.bottomInfo}>
            <Text style={styles.bottomText}>Secure • Admin • Management</Text>
          </View>
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
}

// ✅ Styles stay exactly the same
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#0D7C8A",
  },
  loginContainer: {
    flex: 1,
  },
  backgroundDecor: {
    position: "absolute",
    width: "100%",
    height: "100%",
    zIndex: 0,
  },
  circle1: {
    position: "absolute",
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    top: -80,
    right: -60,
  },
  circle2: {
    position: "absolute",
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: "rgba(164, 198, 57, 0.12)",
    bottom: 80,
    left: -40,
  },
  circle3: {
    position: "absolute",
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "rgba(247, 179, 43, 0.1)",
    top: 180,
    left: 40,
  },
  circle4: {
    position: "absolute",
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    top: 350,
    right: 50,
  },
  loginScrollView: {
    flex: 1,
    zIndex: 1,
  },
  loginContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 40,
  },
  loginHeader: {
    alignItems: "center",
    marginBottom: 32,
  },
  logoContainer: {
    marginBottom: 16,
  },
  logoCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 10,
  },
  appTitle: {
    fontSize: 34,
    fontWeight: "900",
    color: "white",
    marginBottom: 6,
    textAlign: "center",
    textShadowColor: "rgba(0, 0, 0, 0.15)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  loginSubtitle: {
    fontSize: 15,
    color: "rgba(255, 255, 255, 0.95)",
    textAlign: "center",
    fontWeight: "500",
  },
  loginCard: {
    backgroundColor: "rgba(255, 255, 255, 0.98)",
    borderRadius: 24,
    paddingVertical: 32,
    paddingHorizontal: 26,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 25,
    elevation: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.3)",
  },
  inputContainer: { gap: 20 },
  inputGroup: { gap: 10 },
  inputLabel: {
    fontSize: 15,
    fontWeight: "700",
    color: "#2D3748",
    marginLeft: 6,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F7FAFC",
    borderRadius: 14,
    paddingHorizontal: 18,
    borderWidth: 2,
    borderColor: "#E2E8F0",
  },
  inputIcon: { marginRight: 12 },
  input: {
    flex: 1,
    paddingVertical: 16,
    fontSize: 16,
    color: "#2D3748",
  },
  loginButton: {
    borderRadius: 14,
    marginTop: 12,
    shadowColor: "#16A9B8",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
  },
  buttonTouchable: {
    paddingVertical: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  loginButtonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  bottomInfo: {
    marginTop: 24,
    alignItems: "center",
    paddingBottom: 20,
  },
  bottomText: {
    fontSize: 13,
    color: "rgba(255, 255, 255, 0.9)",
    fontWeight: "600",
    letterSpacing: 1.2,
  },
});
