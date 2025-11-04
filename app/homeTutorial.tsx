import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Modal, Dimensions } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

// 🔥 FAB default position (matches your _layout.tsx)
const FAB_SIZE = 60;
const FAB_DEFAULT_X = SCREEN_WIDTH - FAB_SIZE * 0.4;
const FAB_DEFAULT_Y = SCREEN_HEIGHT / 2 - FAB_SIZE / 2;

const TUTORIAL_STEPS = [
  {
    id: 1,
    title: "Weekly Budget Period",
    description: "Your budget period is set to Weekly by default. Track your spending week by week for better control.",
    icon: "calendar-outline",
    position: { top: 360, left: 30, right: 30 },
    highlightArea: { top: 235, left: 16, right: 16, height: 90 },
  },
  {
    id: 2,
    title: "Create Your First Budget",
    description: "Tap the + icon to create your first budget. It's quick and easy to get started!",
    icon: "add-circle-outline",
    position: { top: 180, left: 20, right: 20 },
    highlightArea: { top: 90, left: 16, width: (SCREEN_WIDTH - 32) * 0.66, height: 140 },
  },
  {
    id: 3,
    title: "Change Budget Period",
    description: "Need to switch to Daily or Monthly? Tap 'Weekly' button to adjust your timeframe anytime.",
    icon: "swap-horizontal-outline",
    position: { top: 380, left: 20, right: 20 },
    highlightArea: { top: 284, right: 25, width: 100, height: 40 },
  },
  {
    id: 4,
    title: "Navigation Menu",
    description: "Access all features like Budget, Savings, and Reports. Tap the floating button to open the menu - you can even drag it anywhere on your screen!",
    icon: "menu-outline",
    position: { bottom: 350, left: 20, right: 20 },
    highlightArea: { 
      top: FAB_DEFAULT_Y - 15, 
      right: SCREEN_WIDTH - FAB_DEFAULT_X - FAB_SIZE - 10, 
      width: FAB_SIZE + 20, 
      height: FAB_SIZE + 20 
    },
    showMenuPreview: true,
  },
];

