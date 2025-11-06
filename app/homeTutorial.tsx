import React, { useState } from "react";
import { 
  Calendar, 
  PlusCircle, 
  RefreshCw, 
  Menu, 
  ArrowLeft, 
  ArrowRight, 
  HelpCircle, 
  ChevronDown, 
  ChevronLeft, 
  Wallet, 
  Receipt, 
  BarChart, 
  Edit, 
  Plus 
} from "lucide-react";

const SCREEN_WIDTH = typeof window !== 'undefined' ? window.innerWidth : 375;
const SCREEN_HEIGHT = typeof window !== 'undefined' ? window.innerHeight : 812;

// 🔥 FAB default position
const FAB_SIZE = 60;
const FAB_DEFAULT_X = SCREEN_WIDTH - FAB_SIZE * 0.4;
const FAB_DEFAULT_Y = SCREEN_HEIGHT / 2 - FAB_SIZE / 2;

const TUTORIAL_STEPS = [
  {
    id: 1,
    title: "Weekly Budget Period",
    description: "Your budget period is set to Weekly by default. Track your spending week by week for better control.",
    icon: Calendar,
    position: { top: 360, left: 30, right: 30 },
    highlightArea: { top: 235, left: 16, right: 16, height: 90 },
  },
  {
    id: 2,
    title: "Create Your First Budget",
    description: "Tap the + icon to create your first budget. It's quick and easy to get started!",
    icon: PlusCircle,
    position: { top: 180, left: 20, right: 20 },
    highlightArea: { top: 90, left: 16, width: (SCREEN_WIDTH - 32) * 0.66, height: 140 },
  },
  {
    id: 3,
    title: "Change Budget Period",
    description: "Need to switch to Daily or Monthly? Tap 'Weekly' button to adjust your timeframe anytime.",
    icon: RefreshCw,
    position: { top: 380, left: 20, right: 20 },
    highlightArea: { top: 284, right: 25, width: 100, height: 40 },
  },
  {
    id: 4,
    title: "Navigation Menu",
    description: "Access all features like Budget, Savings, and Reports. Tap the floating button to open the menu - you can even drag it anywhere on your screen!",
    icon: Menu,
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
function GettingStartedOverlay({ visible, onClose }) {
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

  if (!visible) return null;

  const step = TUTORIAL_STEPS[currentStep];
  const IconComponent = step.icon;

  return (
    <div style={styles.overlay}>
      {/* Dark overlay */}
      <div style={styles.darkOverlay} />

      {/* Highlight area (spotlight effect) */}
      {step.highlightArea && (
        <div
          style={{
            ...styles.highlightBox,
            top: step.highlightArea.top,
            left: step.highlightArea.left,
            right: step.highlightArea.right,
            bottom: step.highlightArea.bottom,
            width: step.highlightArea.width,
            height: step.highlightArea.height,
          }}
        />
      )}

      {/* Menu Preview for Navigation slide */}
      {step.showMenuPreview && (
        <div style={styles.menuPreview}>
          {/* Center FAB with cyan glow */}
          <div style={styles.previewFAB}>
            <div style={styles.previewFABGlow}>
              <div style={styles.previewFABInner}>
                <ChevronLeft size={28} color="#fff" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tutorial card */}
      <div
        style={{
          ...styles.tutorialCard,
          top: step.position.top,
          left: step.position.left,
          right: step.position.right,
          bottom: step.position.bottom,
        }}
      >
        <div style={styles.cardGradient}>
          {/* Icon */}
          <div style={styles.iconContainer}>
            <IconComponent size={32} color="#1f4b81" />
          </div>

          {/* Content */}
          <div style={styles.tutorialTitle}>{step.title}</div>
          <div style={styles.tutorialDescription}>{step.description}</div>

          {/* Progress dots */}
          <div style={styles.dotsContainer}>
            {TUTORIAL_STEPS.map((_, index) => (
              <div
                key={index}
                style={{
                  ...styles.dot,
                  ...(currentStep === index ? styles.activeDot : {}),
                }}
              />
            ))}
          </div>

          {/* Navigation buttons */}
          <div style={styles.buttonRow}>
            {currentStep > 0 && (
              <button
                style={styles.secondaryBtn}
                onClick={handlePrevious}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(156, 163, 175, 0.2)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(156, 163, 175, 0.1)'}
              >
                <ArrowLeft size={18} color="#9CA3AF" />
                <span style={styles.secondaryBtnText}>Back</span>
              </button>
            )}

            <button
              style={styles.skipBtn}
              onClick={handleSkip}
              onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'}
              onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}
            >
              <span style={styles.skipBtnText}>Skip</span>
            </button>

            <button
              style={styles.primaryBtn}
              onClick={handleNext}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
            >
              <div style={styles.primaryBtnGradient}>
                <span style={styles.primaryBtnText}>
                  {currentStep === TUTORIAL_STEPS.length - 1 ? "Got it!" : "Next"}
                </span>
                <ArrowRight size={18} color="#fff" />
              </div>
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% {
            box-shadow: 0 0 30px rgba(93, 123, 234, 0.6), inset 0 0 20px rgba(245, 158, 11, 0.1);
          }
          50% {
            box-shadow: 0 0 50px rgba(91, 157, 248, 0.9), inset 0 0 30px rgba(245, 158, 11, 0.2);
          }
        }
        
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </div>
  );
}

// Main Home Screen Component
export default function HomeScreen() {
  const [showTutorial, setShowTutorial] = useState(true);

  const handleBack = () => {
    // Works on both web and mobile
    if (typeof window !== 'undefined' && window.history.length > 1) {
      window.history.back();
    } else {
      // Fallback or custom navigation
      console.log('Navigate back to getting started');
    }
  };

  return (
    <div style={styles.container}>
      {/* 🔙 Back Button Header */}
      <div style={styles.headerBar}>
        <button 
          style={styles.backBtn} 
          onClick={handleBack}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#F3F4F6'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
        >
          <ArrowLeft size={22} color="#1E3A8A" />
          <span style={styles.backText}>Back</span>
        </button>
        <div style={styles.headerTitle}>Home</div>
        <div style={{ width: 50 }} />
      </div>
      
      {/* Your actual home screen content */}
      <div style={styles.homeContent}>
        {/* Header Section */}
        <div style={styles.headerSection}>
          <div style={styles.budgetCard}>
            <div style={styles.cardHeader}>
              <Wallet size={20} color="#1F2937" />
              <span style={styles.cardLabel}>Budget Left</span>
            </div>
            <div style={styles.budgetAmount}>₱0.00</div>
            <button style={styles.editBtn}>
              <Edit size={16} color="#3B82F6" />
              <span style={styles.editBtnText}>47h 51m to edit</span>
            </button>
            <button style={styles.addBtn}>
              <Plus size={24} color="#3B82F6" />
            </button>
          </div>

          <div style={styles.expensesCard}>
            <div style={styles.cardHeader}>
              <Receipt size={20} color="#1F2937" />
              <span style={styles.cardLabel}>Expenses</span>
            </div>
            <div style={styles.expensesAmount}>₱0.00</div>
          </div>
        </div>

        {/* Budget Period */}
        <div style={styles.periodSection}>
          <div style={styles.periodHeader}>
            <Calendar size={20} color="#1F2937" />
            <span style={styles.periodLabel}>Budget Period</span>
          </div>
          <div style={styles.periodContent}>
            <span style={styles.periodDate}>Nov 4, 2025 — Nov 11, 2025</span>
            <button style={styles.periodBtn}>
              <span style={styles.periodBtnText}>Weekly</span>
              <ChevronDown size={16} color="#3B82F6" />
            </button>
          </div>
        </div>

        {/* Budget Progress */}
        <div style={styles.progressSection}>
          <div style={styles.progressHeader}>
            <BarChart size={20} color="#1F2937" />
            <span style={styles.progressLabel}>Budget Progress</span>
            <span style={styles.progressPercent}>0%</span>
          </div>
          <div style={styles.progressBar}>
            <div style={{ ...styles.progressFill, width: '0%' }} />
          </div>
          <div style={styles.progressFooter}>
            <div>
              <div style={styles.progressFooterLabel}>SPENT</div>
              <div style={styles.progressFooterValue}>₱0.00</div>
            </div>
            <div style={styles.alignRight}>
              <div style={styles.progressFooterLabel}>BUDGET</div>
              <div style={styles.progressFooterValue}>₱0.00</div>
            </div>
          </div>
        </div>
      </div>

      {/* Tutorial Overlay */}
      <GettingStartedOverlay
        visible={showTutorial}
        onClose={() => setShowTutorial(false)}
      />

      {/* Help Button to show tutorial again */}
      {!showTutorial && (
        <button
          style={styles.helpBtn}
          onClick={() => setShowTutorial(true)}
          onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
          onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
        >
          <HelpCircle size={28} color="#3B82F6" />
        </button>
      )}
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    backgroundColor: '#F3F4F6',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  homeContent: {
    flex: 1,
    padding: 16,
    overflowY: 'auto',
  },
  headerSection: {
    display: 'flex',
    gap: 12,
    marginBottom: 16,
  },
  budgetCard: {
    flex: 2,
    backgroundColor: '#E0F2FE',
    borderRadius: 16,
    padding: 16,
    position: 'relative',
    minWidth: 0,
  },
  expensesCard: {
    flex: 1,
    backgroundColor: '#DBEAFE',
    borderRadius: 16,
    padding: 16,
    minWidth: 0,
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  cardLabel: {
    fontSize: 13,
    fontWeight: 600,
    color: '#1F2937',
  },
  budgetAmount: {
    fontSize: 28,
    fontWeight: 800,
    color: '#1E40AF',
    marginBottom: 8,
  },
  expensesAmount: {
    fontSize: 24,
    fontWeight: 800,
    color: '#1E40AF',
  },
  editBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#fff',
    padding: '6px 10px',
    borderRadius: 20,
    border: 'none',
    cursor: 'pointer',
    width: 'fit-content',
  },
  editBtnText: {
    fontSize: 11,
    fontWeight: 600,
    color: '#3B82F6',
  },
  addBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  periodSection: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  periodHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  periodLabel: {
    fontSize: 14,
    fontWeight: 600,
    color: '#1F2937',
  },
  periodContent: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  periodDate: {
    fontSize: 13,
    color: '#6B7280',
  },
  periodBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EFF6FF',
    padding: '6px 12px',
    borderRadius: 8,
    border: 'none',
    cursor: 'pointer',
  },
  periodBtnText: {
    fontSize: 13,
    fontWeight: 600,
    color: '#3B82F6',
  },
  progressSection: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
  },
  progressHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  progressLabel: {
    fontSize: 14,
    fontWeight: 600,
    color: '#1F2937',
    flex: 1,
  },
  progressPercent: {
    fontSize: 16,
    fontWeight: 700,
    color: '#3B82F6',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 12,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#3B82F6',
    borderRadius: 4,
    transition: 'width 0.3s ease',
  },
  progressFooter: {
    display: 'flex',
    justifyContent: 'space-between',
  },
  progressFooterLabel: {
    fontSize: 11,
    fontWeight: 600,
    color: '#9CA3AF',
    marginBottom: 4,
  },
  progressFooterValue: {
    fontSize: 14,
    fontWeight: 700,
    color: '#1F2937',
  },
  alignRight: {
    textAlign: 'right',
  },
  helpBtn: {
    position: 'fixed',
    bottom: 30,
    right: 20,
    backgroundColor: '#fff',
    width: 56,
    height: 56,
    borderRadius: 28,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: 'none',
    cursor: 'pointer',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
    transition: 'transform 0.2s ease',
  },
  headerBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 16px',
    backgroundColor: '#fff',
    borderBottom: '1px solid #E5E7EB',
  },
  backBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '8px 12px',
    borderRadius: 8,
    transition: 'background-color 0.2s ease',
  },
  backText: {
    fontSize: 15,
    fontWeight: 600,
    color: '#1E3A8A',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: 700,
    color: '#1F2937',
  },

  // Tutorial Overlay Styles
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 9999,
    animation: 'fadeIn 0.3s ease',
  },
  darkOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  highlightBox: {
    position: 'absolute',
    backgroundColor: 'transparent',
    border: '3px solid #1f4b81',
    borderRadius: 12,
    animation: 'pulse 2s ease-in-out infinite',
    pointerEvents: 'none',
  },
  tutorialCard: {
    position: 'absolute',
    margin: '0 20px',
    borderRadius: 20,
    overflow: 'hidden',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.4)',
    maxWidth: 500,
  },
  cardGradient: {
    background: 'linear-gradient(135deg, #1F2937 0%, #374151 100%)',
    padding: 24,
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  tutorialTitle: {
    fontSize: 20,
    fontWeight: 700,
    color: '#fff',
    marginBottom: 8,
  },
  tutorialDescription: {
    fontSize: 15,
    color: '#D1D5DB',
    lineHeight: '22px',
    marginBottom: 20,
  },
  dotsContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4B5563',
    transition: 'all 0.3s ease',
  },
  activeDot: {
    width: 24,
    backgroundColor: '#1f4b81',
  },
  buttonRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    flexWrap: 'wrap',
  },
  secondaryBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '10px 16px',
    borderRadius: 10,
    backgroundColor: 'rgba(156, 163, 175, 0.1)',
    border: 'none',
    cursor: 'pointer',
    transition: 'background-color 0.2s ease',
  },
  secondaryBtnText: {
    color: '#9CA3AF',
    fontSize: 15,
    fontWeight: 600,
  },
  skipBtn: {
    padding: '10px 16px',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
  },
  skipBtnText: {
    color: '#9CA3AF',
    fontSize: 15,
    fontWeight: 600,
  },
  primaryBtn: {
    flex: 1,
    minWidth: 120,
    borderRadius: 12,
    overflow: 'hidden',
    border: 'none',
    cursor: 'pointer',
    padding: 0,
    transition: 'transform 0.2s ease',
  },
  primaryBtnGradient: {
    background: 'linear-gradient(135deg, #1f4b81 0%, #1f4b81 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '14px 20px',
    gap: 8,
  },
  primaryBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 700,
  },
  menuPreview: {
    position: 'absolute',
    top: FAB_DEFAULT_Y - 200,
    right: SCREEN_WIDTH - FAB_DEFAULT_X - FAB_SIZE + 5,
    width: 80,
    height: 400,
    display: 'flex',
    alignItems: 'center',
  },
  previewFAB: {
    position: 'absolute',
    top: 200,
    right: 5,
    zIndex: 11,
  },
  previewFABGlow: {
    width: 50,
    height: 50,
    borderRadius: 25,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    boxShadow: '0 0 30px rgba(147, 232, 233, 0.8)',
    animation: 'pulse 2s ease-in-out infinite',
  },
  previewFABInner: {
    width: 44,
    height: 44,
    borderRadius: 22,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(147, 232, 233, 0.95)',
  },
};