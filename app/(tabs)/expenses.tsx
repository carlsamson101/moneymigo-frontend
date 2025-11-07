
import { LogBox } from 'react-native';
// Temporarily ignore the text rendering warning
LogBox.ignoreLogs(['Text strings must be rendered within a <Text> component']);
import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, Platform, Modal, Pressable,
  TextInput, Dimensions, Alert, SafeAreaView, StatusBar
} from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getToken } from '../../lib/auth';
import api from '../../lib/api';
import ExpenseChart from '../../components/ExpenseChart';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { getCachedData, syncOfflineChanges, queueOfflineChange } from "../../lib/offlineCache";

import { LayoutAnimation, UIManager } from "react-native";
import NetInfo from "@react-native-community/netinfo";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import TextRecognition from "react-native-text-recognition"; // native OCR (APK)
import Tesseract from "tesseract.js"; // web / Expo Go fallback

// Returns the right `mediaTypes` option for the installed ImagePicker version
const imagesOnly = () => {
  // New API (SDK 51+): use array of MediaType
  if ((ImagePicker as any)?.MediaType?.Image) {
    return { mediaTypes: [ImagePicker.MediaType.Image] };
  }
  // Old API: use MediaTypeOptions enum (deprecated but still works)
  return { mediaTypes: [ImagePicker.MediaType.image]};
};

let DateTimePicker: any = () => null;
if (Platform.OS !== 'web') {
  DateTimePicker = require('@react-native-community/datetimepicker').default;
}

const { width } = Dimensions.get('window');
const isMobile = Platform.OS !== 'web' && width < 768;

const periods = ['Daily', 'Weekly', 'Monthly', 'Custom'];

// enable animations for Android
if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type HistoryRangeButtonProps = {
  onPress: () => void;
  expanded: boolean;
};

function HistoryRangeButton({ onPress, expanded }: HistoryRangeButtonProps) {
  return (
    <TouchableOpacity style={styles.historyCard} onPress={onPress} activeOpacity={0.88}>
      <View style={styles.historyCardLeft}>
        <Ionicons name="time-outline" size={16} color="#475569" style={{ marginRight: 10 }} />
        <Text style={styles.historyLabel}>View History by Date Range</Text>
      </View>
      <Ionicons
        name={expanded ? "chevron-up" : "chevron-down"}
        size={15}
        color="#2563EB"
      />
    </TouchableOpacity>
  );
}

const capitalize = (str: any) =>
  typeof str === 'string' && str.length > 0
    ? str.charAt(0).toUpperCase() + str.slice(1)
    : '';

const OverspendWarning = ({ overspentTransactions, categoryColors }: any) => {
  const [expanded, setExpanded] = useState(false);

  const grouped = overspentTransactions.reduce((acc: any, item: any) => {
    const amount = Number(item.overspent) || 0;
    if (amount > 0) {
      acc[item.category] = (acc[item.category] || 0) + amount;
    }
    return acc;
  }, {});

  const totalOverspent = Object.values(grouped).reduce((a: any, b: any) => a + b, 0);
  const overspentList = Object.entries(grouped).map(([category, amount]) => ({
    category,
    amount,
  }));

  const topCategory = overspentList.reduce(
    (max, item) => (item.amount > (max?.amount || 0) ? item : max),
    null
  );

  const severityColor =
    totalOverspent <= 50
      ? "#FCD34D"
      : totalOverspent <= 200
      ? "#FB923C"
      : "#EF4444";

  return (
    <View
      style={{
        backgroundColor: "#FFF5F5",
        borderRadius: 14,
        borderWidth: 1,
        borderColor: "#FCA5A5",
        padding: 14,
        marginVertical: 12,
      }}
    >
      <TouchableOpacity
        onPress={() => {
          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
          setExpanded(!expanded);
        }}
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            flexShrink: 1,
          }}
        >
          <Ionicons
            name="warning-outline"
            size={20}
            color="#DC2626"
            style={{ marginRight: 8 }}
          />
          <Text
  style={{
    fontWeight: "600",
    color: "#DC2626",
    fontSize: 15,
  }}
>
  ⚠️ You've exceeded your budget by ₱{totalOverspent.toLocaleString(undefined, {
    minimumFractionDigits: 2,
  })}
</Text>
        </View>
        <Ionicons
          name={expanded ? "chevron-up-outline" : "chevron-down-outline"}
          size={20}
          color="#DC2626"
        />
      </TouchableOpacity>

      {expanded && (
        <View style={{ marginTop: 10 }}>
          {overspentList.map((item, index) => (
            <View
              key={index}
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                paddingVertical: 5,
                borderBottomWidth: 1,
                borderBottomColor: "#FECACA",
              }}
            >
              <Text style={{ color: "#991B1B", fontWeight: "500" }}>
                {item.category}
              </Text>
             <Text style={{ color: "#DC2626" }}>
                ₱{item.amount.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                })}
              </Text>
            </View>
          ))}

          {topCategory && (
            <Text
              style={{
                marginTop: 10,
                color: "#7F1D1D",
                fontWeight: "600",
              }}
            >
              Largest category overspend: {topCategory.category} (₱{topCategory.amount.toLocaleString(undefined, {
                minimumFractionDigits: 2,
              })})
            </Text>
             )}

          <View
          style={{
            backgroundColor: "#FEF9C3",
            borderColor: "#FDE68A",
            borderWidth: 1,
            borderRadius: 8,
            padding: 8,
            marginTop: 10,
          }}
        >
          <Text style={{ fontSize: 12, color: "#854D0E", lineHeight: 16 }}>
            Note: The total overspend (₱{totalOverspent.toLocaleString(undefined, {
              minimumFractionDigits: 2,
            })}) reflects the total amount spent beyond your budget this period. Each category above shows how much it contributed.
          </Text>
        </View>

        </View>
      )}
    </View>
  );
};

export default function ExpensesPage() {
  const router = useRouter();
  const { period } = useLocalSearchParams();
  const [budgetPeriod, setBudgetPeriod] = useState('Monthly');
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [showCustomPicker, setShowCustomPicker] = useState(false);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [expenses, setExpenses] = useState<{ [date: string]: any[] }>({});
  const [filteredExpenses, setFilteredExpenses] = useState<any[]>([]);
  const [budgetAmount, setBudgetAmount] = useState(0);

  const [loading, setLoading] = useState(false);
  const [showAddExpenseModal, setShowAddExpenseModal] = useState(false);
  const [showExpenseDetailModal, setShowExpenseDetailModal] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<any | null>(null);
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseCategory, setExpenseCategory] = useState('Select Category');
  const [expenseNotes, setExpenseNotes] = useState('');
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [customDate, setCustomDate] = useState<Date | null>(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [customCategories, setCustomCategories] = useState<string[]>([]);
  const [showCustomCategoryInput, setShowCustomCategoryInput] = useState(false);
  const [customCategoryInput, setCustomCategoryInput] = useState('');
  const [othersExpanded, setOthersExpanded] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyExpenses, setHistoryExpenses] = useState<any[]>([]);
  const [hasFetchedHistory, setHasFetchedHistory] = useState(false);
  const [otherSubcategories, setOtherSubcategories] = useState<string[]>([]);
// Add this new state at the top with your other useState declarations
const [historyStartDate, setHistoryStartDate] = useState<Date | null>(null);
const [historyEndDate, setHistoryEndDate] = useState<Date | null>(null);

const [isScanning, setIsScanning] = useState(false);

// 🔍 OCR confirmation states
const [showOcrModal, setShowOcrModal] = useState(false);
const [ocrRawText, setOcrRawText] = useState("");
const [ocrDetectedAmount, setOcrDetectedAmount] = useState("");
const [ocrDetectedCategory, setOcrDetectedCategory] = useState("Others");

  const builtInColors = {};
  const [categoryColors, setCategoryColors] = useState<{ [category: string]: string }>({ ...builtInColors });


  
  const colorPalette = [
    '#4E79A7', '#F28E2B', '#E15759', '#76B7B2', '#59A14F',
    '#EDC948', '#B07AA1', '#FF9DA7', '#9C755F', '#BAB0AC',
  ];

  const getCategoryIcon = (category: string) => {
  const icons: { [key: string]: string } = {
    'Food': 'restaurant',
    'Transport': 'car',
    'Bills': 'document-text',
    'School': 'school',
    'Shopping': 'cart',
  };
  return icons[category] || 'pricetag';
};

