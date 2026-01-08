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
      {/* Header with Gradient */}
      <LinearGradient
        colors={['#6B1C23', '#8B3A3A']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerGradient}
      >
        <View style={styles.headerBar}>
          <TouchableOpacity style={styles.backBtn} onPress={handleBack}>
            <Ionicons name="arrow-back" size={24} color="#F4B942" />
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Getting Started</Text>
          <View style={{ width: 70 }} />
        </View>
      </LinearGradient>


      <View style={styles.contentContainer}>
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
            colors={['#F4B942', '#C49A3C']}
            style={styles.optionGradient}
          >
            <Ionicons name="home-outline" size={38} color="#6B1C23" />
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
            colors={['#F4B942', '#C49A3C']}
            style={styles.optionGradient}
          >
            <Ionicons name="cash-outline" size={38} color="#6B1C23" />
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
    </View>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFF9F0",
  },


  /* Header Gradient */
  headerGradient: {
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    marginBottom: 20,
  },


  /* Header Bar */
  headerBar: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 6,
    borderRadius: 20,
    backgroundColor: "rgba(244, 185, 66, 0.15)",
  },
  backText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#F4B942",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#F4B942",
    letterSpacing: -0.5,
  },


  contentContainer: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 24,
  },


  mainTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: "#6B1C23",
    marginTop: 10,
    marginBottom: 8,
    textAlign: "center",
  },
  subTitle: {
    fontSize: 16,
    color: "#8B6B47",
    marginBottom: 32,
    textAlign: "center",
    lineHeight: 24,
  },


  optionCard: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    paddingVertical: 22,
    paddingHorizontal: 20,
    alignItems: "center",
    marginBottom: 18,
    borderWidth: 2,
    borderColor: "#F4B942",
    shadowColor: "#6B1C23",
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: {
      width: 0,
      height: 3,
    },
    elevation: 4,
  },


  optionGradient: {
    width: 75,
    height: 75,
    borderRadius: 37.5,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
    shadowColor: "#F4B942",
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
    color: "#6B1C23",
    marginBottom: 4,
  },


  optionDesc: {
    fontSize: 14,
    color: "#8B6B47",
    textAlign: "center",
    lineHeight: 20,
  },


  footerNote: {
    position: "absolute",
    bottom: 40,
    alignItems: "center",
    width: "100%",
  },


  footerText: {
    fontSize: 13,
    color: "#C49A3C",
    textAlign: "center",
    maxWidth: 280,
    lineHeight: 20,
  },
});

