// @ts-nocheck
import React, { useEffect, useState } from "react";
import { router } from "expo-router";
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { 
  View, 
  Text, 
  ScrollView, 
  Dimensions, 
  StyleSheet, 
  TouchableOpacity,
  Platform,
  StatusBar,
  ActivityIndicator,
  Animated,
  Alert,
} from "react-native";
import { LineChart, PieChart } from "react-native-chart-kit";
import api from "../../lib/api";
import { getToken } from "../../lib/auth";

import Svg, { G, Polygon, Circle, Text as SvgText } from "react-native-svg";

const screenWidth = Dimensions.get("window").width;
const isMobile = Dimensions.get("window").width < 480;

type Expense = {
  _id: string;
  category: string;
  amount: number;
  date: string;
};

type UserData = {
  budgetAmount: number;
  budgetPeriod: string;
  budgetPeriodStart: string;
  budgetPeriodEnd: string;
  customBudgetRange?: {
    budgetPeriodStart: string;
    budgetPeriodEnd: string;
  };
};

export default function AnalyticsPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [currentPeriodExpenses, setCurrentPeriodExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [fadeAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    (async () => {
      const token = await getToken();
      if (!token?.id) return;

      try {
        setLoading(true);

        // Fetch user data
        const userRes = await api.get(`/auth/${token.id}`);
        const user = userRes.data;
        setUserData(user);

        // Fetch all expenses (for lifetime analytics if needed later)
        const start = "2000-01-01";
        const end = new Date().toISOString().slice(0, 10);
        const allExpensesRes = await api.get(
          `/expenses/history?userId=${token.id}&start=${start}&end=${end}`
        );
        setExpenses(allExpensesRes.data.expenses || []);

        // Current period start and end
        let periodStart, periodEnd;
        if (user.budgetPeriod === 'Custom' && user.customBudgetRange) {
          periodStart = new Date(user.customBudgetRange.budgetPeriodStart);
          periodEnd = new Date(user.customBudgetRange.budgetPeriodEnd);
        } else {
          periodStart = new Date(user.budgetPeriodStart || new Date());
          periodEnd = new Date(user.budgetPeriodEnd || new Date());
        }

        const currentPeriodRes = await api.get(
          `/expenses/history?userId=${token.id}&start=${periodStart.toISOString().slice(0, 10)}&end=${periodEnd.toISOString().slice(0, 10)}`
        );
        setCurrentPeriodExpenses(currentPeriodRes.data.expenses || []);

        // Animate content in
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }).start();

      } catch (err) {
        console.error("❌ Analytics fetch failed:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
        
       
<LinearGradient
  colors={['#4b5563', '#6b7280']}
  start={{ x: 0, y: 0 }}
  end={{ x: 1, y: 1 }}
  style={styles.header}
>
  <TouchableOpacity 
    style={styles.backButton}
    onPress={() => router.push("/")}
    activeOpacity={0.7}
  >
    <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
  </TouchableOpacity>
  
  <View style={styles.headerContent}>
    <Text style={styles.title}>Tracker</Text>
    <Text style={styles.subtitle}>Smart Expense Insights</Text>
  </View>
  
  <View style={{ width: 40 }} />
</LinearGradient>

        <View style={styles.loadingContainer}>
          <View style={styles.loadingSpinner}>
            <ActivityIndicator size="large" color="#e6e9eeff" />
          </View>
          <Text style={styles.loadingText}>Analyzing your spending patterns...</Text>
        </View>
      </View>
    );
  }

  // --- Current period calculations ---
  const currentPeriodTotal = currentPeriodExpenses.reduce((sum, e) => sum + e.amount, 0);
  const averageExpense = currentPeriodExpenses.length > 0 
    ? currentPeriodTotal / currentPeriodExpenses.length 
    : 0;
  const totalTransactions = currentPeriodExpenses.length;

  const budgetAmount = userData?.budgetAmount || 0;
  const remainingBudget = budgetAmount - currentPeriodTotal;
  const budgetUsedPercentage = budgetAmount > 0 ? (currentPeriodTotal / budgetAmount) * 100 : 0;

  const budgetPeriod = userData?.budgetPeriod || 'Monthly';
  const periodStart = userData?.customBudgetRange?.budgetPeriodStart || userData?.budgetPeriodStart;
  const periodEnd = userData?.customBudgetRange?.budgetPeriodEnd || userData?.budgetPeriodEnd;

  const daysRemaining = periodEnd ? 
    Math.max(0, Math.ceil((new Date(periodEnd).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))) : 0;

  // --- Category Breakdown ---
  const categoryTotals: { [cat: string]: number } = {};
  currentPeriodExpenses.forEach((e) => {
    categoryTotals[e.category] = (categoryTotals[e.category] || 0) + e.amount;
  });

  const modernColors = [
    "#4F83CC", // soft blue
    "#6EA47F", // sage green
    "#B7A0D6", // lavender gray
    "#66A182", // muted green
    "#C98C5C", // warm brown-orange
    "#B76CA0", // muted magenta
    "#A982C4", // soft violet
    "#D97777", // gentle red
    "#7CA6C2", // dusty teal
  ];

  const pieData = Object.entries(categoryTotals).map(([category, total], index) => ({
    name: category,
    population: total,
    color: modernColors[index % modernColors.length],
    legendFontColor: "#4B5563",
    legendFontSize: 14,
  }));

  // --- Trend Grouping ---
const getAnalyticsGrouping = () => {
  const grouped: { [key: string]: number } = {};

  currentPeriodExpenses.forEach((e) => {
    const d = new Date(e.date);
    let key = "";

    if (budgetPeriod === "Daily" || budgetPeriod === "Weekly") {
      // Always show daily trend
      key = d.toISOString().slice(0, 10);

    } else if (budgetPeriod === "Monthly") {
      // Show weekly sums
      const weekStart = new Date(d);
      weekStart.setDate(d.getDate() - d.getDay());
      key = weekStart.toISOString().slice(0, 10);

    } else if (budgetPeriod === "Custom" && periodStart && periodEnd) {
      const diffDays =
        (new Date(periodEnd).getTime() - new Date(periodStart).getTime()) /
        (1000 * 60 * 60 * 24);

      if (diffDays > 31) {
        // Aggregate weekly if longer than a month
        const weekStart = new Date(d);
        weekStart.setDate(d.getDate() - d.getDay());
        key = weekStart.toISOString().slice(0, 10);
      } else {
        // Otherwise daily
        key = d.toISOString().slice(0, 10);
      }
    }
    grouped[key] = (grouped[key] || 0) + e.amount;
  });

  const labels = Object.keys(grouped).sort();
  return { labels, data: labels.map((k) => grouped[k]) };
};

  const chartData = getAnalyticsGrouping();

const formatChartLabels = (labels: string[]) => {
  if (budgetPeriod === "Daily" || budgetPeriod === "Weekly") {
    return labels.slice(-14).map(label => {
      const date = new Date(label);
      return `${date.getMonth() + 1}/${date.getDate()}`;
    });

  } else if (budgetPeriod === "Monthly" || budgetPeriod === "Custom") {
    if (budgetPeriod === "Custom" && periodStart && periodEnd) {
      const diffDays =
        (new Date(periodEnd).getTime() - new Date(periodStart).getTime()) /
        (1000 * 60 * 60 * 24);

      if (diffDays <= 31) {
        // Daily labels
        return labels.slice(-14).map(label => {
          const date = new Date(label);
          return `${date.getMonth() + 1}/${date.getDate()}`;
        });
      }
    }
    // Weekly labels
    return labels.slice(-8).map(label => {
      const date = new Date(label);
      return `${date.getMonth() + 1}/${date.getDate()}`;
    });
  }
  return labels;
};

  // Get spending health status
const getSpendingHealth = () => {
  if (budgetUsedPercentage < 50) {
    return { 
      status: 'Excellent', 
      background: '#10b981', 
      message: 'Outstanding! You\'re using less than 50% of your budget. You\'re managing your finances exceptionally well. Keep up the great work!'
    };
  }
  if (budgetUsedPercentage < 75) {
    return { 
      status: 'Good', 
      background: '#3B82F6', 
      message: 'Great job! You\'re on track with 25-50% of your budget remaining. Continue monitoring your expenses to maintain this healthy balance.'
    };
  }
  if (budgetUsedPercentage < 90) {
    return { 
      status: 'Caution', 
      background: '#f59e0b', 
      message: 'Pay attention! You\'ve used 75-90% of your budget. Consider reducing discretionary spending to avoid going over budget.'
    };
  }
  return { 
    status: 'Over Budget', 
    background: '#ef4444', 
    message: 'Alert! You\'ve exceeded 90% of your budget or gone over. Review your expenses and adjust your spending habits to get back on track.'
  };
};

  const spendingHealth = getSpendingHealth();

  // Function to show spending health info
  const showSpendingHealthInfo = () => {
    Alert.alert(
      `${spendingHealth.status} Status`,
      spendingHealth.message,
      [{ text: 'Got it', style: 'default' }]
    );
  };

  // Daily burn rate calculation
  const dailyBurnRate = daysRemaining > 0 ? remainingBudget / daysRemaining : 0;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      
      {/* Enhanced Header */}
      <LinearGradient
          colors={['#1f4b81ff', '#7fb1d6ff']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        {Platform.OS == "web" && (
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.push("/")}
            activeOpacity={0.7}
          >
            <View style={styles.backButtonCircle}>
              <Ionicons name="arrow-back" size={20} color="#e4e8efff" />
            </View>
          </TouchableOpacity>
        )}
        
        <View style={styles.headerContent}>
          <Text style={styles.title}>Tracker</Text>
          <Text style={styles.subtitle}>Spending Intelligence</Text>
        </View>
        
        {Platform.OS !== "web" && <View style={{ width: 40 }} />}
      </LinearGradient>

      <Animated.ScrollView 
        style={[styles.scrollView, { opacity: fadeAnim }]}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Enhanced Budget Status Card */}
        <View style={styles.budgetStatusCard}>
          <LinearGradient
            colors={
              remainingBudget >= 0
                ? ['#1f4b81', '#355d9c']       // 💙 Surplus – calm blue
                : ['#dc2626', '#ef4444']        // ❤️ Overspent – red
            }
            style={styles.statusGradient}
          >
            <View style={styles.statusContent}>
              <View style={styles.statusHeader}>
                <View>
                  <Text style={styles.statusTitle}>{budgetPeriod} Budget</Text>
                  <TouchableOpacity 
                    onPress={showSpendingHealthInfo}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.healthBadge, { backgroundColor: spendingHealth.background }]}>
                      <Ionicons name={spendingHealth.icon} size={20} color="#FFFFFF" />
                      <Text style={[styles.healthText, { color: '#FFFFFF' }]}>
                        {spendingHealth.status}
                      </Text>
                      <Ionicons name="information-circle-outline" size={16} color="#FFFFFF" style={{ marginLeft: 4 }} />
                    </View>
                  </TouchableOpacity>
                </View>
                <View style={styles.daysContainer}>
                <Text style={styles.daysNumber}>{daysRemaining}</Text>
                <Text style={styles.daysLabel}>
                  {daysRemaining === 1 ? 'day left' : 'days left'}
                </Text>

                {periodStart && periodEnd && (
                  <Text style={styles.periodDate}>
                    {new Date(periodStart).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    })}{' '}
                    –{' '}
                    {new Date(periodEnd).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </Text>
                )}
              </View>

              </View>

              <View style={styles.budgetMainSection}>
                <View style={styles.budgetAmounts}>
                  <Text style={styles.spentAmount}>₱{currentPeriodTotal.toLocaleString()}</Text>
                  <Text style={styles.budgetDivider}>of</Text>
                  <Text style={styles.totalBudget}>₱{budgetAmount.toLocaleString()}</Text>
                </View>
                
                <View style={styles.remainingSection}>
                  <Text style={styles.remainingLabel}>
                    {remainingBudget >= 0 ? 'Remaining' : 'Over Budget'}
                  </Text>
                  <Text style={[styles.remainingAmount, { color: remainingBudget >= 0 ? '#FFF' : '#FEE2E2' }]}>
                    ₱{Math.abs(remainingBudget).toLocaleString()}
                  </Text>
                </View>
              </View>

              <View style={styles.progressSection}>
                <View style={styles.progressBarContainer}>
                  <View style={styles.progressBar}>
                    <View 
                      style={[
                        styles.progressFill, 
                        { 
                          width: `${Math.min(budgetUsedPercentage, 100)}%`,
                          backgroundColor: budgetUsedPercentage > 100 ? '#FEE2E2' : 'rgba(255, 255, 255, 0.9)'
                        }
                      ]} 
                    />
                  </View>
                  <Text style={styles.progressText}>{budgetUsedPercentage.toFixed(1)}% used</Text>
                </View>

                
              </View>
            </View>
          </LinearGradient>
        </View>

        {/* Enhanced Summary Cards */}
        <View style={styles.summaryGrid}>
          <View style={styles.summaryCard}>
           
          </View>

          <View style={styles.summaryCard}>
            <LinearGradient
              colors={['#dbeafe', '#bfdbfe']}
              style={styles.cardGradient}
            >
              <View style={styles.cardContent}>
                <View style={[styles.cardIconContainer, { backgroundColor: '#1e40af' }]}>
                  <Ionicons name="receipt" size={20} color="#FFFFFF" />
                </View>
                <View style={styles.cardTextSection}>
                  <Text style={styles.cardLabel}>Transactions</Text>
                  <Text style={styles.cardValue}>{totalTransactions}</Text>
                </View>
              </View>
            </LinearGradient>
          </View>

      
        </View>

        {/* Enhanced Top Spending Insight */}
        {Object.keys(categoryTotals).length > 0 && (
          <View style={styles.insightCard}>
            <LinearGradient
              colors={['rgba(59, 130, 246, 0.05)', 'rgba(30, 64, 175, 0.05)']}
              style={styles.insightGradient}
            >
              <View style={styles.insightContent}>
                <View style={styles.insightIconContainer}>
                  <LinearGradient
                    colors={['#3b82f6', '#1e40af']}
                    style={styles.insightIconGradient}
                  >
                    <Ionicons name="analytics" size={20} color="#FFFFFF" />
                  </LinearGradient>
                </View>
                <View style={styles.insightTextContainer}>
                  <Text style={styles.insightTitle}>💡 Smart Insight</Text>
                  <Text style={styles.insightDescription}>
                    Your top category is{" "}
                    <Text style={styles.insightHighlight}>
                      {Object.entries(categoryTotals).sort((a, b) => b[1] - a[1])[0][0]}
                    </Text>
                    {" "}at{" "}
                    <Text style={styles.insightHighlight}>
                      {((Object.entries(categoryTotals).sort((a, b) => b[1] - a[1])[0][1] / currentPeriodTotal) * 100).toFixed(1)}%
                    </Text>
                    {" "}of total spending
                  </Text>
                </View>
              </View>
            </LinearGradient>
          </View>
        )}

      
{/* ==================== CATEGORY BREAKDOWN (HORIZONTAL BAR) ==================== */}
{pieData.length > 0 && (
  <View style={styles.chartSection}>
    <View style={styles.chartCard}>
      {/* Header */}
      <View style={styles.sectionHeader}>
        <View style={styles.sectionIconContainer}>
          <Ionicons name="bar-chart" size={18} color="#3b82f6" />
        </View>
        <Text style={styles.sectionTitle}>Category Breakdown</Text>
      </View>

      {(() => {
        const totalBudget = pieData.reduce(
          (sum, item) => sum + (Number(item.population) || 0),
          0
        );

        // Sort largest → smallest for readability
        const sortedData = [...pieData].sort(
          (a, b) => Number(b.population) - Number(a.population)
        );

        return (
          <View style={{ marginVertical: 10 }}>
            {sortedData.map((item, index) => {
              const amount = Number(item.population) || 0;
              const percent =
                totalBudget > 0
                  ? ((amount / totalBudget) * 100).toFixed(1)
                  : "0.0";

              return (
                <View
                  key={index}
                  style={{
                    marginBottom: 14,
                  }}
                >
                  {/* Category Label */}
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      marginBottom: 4,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 13,
                        color: "#334155",
                        fontWeight: "600",
                      }}
                    >
                      {item.name}
                    </Text>
                    <Text
                      style={{
                        fontSize: 13,
                        color: "#64748b",
                      }}
                    >
                      ₱{amount.toLocaleString()} ({percent}%)
                    </Text>
                  </View>

                  {/* Horizontal Bar */}
                  <View
                    style={{
                      height: 14,
                      backgroundColor: "#E2E8F0",
                      borderRadius: 8,
                      overflow: "hidden",
                    }}
                  >
                    <View
                      style={{
                        height: "100%",
                        width: `${percent}%`,
                        backgroundColor: item.color,
                        borderRadius: 8,
                      }}
                    />
                  </View>
                </View>
              );
            })}

            {/* Total Label */}
            <View style={{ marginTop: 16, alignItems: "center" }}>
              <Text
                style={{
                  fontSize: 13,
                  color: "#1e3a8a",
                  fontWeight: "600",
                }}
              >
                Total Spending: ₱{totalBudget.toLocaleString()}
              </Text>
            </View>
          </View>
        );
      })()}

      {/* 📘 Tip Box */}
      <View
        style={{
          marginTop: 12,
          backgroundColor: "#F0F9FF",
          borderLeftWidth: 3,
          borderLeftColor: "#3b82f6",
          padding: 10,
          borderRadius: 8,
        }}
      >
        <Text
          style={{
            fontSize: 13,
            color: "#1e3a8a",
            fontWeight: "600",
            marginBottom: 2,
          }}
        >
          💡 Tip:
        </Text>
        <Text style={{ fontSize: 12.5, color: "#334155", lineHeight: 18 }}>
          This clean bar chart lets you compare categories more precisely.
          Longer bars represent higher spending. Try to keep your highest
          categories balanced to maintain a healthy budget distribution.
        </Text>
      </View>
    </View>
  </View>
)}



