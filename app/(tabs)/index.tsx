// @ts-nocheck
  import React, { useCallback, useEffect, useState } from 'react';
  import { Button } from 'react-native';
  import { getCachedData, queueOfflineAction } from "../../lib/offlineCache";
import { LogBox } from "react-native";

LogBox.ignoreLogs([
  "Unexpected text node",                     // 🧘 hides RN-Web text node spam
  "Warning: Text strings must be rendered",   // companion message
]);
  import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Platform,
    Dimensions,
    Modal,
    Pressable,
    TextInput,
    ScrollView,
    Alert,
  } from 'react-native';
  import { Ionicons, MaterialIcons} from '@expo/vector-icons';
  import { MaterialCommunityIcons } from '@expo/vector-icons';
  import AsyncStorage from '@react-native-async-storage/async-storage';
import { getBudgetHistory } from '../../lib/api';
import { Image } from "react-native";
  import { getToken, removeToken, saveToken } from '../../lib/auth';
  import api from '../../lib/api';
  import { router } from 'expo-router';
  import axios from 'axios';
  import { useFocusEffect } from '@react-navigation/native';
import { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { LinearGradient } from "expo-linear-gradient";
let DateTimePicker: any = () => null;
if (Platform.OS !== 'web') {
  DateTimePicker = require('@react-native-community/datetimepicker').default;
}

const showAlert = (title: string, message: string, onConfirm?: () => void) => {
  if (Platform.OS === "web") {
    window.alert(`${title}\n\n${message}`);
    if (onConfirm) onConfirm();
  } else {
    Alert.alert(title, message, [{ text: "OK", onPress: onConfirm }]);
  }
};

  const isWeb = Platform.OS === 'web';
  const { width } = Dimensions.get('window');
  const isMobile = Platform.OS === "ios" || Platform.OS === "android";

 type Expense = {
  _id: string;
  category: string;
  amount: number;
  date: string;
  notes?: string;
};

 type PendingRolloverPeriod = {
  budget: number;
  periodType?: string;
  start?: Date;
  end?: Date;
};

  type BudgetLog = {
  _id: string;
  userId: string;
  type: 'Set Budget' | 'Added to Budget';
  amount: number;
  date: string;
  createdAt: string;
  updatedAt: string;
};
type BudgetHistoryItem = {
  _id: string;
  userId: string;
  period: string;
  budgetAmount: number;
  totalExpenses: number;
  savings: number;
  startDate: string;
  endDate: string;
  status: string;
  createdAt: string;
   success?: boolean; // optional
  reason?: string;   // optional
};

type BudgetPayload = {
  amount: number;
  category: string;
  notes: string;
  userId: string;
  date: string;
  customPeriod?: {
    budgetPeriodStart: string;
    budgetPeriodEnd: string;
  };
};


const BudgetLockTimer = ({ budgetPeriod, budgetPeriodStart }) => {
  const [message, setMessage] = React.useState("");
  const [isVisible, setIsVisible] = React.useState(false);
  const [isExpanded, setIsExpanded] = React.useState(false);
  const isMobile = Platform.OS === "ios" || Platform.OS === "android";

  React.useEffect(() => {
    if (!budgetPeriodStart) return;

    const lockRules = {
      Daily: 2,
      Weekly: 48,
      Monthly: 72,
      Custom: 24,
    };

    const allowedHours = lockRules[budgetPeriod] || 0;
    const lockEnd = new Date(budgetPeriodStart);
    lockEnd.setHours(lockEnd.getHours() + allowedHours);

    const updateTimer = () => {
      const now = new Date();
      const diff = lockEnd.getTime() - now.getTime();

      if (diff <= 0) {
        setMessage(" ");
        setIsVisible(true);
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      const timeLeft =
        hours > 0
          ? `${hours}h ${minutes}m`
          : `${minutes}m ${seconds}s`;

      setMessage(`${timeLeft} to edit`);
      setIsVisible(true);
    };

    updateTimer();
    const timer = setInterval(updateTimer, 1000);
    return () => clearInterval(timer);
  }, [budgetPeriod, budgetPeriodStart]);

  if (!isVisible || !message) return null;

  const isLocked = message.includes(" ");

  return (
    <>
      {/* Floating Badge - Positioned absolutely at top */}
<TouchableOpacity
  activeOpacity={0.9}
  onPress={() => setIsExpanded(!isExpanded)}
  style={{
    position: 'absolute',
    top: isMobile ? 4 : 6,
    right: isMobile ? 4 : 6,
    backgroundColor: '#F0F9FF',
    paddingHorizontal: isMobile ? 1 : 10,
    paddingVertical: isMobile ? 1 : 5,
    borderRadius: 8,
    borderWidth: 0.5,
    borderColor: isLocked ? '#1f4b81ff' : '#FDE68A',
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 1001,
    gap: 2,
    maxWidth: isMobile ? '70%' : '80%',
  }}
>
  <Ionicons
    name={isLocked ? "lock-closed" : "time-outline"}
    size={isMobile ? 8 : 14}
    color={isLocked ? "#1f4b81ff" : "#D97706"}
  />
  <Text
    style={{
      color: isLocked ? "#1f4b81ff" : "#D97706",
      fontSize: isMobile ? 7 : 10,
      fontWeight: '700',
    }}
    numberOfLines={1}
  >
    {message}
  </Text>
  <Ionicons
    name={isExpanded ? "chevron-up" : "chevron-down"}
    size={isMobile ? 8 : 12}
    color={isLocked ? "#1f4b81ff" : "#D97706"}
  />
</TouchableOpacity>

      {/* Expanded Popout as Modal - Renders at top level */}
      {isExpanded && (
        <Modal
          visible={isExpanded}
          transparent
          animationType="fade"
          onRequestClose={() => setIsExpanded(false)}
        >
          <Pressable 
            style={{
              flex: 1,
              backgroundColor: 'rgba(0, 0, 0, 0.3)',
            }}
            onPress={() => setIsExpanded(false)}
          >
            <View
              style={{
                position: 'absolute',
                top: isMobile ? 50 : 55,
                right: 10,
                backgroundColor: '#FFFFFF',
                borderRadius: isMobile ? 10 : 12,
                padding: isMobile ? 12 : 16,
                borderWidth: 1,
                borderColor: isLocked ? '#1f4b81ff' : '#FDE68A',
                shadowColor: '#000',
                shadowOpacity: 0.2,
                shadowRadius: 15,
                shadowOffset: { width: 0, height: 5 },
                elevation: 10,
                maxWidth: isMobile ? '85%' : 350,
                minWidth: isMobile ? 260 : 300,
              }}
              onStartShouldSetResponder={() => true}
            >
              {/* Close Button */}
              <TouchableOpacity
                onPress={() => setIsExpanded(false)}
                style={{
                  position: 'absolute',
                  top: 6,
                  right: 6,
                  padding: 4,
                  zIndex: 1,
                }}
              >
                <Ionicons name="close" size={16} color="#1f4b81ff" />
              </TouchableOpacity>

              {/* Compact Icon + Title Row */}
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8, paddingRight: 20 }}>
                <View
                  style={{
                    width: isMobile ? 32 : 40,
                    height: isMobile ? 32 : 40,
                    borderRadius: isMobile ? 16 : 20,
                    backgroundColor: isLocked ? '#f8f3f3ff' : '#FEF3C7',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: 10,
                  }}
                >
                  <Ionicons
                    name={isLocked ? "lock-closed" : "time-outline"}
                    size={isMobile ? 16 : 20}
                    color={isLocked ? "#1f4b81ff" : "#D97706"}
                  />
                </View>
                <Text
                  style={{
                    fontSize: isMobile ? 13 : 15,
                    fontWeight: '700',
                    color: '#1E293B',
                    flex: 1,
                  }}
                >
                  {isLocked ? "Budget Locked" : "Edit Window"}
                </Text>
              </View>

              {/* Message - Compact */}
              <Text
                style={{
                  fontSize: isMobile ? 11 : 13,
                  color: '#1f4b81ff',
                  lineHeight: isMobile ? 16 : 18,
                  marginBottom: 10,
                }}
              >
                {isLocked
                  ? "If the set budget timer runs out, you can only add budget. Setting another budget is restricted for this period."
                  : "You can still set or edit your budget. After timer expires, only additions will be allowed."}
              </Text>

             
            </View>
          </Pressable>
        </Modal>
      )}
    </>
  );
};

  export default function Home() {
    const [fullName, setFullName] = useState<string | null>(null);
 const [budgetPeriod, setBudgetPeriod] = useState<string | null>(null);
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [menuVisible, setMenuVisible] = useState(false);
    const periods = ['Daily', 'Weekly', 'Monthly', 'Custom'];
    const [totalExpense, setTotalExpense] = useState<number>(0);
    const [remainingBudget, setRemainingBudget] = useState(0);
    const [budgetAmount, setBudgetAmount] = useState(0);
    const [transactions, setTransactions] = useState<IDBTransaction[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [balance, setBalance] = useState<number>(0);
    const [showCustomPicker, setShowCustomPicker] = useState(false);
    const [endDate, setEndDate] = useState<Date | null>(null);
    const [showStartPicker, setShowStartPicker] = useState(false);
    const [showEndPicker, setShowEndPicker] = useState(false);
    const [startDate, setStartDate] = useState<Date | null>(null);
    const [hasLoadedInitialData, setHasLoadedInitialData] = useState(false);
    const [customStartDate, setCustomStartDate] = useState(null);
const [customEndDate, setCustomEndDate] = useState(null);

 const [unreadNotifications, setUnreadNotifications] = useState(0);


    // Modals and form states
    const [showSetBudgetModal, setShowSetBudgetModal] = useState(false);
    const [showAddBudgetModal, setShowAddBudgetModal] = useState(false);
    const [setBudgetValue, setSetBudgetValue] = useState('');
    const [addBudgetValue, setAddBudgetValue] = useState('');
    const [showBudgetAction, setShowBudgetAction] = useState(false);

    // ---- NEW EXPENSE MODAL STATE ----
    const [expenseTitle, setExpenseTitle] = useState('');
    const [expenseAmount, setExpenseAmount] = useState('');
    const [expenseCategory, setExpenseCategory] = useState('Select Category');
    const [expenseNotes, setExpenseNotes] = useState('');
    const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  // 🔥 Expense Detail Modal State
    const [selectedTransaction, setSelectedTransaction] = useState<IDBTransaction | null>(null);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [budgetPeriodStart, setBudgetPeriodStart] = useState(null);
    const [budgetPeriodEnd, setBudgetPeriodEnd] = useState(null); // only needed for 'Custom'
    const [budgetHistory, setBudgetHistory] = useState<BudgetHistoryItem[]>([]);
    const [budgetLogs, setBudgetLogs] = useState<BudgetLog[]>([]);

    const [historyModalVisible, setHistoryModalVisible] = useState(false);
const [historyExpenses, setHistoryExpenses] = useState<Expense[]>([]);
const [historyModalTitle, setHistoryModalTitle] = useState('');

    // ---- custom category----
    const [customCategories, setCustomCategories] = useState<string[]>([]);
const [showCustomCategoryInput, setShowCustomCategoryInput] = useState(false);
const [customCategoryInput, setCustomCategoryInput] = useState('');
const [hasLoadedUserProfile, setHasLoadedUserProfile] = useState(false);
const [showRolloverEditModal, setShowRolloverEditModal] = useState(false);
const [lastRolloverDateShown, setLastRolloverDateShown] = useState<Date | null>(null);
const [showPeriodRolloverPrompt, setShowPeriodRolloverPrompt] = useState(false);
const [pendingRolloverPeriod, setPendingRolloverPeriod] = useState<PendingRolloverPeriod | null>(null);
const [rolloverContext, setRolloverContext] = useState('auto'); // 'auto' or 'manual'
const [showGettingStarted, setShowGettingStarted] = useState(false);

const [othersExpanded, setOthersExpanded] = useState(false);
const { min, max } = getPeriodDateRange(budgetPeriod, startDate, endDate);
const [showFirstTimeNotice, setShowFirstTimeNotice] = useState(false);


// Editing states
const [editBudgetValue, setEditBudgetValue] = useState('');
const [editBudgetPeriod, setEditBudgetPeriod] = useState('');

const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
    // ---- date setter ----
    const [customDate, setCustomDate] = useState<Date | null>(new Date()); // Default: today
    
// (Removed invalid top-level await code. Avatar upload is handled in handleAvatarUpload.)

useFocusEffect(
  useCallback(() => {
      const fetchUser = async () => {
        try {
          const token = await getToken();
          if (!token?.id) return;

          const response = await api.get(`/auth/${token.id}`);
          const user = response.data;

          setUser(user);
          setAvatarUrl(user.avatarUrl || null);
          setFullName(`${user.firstName} ${user.lastName}`);

          // ✅ Save into SecureStore
          await saveToken({
            ...token,
            firstName: user.firstName,
            lastName: user.lastName,
            budgetPeriod: user.budgetPeriod,
            avatarUrl: user.avatarUrl || null,
          });
        } catch (err) {
          console.error("Failed to refresh user:", err);
        }
      };
      fetchUser();
    }, [])
  );
   useFocusEffect(
  useCallback(() => {
     const fetchUser = async () => {
      try {
        const token = await getToken();
        if (!token?.id) return;

        // ✅ Use cached fetch
        const user = await getCachedData(
          `/auth/${token.id}`,
          `user_${token.id}`
        );

        setUser(user);
        setAvatarUrl(user.avatarUrl || null);
        setFullName(`${user.firstName} ${user.lastName}`);

        await saveToken({
          ...token,
          firstName: user.firstName,
          lastName: user.lastName,
          budgetPeriod: user.budgetPeriod,
          avatarUrl: user.avatarUrl || null,
        });
      } catch (err) {
        console.log("⚠️ Offline: showing cached user data");
      }
    };
    fetchUser();
  }, [])
);

// Load custom categories from AsyncStorage when the app loads
useEffect(() => {
  const loadUserCategories = async () => {
    const token = await getToken();
    if (!token?.id) return;
    const stored = await AsyncStorage.getItem(`customCategories_${token.id}`);
    if (stored) setCustomCategories(JSON.parse(stored));
    else setCustomCategories([]);
  };
  loadUserCategories();
}, []);

const [overspendExpanded, setOverspendExpanded] = useState(false);


// Save categories to AsyncStorage
const saveCustomCategories = async (categories: string[]) => {
  setCustomCategories(categories);
  const token = await getToken();
  if (token?.id) {
    await AsyncStorage.setItem(`customCategories_${token.id}`, JSON.stringify(categories));
  }
};

// --- fetch first-time alert logic remains mostly the same ---
// just protect the backend calls with cache fallback
useEffect(() => {
  const showFirstTimeBudgetAlert = async () => {
    try {
      const token = await getToken();
      if (!token?.id) return;

      const userId = token.userId || token._id || token.id || "guest";
      const key = `hasSeenBudgetPeriodNotice_${userId}`;
      const hasSeen = await AsyncStorage.getItem(key);
      if (hasSeen === "true") return;

      // ✅ try cached profile first
      const user = await getCachedData(
        `/auth/${token.id}`,
        `user_${token.id}`
      );

      // ✅ try cached history first
      const history = await getCachedData(
        `/budget-history/${token.id}`,
        `budgetHistory_${token.id}`
      );

      if (history?.length > 0) {
        await AsyncStorage.setItem(key, "true");
        return;
      }

      await showAlert(
        "Welcome to MoneyMigo 🎉",
        `Your default budget period is set to ${user.budgetPeriod || "Weekly"}.\nStart by setting your first budget amount!`,
        async () => await AsyncStorage.setItem(key, "true")
      );

      await AsyncStorage.setItem(key, "true");
    } catch {
      console.log("⚠️ Offline: skipping welcome notice");
    }
  };
  showFirstTimeBudgetAlert();
}, []);

useEffect(() => {
  const showFirstTimeTutorial = async () => {
    try {
      const token = await getToken();
      if (!token?.id) return;

      const userId = token.userId || token._id || token.id || "guest";
      const key = `hasSeenGettingStarted_${userId}`;
      const hasSeen = await AsyncStorage.getItem(key);
      if (hasSeen === "true") return;

      // Check if user already has activity
      const [historyRes, savingsRes] = await Promise.allSettled([
        api.get(`/budget-history/${token.id}`),
        api.get(`/savings/${token.id}`)
      ]);

      const hasHistory =
        historyRes.status === "fulfilled" &&
        Array.isArray(historyRes.value.data) &&
        historyRes.value.data.length > 0;

      const hasSavings =
        savingsRes.status === "fulfilled" &&
        Array.isArray(savingsRes.value.data) &&
        savingsRes.value.data.length > 0;

      if (hasHistory || hasSavings) {
        await AsyncStorage.setItem(key, "true");
        return;
      }

      // 🎉 Show the getting started modal if brand new
      setShowGettingStarted(true);
    } catch (err) {
      console.error("❌ Error checking first-time tutorial:", err);
    }
  };

  showFirstTimeTutorial();
}, []);



// --- fetch unread notifications (cached) ---
const fetchUnreadCount = async () => {
  try {
    const token = await getToken();
    if (!token?.id) return;

    const data = await getCachedData(
      `/notifications/${token.id}`,
      `notifications_${token.id}`
    );
    const unreadCount = data.filter((n) => !n.read).length;
    setUnreadNotifications(unreadCount);
  } catch {
    console.log("⚠️ Offline: using cached notifications");
  }
};

// Call it on mount and when screen comes into focus
useEffect(() => {
  fetchUnreadCount();
}, []);

useFocusEffect(
  useCallback(() => {
    fetchUnreadCount();
  }, [])
);


const openHistoryExpenses = async (item: BudgetHistoryItem) => {
  // 🧭 Modal header
  setHistoryModalTitle(
    `${item.period} (${new Date(item.startDate).toLocaleDateString()} — ${new Date(
      item.endDate
    ).toLocaleDateString()})`
  );
  setHistoryModalVisible(true);
  setHistoryExpenses([]);

  try {
    const token = await getToken();
    if (!token?.id) {
      alert("Not logged in");
      return;
    }

    // 🕒 1-day timezone buffer
    const start = new Date(item.startDate);
    const end = new Date(item.endDate);
    start.setDate(start.getDate() - 1);
    end.setDate(end.getDate() + 1);

    // ✅ Initial fetch attempt
    const res = await api.get(`/expenses/history`, {
      params: {
        userId: token.id,
        start: start.toISOString().slice(0, 10),
        end: end.toISOString().slice(0, 10),
      },
    });

    let fetched = res.data.expenses || [];

    // ⚠️ Handle "Incomplete" or legacy ongoing budgets
    if (fetched.length === 0 && item.status === "not completed") {
      const altStart = new Date(item.startDate);
      const altEnd = new Date(item.endDate);
      altStart.setDate(altStart.getDate() - 5);
      altEnd.setDate(altEnd.getDate() + 5);

      const fallback = await api.get(`/expenses/history`, {
        params: {
          userId: token.id,
          start: altStart.toISOString().slice(0, 10),
          end: altEnd.toISOString().slice(0, 10),
        },
      });

      fetched = fallback.data.expenses || [];
    }

    // 🪟 Populate modal data
    setHistoryExpenses(fetched);

    // 💬 Friendly notice if no data
    if (fetched.length === 0) {
      showAlert("Error","No recorded expenses for this period.");
    }
  } catch (err) {
    console.error("❌ Failed to fetch expenses for that period:", err);
    setHistoryExpenses([]);
    showAlert("Error","Failed to fetch expenses for that period.");
  }
};



// --- rollover check (cached safe) ---
const checkAutoPeriodRollover = async () => {
  const token = await getToken();
  if (!token?.id) return;
  try {
    const res = await api.post(`/auth/${token.id}/rollover-budget-period`);
    if (res.data?.message?.includes("rolled over")) {
      const user = await getCachedData(`/auth/${token.id}`, `user_${token.id}`);
      setBudgetPeriod(user.budgetPeriod);
      setStartDate(user.budgetPeriodStart ? new Date(user.budgetPeriodStart) : null);
      setEndDate(user.budgetPeriodEnd ? new Date(user.budgetPeriodEnd) : null);
      setBudgetAmount(user.budgetAmount);
      await Promise.all([
        fetchBudgetHistory(),
        fetchRemainingBudget(),
        fetchTotalExpense()
      ]);
      await showRolloverModalWithLatestBudget();
    }
  } catch {
    console.log("⚠️ Offline: skipping rollover check");
  }
};



// On app load -> always check once in case endDate was already passed
useEffect(() => {
  checkAutoPeriodRollover();
}, []);

// Then schedule timer only once per cycle
useEffect(() => {
  if (!endDate) return;

  const msUntilEnd = endDate.getTime() - Date.now();
  if (msUntilEnd > 0) {
    const timer = setTimeout(() => {
      console.log("⏰ Period ended, triggering rollover check...");
      checkAutoPeriodRollover();
    }, msUntilEnd);

    return () => clearTimeout(timer);
  }
}, [endDate]);



  const logout = async () => {
  try {
    // 🧹 Remove locally stored data (token, cached user info, etc.)
    await removeToken();

    // 🧠 Optionally clear cached data if you want a fresh login later
    await AsyncStorage.multiRemove([
      "authToken",
      "userData",
      // You can clear other cached keys if needed:
      // `user_${user?.id}`, `budgetHistory_${user?.id}`, `notifications_${user?.id}`
    ]);

    // 🚀 Try routing — if offline, it will silently fail and stay on current page
    try {
      router.replace("/login");
    } catch {
      console.log("⚠️ Offline logout — navigation skipped until reconnect.");
    }

    console.log("✅ Logged out successfully");
  } catch (err) {
    console.error("❌ Logout error:", err);
  }
};

// --- fetch budget history (cached) ---
const fetchBudgetHistory = async () => {
  const token = await getToken();
  if (!token?.id) return;

  const data = await getCachedData(
    `/budget-history/${token.id}`,
    `budgetHistory_${token.id}`
  );
  setBudgetHistory(data);
};


// 🔁 Auto-refresh whenever period or dates change
useEffect(() => {
  const refreshAll = async () => {
    await fetchBudgetHistory();
    await fetchBudgetLogs();
    await fetchRemainingBudget();
    await fetchTotalExpense();
    await fetchExpensesForCurrentPeriod();
  };

  refreshAll();
}, [budgetPeriod, startDate, endDate]);




 // 🔧 Add Budget Handler
const handleAddBudget = async () => {
  const token = await getToken();
  if (!token?.id) {
    showAlert("Error", "User not authenticated");
    return;
  }

  if (!addBudgetValue || isNaN(Number(addBudgetValue))) {
    showAlert("Error", "Please enter a valid amount");
    return;
  }

  setIsLoading(true);

  try {
    const payload = {
      budgetAmount: Number(addBudgetValue),
      budgetPeriod,
      type: "Add Budget",
      userId: token.id, // ✅ important for offline deduplication
    };

    const net = await NetInfo.fetch(); // ✅ more reliable than navigator.onLine in native

    if (net.isConnected) {
      // 🟢 Online → send directly to API
      await api.put(`/auth/${token.id}/update-budget-amount`, payload);

      // ✅ refresh live + cache
      const updatedUser = await getCachedData(`/auth/${token.id}`, `user_${token.id}`);
      setBudgetAmount(updatedUser.budgetAmount);
      showAlert("Success", "✅ Budget increased!");
    } else {
      // 🔴 Offline → queue for later sync
      await queueOfflineAction(`/auth/${token.id}/update-budget-amount`, "PUT", payload);

      // ✅ fallback: use cached last known data
      const cachedUser = await getCachedData(`/auth/${token.id}`, `user_${token.id}`);
      setBudgetAmount(cachedUser?.budgetAmount || 0);
      showAlert("Offline", "📦 No internet. Budget will sync when you're back online.");
    }

    // 🧹 Reset modal and fields
    setShowAddBudgetModal(false);
    setAddBudgetValue("");

    // 🔁 Refresh dependent views (safe to call even offline)
    await fetchRemainingBudget();
    await fetchBudgetLogs();
  } catch (err) {
    console.error("❌ Add budget error:", err);
    showAlert("Error", "Failed to add budget. Please try again.");
  } finally {
    setIsLoading(false);
  }
};





// 🔧 Set Budget Handler
const handleSetBudget = async () => {
  const token = await getToken();
  if (!token?.id) {
    showAlert("Error", "User not authenticated");
    return;
  }

  if (!setBudgetValue || isNaN(Number(setBudgetValue))) {
    showAlert("Error", "Please enter a valid amount");
    return;
  }

  if (budgetPeriod === "Custom" && (!startDate || !endDate)) {
    showAlert("Warning", "⚠️ Please select BOTH start and end dates for custom period");
    return;
  }

  setIsLoading(true);

  try {
    const payload = {
      budgetAmount: Number(setBudgetValue),
      budgetPeriod,
      type: "Set Budget",
      userId: token.id, // ✅ for deduplication in offline queue
      ...(budgetPeriod === "Custom" && startDate && endDate
        ? {
            customPeriod: {
              budgetPeriodStart: startDate.toISOString(),
              budgetPeriodEnd: endDate.toISOString(),
            },
          }
        : {}),
    };

    const net = await NetInfo.fetch(); // ✅ more reliable for RN than navigator.onLine

    if (net.isConnected) {
      // 🟢 Online: send to API
      const res = await api.put(`/auth/${token.id}/update-budget-amount`, payload);
      const data = res.data;

      // ✅ Update UI instantly
      setBudgetAmount(data.budgetAmount);
      setBudgetPeriod(data.budgetPeriod);
      if (data.budgetPeriodStart) setStartDate(new Date(data.budgetPeriodStart));
      if (data.budgetPeriodEnd) setEndDate(new Date(data.budgetPeriodEnd));

      // ✅ Cache updated data for offline view
      await AsyncStorage.setItem(`user_${token.id}`, JSON.stringify(data));

      showAlert("Success", "✅ Budget set!");
    } else {
      // 🔴 Offline: queue for later sync
      await queueOfflineAction(`/auth/${token.id}/update-budget-amount`, "PUT", payload);

      // ✅ fallback to last cached data
      const cachedUser = await getCachedData(`/auth/${token.id}`, `user_${token.id}`);
      setBudgetAmount(cachedUser?.budgetAmount || 0);
      showAlert("Offline", "📦 Budget saved locally and will sync when back online.");
    }

    // ✅ Close modal and refresh local views
    setShowSetBudgetModal(false);
    setSetBudgetValue("");

    await Promise.all([
      fetchRemainingBudget(),
      fetchBudgetLogs(),
      fetchBudgetHistory(),
      fetchTotalExpense(),
      fetchExpensesForCurrentPeriod(),
    ]);
  } catch (err) {
    console.error("❌ Set budget error:", err);
    showAlert("Error", "Failed to set budget. Please try again.");
  } finally {
    setIsLoading(false);
  }
};






const fetchBudgetLogs = async () => {
  const token = await getToken();
  if (!token?.id) return;

  try {
    const data = await getCachedData(`/budget-logs/${token.id}`, `budgetLogs_${token.id}`);
    setBudgetLogs(data);
  } catch {
    console.log("⚠️ Offline: showing cached budget logs");
  }
};


// ⏳ Load logs on mount
useEffect(() => {
  fetchBudgetLogs();
}, []);

// Fetch the latest budget start date after period change or after adding expense
const reloadUserProfile = async () => {
  const token = await getToken();
  if (!token || !token.id) return;
  const res = await api.get(`/auth/${token.id}`);
  const user = res.data;
  setBudgetPeriod(user.budgetPeriod);
  setStartDate(user.budgetPeriodStart ? new Date(user.budgetPeriodStart) : null);

};

const fetchExpensesForCurrentPeriod = async () => {
  const token = await getToken();
  if (!token?.id) return;

  try {
    const data = await getCachedData(`/expenses/user/${token.id}`, `expenses_${token.id}`);
    setTransactions(data);
  } catch {
    console.log("⚠️ Offline: showing cached expenses");
  }
};


const categoryIcons: any = {
  Food: <Ionicons name="fast-food" size={20} color="#475569" />,
  Transport: <MaterialCommunityIcons name="bus" size={20} color="#475569" />,
  Bills: <MaterialCommunityIcons name="file-document-outline" size={20} color="#475569" />,
  School: <MaterialCommunityIcons name="school" size={20} color="#475569" />,
  Shopping: <MaterialCommunityIcons name="cart" size={20} color="#475569" />,
  Savings: <Ionicons name="cash-outline" size={20} color="#16a34a" />,   // ✅ New
  Others: <MaterialCommunityIcons name="dots-horizontal" size={20} color="#475569" />,
};


// Fetch remaining budget
  const fetchRemainingBudget = async () => {
  try {
    const user = await getToken();
    if (!user || !user.id) return;
    // 🔥 Log period sent
    console.log('[FETCH BUDGET] period:', budgetPeriod);

    const res = await api.get('/auth/balance', {
      params: {
        userId: user.id,
        period: (budgetPeriod ?? '').toLowerCase(),
      },
    });
    setRemainingBudget(res.data.remainingBudget);
    setBudgetAmount(res.data.budgetAmount);
  } catch (err) {}
};


const updateBudgetPeriod = async (
  newPeriod: string,
  startDate: Date | null,
  endDate: Date | null
) => {
  try {
    const user = await getToken();
    if (!user || !user.id) return;

    const payload: BudgetPayload = {
  amount: parseFloat(expenseAmount),
  category: expenseCategory,
  notes: expenseNotes,
  userId: user.id,
  date: (customDate || new Date()).toISOString(),
};

if (newPeriod === 'Custom' && startDate && endDate) {
  payload.customPeriod = {
    budgetPeriodStart: startDate.toISOString(),
    budgetPeriodEnd: endDate.toISOString(),
  };
}

    await api.put(`/auth/${user.id}/update-budget-amount`, payload);
  } catch (err) {
    alert('Failed to update budget period');
    throw err;
  }
};


const saveCustomRange = async (startDate: Date, endDate: Date) => {
  await AsyncStorage.setItem("customBudgetPeriodStart", startDate.toISOString());
await AsyncStorage.setItem("customBudgetPeriodEnd", endDate.toISOString());

};


const loadCustomRange = async () => {
  const start = await AsyncStorage.getItem('customBudgetPeriodStart');
const end = await AsyncStorage.getItem('customBudgetPeriodEnd');
  return {
    startDate: start ? new Date(start) : null,
    endDate: end ? new Date(end) : null,
  };
};

const fetchTotalExpense = async () => {
  const token = await getToken();
  if (!token || !token.id || !budgetPeriod) return;

  // Get the correct min/max for the period!
  const { min, max } = getPeriodDateRange(budgetPeriod, startDate, endDate);

  const params = {
    userId: token.id,
    period: budgetPeriod.toLowerCase(),
    startDate: min.toISOString(),
    endDate: max.toISOString(),
  };

  try {
    const res = await api.get('/expenses/total', { params });
    setTotalExpense(res.data.total || 0);
  } catch (err) {
    console.error('Error fetching total expense:', err);
  }
};





    // Fetch balance (not used in UI)
    const fetchBalance = async () => {
      try {
        const user = await getToken();
        if (!user || !user.id) return;
        const res = await api.get('/auth/balance', {
          params: {
            userId: user.id,
                period: (budgetPeriod ?? '').toLowerCase(),
          },
        });
        setBalance(Number(res.data.remainingBudget));
      } catch (err) {}
    };

   function groupTransactionsByDate(transactions: IDBTransaction[]) {
  const grouped: Record<string, IDBTransaction[]> = {};

  transactions.forEach((transaction) => {
    const manilaDate = new Date(
      new Date(transaction.date).toLocaleString('en-US', { timeZone: 'Asia/Manila' })
    );

    const dateStr = manilaDate.toLocaleDateString('en-PH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    if (!grouped[dateStr]) {
      grouped[dateStr] = [];
    }
    grouped[dateStr].push(transaction);
  });

  return grouped;
}


const capitalize = (str?: string) => {
  if (!str) return 'Others';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

const shortcuts = [ 
  { icon: '💸', label: 'Expenses', path: '/expenses?period=' + budgetPeriod }, 
  { icon: '💰', label: 'Budget Plan', path: '/budget' }, 
  { icon: '🛍️', label: 'Marketplace', path: '/deals' }, 
  { icon: '📘', label: 'Tools', path: '/tools' }, 
  { icon: '📈', label: 'Tracker', path: '/analytics' }, 
  { icon: '🎯', label: 'Savings Goals', path: '/savings' }, ];



useEffect(() => {
  const fetchUser = async () => {
    const token = await getToken();
    if (!token?.id) return;

    try {
      const res = await api.get(`/auth/${token.id}`);
      const user = res.data;

      setBudgetPeriod(user.budgetPeriod);

      if (user.budgetPeriod === "Custom") {
        if (user.customBudgetRange?.budgetPeriodStart && user.customBudgetRange?.budgetPeriodEnd) {
          // ✅ Backend has the custom dates → trust these
          setStartDate(new Date(user.customBudgetRange.budgetPeriodStart));
          setEndDate(new Date(user.customBudgetRange.budgetPeriodEnd));
        } else {
          // ⏪ Fallback to AsyncStorage if backend doesn’t store it
          const start = await AsyncStorage.getItem("customBudgetPeriodStart");
          const end = await AsyncStorage.getItem("customBudgetPeriodEnd");
          setStartDate(start ? new Date(start) : null);
          setEndDate(end ? new Date(end) : null);
        }
      } else {
        // Normal periods: Daily / Weekly / Monthly
        setStartDate(user.budgetPeriodStart ? new Date(user.budgetPeriodStart) : null);
        setEndDate(user.budgetPeriodEnd ? new Date(user.budgetPeriodEnd) : null);
      }

      setHasLoadedUserProfile(true);
    } catch (err) {
      console.error("❌ Failed to fetch user profile:", err);
    }
  };

  fetchUser();
}, []);






useEffect(() => {
  const fetchHistory = async () => {
    const token = await getToken();
    if (!token?.id) return;
    const history = await getBudgetHistory(token.id);
    setBudgetHistory(history); // You define this useState in your component
  };
  fetchHistory();
}, []);

useEffect(() => {
  const fetchInitialData = async () => {
    const token = await getToken();
    if (!token || !token.id) {
      router.replace("/login");
      return;
    }

    try {
      const res = await api.get(`/auth/${token.id}`);
      const user = res.data;

      // Update UI
      setFullName(`${user.firstName} ${user.lastName}`);
      setBudgetPeriod(user.budgetPeriod || "Weekly");

      // ✅ Persist everything including avatar
      await saveToken({
        ...token,
        firstName: user.firstName,
        lastName: user.lastName,
        budgetPeriod: user.budgetPeriod,
        avatarUrl: user.avatarUrl || null,
      });

      if (user.budgetPeriod === "Custom") {
        const { startDate: loadedStart, endDate: loadedEnd } = await loadCustomRange();
        setStartDate(loadedStart);
        setEndDate(loadedEnd);
      }
    } catch (err) {
      console.error("Error loading user data:", err);
    }
  };

  fetchInitialData();
}, []);





useEffect(() => {
  const shouldFetch = () => {
    if (!budgetPeriod) return false;
    if (budgetPeriod === 'Custom') return !!startDate && !!endDate;
    return true;
  };

  if (shouldFetch()) {
    fetchTotalExpense();
  }
}, [budgetPeriod, startDate, endDate]);




useEffect(() => {
  if (hasLoadedUserProfile && budgetPeriod) {
    fetchRemainingBudget();
    fetchTotalExpense();
   fetchExpensesForCurrentPeriod();
    // Any other fetches that depend on correct period!
  }
}, [hasLoadedUserProfile, budgetPeriod, startDate, endDate]);

useFocusEffect(
  useCallback(() => {
    const loadOnFocus = async () => {
      await fetchExpensesForCurrentPeriod();
      await fetchTotalExpense();
      await fetchRemainingBudget();
      // add other needed fetches here!
    };
    loadOnFocus();
  }, [budgetPeriod, startDate, endDate])
);

// This must come AFTER your states are updated by fetching user/budget info



const handleSetBudgetEditRollover = async () => {
  const token = await getToken();
  if (!token?.id) {
   showAlert("Error","User not authenticated");
    return;
  }

  try {
    const body: any = {
      budgetAmount: Number(editBudgetValue),
      budgetPeriod: editBudgetPeriod,
      type: "Set Budget",
    };

    if (editBudgetPeriod === "Custom") {
      if (!customStartDate || !customEndDate) {
        showAlert("Error","⚠️ Please select BOTH start and end dates");
        return;
      }

      body.customPeriod = {
        budgetPeriodStart: new Date(customStartDate).toISOString(),
        budgetPeriodEnd: new Date(customEndDate).toISOString(),
      };
    }

    console.log("📤 Final payload:", body);

    // 🔥 Save to backend
    await api.put(`/auth/${token.id}/update-budget-amount`, body);

    // ✅ Immediately update local state so UI reflects instantly
    setBudgetAmount(body.budgetAmount);
    setBudgetPeriod(body.budgetPeriod);

    if (body.budgetPeriod === "Custom" && body.customPeriod) {
      setStartDate(new Date(body.customPeriod.budgetPeriodStart));
      setEndDate(new Date(body.customPeriod.budgetPeriodEnd));
    }

    // ✅ Refresh everything (so logs/expenses update immediately)
    await Promise.all([
      fetchBudgetHistory(),
      fetchBudgetLogs(),
      fetchRemainingBudget(),
      fetchTotalExpense(),
      fetchExpensesForCurrentPeriod(),
    ]);

    showAlert("Success","✅ Budget and period updated!");
  } catch (err: any) {
    console.error("❌ Set budget error:", err.response?.data || err);
   showAlert("Error","Failed to update settings!");
  }
};


const handleChangePeriod = async (period: string, startDate = null, endDate = null) => {
  try {
    const token = await getToken();
    if (!token || !token.id) return;

    const payload =
      period === "Custom" && startDate && endDate
        ? {
            newPeriod: "Custom",
            newStart: (startDate as Date).toISOString(),
            newEnd: (endDate as Date).toISOString(),
          }
        : { newPeriod: period };

    console.log("📤 Payload being sent:", payload);

    const res = await api.post(`/auth/${token.id}/change-budget-period`, payload);

    // ✅ Fetch new user profile immediately
    const userRes = await api.get(`/auth/${token.id}`);
    const user = userRes.data;

    // ✅ Update local state from backend response right away
    setBudgetPeriod(user.budgetPeriod);
    setBudgetAmount(user.budgetAmount);
    setStartDate(user.budgetPeriodStart ? new Date(user.budgetPeriodStart) : null);
    setEndDate(user.budgetPeriodEnd ? new Date(user.budgetPeriodEnd) : null);

    // ✅ Refresh everything (so logs/expenses update instantly)
    await Promise.all([
      fetchRemainingBudget(),
      fetchTotalExpense(),
      fetchExpensesForCurrentPeriod(),
      fetchBudgetLogs(),
      fetchBudgetHistory(),
    ]);

    // Show modal (manual rollover flow)
    
    setRolloverContext("manual");
    setPendingRolloverPeriod({
      budget: user.budgetAmount || 0,
      periodType: user.budgetPeriod,
       // @ts-ignore
      start: user.budgetPeriodStart ? new Date(user.budgetPeriodStart) : null,
       // @ts-ignore
      end: user.budgetPeriodEnd ? new Date(user.budgetPeriodEnd) : null,
    });
    await showRolloverModalWithLatestBudget();

    alert(res.data.message || `Budget period reset and set to ${period}`);
  } catch (error) {
    alert("Failed to change budget period");
    console.error("❌ handleChangePeriod error:", error);
  }
};


const handleEditBudgetChange = (text: string) => {
  // Allow "0." for decimal input
  if (text === '0' || text === '0.' || text.startsWith('0.')) {
    setEditBudgetValue(text);
    return;
  }
  // For any other case, strip leading zeros (but keep empty)
  const cleaned = text.replace(/^0+/, '') || '0';
  setEditBudgetValue(cleaned);
};


const daysDifference = (inputDate: string | Date) => {
  const todayPH = new Date(
    new Date().toLocaleString('en-US', { timeZone: 'Asia/Manila' })
  );
  const inputPH = new Date(
    new Date(inputDate).toLocaleString('en-US', { timeZone: 'Asia/Manila' })
  );

  todayPH.setHours(0, 0, 0, 0);
  inputPH.setHours(0, 0, 0, 0);

  const diffTime = todayPH.getTime() - inputPH.getTime();
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
};


const handleStartDateChange = (event: any, selectedDate: Date | undefined) => {
  if (selectedDate) {
    setStartDate(selectedDate);
  }
setShowCustomPicker(true); // or false, depending on your logic
};

const handleEndDateChange = (event: any, selectedDate: Date | undefined) => {
  if (selectedDate) {
    setEndDate(selectedDate);
  }
setShowCustomPicker(true); // or false, depending on your logic
};

function isWithinPeriod(dateString: string, start: Date, end?: Date | null): boolean {
  if (!start || !dateString) return false;
  const date = new Date(dateString);
  const s = new Date(start);
  const e = end ? new Date(end) : null;
  return e ? (date >= s && date < e) : (date >= s);
}

// Always use: date >= min && date < max
function getPeriodDateRange(
  period: string | null,
  startDate: Date | null,
  endDate: Date | null
): { min: Date; max: Date } {  const now = new Date();
  let start, end;

  
    // ✅ Normalize casing so "daily" → "Daily", "weekly" → "Weekly", etc.
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



function parseDateLocal(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function formatDateInputValue(date: Date | null): string {
  if (!date) return '';
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// --- Fetch & Show Rollover Modal with Latest Budget ---
const showRolloverModalWithLatestBudget = async () => {
  const token = await getToken();
  if (!token || !token.id) return;
  // Always fetch latest user data
  const userRes = await api.get(`/auth/${token.id}`);
  const user = userRes.data;
  setPendingRolloverPeriod({
    start: getPeriodDateRange(user.budgetPeriod, new Date(user.budgetPeriodStart), endDate).min,
    end: getPeriodDateRange(user.budgetPeriod, new Date(user.budgetPeriodStart), endDate).max,
    budget: user.budgetAmount,
    periodType: user.budgetPeriod,
  });
  setEditBudgetValue(user.budgetAmount?.toString() ?? '');
  setEditBudgetPeriod(user.budgetPeriod);

  // 🚩 THIS IS THE CRITICAL PART!
  setShowPeriodRolloverPrompt(true);

  setLastRolloverDateShown(new Date(user.budgetPeriodStart));
};

const formatShortDate = (date) => {
  if (!date) return '';
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short', // 👉 Jan, Feb, Mar...
    day: 'numeric',
    year: 'numeric',
  });
};

// --- Overspend Details (computed from transactions) ---
const [showOverspendDetails, setShowOverspendDetails] = useState(false);
const [overspentCategories, setOverspentCategories] = useState<{ name: string; amount: number }[]>([]);
const [largestCategory, setLargestCategory] = useState<{ name: string; amount: number } | null>(null);

useEffect(() => {
  if (!Array.isArray(transactions) || transactions.length === 0) return;

  const overspents = transactions.filter((t) => t.overspent);
  const grouped = overspents.reduce((acc: Record<string, number>, t) => {
    acc[t.category] = (acc[t.category] || 0) + t.amount;
    return acc;
  }, {});

  const overspentList = Object.entries(grouped).map(([name, amount]) => ({
    name,
    amount,
  }));

  setOverspentCategories(overspentList);

  if (overspentList.length) {
    setLargestCategory(
      overspentList.reduce((a, b) => (a.amount > b.amount ? a : b))
    );
  }
}, [transactions]);


    return (


      <ScrollView style={styles.container}>
{/* 🌟 First-Time Budget Notice Modal */}
<Modal visible={showFirstTimeNotice} transparent animationType="fade">
  <View
    style={{
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.4)",
      justifyContent: "center",
      alignItems: "center",
    }}
  >
    <View
      style={{
        backgroundColor: "#FFFFFF",
        borderRadius: 14,
        padding: 24,
        width: 300,
        alignItems: "center",
        borderWidth: 2,
        borderColor: "#2563EB", // deep blue border
        shadowColor: "#000",
        shadowOpacity: 0.2,
        shadowRadius: 10,
        elevation: 5,
      }}
    >
      <Ionicons name="information-circle-outline" size={42} color="#2563EB" />
      <Text
        style={{
          fontSize: 18,
          fontWeight: "700",
          color: "#1E3A8A",
          marginTop: 10,
          textAlign: "center",
        }}
      >
        Default Budget Period
      </Text>

      <Text
        style={{
          fontSize: 14,
          color: "#334155",
          marginTop: 10,
          textAlign: "center",
          lineHeight: 20,
        }}
      >
        💡 Welcome! Your default budget period is set to{" "}
        <Text style={{ fontWeight: "700", color: "#2563EB" }}>Weekly</Text>.
        {"\n"}
        You can change this anytime by tapping the{" "}
        <Text style={{ fontWeight: "600" }}>Duration</Text> 
      </Text>

      <TouchableOpacity
        style={{
          backgroundColor: "#2563EB",
          paddingVertical: 10,
          paddingHorizontal: 20,
          borderRadius: 10,
          marginTop: 18,
          width: "70%",
          alignItems: "center",
        }}
        onPress={() => setShowFirstTimeNotice(false)}
      >
        <Text style={{ color: "white", fontWeight: "700", fontSize: 15 }}>
          Got it!
        </Text>
      </TouchableOpacity>
    </View>
  </View>
</Modal>


     <Modal visible={showPeriodRolloverPrompt} transparent animationType="fade">
  <Pressable style={styles.modalOverlay} onPress={() => setShowPeriodRolloverPrompt(false)}>
    <View style={styles.rolloverModalContainer}>
      <Text style={styles.rolloverTitle}>New Period Started!</Text>
      <Text style={styles.rolloverSubtitle}>
  Budget set to:{" "}
  <Text style={styles.budgetValue}>
    ₱{pendingRolloverPeriod?.budget?.toLocaleString()}
  </Text>
</Text>
      <Text style={styles.rolloverPrompt}>
        Would you like to edit this period’s settings?
      </Text>
     <View style={styles.rolloverButtonRow}>
  <TouchableOpacity
    style={styles.editButton}
    onPress={() => {
      setShowRolloverEditModal(true);
      setShowPeriodRolloverPrompt(false);
    }}
  >
    <Text style={styles.editButtonText}>Yes, Edit</Text>
  </TouchableOpacity>

  <TouchableOpacity
    style={styles.cancelButton}
    onPress={async () => {
      const token = await getToken();
      if (!token?.id) return;

      try {
        await api.put(`/auth/${token.id}/update-budget-amount`, {
          budgetAmount: budgetAmount,
          budgetPeriod: budgetPeriod,
          type: "Rollover (Keep As Is)"
        });
        await fetchBudgetLogs();
        await fetchBudgetHistory();
        await fetchRemainingBudget();
        setShowPeriodRolloverPrompt(false);
      } catch (err) {
        console.error("❌ Failed to log rollover Keep As Is:", err);
      }
    }}
  >
    <Text style={styles.cancelButtonText}>No, Keep As Is</Text>
  </TouchableOpacity>
</View>

    </View>
  </Pressable>
</Modal>


<Modal visible={showRolloverEditModal} transparent animationType="fade">
  <Pressable style={styles.modalOverlay} onPress={() => setShowRolloverEditModal(false)}>
    <Pressable style={[styles.modalContainer, { maxWidth: 400, minWidth: 320, alignSelf: 'center', padding: 26 }]}>
      <Text style={styles.modalTitle}>✏️ Edit Period Settings</Text>

      <Text style={styles.label}>Budget Amount (₱):</Text>
      <TextInput
        value={editBudgetValue}
        keyboardType="numeric"
        placeholder="Enter budget"
        onChangeText={handleEditBudgetChange}
        onFocus={() => {
          if (editBudgetValue === '0') setEditBudgetValue('');
        }}
        style={styles.budgetInput}
      />

      <Text style={styles.label}>Period Type:</Text>
      <View style={styles.periodRow}>
        {['Daily', 'Weekly', 'Monthly', 'Custom'].map((type) => {
          const disabled = rolloverContext === 'manual' && editBudgetPeriod !== type;
          return (
            <View key={type} style={{ flex: 1, marginHorizontal: 2 }}>
              <TouchableOpacity
                disabled={disabled}
                style={[
                  styles.periodBtn,
                  editBudgetPeriod === type && styles.periodBtnActive,
                  { opacity: disabled ? 0.35 : 1 }
                ]}
                onPress={() => {
                  if (!disabled) setEditBudgetPeriod(type);
                }}
              >
                <Text style={[
                  styles.periodBtnText,
                  editBudgetPeriod === type && styles.periodBtnTextActive,
                ]}>
                  {type}
                </Text>
              </TouchableOpacity>
            </View>
          );
        })}
      </View>

      {/* ✅ Show Date Pickers if Custom */}
      {editBudgetPeriod === "Custom" && (
        <View style={{ marginTop: 12, width: '100%' }}>
          <Text style={styles.label}>Start Date:</Text>
          <input
            type="date"
            
            value={customStartDate ? new Date(customStartDate).toISOString().slice(0, 10) : ''}
             // @ts-ignore
            onChange={(e) => setCustomStartDate(e.target.value ? new Date(e.target.value) : null)}
            style={styles.input}
          />

          <Text style={styles.label}>End Date:</Text>
          <input
            type="date"
            
            value={customEndDate ? new Date(customEndDate).toISOString().slice(0, 10) : ''}
             // @ts-ignore
            onChange={(e) => setCustomEndDate(e.target.value ? new Date(e.target.value) : null)}
            style={styles.input}
          />
        </View>
      )}

      {rolloverContext === 'manual' && (
        <View style={styles.infoBox}>
          <MaterialIcons name="info" size={16} color="#2563EB" style={{ marginRight: 6, marginTop: 2 }} />
          <View style={{ flex: 1 }}>
            <Text style={styles.infoText}>
              Period type is locked after a <Text style={{ fontWeight: 'bold' }}>manual change</Text>.
            </Text>
            <Text style={{ fontSize: 13, color: '#64748B', marginTop: 2 }}>
              You can only update it again at the start of a new cycle.
            </Text>
          </View>
        </View>
      )}

      <TouchableOpacity style={styles.saveBtn} onPress={async () => {
        await handleSetBudgetEditRollover();
        setShowRolloverEditModal(false);
      }}>
        <Text style={styles.saveBtnText}>Save Changes</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowRolloverEditModal(false)}>
        <Text style={styles.cancelBtnText}>Cancel</Text>
      </TouchableOpacity>
    </Pressable>
  </Pressable>
</Modal>




        {/* Budget Options Modal */}
        <Modal
          visible={showBudgetAction}
          transparent
          animationType="fade"
          onRequestClose={() => setShowBudgetAction(false)}
        >
          <Pressable style={styles.modalOverlay} onPress={() => setShowBudgetAction(false)}>
            <View style={[styles.dropdownModal, { gap: 10, minWidth: 220 }]}>
              <Text style={{ fontWeight: 'bold', fontSize: 16 }}>Budget Options</Text>
              <TouchableOpacity
                style={{
                  backgroundColor: '#1f4b81ff',
                  padding: 10,
                  borderRadius: 8,
                  alignItems: 'center',
                }}
                onPress={() => {
                  setShowBudgetAction(false);
                  setShowSetBudgetModal(true);
                }}
              >
                <Text style={{ color: 'white', fontWeight: 'bold' }}>Set Budget</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{
                  backgroundColor: '#1f4b81ff',
                  padding: 10,
                  borderRadius: 8,
                  alignItems: 'center',
                }}
                onPress={() => {
                  setShowBudgetAction(false);
                  setShowAddBudgetModal(true);
                }}
              >
                <Text style={{ color: 'white', fontWeight: 'bold' }}>Add Budget</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{
                  backgroundColor: '#F1F5F9',
                  padding: 10,
                  borderRadius: 8,
                  alignItems: 'center',
                }}
                onPress={() => setShowBudgetAction(false)}
              >
                <Text style={{ color: '#545353ff', fontWeight: 'bold' }}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Modal>

        {/* Set Budget Modal */}
        <Modal visible={showSetBudgetModal} transparent animationType="fade">
          <Pressable style={styles.modalOverlay} onPress={() => setShowSetBudgetModal(false)}>
            <Pressable style={[styles.dropdownModal, { gap: 10 }]} onPress={() => {}}>
              <Text style={{ fontWeight: 'bold', fontSize: 16 }}>Set Budget</Text>
              <TextInput
                placeholder="Enter total budget (e.g. 5000)"
                keyboardType="numeric"
                value={setBudgetValue}
                onChangeText={setSetBudgetValue}
                style={{
                  backgroundColor: '#fff',
                  padding: 10,
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: '#CBD5E1',
                }}
              />
              <TouchableOpacity
                style={{
                  backgroundColor: '#2563EB',
                  padding: 10,
                  borderRadius: 8,
                  alignItems: 'center',
                }}
                onPress={handleSetBudget}
              >
                <Text style={{ color: 'white', fontWeight: 'bold' }}>
                  {isLoading ? 'Saving...' : 'Save'}
                </Text>
              </TouchableOpacity>
            </Pressable>
          </Pressable>
        </Modal>

        {/* Add to Budget Modal */}
        <Modal visible={showAddBudgetModal} transparent animationType="fade">
          <Pressable style={styles.modalOverlay} onPress={() => setShowAddBudgetModal(false)}>
            <Pressable style={[styles.dropdownModal, { gap: 10 }]} onPress={() => {}}>
              <Text style={{ fontWeight: 'bold', fontSize: 16 }}>Add Budget</Text>
              <TextInput
                placeholder="Enter amount to add (e.g. 1000)"
                keyboardType="numeric"
                value={addBudgetValue}
                onChangeText={setAddBudgetValue}
                style={{
                  backgroundColor: '#fff',
                  padding: 10,
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: '#CBD5E1',
                }}
              />
              <TouchableOpacity
                style={{
                  backgroundColor: '#22c55e',
                  padding: 10,
                  borderRadius: 8,
                  alignItems: 'center',
                }}
                onPress={handleAddBudget}
              >
                <Text style={{ color: 'white', fontWeight: 'bold' }}>
                  {isLoading ? 'Saving...' : 'Add'}
                </Text>
              </TouchableOpacity>
            </Pressable>
          </Pressable>
        </Modal>

       

        {/* Header */}
      <View style={styles.headerContainer}>
<View style={styles.profileRow}>
  <TouchableOpacity onPress={() => setMenuVisible(true)}>
    {user?.avatarUrl ? (
      <Image
          source={{ uri: user.avatarUrl }}
          style={{
          width: 38,
          height: 38,
          borderRadius: 19,
          borderWidth: 1,
          borderColor: "blue" }}
          onError={() => setAvatarUrl(null)} 
        />
      ) : (
        <Image
          source={require("../../assets/images/moneymigo-icon.png")}
          style={{ width: 38,
          height: 38,
          borderRadius: 19,
          borderWidth: 1,
          borderColor: "red" }}
        />
      )}
  </TouchableOpacity>

  <Text style={styles.greeting}>
    {fullName ? `Hi, ${fullName}` : "Loading..."}
  </Text>
</View>



 <TouchableOpacity 
  onPress={() => router.push("/notification")}
  style={{ position: 'relative' }}
>
  <Ionicons name="notifications-outline" size={28} color="#1E293B" />
  
  {/* ✅ Unread badge */}
  {unreadNotifications > 0 && (
    <View style={{
      position: 'absolute',
      top: -4,
      right: -4,
      backgroundColor: '#EF4444',
      borderRadius: 10,
      minWidth: 18,
      height: 18,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 4,
      borderWidth: 2,
      borderColor: '#fff',
      shadowColor: '#EF4444',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 4,
      elevation: 4,
    }}>
      <Text style={{
        color: '#fff',
        fontSize: 10,
        fontWeight: '700',
      }}>
        {unreadNotifications > 9 ? '9+' : unreadNotifications}
      </Text>
    </View>
  )}
</TouchableOpacity>

</View>

          {/* Dropdown Menu */}
        <Modal
  visible={menuVisible}
  transparent
  animationType="fade"
  onRequestClose={() => setMenuVisible(false)}
>
  <Pressable style={styles.modalOverlayProfile} onPress={() => setMenuVisible(false)}>
    <View style={styles.menuDropdownProfile}>
      <TouchableOpacity 
        style={styles.menuItemContainer}
        onPress={() => { router.push('/profile'); setMenuVisible(false); }}
        activeOpacity={0.7}
      >
        <Text style={styles.menuIcon}>👤</Text>
        <Text style={styles.menuItemText}>Manage Profile</Text>
      </TouchableOpacity>

      <TouchableOpacity
  style={styles.menuItemContainer}
  onPress={() => { router.push("/gettingStarted"); setMenuVisible(false); }}
  activeOpacity={0.7}
>
  <Text style={styles.menuIcon}>✨</Text>
  <Text style={styles.menuItemText}>Getting Started</Text>
</TouchableOpacity>
      
      <View style={styles.menuDivider} />
      
      <TouchableOpacity
        style={styles.menuItemContainer}
        onPress={() => { setMenuVisible(false); logout(); }}
        activeOpacity={0.7}
      >
        <Text style={styles.menuIcon}>🚪</Text>
        <Text style={[styles.menuItemText, { color: '#DC2626' }]}>Logout</Text>
      </TouchableOpacity>
    </View>
  </Pressable>
</Modal>

{/* ==================== FULL BUDGET OVERVIEW CONTAINER ==================== */}
<View
  style={{
    backgroundColor: '#7fb1d6ff',
    borderRadius: 14,
    padding: 10,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  }}
>
  {/* ==================== BALANCE SUMMARY ==================== */}
  <View style={styles.cardRow}>
    {/* Budget Left */}
    <View style={[styles.summaryBox, {
       backgroundColor: '#F0F9FF',
        borderRadius: 10,
        padding: 7,
        flex: 1,
        marginRight: 4,
        borderWidth: 1,
        borderColor: '#BAE6FD',
    }]}>
      <View style={styles.cardHeader}>
        <View style={{
          backgroundColor: '#1f4b81ff',
            borderRadius: 8,
            width: 24,
            height: 24,
            top:5,
            alignItems: 'center',
            justifyContent: 'center',
        }}>
          <Ionicons name="wallet" size={14} color="#ffffff" />
        </View>
         <Text style={{ fontSize: 12, color: '#212f45ff', fontWeight: '600', top: 5 }}>Budget Left</Text>
      </View>

      <View style={[styles.valueRow, { 
      alignItems: 'center', 
      gap: 8,
    }]}>
      <Text 
        style={{ 
          fontSize: (() => {
            // ✅ Auto-resize based on amount length
            const amount = remainingBudget || 0;
            const digitCount = Math.floor(Math.log10(Math.abs(amount))) + 1;
            
            if (digitCount >= 7) return isMobile ? 12 : 14; // 1,000,000+
            if (digitCount >= 6) return isMobile ? 14 : 16; // 100,000+
            if (digitCount >= 5) return isMobile ? 16 : 18; // 10,000+
            return isMobile ? 18 : 20; // Default
          })(),
          fontWeight: '800', 
          color: '#1f4b81ff',
          flex: 1, // ✅ Takes available space
          flexShrink: 1, // ✅ Can shrink if needed
        }}
        numberOfLines={1}
        adjustsFontSizeToFit={true} // ✅ Auto-shrinks to fit
        minimumFontScale={0.5} // ✅ Can shrink up to 50%
      >
        ₱{remainingBudget
          ? Number(remainingBudget).toLocaleString('en-PH', {
              minimumFractionDigits: 2,
            })
          : '0.00'}
      </Text>
        {/* ✅ Add Budget Button */}
        <TouchableOpacity
          onPress={() => setShowBudgetAction(true)}
          style={{
             backgroundColor: '#F0F9FF',
            borderRadius: 8,
            padding: 4,
            flexShrink: 0,
          }}
          activeOpacity={0.7}
        >
          <Ionicons name="add-circle" size={24} color="#1f4b81ff" />
        </TouchableOpacity>
      </View>

      <BudgetLockTimer budgetPeriod={budgetPeriod} budgetPeriodStart={startDate} />
    </View>
          

    {/* Expenses */}
    <TouchableOpacity
      style={[styles.summaryBox, {
         backgroundColor: '#F0F9FF',
        borderRadius: 10,
        padding: 6,
        flex: 1,
        marginLeft: 4,
        borderWidth: 1,
        borderColor: '#FECACA',
      }]}
      activeOpacity={0.75}
      onPress={() => router.push("/expenses")}
    >
      <View style={styles.cardHeader}>
        <View style={{
           backgroundColor: '#1f4b81ff',
            borderRadius: 8,
            width: 24,
            height: 24,
            alignItems: 'center',
            justifyContent: 'center',
        }}>
          <Ionicons name="trending-down" size={14} color="#ffffff" />
        </View>
           <Text style={{ fontSize: 12, color: '#212f45ff', fontWeight: '600' }}>Expenses</Text>
      </View>

      <Text style={{
        fontSize: 20,
          fontWeight: '800',
          color: '#1f4b81ff',
          marginTop: 4,
      }}>
        ₱{Number(totalExpense).toLocaleString('en-PH', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}
      </Text>
    </TouchableOpacity>
  </View>

    {/* ==================== COMBINED DURATION & BUDGET PROGRESS CARD ==================== */}
<View
  style={{
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginTop: 15,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  }}
>
  {/* ==================== DURATION HEADER ==================== */}
  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <Ionicons name="calendar" size={16} color="#1f4b81ff" style={{ marginRight: 8 }} />
      <Text style={{ fontSize: 13, fontWeight: '700', color: '#212f45ff' }}>Budget Period</Text>
    </View>
    <TouchableOpacity
      onPress={() => setDropdownOpen(true)}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#EEF2FF',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#6366F1',
      }}
    >
      <Text style={{ fontSize: 12, fontWeight: '700', color: '#212f45ff', marginRight: 4 }}>
        {budgetPeriod}
      </Text>
      <Ionicons name="chevron-down" size={12} color="#1f4b81ff" />
    </TouchableOpacity>
  </View>

  {/* ==================== DATE RANGE ==================== */}
  {startDate && endDate && (
    <View
      style={{
        backgroundColor: '#F8FAFC',
        padding: 10,
        borderRadius: 8,
        borderLeftWidth: 3,
        borderLeftColor: '#1f4b81ff',
        marginBottom: 16,
      }}
    >
      <Text
        style={{
          fontSize: 12,
          color: '#1f4b81ff',
          fontWeight: '600',
        }}
      >
        {budgetPeriod === 'Custom'
          ? `${formatShortDate(startDate)} — ${formatShortDate(endDate)}`
          : `${formatShortDate(
              getPeriodDateRange(budgetPeriod, startDate, endDate).min
            )} — ${formatShortDate(
              getPeriodDateRange(budgetPeriod, startDate, endDate).max
            )}`}
      </Text>
    </View>
  )}


  {/* ==================== BUDGET PROGRESS HEADER ==================== */}
  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
    <View
      style={{
        backgroundColor: '#1f4b81ff',
        borderRadius: 8,
        width: 32,
        height: 32,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 10,
      }}
    >
      <Ionicons name="stats-chart" size={16} color="#FFFFFF" />
    </View>
    <Text style={{ fontSize: 13, fontWeight: '700', color: '#212f45ff' }}>
      Budget Progress
    </Text>
    <Text
      style={{
        marginLeft: 'auto',
        fontSize: 16,
        fontWeight: '700',
        color: totalExpense > budgetAmount ? '#DC2626' : '#1f4b81ff',
      }}
    >
      {budgetAmount > 0 ? ((totalExpense / budgetAmount) * 100).toFixed(1) : 0}%
    </Text>
  </View>

  {/* ==================== PROGRESS BAR ==================== */}
  <View
    style={{
      height: 12,
      width: '100%',
      backgroundColor: '#F1F5F9',
      borderRadius: 10,
      overflow: 'hidden',
      marginBottom: 12,
      borderWidth: 1,
      borderColor: '#E2E8F0',
    }}
  >
    <LinearGradient
      colors={
        totalExpense > budgetAmount
          ? ['#FCA5A5', '#EF4444', '#B91C1C']
          : ['#818CF8', '#6366F1', '#1f4b81ff']
      }
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={{
        height: '100%',
        width: `${Math.min(
          (budgetAmount > 0 ? (totalExpense / budgetAmount) * 100 : 0),
          100
        )}%`,
        borderRadius: 10,
      }}
    />
  </View>

  {/* ==================== SPENT VS BUDGET ==================== */}
  <View
    style={{
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: '#F1F5F9',
    }}
  >
    <View>
      <Text
        style={{
          color: '#64748B',
          fontSize: 11,
          fontWeight: '600',
          marginBottom: 4,
          letterSpacing: 0.5,
        }}
      >
        SPENT
      </Text>
      <Text
        style={{
          color: totalExpense > budgetAmount ? '#1f4b81ff' : '#1f4b81ff',
          fontWeight: '700',
          fontSize: 15,
        }}
      >
        ₱{Number(totalExpense).toLocaleString('en-PH', {
          minimumFractionDigits: 2,
        })}
      </Text>
    </View>
    <View style={{ alignItems: 'flex-end' }}>
      <Text
        style={{
          color: '#1f4b81ff',
          fontSize: 11,
          fontWeight: '600',
          marginBottom: 4,
          letterSpacing: 0.5,
        }}
      >
        BUDGET
      </Text>
      <Text
        style={{
          color: '#1f4b81ff',
          fontWeight: '700',
          fontSize: 15,
        }}
      >
        ₱{Number(budgetAmount).toLocaleString('en-PH', {
          minimumFractionDigits: 2,
        })}
      </Text>
    </View>
  </View>

  {/* ==================== OVERSPENT SECTION ==================== */}
  {totalExpense > budgetAmount && (
    <View
      style={{
        backgroundColor: '#FEF2F2',
        borderColor: '#FCA5A5',
        borderWidth: 1.5,
        borderRadius: 10,
        padding: 12,
        marginTop: 16,
      }}
    >
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => setShowOverspendDetails(!showOverspendDetails)}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
          <Ionicons
            name="warning-outline"
            size={20}
            color="#DC2626"
            style={{ marginRight: 8 }}
          />
          <Text
            style={{
              color: '#B91C1C',
              fontWeight: '700',
              fontSize: 13,
              flex: 1,
            }}
          >
            Overspent by ₱
            {(totalExpense - budgetAmount).toLocaleString('en-PH', {
              minimumFractionDigits: 2,
            })}
          </Text>
        </View>
        <Ionicons
          name={showOverspendDetails ? 'chevron-up' : 'chevron-down'}
          size={18}
          color="#B91C1C"
        />
      </TouchableOpacity>

      {showOverspendDetails && (
        <View style={{ marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#FCA5A5' }}>
          {overspentCategories.map((cat, idx) => (
            <View
              key={idx}
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                marginBottom: 6,
              }}
            >
              <Text style={{ color: '#7F1D1D', fontSize: 13 }}>{cat.name}</Text>
              <Text
                style={{ color: '#B91C1C', fontWeight: '600', fontSize: 13 }}
              >
                ₱{cat.amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
              </Text>
            </View>
          ))}

          {largestCategory && (
            <View style={{ marginTop: 8 }}>
              <Text
                style={{
                  color: '#7F1D1D',
                  fontSize: 12,
                  fontStyle: 'italic',
                  marginBottom: 10,
                }}
              >
                Largest category overspend: {largestCategory.name} (₱
                {largestCategory.amount.toLocaleString('en-PH', {
                  minimumFractionDigits: 2,
                })}
                )
              </Text>

              <View
                style={{
                  backgroundColor: '#FEF9C3',
                  borderColor: '#FDE68A',
                  borderWidth: 1,
                  borderRadius: 8,
                  padding: 10,
                }}
              >
                <Text
                  style={{
                    fontSize: 11,
                    color: '#854D0E',
                    lineHeight: 16,
                  }}
                >
                  💡 You exceeded your total budget by ₱
                  {(totalExpense - budgetAmount).toLocaleString('en-PH', {
                    minimumFractionDigits: 2,
                  })}
                  , but multiple categories went over their limits (shown above).
                </Text>
              </View>
            </View>
          )}

          <TouchableOpacity onPress={() => router.push('/expenses')} activeOpacity={0.7}>
            <Text
              style={{
                marginTop: 10,
                color: '#7F1D1D',
                fontSize: 12,
                textDecorationLine: 'underline',
                fontWeight: '600',
              }}
            >
              Review detailed expenses →
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  )}
</View>
</View>

{/* ==================== GETTING STARTED CARD (only first time) ==================== */}
{showGettingStarted && (
  <Modal
    visible={showGettingStarted}
    transparent
    animationType="fade"
    onRequestClose={() => setShowGettingStarted(false)}
  >
    <View style={styles.overlay}>
      <View style={styles.tutorialBox}>
        <Text style={styles.tutorialTitle}>Getting Started 🎯</Text>
        <Text style={styles.tutorialText}>
          Welcome to MoneyMigo!{"\n"}{"\n"}
          💰 Set your first budget{"\n"}
          🛍️ Track your expenses{"\n"}
          🎯 Start saving smarter
        </Text>
        <TouchableOpacity
          style={styles.tutorialButton}
          onPress={async () => {
            const token = await getToken();
            const key = `hasSeenGettingStarted_${token.id}`;
            await AsyncStorage.setItem(key, "true");
            setShowGettingStarted(false);
            router.push("/gettingStarted");
          }}
        >
          <Text style={styles.tutorialButtonText}>Start Tutorial</Text>
        </TouchableOpacity>
      </View>
    </View>
  </Modal>
)}


{/* ==================== PERIOD MODAL ==================== */}
<Modal
  visible={dropdownOpen}
  transparent
  animationType="fade"
  onRequestClose={() => setDropdownOpen(false)}
>
  <Pressable style={styles.modalOverlay} onPress={() => setDropdownOpen(false)}>
    <View style={styles.dropdownModal}>
      {periods.map((period) => (
        <TouchableOpacity
          key={period}
          onPress={() => {
            setDropdownOpen(false);

            // ✅ Custom period (open date picker)
            if (period === 'Custom') {
              setShowCustomPicker(true);
              return;
            }

            // ✅ Web confirmation logic
            if (Platform.OS === 'web') {
              const confirmed = window.confirm(
                `Changing your budget period to "${period}" will reset your current budget and expenses. Continue?`
              );

              // Proceed only if confirmed
              if (confirmed) handleChangePeriod(period);
              return;
            }

            // ✅ Mobile confirmation logic
            Alert.alert(
              'Change Budget Period',
              `Changing your budget period to "${period}" will reset your current budget and expenses. Continue?`,
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Yes, Change Period',
                  style: 'destructive',
                  onPress: () => handleChangePeriod(period),
                },
              ]
            );
          }}
          style={styles.dropdownItem}
        >
          <Text
            style={[
              styles.dropdownText,
              budgetPeriod === period && styles.dropdownItemSelectedText,
            ]}
          >
            {period}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  </Pressable>
</Modal>




  {/* Shortcuts */}
<View style={styles.featuresGrid}>
 {shortcuts.map((shortcut, index) => (
  <TouchableOpacity
   key={index} 
   style={styles.featureCard}
   onPress={() => router.push(shortcut.path)}
   activeOpacity={0.7}
  >
    <View style={styles.featureIconCircle}>
      <Text style={styles.featureIcon}>{shortcut.icon}</Text>
    </View>
    <Text style={styles.featureLabel}>{shortcut.label}</Text>
  </TouchableOpacity>
))}
</View>


<View style={{ flex: 1, paddingHorizontal: 16, paddingTop: 12 }}>

  {/* ==================== EXPENSE LOGS ==================== */}
  <View style={[styles.logsSection, { marginBottom: 30 }]}>
    <Text style={styles.sectionTitle}>Expense Logs</Text>
    <ScrollView
      style={{ maxHeight: 280, marginTop: 10 }}
      nestedScrollEnabled
      showsVerticalScrollIndicator={true}
    >
      {Object.entries(groupTransactionsByDate(transactions))
        .sort((a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime())
        .map(([date, items]) => (
          <View key={date} style={{ marginBottom: 10 }}>
            <Text style={{ fontWeight: 'bold', marginBottom: 6, color: '#1E293B' }}>
              {new Date(date).toLocaleDateString('en-PH', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </Text>

            {items
              .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
              .slice(0, 7)
              .map((item) => (
                <TouchableOpacity
                  key={item._id}
                  style={styles.transactionItem}
                  onPress={() => {
                    setSelectedTransaction(item);
                    setShowDetailModal(true);
                  }}
                >
                  <View>
                    {item.notes && (
                      <Text style={{ fontSize: 12, color: '#999' }}>{item.notes}</Text>
                    )}
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      {categoryIcons[capitalize(item.category?.trim())] ??
                        categoryIcons['Others']}
                      <Text style={{ fontSize: 13, color: '#475569', fontWeight: '500' }}>
                        {item.category ?? 'Others'}
                      </Text>
                      <Text style={{ fontSize: 12, color: '#64748B' }}>
                        •{' '}
                        {new Date(item.date).toLocaleTimeString('en-PH', {
                          hour: 'numeric',
                          minute: '2-digit',
                        })}
                      </Text>
                    </View>
                  </View>
                  <Text style={[styles.transactionAmount, { color: '#DC2626' }]}>
                    -₱{Math.abs(item.amount).toLocaleString()}
                  </Text>
                </TouchableOpacity>
              ))}
          </View>
        ))}
    </ScrollView>
  </View>

  {/* ==================== BUDGET LOGS ==================== */}
  <View style={[styles.budgetLogsSection, { marginBottom: 30 }]}>
  <View style={styles.budgetLogsSectionHeader}>
    <View style={styles.budgetLogsHeaderLeft}>
      <View style={styles.budgetLogsHeaderIconContainer}>
        <Ionicons name="receipt-outline" size={22} color="#1f4b81ff" />
      </View>
      <View>
        <Text style={styles.budgetLogsSectionTitle}>Budget Logs</Text>
        <Text style={styles.budgetLogsSectionSubtitle}>Recent activity</Text>
      </View>
    </View>
    {budgetLogs.length > 0 && (
      <View style={styles.budgetLogsCountBadge}>
        <Text style={styles.budgetLogsCountText}>{budgetLogs.length}</Text>
      </View>
    )}
  </View>

  <ScrollView
    style={styles.budgetLogsScrollContainer}
    nestedScrollEnabled
    showsVerticalScrollIndicator={true}
  >
    {budgetLogs.length === 0 ? (
      <View style={styles.budgetLogsEmptyState}>
        <View style={styles.budgetLogsEmptyIconContainer}>
          <Ionicons name="document-text-outline" size={56} color="#1f4b81ff" />
        </View>
        <Text style={styles.budgetLogsEmptyTitle}>No logs yet</Text>
        <Text style={styles.budgetLogsEmptyText}>
          Your budget activity will appear here
        </Text>
      </View>
    ) : (
      (() => {
        // Group logs by date
        const sortedLogs = budgetLogs.sort((a, b) => 
          new Date(b.date).getTime() - new Date(a.date).getTime()
        );
        
        const groupedByDate = {};
        sortedLogs.forEach(log => {
          const dateKey = new Date(log.date).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          });
          if (!groupedByDate[dateKey]) {
            groupedByDate[dateKey] = [];
          }
          groupedByDate[dateKey].push(log);
        });

        return Object.entries(groupedByDate)
          .slice(0, 5) // Show only 5 most recent dates
          .map(([dateKey, logsForDate]) => (
            <View key={dateKey} style={styles.budgetLogDateGroup}>
              {/* Date Header */}
              <View style={styles.budgetLogDateHeader}>
                <Ionicons name="calendar" size={14} color="#1f4b81ff" />
                <Text style={styles.budgetLogDateHeaderText}>{dateKey}</Text>
                <View style={styles.budgetLogDateLine} />
              </View>

              {/* Logs for this date */}
              {logsForDate.map((log, index) => {
                const prev = Number(log.previousAmount || 0);
                const curr = Number(log.amount);
                let color = '#1f4b81ff',
                  icon = 'cash-outline',
                  bgColor = '#EFF6FF';

                if (log.type === 'Add Budget') {
                  color = '#16A34A';
                  icon = 'add-circle';
                  bgColor = '#F0FDF4';
                } else if (log.type === 'Set Budget') {
                  if (prev === 0) {
                    color = '#1f4b81ff';
                    icon = 'create-outline';
                    bgColor = '#EFF6FF';
                  } else if (curr > prev) {
                    color = '#16A34A';
                    icon = 'trending-up';
                    bgColor = '#F0FDF4';
                  } else if (curr < prev) {
                    color = '#DC2626';
                    icon = 'trending-down';
                    bgColor = '#FEF2F2';
                  }
                }

                return (
                  <View 
                    key={log._id || index} 
                    style={[
                      styles.budgetLogCard,
                      { borderLeftColor: color, borderLeftWidth: 4 }
                    ]}
                  >
                    <View style={styles.budgetLogCardMain}>
                      <View style={styles.budgetLogCardHeader}>
                        <View style={[styles.budgetLogIconCircle, { backgroundColor: bgColor }]}>
                          <Ionicons name={icon} size={24} color={color} />
                        </View>
                        <View style={styles.budgetLogCardContent}>
                          <Text style={styles.budgetLogType}>{log.type}</Text>
                          <View style={styles.budgetLogTimeContainer}>
                            <Ionicons name="time-outline" size={12} color="#1f4b81ff" />
                            <Text style={styles.budgetLogTime}>
                              {new Date(log.date).toLocaleTimeString('en-US', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </Text>
                          </View>
                        </View>
                      </View>

                      <View style={styles.budgetLogAmountContainer}>
                        {log.type === 'Set Budget' ? (
                          prev === 0 ? (
                            <View style={styles.budgetLogAmountBadge}>
                              <Text style={[styles.budgetLogAmount, { color }]}>
                                ₱{curr.toLocaleString()}
                              </Text>
                            </View>
                          ) : (
                            <View style={styles.budgetLogTransition}>
                              <Text style={styles.budgetLogPrevAmount}>
                                ₱{prev.toLocaleString()}
                              </Text>
                              <View style={styles.budgetLogArrowContainer}>
                                <Ionicons name="arrow-forward" size={14} color="#1f4b81ff" />
                              </View>
                              <Text style={[styles.budgetLogCurrAmount, { color }]}>
                                ₱{curr.toLocaleString()}
                              </Text>
                            </View>
                          )
                        ) : (
                          <View style={styles.budgetLogAddition}>
                            <Text style={[styles.budgetLogAddAmount, { color }]}>
                              +₱{curr.toLocaleString()}
                            </Text>
                            <Text style={styles.budgetLogPrevLabel}>
                              Previous: ₱{prev.toLocaleString()}
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>

                    {log.budgetPeriod && (
                      <View style={styles.budgetLogFooter}>
                        <View style={styles.budgetLogPeriodBadge}>
                          <Ionicons name="calendar-outline" size={12} color="#1f4b81ff" />
                          <Text style={styles.budgetLogPeriodText}>{log.budgetPeriod}</Text>
                        </View>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          ));
      })()
    )}
  </ScrollView>
</View>

 {/* ==================== BUDGET HISTORY ==================== */}
<View style={[styles.logsSection, { marginBottom: 50 }]}>
  <View style={styles.logsSectionHeader}>
    <Ionicons name="bar-chart-outline" size={24} color="#1f4b81ff" />
    <Text style={styles.logsSectionTitle}>Budget History</Text>
  </View>

  <ScrollView
    style={{ maxHeight: 280, marginTop: 10 }}
    nestedScrollEnabled={true}
    keyboardShouldPersistTaps="always"
    contentContainerStyle={{ paddingBottom: 30 }}
  >
    {budgetHistory.length === 0 ? (
      <View style={styles.emptyLogsState}>
        <Ionicons name="time-outline" size={48} color="#1f4b81ff" />
        <Text style={styles.emptyLogsText}>No history available</Text>
      </View>
    ) : (
      budgetHistory
        .sort((a, b) => new Date(b.endDate).getTime() - new Date(a.endDate).getTime())
        .slice(0, 5)
        .map((log, index) => {
          const now = new Date();
          const periodEnded = new Date(log.endDate) <= now;
          const spent = Number(log.totalExpenses);
          const budget = Number(log.budgetAmount);
          const remaining = budget - spent;
          const withinBudget = spent <= budget;
          const spentPercentage = budget > 0 ? (spent / budget) * 100 : 0;

          let statusColor = "#1f4b81ff";
          let statusText = "Ongoing";
          let statusIcon = "time";
          let statusBg = "#FEF3C7";

          if (periodEnded && withinBudget) {
            statusColor = "#1f4b81ff";
            statusText = "Completed";
            statusIcon = "checkmark-circle";
            statusBg = "#F0FDF4";
          } else if (periodEnded && !withinBudget) {
            statusColor = "#DC2626";
            statusText = "Overspent";
            statusIcon = "alert-circle";
            statusBg = "#FEF2F2";
          }

          return (
            <TouchableOpacity
              key={log._id || index}
              style={styles.historyCard}
              onPress={() => {
                console.log("🟢 Pressed history:", log.period);
                openHistoryExpenses(log);
              }}
              activeOpacity={0.8}
            >
              {/* Header */}
              <View style={styles.historyCardHeader}>
                <View style={styles.historyTitleRow}>
                  <Ionicons name="calendar-outline" size={18} color="#1f4b81ff" />
                  <Text style={styles.historyPeriod}>{log.period}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: statusBg }]}>
                  <Ionicons name={statusIcon} size={14} color={statusColor} />
                  <Text style={[styles.statusText, { color: statusColor }]}>
                    {statusText}
                  </Text>
                </View>
              </View>

              {/* Date Range */}
              <Text style={styles.historyDateRange}>
                {new Date(log.startDate).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })}
                {" — "}
                {new Date(log.endDate).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </Text>

              {/* Budget Info */}
              <View style={styles.historyBudgetRow}>
                <View style={styles.historyBudgetItem}>
                  <Text style={styles.historyBudgetLabel}>Budget</Text>
                  <Text style={styles.historyBudgetAmount}>
                    ₱{budget.toLocaleString()}
                  </Text>
                </View>
                <View style={styles.historyBudgetDivider} />
                <View style={styles.historyBudgetItem}>
                  <Text style={styles.historyBudgetLabel}>Spent</Text>
                  <Text
                    style={[styles.historySpentAmount, { color: statusColor }]}
                  >
                    ₱{spent.toLocaleString()}
                  </Text>
                </View>
              </View>

              {/* Progress Bar */}
              <View style={styles.progressBarContainer}>
                <View style={styles.progressBarBg}>
                  <View
                    style={[
                      styles.progressBarFill,
                      {
                        width: `${Math.min(spentPercentage, 100)}%`,
                        backgroundColor: statusColor,
                      },
                    ]}
                  />
                </View>
                <Text style={styles.progressPercentage}>
                  {spentPercentage.toFixed(0)}%
                </Text>
              </View>

              {/* Remaining */}
              <View style={styles.historyFooter}>
                <Text style={styles.historyRemainingLabel}>Remaining:</Text>
                <Text
                  style={[
                    styles.historyRemainingAmount,
                    { color: remaining >= 0 ? "#1f4b81ff" : "#DC2626" },
                  ]}
                >
                  ₱{Math.abs(remaining).toLocaleString()}
                </Text>
                <Ionicons name="chevron-forward" size={16} color="#1f4b81ff" />
              </View>
            </TouchableOpacity>
          );
        })
    )}
  </ScrollView>

{/* 🧾 Expense History Modal (Updated Design) */}
<Modal
  visible={historyModalVisible}
  transparent
  animationType="fade"
  onRequestClose={() => setHistoryModalVisible(false)}
>
  <View style={[styles.modalOverlay, { justifyContent: "center", alignItems: "center" }]}>
    <View
      style={{
        backgroundColor: "#FFFFFF",
        borderRadius: 20,
        paddingVertical: 24,
        paddingHorizontal: 20,
        width: 300,
        maxHeight: "80%",
        shadowColor: "#000",
        shadowOpacity: 0.15,
        shadowRadius: 10,
        elevation: 6,
      }}
    >
      {/* Header */}
      <Text
        style={{
          fontSize: 18,
          fontWeight: "800",
          color: "#1f4b81ff",
          textAlign: "center",
          marginBottom: 16,
        }}
      >
        {historyModalTitle}
      </Text>

      {/* Expenses list */}
      {historyExpenses.length === 0 ? (
        <Text
          style={{
            color: "#64748B",
            fontSize: 14,
            textAlign: "center",
            marginTop: 10,
          }}
        >
          No recorded expenses for this period.
        </Text>
      ) : (
        <ScrollView
          style={{ marginTop: 4 }}
          contentContainerStyle={{
            gap: 10,
            paddingBottom: 20,
          }}
          showsVerticalScrollIndicator={true}
        >
          {historyExpenses.map((exp, idx) => (
            <View
              key={idx}
              style={{
                backgroundColor: "#F9FAFB",
                borderRadius: 12,
                paddingVertical: 10,
                paddingHorizontal: 14,
                borderWidth: 1,
                borderColor: "#E5E7EB",
              }}
            >
              {/* Category + Amount */}
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <Text
                  style={{
                    fontSize: 15,
                    fontWeight: "700",
                    color: "#1f4b81ff",
                  }}
                >
                  {exp.category || "Uncategorized"}
                </Text>
                <Text
                  style={{
                    fontSize: 15,
                    fontWeight: "800",
                    color: "#1f4b81ff",
                  }}
                >
                  ₱{exp.amount?.toLocaleString("en-PH")}
                </Text>
              </View>

              {/* Date */}
              <Text
                style={{
                  color: "#6B7280",
                  fontSize: 12,
                  marginTop: 3,
                }}
              >
                {new Date(exp.date).toLocaleDateString("en-PH", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </Text>

              {/* Notes */}
              {exp.notes && (
                <View
                  style={{
                    backgroundColor: "#EEF2FF",
                    borderRadius: 8,
                    padding: 6,
                    marginTop: 6,
                  }}
                >
                  <Text
                    style={{
                      color: "#4338CA",
                      fontSize: 12,
                      fontStyle: "italic",
                    }}
                  >
                    📝 {exp.notes}
                  </Text>
                </View>
              )}
            </View>
          ))}
        </ScrollView>
      )}

      {/* Footer */}
      <TouchableOpacity
        style={{
          backgroundColor: "#2563EB",
          borderRadius: 10,
          paddingVertical: 10,
          marginTop: 16,
          alignItems: "center",
        }}
        onPress={() => setHistoryModalVisible(false)}
      >
        <Text
          style={{
            color: "#FFFFFF",
            fontWeight: "700",
            fontSize: 14,
          }}
        >
          Close
        </Text>
      </TouchableOpacity>
    </View>
  </View>
</Modal>

</View>


</View>

{/* ||| Transaction details */}
<Modal visible={showDetailModal && !!selectedTransaction} transparent animationType="slide">
  <View style={styles.transactionDetailOverlay}>
    <View style={styles.transactionDetailContainer}>
      {/* Header with gradient effect */}
      <View style={styles.transactionDetailHeader}>
        <View>
          <Text style={styles.transactionDetailTitle}>Transaction Details</Text>
          <Text style={styles.transactionDetailSubtitle}>Complete information</Text>
        </View>
      </View>

      {/* Content */}
      <View style={styles.transactionDetailContent}>
        {/* Amount - Featured */}
        <View style={styles.transactionAmountCard}>
          <View style={styles.transactionAmountIcon}>
            <Text style={styles.transactionAmountIconText}>₱</Text>
          </View>
          <View>
            <Text style={styles.transactionAmountLabel}>Amount</Text>
            <Text style={styles.transactionAmountValue}>
              ₱{selectedTransaction?.amount?.toLocaleString()}
            </Text>
          </View>
        </View>

        {/* Type */}
        <View style={styles.transactionInfoCard}>
          <View style={[styles.transactionIconContainer, styles.transactionTypeIcon]}>
            <Text style={styles.transactionIconText}>🏷️</Text>
          </View>
          <View style={styles.transactionInfoContent}>
            <Text style={styles.transactionInfoLabel}>Type</Text>
            <Text style={styles.transactionInfoValue}>
              {capitalize(selectedTransaction?.type)}
            </Text>
          </View>
        </View>

        {/* Category */}
        <View style={styles.transactionInfoCard}>
          <View style={[styles.transactionIconContainer, styles.transactionCategoryIcon]}>
            <Text style={styles.transactionIconText}>📂</Text>
          </View>
          <View style={styles.transactionInfoContent}>
            <Text style={styles.transactionInfoLabel}>Category</Text>
            <Text style={styles.transactionInfoValue}>
              {capitalize(selectedTransaction?.category) || 'N/A'}
            </Text>
          </View>
        </View>

        {/* Date */}
        <View style={styles.transactionInfoCard}>
          <View style={[styles.transactionIconContainer, styles.transactionDateIcon]}>
            <Text style={styles.transactionIconText}>📅</Text>
          </View>
          <View style={styles.transactionInfoContent}>
            <Text style={styles.transactionInfoLabel}>Date & Time</Text>
            <Text style={styles.transactionInfoValue}>
              {selectedTransaction && new Date(selectedTransaction.date).toLocaleString()}
            </Text>
          </View>
        </View>

        {/* Notes */}
        <View style={styles.transactionNotesCard}>
          <View style={styles.transactionNotesIcon}>
            <Text style={styles.transactionIconText}>📝</Text>
          </View>
          <View style={styles.transactionNotesContent}>
            <Text style={styles.transactionNotesLabel}>Notes</Text>
            <Text style={styles.transactionNotesValue}>
              {selectedTransaction?.notes || 'No notes available'}
            </Text>
          </View>
        </View>
      </View>

      {/* Close Button */}
      <TouchableOpacity
        style={styles.transactionDetailCloseButton}
        onPress={() => setShowDetailModal(false)}
      >
        <Text style={styles.transactionDetailCloseButtonText}>Close</Text>
      </TouchableOpacity>
    </View>
  </View>
</Modal>



{/* ||| Custom Picker Modal: */}
<Modal
  visible={showCustomPicker}
  transparent={true}
  animationType="slide"
  onRequestClose={() => setShowCustomPicker(false)}
>
  <View style={styles.modalOverlay}>
    <View style={styles.modalContainer}>
      <Text style={styles.dropdownLabel}>Select Custom Budget Range:</Text>

      {Platform.OS === 'web' ? (
        <>
          <Text style={styles.dateLabel}>Start Date:</Text>
          <View style={styles.input}>
            <input
              type="date"
              value={startDate ? startDate.toISOString().slice(0, 10) : ''}
              onChange={e => setStartDate(e.target.value ? new Date(e.target.value) : null)}
            />
          </View>

          <Text style={styles.dateLabel}>End Date:</Text>
          <View style={styles.input}>
            <input
              type="date"
              value={endDate ? endDate.toISOString().slice(0, 10) : ''}
              onChange={e => setEndDate(e.target.value ? new Date(e.target.value) : null)}
            />
          </View>
        </>
      ) : (
        <>
          <Text style={styles.dateLabel}>Start Date:</Text>
          <TouchableOpacity onPress={() => setShowStartPicker(true)} style={styles.input}>
            <Text>{startDate ? startDate.toLocaleDateString() : 'Select Start Date'}</Text>
          </TouchableOpacity>
         {showStartPicker && (
  <DateTimePicker
    value={startDate || new Date()}
    mode="date"
    display="default"
    onChange={(
      event: DateTimePickerEvent,
      selectedDate?: Date
    ) => {
      setShowStartPicker(false);
      if (event.type === 'set' && selectedDate) {
        // 👇 inject current time when user confirms
        const now = new Date();
        selectedDate.setHours(
          now.getHours(),
          now.getMinutes(),
          now.getSeconds(),
          now.getMilliseconds()
        );

        setStartDate(selectedDate);
      }
    }}
  />
)}

          <Text style={styles.dateLabel}>End Date:</Text>
          <TouchableOpacity onPress={() => setShowEndPicker(true)} style={styles.input}>
            <Text>{endDate ? endDate.toLocaleDateString() : 'Select End Date'}</Text>
          </TouchableOpacity>
         {showEndPicker && (
  <DateTimePicker
    value={endDate || new Date()}
    mode="date"
    display="default"
    onChange={(
      event: DateTimePickerEvent,
      selectedDate?: Date
    ) => {
      setShowEndPicker(false);
      if (event.type === 'set' && selectedDate) {
        const now = new Date();
        selectedDate.setHours(
          now.getHours(),
          now.getMinutes(),
          now.getSeconds(),
          now.getMilliseconds()
        );

        setEndDate(selectedDate);
      }
    }}
  />
)}

        </>
      )}
<Button
  title="Set Custom Budget"
  onPress={async () => {
    if (!startDate || !endDate) {
      alert('Please select both start and end dates.');
      return;
    }
    // Confirmation before change
    const isConfirmed = window.confirm
      ? window.confirm('Changing budget period will reset your budget and expenses to 0 and save the previous record to history. Are you sure you want to proceed?')
      : await new Promise(resolve =>
          Alert.alert(
            'Confirm Change',
            'Changing budget period will reset your budget and expenses to 0 and save the previous record to history. Are you sure you want to proceed?',
            [
              { text: 'Cancel', onPress: () => resolve(false), style: 'cancel' },
              { text: 'Yes', onPress: () => resolve(true) },
            ]
          )
        );

    if (!isConfirmed) {
      setShowCustomPicker(false);
      return;
    }

    try {
      const token = await getToken();
      if (!token || !token.id) {
      alert("User not logged in.");
      return;
}
      await api.post(`/auth/${token.id}/change-budget-period`, {
        newPeriod: 'Custom',
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      });
      setBudgetPeriod('Custom');
      setShowCustomPicker(false);
      // 👇 Immediately open Set Budget modal
setShowSetBudgetModal(true);

      // Optionally save locally
      await saveCustomRange(startDate, endDate);

      fetchRemainingBudget();
      fetchTotalExpense();
      fetchBudgetLogs();
    } catch (err) {
      alert('Failed to set custom budget.');
    }
  }}
/>


      <Button title="Cancel" color="gray" onPress={() => setShowCustomPicker(false)} />
    </View>
  </View>
</Modal>



<View style={styles.footerContainer}>
  <Text style={styles.footerText}>
    © {new Date().getFullYear()} MoneyMigo — Track. Save. Thrive.
  </Text>
</View>


      </ScrollView>

      
    );
    
  }

  

  // --- styles (no change, paste your original styles from above) ---
  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#F8FAFC',
      paddingTop: Platform.OS === 'web' ? 10 : 40,
      paddingHorizontal: 20,
    },
    profileHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 16,
      gap: 10,
    },
    greeting: {
      fontSize: 20,
      fontWeight: '600',
      color: '#1E293B',
    },
    card: {
      backgroundColor: '#2563EB',
      borderRadius: 16,
      padding: 20,
      marginBottom: 20,
    },
    cardSubLabel: {
      fontSize: 14,
      color: '#BFDBFE',
      marginTop: 4,
    },
    features: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 24,
    },
  
    sectionTitle: {
      fontSize: 16,
      fontWeight: '600',
      marginBottom: 6,
      color: '#212f45ff',
    },
    transactionItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      backgroundColor: '#fff',
      padding: 12,
      borderRadius: 8,
      marginBottom: 8,
      shadowColor: '#000',
      shadowOpacity: 0.04,
      shadowRadius: 4,
      elevation: 2,
    },
    transactionTitle: {
      fontSize: 14,
      color: '#1E293B',
    },
    transactionAmount: {
      fontSize: 14,
      fontWeight: 'bold',
      color: '#0F172A',
    },
    menuDropdown: {
      backgroundColor: '#fff',
      borderRadius: 8,
      paddingVertical: 8,
      paddingHorizontal: 12,
      shadowColor: '#000',
      shadowOpacity: 0.2,
      shadowRadius: 5,
      elevation: 5,
      width: 180,
    },
    menuItem: {
      fontSize: 16,
      paddingVertical: 8,
      color: '#1E293B',
    },
    dropdownContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-start',
      marginTop: 12,
      gap: 10,
    },
    dropdownLabel: {
      fontSize: 14,
      color: '#1E293B',
      fontWeight: 'bold',


    },
    dropdownSelected: {
      borderWidth: 1,
      borderColor: '#CBD5E1',
      backgroundColor: '#E0F2FE',
      borderRadius: 8,
      paddingVertical: 8,
      paddingHorizontal: 12,
    },
   
  
 
    balanceSection: {
      marginBottom: 20,
    },
    cardSingle: {
      borderRadius: 16,
      padding: 16,
      marginBottom: 12,
      shadowColor: '#000',
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    cardRowContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 16,
      gap: 12,
    },
    cardHalf: {
      flex: 1,
      backgroundColor: '#A7F3D0',
      borderRadius: 16,
      padding: 14,
      shadowColor: '#000',
      shadowOpacity: 0.08,
      shadowRadius: 4,
      elevation: 2,
    },
balanceCard: {
  backgroundColor: '#1f4b81ff', // deeper blue that matches gradient base
  borderRadius: 16,
  padding: 12,
  marginBottom: 20,
  shadowColor: '#000',
  shadowOpacity: 0.1,
  shadowRadius: 8,
  elevation: 4,
},

cardRow: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  gap: 12, /* Slightly reduced gap */
},
summaryBox: {
  flex: 1,
  backgroundColor: '#FFFFFF',
  borderRadius: 12,
  padding: 8, /* Reduced from 10 */
  shadowColor: '#000',
  shadowOpacity: 0.05,
  shadowRadius: 4,
  elevation: 2,
  justifyContent: 'center',
},
boxLabel: {
  fontSize: 15, /* Reduced from 16 */
  color: '#1E3A8A',
  marginTop: 4, /* Reduced from 6 */
},
boxValue: {
  textAlign: 'center', // Add this line to center the text
  fontSize: 17, /* Reduced from 16 */
  fontWeight: 'bold',
  color: '#1E293B',
  paddingLeft: 5,   // 👈 Add space on the left

},
expenseValue: {
  fontSize: 17, /* Reduced from 16 */
  fontWeight: 'bold',
  color: '#DC2626',
  paddingLeft: 5,   // 👈 Add space on the left

},

    nameNotif: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    headerContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
    },
    profileRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
  
  featuresGrid: {
  flexDirection: 'row',
  flexWrap: 'wrap',
  justifyContent: 'space-around',
  paddingHorizontal: 16,
  paddingVertical: 8,
  marginBottom: 8,
  gap: 12,
},

featureCard: {
  width: '30%',
  alignItems: 'center',
  marginBottom: 12,
  paddingVertical: 8,
},

featureIconCircle: {
  width: 54,
  height: 54,
  borderRadius: 32,
  backgroundColor: '#e8f0f9',
  borderWidth: 1.5,
  borderColor: '#7fb1d6ff',
  justifyContent: 'center',
  alignItems: 'center',
  marginBottom: 8,
  shadowColor: '#1f4b81',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.15,
  shadowRadius: 4,
  elevation: 3,
},

featureIcon: {
  fontSize: 32,
},

featureLabel: {
  fontSize: 12,
  textAlign: 'center',
  fontWeight: '600',
  color: '#1f4b81',
  lineHeight: 16,
  paddingHorizontal: 4,
},

modalContainer: {
  backgroundColor: '#fff',
  borderRadius: 20,
  padding: 26,
  alignItems: 'center',
  alignSelf: 'center',
  width: '90%',
  maxWidth: 400,
  minWidth: 320,
  elevation: 12,
},
modalTitle: {
  fontSize: 22,
  fontWeight: 'bold',
  color: '#2563EB',
  marginBottom: 18,
  letterSpacing: 0.3,
},
label: {
  marginBottom: 8,
  fontWeight: '600',
  color: '#1E293B',
  alignSelf: 'flex-start',
  fontSize: 15,
},
budgetInput: {
  backgroundColor: '#F8FAFC',
  padding: 12,
  borderRadius: 12,
  borderWidth: 1.2,
  borderColor: '#CBD5E1',
  fontSize: 18,
  fontWeight: 'bold',
  textAlign: 'center',
  marginBottom: 16,
  width: '100%',
},
periodRow: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  width: '100%',
  marginBottom: 12,
  marginTop: 4,
},
periodBtn: {
  paddingVertical: 10,
  paddingHorizontal: 0,
  borderRadius: 30,
  backgroundColor: '#E0F2FE',
  alignItems: 'center',
  justifyContent: 'center',
},
periodBtnActive: {
  backgroundColor: '#2563EB',
},
periodBtnText: {
  color: '#2563EB',
  fontWeight: 'bold',
  fontSize: 15,
},
periodBtnTextActive: {
  color: '#fff',
},
infoBox: {
  flexDirection: 'row',
  alignItems: 'flex-start',
  marginBottom: 20,
  marginTop: 4,
  backgroundColor: '#F1F5F9',
  borderRadius: 8,
  padding: 10,
  width: '100%',
},
infoText: {
  color: '#2563EB',
  fontSize: 13,
  lineHeight: 16,
  flex: 1,
},
saveBtn: {
  backgroundColor: '#2563EB',
  borderRadius: 12,
  paddingVertical: 12,
  alignItems: 'center',
  width: '100%',
  marginBottom: 10,
},
saveBtnText: {
  color: '#fff',
  fontWeight: 'bold',
  fontSize: 16,
},
cancelBtn: {
  backgroundColor: '#F1F5F9',
  borderRadius: 12,
  paddingVertical: 12,
  alignItems: 'center',
  width: '100%',
  marginBottom: 6,
},
cancelBtnText: {
  color: '#2563EB',
  fontWeight: 'bold',
  fontSize: 16,
},

  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 6,
  },
  detailLabel: {
    fontWeight: '600',
    color: '#475569',
  },
  detailValue: {
    fontWeight: '500',
    color: '#1E293B',
  },
  notesText: {
    marginTop: 12,
    fontStyle: 'italic',
    color: '#64748B',
    fontSize: 13,
  },
  submitButton: {
    marginTop: 20,
    backgroundColor: '#aaa',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  submitText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },

customDateContainer: {
  padding: 16,
  backgroundColor: '#fff',
  borderRadius: 10,
  marginVertical: 10,
  gap: 10,
},
dateLabel: {
    fontSize: 14,
    marginTop: 15,
    marginBottom: 5,
  },

   input: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  rolloverModalContainer: {
  backgroundColor: '#fff',
  borderRadius: 18,
  padding: 32,
  alignItems: 'center',
  justifyContent: 'center',
  shadowColor: '#2563EB',
  shadowOffset: { width: 0, height: 8 },
  shadowOpacity: 0.10,
  shadowRadius: 18,
  elevation: 15,
  minWidth: 320,
  maxWidth: 420,
},
rolloverTitle: {
  fontWeight: 'bold',
  fontSize: 22,
  color: '#2563EB',
  marginBottom: 8,
  textAlign: 'center',
  letterSpacing: 0.1,
},
rolloverSubtitle: {
  fontSize: 17,
  marginBottom: 16,
  color: '#22223B',
  textAlign: 'center',
},
budgetValue: {
  color: '#059669',
  fontWeight: 'bold',
},
rolloverPrompt: {
  fontSize: 15,
  color: '#444',
  marginBottom: 30,
  textAlign: 'center',
  lineHeight: 20,
},
rolloverButtonRow: {
  flexDirection: 'row',
  gap: 20,
  justifyContent: 'center',
  alignItems: 'center',
  width: '100%',
},
editButton: {
  backgroundColor: '#2563EB',
  paddingVertical: 12,
  paddingHorizontal: 28,
  borderRadius: 10,
  marginHorizontal: 8,
  minWidth: 110,
  alignItems: 'center',
  shadowColor: '#2563EB',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.13,
  shadowRadius: 5,
  elevation: 4,
},
editButtonText: {
  color: 'white',
  fontWeight: 'bold',
  fontSize: 16,
},
cancelButton: {
  backgroundColor: '#bcbcbc',
  paddingVertical: 12,
  paddingHorizontal: 22,
  borderRadius: 10,
  marginHorizontal: 8,
  minWidth: 110,
  alignItems: 'center',
  opacity: 0.95,
},
cancelButtonText: {
  color: '#272626ff',
  fontWeight: 'bold',
  fontSize: 16,
},
footerContainer: {
  marginTop: 30,
  paddingVertical: 16,
  alignItems: 'center',
  borderTopWidth: 1,
  borderTopColor: '#E2E8F0',
},
footerText: {
  color: '#64748B',
  fontSize: 13,
  textAlign: 'center',
},

logsSection: {
    marginTop: 24,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  logsSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 10,
  },
  logsSectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
  },
  emptyLogsState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyLogsText: {
    fontSize: 14,
    color: '#94A3B8',
    marginTop: 12,
  },
  
  // Budget Log Card Styles
  logCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#2563EB',
  },
  logCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  logIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  logCardContent: {
    flex: 1,
  },
  logType: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 2,
  },
  logDate: {
    fontSize: 12,
    color: '#64748B',
  },
  logAmountContainer: {
    marginBottom: 8,
  },
  logAmount: {
    fontSize: 20,
    fontWeight: '700',
  },
  logTransition: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logPrevAmount: {
    fontSize: 15,
    color: '#64748B',
    textDecorationLine: 'line-through',
  },
  logCurrAmount: {
    fontSize: 18,
    fontWeight: '700',
  },
  logAddition: {
    gap: 4,
  },
  logAddAmount: {
    fontSize: 18,
    fontWeight: '700',
  },
  logPrevLabel: {
    fontSize: 12,
    color: '#64748B',
  },
  logPeriodBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  logPeriodText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#64748B',
  },

  // Budget History Card Styles
  historyCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  historyCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  historyTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  historyPeriod: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  historyDateRange: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 12,
  },
  historyBudgetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 12,
  },
  historyBudgetItem: {
    flex: 1,
    alignItems: 'center',
  },
  historyBudgetDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#E2E8F0',
  },
  historyBudgetLabel: {
    fontSize: 12,
    color: '#1f4b81ff',
    marginBottom: 4,
  },
  historyBudgetAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1f4b81ff',
  },
  historySpentAmount: {
    fontSize: 16,
    fontWeight: '700',
  },
  progressBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  progressBarBg: {
    flex: 1,
    height: 8,
    backgroundColor: '#E2E8F0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressPercentage: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1f4b81ff',
    minWidth: 40,
  },
  historyFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  historyRemainingLabel: {
    fontSize: 13,
    color: '#64748B',
  },
  historyRemainingAmount: {
    fontSize: 15,
    fontWeight: '700',
    flex: 1,
    textAlign: 'right',
    marginRight: 4,
  },
 
  budgetBox: {
    backgroundColor: '#1f4b81ff', 
    borderWidth: 2,
    borderColor: '#1f4b81ff',
  },
  
  budgetGradient: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 100,
    height: 100,
    backgroundColor: '#eff6ff',
    opacity: 0.15,
    borderRadius: 50,
  },
  
  // Expenses Box - Lighter red for better readability
  expenseBox: {
    backgroundColor: '#fca5a5', // Lighter red background
    borderWidth: 2,
    borderColor: '#fca5a5',
  },
  
  expenseGradient: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 100,
    height: 100,
    backgroundColor: '#fca5a5',
    opacity: 0.15,
    borderRadius: 50,
  },
  
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  
  iconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#031934ff',
  },
  
  iconWrapperExpense: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#dc2626',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fca5a5',
  },
  
  
  
  valueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  
  
  addButton: {
    padding: 4,
  },
  
  tapIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  
  tapText: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.8)',
  },
  
  // Duration Section - White background to stand out on dark blue
  durationSection: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 14,
    borderWidth: 2,
    borderColor: '#93c5fd',
  },
  
  durationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  
  durationLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4c1d95',
  },
  
  periodButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6366f1',
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
    gap: 6,
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  
  periodText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: 0.3,
  },
  
  dateRange: {
    fontSize: 13,
    color: '#6b21a8',
    fontWeight: '600',
  },
  
  // Tip Container - VIBRANT YELLOW
  tipContainer: {
    backgroundColor: '#fef9c3',
    borderRadius: 10,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    borderWidth: 2,
    borderColor: '#fde047',
  },
  
  tipIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#fef08a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  tipEmoji: {
    fontSize: 16,
  },
  
  tipText: {
    flex: 1,
    fontSize: 12,
    color: '#713f12',
    lineHeight: 18,
    fontWeight: '500',
  },
  
  tipHighlight: {
    fontWeight: '800',
    color: '#92400e',
    backgroundColor: '#fde68a',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  
  
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  dropdownModal: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 8,
    minWidth: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  
  dropdownItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  
  dropdownText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '600',
  },
  
  dropdownItemSelectedText: {
    color: '#6366f1',
    fontWeight: '800',
  },
   transactionDetailOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  transactionDetailContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    width: '100%',
    maxWidth: 400,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  transactionDetailHeader: {
    backgroundColor: '#2563eb',
    padding: 24,
    paddingBottom: 20,
  },
  transactionDetailTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  transactionDetailSubtitle: {
    fontSize: 14,
    color: '#bfdbfe',
  },
  transactionDetailContent: {
    padding: 20,
  },
  transactionAmountCard: {
    backgroundColor: '#f9fafb',
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  transactionAmountIcon: {
    backgroundColor: '#2563eb',
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  transactionAmountIconText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  transactionAmountLabel: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '600',
    marginBottom: 4,
  },
  transactionAmountValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111827',
  },
  transactionInfoCard: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  transactionIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  transactionTypeIcon: {
    backgroundColor: '#1f4b81ff',
  },
  transactionCategoryIcon: {
    backgroundColor: '#1f4b81ff',
  },
  transactionDateIcon: {
    backgroundColor: '#1f4b81ff',
  },
  transactionIconText: {
    fontSize: 20,
  },
  transactionInfoContent: {
    flex: 1,
  },
  transactionInfoLabel: {
    fontSize: 11,
    color: '#6b7280',
    fontWeight: '600',
    marginBottom: 2,
  },
  transactionInfoValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  transactionNotesCard: {
    backgroundColor: '#ffffffff',
    borderRadius: 12,
    padding: 16,
    marginTop: 4,
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  transactionNotesIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#dbeafe',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  transactionNotesContent: {
    flex: 1,
  },
  transactionNotesLabel: {
    fontSize: 11,
    color: '#aaacb1ff',
    fontWeight: '600',
    marginBottom: 4,
  },
  transactionNotesValue: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  transactionDetailCloseButton: {
    backgroundColor: '#374151',
    margin: 20,
    marginTop: 0,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  transactionDetailCloseButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
   // Budget Logs Section
  budgetLogsSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  budgetLogsSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  budgetLogsHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  budgetLogsHeaderIconContainer: {
    backgroundColor: '#EFF6FF',
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  budgetLogsSectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#212f45ff',
  },
  budgetLogsSectionSubtitle: {
    fontSize: 12,
    color: '#212f45ff',
    marginTop: 2,
  },
  budgetLogsCountBadge: {
    backgroundColor: '#1f4b81ff',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    minWidth: 28,
    alignItems: 'center',
  },
  budgetLogsCountText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  budgetLogsScrollContainer: {
    maxHeight: 320,
  },

  // Date Grouping
  budgetLogDateGroup: {
    marginBottom: 20,
  },
  budgetLogDateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 6,
  },
  budgetLogDateHeaderText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1f4b81ff',
  },
  budgetLogDateLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E2E8F0',
    marginLeft: 8,
  },

  // Empty State
  budgetLogsEmptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  budgetLogsEmptyIconContainer: {
    backgroundColor: '#F8FAFC',
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  budgetLogsEmptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 6,
  },
  budgetLogsEmptyText: {
    fontSize: 13,
    color: '#1f4b81ff',
    textAlign: 'center',
  },

  // Budget Log Card
  budgetLogCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
  },
  budgetLogCardMain: {
    padding: 14,
  },
  budgetLogCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  budgetLogIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  budgetLogCardContent: {
    flex: 1,
  },
  budgetLogType: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1f4b81ff',
    marginBottom: 4,
  },
  budgetLogTimeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  budgetLogTime: {
    fontSize: 12,
    color: '#64748B',
  },

  // Amount Container
  budgetLogAmountContainer: {
    marginTop: 8,
  },
  budgetLogAmountBadge: {
    backgroundColor: '#F8FAFC',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  budgetLogAmount: {
    fontSize: 20,
    fontWeight: '700',
  },
  budgetLogTransition: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    padding: 10,
    borderRadius: 8,
    gap: 8,
  },
  budgetLogPrevAmount: {
    fontSize: 14,
    color: '#64748B',
    textDecorationLine: 'line-through',
    fontWeight: '500',
  },
  budgetLogArrowContainer: {
    backgroundColor: '#E2E8F0',
    padding: 4,
    borderRadius: 4,
  },
  budgetLogCurrAmount: {
    fontSize: 17,
    fontWeight: '700',
  },
  budgetLogAddition: {
    backgroundColor: '#F8FAFC',
    padding: 10,
    borderRadius: 8,
  },
  budgetLogAddAmount: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  budgetLogPrevLabel: {
    fontSize: 12,
    color: '#64748B',
  },

  // Footer
  budgetLogFooter: {
    backgroundColor: '#F8FAFC',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  budgetLogPeriodBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  budgetLogPeriodText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },

  menuItemContainer: {
  flexDirection: 'row',
  alignItems: 'center',
  paddingVertical: 14,
  paddingHorizontal: 16,
  gap: 12,
  backgroundColor: '#ffffff',
},