const getCategoryColor = (category: string) => {
  const colors: { [key: string]: string } = {
    'Food': '#F59E0B',
    'Transport': '#3B82F6',
    'Bills': '#EF4444',
    'School': '#8B5CF6',
    'Shopping': '#EC4899',
  };
  return colors[category] || '#6366F1';
};
  const categoryIcons: any = {
    Food: <Ionicons name="fast-food" size={20} color="#1f4b81ff" />,
    Transport: <MaterialCommunityIcons name="bus" size={20} color="#1f4b81ff" />,
    Bills: <MaterialCommunityIcons name="file-document-outline" size={20} color="#1f4b81ff" />,
    School: <MaterialCommunityIcons name="school" size={20} color="#1f4b81ff" />,
    Shopping: <MaterialCommunityIcons name="cart" size={20} color="#1f4b81ff" />,
    Savings: <Ionicons name="cash-outline" size={20} color="#16a34a" />,
    Others: <MaterialCommunityIcons name="dots-horizontal" size={20} color="#1f4b81ff" />,
  };

  const getCategoryIconComponent = (category: string) => {
  const iconMap: any = {
    Food: <Ionicons name="fast-food" size={20} color="#1f4b81ff" />,
    Transport: <MaterialCommunityIcons name="bus" size={20} color="#1f4b81ff" />,
    Bills: <MaterialCommunityIcons name="file-document-outline" size={20} color="#1f4b81ff" />,
    School: <MaterialCommunityIcons name="school" size={20} color="#1f4b81ff" />,
    Shopping: <MaterialCommunityIcons name="cart" size={20} color="#1f4b81ff" />,
    Savings: <Ionicons name="cash-outline" size={20} color="#16a34a" />,
    Others: <MaterialCommunityIcons name="dots-horizontal" size={20} color="#1f4b81ff" />,
  };
  return iconMap[category] || iconMap.Others;
};

  function groupExpensesByDate(expenses: any[]): { [date: string]: any[] } {
    return expenses.reduce((acc: { [date: string]: any[] }, expense: any) => {
      const dateKey = new Date(expense.date).toDateString();
      if (!acc[dateKey]) acc[dateKey] = [];
      acc[dateKey].push(expense);
      return acc;
    }, {});
  }

  function getPeriodDateRange(period: string, startDate: Date | null, endDate: Date | null) {
    const today = new Date();
    let start, end;
    if (period === 'Custom' && startDate && endDate) {
      start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      end = new Date(endDate);
      end.setHours(0, 0, 0, 0);
      return { min: start, max: end };
    }

    if (period === 'Weekly' && startDate) {
      start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      end = new Date(start);
      end.setDate(start.getDate() + 7);
      end.setHours(0, 0, 0, 0);
      return { min: start, max: end };
    }
    if (period === 'Daily' && startDate) {
      start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      end = new Date(start);
      end.setDate(start.getDate() + 1);
      end.setHours(0, 0, 0, 0);
      return { min: start, max: end };
    }
    if (period === 'Monthly' && startDate) {
      start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      end = new Date(start);
      end.setMonth(end.getMonth() + 1);
      end.setHours(0, 0, 0, 0);
      return { min: start, max: end };
    }
    start = new Date(today);
    start.setHours(0, 0, 0, 0);
    end = new Date(start);
    end.setDate(end.getDate() + 1);
    end.setHours(0, 0, 0, 0);
    return { min: start, max: end };
  }

  const { min, max } = getPeriodDateRange(budgetPeriod, startDate, endDate);

  useEffect(() => {
    (async () => {
      const token = await getToken();
      if (!token?.id) return;
      const stored = await AsyncStorage.getItem(`othersSubcategories_${token.id}`);
      if (stored) setOtherSubcategories(JSON.parse(stored));
      else setOtherSubcategories([]);
    })();
  }, []);

  const saveOtherSubcategories = async (subs: string[]) => {
    setOtherSubcategories(subs);
    const token = await getToken();
    if (token?.id) {
      await AsyncStorage.setItem(`othersSubcategories_${token.id}`, JSON.stringify(subs));
    }
  };

  useEffect(() => {
    const allCategories = Array.from(new Set(filteredExpenses.map(e => e.category)));
    const newColors: { [category: string]: string } = {};
    allCategories.forEach((cat, idx) => {
      newColors[cat] = colorPalette[idx % colorPalette.length];
    });
    setCategoryColors(newColors);
    saveCategoryColors(newColors);
  }, [filteredExpenses]);

  useEffect(() => {
    (async () => {
      const stored = await AsyncStorage.getItem('categoryColors');
      if (stored) {
        const parsed = JSON.parse(stored);
        setCategoryColors({ ...builtInColors, ...parsed });
      }
    })();
  }, []);

  const saveCategoryColors = async (newColors: { [category: string]: string }) => {
    setCategoryColors({ ...builtInColors, ...newColors });
    const toStore = { ...newColors };
    Object.keys(builtInColors).forEach(k => delete toStore[k]);
    await AsyncStorage.setItem('categoryColors', JSON.stringify(toStore));
  };

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

  const saveCustomCategories = async (categories: string[]) => {
    setCustomCategories(categories);
    const token = await getToken();
    if (token?.id) {
      await AsyncStorage.setItem(`customCategories_${token.id}`, JSON.stringify(categories));
    }
  };

  // 🔄 Sync any offline changes whenever page is focused (if connected)
useFocusEffect(
  useCallback(() => {
    const syncIfOnline = async () => {
      const net = await NetInfo.fetch();
      if (net.isConnected) {
        console.log("🛰 Syncing offline changes...");
        await syncOfflineChanges();
        fetchExpenses(); // refresh latest data after sync
      } else {
        console.log("📴 Offline mode — no sync.");
      }
    };
    syncIfOnline();
  }, [])
);


 useFocusEffect(
  useCallback(() => {
    fetchBudget();    // ✅ load latest budget
    fetchExpenses();  // ✅ load latest expenses
  }, [budgetPeriod, startDate, endDate])
);


  useFocusEffect(
    useCallback(() => {
      (async () => {
        const user = await getToken();
        if (user && user.id) {
          const res = await api.get(`/auth/${user.id}`);
          const u = res.data;
          setBudgetPeriod(u.budgetPeriod || 'Monthly');
          setStartDate(u.budgetPeriodStart ? new Date(u.budgetPeriodStart) : null);
          setEndDate(u.budgetPeriodEnd ? new Date(u.budgetPeriodEnd) : null);
          fetchExpenses();
        }
      })();
    }, [period])
  );

  const fetchExpenses = async () => {
  setLoading(true);
  const user = await getToken();
  if (!user) {
    setLoading(false);
    return;
  }

  try {
  
    // ✅ Try fetching from API (or cached if offline)
    const data = await getCachedData<{ expenses: any[] }>(
      `/expenses/user/${user.id}`,
      `expensesCache_${user.id}`
    );

    // ✅ Group and flatten expenses
    const grouped = groupExpensesByDate(data.expenses || data);
    setExpenses(grouped);
    setFilteredExpenses(Object.values(grouped).flat());
  } catch (err: any) {
    console.error("❌ Fetch failed:", err?.message);
  } finally {
    setLoading(false);
  }
};

// 🔄 Fetch current budget amount from backend
const fetchBudget = async () => {
  try {
    const user = await getToken();
    if (!user?.id) return;

    const res = await api.get(`/budget/user/${user.id}`);
    setBudgetAmount(res.data?.amount || 0);
  } catch (err: any) {
    console.warn("⚠️ Could not fetch budget:", err.message);
    setBudgetAmount(0);
  }
};



  const handleChangePeriod = async (newPeriod: string) => {
    try {
      const token = await getToken();
      if (!token || !token.id) {
        alert('User not logged in!');
        return;
      }
      const res = await api.post(`/auth/${token.id}/change-budget-period`, { newPeriod });
      setStartDate(null);
      setEndDate(null);
      setDropdownOpen(false);
      const userRes = await api.get(`/auth/${token.id}`);
      const user = userRes.data;
      setBudgetPeriod(user.budgetPeriod);
      setStartDate(user.budgetPeriodStart ? new Date(user.budgetPeriodStart) : null);
      setEndDate(user.budgetPeriodEnd ? new Date(user.budgetPeriodEnd) : null);
      setTimeout(async () => {
        fetchExpenses();
      }, 200);
      alert(res.data.message || `Budget period reset and set to ${newPeriod}`);
    } catch (error) {
      alert('Failed to change budget period');
    }
  };

  const isOnline = async () => {
  const state = await NetInfo.fetch();
  return state.isConnected;
};

  const handleCustomPeriodConfirm = async () => {
    if (!startDate || !endDate) {
      alert('Please select both start and end dates.');
      return;
    }
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
        alert('User not logged in!');
        return;
      }
      await api.post(`/auth/${token.id}/change-budget-period`, {
        newPeriod: 'Custom',
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      });
      setBudgetPeriod('Custom');
      setShowCustomPicker(false);
      fetchExpenses();
    } catch (err) {
      alert('Failed to set custom budget.');
    }
  };