{/* ==================== OVERSPENDING BEHAVIOR (RADAR CHART) ==================== */}
{Object.keys(categoryTotals).length > 0 && (
  <View style={styles.chartSection}>
    <View style={styles.chartCard}>
      {/* Header */}
      <View style={styles.sectionHeader}>
        <View style={styles.sectionIconContainer}>
          <Ionicons name="stats-chart" size={18} color="#3b82f6" />
        </View>
        <Text style={styles.sectionTitle}>Spending Behavior (Radar View)</Text>
      </View>

      {(() => {
        // Use total per category (from existing categoryTotals)
        const radarData = Object.entries(categoryTotals).map(([cat, val]) => ({
          category: cat,
          value: val,
        }));

        const maxValue = Math.max(...radarData.map((d) => d.value));
        const levels = 5;
        const angleSlice = (2 * Math.PI) / radarData.length;
        const radius = 90;

        const polarToCartesian = (angle: number, value: number) => {
          const r = (value / maxValue) * radius;
          const x = radius + r * Math.sin(angle);
          const y = radius - r * Math.cos(angle);
          return [x, y];
        };

        const areaPoints = radarData
          .map((d, i) => polarToCartesian(i * angleSlice, d.value))
          .map(([x, y]) => `${x},${y}`)
          .join(" ");

        return (
          <View style={{ alignItems: "center", marginVertical: 10 }}>
            <Svg width={radius * 2 + 40} height={radius * 2 + 40}>
              <G x={20} y={20}>
                {/* 🕸 Grid levels */}
                {Array.from({ length: levels }).map((_, idx) => {
                  const levelValue = maxValue * ((idx + 1) / levels);
                  const gridPoints = radarData
                    .map((_, i) => {
                      const [x, y] = polarToCartesian(i * angleSlice, levelValue);
                      return `${x},${y}`;
                    })
                    .join(" ");
                  return (
                    <Polygon
                      key={idx}
                      points={gridPoints}
                      stroke="#CBD5E1"
                      strokeWidth="0.5"
                      fill="none"
                    />
                  );
                })}

                {/* 🔷 Radar area */}
                <Polygon
                  points={areaPoints}
                  fill="rgba(59,130,246,0.25)"
                  stroke="#2563EB"
                  strokeWidth="2"
                />

                {/* 🔘 Data points */}
                {radarData.map((d, i) => {
                  const [x, y] = polarToCartesian(i * angleSlice, d.value);
                  return (
                    <Circle
                      key={i}
                      cx={x}
                      cy={y}
                      r="3"
                      fill="#1D4ED8"
                      stroke="#fff"
                      strokeWidth="1"
                    />
                  );
                })}

                {/* 🏷 Labels */}
                {radarData.map((d, i) => {
                  const [x, y] = polarToCartesian(i * angleSlice, maxValue * 1.15);
                  return (
                    <SvgText
                      key={i}
                      x={x}
                      y={y}
                      textAnchor="middle"
                      fontSize="11"
                      fill="#334155"
                    >
                      {d.category}
                    </SvgText>
                  );
                })}
              </G>
            </Svg>

           {/* 🧠 Tip Box */}
<View
  style={{
    marginTop: 10,
    backgroundColor: "#F0F9FF",
    borderLeftWidth: 3,
    borderLeftColor: "#3b82f6",
    padding: 10,
    borderRadius: 8,
  }}
>
  <Text
    style={{
      fontSize: 13,
      color: "#1e3a8a",
      fontWeight: "600",
      marginBottom: 4,
    }}
  >
    💡 Tip: How to Read This Chart
  </Text>

  <Text style={{ fontSize: 12.5, color: "#334155", lineHeight: 18 }}>
    Each axis represents a spending category. The blue shape shows your spending intensity —
    the farther a point is from the center, the higher your spending in that category.
  </Text>

  <Text
    style={{
      fontSize: 12.5,
      color: "#334155",
      lineHeight: 18,
      marginTop: 6,
    }}
  >
    A balanced, round shape means your budget is evenly distributed. A long spike in one
    direction shows a dominant category — usually where you're spending the most.
  </Text>

  <Text
    style={{
      fontSize: 12.5,
      color: "#334155",
      lineHeight: 18,
      marginTop: 6,
    }}
  >
    This radar chart helps you visualize multi-dimensional behavior — e.g., overspending,
    eating out, impulse buying, and entertainment — so you can quickly spot imbalances.
  </Text>
</View>
          </View>
        );
      })()}
    </View>
  </View>
)}





