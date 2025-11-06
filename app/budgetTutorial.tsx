import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Dimensions,
  Modal,
  Animated,
} from "react-native";
import { useRouter } from "expo-router";

// Cross-platform Lucide icon imports
let Calendar, PlusCircle, RefreshCw, Menu, ArrowLeft, ArrowRight, HelpCircle,
  ChevronDown, ChevronLeft, Wallet, Receipt, BarChart, Edit, Plus,
  PieChart, Copy, Hourglass, Settings, TrendingDown, CheckCircle;

if (Platform.OS === "web") {
  ({
    Calendar, PlusCircle, RefreshCw, Menu, ArrowLeft, ArrowRight, HelpCircle,
    ChevronDown, ChevronLeft, Wallet, Receipt, BarChart, Edit, Plus,
    PieChart, Copy, Hourglass, Settings, TrendingDown, CheckCircle
  } = require("lucide-react"));
} else {
  ({
    Calendar, PlusCircle, RefreshCw, Menu, ArrowLeft, ArrowRight, HelpCircle,
    ChevronDown, ChevronLeft, Wallet, Receipt, BarChart, Edit, Plus,
    PieChart, Copy, Hourglass, Settings, TrendingDown, CheckCircle
  } = require("lucide-react-native"));
}

const BUDGET_TUTORIAL_STEPS = [
  {
    id: 1,
    title: "Budget Overview",
    subtitle: "Your Financial Dashboard",
    description:
      "This section shows your total budget, expenses, and remaining amount at a glance. Track your spending progress with real-time updates on how much you've used and how much is left.",
    icon: PieChart,
    highlightKey: "budget-overview",
    color: "#1f4b81",
  },
  {
    id: 2,
    title: "Unallocated Budget",
    subtitle: "Track Unassigned Funds",
    description:
      "This pill shows how much of your budget hasn't been allocated to any category yet. Tap it to see which categories need allocation.",
    icon: Hourglass,
    highlightKey: "unallocated-pill",
    color: "#1f4b81",
  },
  {
    id: 3,
    title: "Set Allocation",
    subtitle: "Distribute Your Budget",
    description:
      'Tap "Set Allocation" to divide your total budget across different categories. Remember: allocations must total 100%!',
    icon: Settings,
    highlightKey: "set-allocation-btn",
    color: "#1f4b81",
  },
  {
    id: 4,
    title: "Clear All Allocations",
    subtitle: "Start Fresh",
    description:
      'Need to reset? The "Clear All" button removes all budget allocations so you can start over with a clean slate.',
    icon: RefreshCw,
    highlightKey: "clear-all-btn",
    color: "#1f4b81",
  },
  {
    id: 5,
    title: "Copy Last Period",
    subtitle: "Save Time with Smart Copying",
    description:
      'Already set a budget before? Use "Copy Last Period" to reuse your previous allocations. Smart Scaling: The system automatically adjusts your allocations → If your new budget is larger, it scales up. → If smaller, it scales down proportionally.',
    icon: Copy,
    highlightKey: "copy-period-btn",
    color: "#1f4b81",
  },
];