async function handleScanReceipt() {
  try {
    if (Platform.OS === "web") {
      // 🖼️ Web browsers — open file picker
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "image/*";
      input.onchange = async (e) => {
        const file = e.target.files?.[0];
        if (file) {
          const uri = URL.createObjectURL(file);
          await processReceiptImage(uri);
        }
      };
      input.click();
      return;
    }

    // 📱 Mobile (APK or browser): choose Camera or Photos
    Alert.alert(
      "Scan Receipt",
      "Choose an option",
      [
        { text: "📷 Camera", onPress: pickFromCamera },
        { text: "🖼️ Photos", onPress: pickFromGallery },
        { text: "Cancel", style: "cancel" },
      ],
      { cancelable: true }
    );
  } catch (error) {
    console.error("❌ Scan Receipt error:", error);
    Alert.alert("Error", "Something went wrong while selecting an image.");
  }
}

// 📸 Camera
async function pickFromCamera() {
  const { status } = await ImagePicker.requestCameraPermissionsAsync();
  if (status !== "granted") {
    Alert.alert("Permission Required", "Please allow camera access.");
    return;
  }

  const result = await ImagePicker.launchCameraAsync({
    allowsEditing: true,
    quality: 1,
  });

  if (!result.canceled) await processReceiptImage(result.assets[0].uri);
}

// 🖼️ Gallery
async function pickFromGallery() {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== "granted") {
    Alert.alert("Permission Required", "Please allow photo access.");
    return;
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: [ImagePicker.MediaType.Image],
    allowsEditing: true,
    quality: 1,
  });

  if (!result.canceled) await processReceiptImage(result.assets[0].uri);
}

// 🧠 OCR processing
async function processReceiptImage(uri) {
  try {
    setIsScanning(true);

    // ✂️ Optimize image for OCR
    const processed = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: 1000 } }],
      { compress: 1, format: ImageManipulator.SaveFormat.PNG }
    );

    let text = "";

    // 🧩 OCR Engine (Native or Web)
    if (Platform.OS !== "web") {
      let TextRecognition = null;
      try {
        TextRecognition = require("react-native-text-recognition").default;
      } catch {
        console.warn("OCR native engine unavailable, fallback to web mode");
      }

      if (TextRecognition && TextRecognition.recognize) {
        const blocks = await TextRecognition.recognize(processed.uri);
        text = (blocks || []).join(" ");
      } else {
        const Tesseract = await import("tesseract.js");
        const result = await Tesseract.recognize(processed.uri, "eng");
        text = result?.data?.text || "";
      }
    } else {
      const Tesseract = await import("tesseract.js");
      const result = await Tesseract.recognize(processed.uri, "eng");
      text = result?.data?.text || "";
    }

    console.log("🧾 OCR (raw):", text);

    // 🧠 Clean + normalize
    const cleanText = text
      .replace(/\n+/g, " ")
      .replace(/\s{2,}/g, " ")
      .toLowerCase();

    // 🧮 Extract numbers
    const numberMatches = [...cleanText.matchAll(/₱?\s*(\d+(?:[.,]\d{1,2})?)/g)]
      .map(m => parseFloat(m[1].replace(/,/g, '')))
      .filter(n => !isNaN(n) && n > 0);

    const keywordPattern = /(total|amount|cash|withdrawal|paid|bill|price|vatable sales)[^\d]{0,10}(\d+(?:[.,]\d{1,2})?)/gi;
    const keywordMatches = [...cleanText.matchAll(keywordPattern)]
      .map(m => parseFloat(m[2].replace(/,/g, '')))
      .filter(n => !isNaN(n) && n > 0);

    const reasonable = numberMatches.filter(n => n >= 10 && n <= 999999);

    // 🧩 Smart priority logic
    let detectedAmount = null;
    if (keywordMatches.length > 0) {
      detectedAmount = keywordMatches[keywordMatches.length - 1];
    } else if (reasonable.length > 0) {
      detectedAmount = Math.max(...reasonable);
    } else if (numberMatches.length > 0) {
      detectedAmount = numberMatches[numberMatches.length - 1];
    }

    detectedAmount = detectedAmount || null;
    console.log("💰 Detected amount:", detectedAmount);

    // 🧠 Detect category
    let detectedCategory = "Others";
    if (/mcdonald|jollibee|kfc|burger|food/i.test(cleanText))
      detectedCategory = "Food";
    else if (/grab|taxi|jeep|bus|transport|tricycle/i.test(cleanText))
      detectedCategory = "Transport";
    else if (/meralco|water|electric|bill|globe|smart|pldt/i.test(cleanText))
      detectedCategory = "Bills";
    else if (/notebook|school|pen|tuition|module/i.test(cleanText))
      detectedCategory = "School";
    else if (/mall|store|shop|sm|robinsons|puregold|supermarket|7[\s\-]?11|seven[-\s]?eleven|711/i.test(cleanText))
      detectedCategory = "Shopping";
    else if (/bank|withdraw|atm|landbank|bpi|bdo/i.test(cleanText))
      detectedCategory = "Savings";

    // ✅ Apply results
   if (detectedAmount) {
  setOcrDetectedAmount(detectedAmount.toString());
  setOcrDetectedCategory(detectedCategory);
  setOcrRawText(cleanText);
  setShowOcrModal(true); // open confirmation modal
} else {
  setExpenseCategory("Others");
  Alert.alert("⚠️ No amount found", "Could not detect a total. Please enter manually.");
}

  } catch (err) {
    console.error("❌ OCR failed:", err);
    Alert.alert("❌ Error", "Failed to scan receipt. Try again with a clearer image.");
  } finally {
    setIsScanning(false);
  }
}


  const handleAddExpense = async () => {
  const user = await getToken();
  if (!user || !user.id) {
    Alert.alert("⚠️ Not Logged In", "Please log in before adding an expense.");
    return;
  }

  if (!expenseAmount || expenseCategory === "Select Category") {
    Alert.alert("⚠️ Incomplete Fields", "Please fill in all required fields.");
    return;
  }

  const txnDate = customDate || new Date();
  if (txnDate < min || txnDate > max) {
    Alert.alert(
      "⚠️ Invalid Date",
      `Transaction date must be within your budget period:\n${min.toLocaleDateString()} — ${new Date(
        max.getTime() - 86400000
      ).toLocaleDateString()}`
    );
    return;
  }

  const payload = {
    category: expenseCategory.startsWith("Others")
      ? expenseCategory
      : ["Food", "Transport", "Bills", "School", "Shopping", "Savings", "Others"].includes(expenseCategory)
        ? expenseCategory
        : `${expenseCategory}`,
    amount: parseFloat(expenseAmount),
    notes: expenseNotes,
    userId: user.id,
    date: txnDate.toISOString(),
  };

  try {
    setIsLoading(true);

    // ✅ Check for offline mode before trying API
    if (!(await isOnline())) {
      await queueOfflineChange("expense", payload);
      Alert.alert(
        "📦 Offline Mode",
        "You're offline. The expense has been saved locally and will sync once you're back online."
      );
      console.log("📦 Saved expense locally (offline mode)");
      setIsLoading(false);
      return;
    }

    // ✅ If online, proceed normally
    const res = await api.post("/expenses", payload);
    // 🧠 Cache the latest expense for offline view
      const updatedCache = [payload, ...(filteredExpenses || [])];
      await AsyncStorage.setItem(`expensesCache_${user.id}`, JSON.stringify(updatedCache));


    if (res.data?.overspent && res.data.overspent > 0) {
      Alert.alert(
        "⚠️ Budget Exceeded",
        `This ₱${Number(expenseAmount).toLocaleString()} expense exceeded your current budget by ₱${res.data.overspent.toLocaleString()}.\n\nIt has still been recorded for tracking.`
      );
    } else {
      Alert.alert("✅ Expense Added", res.data?.message || "Expense recorded successfully!");
    }

    // 🔄 Reset inputs & refresh UI
    setShowAddExpenseModal(false);
    setExpenseAmount("");
    setExpenseCategory("Select Category");
    setExpenseNotes("");
    setCustomDate(new Date());
    fetchExpenses();

  } catch (err) {
    console.error("❌ Failed to save expense:", err);
    if (err.response?.status === 403) {
      Alert.alert(
        "⚠️ Budget Limit Reached",
        err.response?.data?.message || "This expense exceeds your available budget."
      );
    } else {
      Alert.alert("❌ Error", "Failed to save your expense. Please try again.");
    }
  } finally {
    setIsLoading(false);
  }
};


  // Update the fetchHistory function to use the history-specific dates