// Tutorial Overlay Component
function GettingStartedOverlay({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const [currentStep, setCurrentStep] = useState(0);

  const handleNext = () => {
    if (currentStep < TUTORIAL_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onClose();
    }
  };

  const handleSkip = () => {
    onClose();
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const step = TUTORIAL_STEPS[currentStep];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        {/* Dark overlay */}
        <View style={styles.darkOverlay} />

        {/* Highlight area (spotlight effect) */}
        {step.highlightArea && (
          <View
            style={[
              styles.highlightBox,
              {
                top: step.highlightArea.top,
                left: step.highlightArea.left,
                right: step.highlightArea.right,
                bottom: step.highlightArea.bottom,
                width: step.highlightArea.width,
                height: step.highlightArea.height,
              },
            ]}
          />
        )}

         {/* Menu Preview for Navigation slide */}
        {step.showMenuPreview && (
          <View style={styles.menuPreview}>
           
            
            {/* Center FAB with cyan glow */}
            <View style={styles.previewFAB}>
              <View style={styles.previewFABGlow}>
                <View style={styles.previewFABInner}>
                  <Ionicons name="chevron-back" size={28} color="#fff" />
                </View>
              </View>
            </View>
          </View>
        )}

        {/* Tutorial card */}
        <View
          style={[
            styles.tutorialCard,
            {
              top: step.position.top,
              left: step.position.left,
              right: step.position.right,
              bottom: step.position.bottom,
            },
          ]}
        >
          <LinearGradient
            colors={["#1F2937", "#374151"]}
            style={styles.cardGradient}
          >
            {/* Icon */}
            <View style={styles.iconContainer}>
              <Ionicons name={step.icon as any} size={32} color="#F59E0B" />
            </View>

            {/* Content */}
            <Text style={styles.tutorialTitle}>{step.title}</Text>
            <Text style={styles.tutorialDescription}>{step.description}</Text>

            {/* Progress dots */}
            <View style={styles.dotsContainer}>
              {TUTORIAL_STEPS.map((_, index) => (
                <View
                  key={index}
                  style={[
                    styles.dot,
                    currentStep === index && styles.activeDot,
                  ]}
                />
              ))}
            </View>

            {/* Navigation buttons */}
            <View style={styles.buttonRow}>
              {currentStep > 0 && (
                <TouchableOpacity
                  style={styles.secondaryBtn}
                  onPress={handlePrevious}
                >
                  <Ionicons name="arrow-back" size={18} color="#9CA3AF" />
                  <Text style={styles.secondaryBtnText}>Back</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={styles.skipBtn}
                onPress={handleSkip}
              >
                <Text style={styles.skipBtnText}>Skip</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={handleNext}
              >
                <LinearGradient
                  colors={["#F59E0B", "#D97706"]}
                  style={styles.primaryBtnGradient}
                >
                  <Text style={styles.primaryBtnText}>
                    {currentStep === TUTORIAL_STEPS.length - 1 ? "Got it!" : "Next"}
                  </Text>
                  <Ionicons name="arrow-forward" size={18} color="#fff" />
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </View>
      </View>
    </Modal>
  );
}

// Main Home Screen Component
export default function HomeScreen() {
  const [showTutorial, setShowTutorial] = useState(true);

  const handleBack = () => {
    router.push("/gettingStarted");
  };

  return (
    <View style={styles.container}>
      {/* 🔙 Back Button Header */}
      <View style={styles.headerBar}>
        <TouchableOpacity style={styles.backBtn} onPress={handleBack}>
          <Ionicons name="arrow-back" size={22} color="#1E3A8A" />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Home</Text>
        <View style={{ width: 50 }} /> 
      </View>
      
      {/* Your actual home screen content */}
      <View style={styles.homeContent}>
        {/* Header Section */}
        <View style={styles.headerSection}>
          <View style={styles.budgetCard}>
            <View style={styles.cardHeader}>
              <Ionicons name="wallet-outline" size={20} color="#1F2937" />
              <Text style={styles.cardLabel}>Budget Left</Text>
            </View>
            <Text style={styles.budgetAmount}>₱0.00</Text>
            <TouchableOpacity style={styles.editBtn}>
              <Ionicons name="pencil-outline" size={16} color="#3B82F6" />
              <Text style={styles.editBtnText}>47h 51m to edit</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.addBtn}>
              <Ionicons name="add-circle" size={24} color="#3B82F6" />
            </TouchableOpacity>
          </View>

          <View style={styles.expensesCard}>
            <View style={styles.cardHeader}>
              <Ionicons name="receipt-outline" size={20} color="#1F2937" />
              <Text style={styles.cardLabel}>Expenses</Text>
            </View>
            <Text style={styles.expensesAmount}>₱0.00</Text>
          </View>
        </View>

        {/* Budget Period */}
        <View style={styles.periodSection}>
          <View style={styles.periodHeader}>
            <Ionicons name="calendar-outline" size={20} color="#1F2937" />
            <Text style={styles.periodLabel}>Budget Period</Text>
          </View>
          <View style={styles.periodContent}>
            <Text style={styles.periodDate}>Nov 4, 2025 — Nov 11, 2025</Text>
            <TouchableOpacity style={styles.periodBtn}>
              <Text style={styles.periodBtnText}>Weekly</Text>
              <Ionicons name="chevron-down" size={16} color="#3B82F6" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Budget Progress */}
        <View style={styles.progressSection}>
          <View style={styles.progressHeader}>
            <Ionicons name="bar-chart-outline" size={20} color="#1F2937" />
            <Text style={styles.progressLabel}>Budget Progress</Text>
            <Text style={styles.progressPercent}>0%</Text>
          </View>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: '0%' }]} />
          </View>
          <View style={styles.progressFooter}>
            <View>
              <Text style={styles.progressFooterLabel}>SPENT</Text>
              <Text style={styles.progressFooterValue}>₱0.00</Text>
            </View>
            <View style={styles.alignRight}>
              <Text style={styles.progressFooterLabel}>BUDGET</Text>
              <Text style={styles.progressFooterValue}>₱0.00</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Tutorial Overlay */}
      <GettingStartedOverlay
        visible={showTutorial}
        onClose={() => setShowTutorial(false)}
      />

      {/* Help Button to show tutorial again */}
      {!showTutorial && (
        <TouchableOpacity
          style={styles.helpBtn}
          onPress={() => setShowTutorial(true)}
        >
          <Ionicons name="help-circle" size={28} color="#3B82F6" />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F3F4F6",
    top: 20,
  },
  homeContent: {
    flex: 1,
    padding: 16,
  },
  headerSection: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  budgetCard: {
    flex: 2,
    backgroundColor: "#E0F2FE",
    borderRadius: 16,
    padding: 16,
    position: "relative",
  },
  expensesCard: {
    flex: 1,
    backgroundColor: "#DBEAFE",
    borderRadius: 16,
    padding: 16,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  cardLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1F2937",
  },
  budgetAmount: {
    fontSize: 28,
    fontWeight: "800",
    color: "#1E40AF",
    marginBottom: 8,
  },
  expensesAmount: {
    fontSize: 24,
    fontWeight: "800",
    color: "#1E40AF",
  },
  editBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#fff",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: "flex-start",
  },
  editBtnText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#3B82F6",
  },
  addBtn: {
    position: "absolute",
    top: 12,
    right: 12,
  },
  periodSection: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  periodHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 12,
  },
  periodLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
  },
  periodContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  periodDate: {
    fontSize: 13,
    color: "#6B7280",
  },
  periodBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  periodBtnText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#3B82F6",
  },
  progressSection: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
  },
  progressHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 12,
  },
  progressLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
    flex: 1,
  },
  progressPercent: {
    fontSize: 16,
    fontWeight: "700",
    color: "#3B82F6",
  },
  progressBar: {
    height: 8,
    backgroundColor: "#E5E7EB",
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: 12,
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#3B82F6",
    borderRadius: 4,
  },
  progressFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  progressFooterLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#9CA3AF",
    marginBottom: 4,
  },
  progressFooterValue: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1F2937",
  },
  alignRight: {
    alignItems: "flex-end",
  },
  helpBtn: {
    position: "absolute",
    bottom: 30,
    right: 20,
    backgroundColor: "#fff",
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },

  // Tutorial Overlay Styles
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  darkOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.3)",
  },
  highlightBox: {
    position: "absolute",
    backgroundColor: "transparent",
    borderWidth: 3,
    borderColor: "#F59E0B",
    borderRadius: 12,
    shadowColor: "#F59E0B",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 15,
    elevation: 10,
  },
  tutorialCard: {
    position: "absolute",
    marginHorizontal: 20,
    borderRadius: 20,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  cardGradient: {
    padding: 24,
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "rgba(245, 158, 11, 0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  tutorialTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 8,
  },
  tutorialDescription: {
    fontSize: 15,
    color: "#D1D5DB",
    lineHeight: 22,
    marginBottom: 20,
  },
  dotsContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#4B5563",
  },
  activeDot: {
    width: 24,
    backgroundColor: "#F59E0B",
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  secondaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: "rgba(156, 163, 175, 0.1)",
  },
  secondaryBtnText: {
    color: "#9CA3AF",
    fontSize: 15,
    fontWeight: "600",
  },
  skipBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  skipBtnText: {
    color: "#9CA3AF",
    fontSize: 15,
    fontWeight: "600",
  },
  primaryBtn: {
    flex: 1,
    borderRadius: 12,
    overflow: "hidden",
  },
  primaryBtnGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    gap: 8,
  },
  primaryBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
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
  menuPreview: {
    position: "absolute",
    top: FAB_DEFAULT_Y - 200,
    right: SCREEN_WIDTH - FAB_DEFAULT_X - FAB_SIZE + 5,
    width: 80,
    height: 400,
    alignItems: "center",
  },
  previewMenuItem: {
    position: "absolute",
    zIndex: 10,
    right: 0,
  },
  previewCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(17,24,39,0.95)",
    borderWidth: 2,
    borderColor: "#1f4b81ff",
  },
  previewLabel: {
    color: "#fff",
    fontSize: 8,
    fontWeight: "600",
    marginTop: 2,
  },
  previewFAB: {
    position: "absolute",
    top: 200,
    right: 5,
    zIndex: 11,
  },
  previewFABGlow: {
  width: 58,
  height: 58,
  borderRadius: 29,
  justifyContent: "center",
  alignItems: "center",
  backgroundColor: "rgba(22, 169, 184, 0.25)", // soft cyan aura
  shadowColor: "#16A9B8",
  shadowOpacity: 0.9,
  shadowRadius: 10,
  shadowOffset: { width: 0, height: 0 },
  elevation: 12, // Android glow
},
  previewFABGradient: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
  },
  previewFABInner: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(147,232,233,0.95)",
  },
});