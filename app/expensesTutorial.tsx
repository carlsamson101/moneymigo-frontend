import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Dimensions,
  Modal,
  ScrollView,
  TextInput,
  Pressable,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

const EXPENSES_TUTORIAL_STEPS = [
  {
    id: 1,
    title: "Expenses Overview",
    description: "View your budget period, total transactions, and categories at a glance. Track your spending patterns with real-time updates.",
    icon: "pie-chart-outline",
    position: { top: SCREEN_HEIGHT * 0.25, left: 20, right: 20 },
    highlightArea: { 
      top: Platform.OS === "ios" ? 100 : 10, 
      left: 0, 
      right: 0, 
      height: 170 
    },
  },
  {
    id: 2,
    title: "Add Expense (FAB)",
    description: "Tap the + button to manually add a new expense. Let's see what happens when you tap it!",
    icon: "add-circle-outline",
    position: { top: SCREEN_HEIGHT * 0.3, left: 20, right: 20 },
    highlightArea: { 
      bottom: 15,
      left: SCREEN_WIDTH / 2 - 35,
      width: 70,
      height: 70 
    },
    showModal: true,
  },
  {
    id: 3,
    title: "Camera Scan (Mobile Browser Only)",
    description: "📱 Tap 'Scan Receipt' to use your camera. AI extracts amount, category, and date automatically!",
    icon: "camera-outline",
    position: { 
      bottom: 80, 
      left: 20, 
      right: 20 
    },
    highlightArea: { 
      top: SCREEN_HEIGHT * 0.35,
      left: 30,
      right: 30,
      height: 50 
    },
    showModal: true,
    highlightButton: "camera",
  },
  {
    id: 4,
    title: "Manual Entry",
    description: "Enter expense details manually: amount, category, notes, and date. Then tap Save.",
    icon: "create-outline",
    position: { 
      bottom: 80,
      left: 20, 
      right: 20
    },
    highlightArea: { 
      top: SCREEN_HEIGHT * 0.35,
      left: 30,
      right: 30,
      height: 300 
    },
    showModal: true,
  },
  {
    id: 5,
    title: "Voice Input (Mobile Browser Only)",
    description: "📱 On mobile browsers, tap the microphone button to add expenses by voice. Say: 'Add 500 for food groceries' and it will create the transaction automatically! This feature is NOT available on desktop.",
    icon: "mic-outline",
    position: { top: SCREEN_HEIGHT * 0.5, left: 20, right: 20 },
    highlightArea: { 
      bottom: 80, 
      right: 10,
      width: 60,
      height: 65 
    },
  },
  {
    id: 6,
    title: "Voice Conversation",
    description: "Ask your voice assistant: 'What's my budget left?', 'Who are you?', or 'Tell me something funny!' for helpful responses.",
    icon: "chatbubbles-outline",
    position: { bottom: SCREEN_HEIGHT * 0.2, left: 20, right: 20 },
   highlightArea: { 
      bottom: 80, 
      right: 10,
      width: 60,
      height: 65 
    },
  },
];