const fetchHistory = async () => {
  setHasFetchedHistory(false);
  const user = await getToken();
  if (!user || !historyStartDate || !historyEndDate) return;
  
  const endOfDay = new Date(historyEndDate);
  endOfDay.setHours(23, 59, 59, 999);
  
  try {
    const res = await api.get(`/expenses/history`, {
      params: {
        userId: user.id,
        start: historyStartDate.toISOString(),
        end: endOfDay.toISOString(),
      },
    });
    setHistoryExpenses(res.data.expenses || []);
    setHasFetchedHistory(true);
  } catch (err) {
    setHasFetchedHistory(true);
    console.error('❌ Failed to fetch history:', err);
  }
};

// Add this to initialize dates when history modal opens:
const openHistoryModal = () => {
  // Calculate current period dates dynamically
  const now = new Date();
  let periodStart, periodEnd;
  
  if (budgetPeriod === 'Custom' && startDate && endDate) {
    periodStart = new Date(startDate);
    periodEnd = new Date(endDate);
  } else if (budgetPeriod === 'Daily') {
    periodStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    periodEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
  } else if (budgetPeriod === 'Weekly') {
    const dayOfWeek = now.getDay();
    periodStart = new Date(now);
    periodStart.setDate(now.getDate() - dayOfWeek);
    periodStart.setHours(0, 0, 0, 0);
    periodEnd = new Date(periodStart);
    periodEnd.setDate(periodStart.getDate() + 6);
    periodEnd.setHours(23, 59, 59);
  } else if (budgetPeriod === 'Monthly') {
    periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
  } else {
    periodStart = new Date(startDate || now);
    periodEnd = new Date(endDate || now);
  }
  
  // Set initial dates for history modal
  setHistoryStartDate(periodStart);
  setHistoryEndDate(periodEnd);
  setShowHistoryModal(true);
  setHasFetchedHistory(false);
};

  function formatDateInputValue(date: Date | null): string {
    if (!date) return '';
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function parseDateLocal(dateStr: string): Date {
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day);
  }

  // --- History Section ---