function TutorialOverlay({ visible, onClose, currentStep, setCurrentStep }) {
  const [fadeAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    if (visible) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  if (!visible) return null;

  const step = BUDGET_TUTORIAL_STEPS[currentStep];
  const Icon = step.icon;

  const handleNext = () => {
    if (currentStep < BUDGET_TUTORIAL_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onClose();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <Animated.View style={[styles.tutorialOverlay, { opacity: fadeAnim }]}>
        <TouchableOpacity
          style={styles.tutorialBackdrop}
          activeOpacity={1}
          onPress={onClose}
        />

        <View style={styles.tutorialCard}>
          <View style={styles.tutorialIconContainer}>
            <Icon size={32} color="#1f4b81" strokeWidth={2.5} />
          </View>

          <Text style={styles.tutorialTitle}>{step.title}</Text>
          <Text style={styles.tutorialSubtitle}>{step.subtitle}</Text>
          <Text style={styles.tutorialDescription}>{step.description}</Text>

          <View style={styles.tutorialDots}>
            {BUDGET_TUTORIAL_STEPS.map((_, i) => (
              <View
                key={i}
                style={[
                  styles.tutorialDot,
                  currentStep === i && styles.tutorialDotActive,
                ]}
              />
            ))}
          </View>

          <Text style={styles.tutorialStepText}>
            Step {currentStep + 1} of {BUDGET_TUTORIAL_STEPS.length}
          </Text>

          <View style={styles.tutorialButtons}>
            {currentStep > 0 ? (
              <TouchableOpacity
                onPress={handlePrevious}
                style={styles.tutorialBackBtn}
              >
                <ArrowLeft size={18} color="#6B7280" />
                <Text style={styles.tutorialBackText}>Back</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.tutorialSpacer} />
            )}

            <TouchableOpacity onPress={onClose}>
              <Text style={styles.tutorialSkipText}>Skip</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleNext}
              style={styles.tutorialNextBtn}
            >
              <Text style={styles.tutorialNextText}>
                {currentStep === BUDGET_TUTORIAL_STEPS.length - 1
                  ? "Got it!"
                  : "Next"}
              </Text>
              <ArrowRight size={18} color="white" />
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>
    </Modal>
  );
}