function TutorialOverlay({ visible, onClose }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [showAddModal, setShowAddModal] = useState(false);

  const handleNext = () => {
    if (currentStep === 1) {
      // After step 2, show the modal
      setShowAddModal(true);
      setCurrentStep(currentStep + 1);
    } else if (currentStep < EXPENSES_TUTORIAL_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      setShowAddModal(false);
      onClose();
    }
  };

  const handleSkip = () => {
    setShowAddModal(false);
    onClose();
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      // Hide modal if going back from step 3 to 2
      if (currentStep === 2) {
        setShowAddModal(false);
      }
    }
  };

  const step = EXPENSES_TUTORIAL_STEPS[currentStep];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
    >
      {/* ✅ Pressable to block background clicks */}
      <Pressable 
        style={styles.overlay}
        onPress={() => {}} // Blocks clicks from passing through
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          bounces={false}
          scrollEnabled={true}
        >
          {/* Dark overlay - now inside ScrollView */}
          <Pressable 
            style={styles.darkOverlay}
            onPress={() => {}} // Prevents clicks on overlay
          />

          {/* Show Add Transaction Modal for steps 3-4 */}
          {showAddModal && step.showModal && (
            <View style={styles.addModalContainer} pointerEvents="box-none">
              <View style={styles.addModalContent}>
                <Text style={styles.addModalTitle}>Transaction</Text>

                {/* Camera Scan Button - Highlighted for step 3 */}
                <TouchableOpacity
                  style={[
                    styles.scanButton,
                    step.highlightButton === "camera" && styles.highlightedButton
                  ]}
                  disabled
                >
                  <Text style={styles.scanButtonText}>📸 Scan Receipt</Text>
                </TouchableOpacity>

                <TextInput
                  placeholder="Amount"
                  value=""
                  editable={false}
                  style={styles.input}
                />

                <View style={[styles.input, { justifyContent: 'center' }]}>
                  <Text style={{ color: '#64748B' }}>Select Category</Text>
                </View>

                <TextInput
                  placeholder="Notes (optional)"
                  value=""
                  editable={false}
                  style={styles.input}
                />

                <View style={styles.dateSection}>
                  <Text style={styles.dateLabel}>Date</Text>
                  <View style={styles.dateInput}>
                    <Ionicons name="calendar-outline" size={18} color="#6366F1" />
                    <Text style={styles.dateText}>Select Date</Text>
                  </View>
                </View>

                <TouchableOpacity style={[styles.modalSubmitButton, styles.modalPrimaryBtn]} disabled>
                  <Text style={styles.submitText}>Save</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.modalSubmitButton, styles.modalOutlineBtn]} disabled>
                  <Text style={styles.outlineText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Highlight area (spotlight effect) */}
          {step.highlightArea && step.id !== 3 && step.id !== 4 && (
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
              pointerEvents="none"
            />
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
                width: step.position.width,
              },
            ]}
          >
            <LinearGradient
              colors={["#1F2937", "#374151"]}
              style={styles.cardGradient}
            >
              {/* Icon */}
              <View style={styles.iconContainer}>
                <Ionicons name={step.icon} size={32} color="#1f4b81" />
              </View>

              {/* Content */}
              <Text style={styles.tutorialTitle}>{step.title}</Text>
              <Text style={styles.tutorialDescription}>{step.description}</Text>

              {/* Progress dots */}
              <View style={styles.dotsContainer}>
                {EXPENSES_TUTORIAL_STEPS.map((_, index) => (
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
                    colors={["#1f4b81", "#1f4b81"]}
                    style={styles.primaryBtnGradient}
                  >
                    <Text style={styles.primaryBtnText}>
                      {currentStep === EXPENSES_TUTORIAL_STEPS.length - 1 ? "Got it!" : "Next"}
                    </Text>
                    <Ionicons name="arrow-forward" size={18} color="#fff" />
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </LinearGradient>
          </View>
        </ScrollView>
      </Pressable>
    </Modal>
  );
}

export default function ExpensesTutorialScreen() {
  const [showTutorial, setShowTutorial] = useState(true);

  const handleBack = () => {
    router.back();
  };

  return (
    <View style={styles.container}>
      {/* Gradient Header Section */}
      <LinearGradient
        colors={['#1f4b81ff', '#7fb1d6ff']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerContainer}
      >
        {/* Header Row with Back Button and Title */}
        <View style={styles.headerRow}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleBack}
            activeOpacity={0.8}
          >
            <Ionicons name="arrow-back" size={24} color="#ffffff" />
          </TouchableOpacity>
          <Text style={styles.mainHeading}>Expenses</Text>
        </View>
        <Text style={styles.subHeading}>
          Track and manage your spending habits
        </Text>

        {/* Budget Period Info */}
        <View style={styles.headerContent}>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>Weekly</Text>
              <Text style={styles.statLabel}>Budget Period</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>12</Text>
              <Text style={styles.statLabel}>Transactions</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>5</Text>
              <Text style={styles.statLabel}>Categories</Text>
            </View>
          </View>
        </View>

        {/* Wave Shape Bottom */}
        <View style={styles.waveContainer}>
          <View style={styles.wave} />
        </View>
      </LinearGradient>

      {/* Content Area */}
      <ScrollView style={styles.contentArea} scrollEnabled={!showTutorial}>
        <View style={styles.placeholder}>
          <Ionicons name="receipt-outline" size={60} color="#CBD5E1" />
          <Text style={styles.placeholderText}>Your expenses will appear here</Text>
        </View>
      </ScrollView>

      {/* FAB for Add Expense */}
      <TouchableOpacity style={styles.fab} disabled={showTutorial}>
        <LinearGradient
          colors={['#1f4b81ff', '#7fb1d6ff']}
          style={styles.fabGradient}
        >
          <Ionicons name="add" size={28} color="#fff" />
        </LinearGradient>
      </TouchableOpacity>

      {/* Microphone FAB Button */}
      <TouchableOpacity
        activeOpacity={0.8}
        style={styles.micFab}
        disabled={showTutorial}
      >
        <Ionicons name="mic" size={28} color="#fff" />
      </TouchableOpacity>

      {/* Voice Tip */}
      <View style={styles.voiceTip}>
        <Text style={styles.voiceTipText}>
          💡 Format: add + amount + category + note (optional)
        </Text>
      </View>

      {/* Tutorial Overlay */}
      <TutorialOverlay
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
  },
  
  // Header Styles
  headerContainer: {
    paddingTop: Platform.OS === "ios" ? 50 : 20,
    paddingBottom: 40,
    paddingHorizontal: 20,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  backButton: {
    padding: 8,
    marginRight: 12,
  },
  mainHeading: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#ffffff",
    flex: 1,
  },
  subHeading: {
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.9)",
    marginBottom: 20,
  },
  headerContent: {
    marginTop: 10,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statNumber: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#ffffff",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.8)",
    textAlign: "center",
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
  },
  waveContainer: {
    position: "absolute",
    bottom: -1,
    left: 0,
    right: 0,
    height: 30,
    overflow: "hidden",
  },
  wave: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 30,
    backgroundColor: "#F3F4F6",
    borderTopLeftRadius: 50,
    borderTopRightRadius: 50,
  },

  // Content Area
  contentArea: {
    flex: 1,
  },
  placeholder: {
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
    marginTop: 60,
  },
  placeholderText: {
    marginTop: 16,
    fontSize: 16,
    color: "#94A3B8",
  },

  // FAB Styles
  fab: {
    position: "absolute",
    bottom: 20,
    alignSelf: "center",
    width: 60,
    height: 60,
    borderRadius: 30,
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 8,
  },
  fabGradient: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  micFab: {
    position: "absolute",
    bottom: 90,
    right: 16,
    backgroundColor: "#1f4b81",
    borderRadius: 50,
    width: 45,
    height: 45,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 5,
  },
  voiceTip: {
    position: "absolute",
    bottom: 145,
    alignSelf: "center",
    backgroundColor: "rgba(31, 75, 129, 0.9)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    maxWidth: SCREEN_WIDTH - 40,
  },
  voiceTipText: {
    color: "white",
    fontSize: 12,
    textAlign: "center",
  },
  helpBtn: {
    position: "absolute",
    bottom: 160,
    left: 20,
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

  // Add Transaction Modal Styles
  addModalContainer: {
    position: "absolute",
    top: SCREEN_WIDTH < 768 ? SCREEN_HEIGHT * 0.15 : SCREEN_HEIGHT * 0.2,
    alignSelf: "center",
    zIndex: 5,
    maxHeight: SCREEN_HEIGHT * 0.7,
  },
  addModalContent: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    width: SCREEN_WIDTH < 768 ? SCREEN_WIDTH * 0.9 : SCREEN_WIDTH * 0.85,
    maxWidth: SCREEN_WIDTH < 768 ? SCREEN_WIDTH - 40 : 360,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 8,
  },
  addModalTitle: {
    fontWeight: "bold",
    fontSize: 18,
    marginBottom: 16,
    color: "#1F2937",
  },
  scanButton: {
    backgroundColor: "#2563EB",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    marginBottom: 12,
    width: "100%",
    alignItems: "center",
  },
  highlightedButton: {
    borderWidth: 3,
    borderColor: "#F59E0B",
    shadowColor: "#F59E0B",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 10,
    elevation: 10,
  },
  scanButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 15,
  },
  input: {
    width: "100%",
    backgroundColor: "#F8FAFC",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 12,
    marginBottom: 12,
    fontSize: 14,
  },
  dateSection: {
    width: "100%",
    marginBottom: 12,
  },
  dateLabel: {
    fontSize: 14,
    color: "#64748B",
    marginBottom: 6,
    fontWeight: "600",
  },
  dateInput: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 12,
    gap: 8,
  },
  dateText: {
    fontSize: 14,
    color: "#94A3B8",
  },
  modalSubmitButton: {
    width: "100%",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 8,
    marginBottom: 8,
  },
  modalPrimaryBtn: {
    backgroundColor: "#1f4b81",
  },
  modalOutlineBtn: {
    backgroundColor: "transparent",
    borderWidth: 2,
    borderColor: "#1f4b81",
  },
  submitText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 15,
  },
  outlineText: {
    color: "#1f4b81",
    fontWeight: "600",
    fontSize: 15,
  },

  // Tutorial Overlay Styles
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  scrollContent: {
    flexGrow: 1,
    minHeight: SCREEN_HEIGHT,
  },
  darkOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.15)",
    zIndex: 1,
  },
  highlightBox: {
    position: "absolute",
    backgroundColor: "transparent",
    borderWidth: 3,
    borderColor: "#1f4b81",
    borderRadius: 12,
    shadowColor: "#1f4b81",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 15,
    elevation: 10,
    zIndex: 2,
  },
  tutorialCard: {
    position: "absolute",
    borderRadius: 20,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 20,
    zIndex: 100,
  },
  cardGradient: {
    padding: 24,
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "rgba(31, 75, 129, 0.15)",
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
    backgroundColor: "#1f4b81",
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
});