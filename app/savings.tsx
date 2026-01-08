// @ts-nocheck
import React, { useEffect, useState } from "react";
import { Ionicons } from '@expo/vector-icons';
import NetInfo from "@react-native-community/netinfo";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getCachedData, queueOfflineChange, syncOfflineChanges } from "../lib/offlineCache";

import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Modal,
  TextInput,
  Pressable,
  StyleSheet,
  Dimensions,
  StatusBar,
  Animated,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { Platform } from "react-native";
let DateTimePicker: any = () => null;
if (Platform.OS !== "web") {
  DateTimePicker = require("@react-native-community/datetimepicker").default;
  
}

import Svg, { Circle, Defs, LinearGradient as SvgLinearGradient, Stop } from "react-native-svg";
import { MaterialIcons } from "@expo/vector-icons";
import { getToken } from "../lib/auth";
import { LineChart, BarChart } from "react-native-chart-kit";

import { LinearGradient } from "expo-linear-gradient";

import api from "../lib/api";

const { width, height } = Dimensions.get("window");
const isWeb = width > 768;
const isMobile = Platform.OS === "ios" || Platform.OS === "android";
const isSmallScreen = width < 400; // typical phone width

type SavingsGoal = {
  _id: string;
  userId: string;
  name: string;
  targetAmount: number;
  savedAmount: number;
  startDate: string;
  endDate: string;
  interval: "Daily" | "Weekly" | "Monthly";
  notes?: string;
  createdAt: string;
  updatedAt: string;
  status?: "active" | "warning" | "completed" | "failed"; // ✅ new
  history?: { date: string; amount: number }[];
};

const showAlert = (title: string, message: string) => {
  if (Platform.OS === "web") {
    // ✅ Works in web builds
    window.alert(`${title}\n\n${message}`);
  } else {
    // ✅ Works in Android/iOS
    Alert.alert(title, message);
  }
};

// 🎨 Blue-compatible gradient palette - Harmonious with blue theme
const gradients = [
    ["#6B1C23", "#4A1217"], // Maroon
  ["#F4B942", "#C9962F"], // Gold
  ["#2C5F2D", "#1F4420"], // Forest Green
  ["#1F4788", "#163363"], // Navy Blue
  ["#8B4513", "#5F2F0D"], // Saddle Brown
  ["#4A7C59", "#355A41"], // Sage Green
  ["#5C4033", "#3E2B22"], // Coffee Brown
  ["#6A5ACD", "#4A3FA1"], // Slate Blue
  ["#CD853F", "#9F642F"], // Peru / Tan
  ["#556B2F", "#3E4F22"], // Olive Green
];