const HistorySection = (
  <View style={styles.modalContent}>
    <Text style={{ fontWeight: 'bold', marginBottom: 10 }}>Select Date Range:</Text>

    {Platform.OS === 'web' ? (
      <>
        {/* ✅ Start Date Label */}
        <Text style={styles.dateLabel}>Start Date:</Text>
        <View style={styles.input}>
          <input
            type="date"
            style={{
              fontSize: 16,
              padding: 6,
              border: 'none',
              outline: 'none',
              backgroundColor: 'transparent',
              width: '100%',
            }}
            value={historyStartDate ? historyStartDate.toISOString().slice(0, 10) : ''}
            onChange={(e) => setHistoryStartDate(e.target.value ? new Date(e.target.value) : null)}
          />
        </View>

        {/* ✅ End Date Label */}
        <Text style={styles.dateLabel}>End Date:</Text>
        <View style={styles.input}>
          <input
            type="date"
            style={{
              fontSize: 16,
              padding: 6,
              border: 'none',
              outline: 'none',
              backgroundColor: 'transparent',
              width: '100%',
            }}
            value={historyEndDate ? historyEndDate.toISOString().slice(0, 10) : ''}
            onChange={(e) => setHistoryEndDate(e.target.value ? new Date(e.target.value) : null)}
          />
        </View>
      </>
    ) : (
      <>
        {/* ✅ Start Date Label */}
        <Text style={styles.dateLabel}>Start Date:</Text>
        <TouchableOpacity onPress={() => setShowStartPicker(true)} style={styles.input}>
          <Text>{historyStartDate ? historyStartDate.toLocaleDateString() : 'Select Start Date'}</Text>
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

        {/* ✅ End Date Label */}
        <Text style={styles.dateLabel}>End Date:</Text>
        <TouchableOpacity onPress={() => setShowEndPicker(true)} style={styles.input}>
          <Text>{historyEndDate ? historyEndDate.toLocaleDateString() : 'Select End Date'}</Text>
        </TouchableOpacity>
       {showEndPicker && (
  <DateTimePicker
    value={historyEndDate || new Date()}
    mode="date"
    display="default"
    minimumDate={historyStartDate || undefined}  // ⛔ disable picking earlier dates
    onChange={(event: any, date?: Date) => {
      setShowEndPicker(false);
      if (event.type === 'set' && date) {
        if (historyStartDate && (date <= historyStartDate)) {  // 🚫 same day or before
          Alert.alert(
            "❌ Invalid End Date",
            "End date must be after your start date."
          );
          return;
        }
        setHistoryEndDate(date);
      }
    }}
  />
)}

      </>
    )}

    {/* ✅ Fetch button with validation */}
    <TouchableOpacity
      onPress={() => {
        if (!historyStartDate || !historyEndDate) {
          alert('Please select both start and end dates.');
          return;
        }
        if (historyEndDate < historyStartDate) {
          alert('❌ End date cannot be earlier than start date.');
          return;
        }
        fetchHistory();
      }}
      style={[
        styles.submitButton,
        {
          marginTop: 10,
          backgroundColor: !historyStartDate || !historyEndDate ? '#ccc' : '#2563EB',
        },
      ]}
      disabled={!historyStartDate || !historyEndDate}
    >
      <Text style={styles.submitText}>Fetch History</Text>
    </TouchableOpacity>

    {/* History List */}
    <ScrollView style={{ marginTop: 20, width: '100%', maxHeight: 360 }}>
      {historyExpenses.length > 0 ? (
        Object.entries(
          historyExpenses.reduce((acc, exp) => {
            const dateKey = new Date(exp.date).toDateString();
            if (!acc[dateKey]) acc[dateKey] = [];
            acc[dateKey].push(exp);
            return acc;
          }, {} as { [date: string]: any[] })
        ).map(([date, items], idx) => (
          <View key={date + idx} style={{ marginBottom: 16 }}>
            <Text style={styles.dateHeader}>
              {new Date(date).toLocaleDateString(undefined, {
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })}
            </Text>
            {[...(items as any[])]
              .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
              .map((exp, i) => (
                <View style={styles.expenseItem} key={exp._id || i}>
                  <View style={styles.expenseLeft}>
                    <View
                      style={[
                        styles.iconCircle,
                        {
                          backgroundColor:
                            (categoryColors?.[exp.category] || '#ccc') + '22',
                        },
                      ]}
                    >
                      {categoryIcons[exp.category] || categoryIcons.Others}
                    </View>
                    <View>
                      <Text style={styles.categoryText}>{capitalize(exp.category)}</Text>
                      <Text style={styles.amountText}>
                        ₱
                        {exp.amount.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                        })}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.timeText}>
                    {new Date(exp.date).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Text>
                </View>
              ))}
            <Text
              style={{
                fontWeight: 'bold',
                textAlign: 'right',
                marginTop: 4,
              }}
            >
              Total: ₱
              {(items as { amount: number }[]).reduce(
                (sum: number, i: { amount: number }) => sum + i.amount,
                0
              ).toFixed(2)}
            </Text>
          </View>
        ))
      ) : (
        hasFetchedHistory && (
          <Text style={{ color: '#64748B', textAlign: 'center', marginTop: 18 }}>
            No expenses for that date range to show
          </Text>
        )
      )}
    </ScrollView>

    <TouchableOpacity
      onPress={() => setShowHistoryModal(false)}
      style={[styles.submitButton, { marginTop: 10, backgroundColor: '#aaa' }]}
    >
      <Text style={styles.submitText}>Close</Text>
    </TouchableOpacity>
  </View>
);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#1f4b81ff" />
      
      <ScrollView 
        style={styles.container} 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Gradient Header Section */}
        <LinearGradient
          colors={['#1f4b81ff', '#7fb1d6ff']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.headerContainer}
        >
          {/* Header Row with Back Button and Title */}
          <View
            style={[
              styles.headerRow,
              Platform.OS === 'web' && styles.headerRowWeb
            ]}
          >
            {Platform.OS !== 'web' && (
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => router.back()}
                activeOpacity={0.8}
              >
                <Ionicons name="arrow-back" size={24} color="#ffffff" />
              </TouchableOpacity>
            )}

            <Text style={styles.mainHeading}>Expenses</Text>
          </View>

          <Text style={styles.subHeading}>
            Track and manage your spending habits
          </Text>

          {/* Budget Period Info */}
          <View style={styles.headerContent}>
                  <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text
            style={styles.statNumber}
            numberOfLines={1}
            adjustsFontSizeToFit
            allowFontScaling
          >
            {budgetPeriod}
          </Text>
          <Text style={styles.statLabel}>Budget Period</Text>
        </View>

        <View style={styles.statDivider} />

        <View style={styles.statItem}>
          <Text
            style={styles.statNumber}
            numberOfLines={1}
            adjustsFontSizeToFit
            allowFontScaling
          >
            {filteredExpenses.length}
          </Text>
          <Text style={styles.statLabel}>Transactions</Text>
        </View>

        <View style={styles.statDivider} />

        <View style={styles.statItem}>
          <Text
            style={styles.statNumber}
            numberOfLines={1}
            adjustsFontSizeToFit
            allowFontScaling
          >
            {new Set(filteredExpenses.map(e => e.category)).size}
          </Text>
          <Text style={styles.statLabel}>Categories</Text>
        </View>
      </View>

          </View>

          {/* Wave Shape Bottom */}
          <View style={styles.waveContainer}>
            <View style={styles.wave} />
          </View>
        </LinearGradient>

        {/* Date Range Display (below header) */}
        {startDate && (
            <View style={styles.dateRangeCard}>
              <Ionicons name="calendar-outline" size={18} color="#475569" />
              <Text style={styles.dateRangeText}>
                {min.toLocaleDateString()} — {max.toLocaleDateString()}
              </Text>
            </View>
          )}
        {/* Period Dropdown Modal */}
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
                    if (period === 'Custom') {
                      setDropdownOpen(false);
                      setShowCustomPicker(true);
                      return;
                    }
                    if (Platform.OS === 'web') {
                      const confirmed = window.confirm(
                        `Changing the budget period to "${period}" will reset your current budget and expenses to 0. Are you sure?`
                      );
                      if (!confirmed) return;
                      handleChangePeriod(period);
                    } else {
                      Alert.alert(
                        'Change Budget Period',
                        `Changing the budget period to "${period}" will reset your current budget and expenses to 0. Are you sure you want to continue?`,
                        [
                          { text: 'Cancel', style: 'cancel' },
                          {
                            text: 'Yes, Change Period',
                            style: 'destructive',
                            onPress: () => handleChangePeriod(period),
                          },
                        ]
                      );
                    }
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

        {/* Custom Period Picker Modal */}
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
                      onChange={(event: any, selectedDate?: Date) => {
                        setShowStartPicker(false);
                        if (event.type === 'set' && selectedDate) {
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
                      onChange={(event: any, selectedDate?: Date) => {
                        setShowEndPicker(false);
                        if (event.type === 'set' && selectedDate) {
                          setEndDate(selectedDate);
                        }
                      }}
                    />
                  )}
                </>
              )}

              <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginTop: 10 }}>
                <TouchableOpacity
                  style={[styles.submitButton, { flex: 1, marginRight: 6 }]}
                  onPress={handleCustomPeriodConfirm}
                >
                  <Text style={styles.submitText}>Confirm</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.submitButton, { flex: 1, backgroundColor: '#aaa' }]}
                  onPress={() => setShowCustomPicker(false)}
                >
                  <Text style={styles.submitText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* History Button */}
        <HistoryRangeButton
          onPress={openHistoryModal}
          expanded={showHistoryModal}
        />

        {/* History Modal */}
        <Modal
          visible={showHistoryModal}
          animationType="fade"
          transparent
          onRequestClose={() => setShowHistoryModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              {HistorySection}
            </View>
          </View>
        </Modal>

       {/* Dynamic Overspend Warning (auto-hides when budget covers spending) */}
{(() => {
  const totalSpent = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
  const currentBudget = budgetAmount || 0; // use your budget state or prop
  const overspentAmount = totalSpent - currentBudget;

  if (overspentAmount > 0) {
    return (
      <View
        style={{
          backgroundColor: "#fee2e2",
          borderLeftColor: "#dc2626",
          borderLeftWidth: 6,
          borderRadius: 8,
          padding: 12,
          marginBottom: 8,
        }}
      >
        <Text style={{ color: "#dc2626", fontWeight: "700" }}>
          ⚠️ You’ve exceeded your budget by ₱
          {overspentAmount.toLocaleString(undefined, {
            minimumFractionDigits: 2,
          })}
        </Text>
      </View>
    );
  }
  return null;
})()}


        {/* Expense Chart */}
        <View style={styles.chartCard}>
          <ExpenseChart
            expenses={filteredExpenses}
            categoryColors={categoryColors}
            onRefresh={fetchExpenses}
          />
        </View>

        {/* Expense List */}
{Object.entries(groupExpensesByDate(filteredExpenses))
  .sort((a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime())
  .map(([date, items]) => (
    <View key={date}>
      <Text style={styles.dateHeader}>
        {new Date(date).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}
      </Text>
      {items.map(expense => {
        const color = categoryColors?.[expense.category] || "#CCCCCC";
        const overspentStyle = expense.overspent
          ? {
              backgroundColor: "#fee2e2",
              borderLeftColor: "#dc2626",
              borderLeftWidth: 6,
              borderRadius: 10,
            }
          : {
              borderLeftColor: color,
              borderLeftWidth: 6,
              borderRadius: 10,
              backgroundColor: "#ffffff",
            };

        return (
          <TouchableOpacity
            key={expense._id}
            style={[styles.expenseItem, overspentStyle]}
            onPress={() => {
              setSelectedExpense(expense);
              setShowExpenseDetailModal(true);
            }}
            activeOpacity={0.85}
          >
            <View style={styles.expenseLeft}>
              <View style={[styles.iconCircle, { backgroundColor: color + "22" }]}>
                {typeof getCategoryIconComponent(expense.category) === 'string' ? (
                  <Text>{getCategoryIconComponent(expense.category)}</Text>
                ) : (
                  getCategoryIconComponent(expense.category)
                )}
              </View>
              <View>
                <Text style={[styles.categoryText, expense.overspent && { color: "#b91c1c", fontWeight: "700" }]}>
                  {capitalize(expense.category)}
                </Text>
                <Text style={[styles.amountText, expense.overspent && { color: "#dc2626", fontWeight: "700" }]}>
                  ₱{expense.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </Text>
              </View>
            </View>

            <View style={{ alignItems: "flex-end" }}>
  {/* Show the transaction time only */}
  <Text style={styles.timeText}>
    {new Date(expense.date).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    })}
  </Text>

  {/* Show Overspent tag only if positive */}
  {expense.overspent && expense.overspent > 0 && (
    <View
      style={{
        backgroundColor: "#dc2626",
        borderRadius: 6,
        paddingHorizontal: 6,
        paddingVertical: 2,
        marginTop: 4,
      }}
    >
      <Text style={{ color: "#fff", fontSize: 11, fontWeight: "600" }}>
        Overspent
      </Text>
    </View>
  )}
</View>

          </TouchableOpacity>
        );
      })}
    </View>
  ))
}
      </ScrollView>

      {/* FAB for Add Expense */}
      <TouchableOpacity style={styles.fab} onPress={() => setShowAddExpenseModal(true)}>
       <LinearGradient
         colors={['#1f4b81ff', '#7fb1d6ff']}  
         style={styles.fabGradient}
       >
         <Ionicons name="add" size={28} color="#fff" />
       </LinearGradient>
     </TouchableOpacity>

     {/* Add Transaction Modal */}
<Modal
  visible={showAddExpenseModal}
  transparent
  animationType="fade"
  onRequestClose={() => setShowAddExpenseModal(false)}
>
  <Pressable style={styles.modalOverlay} onPress={() => setShowAddExpenseModal(false)}>
    <Pressable style={[styles.modalContainer, { alignItems: 'center', minWidth: 260 }]} onPress={() => { }}>
      <Text style={{ fontWeight: 'bold', fontSize: 18, marginBottom: 12 }}>Transaction</Text>

  {(Platform.OS === 'android' || Platform.OS === 'ios' || (Platform.OS === 'web' && width < 768)) && (
  <TouchableOpacity
    style={[styles.submitButton, { backgroundColor: '#2563EB', marginBottom: 10 }]}
    onPress={handleScanReceipt}
    disabled={isScanning}
  >
    <Text style={styles.submitText}>
      {isScanning ? 'Scanning...' : '📸 Scan Receipt'}
    </Text>
  </TouchableOpacity>
)}

      
      <TextInput
        placeholder="Amount"
        value={expenseAmount}
        onChangeText={setExpenseAmount}
        keyboardType="numeric"
        style={styles.input}
      />
      
      <TouchableOpacity
        style={[styles.input, { justifyContent: 'flex-start' }]}
        onPress={() => setCategoryModalVisible(true)}
      >
        <Text style={{ color: expenseCategory === 'Select Category' ? '#64748B' : '#1E293B' }}>
          {expenseCategory}
        </Text>
      </TouchableOpacity>
      
      <TextInput
        placeholder="Notes (optional)"
        value={expenseNotes}
        onChangeText={setExpenseNotes}
        style={styles.input}
      />
      
      {/* Enhanced Date Picker */}
      <View style={{ width: '100%', marginBottom: 8 }}>
        <Text style={{ fontSize: 14, color: '#64748B', marginBottom: 6, fontWeight: '600' }}>Date</Text>
        {Platform.OS === 'web' ? (
          <View style={{
            backgroundColor: '#F8FAFC',
            borderRadius: 10,
            borderWidth: 1,
            borderColor: '#E2E8F0',
            padding: 12,
            flexDirection: 'row',
            alignItems: 'center',
          }}>
            <Ionicons name="calendar-outline" size={18} color="#6366F1" style={{ marginRight: 8 }} />
            <input
              type="date"
              value={customDate ? formatDateInputValue(customDate) : ''}
              onChange={e => setCustomDate(e.target.value ? parseDateLocal(e.target.value) : null)}
              min={min ? formatDateInputValue(min) : undefined}
              max={max ? formatDateInputValue(max) : undefined}
              style={{
                border: 'none',
                backgroundColor: 'transparent',
                fontSize: '16px',
                fontFamily: 'inherit',
                color: '#050505ff',
                outline: 'none',
                flex: 1,
                cursor: 'pointer',
              }}
            />
          </View>
        ) : (
          <>
            <TouchableOpacity 
              onPress={() => setShowDatePicker(true)} 
              style={{
                backgroundColor: '#F8FAFC',
                borderRadius: 10,
                borderWidth: 1,
                borderColor: '#E2E8F0',
                padding: 14,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                <Ionicons name="calendar-outline" size={18} color="#6366F1" style={{ marginRight: 10 }} />
                <Text style={{ 
                  fontSize: 14, 
                  color: customDate ? '#1E293B' : '#94A3B8',
                  fontWeight: customDate ? '500' : '400'
                }}>
                  {customDate ? customDate.toLocaleDateString('en-US', { 
                    weekday: 'short', 
                    year: 'numeric', 
                    month: 'short', 
                    day: 'numeric' 
                  }) : 'Select Date'}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
            </TouchableOpacity>
            
            {showDatePicker && (
              <DateTimePicker
                value={customDate || new Date()}
                mode="date"
                display="default"
                minimumDate={min}
                maximumDate={new Date(max.getTime() - 86400000)}
                onChange={(event: any, selectedDate?: Date) => {
                  setShowDatePicker(false);
                  if (event.type === 'set' && selectedDate) setCustomDate(selectedDate);
                }}
              />
            )}
          </>
        )}
      </View>
      
      <TouchableOpacity
        style={[styles.submitButton, styles.primaryBtn, { marginBottom: 6 }]}
        onPress={handleAddExpense}
        disabled={isLoading}
      >
        <Text style={styles.submitText}>
          {isLoading ? 'Saving...' : 'Save'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.submitButton, styles.outlineBtn]}
        onPress={() => setShowAddExpenseModal(false)}
      >
        <Text style={styles.outlineText}>Cancel</Text>
      </TouchableOpacity>
    </Pressable>
    </Pressable>
    </Modal>

    {/* 🧠 OCR Confirmation Modal */}
<Modal visible={showOcrModal} transparent animationType="fade">
  <View style={styles.modalOverlay}>
    <View style={[styles.modalContainer, { width: '85%', padding: 20 }]}>
      <Text style={{ fontSize: 18, fontWeight: "700", marginBottom: 10 }}>
        📸 Confirm Receipt Details
      </Text>

      <Text style={{ fontSize: 14, color: "#64748B", marginBottom: 8 }}>
        Adjust if needed before saving.
      </Text>

      {/* Editable Detected Amount */}
      <View style={{ marginBottom: 10 }}>
        <Text style={{ fontSize: 14, color: "#475569", marginBottom: 4 }}>Amount (₱)</Text>
        <TextInput
          value={ocrDetectedAmount}
          onChangeText={setOcrDetectedAmount}
          keyboardType="numeric"
          style={{
            borderWidth: 1,
            borderColor: "#CBD5E1",
            borderRadius: 10,
            padding: 10,
            fontSize: 16,
            backgroundColor: "#F8FAFC",
          }}
        />
      </View>

      {/* Editable Detected Category */}
      <View style={{ marginBottom: 10 }}>
        <Text style={{ fontSize: 14, color: "#475569", marginBottom: 4 }}>Category</Text>
        <TextInput
          value={ocrDetectedCategory}
          onChangeText={setOcrDetectedCategory}
          style={{
            borderWidth: 1,
            borderColor: "#CBD5E1",
            borderRadius: 10,
            padding: 10,
            fontSize: 16,
            backgroundColor: "#F8FAFC",
          }}
        />
      </View>

      {/* OCR Raw Text Viewer */}
      <Text style={{ fontSize: 14, color: "#475569", marginBottom: 4 }}>Extracted Text:</Text>
      <ScrollView
        style={{
          maxHeight: 120,
          borderWidth: 1,
          borderColor: "#E2E8F0",
          borderRadius: 10,
          padding: 10,
          backgroundColor: "#F1F5F9",
          marginBottom: 12,
        }}
      >
        <Text style={{ color: "#334155", fontSize: 13 }}>{ocrRawText}</Text>
      </ScrollView>

      {/* Confirm / Cancel Buttons */}
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <TouchableOpacity
          style={[styles.submitButton, { flex: 1, marginRight: 6, backgroundColor: "#2563EB" }]}
          onPress={() => {
            setExpenseAmount(ocrDetectedAmount);
            setExpenseCategory(ocrDetectedCategory);
            setShowOcrModal(false);
            Alert.alert("✅ Scan Confirmed", "Receipt data applied successfully!");
          }}
        >
          <Text style={styles.submitText}>Confirm</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.submitButton, { flex: 1, backgroundColor: "#aaa" }]}
          onPress={() => setShowOcrModal(false)}
        >
          <Text style={styles.submitText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </View>
  </View>
</Modal>

          {/* Category Picker Modal */}
<Modal visible={categoryModalVisible} transparent animationType="fade">
  <Pressable style={styles.modalOverlay} onPress={() => setCategoryModalVisible(false)}>
    <View style={[styles.modalContainer, { gap: 0, maxHeight: '70%' }]}>
      {/* Header */}
      <View style={{
        paddingVertical: 16,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#E2E8F0',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <Text style={{ fontSize: 18, fontWeight: '700', color: '#1E293B' }}>
          Select Category
        </Text>
        <TouchableOpacity onPress={() => setCategoryModalVisible(false)}>
          <Ionicons name="close" size={24} color="#64748B" />
        </TouchableOpacity>
      </View>

      <ScrollView style={{ maxHeight: 400 }}>
        {/* Main Categories */}
        {['Food', 'Transport', 'Bills', 'School', 'Shopping'].map((cat, idx) => (
          <TouchableOpacity
            key={cat}
            onPress={() => {
              setExpenseCategory(cat);
              setCategoryModalVisible(false);
            }}
            style={{
              padding: 14,
              paddingHorizontal: 16,
              borderBottomWidth: 1,
              borderBottomColor: '#F1F5F9',
              minWidth: 280,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: expenseCategory === cat ? '#F0F9FF' : 'transparent',
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: getCategoryColor(cat),
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: 12,
              }}>
                <Ionicons 
                  name={getCategoryIcon(cat)} 
                  size={18} 
                  color="#FFFFFF" 
                />
              </View>
              <Text style={{ 
                fontSize: 15, 
                color: '#1E293B',
                fontWeight: expenseCategory === cat ? '600' : '400'
              }}>
                {cat}
              </Text>
            </View>
            {expenseCategory === cat && (
              <Ionicons name="checkmark" size={20} color="#0EA5E9" />
            )}
          </TouchableOpacity>
        ))}

        {/* Others Section */}
        <TouchableOpacity
          style={{
            padding: 14,
            paddingHorizontal: 16,
            borderBottomWidth: 1,
            borderBottomColor: '#E2E8F0',
            flexDirection: "row",
            alignItems: "center",
            justifyContent: 'space-between',
            backgroundColor: '#F8FAFC',
          }}
          onPress={() => setOthersExpanded(!othersExpanded)}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: '#94A3B8',
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: 12,
            }}>
              <Ionicons name="grid-outline" size={18} color="#FFFFFF" />
            </View>
            <Text style={{ fontSize: 15, fontWeight: "600", color: '#1E293B' }}>
              Others
            </Text>
          </View>
          <Ionicons
            name={othersExpanded ? "chevron-up" : "chevron-down"}
            size={20}
            color="#64748B"
          />
        </TouchableOpacity>

        {/* Others Expanded */}
        {othersExpanded && (
          <View style={{ backgroundColor: '#FAFAFA' }}>
            {/* Add Subcategory */}
            <TouchableOpacity
              style={{
                padding: 12,
                paddingLeft: 64,
                flexDirection: "row",
                alignItems: "center",
                borderBottomWidth: 1,
                borderBottomColor: '#F1F5F9',
              }}
              onPress={() => {
                setShowCustomCategoryInput(true);
                setCategoryModalVisible(false);
              }}
            >
              <View style={{
                width: 28,
                height: 28,
                borderRadius: 14,
                backgroundColor: '#EEF2FF',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: 10,
              }}>
                <Ionicons name="add" size={16} color="#6366F1" />
              </View>
              <Text style={{ fontSize: 14, color: "#6366F1", fontWeight: '600' }}>
                Add Subcategory
              </Text>
            </TouchableOpacity>

            {/* Custom Categories */}
            {customCategories.map((cat) => (
              <TouchableOpacity
                key={cat}
                onPress={() => {
                  setExpenseCategory(cat);
                  setCategoryModalVisible(false);
                }}
                style={{
                  padding: 12,
                  paddingLeft: 64,
                  borderBottomWidth: 1,
                  borderBottomColor: "#F1F5F9",
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  backgroundColor: expenseCategory === cat ? '#F0F9FF' : 'transparent',
                }}
              >
                <Text style={{ 
                  fontSize: 14, 
                  color: '#475569',
                  fontWeight: expenseCategory === cat ? '600' : '400'
                }}>
                  {cat}
                </Text>
                {expenseCategory === cat && (
                  <Ionicons name="checkmark" size={18} color="#0EA5E9" />
                )}
              </TouchableOpacity>
            ))}

            {/* Other Subcategories */}
            {otherSubcategories.map((sub) => (
              <TouchableOpacity
                key={sub}
                onPress={() => {
                  setExpenseCategory(sub);
                  setCategoryModalVisible(false);
                }}
                style={{
                  padding: 12,
                  paddingLeft: 64,
                  borderBottomWidth: 1,
                  borderBottomColor: "#F1F5F9",
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  backgroundColor: expenseCategory === sub ? '#F0F9FF' : 'transparent',
                }}
              >
                <Text style={{ 
                  fontSize: 14, 
                  color: '#475569',
                  fontWeight: expenseCategory === sub ? '600' : '400'
                }}>
                  {sub}
                </Text>
                {expenseCategory === sub && (
                  <Ionicons name="checkmark" size={18} color="#0EA5E9" />
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  </Pressable>
</Modal>

      <Modal visible={showCustomCategoryInput} transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={() => setShowCustomCategoryInput(false)}>
          <Pressable style={[styles.modalContainer, { gap: 8 }]} onPress={() => { }}>
            <Text style={{ fontWeight: 'bold', fontSize: 16, marginBottom: 6 }}>Enter New Category</Text>
            <TextInput
              placeholder="e.g. Pet Supplies"
              value={customCategoryInput}
              onChangeText={setCustomCategoryInput}
              style={styles.input}
            />
            <TouchableOpacity
              style={[styles.submitButton, { marginBottom: 6, backgroundColor: '#2563EB' }]}
              onPress={async () => {
                const trimmed = customCategoryInput.trim();
                if (trimmed.length < 2) {
                  alert('Please enter a valid category name.');
                  return;
                }
                if (
                  ['Food', 'Transport', 'Bills', 'School', 'Shopping', 'Others', ...customCategories]
                    .map(x => x.toLowerCase())
                    .includes(trimmed.toLowerCase())
                ) {
                  alert('That category already exists.');
                  return;
                }
                const updated = [...customCategories, trimmed];
                await saveCustomCategories(updated);

                const usedColors = Object.values(categoryColors);
                const nextColor =
                  colorPalette.find(c => !usedColors.includes(c)) ||
                  colorPalette[updated.length % colorPalette.length];

                const newColors = { ...categoryColors, [trimmed]: nextColor };
                await saveCategoryColors(newColors);

                setExpenseCategory(trimmed);
                setCustomCategoryInput('');
                setShowCustomCategoryInput(false);
              }}
            >
              <Text style={styles.submitText}>Add</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.submitButton, { backgroundColor: '#aaa' }]}
              onPress={() => setShowCustomCategoryInput(false)}
            >
              <Text style={styles.submitText}>Cancel</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Expense Detail Modal */}
<Modal
  visible={showExpenseDetailModal}
  transparent
  animationType="slide"
  onRequestClose={() => setShowExpenseDetailModal(false)}
>
  <Pressable
    style={styles.modalOverlay}
    onPress={() => setShowExpenseDetailModal(false)}
  >
    <View style={[styles.modalContainer, { alignItems: "stretch" }]}>
      {selectedExpense && (
        <>
          <Text
            style={{
              fontWeight: "bold",
              fontSize: 20,
              marginBottom: 14,
              textAlign: "center",
              color: "#1E293B",
            }}
          >
            Expense Details
          </Text>

          <View
            style={{
              backgroundColor: "#F9FAFB",
              borderRadius: 16,
              padding: 16,
              marginBottom: 16,
              borderWidth: 1,
              borderColor: "#E5E7EB",
            }}
          >
            <View
              style={{ flexDirection: "row", alignItems: "center", marginBottom: 10 }}
            >
              <MaterialCommunityIcons name="currency-php" size={20} color="#2563EB" />
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: "600",
                  marginLeft: 8,
                  color: selectedExpense.overspent ? "#dc2626" : "#1E293B",
                }}
              >
                {selectedExpense.amount.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                })}
              </Text>
            </View>

            <View
              style={{ flexDirection: "row", alignItems: "center", marginBottom: 10 }}
            >
              {getCategoryIconComponent(selectedExpense.category)}
              <Text
                style={{
                  fontSize: 15,
                  marginLeft: 8,
                  color: selectedExpense.overspent ? "#b91c1c" : "#1E293B",
                  fontWeight: selectedExpense.overspent ? "600" : "400",
                }}
              >
                {capitalize(selectedExpense.category)}
              </Text>
            </View>

            {selectedExpense.overspent && (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  backgroundColor: "#fee2e2",
                  paddingVertical: 6,
                  paddingHorizontal: 10,
                  borderRadius: 8,
                  marginBottom: 10,
                }}
              >
                <Ionicons name="warning-outline" size={18} color="#b91c1c" />
                <Text
                  style={{
                    color: "#b91c1c",
                    marginLeft: 8,
                    fontWeight: "600",
                    fontSize: 14,
                  }}
                >
                  Overspent this period by ₱{selectedExpense.overspent.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                  })}
                </Text>
              </View>
            )}

            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Ionicons name="calendar-outline" size={20} color="#2563EB" />
              <Text style={{ fontSize: 15, marginLeft: 8 }}>
                {new Date(selectedExpense.date).toLocaleDateString()}
              </Text>
            </View>

            {selectedExpense.notes && (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginTop: 10,
                }}
              >
                <Ionicons name="document-text-outline" size={20} color="#2563EB" />
                <Text
                  style={{
                    fontSize: 15,
                    marginLeft: 8,
                    color: "#374151",
                  }}
                >
                  {selectedExpense.notes}
                </Text>
              </View>
            )}
          </View>

          <TouchableOpacity
            style={[styles.submitButton, styles.primaryBtn]}
            onPress={() => setShowExpenseDetailModal(false)}
          >
            <Text style={styles.submitText}>Close</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  </Pressable>
</Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#1f4b81ff',
  },
  container: {
    flex: 1,
    backgroundColor: '#f3f6fa',
  },
  scrollContent: {
    paddingBottom: 100,
  },
  
  // Header Styles
  headerContainer: {
    paddingBottom: 40,
    position: 'relative',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    marginTop: Platform.OS === 'ios' ? 20 : 60,
    marginBottom: 8,
  },
  headerRowWeb: {
    marginTop: 40,
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
  mainHeading: {
    fontSize: 28,
    fontWeight: '800',
    color: '#ffffff',
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  subHeading: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 24,
    marginBottom: 20,
  },
  headerContent: {
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 20,
    paddingVertical: 7,
    paddingHorizontal: 15,
    flexWrap: 'wrap', 

  },
  statItem: {
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 1, // allow content to shrink if needed
  paddingHorizontal: 6,
  minWidth: 'auto', // ensures content determines width
},

statNumber: {
  fontSize: 15,
  fontWeight: '800',
  color: '#ffffff',
  marginBottom: 4,
  textAlign: 'center',
  flexShrink: 1,
  flexWrap: 'nowrap',
},
 statLabel: {
  fontSize: 12,
  color: '#dcdcdc',
  textAlign: 'center',
  flexShrink: 1,
},

statDivider: {
  width: 1,
  height: 40,
  backgroundColor: '#ccc',
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
    backgroundColor: '#f3f6fa',
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
  },
  dateRangeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginHorizontal: 24,
    marginTop: -20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  dateRangeText: {
    fontSize: 14,
    color: '#475569',
    fontWeight: '600',
    marginLeft: 8,
  },

  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },

