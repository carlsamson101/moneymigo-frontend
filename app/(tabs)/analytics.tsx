// @ts-nocheck
import React, { useEffect, useState } from "react";
import { router } from "expo-router";
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from "@react-navigation/native";

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
  Modal,
  Pressable,
  TextInput,
} from "react-native";
import { LineChart, PieChart, BarChart } from "react-native-chart-kit";
import api from "../../lib/api";
import { getToken } from "../../lib/auth";

import Svg, { G, Polygon, Circle, Text as SvgText } from "react-native-svg";

const screenWidth = Dimensions.get("window").width;
const isMobile = Dimensions.get("window").width < 480;

// ✅ Add DateTimePicker for native platforms
let DateTimePicker: any = () => null;
if (Platform.OS !== 'web') {
  DateTimePicker = require('@react-native-community/datetimepicker').default;
}

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

type HistoricalData = {
  expenses: Expense[];
  totalSpent: number;
  averageDaily: number;
  topCategory: string;
  categoryBreakdown: { [key: string]: number };
  dailyTotals: { date: string; amount: number }[];
};

// helper at top of file
const getLocalDateKey = (d: Date) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

function getPeriodDateRange(
  period: string | null,
  startDate: Date | null,
  endDate: Date | null
): { min: Date; max: Date } {
  const now = new Date();
  let start, end;

  period = period ? period.charAt(0).toUpperCase() + period.slice(1).toLowerCase() : null;

  if (period === 'Custom' && startDate && endDate) {
    start = new Date(startDate);
    end = new Date(endDate);
    console.log("📌 Custom Range:", { start, end });
    return { min: start, max: end };
  }

  if (period === 'Daily' && startDate) {
    start = new Date(startDate);
    end = new Date(start);
    end.setDate(start.getDate() + 1);
    console.log("📌 Daily Range:", { start, end });
    return { min: start, max: end };
  }

  if (period === 'Weekly' && startDate) {
    start = new Date(startDate);
    end = new Date(start);
    end.setDate(start.getDate() + 7);
    console.log("📌 Weekly Range:", { start, end });
    return { min: start, max: end };
  }

  if (period === 'Monthly' && startDate) {
    start = new Date(startDate);
    end = new Date(start);
    end.setMonth(start.getMonth() + 1);
    console.log("📌 Monthly Range:", { start, end });
    return { min: start, max: end };
  }

  start = new Date(now);
  end = new Date(start);
  end.setDate(start.getDate() + 1);
  console.log("📌 Default 24hr Range:", { start, end });
  return { min: start, max: end };
}