// 🎨 Blue-toned accent colors for circles and elements
const accentColors = [
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



export default function SavingsGoals() {

 const calculateEndDate = (
    start: Date,
    duration: number,
    unit: "days" | "weeks" | "months"
  ) => {
    const newDate = new Date(start);
    if (unit === "days") newDate.setDate(newDate.getDate() + duration);
    if (unit === "weeks") newDate.setDate(newDate.getDate() + duration * 7);
    if (unit === "months") newDate.setMonth(newDate.getMonth() + duration);
    return newDate;
  };


const [isCompletedGoalsExpanded, setIsCompletedGoalsExpanded] = useState(false);
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [showAddGoalModal, setShowAddGoalModal] = useState(false);
  const [showAddSavingsModal, setShowAddSavingsModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [editStartDate, setEditStartDate] = useState("");
  const [editEndDate, setEditEndDate] = useState("");
  const [lockEndDate, setLockEndDate] = useState(true);
const [showDatePicker, setShowDatePicker] = useState(false);
const [showEditEndPicker, setShowEditEndPicker] = useState(false);


  const router = useRouter();
  
  // Form states
  const [goalName, setGoalName] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [duration, setDuration] = useState("");
  const [durationUnit, setDurationUnit] = useState<"days" | "weeks" | "months">("days");
  const [notes, setNotes] = useState("");
  const [selectedGoal, setSelectedGoal] = useState<SavingsGoal | null>(null);
  const [savingsAmount, setSavingsAmount] = useState("");

  const [addStartDate, setAddStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [addEndDate, setAddEndDate] = useState(
    calculateEndDate(new Date(), Number(1), "days").toISOString().split("T")[0]
  );
  const [lockAddEndDate, setLockAddEndDate] = useState(true);

  // Animation values
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(-50));

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  useEffect(() => {
  const syncIfOnline = async () => {
    const net = await NetInfo.fetch();
    if (net.isConnected) {
      await syncOfflineChanges();
      fetchGoals();
    }
  };
  syncIfOnline();
}, []);


 const fetchGoals = async () => {
  const token = await getToken();
  if (!token?.id) return;

  try {
    const net = await NetInfo.fetch();
    let data = [];

    if (net.isConnected) {
      const res = await api.get(`/savings-goals/${token.id}`);
      data = res.data;
      await AsyncStorage.setItem(`savingsGoals_${token.id}`, JSON.stringify(data));
    } else {
      console.log("📦 Offline mode: using cached savings goals");
      const cached = await AsyncStorage.getItem(`savingsGoals_${token.id}`);
      data = cached ? JSON.parse(cached) : [];
    }

    const enriched = data.map((g) => {
      const now = new Date();
      const end = new Date(g.endDate);
      const progress = g.targetAmount > 0 ? (g.savedAmount / g.targetAmount) * 100 : 0;
      const remainingMs = end.getTime() - now.getTime();

      let status = "active";
      if (progress >= 100) status = "completed";
      else if (remainingMs <= 0) status = "failed";
      else if (remainingMs <= 60 * 60 * 1000) status = "warning";

      return { ...g, progress, status };
    });

    setGoals(enriched);
  } catch (err) {
    console.error("⚠️ Failed to fetch savings goals:", err);
    const cached = await AsyncStorage.getItem(`savingsGoals_${token.id}`);
    if (cached) setGoals(JSON.parse(cached));
  }
};


// 🧮 Categorize goals for accurate summary
const completedGoals = goals.filter((g) => g.status === "completed");
const failedGoals = goals.filter((g) => g.status === "failed");
const activeGoals = goals.filter(g => g.status === "active");


  useEffect(() => {
    fetchGoals();
  }, []);

  useEffect(() => {
    if (selectedGoal) {
      setGoalName(selectedGoal.name);
      setTargetAmount(selectedGoal.targetAmount.toString());
      setNotes(selectedGoal.notes || "");
      setDuration(
        Math.round(
          (new Date(selectedGoal.endDate).getTime() -
            new Date(selectedGoal.startDate).getTime()) /
            (1000 * 60 * 60 * 24)
        ).toString()
      );
      setDurationUnit("days");
      setEditStartDate(selectedGoal.startDate.split("T")[0]);
      setEditEndDate(selectedGoal.endDate.split("T")[0]);
    }
  }, [selectedGoal]);

  const buildDailyHistory = (goal: SavingsGoal) => {
    const start = new Date(goal.startDate);
    const end = new Date(goal.endDate);

    const history = (goal.history || []).sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    const result: { date: string; amount: number }[] = [];
    let currentAmount = 0;
    let historyIndex = 0;

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      if (
        historyIndex < history.length &&
        new Date(history[historyIndex].date).toDateString() === d.toDateString()
      ) {
        currentAmount += history[historyIndex].amount;
        historyIndex++;
      }
      result.push({ date: d.toISOString().split("T")[0], amount: currentAmount });
    }
    return result;
  };

  const handleCreateGoal = async () => {
  const token = await getToken();
  if (!token?.id) return;

  if (!goalName || !targetAmount || !duration) {
    alert("⚠️ Please enter goal name, target amount, and duration.");
    return;
  }

  try {
    const startDate = new Date();
    const endDate = calculateEndDate(startDate, Number(duration), durationUnit);

    const newGoal = {
      userId: token.id,
      name: goalName,
      targetAmount: Number(targetAmount),
      savedAmount: 0,
      interval: "Daily",
      startDate,
      endDate,
      duration: Number(duration),
      durationUnit,
      notes,
    };

    console.log("📤 Sending new goal:", newGoal);

    const net = await NetInfo.fetch();

    if (net.isConnected) {
      await api.post(`/savings-goals`, newGoal);
      showAlert("✅ Success", "Goal created!");
    } else {
      await queueOfflineChange("savings", {
        url: "/savings-goals",
        method: "POST",
        payload: newGoal,
      });
      showAlert("📴 Offline", "Goal saved locally — will sync when you're online.");
    }

    setShowAddGoalModal(false);
    setGoalName("");
    setTargetAmount("");
    setDuration("");
    setNotes("");
    fetchGoals();

  } catch (err) {
    console.error("❌ Failed to create goal:", err);
    showAlert("❌ Error", "Failed to save goal.");
  }
};

const handleAddSavings = async () => {
  if (!selectedGoal) return;

  try {
    const token = await getToken();
    if (!token?.id) {
      showAlert("⚠️ Error", "User not logged in!");
      return;
    }

    if (!savingsAmount || Number(savingsAmount) <= 0) {
      showAlert("⚠️ Invalid Input", "Please enter a valid savings amount.");
      return;
    }

    const addAmount = Number(savingsAmount);
    const current = selectedGoal.savedAmount || 0;
    const target = selectedGoal.targetAmount || 0;

    if (current + addAmount > target) {
      const remaining = target - current;
      showAlert(
        "⚠️ Over Target",
        `You can only add up to ₱${remaining.toLocaleString()} to reach your goal of ₱${target.toLocaleString()}.`
      );
      return;
    }

    const payload = {
      userId: token.id,
      amount: addAmount,
      note: `Deposit to ${selectedGoal.name}`,
    };

    const net = await NetInfo.fetch();

    let res;
    if (net.isConnected) {
      res = await api.put(`/savings-goals/${selectedGoal._id}/save`, payload);
    } else {
      await queueOfflineChange("savings", {
        url: `/savings-goals/${selectedGoal._id}/save`,
        method: "PUT",
        payload,
      });
      showAlert("📴 Offline", "Savings queued — will sync when you're online.");
      return;
    }

    // ✅ Handle overspent check
    if (res.data?.overspent) {
      showAlert(
        "⚠️ Exceeds Budget",
        `This ₱${addAmount.toLocaleString()} deposit exceeds your current budget but will still be recorded.`
      );
    } else {
      showAlert("✅ Success", "Savings added successfully!");
    }

    // ✅ Refresh goals
    const updated = await api.get(`/savings-goals/${token.id}`);
    const updatedGoal = updated.data.find(
      (g: SavingsGoal) => g._id === selectedGoal._id
    );

    if (updatedGoal) {
      const progress = Math.min(
        (updatedGoal.savedAmount / updatedGoal.targetAmount) * 100,
        100
      );
      console.log(
        `✅ Savings updated for ${updatedGoal.name}. Progress: ${progress.toFixed(1)}%`
      );

      if (progress >= 100 && updatedGoal.status !== "completed") {
        await api.put(`/savings-goals/${selectedGoal._id}`, { status: "completed" });
        console.log(`🎉 Goal "${updatedGoal.name}" marked as completed!`);
      }
    }

    setSavingsAmount("");
    setShowAddSavingsModal(false);
    fetchGoals();

  } catch (err) {
    console.error("❌ Failed to add savings:", err);
    showAlert("❌ Error", "Failed to add savings. Please try again.");
  }
};



  const handleDeleteGoal = async (goalId: string) => {
    const confirmed =
      Platform.OS === "web"
        ? window.confirm("Are you sure you want to delete this goal?")
        : true;
    if (!confirmed) return;

    try {
      await api.delete(`/savings-goals/${goalId}`);
      alert("✅ Goal deleted!");
      fetchGoals();
    } catch (err) {
      console.error("❌ Failed to delete goal:", err);
      alert("❌ Failed to delete goal");
    }
  };

  const handleEditGoal = async () => {
    if (!selectedGoal) return;
    try {
      const token = await getToken();
      if (!token?.id) return;

      await api.put(`/savings-goals/${selectedGoal._id}`, {
        name: goalName,
        targetAmount: Number(targetAmount),
        notes,
        duration: Number(duration),
        durationUnit,
        startDate: editStartDate,
        endDate: editEndDate,
      });

      alert("✅ Goal updated!");
      setShowEditModal(false);
      fetchGoals();
    } catch (err) {
      console.error("❌ Failed to update goal:", err);
      alert("❌ Failed to update goal");
    }
  };

  const formatTitleCase = (str: string) =>
    str.replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());

  const getInsights = (goal: SavingsGoal) => {
    const totalDays =
      (new Date(goal.endDate).getTime() - new Date(goal.startDate).getTime()) /
      (1000 * 60 * 60 * 24);
    if (totalDays <= 0) return { daily: 0, weekly: 0, monthly: 0, totalDays: 0 };

    const remaining = goal.targetAmount - goal.savedAmount;
    return {
      daily: remaining / totalDays,
      weekly: remaining / (totalDays / 7),
      monthly: remaining / (totalDays / 30),
      totalDays,
    };
  };

  const formatDuration = (days: number) => {
  const count = Math.round(days);
  if (count === 1) return "1 day";
  if (count % 7 === 0 && count >= 7) {
    const weeks = count / 7;
    return `${weeks} ${weeks === 1 ? "week" : "weeks"}`;
  }
  if (count % 30 === 0 && count >= 30) {
    const months = count / 30;
    return `${months} ${months === 1 ? "month" : "months"}`;
  }
  return `${count} days`;
};

  // 🎨 Enhanced Progress Circle with gradient and animation
  const ProgressCircle = ({ 
    progress, 
    color, 
    saved, 
    target 
  }: { 
    progress: number; 
    color: string; 
    saved: number; 
    target: number; 
  }) => {
    const radius = 42;
    const strokeWidth = 8;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (progress / 100) * circumference;

    // ✅ Compute cumulative history even if missing or incomplete
const getCumulativeHistory = (goal) => {
  if (!goal?.history || goal.history.length === 0) {
    // fallback (single point)
    return [{ date: goal?.startDate || new Date().toISOString(), amount: 0 }];
  }

  let cumulative = 0;
  return goal.history.map((h) => {
    cumulative += h.amount;
    return { ...h, amount: cumulative };
  });
};

    return (
      
      <View style={styles.progressContainer}>
        
       <Svg width={100} height={100}>
  <Defs>
    {/* @ts-ignore */}
    <SvgLinearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <Stop offset="0%" stopColor={color} stopOpacity={1} />
      <Stop offset="100%" stopColor={color} stopOpacity={0.6} />
    </SvgLinearGradient>
  </Defs>

  <Circle
    cx="50"
    cy="50"
    r={radius}
    stroke="rgba(255,255,255,0.3)"
    strokeWidth={strokeWidth}
    fill="none"
  />
  <Circle
    cx="50"
    cy="50"
    r={radius}
    stroke="url(#progressGradient)"
    strokeWidth={strokeWidth}
    strokeDasharray={circumference}
    strokeDashoffset={strokeDashoffset}
    strokeLinecap="round"
    fill="none"
    transform="rotate(-90 50 50)"
  />
</Svg>

        <View style={styles.circleTextContainer}>
          <Text style={styles.circlePercentage}>{progress.toFixed(0)}%</Text>
          <Text style={styles.circleAmount}>₱{saved.toLocaleString()}</Text>
        </View>
      </View>
    );
  };

  const totalSaved = goals.reduce((sum, g) => sum + g.savedAmount, 0);

  return (
    <LinearGradient colors={["#f8fafc", "#e2e8f0"]} style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />
      
      {/* Header */}
{/* 🌊 Enhanced Header Section */}
<LinearGradient
   colors={['#6B1C23', '#8B2635']}
  start={{ x: 0, y: 0 }}
  end={{ x: 1, y: 1 }}
  style={styles.headerContainer}
>
  {/* Navigation Row */}
  <View style={[styles.headerRow, Platform.OS === 'web' && styles.headerRowWeb]}>
    {Platform.OS == 'web' && (
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => router.back()}
        activeOpacity={0.8}
      >
        <Ionicons name="arrow-back" size={24} color="#F4B942" />
      </TouchableOpacity>
    )}
    <Text style={styles.mainHeading}>Savings Goals</Text>
  </View>

  {/* Subtitle */}
  <Text style={styles.subHeading}>
    Track your progress and achieve your financial dreams
  </Text>

{/* 💰 Total Saved Section */}
  <View style={[styles.totalSavedContainer, { flexDirection: 'row', alignItems: 'center' }]}>
  <Text style={styles.totalSavedLabel}>Total Saved: </Text>
  <Text style={styles.totalSavedValue}>₱{totalSaved.toLocaleString()}</Text>
</View>

  {/* Stats Row */}
  <View style={styles.statsRow}>
    <View style={styles.statItem}>
      <Text style={styles.statNumber}>{goals.length}</Text>
      <Text style={styles.statLabel}>Total Goals</Text>
    </View>
    <View style={styles.statDivider} />
    <View style={styles.statItem}>
      <Text style={styles.statNumber}>{activeGoals.length}</Text>
      <Text style={styles.statLabel}>Active</Text>
    </View>
    <View style={styles.statDivider} />
    <View style={styles.statItem}>
      <Text style={styles.statNumber}>{completedGoals.length}</Text>
      <Text style={styles.statLabel}>Completed</Text>
    </View>
    <View style={styles.statDivider} />
    <View style={styles.statItem}>
      <Text style={styles.statNumber}>{failedGoals.length}</Text>
      <Text style={styles.statLabel}>Failed</Text>
    </View>
  </View>

  {/* Wave Divider */}
  <View style={styles.waveContainer}>
    <View style={styles.wave} />
  </View>
</LinearGradient>

      {/* Goals Grid */}
      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        <Text style={styles.sectionTitle}>Your Goals</Text>
        
        <View style={[styles.goalsWrapper, isWeb && styles.goalsWrapperWeb]}>
         {activeGoals.map((goal, i) => {

  const progress = Math.min((goal.savedAmount / goal.targetAmount) * 100, 100);
  const insights = getInsights(goal);
  const colors = gradients[i % gradients.length];
  const accentColor = accentColors[i % accentColors.length];
  // ✅ Dynamic color based on goal.status
  const circleColor =
    goal.status === "completed"
      ? "#16a34a" // green
      : goal.status === "failed"
      ? "#dc2626" // red
      : goal.status === "warning"
      ? "#f59e0b" // amber
      : accentColor;

  // ✅ Disable touch on failed goals
  const isDisabled = goal.status === "failed";

  return (
    <Animated.View
      key={goal._id}
      style={{
        opacity: fadeAnim,
        transform: [{ translateY: slideAnim }],
      }}
    >
      <LinearGradient
        // @ts-ignore
        colors={colors}
        style={[
          styles.goalCard,
          isWeb && styles.goalCardWeb,
          isDisabled && { opacity: 0.6 },
        ]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        {/* Menu button */}
        <TouchableOpacity
          style={styles.menuButton}
          onPress={(e) => {
            e.stopPropagation();
            setMenuOpenId(menuOpenId === goal._id ? null : goal._id);
          }}
        >
          <View style={styles.menuButtonBackground}>
            <MaterialIcons name="more-horiz" size={20} color="#374151" />
          </View>
        </TouchableOpacity>

        {/* Dropdown menu */}
        {menuOpenId === goal._id && (
          <View style={styles.dropdownMenu}>
            <TouchableOpacity
              style={styles.dropdownItem}
              onPress={() => {
                setMenuOpenId(null);
                setSelectedGoal(goal);
                setShowEditModal(true);
              }}
            >
              <MaterialIcons name="edit" size={18} color="#374151" />
              <Text style={styles.dropdownText}>Edit</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.dropdownItem}
              onPress={() => {
                setMenuOpenId(null);
                handleDeleteGoal(goal._id);
              }}
            >
              <MaterialIcons name="delete" size={18} color="#DC2626" />
              <Text style={[styles.dropdownText, { color: "#DC2626" }]}>
                Delete
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Main card content */}
        <TouchableOpacity
          activeOpacity={isDisabled ? 1 : 0.8}
          disabled={isDisabled}
          style={styles.cardContent}
          onPress={() => {
            if (!isDisabled) {
              setSelectedGoal(goal);
              setShowAddSavingsModal(true);
            }
          }}
        >
          <View style={styles.cardLeft}>
            <Text style={styles.goalName}>{goal.name}</Text>

            <View style={styles.dateContainer}>
              <MaterialIcons name="schedule" size={14} color="#64748b" />
             <Text style={styles.goalDuration}>
              {formatDuration(insights.totalDays)} remaining
            </Text>
            </View>

            <Text style={styles.goalSaved}>
              ₱{goal.savedAmount.toLocaleString()}
            </Text>
            <Text style={styles.goalTarget}>
              of ₱{goal.targetAmount.toLocaleString()}
            </Text>

            {/* Progress bar */}
            <View style={styles.progressBarContainer}>
              <View style={styles.progressBarBackground}>
                <LinearGradient
                  colors={[circleColor, circleColor + "80"]}
                  style={[
                    styles.progressBarFill,
                    { width: `${Math.min(progress, 100)}%` },
                  ]}
                />
              </View>
              <Text style={styles.progressText}>{progress.toFixed(1)}%</Text>
            </View>

            {/* Insights */}
            <View style={styles.insightBox}>
              {insights.totalDays >= 1 && (
                <View style={styles.insightItem}>
                  <MaterialIcons name="today" size={12} color="#64748b" />
                  <Text style={styles.insightText}>
                    ₱{insights.daily.toFixed(0)}/day
                  </Text>
                </View>
              )}
              {insights.totalDays >= 7 && (
                <View style={styles.insightItem}>
                  <MaterialIcons name="date-range" size={12} color="#64748b" />
                  <Text style={styles.insightText}>
                    ₱{insights.weekly.toFixed(0)}/week
                  </Text>
                </View>
              )}
            </View>

            {/* ⏰ 1-hour left edit reminder */}
            {goal.status === "warning" && (
              <TouchableOpacity
                style={{
                  marginTop: 6,
                  backgroundColor: "#f59e0b",
                  paddingHorizontal: 8,
                  paddingVertical: 4,
                  borderRadius: 6,
                  alignSelf: "flex-start",
                }}
                onPress={() => {
                  setSelectedGoal(goal);
                  setShowEditModal(true);
                }}
              >
                <Text
                  style={{
                    color: "white",
                    fontWeight: "600",
                    fontSize: 12,
                  }}
                >
                  ⏰ 1 hr left — Edit Goal
                </Text>
              </TouchableOpacity>
            )}

            {/* ❌ Failed Label */}
            {goal.status === "failed" && (
              <Text
                style={{
                  marginTop: 6,
                  color: "#dc2626",
                  fontWeight: "600",
                  fontSize: 12,
                }}
              >
                ❌ Goal Expired
              </Text>
            )}
          </View>

          {/* ✅ Circle now uses dynamic color */}
          <ProgressCircle
            progress={progress}
            color={circleColor}
            saved={goal.savedAmount}
            target={goal.targetAmount}
          />
        </TouchableOpacity>
      </LinearGradient>
    </Animated.View>
  );
})}

        </View>

{/* 🏆 Premium Archive Section with Modern Design */}
{goals.some((g) => g.status === "completed" || g.status === "failed") && (
  <View style={{ marginTop: 24, marginHorizontal: 20 }}>
    {/* Sleek Collapsible Header */}
    <TouchableOpacity
      onPress={() => setIsCompletedGoalsExpanded(!isCompletedGoalsExpanded)}
      activeOpacity={0.8}
    >
      <LinearGradient
        colors={['#FFFFFF', '#F8FAFC']}
        style={{
          borderRadius: 24,
          padding: 24,
          shadowColor: '#1E293B',
          shadowOpacity: 0.06,
          shadowRadius: 20,
          shadowOffset: { width: 0, height: 4 },
          elevation: 3,
          borderWidth: 1,
          borderColor: '#E2E8F0',
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
            {/* Icon */}
            <View style={{
              width: 48,
              height: 48,
              borderRadius: 16,
              backgroundColor: '#F0F9FF',
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: 16,
            }}>
              <Ionicons name="folder-open" size={24} color="#0EA5E9" />
            </View>
            
            {/* Text */}
            <View>
              <Text style={{
                fontSize: 18,
                fontWeight: '700',
                color: '#0F172A',
                marginBottom: 2,
              }}>
                Archive
              </Text>
              <Text style={{
                fontSize: 13,
                color: '#64748B',
                fontWeight: '500',
              }}>
                {goals.filter((g) => g.status === "completed" || g.status === "failed").length} saved {goals.filter((g) => g.status === "completed" || g.status === "failed").length === 1 ? 'goal' : 'goals'}
              </Text>
            </View>
          </View>

          {/* Chevron */}
          <View style={{
            width: 32,
            height: 32,
            borderRadius: 10,
            backgroundColor: '#F1F5F9',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <Ionicons
              name={isCompletedGoalsExpanded ? "chevron-up" : "chevron-down"}
              size={20}
              color="#475569"
            />
          </View>
        </View>
      </LinearGradient>
    </TouchableOpacity>

    {/* Collapsible Content */}
    {isCompletedGoalsExpanded && (
      <View style={{ marginTop: 16 }}>
        {/* ✅ Completed Goals */}
        {goals.filter((g) => g.status === "completed").length > 0 && (
          <View style={{ marginBottom: 16 }}>
            {/* Section Header */}
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingHorizontal: 4,
              marginBottom: 12,
            }}>
              <View style={{
                width: 4,
                height: 20,
                backgroundColor: '#10B981',
                borderRadius: 2,
                marginRight: 10,
              }} />
              <Text style={{
                fontSize: 16,
                fontWeight: '700',
                color: '#0F172A',
                flex: 1,
              }}>
                Completed Goals
              </Text>
              <View style={{
                backgroundColor: '#D1FAE5',
                paddingHorizontal: 10,
                paddingVertical: 4,
                borderRadius: 8,
              }}>
                <Text style={{
                  fontSize: 12,
                  fontWeight: '700',
                  color: '#065F46',
                }}>
                  {goals.filter((g) => g.status === "completed").length}
                </Text>
              </View>
            </View>

            {/* Goal Cards */}
            {goals
              .filter((g) => g.status === "completed")
              .map((goal) => {
                const progress = (goal.savedAmount / goal.targetAmount) * 100;
                
                return (
                  <LinearGradient
                    key={goal._id}
                    colors={['#FFFFFF', '#F0FDF4']}
                    style={{
                      borderRadius: 20,
                      padding: 20,
                      marginBottom: 12,
                      borderWidth: 1,
                      borderColor: '#D1FAE5',
                      shadowColor: '#10B981',
                      shadowOpacity: 0.08,
                      shadowRadius: 16,
                      shadowOffset: { width: 0, height: 4 },
                      elevation: 2,
                    }}
                  >
                    {/* Header */}
                    <View style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      marginBottom: 16,
                    }}>
                      <View style={{ flex: 1, marginRight: 12 }}>
                        <Text style={{
                          fontSize: 17,
                          fontWeight: '700',
                          color: '#0F172A',
                          marginBottom: 6,
                        }}>
                          {goal.name}
                        </Text>
                        <Text style={{
                          fontSize: 12,
                          color: '#64748B',
                          fontWeight: '500',
                        }}>
                          Completed {new Date(goal.endDate).toLocaleDateString('en-US', { 
                            month: 'short', 
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </Text>
                      </View>
                      
                      {/* Success Badge */}
                      <View style={{
                        backgroundColor: '#10B981',
                        paddingHorizontal: 12,
                        paddingVertical: 6,
                        borderRadius: 10,
                        flexDirection: 'row',
                        alignItems: 'center',
                      }}>
                        <Text style={{ fontSize: 14, marginRight: 4 }}>✓</Text>
                        <Text style={{
                          fontSize: 11,
                          fontWeight: '700',
                          color: '#FFFFFF',
                          letterSpacing: 0.5,
                        }}>
                          DONE
                        </Text>
                      </View>
                    </View>

                    {/* Amount Display */}
                    <View style={{
                      backgroundColor: '#ECFDF5',
                      borderRadius: 14,
                      padding: 16,
                      marginBottom: 12,
                    }}>
                      <View style={{
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}>
                        <View>
                          <Text style={{
                            fontSize: 24,
                            fontWeight: '800',
                            color: '#059669',
                            marginBottom: 4,
                          }}>
                            ₱{goal.savedAmount.toLocaleString()}
                          </Text>
                          <Text style={{
                            fontSize: 12,
                            color: '#6B7280',
                            fontWeight: '500',
                          }}>
                            Target: ₱{goal.targetAmount.toLocaleString()}
                          </Text>
                        </View>
                        
                        <View style={{
                          width: 56,
                          height: 56,
                          borderRadius: 28,
                          backgroundColor: '#10B981',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}>
                          <Text style={{
                            fontSize: 16,
                            fontWeight: '800',
                            color: '#FFFFFF',
                          }}>
                            {progress.toFixed(0)}%
                          </Text>
                        </View>
                      </View>

                      {/* Progress Bar */}
                      <View style={{
                        height: 6,
                        backgroundColor: '#D1FAE5',
                        borderRadius: 3,
                        marginTop: 12,
                        overflow: 'hidden',
                      }}>
                        <View style={{
                          width: `${Math.min(progress, 100)}%`,
                          height: '100%',
                          backgroundColor: '#10B981',
                          borderRadius: 3,
                        }} />
                      </View>
                    </View>

                    {/* Success Message */}
                    <View style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      backgroundColor: '#F0FDF4',
                      padding: 12,
                      borderRadius: 12,
                      borderLeftWidth: 3,
                      borderLeftColor: '#10B981',
                    }}>
                      <Text style={{ fontSize: 18, marginRight: 8 }}>🎉</Text>
                      <Text style={{
                        fontSize: 13,
                        color: '#065F46',
                        fontWeight: '600',
                        flex: 1,
                      }}>
                        Goal achieved successfully!
                      </Text>
                    </View>
                  </LinearGradient>
                );
              })}
          </View>
        )}

        {/* ⏰ Failed Goals */}
        {goals.filter((g) => g.status === "failed").length > 0 && (
          <View>
            {/* Section Header */}
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingHorizontal: 4,
              marginBottom: 12,
            }}>
              <View style={{
                width: 4,
                height: 20,
                backgroundColor: '#F59E0B',
                borderRadius: 2,
                marginRight: 10,
              }} />
              <Text style={{
                fontSize: 16,
                fontWeight: '700',
                color: '#0F172A',
                flex: 1,
              }}>
                Failed Goals
              </Text>
              <View style={{
                backgroundColor: '#FEF3C7',
                paddingHorizontal: 10,
                paddingVertical: 4,
                borderRadius: 8,
              }}>
                <Text style={{
                  fontSize: 12,
                  fontWeight: '700',
                  color: '#92400E',
                }}>
                  {goals.filter((g) => g.status === "failed").length}
                </Text>
              </View>
            </View>

            {/* Goal Cards */}
            {goals
              .filter((g) => g.status === "failed")
              .map((goal) => {
                const progress = (goal.savedAmount / goal.targetAmount) * 100;
                const remaining = goal.targetAmount - goal.savedAmount;
                
                return (
                  <LinearGradient
                    key={goal._id}
                    colors={['#FFFFFF', '#FFFBEB']}
                    style={{
                      borderRadius: 20,
                      padding: 20,
                      marginBottom: 12,
                      borderWidth: 1,
                      borderColor: '#FDE68A',
                      shadowColor: '#F59E0B',
                      shadowOpacity: 0.08,
                      shadowRadius: 16,
                      shadowOffset: { width: 0, height: 4 },
                      elevation: 2,
                    }}
                  >
                    {/* Header */}
                    <View style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      marginBottom: 16,
                    }}>
                      <View style={{ flex: 1, marginRight: 12 }}>
                        <Text style={{
                          fontSize: 17,
                          fontWeight: '700',
                          color: '#0F172A',
                          marginBottom: 6,
                        }}>
                          {goal.name}
                        </Text>
                        <Text style={{
                          fontSize: 12,
                          color: '#64748B',
                          fontWeight: '500',
                        }}>
                          Deadline: {new Date(goal.endDate).toLocaleDateString('en-US', { 
                            month: 'short', 
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </Text>
                      </View>
                      
                      {/* Warning Badge */}
                      <View style={{
                        backgroundColor: '#F59E0B',
                        paddingHorizontal: 12,
                        paddingVertical: 6,
                        borderRadius: 10,
                        flexDirection: 'row',
                        alignItems: 'center',
                      }}>
                        <Text style={{ fontSize: 14, marginRight: 4 }}>⏰</Text>
                        <Text style={{
                          fontSize: 11,
                          fontWeight: '700',
                          color: '#FFFFFF',
                          letterSpacing: 0.5,
                        }}>
                          Failed
                        </Text>
                      </View>
                    </View>

                    {/* Amount Display */}
                    <View style={{
                      backgroundColor: '#FEF3C7',
                      borderRadius: 14,
                      padding: 16,
                      marginBottom: 12,
                    }}>
                      <View style={{
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}>
                        <View style={{ flex: 1 }}>
                          <Text style={{
                            fontSize: 24,
                            fontWeight: '800',
                            color: '#D97706',
                            marginBottom: 4,
                          }}>
                            ₱{goal.savedAmount.toLocaleString()}
                          </Text>
                          <Text style={{
                            fontSize: 12,
                            color: '#6B7280',
                            fontWeight: '500',
                            marginBottom: 6,
                          }}>
                            of ₱{goal.targetAmount.toLocaleString()}
                          </Text>
                          <Text style={{
                            fontSize: 13,
                            color: '#92400E',
                            fontWeight: '600',
                          }}>
                            ₱{remaining.toLocaleString()} short
                          </Text>
                        </View>
                        
                        <View style={{
                          width: 56,
                          height: 56,
                          borderRadius: 28,
                          backgroundColor: '#F59E0B',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}>
                          <Text style={{
                            fontSize: 16,
                            fontWeight: '800',
                            color: '#FFFFFF',
                          }}>
                            {progress.toFixed(0)}%
                          </Text>
                        </View>
                      </View>

                      {/* Progress Bar */}
                      <View style={{
                        height: 6,
                        backgroundColor: '#FDE68A',
                        borderRadius: 3,
                        marginTop: 12,
                        overflow: 'hidden',
                      }}>
                        <View style={{
                          width: `${Math.min(progress, 100)}%`,
                          height: '100%',
                          backgroundColor: '#F59E0B',
                          borderRadius: 3,
                        }} />
                      </View>
                    </View>

                    {/* Info Message */}
                    <View style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      backgroundColor: '#FFFBEB',
                      padding: 12,
                      borderRadius: 12,
                      borderLeftWidth: 3,
                      borderLeftColor: '#F59E0B',
                    }}>
                      <Text style={{ fontSize: 18, marginRight: 8 }}>📅</Text>
                      <Text style={{
                        fontSize: 13,
                        color: '#92400E',
                        fontWeight: '600',
                        flex: 1,
                      }}>
                        Target missed - You saved {progress.toFixed(0)}% by deadline
                      </Text>
                    </View>
                  </LinearGradient>
                );
              })}
          </View>
        )}
      </View>
    )}
  </View>
)}


{/* 📊 Progress with Target Markers */}
{goals.filter(g => g.status === "active").length > 0 && (
  <Animated.View style={{ opacity: fadeAnim }}>
    <Text style={styles.sectionTitle}>Progress Overview</Text>

    <LinearGradient colors={["#ffffff", "#f8fafc"]} style={styles.chartCard}>
      <Text style={styles.chartTitle}>Savings Progress vs Target</Text>

      {/* Legend */}
      <View style={{ flexDirection: 'row', justifyContent: 'center', marginBottom: 16, gap: 20 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={{ 
            width: 24, 
            height: 12, 
            backgroundColor: '#FCD34D', 
            borderRadius: 4,
            marginRight: 6 
          }} />
          <Text style={{ fontSize: 13, color: '#64748b', fontWeight: '600' }}>
            Current Savings
          </Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={{ 
            width: 24, 
            height: 3, 
            backgroundColor: '#EF4444', 
            marginRight: 6 
          }} />
          <Text style={{ fontSize: 13, color: '#64748b', fontWeight: '600' }}>
            Target Goal
          </Text>
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={{ paddingHorizontal: 20, paddingVertical: 10 }}>
          {goals
            .filter(g => g.status === "active")
            .map((goal, index) => {
              const maxAmount = Math.max(goal.targetAmount, goal.savedAmount);
              const progressWidth = (goal.savedAmount / maxAmount) * (width * 0.7);
              const targetPosition = (goal.targetAmount / maxAmount) * (width * 0.7);
              const progressPercent = (goal.savedAmount / goal.targetAmount) * 100;

              return (
                <View key={goal._id} style={{ marginBottom: 32 }}>
                  {/* Goal Name */}
                  <Text style={{ 
                    fontSize: 15, 
                    fontWeight: '700', 
                    color: '#1e293b',
                    marginBottom: 8 
                  }}>
                    {goal.name}
                  </Text>

                 {/* Progress Bar Container */}
<View
  style={{
    position: 'relative',
    height: isMobile ? 34 : 50, // 📱 shorter on mobile
  }}
>
  {/* 🟡 Yellow Progress Bar */}
  <View
    style={{
      position: 'absolute',
      left: 0,
      top: isMobile ? 8 : 15,
      width: Math.min(progressWidth, width * 0.7),
      height: isMobile ? 18 : 32, // 📱 thinner bar
      backgroundColor: '#FCD34D',
      borderRadius: 6,
      shadowColor: '#000',
      shadowOpacity: 0.08,
      shadowRadius: 3,
      elevation: 1,
    }}
  >
    {/* ₱ Amount Label */}
    <Text
      style={{
        position: 'absolute',
        left: 6,
        top: '50%',
        transform: [{ translateY: isMobile ? -7 : -8 }],
        fontSize: isMobile ? 10 : 12,
        fontWeight: '700',
        color: '#92400e',
      }}
    >
      ₱{goal.savedAmount.toLocaleString()}
    </Text>
  </View>

{/* 🔴 Target Marker */}
<View
  style={{
    position: 'absolute',
    left: targetPosition,
    top: Platform.OS === 'web' ? 0 : 2, // 📱 slightly lower on phones
    alignItems: 'center',
    justifyContent: 'center',
  }}
>
  {/* Line */}
  <View
    style={{
      width: Platform.OS === 'web' ? 3 : 2,       // thinner for mobile
      height: Platform.OS === 'web' ? 50 : 26,    // shorter for mobile
      backgroundColor: '#EF4444',
      borderRadius: 1.5,
      opacity: 0.9,
    }}
  />

  {/* Arrow */}
  <View
    style={{
      position: 'absolute',
      top: Platform.OS === 'web' ? 12 : 5,
      right: Platform.OS === 'web' ? -8 : -5,
      width: 0,
      height: 0,
      borderLeftWidth: Platform.OS === 'web' ? 8 : 5,
      borderTopWidth: Platform.OS === 'web' ? 8 : 5,
      borderBottomWidth: Platform.OS === 'web' ? 8 : 5,
      borderLeftColor: '#EF4444',
      borderRightColor: 'transparent',
      borderTopColor: 'transparent',
      borderBottomColor: 'transparent',
    }}
  />

  {/* Label */}
  <Text
    style={{
      position: 'absolute',
      top: Platform.OS === 'web' ? -22 : -16, // closer for phones
      fontSize: Platform.OS === 'web' ? 11 : 9,
      fontWeight: '700',
      color: '#DC2626',
      backgroundColor: '#FEE2E2',
      paddingHorizontal: Platform.OS === 'web' ? 6 : 4,
      paddingVertical: Platform.OS === 'web' ? 2 : 1,
      borderRadius: 5,
      borderWidth: 1,
      borderColor: '#EF4444',
      textAlign: 'center',
      includeFontPadding: false,
      overflow: 'hidden',
    }}
  >
    ₱{goal.targetAmount.toLocaleString()}
  </Text>
</View>


</View>


                  {/* Progress Percentage */}
                  <Text style={{
                    fontSize: 13,
                    fontWeight: '600',
                    color: progressPercent >= 100 ? '#059669' : '#64748b',
                    marginTop: 8,
                  }}>
                    {progressPercent.toFixed(1)}% achieved
                    {progressPercent >= 100 && ' 🎉'}
                  </Text>
                </View>
              );
            })}
        </View>
      </ScrollView>
    </LinearGradient>
  </Animated.View>
)}






      </ScrollView>

  

      {/* Menu overlay */}
      {menuOpenId && (
        <Pressable
          style={styles.menuOverlay}
          onPress={() => setMenuOpenId(null)}
          pointerEvents="box-none"
        />
      )}

     {/* Enhanced Floating Action Button */}
<Animated.View style={{ opacity: fadeAnim }}>
  <TouchableOpacity style={styles.fab} onPress={() => setShowAddGoalModal(true)}>
    <LinearGradient
      colors={['#6B1C23', '#8B2A32']}  // 🎨 Maroon gradient
      style={styles.fabGradient}
    >
      <Ionicons name="add" size={28} color="#F4B942" />
    </LinearGradient>
  </TouchableOpacity>
</Animated.View>

{/* Add Goal Modal */}
<Modal visible={showAddGoalModal} transparent animationType="slide">
  <View style={styles.modalOverlay}>
    <Animated.View
      style={[
        styles.modalBox,
        {
          opacity: fadeAnim,
          transform: [{ scale: fadeAnim }],
        },
      ]}
    >
      <LinearGradient
        colors={["#6B1C23", "#8B2A32"]}
        style={styles.modalHeader}
      >
        <Text style={styles.modalHeaderText}>✨ Create New Goal</Text>
      </LinearGradient>

      {/* ✅ Scrollable and padded content */}
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.modalContent}>
          {/* 🏷 Goal Name */}
          <Text style={styles.label}>Goal Name</Text>
          <TextInput
            placeholder="Enter goal name"
            value={goalName}
            onChangeText={(text) => setGoalName(formatTitleCase(text))}
            style={styles.input}
            placeholderTextColor="#94a3b8"
          />

          {/* 💰 Target Amount */}
          <Text style={styles.label}>Target Amount</Text>
          <TextInput
            placeholder="₱0"
            keyboardType="numeric"
            value={targetAmount}
            onChangeText={setTargetAmount}
            style={styles.input}
            placeholderTextColor="#94a3b8"
          />

          {/* ⏱ Duration */}
          <Text style={styles.label}>Duration</Text>
          <TextInput
            placeholder="e.g. 30"
            keyboardType="numeric"
            value={duration}
            onChangeText={(val) => {
              setDuration(val);
              if (addStartDate && val && lockAddEndDate) {
                const start = new Date(addStartDate);
                const newEnd = calculateEndDate(start, Number(val), durationUnit);
                setAddEndDate(newEnd.toISOString().split("T")[0]);
              }
            }}
            style={[
              styles.input,
              !lockAddEndDate && { color: "#6B1C23", fontWeight: "600" },
            ]}
            placeholderTextColor="#94a3b8"
          />

          {/* ✅ Singular/Plural toggle */}
          <View style={styles.unitRow}>
            {[
              { value: "days", singular: "day" },
              { value: "weeks", singular: "week" },
              { value: "months", singular: "month" }
            ].map((unit) => {
              const label = duration === "1" ? unit.singular : unit.value;
              return (
                <TouchableOpacity
                  key={unit.value}
                  style={[
                    styles.unitBtn,
                    durationUnit === unit.value && styles.unitBtnActive,
                  ]}
                  onPress={() => {
                    setDurationUnit(unit.value as any);
                    if (addStartDate && duration && lockAddEndDate) {
                      const start = new Date(addStartDate);
                      const newEnd = calculateEndDate(start, Number(duration), unit.value as any);
                      setAddEndDate(newEnd.toISOString().split("T")[0]);
                    }
                  }}
                >
                  <Text
                    style={[
                      styles.unitText,
                      durationUnit === unit.value && styles.unitTextActive,
                    ]}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.8}
                  >
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* 📝 Notes */}
          <Text style={styles.label}>Notes (Optional)</Text>
          <TextInput
            placeholder="Add some notes..."
            value={notes}
            onChangeText={setNotes}
            style={[styles.input, styles.textArea]}
            multiline
            numberOfLines={3}
            placeholderTextColor="#94a3b8"
          />

          {/* 📅 Start Date */}
          <Text style={styles.label}>Start Date</Text>
          {Platform.OS === "web" ? (
            <input
              type="date"
              value={addStartDate}
              readOnly
              style={{
                ...styles.webInput,
                backgroundColor: "#f3f4f6",
                color: "#6b7280",
              }}
            />
          ) : (
            <TextInput
              value={addStartDate}
              editable={false}
              style={[styles.input, { backgroundColor: "#f3f4f6", color: "#6b7280" }]}
            />
          )}

          {/* 📆 End Date */}
          <View style={styles.rowBetween}>
            <Text style={styles.label}>End Date</Text>
            <TouchableOpacity onPress={() => setLockAddEndDate(!lockAddEndDate)}>
              <Text
                style={[
                  styles.toggleText,
                  lockAddEndDate ? styles.autoText : styles.customText,
                ]}
              >
                {lockAddEndDate ? "🔒 Auto" : "✏️ Custom"}
              </Text>
            </TouchableOpacity>
          </View>

          {Platform.OS === "web" ? (
            <input
              type="date"
              value={addEndDate}
              readOnly={lockAddEndDate}
              onChange={(e) => {
                if (!lockAddEndDate) {
                  setAddEndDate(e.target.value);
                  const daysDiff = Math.ceil(
                    (new Date(e.target.value).getTime() - new Date(addStartDate).getTime()) /
                      (1000 * 60 * 60 * 24)
                  );
                  setDuration(daysDiff.toString());
                }
              }}
              style={{
                ...styles.webInput,
                opacity: lockAddEndDate ? 0.6 : 1,
              }}
            />
          ) : (
            <>
              <TouchableOpacity
                onPress={() => {
                  if (!lockAddEndDate) setShowDatePicker(true);
                }}
                activeOpacity={0.7}
                style={[
                  styles.input,
                  { backgroundColor: "#f3f4f6", justifyContent: "center" },
                ]}
              >
                <Text style={{ color: "#374151" }}>
                  {addEndDate ? addEndDate : "Select End Date"}
                </Text>
              </TouchableOpacity>

              {showDatePicker && (
                <DateTimePicker
                  value={addEndDate ? new Date(addEndDate) : new Date()}
                  mode="date"
                  display="default"
                  onChange={(e, date) => {
                    setShowDatePicker(false);
                    if (!date || lockAddEndDate) return;
                    setAddEndDate(date.toISOString().split("T")[0]);
                    const daysDiff = Math.ceil(
                      (date.getTime() - new Date(addStartDate).getTime()) / (1000 * 60 * 60 * 24)
                    );
                    setDuration(daysDiff.toString());
                  }}
                />
              )}
            </>
          )}

          {/* 🧭 Action Buttons */}
          <View style={[styles.buttonRow, { marginTop: 20 }]}>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={() => setShowAddGoalModal(false)}
            >
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.saveBtn} onPress={handleCreateGoal}>
              <LinearGradient
                colors={["#6B1C23", "#8B2A32"]}
                style={styles.saveBtnGradient}
              >
                <Text style={styles.saveBtnText}>Create Goal</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </Animated.View>
  </View>
</Modal>

{/* Add Savings Modal */}
<Modal visible={showAddSavingsModal} transparent animationType="slide">
  <View style={styles.addSavingsModalOverlay}>
    <Animated.View
      style={[
        styles.addSavingsModalBox,
        {
          opacity: fadeAnim,
          transform: [{ scale: fadeAnim }],
        }
      ]}
    >
      <LinearGradient
        colors={["#6B1C23", "#8B2A32"]}
        style={styles.addSavingsModalHeader}
      >
        <Text style={styles.addSavingsModalHeaderText}>💰 Add Savings</Text>
        <TouchableOpacity
          onPress={() => {
            setShowAddSavingsModal(false);
            setSavingsAmount('');
          }}
          style={styles.addSavingsCloseButton}
        >
          <Text style={styles.addSavingsCloseButtonText}>✕</Text>
        </TouchableOpacity>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={{ padding: 24, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Enhanced Goal Info Card */}
        <View style={styles.addSavingsGoalCard}>
          <View style={styles.addSavingsGoalHeader}>
            <View style={styles.addSavingsGoalNameContainer}>
              <Text style={styles.addSavingsGoalLabel}>SAVING FOR</Text>
              <Text style={styles.addSavingsGoalName}>{selectedGoal?.name}</Text>
            </View>
            <View style={styles.addSavingsGoalBadge}>
              <Text style={styles.addSavingsGoalBadgeText}>
                {Math.min(
                  Math.round(((selectedGoal?.savedAmount || 0) / (selectedGoal?.targetAmount || 1)) * 100),
                  100
                )}%
              </Text>
            </View>
          </View>
          
          <View style={styles.addSavingsAmountContainer}>
            <View style={styles.addSavingsAmountRow}>
              <Text style={styles.addSavingsLabel}>SAVED</Text>
              <Text style={styles.addSavingsCurrentAmount}>
                ₱{selectedGoal?.savedAmount.toLocaleString()}
              </Text>
            </View>
            <View style={styles.addSavingsDivider} />
            <View style={styles.addSavingsAmountRow}>
              <Text style={styles.addSavingsLabel}>GOAL</Text>
              <Text style={styles.addSavingsTargetAmount}>
                ₱{selectedGoal?.targetAmount.toLocaleString()}
              </Text>
            </View>
          </View>

          <View style={styles.addSavingsProgressBarContainer}>
            <View style={styles.addSavingsProgressBarBackground}>
              <LinearGradient
                colors={["#F59E0B", "#F4B942"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[
                  styles.addSavingsProgressBarFill,
                  {
                    width: `${Math.min(
                      ((selectedGoal?.savedAmount || 0) / (selectedGoal?.targetAmount || 1)) * 100,
                      100
                    )}%`,
                  }
                ]}
              />
            </View>
            <View style={styles.addSavingsRemainingContainer}>
              <Text style={styles.addSavingsRemainingLabel}>Remaining</Text>
              <Text style={styles.addSavingsRemainingAmount}>
                ₱{((selectedGoal?.targetAmount || 0) - (selectedGoal?.savedAmount || 0)).toLocaleString()}
              </Text>
            </View>
          </View>
        </View>

        {/* Amount Input Section */}
        <View style={styles.addSavingsInputSection}>
          <Text style={styles.addSavingsInputLabel}>How much are you adding?</Text>
          <View style={styles.addSavingsAmountInputWrapper}>
            <Text style={styles.addSavingsCurrencySymbol}>₱</Text>
            <TextInput
              placeholder="0.00"
              keyboardType="numeric"
              value={savingsAmount}
              onChangeText={setSavingsAmount}
              style={styles.addSavingsAmountInput}
              placeholderTextColor="#D1D5DB"
              autoFocus
            />
          </View>

          {/* Quick Amount Buttons */}
          <View style={styles.addSavingsQuickAmountContainer}>
            {[100, 500, 1000, 5000].map((amount) => (
              <TouchableOpacity
                key={amount}
                style={styles.addSavingsQuickAmountBtn}
                onPress={() => setSavingsAmount(amount.toString())}
              >
                <Text style={styles.addSavingsQuickAmountText}>+₱{amount}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {savingsAmount && Number(savingsAmount) > 0 && (
            <Animated.View style={styles.addSavingsNewTotalPreview}>
              <View style={styles.addSavingsPreviewLeft}>
                <Text style={styles.addSavingsPreviewLabelSmall}>NEW TOTAL</Text>
                <Text style={styles.addSavingsPreviewAmount}>
                  ₱{((selectedGoal?.savedAmount || 0) + Number(savingsAmount)).toLocaleString()}
                </Text>
              </View>
              <View style={styles.addSavingsPreviewRight}>
                <View style={styles.addSavingsPreviewProgress}>
                  <Text style={styles.addSavingsPreviewProgressText}>
                    {Math.min(
                      Math.round((((selectedGoal?.savedAmount || 0) + Number(savingsAmount)) / (selectedGoal?.targetAmount || 1)) * 100),
                      100
                    )}%
                  </Text>
                </View>
                {((selectedGoal?.savedAmount || 0) + Number(savingsAmount)) >= (selectedGoal?.targetAmount || 1) && (
                  <Text style={styles.addSavingsGoalCompleteText}>🎉 Goal Complete!</Text>
                )}
              </View>
            </Animated.View>
          )}
        </View>

        {/* Action Buttons */}
        <View style={styles.addSavingsButtonRow}>
          <TouchableOpacity
            style={styles.addSavingsCancelBtn}
            onPress={() => {
              setShowAddSavingsModal(false);
              setSavingsAmount('');
            }}
          >
            <Text style={styles.addSavingsCancelBtnText}>Cancel</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.addSavingsSaveBtn, (!savingsAmount || Number(savingsAmount) <= 0) && styles.addSavingsSaveBtnDisabled]} 
            onPress={handleAddSavings}
            disabled={!savingsAmount || Number(savingsAmount) <= 0}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={(!savingsAmount || Number(savingsAmount) <= 0) ? ["#9CA3AF", "#6B7280"] : ["#6B1C23", "#8B2A32"]}
              style={styles.addSavingsSaveBtnGradient}
            >
              <Text style={styles.addSavingsSaveBtnText}>Add to Savings</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </Animated.View>
  </View>
</Modal>

{/* Edit Goal Modal */}
<Modal visible={showEditModal} transparent animationType="slide">
  <View style={styles.modalOverlay}>
    <Animated.View
      style={[
        styles.modalBox,
        {
          opacity: fadeAnim,
          transform: [{ scale: fadeAnim }],
        }
      ]}
    >
      <LinearGradient
        colors={["#F4B942", "#D4A02F"]}
        style={styles.modalHeader}
      >
        <Text style={[styles.modalHeaderText, { color: "#6B1C23" }]}>✏️ Edit Goal</Text>
      </LinearGradient>
      {/* ✅ Added ScrollView wrapper */}
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.modalContent}>
          <Text style={styles.label}>Goal Name</Text>
          <TextInput
            placeholder="Enter goal name"
            value={goalName}
            onChangeText={setGoalName}
            style={styles.input}
            placeholderTextColor="#94a3b8"
          />
          <Text style={styles.label}>Target Amount</Text>
          <TextInput
            placeholder="₱0"
            keyboardType="numeric"
            value={targetAmount}
            onChangeText={setTargetAmount}
            style={styles.input}
            placeholderTextColor="#94a3b8"
          />
          <Text style={styles.label}>Duration</Text>
          <TextInput
            placeholder="e.g. 30"
            keyboardType="numeric"
            value={duration}
            editable={lockEndDate}
            onChangeText={(val) => {
              setDuration(val);
              if (editStartDate && val && lockEndDate) {
                const start = new Date(editStartDate);
                const newEnd = calculateEndDate(start, Number(val), durationUnit);
                setEditEndDate(newEnd.toISOString().split("T")[0]);
              }
            }}
            style={[
              styles.input,
              !lockEndDate && { color: "#6B1C23", fontWeight: "600" },
            ]}
            placeholderTextColor="#94a3b8"
          />
          <View style={styles.unitRow}>
            {[
              { value: "days", singular: "day" },
              { value: "weeks", singular: "week" },
              { value: "months", singular: "month" }
            ].map((unit) => {
              const label = duration === "1" ? unit.singular : unit.value;
              return (
                <TouchableOpacity
                  key={unit.value}
                  style={[
                    styles.unitBtn,
                    durationUnit === unit.value && styles.unitBtnActive,
                  ]}
                  onPress={() => {
                    setDurationUnit(unit.value as any);
                    if (editStartDate && duration && lockEndDate) {
                      const start = new Date(editStartDate);
                      const newEnd = calculateEndDate(start, Number(duration), unit.value as any);
                      setEditEndDate(newEnd.toISOString().split("T")[0]);
                    }
                  }}
                >
                  <Text
                    style={[
                      styles.unitText,
                      durationUnit === unit.value && styles.unitTextActive,
                    ]}
                  >
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <Text style={styles.label}>Notes</Text>
          <TextInput
            placeholder="Optional notes..."
            value={notes}
            onChangeText={setNotes}
            style={[styles.input, styles.textArea]}
            multiline
            numberOfLines={3}
            placeholderTextColor="#94a3b8"
          />
          {/* Start Date (Read-only) */}
          <Text style={styles.label}>Start Date</Text>
          {Platform.OS === "web" ? (
            <input
              type="date"
              value={editStartDate}
              readOnly
              style={{
                ...styles.webInput,
                backgroundColor: "#f3f4f6",
                color: "#6b7280"
              }}
            />
          ) : (
            <TextInput
              value={editStartDate}
              editable={false}
              style={[styles.input, { backgroundColor: "#f3f4f6", color: "#6b7280" }]}
            />
          )}
          {/* End Date */}
          <View style={styles.rowBetween}>
            <Text style={styles.label}>End Date</Text>
            <TouchableOpacity onPress={() => setLockEndDate(!lockEndDate)}>
              <Text
                style={[
                  styles.toggleText,
                  lockEndDate ? styles.autoText : styles.customText,
                ]}
              >
                {lockEndDate ? "🔒 Auto" : "✏️ Custom"}
              </Text>
            </TouchableOpacity>
          </View>
          {Platform.OS === "web" ? (
            <input
              type="date"
              value={editEndDate}
              disabled={lockEndDate}
              onChange={(e) => {
                if (!lockEndDate) {
                  setEditEndDate(e.target.value);
                  const daysDiff = Math.ceil(
                    (new Date(e.target.value).getTime() - new Date(editStartDate).getTime()) /
                      (1000 * 60 * 60 * 24)
                  );
                  setDuration(daysDiff.toString());
                }
              }}
              style={{
                ...styles.webInput,
                opacity: lockEndDate ? 0.6 : 1,
              }}
            />
          ) : (
            <>
              <TouchableOpacity
                onPress={() => {
                  if (!lockEndDate) setShowEditEndPicker(true);
                }}
                activeOpacity={0.7}
                style={[
                  styles.input,
                  { backgroundColor: "#f3f4f6", justifyContent: "center" },
                ]}
              >
                <Text style={{ color: "#374151" }}>
                  {editEndDate ? editEndDate : "Select End Date"}
                </Text>
              </TouchableOpacity>
              {showEditEndPicker && (
                <DateTimePicker
                  value={editEndDate ? new Date(editEndDate) : new Date()}
                  mode="date"
                  display="default"
                  onChange={(e, date) => {
                    setShowEditEndPicker(false);
                    if (!date || lockEndDate) return;
                    setEditEndDate(date.toISOString().split("T")[0]);
                    const daysDiff = Math.ceil(
                      (date.getTime() - new Date(editStartDate).getTime()) / (1000 * 60 * 60 * 24)
                    );
                    setDuration(daysDiff.toString());
                  }}
                />
              )}
            </>
          )}
          <View style={[styles.buttonRow, { marginTop: 20 }]}>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={() => setShowEditModal(false)}
            >
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.saveBtn} onPress={handleEditGoal}>
              <LinearGradient
                colors={["#F4B942", "#D4A02F"]}
                style={styles.saveBtnGradient}
              >
                <Text style={[styles.saveBtnText, { color: "#6B1C23" }]}>Update Goal</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </Animated.View>
  </View>
</Modal>


    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // paddingTop: Platform.OS === 'ios' ? 50 : 30,
  },
 closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center",
  },

  closeButtonText: {
    fontSize: 20,
    color: "#F4B942",
    fontWeight: "600",
  },

 
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: isSmallScreen ? 14 : 20,
    paddingVertical: isSmallScreen ? 8 : 16,
    marginBottom: isSmallScreen ? 6 : 10,
  },

  headerContainer: {
    paddingTop: Platform.OS === 'ios' ? 40 : 25,
    paddingBottom: isSmallScreen ? 8 : 35,
    paddingHorizontal: isSmallScreen ? 12 : 24,
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
  },

  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: isSmallScreen ? 16 : 24,
    marginTop: Platform.OS === 'ios' ? (isSmallScreen ? 5 : 20) : (isSmallScreen ? 15 : 60),
    marginBottom: isSmallScreen ? 4 : 10,
  },

  mainHeading: {
    fontSize: isSmallScreen ? 24 : 30,
    fontWeight: '800',
    color: '#ffffff',
    textAlign: 'center',
    letterSpacing: -0.5,
  },

  subHeading: {
    fontSize: isSmallScreen ? 12 : 16,
    color: 'rgba(255, 255, 255, 0.85)',
    textAlign: 'center',
    marginBottom: isSmallScreen ? 2 : 15,
    marginTop: isSmallScreen ? 10 : 15,
    lineHeight: isSmallScreen ? 14 : 20,
    paddingHorizontal: isSmallScreen ? 10 : 20,
  },

  totalSavedContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 5,
    marginBottom: isSmallScreen ? 8 : 16,
  },

  totalSavedLabel: {
    fontSize: 16,
    color: '#ffffffff',
    fontWeight: '800',
  },

  totalSavedValue: {
    fontSize: 16,
    color: '#ffffffff',
    fontWeight: '600',
  },

  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 20,
    paddingVertical: isSmallScreen ? 8 : 16,
    paddingHorizontal: isSmallScreen ? 12 : 24,
    alignSelf: 'center',
  },

  statNumber: {
    fontSize: isSmallScreen ? 16 : 24,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: isSmallScreen ? 2 : 4,
  },

  statLabel: {
    fontSize: isSmallScreen ? 9 : 12,
    color: 'rgba(255, 255, 255, 0.75)',
    fontWeight: '500',
    textAlign: 'center',
  },

  statDivider: {
    width: 1,
    height: isSmallScreen ? 24 : 40,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginHorizontal: isSmallScreen ? 4 : 10,
  },

  waveContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 20,
    overflow: 'hidden',
  },

  wave: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 40,
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
    marginBottom: 20,
  },  

  headerTitle: {
    fontSize: 32,
    fontWeight: "800",
    color: "#6B1C23",
    letterSpacing: -0.5,
  },

  headerSubtitle: {
    fontSize: 16,
    color: "#64748b",
    marginTop: 2,
  },

  notifButton: {
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },

  notifButtonGradient: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },

  summaryCard: {
    marginHorizontal: isWeb ? 20 : 16,
    borderRadius: 20,
    padding: 0,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 8,
    marginBottom: isWeb ? 24 : 20,
  },

  summaryContent: {
    padding: isWeb ? 24 : 20,
    alignItems: "center",
  },

  summaryAmount: {
    fontSize: isWeb ? 42 : 36,
    fontWeight: "800",
    color: "#ffffff",
    marginBottom: isWeb ? 20 : 16,
    letterSpacing: -1,
  },

  summaryLabel: {
    fontSize: 16,
    color: "#ffffff",
    marginBottom: 8,
    fontWeight: "500",
    opacity: 0.9,
  },

  summaryStats: {
    flexDirection: "row",
    alignItems: "center",
  },

  statItem: {
    alignItems: "center",
    paddingHorizontal: 5,
  },

  statValue: {
    fontSize: 24,
    fontWeight: "700",
    color: "#ffffff",
  },

  scrollView: {
    flex: 1,
  },

  sectionTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#6B1C23",
    marginHorizontal: 20,
    marginBottom: 16,
    marginTop: 8,
  },

  goalsWrapper: {
    paddingHorizontal: 25,
  },

  goalsWrapperWeb: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
  },

  goalCard: {
    borderRadius: 24,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 6,
    overflow: "hidden",
    minHeight: 330,
  },

  goalCardWeb: {
    flexBasis: "32%",
    maxWidth: "32%",
    minWidth: 300,
  },

  cardContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    padding: 10,
  },

  cardLeft: {
    flex: 1,
    marginRight: 16,
    maxWidth: "68%",
  },

  menuButton: {
    position: "absolute",
    top: 16,
    right: 16,
    zIndex: 20,
  },

  menuButtonBackground: {
    backgroundColor: "rgba(255,255,255,0.9)",
    borderRadius: 20,
    padding: 8,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },

  dropdownMenu: {
    position: "absolute",
    top: 56,
    right: 16,
    backgroundColor: "#ffffff",
    borderRadius: 12,
    paddingVertical: 8,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 25,
    minWidth: 120,
  },

  dropdownItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },

  dropdownText: {
    marginLeft: 8,
    fontSize: 15,
    fontWeight: "500",
    color: "#6B1C23",
  },

  menuOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "transparent",
    zIndex: 15,
  },

  goalName: {
    fontSize: 25,
    fontWeight: "800",
    color: "#ffffff",
    marginBottom: 8,
    flexWrap: "wrap",
    lineHeight: 24,
    textShadowColor: "rgba(0,0,0,0.15)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },

  dateContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: "flex-start",
  },

  goalDuration: {
    fontSize: 14,
    color: "#ffffff",
    marginLeft: 4,
    fontWeight: "500",
  },

  goalSaved: {
    fontSize: 26,
    fontWeight: "800",
    color: "#ffffff",
    marginBottom: 2,
    textShadowColor: "rgba(0,0,0,0.2)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },

  goalTarget: {
    fontSize: 16,
    color: "#ffffffe6",
    marginBottom: 14,
    fontWeight: "500",
  },

  progressBarContainer: {
    marginBottom: 14,
  },

  progressBarBackground: {
    height: 6,
    backgroundColor: "rgba(255,255,255,0.3)",
    borderRadius: 3,
    overflow: "hidden",
    marginBottom: 6,
  },

  progressBarFill: {
    height: "100%",
    borderRadius: 4,
  },

  progressText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#ffffff",
    textAlign: "right",
    textShadowColor: "rgba(0,0,0,0.2)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },

  insightBox: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },

  insightItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.25)",
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 10,
  },

  insightText: {
    fontSize: 14,
    color: "#ffffff",
    fontWeight: "700",
    marginLeft: 4,
    textShadowColor: "rgba(0,0,0,0.15)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },

  progressContainer: {
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    width: 100,
    height: 100,
    flexShrink: 0,
  },

  circleTextContainer: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },

  circlePercentage: {
    fontSize: 17,
    fontWeight: "800",
    color: "#ffffff",
    textShadowColor: "rgba(0,0,0,0.3)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },

  circleAmount: {
    fontSize: 12,
    fontWeight: "600",
    color: "#ffffff",
    marginTop: 2,
    textShadowColor: "rgba(0,0,0,0.3)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },

  chartCard: {
    marginHorizontal: 20,
    marginTop: 24,
    borderRadius: 20,
    padding: 20,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 4,
  },

  chartTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#6B1C23",
    marginBottom: 16,
    textAlign: "center",
  },

  chart: {
    marginVertical: 8,
    borderRadius: 12,
  },

  fab: {
    position: "absolute",
    bottom: 30,
    left: "50%",
    transform: [{ translateX: -35 }],
    borderRadius: 20,
    padding: 10,
    zIndex: 100,
  },

  fabGradient: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(107, 28, 35, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },

  modalBox: {
    width: "100%",
    maxWidth: 480,
    maxHeight: "85%",
    backgroundColor: "#fff",
    borderRadius: 20,
    overflow: "hidden",
    elevation: 10,
    borderWidth: 2,
    borderColor: "#F4B942",
  },

  modalContent: {
    flexGrow: 1,
       
  },

   modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 20,
    paddingHorizontal: 24,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },

  modalHeaderText: {
    fontSize: 24,
    fontWeight: "800",
    color: "#FFFFFF",
  },

  label: {
    fontSize: 16,
    fontWeight: "600",
    color: "#6B1C23",
    marginBottom: 8,
    marginTop: 8,
  },

  input: {
    backgroundColor: "#FFFBF0",
    borderWidth: 2,
    borderColor: "#F4B942",
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: "#6B1C23",
    marginBottom: 16,
  },

  textArea: {
    height: 80,
    textAlignVertical: "top",
  },

  unitRow: {
    flexDirection: "row",
    marginBottom: 16,
    gap: 8,
  },

  unitBtn: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderWidth: 2,
    borderColor: "#F4B942",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 44,
    backgroundColor: "#FFFBF0",
  },

  unitBtnActive: {
    backgroundColor: "#F4B942",
    borderColor: "#F4B942",
  },

  unitText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6B1C23",
    textAlign: "center",
    numberOfLines: 1,
  },

  unitTextActive: {
    color: "#6B1C23",
    fontWeight: "800",
  },

  goalInfoCard: {
    backgroundColor: "#FEF3C7",
    padding: 20,
    borderRadius: 16,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: "#F4B942",
  },

  goalInfoTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#6B1C23",
    marginBottom: 8,
  },

  goalInfoAmount: {
    fontSize: 20,
    fontWeight: "600",
    color: "#6B1C23",
    marginBottom: 12,
  },

  buttonRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 16,
  },

  saveBtn: {
    flex: 1,
    borderRadius: 12,
    overflow: "hidden",
  },

  saveBtnGradient: {
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#6B1C23",
  },

  saveBtnText: {
    color: "white",
    fontWeight: "700",
    fontSize: 16,
  },

  cancelBtn: {
    flex: 1,
    backgroundColor: "#FFFBF0",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#F4B942",
  },

  cancelBtnText: {
    color: "#6B1C23",
    fontWeight: "600",
    fontSize: 16,
  },

  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },

  toggleText: {
    fontWeight: "600",
    fontSize: 14,
    color: "#6B1C23",
  },

  webInput: {
    width: "100%",
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#F4B942",
    marginBottom: 16,
    fontSize: 16,
    fontFamily: "inherit",
    boxSizing: "border-box",
    backgroundColor: "#FFFBF0",
    color: "#6B1C23",
  },

  autoText: {
    color: "#F4B942",
  },

  customText: {
    color: "#6B1C23",
  },

  backButton: {
    position: 'absolute',
    left: 24,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  chartWrapper: {
    marginTop: 10,
    borderRadius: 20,
    overflow: "hidden",
  },

 

  previewLeft: {
    flex: 1,
  },

  previewLabelSmall: {
    fontSize: 10,
    color: "#FDE68A",
    fontWeight: "700",
    marginBottom: 4,
    letterSpacing: 1,
  },

  previewAmount: {
    fontSize: 26,
    color: "#FFFFFF",
    fontWeight: "800",
  },

  previewRight: {
    alignItems: "flex-end",
    gap: 6,
  },

  previewProgress: {
    backgroundColor: "#F4B942",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 70,
    alignItems: "center",
  },

  previewProgressText: {
    fontSize: 18,
    color: "#6B1C23",
    fontWeight: "800",
  },

  goalCompleteText: {
    fontSize: 11,
    color: "#FDE68A",
    fontWeight: "700",
  },

  // Buttons
  buttonRow: {
    flexDirection: "row",
    gap: 12,
  },

  cancelBtnNew: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#6B1C23",
  },

  cancelBtnTextNew: {
    color: "#6B1C23",
    fontWeight: "700",
    fontSize: 16,
  },

  saveBtnNew: {
    flex: 2,
    borderRadius: 14,
    overflow: "hidden",
    shadowColor: "#6B1C23",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },

  saveBtnDisabled: {
    opacity: 0.5,
    shadowOpacity: 0.1,
  },

  saveBtnGradient: {
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },

  saveBtnText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 16,
  },

  addSavingsModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(107, 28, 35, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },

  addSavingsModalBox: {
    width: "100%",
    maxWidth: 480,
    maxHeight: "90%",
    backgroundColor: "#fff",
    borderRadius: 24,
    overflow: "hidden",
    elevation: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
  },

  addSavingsModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 20,
    paddingHorizontal: 24,
  },

  addSavingsModalHeaderText: {
    fontSize: 22,
    fontWeight: "800",
    color: "#F4B942",
  },

  addSavingsCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(244, 185, 66, 0.2)",
    alignItems: "center",
    justifyContent: "center",
  },

  addSavingsCloseButtonText: {
    fontSize: 20,
    color: "#F4B942",
    fontWeight: "700",
  },

  // Goal Info Card
  addSavingsGoalCard: {
    backgroundColor: "#FFFBEB",
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
    borderWidth: 2,
    borderColor: "#F4B942",
    shadowColor: "#F4B942",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 5,
  },

  addSavingsGoalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
    gap: 12,
  },

  addSavingsGoalNameContainer: {
    flex: 1,
  },

  addSavingsGoalLabel: {
    fontSize: 10,
    color: "#92400E",
    fontWeight: "700",
    marginBottom: 4,
    letterSpacing: 1,
  },

  addSavingsGoalName: {
    fontSize: 20,
    fontWeight: "800",
    color: "#6B1C23",
    lineHeight: 26,
  },

  addSavingsGoalBadge: {
    backgroundColor: "#6B1C23",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    minWidth: 60,
    alignItems: "center",
  },

  addSavingsGoalBadgeText: {
    color: "#F4B942",
    fontSize: 15,
    fontWeight: "800",
  },

  addSavingsAmountContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    paddingVertical: 12,
    backgroundColor: "rgba(254, 243, 199, 0.6)",
    borderRadius: 12,
    paddingHorizontal: 12,
  },

  addSavingsAmountRow: {
    flex: 1,
    alignItems: "center",
  },

  addSavingsLabel: {
    fontSize: 10,
    color: "#92400E",
    fontWeight: "700",
    marginBottom: 6,
    letterSpacing: 1,
  },

  addSavingsCurrentAmount: {
    fontSize: 20,
    fontWeight: "800",
    color: "#059669",
  },

  addSavingsDivider: {
    width: 2,
    height: 36,
    backgroundColor: "#F59E0B",
    marginHorizontal: 16,
    borderRadius: 1,
  },

  addSavingsTargetAmount: {
    fontSize: 20,
    fontWeight: "800",
    color: "#6B1C23",
  },

  addSavingsProgressBarContainer: {
    gap: 8,
  },

  addSavingsProgressBarBackground: {
    height: 10,
    backgroundColor: "#FDE68A",
    borderRadius: 5,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#F59E0B",
  },

  addSavingsProgressBarFill: {
    height: "100%",
    borderRadius: 5,
  },

  addSavingsRemainingContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 2,
  },

  addSavingsRemainingLabel: {
    fontSize: 11,
    color: "#92400E",
    fontWeight: "600",
  },

  addSavingsRemainingAmount: {
    fontSize: 13,
    color: "#6B1C23",
    fontWeight: "800",
  },

  // Input Section
  addSavingsInputSection: {
    marginBottom: 20,
  },

  addSavingsInputLabel: {
    fontSize: 15,
    fontWeight: "700",
    color: "#6B1C23",
    marginBottom: 12,
  },

  addSavingsAmountInputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 2,
    borderColor: "#6B1C23",
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 14,
    shadowColor: "#6B1C23",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },

  addSavingsCurrencySymbol: {
    fontSize: 28,
    fontWeight: "800",
    color: "#6B1C23",
    marginRight: 8,
  },

  addSavingsAmountInput: {
    flex: 1,
    fontSize: 28,
    fontWeight: "800",
    color: "#6B1C23",
    padding: 0,
  },

  addSavingsQuickAmountContainer: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
  },

  addSavingsQuickAmountBtn: {
    flex: 1,
    backgroundColor: "#FFFBEB",
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#F4B942",
  },

  addSavingsQuickAmountText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#6B1C23",
  },

  // Preview Section
  addSavingsNewTotalPreview: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#6B1C23",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 16,
    marginTop: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },

  addSavingsPreviewLeft: {
    flex: 1,
  },

  addSavingsPreviewLabelSmall: {
    fontSize: 10,
    color: "#FDE68A",
    fontWeight: "700",
    marginBottom: 4,
    letterSpacing: 1,
  },

  addSavingsPreviewAmount: {
    fontSize: 26,
    color: "#FFFFFF",
    fontWeight: "800",
  },

  addSavingsPreviewRight: {
    alignItems: "flex-end",
    gap: 6,
  },

  addSavingsPreviewProgress: {
    backgroundColor: "#F4B942",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 70,
    alignItems: "center",
  },

  addSavingsPreviewProgressText: {
    fontSize: 18,
    color: "#6B1C23",
    fontWeight: "800",
  },

  addSavingsGoalCompleteText: {
    fontSize: 11,
    color: "#FDE68A",
    fontWeight: "700",
  },

  // Action Buttons
  addSavingsButtonRow: {
    flexDirection: "row",
    gap: 12,
  },

  addSavingsCancelBtn: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#6B1C23",
  },

  addSavingsCancelBtnText: {
    color: "#6B1C23",
    fontWeight: "700",
    fontSize: 16,
  },

  addSavingsSaveBtn: {
    flex: 2,
    borderRadius: 14,
    overflow: "hidden",
    shadowColor: "#6B1C23",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },

  addSavingsSaveBtnDisabled: {
    opacity: 0.5,
    shadowOpacity: 0.1,
  },

  addSavingsSaveBtnGradient: {
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },

  addSavingsSaveBtnText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 16,
  },
});
if (isMobile) {
  Object.assign(styles, {
    goalCard: {
      ...styles.goalCard,
      minHeight: 140,        // smaller height
      marginHorizontal: 10,  // tighter layout
      borderRadius: 18,
      marginBottom: 14,
    },
    cardContent: {
      ...styles.cardContent,
      padding: 16,           // reduce inner spacing
    },
    goalName: {
      ...styles.goalName,
      fontSize: 16,          // slightly smaller title
    },
    summaryCard: {
      ...styles.summaryCard,
      paddingVertical: 18,
      borderRadius: 18,
      marginHorizontal: 12,
    },
    summaryAmount: {
      ...styles.summaryAmount,
      fontSize: 30,
    },
    progressContainer: {
      ...styles.progressContainer,
      width: 70,
      height: 70,
    },
    circlePercentage: {
      ...styles.circlePercentage,
      fontSize: 12,
    },
    circleAmount: {
      ...styles.circleAmount,
      fontSize: 9,
    },
       menuButton: {
      ...styles.menuButton,
      top: 2,
      right: 2,
      padding: 3,
    },
    container: {
  flex: 1,
  paddingTop:
    Platform.OS === "ios"
      ? 60 // ✅ slightly more for iPhones (safe area)
      : Platform.OS === "android"
      ? 10 // ✅ balanced for Android status bar
      : 20, // ✅ smaller padding for web/desktop
  backgroundColor: "#f8fafc", // optional for consistent look
},
 summaryContent: {
      ...styles.summaryContent,
      paddingVertical: 5, // tighter spacing
    },
    summaryLabel: {
      ...styles.summaryLabel,
      fontSize: 18, // smaller "Total Saved"
    },
      summaryAmount: {
      ...styles.summaryAmount,
      fontSize: 25, // smaller ₱ value
      marginVertical: 3,
    },

    summaryStats: {
      ...styles.summaryStats,
      marginTop: 2,
    },
    statValue: {
      ...styles.statValue,
      fontSize: 15, // smaller numbers
    },
    statLabel: {
      ...styles.statLabel,
      fontSize: 15, // smaller labels
    },

    chartCard: {
      ...styles.chartCard,
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 14,
    },
    chartTitle: {
      ...styles.chartTitle,
      fontSize: 13,
      marginBottom: 8,
    },
    sectionTitle: {
      ...styles.sectionTitle,
      fontSize: 15,
      marginBottom: 6,
    },
  });


}