menuIcon: {
  fontSize: 20,
},

menuItemText: {
  fontSize: 15,
  fontWeight: '500',
  color: '#1f4b81',
  flex: 1,
},

menuDivider: {
  height: 1,
  backgroundColor: '#e8f0f9',
  marginHorizontal: 12,
},

 modalOverlayProfile: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-start',
    paddingTop: 60,
    paddingLeft: 16,
  },
  menuDropdownProfile: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    width: 220,
    shadowColor: '#1f4b81',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#d1e3f5',
    overflow: 'hidden',
  },
});


if (Platform.OS === "ios" || Platform.OS === "android") {
  Object.assign(styles, {
    dropdownContainer: {
      ...styles.dropdownContainer,
      flexWrap: "wrap",
      marginTop: 4,
      gap: 2,
    },
    dropdownText: {
      ...styles.dropdownText,
      fontSize: 12,
    },
    dropdownLabel: {
      ...styles.dropdownLabel,
      fontSize: 12,
    },

    balanceCard: {
      ...styles.balanceCard,
      padding: 8,
      marginBottom: 10,
    },
    boxValue: {
      ...styles.boxValue,
      fontSize: 14,
    },
    expenseValue: {
      ...styles.expenseValue,
      fontSize: 14,
    },

    featuresGrid: {
      ...styles.featuresGrid,
      paddingVertical: -2,
      paddingHorizontal: 5,
      marginBottom: -5,
    },
    featureCard: {
      ...styles.featureCard,
      width: "30%",
      marginBottom: 0,
    },
    featureIcon: {
      ...styles.featureIcon,
      fontSize: 20,
      marginBottom: 2,
    },
    featureLabel: {
      ...styles.featureLabel,
      fontSize: 14,
    },

    greeting: {
      ...styles.greeting,
      fontSize: 17,
    },
    profileRow: {
      ...styles.profileRow,
      gap: 6,
    },
    logsSection: {
      ...styles.logsSection,
      marginTop: 14,
      padding: 10,
      borderRadius: 12,
    },
    logsSectionHeader: {
      ...styles.logsSectionHeader,
      marginBottom: 10,
    },
    logsSectionTitle: {
      ...styles.logsSectionTitle,
      fontSize: 15,
    },

    // 🔹 Budget Logs
    logCard: {
      ...styles.logCard,
      padding: 10,
      borderRadius: 10,
      marginBottom: 8,
    },
    logType: {
      ...styles.logType,
      fontSize: 14,
    },
    logDate: {
      ...styles.logDate,
      fontSize: 11,
    },
    logAmount: {
      ...styles.logAmount,
      fontSize: 16,
    },
    logPrevAmount: {
      ...styles.logPrevAmount,
      fontSize: 13,
    },
    logCurrAmount: {
      ...styles.logCurrAmount,
      fontSize: 15,
    },
    logAddAmount: {
      ...styles.logAddAmount,
      fontSize: 15,
    },
    logIconCircle: {
      ...styles.logIconCircle,
      width: 36,
      height: 36,
      borderRadius: 18,
      marginRight: 8,
    },

    // 🔹 Budget History
    historyCard: {
      ...styles.historyCard,
      padding: 12,
      borderRadius: 10,
      marginBottom: 8,
    },
    historyPeriod: {
      ...styles.historyPeriod,
      fontSize: 14,
    },
    historyDateRange: {
      ...styles.historyDateRange,
      fontSize: 12,
      marginBottom: 8,
    },
    historyBudgetLabel: {
      ...styles.historyBudgetLabel,
      fontSize: 11,
    },
    historyBudgetAmount: {
      ...styles.historyBudgetAmount,
      fontSize: 14,
    },
    historySpentAmount: {
      ...styles.historySpentAmount,
      fontSize: 14,
    },
    progressBarContainer: {
      ...styles.progressBarContainer,
      gap: 6,
      marginBottom: 8,
    },
    progressPercentage: {
      ...styles.progressPercentage,
      fontSize: 11,
    },
    historyRemainingAmount: {
      ...styles.historyRemainingAmount,
      fontSize: 13,
    },
    statusBadge: {
      ...styles.statusBadge,
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 10,
      gap: 3,
    },
    statusText: {
      ...styles.statusText,
      fontSize: 11,
    },

    //overview

    summaryBox: {
      ...styles.summaryBox,
      padding: 6,
      borderRadius: 8,
      shadowOpacity: 0.03,
      elevation: 2,
    },

    cardHeader: {
      ...styles.cardHeader,
      marginBottom: 4,
      gap: 4,
    },

    iconWrapper: {
      ...styles.iconWrapper,
      width: 24,
      height: 24,
      borderRadius: 12,
    },

    boxLabel: {
      ...styles.boxLabel,
      fontSize: 10,
      marginTop: 2,
    },

    valueRow: {
      ...styles.valueRow,
      marginTop: 2,
    },
    // 🔹 Duration section smaller
    durationSection: {
      ...styles.durationSection,
      padding: 8,
      borderRadius: 8,
      borderWidth: 1,
    },
    durationLabel: {
      ...styles.durationLabel,
      fontSize: 11,
    },
    periodButton: {
      ...styles.periodButton,
      paddingVertical: 4,
      paddingHorizontal: 10,
      borderRadius: 14,
    },
    periodText: {
      ...styles.periodText,
      fontSize: 11,
    },
    dateRange: {
      ...styles.dateRange,
      fontSize: 11,
    },
    progressBarBg: {
      ...styles.progressBarBg,
      height: 5,
    },
    progressBarFill: {
      ...styles.progressBarFill,
      height: '100%',
    },
    // 🔹 Tip Container compact
    tipContainer: {
      ...styles.tipContainer,
      padding: 8,
      borderRadius: 8,
      borderWidth: 1,
    },
    tipText: {
      ...styles.tipText,
      fontSize: 11,
      lineHeight: 16,
    },


overviewTitle: {
  fontSize: 16,           // smaller main title
  fontWeight: "700",
},

overviewSubtitle: {
  fontSize: 12,
  color: "#64748b",
},

summaryTitle: {
  fontSize: 11,
  fontWeight: "600",
},

summaryValue: {
  fontSize: 15,
  fontWeight: "800",
},

summaryLabel: {
  fontSize: 10,
  fontWeight: "500",
},

summaryCard: {
  paddingVertical: 8,
  borderRadius: 8,
  marginHorizontal: 6,
},

progressTitle: {
  fontSize: 11,
  fontWeight: "700",
},
progressValue: {
  fontSize: 13,
},
progressLabel: {
  fontSize: 10,
  color: "#92400E",
},

ooverlay: {
    flex: 1,
    backgroundColor: 'rgba(31, 75, 129, 0.85)', // Darker overlay using #1f4b81
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  tutorialBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#1f4b81',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  tutorialTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f4b81', // Primary color
    marginBottom: 16,
    textAlign: 'center',
  },
  tutorialText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#4a4a4a',
    marginBottom: 24,
  },
  tutorialButton: {
    backgroundColor: '#1f4b81', // Primary button color
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: 'center',
    shadowColor: '#1f4b81',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  tutorialButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },

overspendText: {
  fontSize: 12,
  fontWeight: "600",
  color: "#B91C1C",}
  });
}