export default function AnalyticsPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [currentPeriodExpenses, setCurrentPeriodExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [fadeAnim] = useState(new Animated.Value(0));

  // ✅ Historical Analytics States
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyExpanded, setHistoryExpanded] = useState(false);
  const [historyStartDate, setHistoryStartDate] = useState<Date | null>(null);
  const [historyEndDate, setHistoryEndDate] = useState<Date | null>(null);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [historicalData, setHistoricalData] = useState<HistoricalData | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  useFocusEffect(
    React.useCallback(() => {
      setLoading(true);  
    }, [])
  );

  useEffect(() => {
    (async () => {
      if (!loading) return;
      const token = await getToken();
      if (!token?.id) return;

      try {
        setLoading(true);

        const userRes = await api.get(`/auth/${token.id}`);
        const user = userRes.data;
        setUserData(user);

        const start = "2000-01-01";
        const end = new Date().toISOString().slice(0, 10);
        const allExpensesRes = await api.get(
          `/expenses/history?userId=${token.id}&start=${start}&end=${end}`
        );
        setExpenses(allExpensesRes.data.expenses || []);

        const periodStart = user.budgetPeriodStart ? new Date(user.budgetPeriodStart) : null;
        const periodEnd = user.budgetPeriodEnd ? new Date(user.budgetPeriodEnd) : null;

        const { min: periodStartDate, max: periodEndDate } = getPeriodDateRange(
          user.budgetPeriod,
          periodStart,
          periodEnd
        );

        const finalEndDate = new Date(periodEndDate);
        finalEndDate.setHours(23, 59, 59, 999);

        const startOfDay = new Date(periodStartDate);
        startOfDay.setHours(0, 0, 0, 0);

        const endOfDay = new Date(periodEndDate);
        endOfDay.setHours(23, 59, 59, 999);

        const currentPeriodRes = await api.get(`/expenses/user/${token.id}`);
        setCurrentPeriodExpenses(currentPeriodRes.data || []);

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
  }, [loading]);

  // ✅ Fetch Historical Data Function
  // ✅ Fetch Historical Data Function - UPDATED
const fetchHistoricalData = async () => {
  if (!historyStartDate || !historyEndDate) {
    Alert.alert("⚠️ Missing Dates", "Please select both start and end dates.");
    return;
  }

  if (historyEndDate <= historyStartDate) {
    Alert.alert("⚠️ Invalid Range", "End date must be after start date.");
    return;
  }

  const token = await getToken();
  if (!token?.id) return;

  try {
    setLoadingHistory(true);
    setHasSearched(false);

    const endOfDay = new Date(historyEndDate);
    endOfDay.setHours(23, 59, 59, 999);

    const res = await api.get(`/expenses/history`, {
      params: {
        userId: token.id,
        start: historyStartDate.toISOString(),
        end: endOfDay.toISOString(),
      },
    });

    const fetchedExpenses = res.data.expenses || [];
    
    if (fetchedExpenses.length === 0) {
      setHistoricalData({
        expenses: [],
        totalSpent: 0,
        averageDaily: 0,
        topCategory: "None",
        categoryBreakdown: {},
        dailyTotals: [],
      });
      setHasSearched(true);
      return;
    }

    // Calculate analytics
    const totalSpent = fetchedExpenses.reduce((sum: number, e: Expense) => sum + e.amount, 0);
    
    const daysDiff = Math.ceil((endOfDay.getTime() - historyStartDate.getTime()) / (1000 * 60 * 60 * 24));
    const averageDaily = totalSpent / (daysDiff || 1);

    // Category breakdown
    const categoryBreakdown: { [key: string]: number } = {};
    fetchedExpenses.forEach((e: Expense) => {
      categoryBreakdown[e.category] = (categoryBreakdown[e.category] || 0) + e.amount;
    });

    const topCategory = Object.entries(categoryBreakdown).length > 0
      ? Object.entries(categoryBreakdown).sort((a, b) => b[1] - a[1])[0][0]
      : "None";

    // ✅ CHANGED: Daily totals using getLocalDateKey
    const dailyTotals: { [key: string]: number } = {};
    fetchedExpenses.forEach((e: Expense) => {
      const dateKey = getLocalDateKey(new Date(e.date)); // ✅ Use local date helper
      dailyTotals[dateKey] = (dailyTotals[dateKey] || 0) + e.amount;
    });

    const dailyTotalsArray = Object.entries(dailyTotals)
      .map(([date, amount]) => ({ date, amount }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    setHistoricalData({
      expenses: fetchedExpenses,
      totalSpent,
      averageDaily,
      topCategory,
      categoryBreakdown,
      dailyTotals: dailyTotalsArray,
    });
    
    setHasSearched(true);
    
  } catch (err) {
    console.error("❌ Failed to fetch historical data:", err);
    Alert.alert("❌ Error", "Failed to fetch historical data. Please try again.");
  } finally {
    setLoadingHistory(false);
  }
};

  // ✅ Quick Date Range Presets
  const setQuickRange = (type: 'week' | 'month' | '3months' | '6months' | 'year') => {
    const end = new Date();
    const start = new Date();
    
    switch (type) {
      case 'week':
        start.setDate(end.getDate() - 7);
        break;
      case 'month':
        start.setMonth(end.getMonth() - 1);
        break;
      case '3months':
        start.setMonth(end.getMonth() - 3);
        break;
      case '6months':
        start.setMonth(end.getMonth() - 6);
        break;
      case 'year':
        start.setFullYear(end.getFullYear() - 1);
        break;
    }
    
    setHistoryStartDate(start);
    setHistoryEndDate(end);
  };

  // ✅ Format date for input
  const formatDateInputValue = (date: Date | null): string => {
    if (!date) return '';
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

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

   const colorPalette = [
  '#6B1C23', // Maroon (primary)
  '#F4B942', // Gold (primary)
  '#2C5F2D', // Forest green
  '#1F4788', // Navy blue
  '#8B4513', // Saddle brown
  '#4A7C59', // Sage green
  '#5C4033', // Coffee brown
  '#6A5ACD', // Slate blue
  '#CD853F', // Peru/tan
  '#556B2F', // Olive green
];


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
        key = d.toISOString().slice(0, 10);
      } else if (budgetPeriod === "Monthly") {
        const weekStart = new Date(d);
        weekStart.setDate(d.getDate() - d.getDay());
        key = weekStart.toISOString().slice(0, 10);
      } else if (budgetPeriod === "Custom" && periodStart && periodEnd) {
        const diffDays =
          (new Date(periodEnd).getTime() - new Date(periodStart).getTime()) /
          (1000 * 60 * 60 * 24);

        if (diffDays > 31) {
          const weekStart = new Date(d);
          weekStart.setDate(d.getDate() - d.getDay());
          key = weekStart.toISOString().slice(0, 10);
        } else {
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
          return labels.slice(-14).map(label => {
            const date = new Date(label);
            return `${date.getMonth() + 1}/${date.getDate()}`;
          });
        }
      }
      return labels.slice(-8).map(label => {
        const date = new Date(label);
        return `${date.getMonth() + 1}/${date.getDate()}`;
      });
    }
    return labels;
  };

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

  const showSpendingHealthInfo = () => {
  if (Platform.OS === "web") {
    window.alert(`${spendingHealth.status}\n\n${spendingHealth.message}`);
  } else {
    Alert.alert(spendingHealth.status, spendingHealth.message);
  }
};


  const dailyBurnRate = daysRemaining > 0 ? remainingBudget / daysRemaining : 0;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      
      {/* Enhanced Header */}
      <LinearGradient
  colors={['#6B1C23', '#8B2635']} // ✅ Maroon gradient
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.push("/")}
          activeOpacity={0.7}
        >
          <View style={styles.backButtonCircle}>
            <Ionicons name="arrow-back" size={20} color="#e4e8efff" />
          </View>
        </TouchableOpacity>
        
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
          ? ['#6B1C23', '#8B2635']       // ✅ Surplus – maroon
          : ['#dc2626', '#ef4444']        // ❤️ Overspent – red (keep for alert)
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
            <Text style={[styles.remainingAmount, { color: remainingBudget >= 0 ? '#F4B942' : '#FEE2E2' }]}> {/* ✅ Gold when positive */}
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
                    backgroundColor: budgetUsedPercentage > 100 ? '#FEE2E2' : '#F4B942' // ✅ Gold progress bar
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

        {/* ✅ HISTORICAL ANALYTICS CARD */}
        <View style={styles.historicalCard}>
          <TouchableOpacity
            onPress={() => setHistoryExpanded(!historyExpanded)}
            style={styles.historicalHeader}
            activeOpacity={0.88}
          >
            <View style={styles.historicalHeaderLeft}>
              <LinearGradient
                colors={['#6366f1', '#3B82F6']}
                style={styles.historicalIcon}
              >
                <Ionicons name="time-outline" size={20} color="#FFFFFF" />
              </LinearGradient>
              <View>
                <Text style={styles.historicalTitle}>Historical Analytics</Text>
                <Text style={styles.historicalSubtitle}>
                  View past spending patterns & insights
                </Text>
              </View>
            </View>
            <Ionicons
              name={historyExpanded ? "chevron-up" : "chevron-down"}
              size={24}
              color="#3B82F6"
            />
          </TouchableOpacity>

          {historyExpanded && (
            <View style={styles.historicalContent}>
              {/* Quick Range Buttons */}
              <View style={styles.quickRangeContainer}>
                <Text style={styles.quickRangeLabel}>Quick Ranges:</Text>
                <ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.quickRangeScroll}
                >
                  {[
                    { label: 'Last Week', value: 'week' },
                    { label: 'Last Month', value: 'month' },
                    { label: 'Last 3 Months', value: '3months' },
                    { label: 'Last 6 Months', value: '6months' },
                    { label: 'Last Year', value: 'year' },
                  ].map((preset) => (
                    <TouchableOpacity
                      key={preset.value}
                      onPress={() => setQuickRange(preset.value as any)}
                      style={styles.quickRangeBtn}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.quickRangeBtnText}>{preset.label}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* Date Selection */}
              <View style={styles.dateSelectionContainer}>
                {/* Start Date */}
                <View style={styles.dateInputGroup}>
                  <Text style={styles.dateLabel}>Start Date</Text>
                  {Platform.OS === 'web' ? (
                    <View style={styles.dateInput}>
                      <Ionicons name="calendar-outline" size={18} color="#6366f1" style={{ marginRight: 8 }} />
                      <input
                        type="date"
                        style={{
                          fontSize: 14,
                          border: 'none',
                          outline: 'none',
                          backgroundColor: 'transparent',
                          flex: 1,
                          fontFamily: 'inherit',
                        }}
                        value={historyStartDate ? formatDateInputValue(historyStartDate) : ''}
                        onChange={(e) => setHistoryStartDate(e.target.value ? new Date(e.target.value) : null)}
                      />
                    </View>
                  ) : (
                    <>
                      <TouchableOpacity 
                        onPress={() => setShowStartPicker(true)} 
                        style={styles.dateInput}
                      >
                        <Ionicons name="calendar-outline" size={18} color="#6366f1" style={{ marginRight: 8 }} />
                        <Text style={styles.dateInputText}>
                          {historyStartDate ? historyStartDate.toLocaleDateString() : 'Select Start Date'}
                        </Text>
                      </TouchableOpacity>
                      {showStartPicker && (
                        <DateTimePicker
                          value={historyStartDate || new Date()}
                          mode="date"
                          display="default"
                          onChange={(event: any, date?: Date) => {
                            setShowStartPicker(false);
                            if (event.type === 'set' && date) setHistoryStartDate(date);
                          }}
                        />
                      )}
                    </>
                  )}
                </View>

                {/* End Date */}
                <View style={styles.dateInputGroup}>
                  <Text style={styles.dateLabel}>End Date</Text>
                  {Platform.OS === 'web' ? (
                    <View style={styles.dateInput}>
                      <Ionicons name="calendar-outline" size={18} color="#6366f1" style={{ marginRight: 8 }} />
                      <input
                        type="date"
                        style={{
                          fontSize: 14,
                          border: 'none',
                          outline: 'none',
                          backgroundColor: 'transparent',
                          flex: 1,
                          fontFamily: 'inherit',
                        }}
                        value={historyEndDate ? formatDateInputValue(historyEndDate) : ''}
                        onChange={(e) => setHistoryEndDate(e.target.value ? new Date(e.target.value) : null)}
                      />
                    </View>
                  ) : (
                    <>
                      <TouchableOpacity 
                        onPress={() => setShowEndPicker(true)} 
                        style={styles.dateInput}
                      >
                        <Ionicons name="calendar-outline" size={18} color="#6366f1" style={{ marginRight: 8 }} />
                        <Text style={styles.dateInputText}>
                          {historyEndDate ? historyEndDate.toLocaleDateString() : 'Select End Date'}
                        </Text>
                      </TouchableOpacity>
                      {showEndPicker && (
                        <DateTimePicker
                          value={historyEndDate || new Date()}
                          mode="date"
                          display="default"
                          minimumDate={historyStartDate || undefined}
                          onChange={(event: any, date?: Date) => {
setShowEndPicker(false);
if (event.type === 'set' && date) setHistoryEndDate(date);
}}
/>
)}
</>
)}
</View>
</View>
 {/* Analyze Button */}
          <TouchableOpacity
            onPress={fetchHistoricalData}
            style={styles.analyzeBtn}
            disabled={loadingHistory || !historyStartDate || !historyEndDate}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['#6366f1', '#3B82F6']}
              style={styles.analyzeBtnGradient}
            >
              {loadingHistory ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="analytics" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
                  <Text style={styles.analyzeBtnText}>Analyze Period</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>

          {/* Results */}
          {hasSearched && historicalData && (
            <View style={styles.historicalResults}>
              {historicalData.expenses.length === 0 ? (
                <View style={styles.emptyHistoryContainer}>
                  <Ionicons name="document-text-outline" size={64} color="#D1D5DB" />
                  <Text style={styles.emptyHistoryText}>No expenses found</Text>
                  <Text style={styles.emptyHistorySubtext}>
                    Try a different date range
                  </Text>
                </View>
              ) : (
                <>
                  {/* Summary Stats */}
                  <View style={styles.historyStatsGrid}>
                    <View style={styles.historyStatCard}>
                      <View style={[styles.historyStatIcon, { backgroundColor: '#EEF2FF' }]}>
                        <Ionicons name="cash-outline" size={20} color="#6366f1" />
                      </View>
                      <Text style={styles.historyStatValue}>
                        ₱{historicalData.totalSpent.toLocaleString()}
                      </Text>
                      <Text style={styles.historyStatLabel}>Total Spent</Text>
                    </View>

                    <View style={styles.historyStatCard}>
                      <View style={[styles.historyStatIcon, { backgroundColor: '#F0FDF4' }]}>
                        <Ionicons name="trending-up" size={20} color="#10b981" />
                      </View>
                      <Text style={styles.historyStatValue}>
                        ₱{historicalData.averageDaily.toFixed(0)}
                      </Text>
                      <Text style={styles.historyStatLabel}>Daily Average</Text>
                    </View>

                    <View style={styles.historyStatCard}>
                      <View style={[styles.historyStatIcon, { backgroundColor: '#FEF3C7' }]}>
                        <Ionicons name="pricetag" size={20} color="#f59e0b" />
                      </View>
                      <Text style={styles.historyStatValue}>
                        {historicalData.topCategory}
                      </Text>
                      <Text style={styles.historyStatLabel}>Top Category</Text>
                    </View>
                  </View>

                  {/* Trend Line Chart */}
                  {historicalData.dailyTotals.length > 0 && (
                    <View style={styles.historyChartSection}>
                      <Text style={styles.historyChartTitle}>📈 Spending Trend</Text>
                      <View style={styles.historyChartContainer}>
                        <LineChart
                          data={{
                            labels: historicalData.dailyTotals.slice(-14).map(d => {
                              const date = new Date(d.date);
                              return `${date.getMonth() + 1}/${date.getDate()}`;
                            }),
                            datasets: [{
                              data: historicalData.dailyTotals.slice(-14).map(d => d.amount),
                              color: () => '#6366f1',
                              strokeWidth: 3,
                            }],
                          }}
                          width={screenWidth - 80}
                          height={220}
                          yAxisLabel="₱"
                          fromZero
                          chartConfig={{
                            backgroundColor: '#FFFFFF',
                            backgroundGradientFrom: '#FFFFFF',
                            backgroundGradientTo: '#FFFFFF',
                            decimalPlaces: 0,
                            color: (opacity = 1) => `rgba(99,102,241,${opacity})`,
                            labelColor: (opacity = 1) => `rgba(75,85,99,${opacity})`,
                            propsForDots: {
                              r: "5",
                              strokeWidth: "2",
                              stroke: "#6366f1",
                              fill: "#FFFFFF",
                            },
                            propsForBackgroundLines: {
                              strokeDasharray: "",
                              stroke: "rgba(75,85,99,0.15)",
                              strokeWidth: 1,
                            },
                            fillShadowGradient: "#6366f1",
                            fillShadowGradientOpacity: 0.1,
                          }}
                          bezier
                          style={styles.historyChart}
                        />
                      </View>
                    </View>
                  )}

                  {/* Category Breakdown */}
                  {Object.keys(historicalData.categoryBreakdown).length > 0 && (
                    <View style={styles.historyCategorySection}>
                      <Text style={styles.historyChartTitle}>📊 Category Breakdown</Text>
                      {Object.entries(historicalData.categoryBreakdown)
                        .sort((a, b) => b[1] - a[1])
                        .map(([category, amount], index) => {
                          const percentage = (amount / historicalData.totalSpent) * 100;
                          return (
                            <View key={category} style={styles.historyCategoryItem}>
                              <View style={styles.historyCategoryLeft}>
                                <View 
                                  style={[
                                    styles.historyCategoryDot, 
                                    { backgroundColor: modernColors[index % modernColors.length] }
                                  ]} 
                                />
                                <Text style={styles.historyCategoryName}>{category}</Text>
                              </View>
                              <View style={styles.historyCategoryRight}>
                                <Text style={styles.historyCategoryAmount}>
                                  ₱{amount.toLocaleString()}
                                </Text>
                                <Text style={styles.historyCategoryPercent}>
                                  {percentage.toFixed(1)}%
                                </Text>
                              </View>
                            </View>
                          );
                        })}
                    </View>
                  )}
                </>
              )}
            </View>
          )}
        </View>
      )}
    </View>

    {/* Enhanced Summary Cards */}
    <View style={styles.summaryGrid}>
      <View style={styles.summaryCard}>
        {/* Keep existing summary card content */}
      </View>

      <View style={styles.summaryCard}>
        <LinearGradient
        colors={['#FFF8E7', '#FFF4D6']} // ✅ Light cream gradient
          style={styles.cardGradient}
        >
          <View style={styles.cardContent}>
          <View style={[styles.cardIconContainer, { backgroundColor: '#6B1C23' }]}> {/* ✅ Maroon */}
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
        colors={['rgba(107, 28, 35, 0.05)', 'rgba(139, 38, 53, 0.05)']} // ✅ Maroon gradient (light)
          style={styles.insightGradient}
        >
          <View style={styles.insightContent}>
            <View style={styles.insightIconContainer}>
              <LinearGradient
              colors={['#F4B942', '#D4A017']} // ✅ Gold gradient
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

    {/* Category Breakdown (Horizontal Bar) */}
    {pieData.length > 0 && (
      <View style={styles.chartSection}>
        <View style={styles.chartCard}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIconContainer}>
            <Ionicons name="bar-chart" size={18} color="#F4B942" /> {/* ✅ Gold */}
            </View>
            <Text style={styles.sectionTitle}>Category Breakdown</Text>
          </View>

          {(() => {
            const totalBudget = pieData.reduce(
              (sum, item) => sum + (Number(item.population) || 0),
              0
            );

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
                    <View key={index} style={{ marginBottom: 14 }}>
                      <View style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                        marginBottom: 4,
                      }}>
                        <Text style={{
                          fontSize: 13,
                          color: "#6B1C23", // ✅ Maroon
                          fontWeight: "600",
                        }}>
                          {item.name}
                        </Text>
                        <Text
                        style={{
                          fontSize: 13,
                          color: "#6B1C23", // ✅ Maroon
                          opacity: 0.7,
                        }}
                      >

                          ₱{amount.toLocaleString()} ({percent}%)
                        </Text>
                      </View>

                      <View style={{
                        height: 14,
                        backgroundColor: "#FFF8E7", // ✅ Light cream
                        borderRadius: 8,
                        overflow: "hidden",
                        borderWidth: 1,
                        borderColor: "#F4B94220", // ✅ Light gold border
                      }}
    >
                        <View style={{
                          height: "100%",
                          width: `${percent}%`,
                          backgroundColor: item.color,
                          borderRadius: 8,
                        }} />
                      </View>
                    </View>
                  );
                })}

                <View style={{ marginTop: 16, alignItems: "center" }}>
                  <Text style={{
                    fontSize: 13,
                    color: "#6B1C23",
                    fontWeight: "600",
                  }}>
                    Total Spending: ₱{totalBudget.toLocaleString()}
                  </Text>
                </View>
              </View>
            );
          })()}

          <View style={{
            marginTop: 12,
            backgroundColor: "#FFF8E7",
            borderLeftWidth: 3,
            borderLeftColor: "#F4B942",
            padding: 10,
            borderRadius: 8,
          }}>
            <Text style={{
              fontSize: 13,
              color: "#6B1C23",
              fontWeight: "600",
              marginBottom: 2,
            }}>
              💡 Tip:
            </Text>
          <Text style={{ fontSize: 12.5, color: "#6B1C23", lineHeight: 18, opacity: 0.8 }}> {/* ✅ Maroon */}
              This clean bar chart lets you compare categories more precisely.
              Longer bars represent higher spending.
            </Text>
          </View>
        </View>
      </View>
    )}

    {/* Overspending Behavior (Radar Chart) */}
    {Object.keys(categoryTotals).length > 0 && (
      <View style={styles.chartSection}>
        <View style={styles.chartCard}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIconContainer}>
          <Ionicons name="stats-chart" size={18} color="#F4B942" /> {/* ✅ Gold */}
            </View>
            <Text style={styles.sectionTitle}>Spending Behavior (Radar View)</Text>
          </View>

          {(() => {
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
                          stroke="#F4B94240"
                          strokeWidth="0.5"
                          fill="none"
                        />
                      );
                    })}

                    <Polygon
                      points={areaPoints}
                  fill="rgba(107, 28, 35, 0.25)" // ✅ Maroon with transparency
                      stroke="#6B1C23"
                      strokeWidth="2"
                    />

                    {radarData.map((d, i) => {
                      const [x, y] = polarToCartesian(i * angleSlice, d.value);
                      return (
                        <Circle
                          key={i}
                          cx={x}
                          cy={y}
                          r="3"
                          fill="#F4B942"
                          stroke="#fff"
                          strokeWidth="1"
                        />
                      );
                    })}

                    {radarData.map((d, i) => {
                      const [x, y] = polarToCartesian(i * angleSlice, maxValue * 1.15);
                      return (
                        <SvgText
                          key={i}
                          x={x}
                          y={y}
                          textAnchor="middle"
                          fontSize="11"
                          fill="#6B1C23"
                        >
                          {d.category}
                        </SvgText>
                      );
                    })}
                  </G>
                </Svg>

                <View style={{
                  marginTop: 10,
                  backgroundColor: "#FFF8E7",
                  borderLeftWidth: 3,
                  borderLeftColor: "#F4B942",
                  padding: 10,
                  borderRadius: 8,
                }}>
                  <Text style={{
                    fontSize: 13,
                    color: "#6B1C23",
                    fontWeight: "600",
                    marginBottom: 4,
                  }}>
                    💡 Tip: How to Read This Chart
                   </Text>


              <Text style={{ fontSize: 12.5, color: "#6B1C23", lineHeight: 18, opacity: 0.8 }}> {/* ✅ Maroon */}
                Each axis represents a spending category. The maroon shape shows your spending intensity —
                the farther a point is from the center, the higher your spending in that category.
              </Text>


              <Text
                style={{
                  fontSize: 12.5,
                  color: "#6B1C23", // ✅ Maroon
                  lineHeight: 18,
                  marginTop: 6,
                  opacity: 0.8,
                }}
              >
                A balanced, round shape means your budget is evenly distributed. A long spike in one
                direction shows a dominant category — usually where you're spending the most.
              </Text>


              <Text
                style={{
                  fontSize: 12.5,
                  color: "#6B1C23", // ✅ Maroon
                  lineHeight: 18,
                  marginTop: 6,
                  opacity: 0.8,
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

    {/* Adaptive Spending Pattern Chart */}
    {(() => {
      const getSpendingGrouping = () => {
        const grouped: { [key: string]: number } = {};

        currentPeriodExpenses.forEach((e) => {
          const d = new Date(e.date);
          let key = "";

          if (budgetPeriod === "Daily") {
            const hour = d.getHours();
            key = `${hour.toString().padStart(2, "0")}:00`;
          } else {
            key = getLocalDateKey(d);
          }

          grouped[key] = (grouped[key] || 0) + e.amount;
        });

        const labels = Object.keys(grouped).sort();
        return { labels, data: labels.map((k) => grouped[k]) };
      };

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

      const spendingData = getSpendingGrouping();
      const formattedLabels = formatLabels(spendingData.labels);
      const hasData = spendingData.data.length > 0;

      return hasData ? (
        <View style={styles.chartSection}>
          <View style={styles.chartCard}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionIconContainer}>
            <Ionicons name="trending-up" size={18} color="#F4B942" /> {/* ✅ Gold */}
              </View>
              <Text style={styles.sectionTitle}>Spending Pattern</Text>
            </View>

            <View style={{
              flexDirection: "row",
              justifyContent: "center",
              marginBottom: 16,
              gap: 20,
            }}>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <View style={{
                  width: 24,
                  height: 12,
                  backgroundColor: "#6B1C23",
                  borderRadius: 4,
                  marginRight: 6,
                }} />
                <Text style={{
                  fontSize: 13,
                  color: "#6B1C23",
                  fontWeight: "600",
                }}>
                  {budgetPeriod === "Daily" ? "Hourly Spending" : "Daily Spending"}
                </Text>
              </View>
            </View>

            <View style={[styles.chartContainer, { backgroundColor: "#FFFFFF" }]}>
              <LineChart
                data={{
                  labels: formattedLabels.slice(-14),
                  datasets: [{
                    data: spendingData.data.slice(-14).length > 0
                      ? spendingData.data.slice(-14)
                      : [0],
                    color: () => "#6B1C23",
                    strokeWidth: 3,
                  }],
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
              color: (opacity = 1) => `rgba(107, 28, 35, ${opacity})`, // ✅ Maroon with opacity
              labelColor: (opacity = 1) => `rgba(107, 28, 35, ${opacity})`, // ✅ Maroon labels
              propsForDots: {
                r: "5",
                strokeWidth: "2",
                stroke: "#F4B942", // ✅ Gold dot border
                fill: "#FFFFFF",
              },
              propsForBackgroundLines: {
                strokeDasharray: "",
                stroke: "rgba(244, 185, 66, 0.2)", // ✅ Light gold grid lines
                strokeWidth: 1,
              },
              fillShadowGradient: "#6B1C23", // ✅ Maroon gradient
              fillShadowGradientOpacity: 0.1,
            }}
            bezier
            style={{
              borderRadius: 16,
              backgroundColor: "#FFFFFF",
            }}

              />

              <View style={{
                marginTop: 18,
                backgroundColor: "#FFF8E7",
                borderLeftWidth: 3,
                borderLeftColor: "#F4B942",
                padding: 12,
                borderRadius: 8,
              }}>
                <Text style={{
                  fontSize: 13,
                  color: "#6B1C23",
                  fontWeight: "600",
                  marginBottom: 4,
                }}>
                  💡 Tip: Understanding Your Spending Pattern
                </Text>
            <Text style={{ fontSize: 12.5, color: "#6B1C23", lineHeight: 18, opacity: 0.8 }}> {/* ✅ Maroon */}
                  {budgetPeriod === "Daily"
                    ? "Each point shows how much you spent per hour today. Peaks mean times when you spent the most."
                    : "Each point shows your total spending for that day. Watch for spikes—they mark days when you spent more than usual."}
                </Text>
              </View>

                <Text style={{ fontSize: 12.5, color: "#6B1C23", lineHeight: 18, marginTop: 6, opacity: 0.8 }}> {/* ✅ Maroon */}

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
            <Ionicons name="trending-up" size={18} color="#F4B942" /> {/* ✅ Gold */}
              </View>
              <Text style={styles.sectionTitle}>Spending Pattern</Text>
            </View>
            <View style={styles.emptyChartContainer}>
          <Ionicons name="bar-chart-outline" size={48} color="#F4B94240" /> {/* ✅ Light gold */}
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
        <Ionicons name="list" size={18} color="#F4B942" /> {/* ✅ Gold */}
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
marginTop: 5,
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
// ✅ NEW HISTORICAL ANALYTICS STYLES
historicalCard: {
backgroundColor: '#FFFFFF',
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
historicalHeader: {
flexDirection: 'row',
alignItems: 'center',
justifyContent: 'space-between',
padding: 20,
backgroundColor: '#FAFAFA',
},
historicalHeaderLeft: {
flexDirection: 'row',
alignItems: 'center',
flex: 1,
},
historicalIcon: {
width: 44,
height: 44,
borderRadius: 12,
justifyContent: 'center',
alignItems: 'center',
marginRight: 14,
},
historicalTitle: {
fontSize: 17,
fontWeight: '700',
color: '#111827',
marginBottom: 2,
},
historicalSubtitle: {
fontSize: 13,
color: '#6B7280',
},
historicalContent: {
padding: 20,
paddingTop: 16,
},
quickRangeContainer: {
marginBottom: 20,
},
quickRangeLabel: {
fontSize: 14,
fontWeight: '600',
color: '#374151',
marginBottom: 10,
},
quickRangeScroll: {
gap: 8,
paddingRight: 20,
},
quickRangeBtn: {
backgroundColor: '#EEF2FF',
paddingHorizontal: 16,
paddingVertical: 8,
borderRadius: 20,
borderWidth: 1,
borderColor: '#C7D2FE',
},
quickRangeBtnText: {
fontSize: 13,
fontWeight: '600',
color: '#3B82F6',
},
dateSelectionContainer: {
flexDirection: isMobile ? 'column' : 'row',
gap: 12,
marginBottom: 16,
},
dateInputGroup: {
flex: 1,
},
dateLabel: {
fontSize: 13,
fontWeight: '600',
color: '#374151',
marginBottom: 6,
},
dateInput: {
flexDirection: 'row',
alignItems: 'center',
backgroundColor: '#F9FAFB',
borderWidth: 1,
borderColor: '#D1D5DB',
borderRadius: 12,
paddingHorizontal: 12,
paddingVertical: 12,
},
dateInputText: {
fontSize: 14,
color: '#111827',
flex: 1,
},
analyzeBtn: {
marginBottom: 20,
borderRadius: 14,
overflow: 'hidden',
shadowColor: '#3B82F6',
shadowOffset: { width: 0, height: 4 },
shadowOpacity: 0.3,
shadowRadius: 8,
elevation: 6,
},
analyzeBtnGradient: {
flexDirection: 'row',
alignItems: 'center',
justifyContent: 'center',
paddingVertical: 14,
paddingHorizontal: 20,
},
analyzeBtnText: {
fontSize: 16,
fontWeight: '700',
color: '#FFFFFF',
},
historicalResults: {
marginTop: 8,
},
emptyHistoryContainer: {
alignItems: 'center',
paddingVertical: 50,
},
emptyHistoryText: {
fontSize: 18,
fontWeight: '600',
color: '#6B7280',
marginTop: 16,
},
emptyHistorySubtext: {
fontSize: 14,
color: '#9CA3AF',
marginTop: 6,
},
historyStatsGrid: {
flexDirection: 'row',
gap: 12,
marginBottom: 24,
},
historyStatCard: {
flex: 1,
backgroundColor: '#F9FAFB',
borderRadius: 14,
padding: 14,
alignItems: 'center',
},
historyStatIcon: {
width: 40,
height: 40,
borderRadius: 10,
justifyContent: 'center',
alignItems: 'center',
marginBottom: 10,
},
historyStatValue: {
fontSize: 16,
fontWeight: '700',
color: '#111827',
marginBottom: 4,
},
historyStatLabel: {
fontSize: 12,
color: '#6B7280',
textAlign: 'center',
},
historyChartSection: {
marginBottom: 24,
},
historyChartTitle: {
fontSize: 16,
fontWeight: '700',
color: '#111827',
marginBottom: 14,
},
historyChartContainer: {
alignItems: 'center',
backgroundColor: '#FFFFFF',
borderRadius: 16,
overflow: 'hidden',
},
historyChart: {
borderRadius: 16,
marginVertical: 8,
},
historyCategorySection: {
backgroundColor: '#F9FAFB',
borderRadius: 14,
padding: 16,
},
historyCategoryItem: {
flexDirection: 'row',
justifyContent: 'space-between',
alignItems: 'center',
paddingVertical: 12,
borderBottomWidth: 1,
borderBottomColor: '#E5E7EB',
},
historyCategoryLeft: {
flexDirection: 'row',
alignItems: 'center',
flex: 1,
},
historyCategoryDot: {
width: 10,
height: 10,
borderRadius: 5,
marginRight: 10,
},
historyCategoryName: {
fontSize: 14,
fontWeight: '600',
color: '#374151',
},
historyCategoryRight: {
alignItems: 'flex-end',
},
historyCategoryAmount: {
fontSize: 14,
fontWeight: '700',
color: '#111827',
},
historyCategoryPercent: {
fontSize: 11,
color: '#6B7280',
marginTop: 2,
},
// Existing styles continue...
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
historicalCard: {
...styles.historicalCard,
marginHorizontal: 14,
},
historyStatsGrid: {
...styles.historyStatsGrid,
flexDirection: 'column',
},
historyCategoryItem: {
...styles.historyCategoryItem,
paddingVertical: 10,
},
});
}