fab: {
  position: "absolute",
  bottom: 30,
  left: "50%",             // center horizontally
  transform: [{ translateX: -35 }], // half of the button width (adjust if needed)
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

  heading: {
    fontSize: 30, fontWeight: 'bold',
    color: '#21223D', marginBottom: 8, letterSpacing: 0.6,
  },
expenseItem: {
  backgroundColor: '#fff',
  padding: 8,
  marginBottom: 8,
  marginLeft:4,
  marginRight:4,
  borderRadius: 16,
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between', // keeps left group vs right group apart
  elevation: 3,
  shadowColor: '#000',
  shadowOpacity: 0.1,
  shadowRadius: 6,
  borderLeftWidth: 6, // dynamic color
},


expenseLeft: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 8, // space between icon, category, and amount
},


categoryText: {
  fontWeight: '600',
  marginRight: 6,
},
amountText: {
  fontWeight: '500',
  color: '#444',
},
timeText: {
  color: '#666',
  fontSize: 12,
  right: 4,
},

backBtn: {
  padding: 8,
  borderRadius: 12,
  backgroundColor: '#EEF2FB',
  alignSelf: 'flex-start',
  marginBottom: 12,
  top:20,
},

input: {
  width: "100%",
  borderRadius: 14,
  borderWidth: 1.2,
  borderColor: "#E2E8F0",
  paddingVertical: 13,
  paddingHorizontal: 15,
  fontSize: 16,
  backgroundColor: "#F8FAFC",
  marginBottom: 14,
},
modalTitle: {
  fontSize: 20,
  fontWeight: "700",
  color: "#0F172A",
  marginBottom: 14,
},
submitButton: {
  borderRadius: 14,
  paddingVertical: 14,
  paddingHorizontal: 18,
  alignItems: "center",
  minWidth: "100%",
  marginTop: 10,
  elevation: 2,
},
primaryBtn: {
  backgroundColor: "#2563EB",
  shadowColor: "#2563EB",
  shadowOpacity: 0.3,
  shadowRadius: 8,
  shadowOffset: { width: 0, height: 3 },
},

