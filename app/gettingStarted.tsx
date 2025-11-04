import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";

export default function GettingStartedScreen() {
  const handleBack = () => {
    router.push("/");
  };

  return (
    <View style={styles.container}>
      {/* 🔙 Back Button Header */}
      <View style={styles.headerBar}>
        <TouchableOpacity style={styles.backBtn} onPress={handleBack}>
          <Ionicons name="arrow-back" size={22} color="#1f4b81" />
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
          colors={["#1f4b81", "#7fb1d6"]}
          style={styles.optionGradient}
        >
          <Ionicons name="home-outline" size={38} color="#fff" />
        </LinearGradient>
        <Text style={styles.optionText}>Home Page Tutorial</Text>
        <Text style={styles.optionDesc}>Learn how to navigate your dashboard</Text>
      </TouchableOpacity>

      {/* Budget Page Tutorial */}
      <TouchableOpacity
        style={styles.optionCard}
        onPress={() => router.push("/budgetTutorial")}
      >
        <LinearGradient
          colors={["#1f4b81", "#7fb1d6"]}
          style={styles.optionGradient}
        >
          <Ionicons name="cash-outline" size={38} color="#fff" />
        </LinearGradient>
        <Text style={styles.optionText}>Budget Page Tutorial</Text>
        <Text style={styles.optionDesc}>Master your budget tracking tools</Text>
      </TouchableOpacity>

      <View style={styles.footerNote}>
        <Text style={styles.footerText}>
          💡 You can revisit these tutorials anytime from the Help button.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
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
    shadowColor: "#1f4b81",
    shadowOpacity: 0.1,
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
    color: "#1f4b81",
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#1f4b81",
  },

  mainTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: "#1f4b81",
    marginTop: 20,
    marginBottom: 8,
    textAlign: "center",
  },
  subTitle: {
    fontSize: 15,
    color: "#64748B",
    marginBottom: 32,
    textAlign: "center",
  },
  optionCard: {
    width: "100%",
    backgroundColor: "#fff",
    borderRadius: 18,
    paddingVertical: 22,
    paddingHorizontal: 20,
    alignItems: "center",
    marginBottom: 18,
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    shadowColor: "#1f4b81",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: {
      width: 0,
      height: 3,
    },
    elevation: 3,
  },
  optionGradient: {
    width: 75,
    height: 75,
    borderRadius: 37.5,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
    shadowColor: "#1f4b81",
    shadowOpacity: 0.3,
    shadowRadius: 6,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    elevation: 5,
  },
  optionText: {
    fontSize: 17,
    fontWeight: "700",
    color: "#1f4b81",
    marginBottom: 4,
  },
  optionDesc: {
    fontSize: 13,
    color: "#64748B",
    textAlign: "center",
  },
  footerNote: {
    position: "absolute",
    bottom: 40,
    alignItems: "center",
    width: "100%",
  },
  footerText: {
    fontSize: 13,
    color: "#94A3B8",
    textAlign: "center",
    maxWidth: 280,
    lineHeight: 18,
  },
});