import React, { useState, useEffect } from "react";

// Dynamic import for Lucide icons based on platform
let Wallet: any, 
    TrendingDown: any, 
    CheckCircle: any, 
    Calendar: any, 
    PieChart: any, 
    RefreshCw: any, 
    Copy: any, 
    Hourglass: any, 
    Settings: any, 
    ArrowLeft: any, 
    ArrowRight: any, 
    PlayCircle: any;

try {
  // Try React Native first (for mobile)
  const ReactNative = require("react-native");
  if (ReactNative.Platform && ReactNative.Platform.OS !== "web") {
    const LucideNative = require("lucide-react-native");
    ({ Wallet, TrendingDown, CheckCircle, Calendar, PieChart, RefreshCw, Copy, Hourglass, Settings, ArrowLeft, ArrowRight, PlayCircle } = LucideNative);
  } else {
    // Fallback to web version
    const LucideWeb = require("lucide-react");
    ({ Wallet, TrendingDown, CheckCircle, Calendar, PieChart, RefreshCw, Copy, Hourglass, Settings, ArrowLeft, ArrowRight, PlayCircle } = LucideWeb);
  }
} catch (e) {
  // If React Native is not available, use web version
  const LucideWeb = require("lucide-react");
  ({ Wallet, TrendingDown, CheckCircle, Calendar, PieChart, RefreshCw, Copy, Hourglass, Settings, ArrowLeft, ArrowRight, PlayCircle } = LucideWeb);
}

const BUDGET_TUTORIAL_STEPS = [
  {
    id: 1,
    title: "Budget Overview",
    subtitle: "Your Financial Dashboard",
    description:
      "This section shows your total budget, expenses, and remaining amount at a glance. Track your spending progress with real-time updates on how much you've used and how much is left.",
    icon: PieChart,
    highlightSelector: ".budget-overview",
    color: "#1f4b81",
    cardPosition: { bottom: "20px" },
  },
  {
    id: 2,
    title: "Unallocated Budget",
    subtitle: "Track Unassigned Funds",
    description:
      "This pill shows how much of your budget hasn't been allocated to any category yet. Tap it to see which categories need allocation.",
    icon: Hourglass,
    highlightSelector: ".unallocated-pill",
    color: "#1f4b81",
    cardPosition: { bottom: "20px" },
  },
  {
    id: 3,
    title: "Set Allocation",
    subtitle: "Distribute Your Budget",
    description:
      'Tap "Set Allocation" to divide your total budget across different categories. Remember: allocations must total 100%!',
    icon: Settings,
    highlightSelector: ".set-allocation-btn",
    color: "#1f4b81",
    cardPosition: { top: "100px" },
  },
  {
    id: 4,
    title: "Clear All Allocations",
    subtitle: "Start Fresh",
    description:
      'Need to reset? The "Clear All" button removes all budget allocations so you can start over with a clean slate.',
    icon: RefreshCw,
    highlightSelector: ".clear-all-btn",
    color: "#1f4b81",
    cardPosition: { top: "100px" },
  },
  {
    id: 5,
    title: "Copy Last Period",
    subtitle: "Save Time with Smart Copying",
    description:
      'Already set a budget before? Use "Copy Last Period" to reuse your previous allocations. Smart Scaling: The system automatically adjusts your allocations → If your new budget is larger, it scales up. → If smaller, it scales down proportionally.',
    icon: Copy,
    highlightSelector: ".copy-period-btn",
    color: "#1f4b81",
    cardPosition: { top: "100px" },
  },
];

