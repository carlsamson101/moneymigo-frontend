import React, { useState } from "react";
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  Modal, 
  Dimensions,
  ScrollView 
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

const BUDGET_TUTORIAL_STEPS = [
  {
    id: 1,
    title: "Set Budget Allocation",
    subtitle: "Distribute Your Budget",
    description: "Tap \"Set Allocation\" to divide your total budget across different categories.",
    icon: "pie-chart-outline",
    position: { top: 140, left: 20, right: 20 },
    highlightArea: { top: 120, left: 10, right: 10, height: 60 },
    color: "#3B82F6",
  },
  {
    id: 2,
    title: "⚡ Important!",
    subtitle: "Total Must Equal 100%",
    description: "You can assign any percentage to each category, but make sure the total adds up to 100%. The app will help you track this!",
    icon: "alert-circle-outline",
    position: { top: 180, left: 20, right: 20 },
    highlightArea: { top: 340, left: 10, right: 10, height: 80 },
    color: "#F59E0B",
  },
  {
    id: 3,
    title: "📋 Unplanned Categories",
    subtitle: "Automatic Organization",
    description: "Didn't allocate a category? No problem! Unassigned categories are automatically marked as Unplanned so you can easily adjust them later.",
    icon: "folder-outline",
    position: { top: 200, left: 20, right: 20 },
    highlightArea: { top: 160, left: 10, right: 10, height: 100 },
    color: "#8B5CF6",
  },
  {
    id: 4,
    title: "🔄 Copy Previous Allocation",
    subtitle: "Save Time with Smart Copying",
    description: "If you've set a budget for the same period before, you'll see a \"Copy Allocation\" option. Use it to instantly reuse your previous setup.",
    icon: "copy-outline",
    position: { top: 240, left: 20, right: 20 },
    highlightArea: { top: 480, left: 10, width: 180, height: 50 },
    color: "#10B981",
  },
  {
    id: 5,
    title: "🤖 Smart Scaling",
    subtitle: "Automatic Adjustments",
    description: "The system automatically adjusts your allocations:\n\n→ If your new budget is larger, it scales up.\n→ If smaller, it scales down proportionally.",
    icon: "trending-up-outline",
    position: { top: 200, left: 20, right: 20 },
    highlightArea: { top: 480, left: 10, width: 180, height: 50 },
    color: "#EC4899",
  },
];