{/* 📊 Adaptive Spending Pattern Chart */}
{(() => {
  // --- Group spending data dynamically ---
  const getSpendingGrouping = () => {
    const grouped: { [key: string]: number } = {};

    currentPeriodExpenses.forEach((e) => {
      const d = new Date(e.date);
      let key = "";

      if (budgetPeriod === "Daily") {
        // group by hour
        const hour = d.getHours();
        key = `${hour.toString().padStart(2, "0")}:00`;
      } else {
        // group by day for weekly, monthly, custom
        key = d.toISOString().slice(0, 10);
      }

      grouped[key] = (grouped[key] || 0) + e.amount;
    });

    const labels = Object.keys(grouped).sort();
    return { labels, data: labels.map((k) => grouped[k]) };
  };

  const spendingData = getSpendingGrouping();

  // --- Format labels nicely for display ---
  const formatLabels = (labels: string[]) => {
    if (budgetPeriod === "Daily") {
      return labels.map((hourStr) => {
        const hour = parseInt(hourStr);
        const ampm = hour >= 12 ? "PM" : "AM";
        const displayHour = hour % 12 || 12;
        return `${displayHour}${ampm}`;
      });
    } else {
      return labels.map((label) => {
        const date = new Date(label);
        return `${date.getMonth() + 1}/${date.getDate()}`;
      });
    }
  };

  const formattedLabels = formatLabels(spendingData.labels);
  const hasData = spendingData.data.length > 0;

  return hasData ? (
    <View style={styles.chartSection}>
      <View style={styles.chartCard}>
        {/* Header */}
        <View style={styles.sectionHeader}>
          <View style={styles.sectionIconContainer}>
            <Ionicons name="trending-up" size={18} color="#3b82f6" />
          </View>
          <Text style={styles.sectionTitle}>Spending Pattern</Text>
        </View>

        {/* Legend */}
        <View
          style={{
            flexDirection: "row",
            justifyContent: "center",
            marginBottom: 16,
            gap: 20,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <View
              style={{
                width: 24,
                height: 12,
                backgroundColor: "#3b82f6",
                borderRadius: 4,
                marginRight: 6,
              }}
            />
            <Text
              style={{
                fontSize: 13,
                color: "#64748b",
                fontWeight: "600",
              }}
            >
              {budgetPeriod === "Daily"
                ? "Hourly Spending"
                : "Daily Spending"}
            </Text>
          </View>
        </View>

        {/* Line Chart */}
        <View style={[styles.chartContainer, { backgroundColor: "#FFFFFF" }]}>
          <LineChart
            data={{
              labels: formattedLabels.slice(-14),
              datasets: [
                {
                  data:
                    spendingData.data.slice(-14).length > 0
                      ? spendingData.data.slice(-14)
                      : [0],
                  color: () => "#3b82f6",
                  strokeWidth: 3,
                },
              ],
              legend: [
                budgetPeriod === "Daily"
                  ? "Hourly Spending"
                  : "Daily Spending",
              ],
            }}
            width={screenWidth - 80}
            height={220}
            yAxisLabel="₱"
            fromZero
            chartConfig={{
              backgroundColor: "#FFFFFF",
              backgroundGradientFrom: "#FFFFFF",
              backgroundGradientTo: "#FFFFFF",
              decimalPlaces: 0,
              color: (opacity = 1) => `rgba(59,130,246,${opacity})`,
              labelColor: (opacity = 1) => `rgba(75,85,99,${opacity})`,
              propsForDots: {
                r: "5",
                strokeWidth: "2",
                stroke: "#3b82f6",
                fill: "#FFFFFF",
              },
              propsForBackgroundLines: {
                strokeDasharray: "",
                stroke: "rgba(75,85,99,0.15)",
                strokeWidth: 1,
              },
              fillShadowGradient: "#3b82f6",
              fillShadowGradientOpacity: 0.1,
            }}
            bezier
            style={{
              borderRadius: 16,
              backgroundColor: "#FFFFFF",
            }}
          />

          {/* 📘 Tip / Explanation Box */}
<View
  style={{
    marginTop: 18,
    backgroundColor: "#F0F9FF",
    borderLeftWidth: 3,
    borderLeftColor: "#3b82f6",
    padding: 12,
    borderRadius: 8,
  }}
>
  <Text
    style={{
      fontSize: 13,
      color: "#1e3a8a",
      fontWeight: "600",
      marginBottom: 4,
    }}
  >
    💡 Tip: Understanding Your Spending Pattern
  </Text>

  <Text style={{ fontSize: 12.5, color: "#334155", lineHeight: 18 }}>
    {budgetPeriod === "Daily"
      ? "Each point shows how much you spent per hour today. Peaks mean times when you spent the most—like big purchases or multiple small transactions close together."
      : "Each point shows your total spending for that day within this period. Watch for spikes—they mark days when you spent more than usual."}
  </Text>

  <Text style={{ fontSize: 12.5, color: "#334155", lineHeight: 18, marginTop: 6 }}>
    {"Try to keep your spending line smooth and low—sudden jumps usually mean impulse or high-value purchases."}
  </Text>
</View>


          {/* Footer Info */}
          <Text
            style={{
              textAlign: "center",
              color: "#64748b",
              fontSize: 12,
              marginTop: 10,
            }}
          >
            {budgetPeriod === "Daily"
              ? "Hourly spending trend for today"
              : "Daily spending pattern for this period"}
          </Text>
        </View>
      </View>
    </View>
  ) : (
    <View style={styles.chartSection}>
      <View style={styles.chartCard}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionIconContainer}>
            <Ionicons name="trending-up" size={18} color="#3b82f6" />
          </View>
          <Text style={styles.sectionTitle}>Spending Pattern</Text>
        </View>
        <View style={styles.emptyChartContainer}>
          <Ionicons name="bar-chart-outline" size={48} color="#D1D5DB" />
          <Text style={styles.emptyChartText}>No spending data available</Text>
          <Text style={styles.emptyChartSubtext}>
            Start tracking expenses to see trends
          </Text>
        </View>
      </View>
    </View>
  );
})()}


        {/* Category Details List */}
        {Object.keys(categoryTotals).length > 0 && (
          <View style={styles.categoryDetailsSection}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionIconContainer}>
                <Ionicons name="list" size={18} color="#3b82f6" />
              </View>
              <Text style={styles.sectionTitle}>Category Details</Text>
            </View>
            <View style={styles.categoryList}>
              {Object.entries(categoryTotals)
                .sort((a, b) => b[1] - a[1])
                .map(([category, amount], index) => {
                  const percentage = (amount / currentPeriodTotal) * 100;
                  return (
                    <View key={category} style={[
                      styles.categoryItem,
                      removeBorderFromLastItem(index, Object.entries(categoryTotals).length)
                    ]}>
                      <View style={styles.categoryItemLeft}>
                        <View 
                          style={[styles.categoryColorDot, { backgroundColor: modernColors[index % modernColors.length] }]} 
                        />
                        <Text style={styles.categoryName}>{category}</Text>
                      </View>
                      <View style={styles.categoryItemRight}>
                        <Text style={styles.categoryAmount}>₱{amount.toLocaleString()}</Text>
                        <Text style={styles.categoryPercentage}>{percentage.toFixed(1)}%</Text>
                      </View>
                    </View>
                  );
                })}
            </View>
          </View>
        )}

        <View style={styles.bottomPadding} />
      </Animated.ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#F8FAFC' 
  },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    padding: 20, 
    paddingTop: Platform.OS === 'ios' ? 50 : 40,
    paddingBottom: 30,
  },
  backButton: { 
    marginRight: 16,
  },
  backButtonCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(243, 237, 237, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    backdropFilter: 'blur(10px)',
  },
  headerContent: { 
    flex: 1, 
    alignItems: 'center' 
  },
  title: { 
    fontSize: 28, 
    fontWeight: '800', 
    color: '#FFF',
    letterSpacing: -0.5,
    marginTop:5,
  },
  subtitle: { 
    fontSize: 15, 
    color: 'rgba(255, 255, 255, 0.8)', 
    marginTop: 2,
    fontWeight: '500'
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  loadingSpinner: {
    marginBottom: 20,
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    fontWeight: '500',
  },
  budgetStatusCard: { 
    margin: 20, 
    marginTop: 20,
    borderRadius: 20, 
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 6,
  },
  statusGradient: { 
    padding: 20,
  },
  statusContent: { 
    alignItems: 'stretch' 
  },
  statusHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  statusTitle: { 
    fontSize: 25, 
    fontWeight: '700', 
    color: '#FFF',
    marginBottom: 8,
  },
  daysContainer: {
    alignItems: 'flex-end',
  },
  daysNumber: {
    fontSize: 35,
    fontWeight: '800',
    color: '#FFF',
    lineHeight: 32,
  },
  daysLabel: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '500',
  },
  periodDate: { 
    fontSize: 13, 
    color: "rgba(255,255,255,0.7)", 
    fontWeight: "500",
    marginTop: 4,
  },
  budgetMainSection: {
    marginBottom: 20,
  },
  budgetAmounts: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    marginBottom: 12,
  },
  spentAmount: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFF',
  },
  budgetDivider: {
    fontSize: 18,
    color: 'rgba(255, 255, 255, 0.7)',
    marginHorizontal: 8,
    fontWeight: '500',
  },
  totalBudget: {
    fontSize: 20,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.9)',
  },
  remainingSection: {
    alignItems: 'center',
  },
  remainingLabel: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '500',
  },
  remainingAmount: {
    fontSize: 20,
    fontWeight: '700',
    marginTop: 2,
  },
  progressSection: {
    gap: 12,
  },
  progressBarContainer: { 
    alignItems: 'center',
    gap: 8,
  },
  progressBar: { 
    width: '100%', 
    height: 8, 
    backgroundColor: 'rgba(255,255,255,0.2)', 
    borderRadius: 4, 
    overflow: 'hidden',
  },
  progressFill: { 
    height: '100%', 
    borderRadius: 4 
  },
  progressText: { 
    fontSize: 14, 
    fontWeight: '600', 
    color: '#FFF' 
  },
  burnRateSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
  },
  burnRateLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '500',
  },
  burnRateAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFF',
  },
  summaryGrid: { 
    paddingHorizontal: 20, 
    marginBottom: 20,
    gap: 12,
  },
  summaryCard: { 
    borderRadius: 20, 
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 6,
  },
  cardGradient: {
    padding: 20,
  },
  cardContent: { 
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardIconContainer: { 
    width: 48, 
    height: 48, 
    borderRadius: 20, 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginRight: 16,
  },
  cardTextSection: {
    flex: 1,
  },
  cardLabel: { 
    fontSize: 14, 
    color: '#6B7280', 
    marginBottom: 4,
    fontWeight: '500',
  },
  cardValue: { 
    fontSize: 20, 
    fontWeight: '700', 
    color: '#111827' 
  },
  insightCard: { 
    marginHorizontal: 20, 
    marginBottom: 20, 
    borderRadius: 20, 
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 6,
  },
  insightGradient: { 
    padding: 20, 
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.1)',
  },
  insightContent: { 
    flexDirection: 'row', 
    alignItems: 'center' 
  },
  insightIconContainer: {
    marginRight: 16,
  },
  insightIconGradient: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  insightTextContainer: { 
    flex: 1 
  },
  insightTitle: { 
    fontSize: 16, 
    fontWeight: '700', 
    color: '#111827',
    marginBottom: 4,
  },
  insightDescription: { 
    fontSize: 14, 
    color: '#6B7280',
    lineHeight: 20,
  },
  insightHighlight: { 
    color: '#3b82f6', 
    fontWeight: '700' 
  },
  chartSection: { 
    marginHorizontal: 20,
    marginBottom: 20,
  },
  chartCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 6,
  },
  sectionHeader: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginBottom: 20,
  },
  sectionIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  sectionTitle: { 
    fontSize: 18, 
    fontWeight: '700',
    color: '#111827',
  },
  chartContainer: {
    alignItems: 'center',
    overflow: 'hidden',
    borderRadius: 16,
    backgroundColor: "#FFFFFF", 
  },
  chart: { 
    borderRadius: 16,
    marginVertical: 8,
  },
  categoryDetailsSection: {
    marginHorizontal: 20,
    marginBottom: 20,
  },
  categoryList: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 6,
  },
  categoryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  categoryItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  categoryColorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
  },
  categoryItemRight: {
    alignItems: 'flex-end',
  },
  categoryAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  categoryPercentage: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
    marginTop: 2,
  },
  bottomPadding: {
    height: 20,
  },
  emptyChartContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyChartText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 12,
  },
  emptyChartSubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 4,
  },
  healthBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  healthText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
    color: '#FFFFFF',
  },
});