function TutorialOverlay({ visible, onClose, currentStep, setCurrentStep }) {
  const [highlightRect, setHighlightRect] = useState(null);
  const [pulseAnimation, setPulseAnimation] = useState(0);

  useEffect(() => {
    if (!visible) return;
    const step = BUDGET_TUTORIAL_STEPS[currentStep];
    const updateHighlight = () => {
      const el = document.querySelector(step.highlightSelector);
      if (el) {
        const rect = el.getBoundingClientRect();
        setHighlightRect({
          top: rect.top + window.scrollY,
          left: rect.left + window.scrollX,
          width: rect.width,
          height: rect.height,
        });
      }
    };
    updateHighlight();
    window.addEventListener("resize", updateHighlight);
    window.addEventListener("scroll", updateHighlight);
    return () => {
      window.removeEventListener("resize", updateHighlight);
      window.removeEventListener("scroll", updateHighlight);
    };
  }, [visible, currentStep]);

  useEffect(() => {
    if (!visible) return;
    const interval = setInterval(() => {
      setPulseAnimation((prev) => (prev + 1) % 100);
    }, 50);
    return () => clearInterval(interval);
  }, [visible]);

  if (!visible) return null;

  const step = BUDGET_TUTORIAL_STEPS[currentStep];
  const Icon = step.icon;
  const pulseScale = 1 + Math.sin(pulseAnimation / 10) * 0.02;

  const handleNext = () => {
    if (currentStep < BUDGET_TUTORIAL_STEPS.length - 1) setCurrentStep(currentStep + 1);
    else onClose();
  };

  const handlePrevious = () => {
    if (currentStep > 0) setCurrentStep(currentStep - 1);
  };

  const hole = highlightRect || { top: 0, left: 0, width: 0, height: 0 };
  const holeRight = hole.left + hole.width;
  const holeBottom = hole.top + hole.height;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        transition: "all 0.2s ease",
        pointerEvents: "auto",
      }}
      aria-hidden={!visible}
    >
      <style>{`
        @keyframes ping {
          75%, 100% {
            transform: scale(1.15);
            opacity: 0;
          }
        }
      `}</style>

      {highlightRect && (
        <>
          <div
            onClick={onClose}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: hole.top,
              backgroundColor: "rgba(31, 75, 129, 0.65)",
              backdropFilter: "blur(2px)",
            }}
          />
          <div
            onClick={onClose}
            style={{
              position: "absolute",
              top: hole.top,
              left: 0,
              width: hole.left,
              height: hole.height,
              backgroundColor: "rgba(31, 75, 129, 0.65)",
              backdropFilter: "blur(2px)",
            }}
          />
          <div
            onClick={onClose}
            style={{
              position: "absolute",
              top: hole.top,
              left: holeRight,
              right: 0,
              height: hole.height,
              backgroundColor: "rgba(31, 75, 129, 0.65)",
              backdropFilter: "blur(2px)",
            }}
          />
          <div
            onClick={onClose}
            style={{
              position: "absolute",
              top: holeBottom,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "rgba(31, 75, 129, 0.65)",
              backdropFilter: "blur(2px)",
            }}
          />

          <div
            style={{
              position: "absolute",
              top: `${hole.top - 10}px`,
              left: `${hole.left - 10}px`,
              width: `${hole.width + 20}px`,
              height: `${hole.height + 20}px`,
              borderRadius: "16px",
              border: `3px solid #7fb1d6`,
              boxShadow: `
                0 0 0 2px rgba(255,255,255,0.9) inset,
                0 0 20px #7fb1d6CC,
                0 0 50px #7fb1d6AA
              `,
              transition: "transform 0.25s ease",
              transform: `scale(${pulseScale})`,
              pointerEvents: "none",
            }}
          />
        </>
      )}

      <div
        style={{
          position: "absolute",
          left: "1rem",
          right: "1rem",
          maxWidth: "30rem",
          margin: "0 auto",
          ...step.cardPosition,
          transition: "all 0.25s ease",
          zIndex: 10000,
        }}
      >
        <div
          style={{
            background: "linear-gradient(135deg, #ffffff 0%, #f8fafb 100%)",
            borderRadius: "20px",
            padding: "1.5rem",
            boxShadow: "0 20px 40px rgba(31, 75, 129, 0.25), 0 0 0 1px rgba(31, 75, 129, 0.1)",
            border: "2px solid #E8F1F8",
          }}
        >
          <div
            style={{
              position: "relative",
              width: "4rem",
              height: "4rem",
              borderRadius: "1.5rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: `linear-gradient(135deg, rgba(31, 75, 129, 0.1) 0%, rgba(127, 177, 214, 0.15) 100%)`,
              marginBottom: "0.9rem",
              boxShadow: `0 0 24px rgba(127, 177, 214, 0.3)`,
              border: `2px solid rgba(127, 177, 214, 0.4)`,
            }}
          >
            <Icon size={32} color="#1f4b81" strokeWidth={2.5} />
            <div
              style={{
                position: "absolute",
                inset: -3,
                borderRadius: "1.5rem",
                border: `2px solid #7fb1d6`,
                opacity: 0.3,
                animation: "ping 2s cubic-bezier(0, 0, 0.2, 1) infinite",
              }}
            />
          </div>

          <h3
            style={{
              fontSize: "1.3rem",
              fontWeight: 800,
              color: "#1f4b81",
              marginBottom: "0.3rem",
              letterSpacing: "-0.01em",
            }}
          >
            {step.title}
          </h3>
          <p
            style={{
              fontSize: "0.98rem",
              fontWeight: 700,
              color: "#7fb1d6",
              marginBottom: "0.5rem",
            }}
          >
            {step.subtitle}
          </p>
          <p
            style={{
              color: "#64748B",
              lineHeight: 1.7,
              fontSize: "0.98rem",
              marginBottom: "1.1rem",
            }}
          >
            {step.description}
          </p>

          <div
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              gap: "0.45rem",
              marginBottom: "1rem",
            }}
          >
            {BUDGET_TUTORIAL_STEPS.map((_, i) => (
              <div
                key={i}
                style={{
                  width: currentStep === i ? "1.6rem" : "0.45rem",
                  height: "0.45rem",
                  borderRadius: "9999px",
                  backgroundColor: currentStep === i ? "#1f4b81" : "#E8F1F8",
                  transition: "all 0.25s ease",
                  boxShadow: currentStep === i ? `0 0 10px rgba(31, 75, 129, 0.4)` : "none",
                }}
              />
            ))}
          </div>

          <div
            style={{
              textAlign: "center",
              fontSize: "0.85rem",
              fontWeight: 700,
              color: "#7fb1d6",
              marginBottom: "0.9rem",
            }}
          >
            Step {currentStep + 1} of {BUDGET_TUTORIAL_STEPS.length}
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "0.6rem",
            }}
          >
            {currentStep > 0 ? (
              <button
                onClick={handlePrevious}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  padding: "0.55rem 1rem",
                  borderRadius: "10px",
                  backgroundColor: "#E8F1F8",
                  color: "#1f4b81",
                  fontWeight: 700,
                  border: "1px solid #d1e3f0",
                  cursor: "pointer",
                }}
              >
                <ArrowLeft size={18} />
                Back
              </button>
            ) : (
              <div />
            )}

            <button
              onClick={onClose}
              style={{
                padding: "0.55rem 1rem",
                color: "#94A3B8",
                background: "none",
                border: "none",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Skip
            </button>

            <button
              onClick={handleNext}
              style={{
                flex: 1,
                maxWidth: "200px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.5rem",
                padding: "0.75rem 1.2rem",
                borderRadius: "12px",
                background: `linear-gradient(135deg, #1f4b81 0%, #2d5f9f 100%)`,
                color: "white",
                fontWeight: 800,
                fontSize: "1rem",
                border: "none",
                cursor: "pointer",
                boxShadow: `0 6px 16px rgba(31, 75, 129, 0.3)`,
              }}
            >
              {currentStep === BUDGET_TUTORIAL_STEPS.length - 1 ? "Got it!" : "Next"}
              <ArrowRight size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function BudgetTutorialScreen() {
  const [showTutorial, setShowTutorial] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#F8FAFC",
        position: "relative",
      }}
    >
      <div
        style={{
          background: "linear-gradient(135deg, #1f4b81 0%, #2d5f9f 100%)",
          color: "white",
          padding: "1rem",
          boxShadow: "0 2px 8px rgba(31, 75, 129, 0.2)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            maxWidth: "72rem",
            margin: "0 auto",
          }}
        >
          <button
            style={{
              padding: "0.5rem",
              background: "none",
              border: "none",
              color: "white",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
            }}
          >
            <ArrowLeft size={24} />
          </button>
          <h1 style={{ fontSize: "1.25rem", fontWeight: "bold", margin: 0 }}>
            Budget Tutorial
          </h1>
          <div style={{ width: "2.5rem" }} />
        </div>
      </div>

      <div
        className="budget-overview"
        style={{
          background: "linear-gradient(135deg, #1f4b81 0%, #2d5f9f 50%, #7fb1d6 100%)",
          padding: "2rem 1rem",
          color: "white",
        }}
      >
        <div style={{ maxWidth: "72rem", margin: "0 auto" }}>
          <div style={{ marginBottom: "1rem" }}>
            <h2 style={{ fontSize: "1.75rem", fontWeight: "bold", margin: 0 }}>
              Budget Overview
            </h2>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.5rem",
                backgroundColor: "rgba(255, 255, 255, 0.2)",
                padding: "0.375rem 0.875rem",
                borderRadius: "9999px",
                marginTop: "0.75rem",
                border: "1px solid rgba(255, 255, 255, 0.3)",
              }}
            >
              <Calendar size={14} />
              <span style={{ fontSize: "0.875rem", fontWeight: "600" }}>
                Weekly • Nov 4 - Nov 11
              </span>
            </div>
          </div>

          <div style={{ display: "grid", gap: "1rem", marginTop: "1.5rem" }}>
            {[
              { icon: Wallet, label: "TOTAL BUDGET", amount: "₱5,000", sub: "0% used" },
              { icon: TrendingDown, label: "EXPENSES", amount: "₱0", sub: "" },
              { icon: CheckCircle, label: "REMAINING", amount: "₱5,000", sub: "100% left" },
            ].map((item, i) => {
              const Icon = item.icon;
              return (
                <div
                  key={i}
                  style={{
                    backgroundColor: "rgba(255, 255, 255, 0.15)",
                    backdropFilter: "blur(10px)",
                    borderRadius: "12px",
                    padding: "1.25rem",
                    display: "flex",
                    alignItems: "center",
                    gap: "1rem",
                    border: "1px solid rgba(255, 255, 255, 0.2)",
                  }}
                >
                  <div
                    style={{
                      width: "3rem",
                      height: "3rem",
                      borderRadius: "50%",
                      backgroundColor: "rgba(255, 255, 255, 0.2)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      border: "2px solid rgba(255, 255, 255, 0.3)",
                    }}
                  >
                    <Icon size={24} />
                  </div>
                  <div>
                    <div style={{ fontSize: "0.75rem", fontWeight: "700", opacity: 0.9 }}>
                      {item.label}
                    </div>
                    <div style={{ fontSize: "1.75rem", fontWeight: "bold" }}>
                      {item.amount}
                    </div>
                    {item.sub && (
                      <div style={{ fontSize: "0.875rem", opacity: 0.8 }}>
                        {item.sub}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div
        style={{
          backgroundColor: "white",
          padding: "1.25rem",
          textAlign: "center",
          borderBottom: "1px solid #E8F1F8",
        }}
      >
        <div
          className="unallocated-pill"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.625rem",
            background: "linear-gradient(135deg, #1f4b81, #2d5f9f)",
            color: "white",
            padding: "0.75rem 1.5rem",
            borderRadius: "12px",
            fontWeight: "600",
            fontSize: "1rem",
            boxShadow: "0 4px 12px rgba(31, 75, 129, 0.3)",
          }}
        >
          <Hourglass size={20} />
          Unallocated ₱5,000
        </div>
      </div>

      <div style={{ padding: "2rem 1rem", backgroundColor: "white" }}>
        <div
          style={{
            maxWidth: "28rem",
            margin: "0 auto",
            display: "flex",
            flexDirection: "column",
            gap: "1rem",
          }}
        >
          <button
            className="set-allocation-btn"
            style={{
              background: "linear-gradient(135deg, #1f4b81, #2d5f9f)",
              color: "white",
              border: "none",
              padding: "1rem 1.5rem",
              borderRadius: "12px",
              fontWeight: "600",
              fontSize: "1rem",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.625rem",
              boxShadow: "0 4px 12px rgba(31, 75, 129, 0.3)",
              transition: "all 0.2s ease",
            }}
          >
            <Settings size={20} />
            Set Allocation
          </button>

          <button
            className="clear-all-btn"
            style={{
              background: "white",
              color: "#1f4b81",
              border: "2px solid #E8F1F8",
              padding: "1rem 1.5rem",
              borderRadius: "12px",
              fontWeight: "600",
              fontSize: "1rem",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.625rem",
              transition: "all 0.2s ease",
            }}
          >
            <RefreshCw size={20} />
            Clear All
          </button>

          <button
            className="copy-period-btn"
            style={{
              background: "linear-gradient(135deg, #7fb1d6, #5a9cc9)",
              color: "white",
              border: "none",
              padding: "1rem 1.5rem",
              borderRadius: "12px",
              fontWeight: "600",
              fontSize: "1rem",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.625rem",
              boxShadow: "0 4px 12px rgba(127, 177, 214, 0.3)",
              transition: "all 0.2s ease",
            }}
          >
            <Copy size={20} />
            Copy Last Period
          </button>
        </div>
      </div>

      <button
        onClick={() => {
          setShowTutorial(true);
          setCurrentStep(0);
        }}
        style={{
          position: "fixed",
          bottom: "30px",
          right: "30px",
          width: "64px",
          height: "64px",
          borderRadius: "50%",
          background: "radial-gradient(circle, #1f4b81 40%, #163859 100%)",
          color: "white",
          fontSize: "32px",
          fontWeight: "bold",
          border: "2px solid #7fb1d6",
          cursor: "pointer",
          boxShadow: "0 0 20px #1f4b81CC, 0 0 40px #7fb1d6AA, 0 0 80px #7fb1d688",
          animation: "pulseQ 2s infinite ease-in-out",
          zIndex: 9800,
        }}
        aria-label="Show tutorial"
        title="Show tutorial"
      >
        ?
      </button>
      <style>
        {`
          @keyframes pulseQ {
            0% { box-shadow: 0 0 20px #1f4b81CC, 0 0 40px #7fb1d6AA, 0 0 80px #7fb1d688; }
            50% { box-shadow: 0 0 35px #1f4b81, 0 0 70px #7fb1d6, 0 0 120px #7fb1d6AA; }
            100% { box-shadow: 0 0 20px #1f4b81CC, 0 0 40px #7fb1d6AA, 0 0 80px #7fb1d688; }
          }
        `}
      </style>

      <TutorialOverlay
        visible={showTutorial}
        onClose={() => setShowTutorial(false)}
        currentStep={currentStep}
        setCurrentStep={setCurrentStep}
      />
    </div>
  );
}