outlineBtn: {
  borderWidth: 1.5,
  borderColor: "#2563EB",
  backgroundColor: "#fff",
},
submitText: {
  fontWeight: "600",
  fontSize: 14,
  color: "#fff",
},

outlineText: {
  color: "#2563EB",
  fontWeight: "600",
},

sectionTitle: {
  alignSelf: "flex-start",
  fontSize: 15,
  fontWeight: "600",
  color: "#334155",
  marginBottom: 6,
},
dateInputGroup: {
  width: "100%",
  marginBottom: 10,
},
historyExpenseList: {
  marginTop: 14,
  width: "100%",
  maxHeight: 380,
  backgroundColor: "#F9FAFB",
  borderRadius: 18,
  padding: 12,
},
 
  modalOverlay: {
  flex: 1,
  justifyContent: "center",
  alignItems: "center",
  backgroundColor: "rgba(15, 23, 42, 0.25)", // more translucent backdrop
  paddingHorizontal: 16,
  backdropFilter: Platform.OS === "web" ? "blur(6px)" : undefined,
},

modalContainer: {
  backgroundColor: "#fff",
  borderRadius: 26,
  padding: 26,
  width: "90%",
  maxWidth: 420,
  alignItems: "center",
  elevation: 10,
  shadowColor: "#000",
  shadowOpacity: 0.15,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 5 },
},

 dropdownContainer: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  marginBottom: 8,
  marginTop: 2,
  flexWrap: isMobile ? 'wrap' : 'nowrap',   // ✅ allow wrapping only on mobile
  rowGap: isMobile ? 4 : 0,                 // ✅ add spacing between lines
},


dropdownLabel: {
  fontSize: isMobile ? 14 : 16,
  fontWeight: 'bold',
  color: '#2563EB',
  marginRight: 8,
  letterSpacing: 0.2,
  textAlign: isMobile ? 'center' : 'left',  // ✅ center on mobile
  width: isMobile ? '100%' : 'auto',        // ✅ pushes label above on narrow screens
},

dropdownSelected: {
  borderRadius: 9,
  borderWidth: 1,
  borderColor: '#e5e7eb',
  paddingVertical: isMobile ? 6 : 8,
  paddingHorizontal: isMobile ? 16 : 22,
  backgroundColor: '#eef2fb',
  marginTop: isMobile ? 4 : 0,
},
  dropdownText: {
    fontSize: 16, color: '#22223B', fontWeight: 'bold',
  },


  dropdownModal: {
    backgroundColor: '#fff', borderRadius: 18,
    padding: 13, marginTop: 110, alignSelf: 'center', minWidth: 220,
    shadowColor: '#000', shadowOpacity: 0.13, shadowRadius: 14, elevation: 6,
  },


  dropdownItem: {
    paddingVertical: 13, paddingHorizontal: 22,
  },


  dropdownItemSelectedText: {
    color: '#2563EB', fontWeight: 'bold',
  },


  dateLabel: {
    fontSize: 14, color: '#64748B', marginBottom: 3,
    marginTop: 4,
  },


  historyCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#eff6ff',
    borderRadius: 20, paddingVertical: 5, paddingHorizontal: 22,
    marginBottom: 12, marginTop: -5,
    marginRight: 4, marginLeft: 4,
    shadowColor: '#2563EB', shadowOpacity: 0.10, shadowRadius: 7, elevation: 3,
    justifyContent: 'space-between',
    borderWidth: 1.5, borderColor: '#bfdbfe',  
  },


  historyCardLeft: {
    flexDirection: 'row', alignItems: 'center', flex: 1,
  },


  historyLabel: {
    fontWeight: 'bold', fontSize: 14, color: '#22223B',
    letterSpacing: 0.12,
  },


  modalContent: {
    width: '100%', alignItems: 'center',
  },


  dateHeader: {
    fontSize: 14, fontWeight: 'bold', marginBottom: 9, marginTop: 5,
    color: '#374151', letterSpacing: 0.2, paddingLeft: 8,
  },

  amount: {
    fontWeight: 'bold', fontSize: 16.5, color: '#22223B', marginLeft: 8,
  },

chartCard: {
  backgroundColor: '#fff',
  padding: 20,
  borderRadius: 20,
  marginBottom: 18,
  marginRight: 5,
  marginLeft: 5,
  elevation: 4,
  shadowColor: '#000',
  shadowOpacity: 0.08,
  shadowRadius: 8,
  shadowOffset: { width: 0, height: 3 },
},


  
});