// Remove the last item's border
const removeBorderFromLastItem = (index: number, total: number) => {
  return index === total - 1 ? { borderBottomWidth: 0 } : {};
};

if (isMobile) {
  Object.assign(styles, {
    scrollContent: {
      ...styles.scrollContent,
      paddingBottom: 20,
    },
    header: {
      ...styles.header,
      paddingHorizontal: 16,
      paddingTop: Platform.OS === 'ios' ? 40 : 30,
      paddingBottom: 20,
    },
    title: {
      ...styles.title,
      fontSize: 22,
    },
    subtitle: {
      ...styles.subtitle,
      fontSize: 13,
    },
    budgetStatusCard: {
      ...styles.budgetStatusCard,
      marginHorizontal: 14,
      marginTop: 14,
      borderRadius: 20,
    },
    statusTitle: {
      ...styles.statusTitle,
      fontSize: 20,
    },
    spentAmount: {
      ...styles.spentAmount,
      fontSize: 24,
    },
    totalBudget: {
      ...styles.totalBudget,
      fontSize: 16,
    },
    remainingAmount: {
      ...styles.remainingAmount,
      fontSize: 16,
    },
    daysNumber: {
      ...styles.daysNumber,
      fontSize: 26,
    },
    daysLabel: {
      ...styles.daysLabel,
      fontSize: 12,
    },
    cardGradient: {
      ...styles.cardGradient,
      padding: 14,
    },
    cardLabel: {
      ...styles.cardLabel,
      fontSize: 12,
    },
    cardValue: {
      ...styles.cardValue,
      fontSize: 16,
    },
    cardIconContainer: {
      ...styles.cardIconContainer,
      width: 40,
      height: 40,
      marginRight: 10,
    },
    chartCard: {
      ...styles.chartCard,
      padding: 14,
    },
    chartContainer: {
      ...styles.chartContainer,
      borderRadius: 20,
    },
    insightCard: {
      ...styles.insightCard,
      marginHorizontal: 14,
    },
    insightTitle: {
      ...styles.insightTitle,
      fontSize: 14,
    },
    insightDescription: {
      ...styles.insightDescription,
      fontSize: 12,
      lineHeight: 18,
    },
    categoryList: {
      ...styles.categoryList,
      padding: 14,
    },
    categoryItem: {
      ...styles.categoryItem,
      paddingVertical: 10,
    },
    categoryName: {
      ...styles.categoryName,
      fontSize: 13,
    },
    categoryAmount: {
      ...styles.categoryAmount,
      fontSize: 14,
    },
    categoryPercentage: {
      ...styles.categoryPercentage,
      fontSize: 11,
    },
    sectionTitle: {
      ...styles.sectionTitle,
      fontSize: 16,
    },
    sectionIconContainer: {
      ...styles.sectionIconContainer,
      width: 28,
      height: 28,
      marginRight: 8,
    },
  });
}