export default function BudgetTutorialScreen() {
  const router = useRouter();
  const [showTutorial, setShowTutorial] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  const handleBack = () => {
    router.back();
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <ArrowLeft size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Budget Tutorial</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Scrollable Content */}
      <ScrollView style={styles.scrollView}>
        {/* Budget Overview */}
        <View style={[styles.budgetOverview, styles.gradientBg]}>
          <View style={styles.overviewHeader}>
            <Text style={styles.overviewTitle}>Budget Overview</Text>
            <View style={styles.datePill}>
              <Calendar size={14} color="white" />
              <Text style={styles.datePillText}>Weekly • Nov 4 - Nov 11</Text>
            </View>
          </View>

          <View style={styles.statsGrid}>
            {[
              { icon: Wallet, label: "TOTAL BUDGET", amount: "₱5,000", sub: "0% used" },
              { icon: TrendingDown, label: "EXPENSES", amount: "₱0", sub: "" },
              { icon: CheckCircle, label: "REMAINING", amount: "₱5,000", sub: "100% left" },
            ].map((item, i) => {
              const Icon = item.icon;
              return (
                <View key={i} style={styles.statCard}>
                  <View style={styles.statIconContainer}>
                    <Icon size={24} color="white" />
                  </View>
                  <View style={styles.statInfo}>
                    <Text style={styles.statLabel}>{item.label}</Text>
                    <Text style={styles.statAmount}>{item.amount}</Text>
                    {item.sub ? (
                      <Text style={styles.statSub}>{item.sub}</Text>
                    ) : null}
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        {/* Unallocated */}
        <View style={styles.unallocatedContainer}>
          <View style={styles.unallocatedPill}>
            <Hourglass size={20} color="white" />
            <Text style={styles.unallocatedText}>Unallocated ₱5,000</Text>
          </View>
        </View>

        {/* Action Buttons Section */}
        <View style={styles.actionsContainer}>
          <View style={styles.actionsInner}>
            <TouchableOpacity style={[styles.actionButton, styles.setPrimary]}>
              <Settings size={24} color="white" />
              <Text style={styles.actionButtonText}>Set Allocation</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.actionButton, styles.clearSecondary]}>
              <RefreshCw size={24} color="#1f4b81" />
              <Text style={styles.actionButtonSecondaryText}>Clear All</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.actionButton, styles.copySecondary]}>
              <Copy size={24} color="#1f4b81" />
              <Text style={styles.actionButtonSecondaryText}>
                Copy Last Period
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Floating Help Button */}
      <TouchableOpacity
        style={styles.helpButton}
        onPress={() => {
          setShowTutorial(true);
          setCurrentStep(0);
        }}
      >
        <Text style={styles.helpButtonText}>?</Text>
      </TouchableOpacity>

      {/* Tutorial Overlay */}
      <TutorialOverlay
        visible={showTutorial}
        onClose={() => setShowTutorial(false)}
        currentStep={currentStep}
        setCurrentStep={setCurrentStep}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f3f4f6",
  },
  header: {
    backgroundColor: "#1f4b81",
    paddingTop: Platform.OS === "ios" ? 50 : 20,
    paddingBottom: 16,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "white",
  },
  headerSpacer: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  budgetOverview: {
    padding: 32,
  },
  gradientBg: {
    backgroundColor: "#1f4b81",
  },
  overviewHeader: {
    marginBottom: 16,
  },
  overviewTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "white",
    marginBottom: 12,
  },
  datePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
    alignSelf: "flex-start",
  },
  datePillText: {
    fontSize: 14,
    fontWeight: "600",
    color: "white",
  },
  statsGrid: {
    gap: 16,
    marginTop: 24,
  },
  statCard: {
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    borderRadius: 12,
    padding: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  statIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  statInfo: {
    flex: 1,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "rgba(255, 255, 255, 0.9)",
    marginBottom: 4,
  },
  statAmount: {
    fontSize: 28,
    fontWeight: "bold",
    color: "white",
  },
  statSub: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.8)",
    marginTop: 2,
  },
  unallocatedContainer: {
    backgroundColor: "white",
    padding: 20,
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  unallocatedPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#1f4b81",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    shadowColor: "#1f4b81",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 4,
  },
  unallocatedText: {
    color: "white",
    fontWeight: "600",
    fontSize: 16,
  },
  actionsContainer: {
    padding: 32,
    backgroundColor: "white",
    minHeight: 400,
  },
  actionsInner: {
    maxWidth: 448,
    marginHorizontal: "auto",
    gap: 16,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  setPrimary: {
    backgroundColor: "#1f4b81",
  },
  clearSecondary: {
    backgroundColor: "white",
    borderWidth: 2,
    borderColor: "#1f4b81",
  },
  copySecondary: {
    backgroundColor: "white",
    borderWidth: 2,
    borderColor: "#1f4b81",
  },
  actionButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "700",
  },
  actionButtonSecondaryText: {
    color: "#1f4b81",
    fontSize: 16,
    fontWeight: "700",
  },
  helpButton: {
    position: "absolute",
    bottom: 30,
    right: 30,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#1f4b81",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#1f4b81",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 2,
    borderColor: "#7fb1d6",
  },
  helpButtonText: {
    color: "white",
    fontSize: 32,
    fontWeight: "bold",
  },
  tutorialOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  tutorialBackdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  tutorialCard: {
    backgroundColor: "white",
    borderRadius: 20,
    padding: 24,
    maxWidth: 480,
    width: "100%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.3,
    shadowRadius: 40,
    elevation: 10,
  },
  tutorialIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 24,
    backgroundColor: "rgba(31, 75, 129, 0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    borderWidth: 2,
    borderColor: "rgba(127, 177, 214, 0.4)",
  },
  tutorialTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#1F2937",
    marginBottom: 4,
  },
  tutorialSubtitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1f4b81",
    marginBottom: 8,
  },
  tutorialDescription: {
    color: "#6B7280",
    lineHeight: 24,
    fontSize: 16,
    marginBottom: 20,
  },
  tutorialDots: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
  },
  tutorialDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#E5E7EB",
  },
  tutorialDotActive: {
    width: 24,
    backgroundColor: "#1f4b81",
  },
  tutorialStepText: {
    textAlign: "center",
    fontSize: 14,
    fontWeight: "700",
    color: "#6B7280",
    marginBottom: 16,
  },
  tutorialButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  tutorialBackBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  tutorialBackText: {
    color: "#6B7280",
    fontWeight: "700",
  },
  tutorialSkipText: {
    color: "#6B7280",
    fontWeight: "700",
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  tutorialNextBtn: {
    flex: 1,
    maxWidth: 200,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: "#1f4b81",
    shadowColor: "#1f4b81",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 6,
  },
  tutorialNextText: {
    color: "white",
    fontWeight: "800",
    fontSize: 16,
  },
  tutorialSpacer: {
    width: 80,
  },
});