// Tutorial Overlay Component
function BudgetTutorialOverlay({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const [currentStep, setCurrentStep] = useState(0);

  const handleNext = () => {
    if (currentStep < BUDGET_TUTORIAL_STEPS.length - 1) {
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

  const step = BUDGET_TUTORIAL_STEPS[currentStep];

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
                borderColor: step.color,
                shadowColor: step.color,
              },
            ]}
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
            },
          ]}
        >
          <LinearGradient
            colors={["#1F2937", "#374151"]}
            style={styles.cardGradient}
          >
            {/* Icon */}
            <View style={[styles.iconContainer, { backgroundColor: `${step.color}20` }]}>
              <Ionicons name={step.icon as any} size={32} color={step.color} />
            </View>

            {/* Content */}
            <Text style={styles.tutorialTitle}>{step.title}</Text>
            <Text style={styles.tutorialSubtitle}>{step.subtitle}</Text>
            <Text style={styles.tutorialDescription}>{step.description}</Text>

            {/* Progress dots */}
            <View style={styles.dotsContainer}>
              {BUDGET_TUTORIAL_STEPS.map((_, index) => (
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
                  colors={[step.color, step.color]}
                  style={styles.primaryBtnGradient}
                >
                  <Text style={styles.primaryBtnText}>
                    {currentStep === BUDGET_TUTORIAL_STEPS.length - 1 ? "Got it!" : "Next"}
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

// Main Budget Tutorial Screen
export default function BudgetTutorialScreen() {
  const [showTutorial, setShowTutorial] = useState(true);

  return (
    <View style={styles.container}>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#1F2937" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Budget Page Tutorial</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Demo Budget Overview */}
        <View style={styles.demoSection}>
          <View style={styles.demoBudgetCard}>
            <View style={styles.demoCardHeader}>
              <Ionicons name="wallet-outline" size={20} color="#1F2937" />
              <Text style={styles.demoCardLabel}>Total Budget</Text>
            </View>
            <Text style={styles.demoBudgetAmount}>₱5,000.00</Text>
          </View>

          {/* Set Allocation Button */}
          <TouchableOpacity
            style={styles.setAllocationBtn}
            onPress={() => setShowTutorial(true)}
          >
            <LinearGradient
              colors={["#1f4b81ff", "#7fb1d6ff"]}
              style={styles.setAllocationGradient}
            >
              <Ionicons name="pie-chart-outline" size={20} color="#fff" />
              <Text style={styles.setAllocationText}>Set Allocation</Text>
            </LinearGradient>
          </TouchableOpacity>

          {/* Demo Categories */}
          <View style={styles.demoCategoriesContainer}>
            <View style={styles.demoCategoryCard}>
              <View style={styles.demoCategoryHeader}>
                <View style={[styles.demoCategoryIcon, { backgroundColor: "#DBEAFE" }]}>
                  <Ionicons name="restaurant" size={20} color="#3B82F6" />
                </View>
                <View style={styles.demoCategoryInfo}>
                  <Text style={styles.demoCategoryName}>Food</Text>
                  <Text style={styles.demoCategoryPercent}>30% • ₱1,500</Text>
                </View>
              </View>
            </View>

            <View style={styles.demoCategoryCard}>
              <View style={styles.demoCategoryHeader}>
                <View style={[styles.demoCategoryIcon, { backgroundColor: "#D1FAE5" }]}>
                  <Ionicons name="car" size={20} color="#10B981" />
                </View>
                <View style={styles.demoCategoryInfo}>
                  <Text style={styles.demoCategoryName}>Transport</Text>
                  <Text style={styles.demoCategoryPercent}>20% • ₱1,000</Text>
                </View>
              </View>
            </View>

            <View style={styles.demoCategoryCard}>
              <View style={styles.demoCategoryHeader}>
                <View style={[styles.demoCategoryIcon, { backgroundColor: "#FEF3C7" }]}>
                  <Ionicons name="flash" size={20} color="#F59E0B" />
                </View>
                <View style={styles.demoCategoryInfo}>
                  <Text style={styles.demoCategoryName}>Bills</Text>
                  <Text style={styles.demoCategoryPercent}>Unplanned</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Copy Last Period Button */}
          <TouchableOpacity style={styles.copyPeriodBtn}>
            <Ionicons name="copy-outline" size={18} color="#10B981" />
            <Text style={styles.copyPeriodText}>Copy Last Period</Text>
          </TouchableOpacity>
        </View>

        {/* Tutorial Info Cards */}
        <View style={styles.infoCardsSection}>
          <Text style={styles.infoSectionTitle}>What You'll Learn</Text>

          <View style={styles.infoCard}>
            <View style={[styles.infoIconCircle, { backgroundColor: "#DBEAFE" }]}>
              <Ionicons name="pie-chart-outline" size={24} color="#3B82F6" />
            </View>
            <View style={styles.infoCardContent}>
              <Text style={styles.infoCardTitle}>Budget Allocation</Text>
              <Text style={styles.infoCardDesc}>Learn how to distribute your budget across categories</Text>
            </View>
          </View>

          <View style={styles.infoCard}>
            <View style={[styles.infoIconCircle, { backgroundColor: "#FEF3C7" }]}>
              <Ionicons name="alert-circle-outline" size={24} color="#F59E0B" />
            </View>
            <View style={styles.infoCardContent}>
              <Text style={styles.infoCardTitle}>100% Rule</Text>
              <Text style={styles.infoCardDesc}>Understand why your allocations must total 100%</Text>
            </View>
          </View>

          <View style={styles.infoCard}>
            <View style={[styles.infoIconCircle, { backgroundColor: "#E9D5FF" }]}>
              <Ionicons name="folder-outline" size={24} color="#8B5CF6" />
            </View>
            <View style={styles.infoCardContent}>
              <Text style={styles.infoCardTitle}>Unplanned Categories</Text>
              <Text style={styles.infoCardDesc}>How the app handles unassigned categories</Text>
            </View>
          </View>

          <View style={styles.infoCard}>
            <View style={[styles.infoIconCircle, { backgroundColor: "#D1FAE5" }]}>
              <Ionicons name="copy-outline" size={24} color="#10B981" />
            </View>
            <View style={styles.infoCardContent}>
              <Text style={styles.infoCardTitle}>Smart Copying</Text>
              <Text style={styles.infoCardDesc}>Reuse previous allocations with automatic scaling</Text>
            </View>
          </View>
        </View>

        {/* Start Tutorial Button */}
        <TouchableOpacity
          style={styles.startTutorialBtn}
          onPress={() => setShowTutorial(true)}
        >
          <LinearGradient
            colors={["#3B82F6", "#2563EB"]}
            style={styles.startTutorialGradient}
          >
            <Ionicons name="play-circle" size={24} color="#fff" />
            <Text style={styles.startTutorialText}>Start Tutorial</Text>
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>

      {/* Tutorial Overlay */}
      <BudgetTutorialOverlay
        visible={showTutorial}
        onClose={() => {
          setShowTutorial(false);
          router.back();
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F3F4F6",
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2937",
  },
  demoSection: {
    padding: 16,
  },
  demoBudgetCard: {
    backgroundColor: "#E0F2FE",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  demoCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  demoCardLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1F2937",
  },
  demoBudgetAmount: {
    fontSize: 32,
    fontWeight: "800",
    color: "#1E40AF",
  },
  setAllocationBtn: {
    marginBottom: 16,
    borderRadius: 12,
    overflow: "hidden",
  },
  setAllocationGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    gap: 8,
  },
  setAllocationText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
  },
  demoCategoriesContainer: {
    gap: 12,
    marginBottom: 16,
  },
  demoCategoryCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
  },
  demoCategoryHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  demoCategoryIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  demoCategoryInfo: {
    flex: 1,
  },
  demoCategoryName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 4,
  },
  demoCategoryPercent: {
    fontSize: 14,
    color: "#6B7280",
  },
  copyPeriodBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#fff",
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#D1FAE5",
  },
  copyPeriodText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#10B981",
  },
  infoCardsSection: {
    padding: 16,
  },
  infoSectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 16,
  },
  infoCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  infoIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  infoCardContent: {
    flex: 1,
  },
  infoCardTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 4,
  },
  infoCardDesc: {
    fontSize: 14,
    color: "#6B7280",
    lineHeight: 20,
  },
  startTutorialBtn: {
    margin: 16,
    marginTop: 8,
    marginBottom: 32,
    borderRadius: 12,
    overflow: "hidden",
  },
  startTutorialGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    gap: 8,
  },
  startTutorialText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#fff",
  },

  // Tutorial Overlay Styles
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
  },
  darkOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
  },
  highlightBox: {
    position: "absolute",
    backgroundColor: "transparent",
    borderWidth: 3,
    borderRadius: 12,
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
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  tutorialTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 4,
  },
  tutorialSubtitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#D1D5DB",
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
});