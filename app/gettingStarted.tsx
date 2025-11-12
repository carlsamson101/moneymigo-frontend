import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";

export default function GettingStartedScreen() {
  const handleBack = () => {
    router.push("/");
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.headerBar}>
        <TouchableOpacity style={styles.backBtn} onPress={handleBack}>
          <Ionicons name="arrow-back" size={24} color="#1f4b81" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Getting Started</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Section */}
        <View style={styles.heroSection}>
          <View style={styles.waveEmoji}>
            <Text style={styles.emojiText}>👋</Text>
          </View>
          <Text style={styles.mainTitle}>Welcome to MoneyMigo</Text>
          <Text style={styles.subTitle}>
            Choose which tutorial you want to explore first
          </Text>
        </View>

        {/* Tutorial Cards */}
        <View style={styles.cardsContainer}>
          {/* Home Tutorial */}
          <TouchableOpacity
            style={styles.optionCard}
            onPress={() => router.push("/homeTutorial")}
            activeOpacity={0.7}
          >
            <LinearGradient
              colors={["#1f4b81", "#7fb1d6"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.cardGradient}
            >
              <View style={styles.cardLeft}>
                <View style={styles.iconCircle}>
                  <Ionicons name="home-outline" size={28} color="#fff" />
                </View>
                <View style={styles.cardTextContent}>
                  <Text style={styles.cardTitle}>Home Page Tutorial</Text>
                  <Text style={styles.cardDesc}>Learn how to navigate your dashboard</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={22} color="rgba(255,255,255,0.9)" />
            </LinearGradient>
          </TouchableOpacity>

          {/* Budget Tutorial */}
          <TouchableOpacity
            style={styles.optionCard}
            onPress={() => router.push("/budgetTutorial")}
            activeOpacity={0.7}
          >
            <LinearGradient
              colors={["#1f4b81", "#7fb1d6"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.cardGradient}
            >
              <View style={styles.cardLeft}>
                <View style={styles.iconCircle}>
                  <Ionicons name="cash-outline" size={28} color="#fff" />
                </View>
                <View style={styles.cardTextContent}>
                  <Text style={styles.cardTitle}>Budget Page Tutorial</Text>
                  <Text style={styles.cardDesc}>Master your budget tracking tools</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={22} color="rgba(255,255,255,0.9)" />
            </LinearGradient>
          </TouchableOpacity>

          {/* Expenses Tutorial */}
          <TouchableOpacity
            style={styles.optionCard}
            onPress={() => router.push("/expensesTutorial")}
            activeOpacity={0.7}
          >
            <LinearGradient
              colors={["#1f4b81", "#7fb1d6"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.cardGradient}
            >
              <View style={styles.cardLeft}>
                <View style={styles.iconCircle}>
                  <Ionicons name="receipt-outline" size={28} color="#fff" />
                </View>
                <View style={styles.cardTextContent}>
                  <Text style={styles.cardTitle}>Expenses Page Tutorial</Text>
                  <Text style={styles.cardDesc}>Track and manage your spending</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={22} color="rgba(255,255,255,0.9)" />
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Info Banner */}
        <View style={styles.infoBanner}>
          <View style={styles.lightBulbIcon}>
            <Ionicons name="bulb-outline" size={20} color="#1f4b81" />
          </View>
          <Text style={styles.infoBannerText}>
            You can revisit these tutorials anytime from the Help button
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },

  /* Header */
  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#1f4b81",
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 20,
    backgroundColor: "#EFF6FF",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1f4b81",
    letterSpacing: 0.3,
  },

  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },

  /* Hero Section */
  heroSection: {
    alignItems: "center",
    paddingTop: 48,
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  waveEmoji: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
    shadowColor: "#1f4b81",
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
    borderWidth: 3,
    borderColor: "#EFF6FF",
  },
  emojiText: {
    fontSize: 48,
  },
  mainTitle: {
    fontSize: 32,
    fontWeight: "800",
    color: "#1f4b81",
    marginBottom: 12,
    textAlign: "center",
    letterSpacing: 0.5,
  },
  subTitle: {
    fontSize: 16,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 24,
    maxWidth: 280,
  },

  /* Cards Container */
  cardsContainer: {
    paddingHorizontal: 20,
    paddingTop: 36,
    gap: 16,
  },
  optionCard: {
    borderRadius: 20,
    overflow: "hidden",
    shadowColor: "#1f4b81",
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
    marginBottom: 4,
  },
  cardGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 20,
    paddingVertical: 22,
  },
  cardLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(255,255,255,0.25)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.3)",
  },
  cardTextContent: {
    flex: 1,
    paddingRight: 8,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 4,
    letterSpacing: 0.2,
  },
  cardDesc: {
    fontSize: 13,
    color: "rgba(255,255,255,0.95)",
    lineHeight: 18,
  },

  /* Info Banner */
  infoBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EFF6FF",
    marginHorizontal: 20,
    marginTop: 40,
    padding: 18,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "#DBEAFE",
    shadowColor: "#1f4b81",
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  lightBulbIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    borderWidth: 1.5,
    borderColor: "#DBEAFE",
  },
  infoBannerText: {
    flex: 1,
    fontSize: 14,
    color: "#1f4b81",
    lineHeight: 20,
    fontWeight: "500",
  },
});