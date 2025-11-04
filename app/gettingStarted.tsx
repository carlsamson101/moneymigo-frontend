import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";

export default function GettingStartedScreen() {
  const handleBack = () => {
    router.push("/"); // 👈 Navigates back to app/(tabs)/index.tsx
    // or router.back() if you just want to return to previous screen
  };

  return (
    <View style={styles.container}>
      {/* 🔙 Back Button Header */}
      <View style={styles.headerBar}>
        <TouchableOpacity style={styles.backBtn} onPress={handleBack}>
          <Ionicons name="arrow-back" size={22} color="#1E3A8A" />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Getting Started</Text>
        <View style={{ width: 50 }} />
      </View>

      <Text style={styles.mainTitle}>Welcome to MoneyMigo 👋</Text>
      <Text style={styles.subTitle}>
        Choose which tutorial you want to explore first.
      </Text>

      {/* Home Page Tutorial */}
      <TouchableOpacity
        style={styles.optionCard}
        onPress={() => router.push("/homeTutorial")}
      >
        <LinearGradient
          colors={["#3B82F6", "#2563EB"]}
          style={styles.optionGradient}
        >
          <Ionicons name="home-outline" size={38} color="#fff" />
        </LinearGradient>
        <Text style={styles.optionText}>Home Page Tutorial</Text>
      </TouchableOpacity>

      {/* Budget Page Tutorial */}
      <TouchableOpacity
        style={styles.optionCard}
        onPress={() => router.push("/budgetTutorial")}
      >
        <LinearGradient
          colors={["#10B981", "#059669"]}
          style={styles.optionGradient}
        >
          <Ionicons name="cash-outline" size={38} color="#fff" />
        </LinearGradient>
        <Text style={styles.optionText}>Budget Page Tutorial</Text>
      </TouchableOpacity>

      <View style={styles.footerNote}>
        <Text style={styles.footerText}>
          You can revisit these tutorials anytime from the Help button.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
    alignItems: "center",
    justifyContent: "flex-start",
    padding: 24,
  },

  /* 🧭 Header Bar */
  headerBar: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 10,
    paddingVertical: 14,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 10,
    elevation: 3,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 3,
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  backText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1E3A8A",
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#1F2937",
  },

  mainTitle: {
    fontSize: 26,
    fontWeight: "800",
    color: "#111827",
    marginTop: 20,
    marginBottom: 8,
    textAlign: "center",
  },
  subTitle: {
    fontSize: 15,
    color: "#6B7280",
    marginBottom: 28,
    textAlign: "center",
  },
  optionCard: {
    width: "100%",
    backgroundColor: "#fff",
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 16,
    alignItems: "center",
    marginBottom: 18,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  optionGradient: {
    width: 70,
    height: 70,
    borderRadius: 35,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  optionText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1F2937",
  },
  footerNote: {
    position: "absolute",
    bottom: 40,
    alignItems: "center",
    width: "100%",
  },
  footerText: {
    fontSize: 13,
    color: "#9CA3AF",
    textAlign: "center",
    maxWidth: 260,
  },
});
