
import { LogBox } from 'react-native';
// Temporarily ignore the text rendering warning
LogBox.ignoreLogs(['Text strings must be rendered within a <Text> component']);
import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, Platform, Modal, Pressable,
  TextInput, Dimensions, Alert, StatusBar
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
import { Animated } from "react-native";
import { LayoutAnimation, UIManager } from "react-native";
import NetInfo from "@react-native-community/netinfo";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import * as Speech from "expo-speech";


// ✅ Use native browser SpeechRecognition for web
let SpeechRecognition: any = null;

if (Platform.OS === "web" && typeof window !== "undefined") {
  SpeechRecognition =
    (window as any).SpeechRecognition ||
    (window as any).webkitSpeechRecognition ||
    null;

  if (SpeechRecognition) {
    console.log("✅ Using Web SpeechRecognition API");
  } else {
    console.log("⚠️ Web SpeechRecognition not available on this browser");
  }
}

import { OCR_API_KEY } from "@env";
console.log("🧩 OCR API Key loaded:", OCR_API_KEY ? "✅ Yes" : "❌ Missing");



// Enable LayoutAnimation for Android
if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}


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

// 🎧 Unlock audio for Speech.speak() on first tap
useEffect(() => {
  if (Platform.OS === "web") {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();

    const unlock = () => {
      if (ctx.state === "suspended") {
        ctx.resume().then(() => {
          console.log("🔓 Audio context unlocked");
          Speech.speak("Audio is now active.", {
            language: "en-US",
            rate: 1.0,
          });
        });
      }
      window.removeEventListener("click", unlock);
    };

    window.addEventListener("click", unlock);
  }
}, []);

const [isListening, setIsListening] = useState(false);
const [assistantMood, setAssistantMood] = useState("neutral"); 

const [voiceTranscript, setVoiceTranscript] = useState("");

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
const [showVoiceFormatModal, setShowVoiceFormatModal] = useState(false);
const [showScanGuideModal, setShowScanGuideModal] = useState(false);

const [showPlannedModal, setShowPlannedModal] = useState(false);
const [plannedExpenses, setPlannedExpenses] = useState<any[]>([]);
const [plannedExpanded, setPlannedExpanded] = useState(false);
const [newPlannedName, setNewPlannedName] = useState('');
const [newPlannedAmount, setNewPlannedAmount] = useState('');
const [newPlannedCategory, setNewPlannedCategory] = useState('Select Category');
const [newPlannedRecurring, setNewPlannedRecurring] = useState(false);
const [searchingMarketplace, setSearchingMarketplace] = useState(false);
const [showDealsModal, setShowDealsModal] = useState(false);
const [selectedPlannedDeals, setSelectedPlannedDeals] = useState<any[]>([]);
const [selectedPlannedItem, setSelectedPlannedItem] = useState<any>(null);

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
const [historyStartDate, setHistoryStartDate] = useState<Date | null>(null);
const [historyEndDate, setHistoryEndDate] = useState<Date | null>(null);
const [ocrDetectedNotes, setOcrDetectedNotes] = useState("");
const [ocrDetectedDate, setOcrDetectedDate] = useState(new Date());
const [showOcrDatePicker, setShowOcrDatePicker] = useState(false);

const [isScanning, setIsScanning] = useState(false);
const [showTranscript, setShowTranscript] = useState(false);
// 💡 state at the top of your component
const [showWarning, setShowWarning] = useState(false);
const warningAnim = useRef(new Animated.Value(0)).current; // opacity & slide
const [showVoiceTip, setShowVoiceTip] = useState(false);
const [hasShownTip, setHasShownTip] = useState(false);
const [categoryCallerModal, setCategoryCallerModal] = useState<'add' | 'planned' | null>(null);
// 🔍 OCR confirmation states
const [showOcrModal, setShowOcrModal] = useState(false);
const [ocrRawText, setOcrRawText] = useState("");
const [ocrDetectedAmount, setOcrDetectedAmount] = useState("");
const [ocrDetectedCategory, setOcrDetectedCategory] = useState("Others");


const [hasSpokenHint, setHasSpokenHint] = useState(false);
const [currentUserId, setCurrentUserId] = useState<string | null>(null);

// ✏️ Edit/Delete expense states
const [isEditMode, setIsEditMode] = useState(false);
const [editAmount, setEditAmount] = useState("");
const [editCategory, setEditCategory] = useState("");
const [editNotes, setEditNotes] = useState("");
const [editDate, setEditDate] = useState<Date | null>(null);
const [showEditDatePicker, setShowEditDatePicker] = useState(false);

useEffect(() => {
  if (Platform.OS === "web") {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const unlock = () => {
      if (ctx.state === "suspended") ctx.resume();
      window.removeEventListener("click", unlock);
    };
    window.addEventListener("click", unlock);
  }
}, []);



useEffect(() => {
  // don't speak automatically — wait for user action
}, []);

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
  type ParsedVoiceExpense = {
  amount: number;
  category: string;
  notes?: string;
  dateISO?: string; // optional 'today'/'yesterday' support
};

// Update your CATEGORY_ALIASES to include Gaming and other subcategories
const CATEGORY_ALIASES: Record<string, string[]> = {
  Food: ["food", "meal", "meals", "snack", "snacks", "coffee", "drink", "drinks", "groceries", "grocery", "restaurant"],
  Transport: ["transport", "transportation", "fare", "taxi", "grab", "uber", "jeep", "bus", "tricycle", "fuel", "gas", "parking"],
  Bills: ["bills", "bill", "electric", "electricity", "water", "internet", "wifi", "mobile", "phone", "load", "rent", "utilities"],
  School: ["school", "tuition", "books", "book", "exam", "project", "modules", "notebook", "uniform"],
  Shopping: ["shopping", "shop", "store", "mall", "clothes", "clothing", "shoes", "gadget", "grocery", "watsons", "lazada", "shopee"],
  Savings: ["savings", "save", "deposit", "bank", "atm", "withdrawal"],
  Others: ["others", "other", "misc", "miscellaneous"],
  // ✅ ADD: Dynamic subcategories (Gaming, Makeup, etc.)
  "Others - Gaming": ["gaming", "game", "games", "playstation", "xbox", "steam"],
  "Others - Makeup": ["makeup", "make up", "cosmetics", "lipstick", "foundation"],
  "Others - Entertainment": ["entertainment", "movie", "movies", "concert", "netflix"],
};

// quick reverse-lookup for category detection
const CATEGORY_LOOKUP: Record<string, string> = Object.entries(CATEGORY_ALIASES)
  .reduce((acc, [canon, list]) => {
    list.forEach(a => acc[a] = canon);
    acc[canon.toLowerCase()] = canon;
    return acc;
  }, {} as Record<string, string>);

// normalize “₱1,200.50” / “1.200,50” / “1200” / “1200.5”
function extractAmount(text: string): number | null {
  // prefer last “moneyish” token (often the total)
  const moneyish = text
    .match(/(?:₱|\$)?\s*\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{1,2})?|\b\d+(?:\.\d{1,2})?\b/g);
  if (!moneyish || moneyish.length === 0) return null;

  const raw = moneyish[moneyish.length - 1]
    .replace(/[₱$\s]/g, "")
    // if both separators appear, assume comma is thousands, dot is decimal (1,234.56)
    .replace(/(\d)[,](?=\d{3}\b)/g, "$1") // drop thousands commas
    .replace(/(\d)\.(?=\d{3}\b)/g, "$1") // drop thousands dots
    .replace(/,/, "."); // remaining comma → decimal

  const num = parseFloat(raw);
  return Number.isFinite(num) ? num : null;
}

function extractCategory(text: string): string {
  // look word by word so “for transport”, “to bills”, etc. are caught
  const words = text.toLowerCase().split(/[^a-z]+/).filter(Boolean);
  for (const w of words) {
    if (CATEGORY_LOOKUP[w]) return CATEGORY_LOOKUP[w];
  }
  return "Others";
}

function extractNotes(text: string): string | undefined {
  // note … / with note … / comment …
  const m = text.match(/\b(?:note|notes|comment|memo)\s+(.+)/i);
  return m ? m[1].trim() : undefined;
}

function extractDateKeyword(text: string): string | undefined {
  if (/\byesterday\b/i.test(text)) {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString();
  }
  if (/\btoday\b/i.test(text)) {
    const d = new Date();
    return d.toISOString();
  }
  return undefined;
}

// Split multiple commands: “add 150 food and 60 transport” / “120 coffee, 80 taxi”
function splitIntoClauses(text: string): string[] {
  const cleaned = text.replace(/\s+/g, " ").trim();
  // split on ", " or " and " **only** if there is a number after the split
  const parts = cleaned.split(/\s*(?:,| and )\s+/i)
    .map(s => s.trim())
    .filter(Boolean);
  return parts.length > 1 ? parts : [cleaned];
}

// 🧹 Helper for manual stop from button or error
if (Platform.OS === "web") {
  (window as any).stopRecognition = () => {
    try {
      if ((window as any)._recognition) {
        (window as any)._recognition.stop();
        console.log("🛑 Recognition stopped globally");
      }
    } catch (err) {
      console.warn("⚠️ Failed to stop recognition:", err);
    }
  };
}

 // 🎤 Warm up speech synthesis early (avoids lag)
  useEffect(() => {
    Speech.speak("", { language: "en-US" }); // pre-initialize speech engine
  }, []);




function handleVoiceConversation(spokenText) {
  const lower = spokenText.toLowerCase().trim();

  // 🎯 Detect 'add' command first — let parser handle it
if (/^add\s+\d+/i.test(lower)) {
  console.log("💬 Detected expense command — skipping chat handling");
  return false;
}

if (/^(add|record|save|log)\s+\d+/i.test(lower)) {
  return false;
}

if (/(^expense guide$|show guide|voice guide)/i.test(lower)) {
  setShowVoiceFormatModal(true);
  Speech.speak("Sure! I'm showing you the voice command guide...");
  return true;
}

if (/(scan guide|receipt guide|how to scan|scanning guide|show scan guide)/i.test(lower)) {
  setShowScanGuideModal(true);
  Speech.speak("Got it! Here's how to scan receipts using your camera or photo library.");
  return true;
}

  // 👋 Greetings & casual intros
  if (/(hi|hello|hey|good (morning|afternoon|evening))/i.test(lower)) {
    Speech.speak(
      "Hey there! I'm really happy to see you again. You can add an expense by saying something like, add one hundred food note burger. Or if you just want to chat, say hi anytime.",
      { language: "en-US", rate: 1.2 }
    );
    return true;
  }



  // 💰 Budget and spending questions
  if (/(budget|how much|spent|left|remaining|money left)/i.test(lower)) {
    Speech.speak(
      "You can check your remaining budget in the Budget Overview section. It updates automatically whenever you add a new expense.",
      { language: "en-US", rate: 1.2 }
    );
    return true;
  }

  // 💔 Self-worth and validation
  if (/(am i (not )?enough|not good enough|why am i not enough|am i worthy)/i.test(lower)) {
    setAssistantMood("comforting");
    Speech.speak(
      "You are absolutely enough. You don't need to prove your worth to anyone. Your value isn't determined by what others think or see.",
      { language: "en-US", rate: 1.1 }
    );
    setTimeout(() => {
      Speech.speak("You're worthy of love, respect, and all the good things life has to offer. Never forget that.", {
        language: "en-US",
        rate: 1.1,
      });
    }, 3500);
    return true;
  }

  // 🧠 Emotional or personal comfort
  if (/(someone doesn.?t like me|nobody likes me|i'm sad|im sad|i feel lonely|feeling down|i feel bad|i'm upset)/i.test(lower)) {
    setAssistantMood("comforting");
    Speech.speak(
      "Hey, I'm really sorry you feel that way. You deserve kindness and respect. Not everyone will understand your value — but that doesn't mean you're not worth it.",
      { language: "en-US", rate: 1.0 }
    );
    setTimeout(() => {
      Speech.speak("Take a deep breath, okay? You're doing your best, and I'm proud of you.", {
        language: "en-US",
        rate: 1.0,
      });
    }, 3500);
    return true;
  }

  if (/(tired|stressed|anxious|worried|burned out|overwhelmed)/i.test(lower)) {
    setAssistantMood("comforting");
    Speech.speak(
      "I know things can feel heavy sometimes. You're doing better than you think — maybe take a short break and have some water.",
      { language: "en-US", rate: 1.0 }
    );
    return true;
  }

  // 🎓 School/work stress
  if (/(exam|test|quiz|midterm|finals|deadline|project due|so much work)/i.test(lower)) {
    setAssistantMood("comforting");
    Speech.speak(
      "I know it's tough right now, but you've handled hard things before. Take it one step at a time, and don't forget to breathe.",
      { language: "en-US", rate: 1.0 }
    );
    return true;
  }

  // 😴 Sleep & Rest
  if (/(can't sleep|insomnia|tired but can't sleep|wide awake)/i.test(lower)) {
    Speech.speak(
      "Having trouble sleeping? Try putting your phone away for a bit and taking some deep breaths. Your mind needs rest too.",
      { language: "en-US", rate: 1.0 }
    );
    return true;
  }

  if (/(all nighter|pulling an all nighter|staying up|not sleeping)/i.test(lower)) {
    Speech.speak(
      "I get it, sometimes we have to stay up. But please try to rest when you can — your health matters more than anything.",
      { language: "en-US", rate: 1.1 }
    );
    return true;
  }

  // 🍔 Food & Eating
  if (/(hungry|starving|what should i eat|food recommendation|craving)/i.test(lower)) {
    Speech.speak(
      "Sounds like it's time for a snack! Whatever you choose, maybe track it as a food expense so you can see your eating patterns.",
      { language: "en-US", rate: 1.1 }
    );
    return true;
  }

  if (/(haven't eaten|didn't eat|skip.*meal|no breakfast|no lunch)/i.test(lower)) {
    setAssistantMood("concerned");
    Speech.speak(
      "Hey, please don't skip meals. Your body and brain need fuel. Grab something small if you can, okay?",
      { language: "en-US", rate: 1.1 }
    );
    return true;
  }

  // 💸 Money Concerns
  if (/(broke|no money|out of money|can't afford|too expensive)/i.test(lower)) {
    Speech.speak(
      "Money can be really stressful. Let's look at your expenses together and see where we can make adjustments. You've got this.",
      { language: "en-US", rate: 1.1 }
    );
    return true;
  }

  if (/(payday|got paid|allowance|salary)/i.test(lower)) {
    setAssistantMood("happy");
    Speech.speak(
      "Nice! Fresh money coming in. Maybe now's a good time to set aside some savings before spending?",
      { language: "en-US", rate: 1.1 }
    );
    return true;
  }

  // 👥 Relationships
  if (/(miss you|i miss|feeling alone|lonely)/i.test(lower)) {
    setAssistantMood("comforting");
    Speech.speak(
      "I'm here with you. And remember — it's okay to reach out to people you care about. They probably miss you too.",
      { language: "en-US", rate: 1.1 }
    );
    return true;
  }

  if (/(had a fight|argument|we fought|got into a fight)/i.test(lower)) {
    Speech.speak(
      "Arguments happen. Give yourself some time to cool down, then maybe try talking it out when you're both ready.",
      { language: "en-US", rate: 1.1 }
    );
    return true;
  }

  // 🌧️ Weather & Mood
  if (/(rainy|raining|bad weather|gloomy|dark outside)/i.test(lower)) {
    Speech.speak(
      "Rainy days can feel heavy. Stay cozy, maybe have some warm food — and remember to track that coffee expense!",
      { language: "en-US", rate: 1.1 }
    );
    return true;
  }

  // 🔮 Existential/Deep Thoughts
  if (/(what's the point|what am i doing|life is hard|give up)/i.test(lower)) {
    setAssistantMood("comforting");
    Speech.speak(
      "Life can feel overwhelming sometimes. But you're here, you're trying, and that takes real courage. One day at a time, okay?",
      { language: "en-US", rate: 1.1 }
    );
    return true;
  }

  // 🎉 Celebrations
  if (/(birthday|my birthday|it's my birthday)/i.test(lower)) {
    setAssistantMood("happy");
    Speech.speak(
      "Happy birthday! I hope your day is filled with good food, great people, and maybe a few treats that won't break the budget!",
      { language: "en-US", rate: 1.1 }
    );
    return true;
  }

  if (/(good news|great news|passed|succeeded|won|achieved)/i.test(lower)) {
    setAssistantMood("happy");
    Speech.speak(
      "That's amazing! I'm so proud of you! Celebrate this win — you earned it!",
      { language: "en-US", rate: 1.1 }
    );
    return true;
  }

  // 🎮 Fun & Casual
  if (/(bored|nothing to do|what should i do)/i.test(lower)) {
    Speech.speak(
      "Feeling bored? How about reviewing your spending goals or maybe treating yourself to something small you've been wanting?",
      { language: "en-US", rate: 1.1 }
    );
    return true;
  }

 if (/\btell me a joke\b|\bmake me laugh\b|something funny/i.test(lower)) {
  setAssistantMood("happy");
  Speech.speak(
    "Why did the budget go to therapy? Because it had too many issues! Haha... okay, I’ll stick to helping you save money instead.",
    { language: "en-US", rate: 1.1 }
  );
  return true;
}


  // 💬 Asking about the assistant
  if (/(how are you|who are you|what are you)/i.test(lower)) {
    Speech.speak(
      "I'm your MoneyMigo assistant — I help you track expenses and remind you to take care of yourself too.",
      { language: "en-US", rate: 1.0 }
    );
    return true;
  }

  // 📊 Viewing or listing expenses
  if (/(show|view|see|list|display|check).*(expense|transaction|history|spending)/i.test(lower)) {
    Speech.speak(
      "You can view your expenses in the Recent Expenses section, or tap Show All to see your full history.",
      { language: "en-US", rate: 1.0 }
    );
    return true;
  }

  // ✏️ Editing or deleting expenses
  if (/(edit|change|modify|delete|remove|fix).*(expense|transaction)/i.test(lower)) {
    Speech.speak(
      "To edit or delete an expense, just tap on it in your Recent Expenses list — it's super easy.",
      { language: "en-US", rate: 1.0 }
    );
    return true;
  }

  // 📅 Date-based filters
  if (/(today|yesterday|this week|this month|last week|recent).*(expense|spent|spending)/i.test(lower)) {
    Speech.speak(
      "You can filter your expenses by date using the options in the expenses view — try selecting today, this week, or this month.",
      { language: "en-US", rate: 1.0 }
    );
    return true;
  }

  // 🏷️ Asking about categories
  if (/(what|which).*(categor|type)/i.test(lower)) {
    Speech.speak(
      "You can categorize expenses as Food, Transport, Shopping, Bills, School, Savings, or Others. You can even create your own!",
      { language: "en-US", rate: 1.0 }
    );
    return true;
  }

  // 🔢 Spending totals
  if (/(total|how much did i|what did i).*(spend|spent)/i.test(lower)) {
    const total = expenses.reduce((sum, e) => sum + e.amount, 0);
    Speech.speak(
      `You've spent a total of ${total.toFixed(2)} pesos so far. You're keeping track like a pro!`,
      { language: "en-US", rate: 1.00 }
    );
    return true;
  }

  // 💡 Financial tips
  if (/(tip|suggest|advice|save money|budget better|spending advice)/i.test(lower)) {
    Speech.speak(
      "Here's a tip: Try setting a weekly budget and check your spending daily. Even small savings add up over time.",
      { language: "en-US", rate: 1.0 }
    );
    return true;
  }

  // 🎯 Motivation and encouragement
  if (/(motivate|encourage|inspire|good job|well done|proud|great work)/i.test(lower)) {
    setAssistantMood("happy");
    Speech.speak(
      "You're doing great! Every expense you track brings you closer to financial control. Keep it up!",
      { language: "en-US", rate: 1.0 }
    );
    return true;
  }

  // 😊 Gratitude
  if (/(thank you|thanks|good|great|awesome|love you|you're helpful|appreciate)/i.test(lower)) {
    setAssistantMood("happy");
    Speech.speak(
      "Aw, you're so sweet! I'm always happy to help you out.",
      { language: "en-US", rate: 1.00 }
    );
    return true;
  }

  // 🔄 Undo / mistake
  if (/(undo|cancel|go back|mistake|wrong)/i.test(lower)) {
    Speech.speak(
      "If you added something by mistake, you can tap that expense to edit or delete it.",
      { language: "en-US", rate: 1.0 }
    );
    return true;
  }

  // 🧭 Default fallback (for any other random phrase)
  if (lower.length < 6 || /(hmm|uh|huh|okay|idk|i don't know|nothing)/i.test(lower)) {
    Speech.speak(
      "Hmm, I'm not sure what you meant. You can say add one hundred food note burger, or just ask me what I can do.",
      { language: "en-US", rate: 1.2 }
    );
    return true;
  }

  return false; // let applyParsedVoice handle it
}



const startVoiceRecognition = async () => {
  console.log("🎤 Voice button clicked");

  if (Platform.OS !== "web") {
    Alert.alert(
      "🎙️ Voice Input Unavailable",
      "Voice recognition only works in your browser version (mobile Chrome or Safari)."
    );
    return;
  }

  if (!SpeechRecognition) {
    Alert.alert("Not Supported", "Your browser doesn’t support voice recognition.");
    return;
  }

  try {
    const isMobileWeb = /Mobile|iPhone|iPad|Android/i.test(navigator.userAgent);
    if (!isMobileWeb) {
      Alert.alert("🎙️ Voice Input", "Try using Chrome or Safari on mobile.");
      return;
    }

    // ✅ Mic permission first
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach((t) => t.stop());
    console.log("✅ Microphone active");

    // ✅ Setup recognition
    const recognition = new SpeechRecognition();
    (window as any)._recognition = recognition;

    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.continuous = false;

    let timeoutId: any = null;

    recognition.onstart = () => {
      setIsListening(true);
      setVoiceTranscript("");
      console.log("🎧 Listening started...");

      // 🕐 Wait 1.2s before hint (avoid mic cutoff)
      if (!hasSpokenHint) {
        setHasSpokenHint(true);
        timeoutId = setTimeout(() => {
          Speech.speak(
            "You can say something like add one hundred food note burger.",
            { language: "en-US", rate: 1.0 }
          );
        }, 1000);
      }
    };

    recognition.onresult = (event) => {
      if (timeoutId) clearTimeout(timeoutId); // stop hint if speech ends early
      const spokenText = event.results[0][0].transcript.trim();
      console.log("🗣️ Heard:", spokenText);
      setVoiceTranscript(spokenText);

      const handled = handleVoiceConversation(spokenText);
      if (!handled) applyParsedVoice(spokenText);
    };

    recognition.onerror = (err) => {
      console.error("❌ Recognition error:", err);
      Speech.speak("Sorry, I didn’t catch that.", { language: "en-US" });
      Alert.alert("Error", "Failed to process your speech. Try again.");
      setIsListening(false);
    };

    recognition.onend = () => {
      console.log("🛑 Recognition ended automatically.");
      setIsListening(false);
    };

    // ✅ Start recognition instantly
    recognition.start();

    // 🕓 Auto-stop after 6 seconds of listening
    setTimeout(() => {
      try {
        recognition.stop();
        console.log("🕑 Auto-stopped after 6s");
      } catch (e) {
        console.warn("⚠️ Could not auto-stop:", e);
      }
    }, 6000);
  } catch (err) {
    console.error("❌ Voice error:", err);
    Alert.alert("Error", "Failed to start voice recognition. Please try again.");
    setIsListening(false);
  }
};




async function applyParsedVoice(command: string) {
  console.log("🎤 Voice input:", command);

  const user = await getToken();
  if (!user?.id) {
    Alert.alert("Please log in first before adding expenses.");
    setVoiceTranscript(""); // Clear transcript
    return;
  }

const entries = parseVoiceCommand(command);
if (entries.length === 0) {
  const msg =
    "Hmm, I didn’t quite get that. You can say something like add one hundred food note burger. Or, if you just want to talk, you can say hi or ask for help.";
  Alert.alert("Couldn’t Understand", msg);
  Speech.speak(msg, { language: "en-US", rate: 1.25 });
  setVoiceTranscript("");
  return;
}

// 🧠 Validate each entry with friendly feedback
for (const e of entries) {
  if (!e.amount || e.amount <= 0) {
    const msg = "I didn’t catch the amount. Please say a valid number after 'add'.";
    Alert.alert("Missing Amount", msg);
    Speech.speak(msg, { language: "en-US", rate: 1.0 });
    return;
  }

  if (!e.category || e.category === "Others") {
    const msg =
      "Hmm, I couldn’t detect a category. Try again, for example: add 50 to food note snacks.";
    Alert.alert("Missing Category", msg);
    Speech.speak(msg, { language: "en-US", rate: 1.0 });
    return;
  }
}

let total = 0;  // Continue normally
let added = 0;

  for (const { amount, category, notes, dateISO } of entries) {
    const payload = {
      amount,
      category,
      notes,
      userId: user.id,
      date: dateISO ?? new Date().toISOString(),
    };

    try {
      const res = await api.post("/expenses", payload);

      if (res.data?.expense) {
        setFilteredExpenses(prev => [res.data.expense, ...prev]);
      } else {
        setFilteredExpenses(prev => [payload, ...prev]);
      }

      total += amount;
      added += 1;
    } catch (err: any) {
      console.error("❌ Voice save failed:", err?.message || err);
    }
  }

if (added > 0) {
  fetchExpenses();
  const msg = "Got it, an expense has been added.";
  Speech.speak(msg, { language: "en-US", rate: 1.3 });
  console.log("✅", msg);

  setTimeout(() => {
    setVoiceTranscript("");
  }, 3000);
  } else {
    Alert.alert("Nothing added", "I didn't find a valid amount to save.");
    setVoiceTranscript(""); // Clear transcript
  }
}


function parseVoiceCommand(command: string): ParsedVoiceExpense[] {
  if (!command) return [];

  const clauses = splitIntoClauses(command);
  const parsed: ParsedVoiceExpense[] = [];

  for (const clause of clauses) {
    const lower = clause.toLowerCase().trim();

    // 🎯 NEW: Handle "add 50 others to [any custom name]" format
    const othersMatch = lower.match(/add\s+(\d+(?:\.\d+)?)\s+others?\s+to\s+(.+?)(?:\s+note\s+(.+))?$/i);
    
    if (othersMatch) {
      const amount = parseFloat(othersMatch[1]);
      const customName = othersMatch[2].trim();
      const notes = othersMatch[3] ? othersMatch[3].trim() : "";
      
      // ✅ Create "Others - [Custom Name]" format (Title Case each word)
      const formattedName = customName
        .split(" ")
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
      
      const category = `Others - ${formattedName}`;
      
      console.log("✨ Created custom Others category:", category);
      
      parsed.push({ 
        amount, 
        category, 
        notes, 
        dateISO: new Date().toISOString() 
      });
      
      continue; // Skip normal parsing
    }

    // 🎯 Existing match patterns for standard categories
    const match = lower.match(/add\s+(\d+(?:\.\d+)?)\s*(?:to|in)?\s*([a-zA-Z ]+)?(?:\s+(yesterday|today))?(?:\s+note\s+(.+))?/i);

    let amount: number | null = null;
    let category = "Others";
    let notes = "";
    let dateISO: string | undefined = undefined;

    if (match) {
      amount = parseFloat(match[1]);

      // 🧹 Clean up raw category text
      const rawCat = (match[2] || "")
        .toLowerCase()
        .replace(/\b(in|to|for|at|on|note)\b/g, "")
        .trim();

      const dateWord = match[3] ? match[3].toLowerCase() : "";
      notes = match[4] ? match[4].trim() : "";

      // 📅 Handle date keywords
      if (dateWord === "yesterday") {
        const d = new Date();
        d.setDate(d.getDate() - 1);
        dateISO = d.toISOString();
      } else if (dateWord === "today") {
        dateISO = new Date().toISOString();
      }

      // 🧭 Smart category mapping
      let matchedCategory = null;

      // 1️⃣ Check if it matches known categories (Food, Transport, etc.)
      for (const [alias, canon] of Object.entries(CATEGORY_LOOKUP)) {
        if (
          rawCat === alias ||
          rawCat.includes(alias) ||
          alias.includes(rawCat)
        ) {
          matchedCategory = canon;
          break;
        }
      }

      // 2️⃣ If not found in known categories, treat as custom "Others - X"
      if (!matchedCategory && rawCat && rawCat !== "others" && rawCat !== "other") {
        // Format as Title Case
        const formattedName = rawCat
          .split(" ")
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(" ");
        
        matchedCategory = `Others - ${formattedName}`;
        console.log("✨ Auto-created Others subcategory:", matchedCategory);
      }

      // 3️⃣ Default fallback
      category = matchedCategory || "Others";

      console.log("🎯 Detected category:", rawCat, "→", category);
    }

    // 🧩 Push only valid entries
    if (amount && !isNaN(amount)) {
      parsed.push({ amount, category, notes, dateISO });
    }
  }

  return parsed;
}

// 🧠 Track and reset spoken hint when account changes
useEffect(() => {
  (async () => {
    const token = await getToken();
    if (token?.id !== currentUserId) {
      setCurrentUserId(token?.id || null);
      setHasSpokenHint(false);
      console.log("🔄 Reset voice hint (new user or logout)");
    }
  })();
}, [currentUserId]);


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

 // 🧠 Whenever filteredExpenses or budget changes, check overspend
useEffect(() => {
  const totalSpent = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
  const currentBudget = budgetAmount || 0;
  const overspentAmount =
    currentBudget > 0 ? Math.max(totalSpent - currentBudget, 0) : 0;

  if (overspentAmount > 0) {
    // ⚠️ Animate slide-in warning
    setShowWarning(true);
    Animated.timing(warningAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: false,
    }).start();
  } else {
    // ✅ When overspend is cleared → auto-hide with fade-out
    if (showWarning) {
      Animated.timing(warningAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: false,
      }).start(() => setShowWarning(false));
    }
  }
}, [filteredExpenses, budgetAmount]);


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

    const res = await api.get(`/budgets/user/${user.id}`);
    setBudgetAmount(res.data?.amount || 0);
  } catch (err: any) {
    console.warn("⚠️ Could not fetch budget:", err.message);
    setBudgetAmount(0);
  }
};

// Load planned expenses
const loadPlannedExpenses = async () => {
  try {
    const user = await getToken();
    if (!user?.id) return;
    const stored = await AsyncStorage.getItem(`plannedExpenses_${user.id}`);
    if (stored) setPlannedExpenses(JSON.parse(stored));
  } catch (err) {
    console.error("Failed to load planned expenses:", err);
  }
};

// Save planned expenses
const savePlannedExpenses = async (expenses: any[]) => {
  try {
    const user = await getToken();
    if (!user?.id) return;
    await AsyncStorage.setItem(`plannedExpenses_${user.id}`, JSON.stringify(expenses));
    setPlannedExpenses(expenses);
  } catch (err) {
    console.error("Failed to save planned expenses:", err);
  }
};

// Search marketplace for item
const searchMarketplace = async (itemName: string) => {
  setSearchingMarketplace(true);
  try {
    const params = {
      lat: 8.228,
      lng: 124.245,
      radius: 10000,
      item: itemName.trim(),
      limit: 20, 
    };
    
    const response = await api.get('/deals', { params });
    
    if (response.data?.length > 0) {
      // Get the cheapest deal
      const cheapestDeal = response.data.reduce((min: any, deal: any) => 
        deal.price < min.price ? deal : min
      );
      
      return {
        found: true,
        price: cheapestDeal.price,
        dealId: cheapestDeal._id,
        itemName: cheapestDeal.itemName,
        storeName: cheapestDeal.storeName,
        stock: cheapestDeal.stock,
        unit: cheapestDeal.unit,
        category: cheapestDeal.category,
        distance: cheapestDeal.distance,
        allDeals: response.data, 
      };
    }
    return { found: false };
  } catch (err) {
    console.error("Marketplace search failed:", err);
    return { found: false };
  } finally {
    setSearchingMarketplace(false);
  }
};

// Add planned expense
const handleAddPlannedExpense = async () => {
  if (!newPlannedName.trim() || !newPlannedAmount || newPlannedCategory === 'Select Category') {
    Alert.alert("Incomplete", "Please fill in all fields");
    return;
  }

  const marketplaceResult = await searchMarketplace(newPlannedName);
  
  const newPlanned = {
    id: Date.now().toString(),
    name: newPlannedName.trim(),
    category: newPlannedCategory,
    estimatedAmount: parseFloat(newPlannedAmount),
    actualAmount: marketplaceResult.found ? marketplaceResult.price : null,
    source: marketplaceResult.found ? 'Marketplace' : 'Manual',
    marketplaceData: marketplaceResult.found ? {
      dealId: marketplaceResult.dealId,
      itemName: marketplaceResult.itemName,
      storeName: marketplaceResult.storeName,
      price: marketplaceResult.price,
      stock: marketplaceResult.stock,
      unit: marketplaceResult.unit,
      category: marketplaceResult.category,
      distance: marketplaceResult.distance,
      allDeals: marketplaceResult.allDeals, // All matching deals
    } : null,
    recurring: newPlannedRecurring,
    status: 'planned',
    createdAt: new Date().toISOString(),
  };

  const updated = [...plannedExpenses, newPlanned];
  await savePlannedExpenses(updated);
  
  setNewPlannedName('');
  setNewPlannedAmount('');
  setNewPlannedCategory('Select Category');
  setNewPlannedRecurring(false);
  setShowPlannedModal(false);
  
  if (marketplaceResult.found) {
    const savingsText = newPlanned.estimatedAmount > marketplaceResult.price 
      ? ` (Save ₱${(newPlanned.estimatedAmount - marketplaceResult.price).toFixed(2)}!)`
      : '';
    
    Alert.alert(
      "✅ Found in Marketplace!",
      `${marketplaceResult.itemName}\n` +
      `Store: ${marketplaceResult.storeName}\n` +
      `Price: ₱${marketplaceResult.price}${savingsText}\n` +
      `Stock: ${marketplaceResult.stock ? 'Available' : 'Out of Stock'}`,
      [{ text: "OK" }]
    );
  }
};

// Commit planned expense to actual
const handleCommitPlanned = async (planned: any) => {
  const user = await getToken();
  if (!user?.id) return;

  const amount = planned.actualAmount || planned.estimatedAmount;
  
  const payload = {
    amount,
    category: planned.category,
    notes: `Planned: ${planned.name}${planned.source === 'Marketplace' ? ' (from Marketplace)' : ''}`,
    userId: user.id,
    date: new Date().toISOString(),
  };

  try {
    await api.post("/expenses", payload);
    
    // Remove from planned if not recurring
    if (!planned.recurring) {
      const updated = plannedExpenses.filter(p => p.id !== planned.id);
      await savePlannedExpenses(updated);
    }
    
    Alert.alert("Success", "Expense committed!");
    fetchExpenses();
  } catch (err) {
    console.error("Failed to commit:", err);
    Alert.alert("Error", "Failed to commit expense");
  }
};

// Delete planned expense
const handleDeletePlanned = async (id: string) => {
  const updated = plannedExpenses.filter(p => p.id !== id);
  await savePlannedExpenses(updated);
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
    console.log("📸 Scan Receipt button pressed, Platform:", Platform.OS);
    
    if (Platform.OS === "web") {
      // 🧠 Detect if on a mobile browser
      const isMobileBrowser = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

      if (isMobileBrowser) {
        // Prompt user choice
        const choice = window.confirm("📷 Use Camera?\nPress OK for Camera or Cancel for Photos.");

        const input = document.createElement("input");
        input.type = "file";
        input.accept = "image/*";

        // Allow camera if user chose OK
        if (choice) input.setAttribute("capture", "environment");

        input.onchange = async (e) => {
          const file = (e.target as HTMLInputElement).files?.[0];
          if (file) {
            const uri = URL.createObjectURL(file);
            await processReceiptImage(uri);
          }
        };

        // Append to DOM and click to ensure consistent mobile behavior
        document.body.appendChild(input);
        input.click();
        document.body.removeChild(input);
        return;
      }

      // 💻 Desktop browsers — standard file upload
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "image/*";
      input.onchange = async (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (file) {
          const uri = URL.createObjectURL(file);
          await processReceiptImage(uri);
        }
      };
      document.body.appendChild(input);
      input.click();
      document.body.removeChild(input);
      return;
    }

    // 📱 Native (Android/iOS) — use Alert picker
    console.log("📱 Showing native picker alert");
    Alert.alert(
      "Scan Receipt",
      "Choose an option",
      [
        { 
          text: "📷 Camera", 
          onPress: () => {
            console.log("User selected Camera");
            pickFromCamera();
          }
        },
        { 
          text: "🖼️ Photos", 
          onPress: () => {
            console.log("User selected Gallery");
            pickFromGallery();
          }
        },
        { text: "Cancel", style: "cancel" },
      ],
      { cancelable: true }
    );
  } catch (error) {
    console.error("❌ Scan Receipt error:", error);
    Alert.alert("Error", "Something went wrong while selecting an image.");
  }
}

/// 📸 Camera
async function pickFromCamera() {
  try {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission Required", "Please allow camera access.");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 1,
      allowsEditing: false,
    });

    if (!result.canceled && result.assets && result.assets[0]) {
      await processReceiptImage(result.assets[0].uri);
    }
  } catch (error) {
    console.error("Camera error:", error);
    Alert.alert("Error", "Failed to open camera. Please try again.");
  }
}

// 🖼️ Gallery
async function pickFromGallery() {
  try {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission Required", "Please allow photo access.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 1,
      allowsEditing: false,
    });

    if (!result.canceled && result.assets && result.assets[0]) {
      await processReceiptImage(result.assets[0].uri);
    }
  } catch (error) {
    console.error("Gallery error:", error);
    Alert.alert("Error", "Failed to open gallery. Please try again.");
  }
}


useEffect(() => {
  if (voiceTranscript) {
    const timer = setTimeout(() => setVoiceTranscript(""), 5000);
    return () => clearTimeout(timer);
  }
}, [voiceTranscript]);

// 🧠 OCR processing (Improved accuracy + Fixed date picker for APK)
async function processReceiptImage(uri) {
  try {
    setIsScanning(true);
    console.log("📸 Processing image:", uri);

    // 1️⃣ Enhance image for OCR accuracy
    const processed = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: 1600 } }],
      { compress: 0.9, format: ImageManipulator.SaveFormat.JPEG }
    );

    let extractedText = "";

    // 2️⃣ OCR (Tesseract for web, OCR.Space for native)
    if (Platform.OS === "web") {
      const { createWorker } = await import("tesseract.js");
      const worker = await createWorker("eng");
      const result = await worker.recognize(processed.uri);
      await worker.terminate();
      extractedText = result?.data?.text || "";
    } else {
      console.log("📤 Using XMLHttpRequest for native OCR...");
      
      extractedText = await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', 'https://api.ocr.space/parse/image');
        xhr.setRequestHeader('apikey', OCR_API_KEY);
        
        xhr.onload = () => {
          try {
            const data = JSON.parse(xhr.responseText);
            console.log("📥 OCR.Space response:", data);
            
            if (data.IsErroredOnProcessing) {
              reject(new Error(data.ErrorMessage?.[0] || "OCR processing failed"));
            } else {
              const text = data?.ParsedResults?.[0]?.ParsedText || "";
              if (!text.trim()) {
                reject(new Error("No text extracted from image"));
              }
              resolve(text);
            }
          } catch (err) {
            reject(new Error(`Failed to parse OCR response: ${err.message}`));
          }
        };
        
        xhr.onerror = () => reject(new Error('Network request failed'));
        xhr.ontimeout = () => reject(new Error('Request timed out'));
        
        const formData = new FormData();
        formData.append("file", {
          uri: processed.uri,
          type: "image/jpeg",
          name: "receipt.jpg",
        });
        formData.append("language", "eng");
        formData.append("OCREngine", "2");
        formData.append("scale", "true");
        formData.append("isTable", "true"); // Better for receipt parsing
        
        console.log("📤 Sending image to OCR.Space...");
        xhr.send(formData);
      });
    }

    if (!extractedText.trim()) {
      Alert.alert("⚠️ OCR Failed", "No readable text detected. Try again.");
      return;
    }

    console.log("✅ Extracted text:", extractedText);

    // 3️⃣ Clean up text for parsing
    const cleanText = extractedText
      .replace(/\n+/g, " ")
      .replace(/\s{2,}/g, " ")
      .replace(/[^\x20-\x7E]/g, "")
      .toLowerCase();

    // 4️⃣ 🎯 IMPROVED AMOUNT DETECTION - Exclude VAT/Tax, prioritize actual total
    let detectedAmount = null;

    const cleanLines = cleanText
      .split(/(?<=\d)\s+/)
      .map(l => l.trim())
      .filter(Boolean);

    console.log("📄 Cleaned lines:", cleanLines);

    // 🚫 EXCLUDE: Lines with VAT, tax, service charge, transaction IDs (these are NOT the amount to pay)
    const EXCLUDE_PATTERNS = [
      /vat|tax|service\s*charge|sc\s*\d|vatable/i,
      /vat\s*sales|vat\s*amount|vat\s*exempt/i,
      /transaction\s*(id|number|no|#)/i,
      /invoice\s*(id|number|no|#)/i,
      /reference\s*(id|number|no|#)/i,
      /order\s*(id|number|no|#)/i,
      /receipt\s*(id|number|no|#)/i,
      /^\d{10,}$/i, // Long number sequences (likely IDs)
    ];

    // ✅ PRIORITY 1: Look for common total labels (including "Eat-In Total", "Amount to Pay", "Billed Amount")
    const TOTAL_PATTERNS = [
      /billed\s*amount/i,                  // "Billed Amount"
      /total\s*due/i,                      // "Total Due"
      /eat[\s-]*in[\s-]*total/i,           // "Eat-In Total" (McDonald's)
      /amount[\s]*to[\s]*pay/i,            // "Amount to Pay"
      /total[\s]*amount[\s]*due/i,         // "Total Amount Due"
      /amount[\s]*due/i,                   // "Amount Due"
      /grand[\s]*total/i,                  // "Grand Total"
      /net[\s]*total/i,                    // "Net Total"
      /final[\s]*total/i,                  // "Final Total"
      /subtotal|sub[\s-]*total/i,          // "Subtotal"
      /total[\s]*sales|sales[\s]*total/i,  // "Total Sales"
      /payment[\s]*amount/i,               // "Payment Amount"
      /total[\s]*amount/i,                 // "Total Amount"
    ];

    for (const regex of TOTAL_PATTERNS) {
      const match = cleanLines.find(line => {
        // Skip if line contains VAT/tax/ID keywords
        if (EXCLUDE_PATTERNS.some(ex => ex.test(line))) return false;
        return regex.test(line);
      });

      if (match) {
        // Look for amount in the same line
        const numMatch = match.match(/(\d{1,6}(?:[.,]\d{1,2})?)/g);
        if (numMatch) {
          detectedAmount = parseFloat(numMatch[numMatch.length - 1].replace(/[^\d.]/g, ""));
          console.log("✅ Found TOTAL:", match, "→", detectedAmount);
          break;
        }
        
        // Check next line if amount not in same line
        const matchIndex = cleanLines.indexOf(match);
        if (matchIndex !== -1 && cleanLines[matchIndex + 1]) {
          const nextLine = cleanLines[matchIndex + 1];
          // Skip if next line has exclusion patterns
          if (!EXCLUDE_PATTERNS.some(ex => ex.test(nextLine))) {
            const nextNum = nextLine.match(/(\d{1,6}(?:[.,]\d{1,2})?)/g);
            if (nextNum) {
              detectedAmount = parseFloat(nextNum[nextNum.length - 1].replace(/[^\d.]/g, ""));
              console.log("✅ Found TOTAL (next line):", nextLine, "→", detectedAmount);
              break;
            }
          }
        }
      }
    }

    // ✅ PRIORITY 2: Bank transactions (withdrawal, deposit)
    if (!detectedAmount) {
      const BANK_PATTERNS = [
        /(cash\s*withdrawal|withdrawal\s*amount)/i,
        /(transaction\s*amount)/i,
        /(deposit\s*amount|credit\s*amount)/i,
      ];

      for (const regex of BANK_PATTERNS) {
        const match = cleanLines.find(line => regex.test(line));
        if (match) {
          const numMatch = match.match(/(\d{1,6}(?:[.,]\d{1,2})?)/g);
          if (numMatch) {
            detectedAmount = parseFloat(numMatch[numMatch.length - 1].replace(/[^\d.]/g, ""));
            console.log("💰 Found bank transaction:", match, "→", detectedAmount);
            break;
          }
        }
      }
    }

    // ✅ PRIORITY 3: "TOTAL" or "AMOUNT" (but exclude if VAT/Tax/ID nearby)
    if (!detectedAmount) {
      const contextMatches = [];
      const contextRegex = /total|amount|balance/i;

      cleanLines.forEach((line, idx) => {
        // Skip lines with VAT/tax/IDs
        if (EXCLUDE_PATTERNS.some(ex => ex.test(line))) return;

        if (contextRegex.test(line)) {
          const numbers = (line.match(/\d{1,6}(?:[.,]\d{1,2})?/g) || []).map(n =>
            parseFloat(n.replace(/[^\d.]/g, ""))
          );
          if (numbers.length) {
            contextMatches.push(...numbers);
          }

          // Check next line (but skip if it has VAT/tax/IDs)
          if (cleanLines[idx + 1] && !EXCLUDE_PATTERNS.some(ex => ex.test(cleanLines[idx + 1]))) {
            const nextNums = (cleanLines[idx + 1].match(/\d{1,6}(?:[.,]\d{1,2})?/g) || []).map(n =>
              parseFloat(n.replace(/[^\d.]/g, ""))
            );
            if (nextNums.length) contextMatches.push(...nextNums);
          }
        }
      });

      if (contextMatches.length > 0) {
        detectedAmount = Math.max(...contextMatches);
        console.log("📊 Found context-based amount:", detectedAmount);
      }
    }

    // ✅ PRIORITY 4: Fallback - largest number (excluding obvious VAT/tax/ID values)
    if (!detectedAmount) {
      const allNumbers = cleanText
        .split(/\s+/)
        .filter(word => {
          // Skip if word contains VAT, tax, or ID keywords
          return !EXCLUDE_PATTERNS.some(ex => ex.test(word));
        })
        .flatMap(word => word.match(/\d{1,6}(?:[.,]\d{1,2})?/g) || [])
        .map(n => parseFloat(n.replace(/[^\d.]/g, "")))
        .filter(n => n > 0 && n < 1000000); // Reasonable amount range

      if (allNumbers.length) {
        detectedAmount = Math.max(...allNumbers);
        console.log("📈 Fallback: using global max:", detectedAmount);
      }
    }

    // 5️⃣ Smart Category Detection
    let detectedCategory = "Others";
    const CATEGORY_PATTERNS = {
      Food: /(jollibee|mcdonald|kfc|chowking|food|meal|snack|burger|pizza|coffee|tea|restaurant|starbucks|dunkin)/i,
      Transport: /(grab|taxi|bus|jeep|tricycle|fare|transport|fuel|parking|gasoline|petron|shell)/i,
      Bills: /(meralco|pldt|globe|smart|bill|internet|wifi|water|electric|converge)/i,
      School: /(tuition|school|book|notebook|exam|project|student|module|university|college)/i,
      Shopping: /(mall|shop|store|sm|robinsons|grocery|watsons|shopee|lazada|puregold|mercury)/i,
      Savings: /(atm|bank|deposit|withdrawal|landbank|bpi|bdo|maya|gcash|balance|transaction record|cash withdrawal)/i,
    };

    for (const [cat, regex] of Object.entries(CATEGORY_PATTERNS)) {
      if (regex.test(cleanText)) {
        detectedCategory = cat;
        break;
      }
    }

    // 🧮 Confidence calculation
    let confidence = 0.6;
    if (detectedAmount && /subtotal|total|withdrawal|deposit|billed/.test(cleanText))
      confidence += 0.25;
    if (/landbank|bank|atm|transaction/.test(cleanText)) confidence += 0.15;
    if (confidence > 1) confidence = 1;

    // ✅ CRITICAL: Set date as Date object, NOT null
    const todayDate = new Date();
    setOcrDetectedDate(todayDate);
    setOcrRawText(cleanText);
    setOcrDetectedAmount(detectedAmount ? detectedAmount.toFixed(2) : "");
    setOcrDetectedCategory(detectedCategory);
    setOcrDetectedNotes(""); // Clear previous notes
    setShowOcrModal(true);

    console.log("✅ OCR Result", {
      amount: detectedAmount,
      category: detectedCategory,
      date: todayDate.toISOString(),
    });

  } catch (err) {
    console.error("❌ OCR error:", err);
    Alert.alert("Error", `Failed to process receipt: ${err.message}`);
  } finally {
    setIsScanning(false);
  }
}


// 🔧 FIX: Make sure your OCR modal date picker works on native
// In your OCR confirmation modal, use this date picker structure:

{Platform.OS === 'web' ? (
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
      value={ocrDetectedDate ? ocrDetectedDate.toISOString().slice(0, 10) : ''}
      onChange={(e) => {
        if (e.target.value) {
          setOcrDetectedDate(new Date(e.target.value));
        }
      }}
    />
  </View>
) : (
  <>
    <TouchableOpacity 
      onPress={() => setShowOcrDatePicker(true)} 
      style={styles.input}
    >
      <Text>
        {ocrDetectedDate 
          ? ocrDetectedDate.toLocaleDateString() 
          : 'Select Date'}
      </Text>
    </TouchableOpacity>
    
    {showOcrDatePicker && (
      <DateTimePicker
        value={ocrDetectedDate || new Date()}
        mode="date"
        display="default"
        onChange={(event, selectedDate) => {
          setShowOcrDatePicker(false);
          if (event.type === 'set' && selectedDate) {
            setOcrDetectedDate(selectedDate);
          }
        }}
      />
    )}
  </>
)}


useEffect(() => {
  loadPlannedExpenses();
}, []);

  const handleAddExpense = async () => {
  console.log("🚀 handleAddExpense pressed");
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

// ✏️ Handle Edit Expense
const handleEditExpense = async () => {
  if (!selectedExpense || !editAmount || editCategory === "Select Category") {
    Alert.alert("⚠️ Incomplete Fields", "Please fill in all required fields.");
    return;
  }

  const user = await getToken();
  if (!user?.id) return;

  const payload = {
    amount: parseFloat(editAmount),
    category: editCategory,
    notes: editNotes,
    date: editDate?.toISOString() || selectedExpense.date,
  };

  try {
    setIsLoading(true);
    await api.put(`/expenses/${selectedExpense._id}`, payload);
    
    Alert.alert("✅ Updated", "Expense has been updated successfully!");
    
    setShowExpenseDetailModal(false);
    setIsEditMode(false);
    fetchExpenses();
  } catch (err) {
    console.error("❌ Failed to update expense:", err);
    Alert.alert("❌ Error", "Failed to update expense. Please try again.");
  } finally {
    setIsLoading(false);
  }
};

// 🗑️ Handle Delete Expense
const handleDeleteExpense = async () => {
  if (!selectedExpense) return;

  const confirmDelete = Platform.OS === "web"
    ? window.confirm("Are you sure you want to delete this expense?")
    : await new Promise((resolve) =>
        Alert.alert(
          "Delete Expense",
          "Are you sure you want to delete this expense?",
          [
            { text: "Cancel", style: "cancel", onPress: () => resolve(false) },
            { text: "Delete", style: "destructive", onPress: () => resolve(true) },
          ]
        )
      );

  if (!confirmDelete) return;

  try {
    setIsLoading(true);
    await api.delete(`/expenses/${selectedExpense._id}`);
    
    Alert.alert("✅ Deleted", "Expense has been deleted.");
    
    setShowExpenseDetailModal(false);
    fetchExpenses();
  } catch (err) {
    console.error("❌ Failed to delete expense:", err);
    Alert.alert("❌ Error", "Failed to delete expense. Please try again.");
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
  {(items as { amount: number }[])
    .reduce((sum: number, i: { amount: number }) => sum + (i.amount || 0), 0)
    .toFixed(2)}
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
  

      <View style={styles.container}>
    <StatusBar barStyle="light-content" backgroundColor="#1f4b81ff" />
    <ScrollView 
      style={styles.scrollContainer}
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
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => router.back()}
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

        {/* Planned Expenses Section */}
<View style={styles.plannedCard}>
  <TouchableOpacity
    onPress={() => {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setPlannedExpanded(!plannedExpanded);
    }}
    style={styles.plannedHeader}
    activeOpacity={0.88}
  >
    <View style={styles.plannedHeaderLeft}>
      <Ionicons name="calendar-outline" size={20} color="#2563EB" style={{ marginRight: 10 }} />
      <View>
        <Text style={styles.plannedTitle}>Planned Expenses</Text>
       <Text style={styles.plannedSubtitle}>
  {plannedExpenses.length} items • ₱
  {plannedExpenses.reduce((sum, p) => sum + (p.actualAmount || p.estimatedAmount), 0).toFixed(2)} estimated
  {(() => {
    const totalSavings = plannedExpenses.reduce((sum, p) => {
      if (p.actualAmount && p.actualAmount < p.estimatedAmount) {
        return sum + (p.estimatedAmount - p.actualAmount);
      }
      return sum;
    }, 0);
    return totalSavings > 0 ? ` • Save ₱${totalSavings.toFixed(2)}` : '';
  })()}
</Text>
      </View>
    </View>
    <Ionicons
      name={plannedExpanded ? "chevron-up" : "chevron-down"}
      size={20}
      color="#2563EB"
    />
  </TouchableOpacity>

  {plannedExpanded && (
    <View style={styles.plannedContent}>
      {plannedExpenses.length === 0 ? (
        <Text style={styles.emptyPlannedText}>No planned expenses yet</Text>
      ) : (
        plannedExpenses.map((planned) => (
          <View key={planned.id} style={styles.plannedItem}>
  <View style={styles.plannedItemLeft}>
    <View style={[styles.iconCircle, { backgroundColor: getCategoryColor(planned.category) + '22' }]}>
      {getCategoryIconComponent(planned.category)}
    </View>
    <View style={{ flex: 1 }}>
      <Text style={styles.plannedItemName}>{planned.name}</Text>
      
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
        {/* Estimated vs Actual Price */}
        {planned.actualAmount && planned.actualAmount < planned.estimatedAmount ? (
          <>
            <Text style={[styles.plannedItemAmount, { textDecorationLine: 'line-through', color: '#9CA3AF' }]}>
              ₱{planned.estimatedAmount.toFixed(2)}
            </Text>
            <Text style={[styles.plannedItemAmount, { color: '#16A34A' }]}>
              ₱{planned.actualAmount.toFixed(2)}
            </Text>
            <View style={[styles.marketplaceBadge, { backgroundColor: '#DCFCE7' }]}>
              <Text style={styles.marketplaceBadgeText}>
                Save ₱{(planned.estimatedAmount - planned.actualAmount).toFixed(2)}
              </Text>
            </View>
          </>
        ) : (
          <Text style={styles.plannedItemAmount}>
            ₱{(planned.actualAmount || planned.estimatedAmount).toFixed(2)}
          </Text>
        )}
        
       {/* Marketplace Badge */}
{planned.source === 'Marketplace' && (
  <TouchableOpacity 
    onPress={() => {
      if (planned.marketplaceData?.allDeals) {
        setSelectedPlannedItem(planned); // ✅ Track which item we're updating
        setSelectedPlannedDeals(planned.marketplaceData.allDeals);
        setShowDealsModal(true);
      }
    }}
    style={styles.marketplaceBadge}
  >
    <Ionicons name="storefront" size={10} color="#16A34A" />
    <Text style={styles.marketplaceBadgeText}>
      {planned.marketplaceData?.storeName || 'Marketplace'}
    </Text>
  </TouchableOpacity>
)}
        
        {/* Stock Status */}
        {planned.marketplaceData?.stock !== undefined && (
          <View style={[
            styles.marketplaceBadge, 
            { 
              backgroundColor: planned.marketplaceData.stock ? '#DCFCE7' : '#FEE2E2',
              borderColor: planned.marketplaceData.stock ? '#BBF7D0' : '#FECACA',
            }
          ]}>
            <Ionicons 
              name={planned.marketplaceData.stock ? "checkmark-circle" : "close-circle"} 
              size={10} 
              color={planned.marketplaceData.stock ? "#16A34A" : "#DC2626"} 
            />
            <Text style={[
              styles.marketplaceBadgeText, 
              { color: planned.marketplaceData.stock ? "#16A34A" : "#DC2626" }
            ]}>
              {planned.marketplaceData.stock ? "In Stock" : "Out of Stock"}
            </Text>
          </View>
        )}
        
        {/* Recurring Badge */}
        {planned.recurring && (
          <View style={[styles.marketplaceBadge, { backgroundColor: '#FEF3C7', borderColor: '#FDE68A' }]}>
            <Ionicons name="repeat" size={10} color="#D97706" />
            <Text style={[styles.marketplaceBadgeText, { color: '#D97706' }]}>Monthly</Text>
          </View>
        )}
      </View>
      
      {/* Store & Distance Info */}
      {planned.marketplaceData && (
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 4 }}>
          {planned.marketplaceData.distance && (
            <Text style={{ fontSize: 11, color: '#6B7280' }}>
              {(planned.marketplaceData.distance / 1000).toFixed(1)} km away
            </Text>
          )}
          {planned.marketplaceData.unit && (
            <>
              <Text style={{ color: '#D1D5DB', fontSize: 10 }}>•</Text>
              <Text style={{ fontSize: 11, color: '#6B7280' }}>
                {planned.marketplaceData.unit}
              </Text>
            </>
          )}
        </View>
      )}
    </View>
  </View>
  
  <View style={styles.plannedItemActions}>
    <TouchableOpacity
      onPress={() => handleCommitPlanned(planned)}
      style={[styles.plannedActionBtn, { backgroundColor: '#DCFCE7' }]}
    >
      <Ionicons name="checkmark" size={16} color="#16A34A" />
    </TouchableOpacity>
    <TouchableOpacity
      onPress={() => handleDeletePlanned(planned.id)}
      style={[styles.plannedActionBtn, { backgroundColor: '#FEE2E2' }]}
    >
      <Ionicons name="trash-outline" size={16} color="#DC2626" />
    </TouchableOpacity>
  </View>
</View>
        ))
      )}
      
      <TouchableOpacity
        style={styles.addPlannedBtn}
        onPress={() => setShowPlannedModal(true)}
      >
        <Ionicons name="add-circle-outline" size={20} color="#2563EB" />
        <Text style={styles.addPlannedBtnText}>Add Planned Expense</Text>
      </TouchableOpacity>
    </View>
  )}
</View>

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

 {/* ⚠️ Animated Overspend Warning (auto-hide + success feedback) */}
{(showWarning || warningAnim.__getValue() > 0) && (
  <Animated.View
    style={{
      opacity: warningAnim,
      height: warningAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 75],
      }),
      overflow: "hidden",
      backgroundColor:
        budgetAmount > 0 &&
        filteredExpenses.reduce((sum, e) => sum + e.amount, 0) > budgetAmount
          ? "#fee2e2" // red (overspent)
          : "#dcfce7", // green (back within budget)
      borderLeftColor:
        budgetAmount > 0 &&
        filteredExpenses.reduce((sum, e) => sum + e.amount, 0) > budgetAmount
          ? "#dc2626"
          : "#16a34a",
      borderLeftWidth: 6,
      borderRadius: 8,
      padding: 12,
      marginHorizontal: 16,
      marginBottom: 8,
      transform: [
        {
          translateY: warningAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [-10, 0],
          }),
        },
      ],
    }}
  >
    {budgetAmount > 0 &&
    filteredExpenses.reduce((sum, e) => sum + e.amount, 0) > budgetAmount ? (
      <Text style={{ color: "#dc2626", fontWeight: "700" }}>
        ⚠️ You’ve exceeded your budget by ₱
        {(
          filteredExpenses.reduce((sum, e) => sum + e.amount, 0) - budgetAmount
        ).toLocaleString(undefined, {
          minimumFractionDigits: 2,
        })}
      </Text>
    ) : budgetAmount > 0 ? (
      <Text style={{ color: "#166534", fontWeight: "700" }}>
        ✅ You’re back within budget!
      </Text>
    ) : null}
  </Animated.View>
)}




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
  {expense.overspent && expense.overspent > 0 ? (
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
  ) : null}
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
  onPress={() => {
    setCategoryCallerModal('add'); // ✅ Mark that add expense modal called it
    setCategoryModalVisible(true);
  }}
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

  {/* 🧠 Enhanced OCR Confirmation Modal */}
<Modal visible={showOcrModal} transparent animationType="fade">
  <Pressable style={styles.modalOverlay} onPress={() => setShowOcrModal(false)}>
    <Pressable onPress={() => {}} style={[styles.modalContainer, { width: '90%', maxWidth: 380, padding: 18 }]}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
        <View style={{
          width: 36,
          height: 36,
          borderRadius: 18,
          backgroundColor: '#EFF6FF',
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: 10
        }}>
          <Ionicons name="camera" size={18} color="#2563EB" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 17, fontWeight: "700", color: "#1E293B" }}>
            Confirm Receipt
          </Text>
          <Text style={{ fontSize: 12, color: "#64748B" }}>
            Verify & adjust details
          </Text>
        </View>
        <TouchableOpacity onPress={() => setShowOcrModal(false)}>
          <Ionicons name="close-circle" size={24} color="#94A3B8" />
        </TouchableOpacity>
      </View>

      {/* Compact Form */}
      <View style={{ gap: 10, marginBottom: 12 }}>
        {/* Date Picker - Same as Transaction Modal */}
        <View style={{ width: '100%' }}>
          <Text style={{ fontSize: 12, color: '#64748B', marginBottom: 4, fontWeight: '600' }}>
            Date
          </Text>
          {Platform.OS === 'web' ? (
            <View style={{
              backgroundColor: '#F8FAFC',
              borderRadius: 8,
              borderWidth: 1,
              borderColor: '#CBD5E1',
              padding: 12,
              flexDirection: 'row',
              alignItems: 'center',
            }}>
              <Ionicons name="calendar-outline" size={16} color="#6366F1" style={{ marginRight: 8 }} />
             <input
        type="date"
        value={ocrDetectedDate ? formatDateInputValue(ocrDetectedDate) : ''}
        onChange={e => {
          if (e.target.value) {
            setOcrDetectedDate(parseDateLocal(e.target.value));
          }
        }}
        min={min ? formatDateInputValue(min) : undefined}
        max={max ? formatDateInputValue(max) : undefined}
        style={{
          border: 'none',
          backgroundColor: 'transparent',
          fontSize: '15px',
          fontFamily: 'inherit',
          color: '#1E293B',
          outline: 'none',
          flex: 1,
          cursor: 'pointer',
        }}
      />
    </View>
  ) : (
    <>
      <TouchableOpacity 
        onPress={() => {
          console.log('📅 OCR Date picker clicked');
          setShowOcrDatePicker(true);
        }} 
        style={{
          backgroundColor: '#F8FAFC',
          borderRadius: 8,
          borderWidth: 1,
          borderColor: '#CBD5E1',
          padding: 12,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
        activeOpacity={0.7}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
          <Ionicons name="calendar-outline" size={16} color="#6366F1" style={{ marginRight: 10 }} />
          <Text style={{ 
            fontSize: 14, 
            color: ocrDetectedDate ? '#1E293B' : '#94A3B8',
            fontWeight: ocrDetectedDate ? '500' : '400'
          }}>
            {ocrDetectedDate ? ocrDetectedDate.toLocaleDateString('en-US', { 
              weekday: 'short', 
              year: 'numeric', 
              month: 'short', 
              day: 'numeric' 
            }) : 'Select Date'}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
      </TouchableOpacity>
      
      {showOcrDatePicker && (
        <DateTimePicker
          value={ocrDetectedDate || new Date()}
          mode="date"
          display="default"
          minimumDate={min}
          maximumDate={new Date(max.getTime() - 86400000)}
          onChange={(event, selectedDate) => {
            console.log('📅 Date picker closed:', event.type, selectedDate);
            setShowOcrDatePicker(false);
            if (event.type === 'set' && selectedDate) {
              setOcrDetectedDate(selectedDate);
              console.log('✅ Date updated to:', selectedDate.toISOString());
            }
          }}
        />
      )}
    </>
  )}
</View>

        {/* Amount Input */}
        <View>
          <Text style={{ fontSize: 12, color: "#64748B", marginBottom: 4, fontWeight: '600' }}>
            Amount (₱)
          </Text>
          <TextInput
            value={ocrDetectedAmount}
            onChangeText={setOcrDetectedAmount}
            keyboardType="numeric"
            placeholder="0.00"
            style={{
              borderWidth: 1,
              borderColor: "#CBD5E1",
              borderRadius: 8,
              paddingVertical: 10,
              paddingHorizontal: 12,
              fontSize: 15,
              backgroundColor: "#FFFFFF",
            }}
          />
        </View>

        {/* Category Input */}
        <View>
          <Text style={{ fontSize: 12, color: "#64748B", marginBottom: 4, fontWeight: '600' }}>
            Category
          </Text>
          <TouchableOpacity
            onPress={() => {
              setCategoryModalVisible(true);
            }}
            style={{
              borderWidth: 1,
              borderColor: "#CBD5E1",
              borderRadius: 8,
              paddingVertical: 10,
              paddingHorizontal: 12,
              backgroundColor: "#FFFFFF",
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}
          >
            <Text style={{ fontSize: 15, color: "#1E293B" }}>
              {ocrDetectedCategory}
            </Text>
            <Ionicons name="chevron-down" size={16} color="#94A3B8" />
          </TouchableOpacity>
        </View>

        {/* Notes Input (optional) */}
        <View>
          <Text
            style={{
              fontSize: 12,
              color: "#64748B",
              marginBottom: 4,
              fontWeight: "600",
            }}
          >
            Notes (optional)
          </Text>
          <TextInput
            value={ocrDetectedNotes}
            onChangeText={setOcrDetectedNotes}
            placeholder="Add a short note..."
            multiline
            style={{
              borderWidth: 1,
              borderColor: "#CBD5E1",
              borderRadius: 8,
              paddingVertical: 10,
              paddingHorizontal: 12,
              fontSize: 15,
              backgroundColor: "#FFFFFF",
              minHeight: 40,
              textAlignVertical: "top",
            }}
          />
        </View>

        {/* Collapsible Extracted Text */}
        <TouchableOpacity
          onPress={() => setOthersExpanded(!othersExpanded)}
          style={{
            borderWidth: 1,
            borderColor: "#E2E8F0",
            borderRadius: 8,
            padding: 10,
            backgroundColor: "#F8FAFC",
          }}
        >
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ fontSize: 12, color: "#64748B", fontWeight: '600' }}>
              📄 Extracted Text
            </Text>
            <Ionicons 
              name={othersExpanded ? "chevron-up" : "chevron-down"} 
              size={16} 
              color="#64748B" 
            />
          </View>
          
          {othersExpanded && (
            <ScrollView
              style={{
                maxHeight: 80,
                marginTop: 8,
                paddingTop: 8,
                borderTopWidth: 1,
                borderTopColor: "#E2E8F0",
              }}
              nestedScrollEnabled
            >
              <Text style={{ color: "#475569", fontSize: 12, lineHeight: 16 }}>
                {ocrRawText || "No text extracted"}
              </Text>
            </ScrollView>
          )}
        </TouchableOpacity>
      </View>

      {/* Action Buttons */}
      <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 8 }}>
        {/* Cancel Button */}
        <TouchableOpacity
          style={{
            flex: 1,
            backgroundColor: "#F1F5F9",
            borderRadius: 10,
            paddingVertical: 12,
            paddingHorizontal: 8,
            alignItems: "center",
            justifyContent: "center",
            minWidth: 100,
          }}
          onPress={() => setShowOcrModal(false)}
        >
          <Text
            style={{
              color: "#475569",
              fontWeight: "600",
              fontSize: 14,
              textAlign: "center",
            }}
          >
            Cancel
          </Text>
        </TouchableOpacity>

        {/* Save Button */}
        <TouchableOpacity
          style={{
            flex: 1,
            backgroundColor: "#2563EB",
            borderRadius: 10,
            paddingVertical: 12,
            paddingHorizontal: 8,
            alignItems: "center",
            justifyContent: "center",
            minWidth: 100,
            shadowColor: "#2563EB",
            shadowOpacity: 0.3,
            shadowRadius: 8,
            shadowOffset: { width: 0, height: 2 },
            elevation: 3,
          }}
          onPress={async () => {
            const amount = parseFloat(ocrDetectedAmount);

            if (!amount || amount <= 0) {
              Alert.alert("⚠️ Invalid Amount", "Please enter a valid amount.");
              return;
            }

            if (!ocrDetectedCategory || ocrDetectedCategory === "Select Category") {
              Alert.alert("⚠️ Incomplete Fields", "Please select a valid category.");
              return;
            }

           
    // ✅ Validate date
    if (!ocrDetectedDate || !(ocrDetectedDate instanceof Date)) {
      Alert.alert("⚠️ Invalid Date", "Please select a valid date.");
      return;
    }

            try {
             // ✅ Set values for handleAddExpense
      setExpenseAmount(ocrDetectedAmount);
      setExpenseCategory(ocrDetectedCategory);
      setExpenseNotes(ocrDetectedNotes?.trim() || "Scanned from receipt");
      setCustomDate(ocrDetectedDate); // ✅ Use the OCR detected date

              setShowOcrModal(false);

              setTimeout(async () => {
                await handleAddExpense();
              }, 200);
            } catch (err) {
              console.error("❌ Save error:", err);
              Alert.alert("Error", "Failed to save expense from scanned receipt.");
            }
          }}
        >
          <Text
            style={{
              color: "#FFFFFF",
              fontWeight: "600",
              fontSize: 14,
              textAlign: "center",
            }}
            numberOfLines={1}
          >
            Save Expense
          </Text>
        </TouchableOpacity>
      </View>
    </Pressable>
  </Pressable>
</Modal>


     {/* Category Picker Modal */}
<Modal
  visible={categoryModalVisible}
  transparent
  animationType="fade"
  onRequestClose={() => {
    setCategoryModalVisible(false);
    // ✅ Re-show planned modal if it was the caller
    if (categoryCallerModal === 'planned') {
      setTimeout(() => {
        setShowPlannedModal(true);
      }, 100);
    }
    setCategoryCallerModal(null);
  }}
>
  <Pressable 
    style={styles.modalOverlay}
    onPress={() => {
      setCategoryModalVisible(false);
      // ✅ Re-show planned modal if it was the caller
      if (categoryCallerModal === 'planned') {
        setTimeout(() => {
          setShowPlannedModal(true);
        }, 100);
      }
      setCategoryCallerModal(null);
    }}
  >
    <View style={[styles.modalContainer, { gap: 0, maxHeight: '70%', zIndex: 10002 }]}>
      {/* ... header ... */}

      <ScrollView style={{ maxHeight: 400 }}>
       {/* Main Categories */}
{['Food', 'Transport', 'Bills', 'School', 'Shopping'].map((cat) => (
  <TouchableOpacity
    key={cat}
    onPress={() => {
      setExpenseCategory(cat);
      
      // ✅ Update the correct state based on which modal called us
      if (categoryCallerModal === 'planned') {
        setNewPlannedCategory(cat);
      }
      
      setCategoryModalVisible(false);
      
      // ✅ Re-show planned modal after selection
      if (categoryCallerModal === 'planned') {
        setTimeout(() => {
          setShowPlannedModal(true);
        }, 100);
      }
      
      setCategoryCallerModal(null);
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

{customCategories.map((cat) => (
  <TouchableOpacity
    key={cat}
    onPress={() => {
      setExpenseCategory(cat);
      
      if (categoryCallerModal === 'planned') {
        setNewPlannedCategory(cat);
      }
      
      setCategoryModalVisible(false);
      
      // ✅ Re-show planned modal
      if (categoryCallerModal === 'planned') {
        setTimeout(() => {
          setShowPlannedModal(true);
        }, 100);
      }
      
      setCategoryCallerModal(null);
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

        {otherSubcategories.map((sub) => (
  <TouchableOpacity
    key={sub}
    onPress={() => {
      setExpenseCategory(sub);
      
      if (categoryCallerModal === 'planned') {
        setNewPlannedCategory(sub);
      }
      
      setCategoryModalVisible(false);
      
      // ✅ Re-show planned modal
      if (categoryCallerModal === 'planned') {
        setTimeout(() => {
          setShowPlannedModal(true);
        }, 100);
      }
      
      setCategoryCallerModal(null);
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
  onRequestClose={() => {
    setShowExpenseDetailModal(false);
    setIsEditMode(false);
  }}
>
  <Pressable
    style={styles.modalOverlay}
    onPress={() => {
      if (!isEditMode) {
        setShowExpenseDetailModal(false);
      }
    }}
  >
    <Pressable style={[styles.modalContainer, { alignItems: "stretch" }]} onPress={() => {}}>
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
            {isEditMode ? "Edit Expense" : "Expense Details"}
          </Text>

          {!isEditMode ? (
            // VIEW MODE
            <>
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
                {/* 💰 Amount */}
                <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 10 }}>
                  <MaterialCommunityIcons name="currency-php" size={20} color="#2563EB" />
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: "600",
                      marginLeft: 8,
                      color: selectedExpense.overspent ? "#dc2626" : "#1E293B",
                    }}
                  >
                    ₱
                    {Number(selectedExpense.amount || 0).toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                    })}
                  </Text>
                </View>

                {/* 🏷 Category */}
                <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 10 }}>
                  {getCategoryIconComponent(selectedExpense.category || "Others")}
                  <Text
                    style={{
                      fontSize: 15,
                      marginLeft: 8,
                      color: selectedExpense.overspent ? "#b91c1c" : "#1E293B",
                      fontWeight: selectedExpense.overspent ? "600" : "400",
                    }}
                  >
                    {capitalize(selectedExpense.category || "Others")}
                  </Text>
                </View>

                {/* ⚠️ Overspend (only show if > 0) */}
                {selectedExpense.overspent && selectedExpense.overspent > 0 && (
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
                      Overspent this period by ₱
                      {Number(selectedExpense.overspent).toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                      })}
                    </Text>
                  </View>
                )}

                {/* 📅 Date */}
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <Ionicons name="calendar-outline" size={20} color="#2563EB" />
                  <Text style={{ fontSize: 15, marginLeft: 8 }}>
                    {selectedExpense.date
                      ? (() => {
                          const d = new Date(selectedExpense.date);
                          const dateStr = d.toLocaleDateString([], {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          });
                          const timeStr =
                            d.getHours() === 0 && d.getMinutes() === 0
                              ? ""
                              : `, ${d.toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}`;
                          return dateStr + timeStr;
                        })()
                      : "No date available"}
                  </Text>
                </View>

                {/* 📝 Notes */}
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
                      fontStyle: selectedExpense.notes?.trim() ? "normal" : "italic",
                    }}
                  >
                    {selectedExpense.notes?.trim()
                      ? selectedExpense.notes
                      : "No notes provided"}
                  </Text>
                </View>
              </View>

              {/* Action Buttons - View Mode */}
              <TouchableOpacity
                style={[
                  styles.submitButton,
                  { backgroundColor: "#2563EB", flexDirection: "row", alignItems: "center", justifyContent: "center", marginBottom: 2 }
                ]}
                onPress={() => {
                  setIsEditMode(true);
                  setEditAmount(selectedExpense.amount.toString());
                  setEditCategory(selectedExpense.category);
                  setEditNotes(selectedExpense.notes || "");
                  setEditDate(new Date(selectedExpense.date));
                }}
              >
                <Ionicons name="create-outline" size={18} color="#fff" style={{ marginRight: 6 }} />
                <Text style={styles.submitText}>Edit</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.submitButton,
                  { backgroundColor: "#DC2626", flexDirection: "row", alignItems: "center", justifyContent: "center", marginBottom: 8 }
                ]}
                onPress={handleDeleteExpense}
                disabled={isLoading}
              >
                <Ionicons name="trash-outline" size={18} color="#fff" style={{ marginRight: 6 }} />
                <Text style={styles.submitText}>{isLoading ? "Deleting..." : "Delete"}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.submitButton, { backgroundColor: "#94A3B8" }]}
                onPress={() => setShowExpenseDetailModal(false)}
              >
                <Text style={styles.submitText}>Close</Text>
              </TouchableOpacity>
            </>
          ) : (
            // EDIT MODE
            <>
              <View style={{ gap: 12, marginBottom: 16 }}>
                {/* Amount Input */}
                <View>
                  <Text style={{ fontSize: 12, color: "#64748B", marginBottom: 4, fontWeight: '600' }}>
                    Amount (₱)
                  </Text>
                  <TextInput
                    value={editAmount}
                    onChangeText={setEditAmount}
                    keyboardType="numeric"
                    placeholder="0.00"
                    style={styles.input}
                  />
                </View>

                {/* Category Picker */}
                <View>
                  <Text style={{ fontSize: 12, color: "#64748B", marginBottom: 4, fontWeight: '600' }}>
                    Category
                  </Text>
                  <TouchableOpacity
                    onPress={() => {
                      setExpenseCategory(editCategory);
                      setCategoryModalVisible(true);
                    }}
                    style={[styles.input, { justifyContent: 'center' }]}
                  >
                    <Text style={{ color: editCategory === 'Select Category' ? '#64748B' : '#1E293B' }}>
                      {editCategory}
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Notes Input */}
                <View>
                  <Text style={{ fontSize: 12, color: "#64748B", marginBottom: 4, fontWeight: '600' }}>
                    Notes (optional)
                  </Text>
                  <TextInput
                    value={editNotes}
                    onChangeText={setEditNotes}
                    placeholder="Add notes..."
                    multiline
                    style={[styles.input, { minHeight: 60, textAlignVertical: 'top' }]}
                  />
                </View>

                {/* Date Picker */}
                <View>
                  <Text style={{ fontSize: 12, color: "#64748B", marginBottom: 4, fontWeight: '600' }}>
                    Date
                  </Text>
                  {Platform.OS === 'web' ? (
                    <View style={styles.input}>
                      <input
                        type="date"
                        value={editDate ? editDate.toISOString().slice(0, 10) : ''}
                        onChange={(e) => setEditDate(e.target.value ? new Date(e.target.value) : null)}
                        style={{
                          border: 'none',
                          backgroundColor: 'transparent',
                          fontSize: '16px',
                          outline: 'none',
                          width: '100%',
                        }}
                      />
                    </View>
                  ) : (
                    <>
                      <TouchableOpacity
                        onPress={() => setShowEditDatePicker(true)}
                        style={styles.input}
                      >
                        <Text>{editDate ? editDate.toLocaleDateString() : 'Select Date'}</Text>
                      </TouchableOpacity>
                      {showEditDatePicker && (
                        <DateTimePicker
                          value={editDate || new Date()}
                          mode="date"
                          display="default"
                          onChange={(event: any, date?: Date) => {
                            setShowEditDatePicker(false);
                            if (event.type === 'set' && date) setEditDate(date);
                          }}
                        />
                      )}
                    </>
                  )}
                </View>
              </View>

              {/* Action Buttons - Edit Mode */}
              <View style={{ gap: 8, marginBottom: 5 }}>
                <TouchableOpacity
                  style={[styles.submitButton,
                  { backgroundColor: "#2563EB", flexDirection: "row", alignItems: "center", justifyContent: "center", marginBottom: 2 }]}
                  onPress={() => {
                    // Update the edited values back to the category picker
                    if (expenseCategory !== editCategory) {
                      setEditCategory(expenseCategory);
                    }
                    handleEditExpense();
                  }}
                  disabled={isLoading}
                >
                  <Text style={styles.submitText}>{isLoading ? "Saving..." : "Save Changes"}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.submitButton, { flex: 1, backgroundColor: "#94A3B8" }]}
                  onPress={() => {
                    setIsEditMode(false);
                    setEditAmount("");
                    setEditCategory("");
                    setEditNotes("");
                    setEditDate(null);
                  }}
                >
                  <Text style={styles.submitText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </>
      )}
    </Pressable>
  </Pressable>
</Modal>

{/* Update Category Modal to sync with edit mode */}
{categoryModalVisible && isEditMode && (
  <Modal
    visible={categoryModalVisible}
    transparent
    animationType="fade"
    onRequestClose={() => {
      setCategoryModalVisible(false);
      setEditCategory(expenseCategory);
    }}
  />
)}

{isListening && (
  <View
    style={{
      position: "absolute",
      bottom: isMobile ? 105 : 80,
      right: 16,
      backgroundColor: "#2563eb",
      borderRadius: 12,
      paddingVertical: 8,
      paddingHorizontal: 14,
      shadowColor: "#000",
      shadowOpacity: 0.2,
      shadowRadius: 8,
      elevation: 5,
      zIndex: 198,
    }}
  >
    <Text style={{ color: "#fff", fontSize: 13, fontWeight: "500" }}>
      🎧 Listening...
    </Text>
  </View>
)}

{/* 🎤 Voice Transcript Bubble */}
{voiceTranscript && (
  <View
    style={{
      position: "absolute",
      bottom: isMobile ? 105 : 80,
      right: 16,
      backgroundColor: "#1f4b81",
      borderRadius: 12,
      paddingVertical: 10,
      paddingHorizontal: 14,
      maxWidth: 250,
      shadowColor: "#000",
      shadowOpacity: 0.2,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 2 },
      elevation: 6,
      zIndex: 199,
    }}
  >
    {/* Speech bubble arrow */}
    <View
      style={{
        position: "absolute",
        bottom: -6,
        right: 20,
        width: 0,
        height: 0,
        borderLeftWidth: 6,
        borderRightWidth: 6,
        borderTopWidth: 8,
        borderLeftColor: "transparent",
        borderRightColor: "transparent",
        borderTopColor: "#1f4b81",
      }}
    />
    
    {/* Content */}
    <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 4 }}>
      <Ionicons name="checkmark-circle" size={14} color="#4ade80" />
      <Text style={{ color: "#4ade80", fontSize: 11, fontWeight: "600", marginLeft: 4 }}>
        Heard
      </Text>
    </View>
    
    <Text style={{ color: "#fff", fontSize: 13, lineHeight: 18 }} numberOfLines={2}>
      "{voiceTranscript}"
    </Text>
  </View>
)}



<TouchableOpacity
  onPress={async () => {
    if (isListening) {
      // ⏹️ Stop listening
      setIsListening(false);
      console.log("🛑 Stopping voice recognition manually...");
      if (window.stopRecognition) window.stopRecognition();
      return;
    }

    // ✅ Start recording directly
    try {
      setVoiceTranscript("");
      setShowVoiceTip(false);
      await startVoiceRecognition();
    } catch (err) {
      console.error("🎙️ Mic start failed:", err);
      Alert.alert("Error", "Microphone couldn't start. Try again.");
    }
  }}
  activeOpacity={0.8}
  style={{
    position: "absolute",
    bottom: isMobile ? 60 : 10,
    right: 16,
    backgroundColor: isListening ? "#EF4444" : "#1f4b81",
    borderRadius: 50,
    width: isMobile ? 35 : 45,
    height: isMobile ? 35 : 45,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 5,
    zIndex: 200,
  }}
>
  <Ionicons 
    name={isListening ? "stop" : "mic"} 
    size={28} 
    color="#fff" 
  />
</TouchableOpacity>



{/* 🎤 Voice Command Format Modal */}
<Modal
  visible={showVoiceFormatModal}
  transparent
  animationType="slide"
  onRequestClose={() => setShowVoiceFormatModal(false)}
>
  <Pressable 
    style={styles.modalOverlay} 
    onPress={() => setShowVoiceFormatModal(false)}
  >
    <Pressable 
      style={[
        styles.modalContainer, 
        { 
          maxWidth: isMobile ? '92%' : 380,
          maxHeight: isMobile ? '85%' : '90%',
          padding: isMobile ? 14 : 20,
        }
      ]} 
      onPress={() => {}}
    >
      {/* Compact Header */}
      <View style={{ alignItems: 'center', marginBottom: isMobile ? 12 : 16 }}>
        <View style={{
          width: isMobile ? 48 : 56,
          height: isMobile ? 48 : 56,
          borderRadius: isMobile ? 24 : 28,
          backgroundColor: '#EFF6FF',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: isMobile ? 8 : 10,
        }}>
          <Ionicons name="mic" size={isMobile ? 24 : 28} color="#2563EB" />
        </View>
        <Text style={{ 
          fontSize: isMobile ? 17 : 20, 
          fontWeight: '700', 
          color: '#1E293B',
        }}>
          Voice Commands
        </Text>
        <Text style={{ 
          fontSize: isMobile ? 12 : 14, 
          color: '#64748B', 
          textAlign: 'center',
          marginTop: 2,
        }}>
          Speak naturally to add expenses
        </Text>
      </View>

      <ScrollView 
        style={{ flex: 1 }} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 8 }}
      >
        {/* Command Format */}
        <View style={{
          backgroundColor: '#F0F9FF',
          borderRadius: isMobile ? 10 : 12,
          padding: isMobile ? 10 : 14,
          marginBottom: isMobile ? 10 : 12,
          borderWidth: 1,
          borderColor: '#BFDBFE',
        }}>
          <Text style={{ 
            fontSize: isMobile ? 13 : 14, 
            fontWeight: '600', 
            color: '#1E293B',
            marginBottom: isMobile ? 6 : 8,
            textAlign: 'center',
          }}>
            📝 Format
          </Text>
          <Text style={{
            fontSize: isMobile ? 14 : 16,
            fontWeight: '700',
            color: '#2563EB',
            textAlign: 'center',
            marginBottom: 4,
          }}>
            "Add [amount] [category]"
          </Text>
          <Text style={{
            fontSize: isMobile ? 11 : 12,
            color: '#475569',
            textAlign: 'center',
            fontStyle: 'italic',
          }}>
            + optional "note [text]"
          </Text>
        </View>

        {/* Compact Examples */}
        <View style={{ marginBottom: isMobile ? 10 : 12 }}>
          <Text style={{ 
            fontSize: isMobile ? 12 : 13, 
            fontWeight: '600', 
            color: '#1E293B',
            marginBottom: isMobile ? 6 : 8,
          }}>
            💡 Examples:
          </Text>
          
          {[
            { text: '"Add 150 food"', icon: 'fast-food', color: '#F59E0B' },
            { text: '"Add 50 transport note jeep"', icon: 'car', color: '#3B82F6' },
            { text: '"Add 200 bills note electric"', icon: 'document-text', color: '#EF4444' },
          ].map((example, idx) => (
            <View 
              key={idx}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: '#F8FAFC',
                borderRadius: isMobile ? 8 : 10,
                padding: isMobile ? 8 : 10,
                marginBottom: isMobile ? 6 : 8,
              }}
            >
              <View style={{
                width: isMobile ? 28 : 32,
                height: isMobile ? 28 : 32,
                borderRadius: isMobile ? 14 : 16,
                backgroundColor: example.color + '22',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: isMobile ? 8 : 10,
              }}>
                <Ionicons name={example.icon as any} size={isMobile ? 14 : 16} color={example.color} />
              </View>
              <Text style={{ 
                fontSize: isMobile ? 12 : 13, 
                color: '#1E293B',
                flex: 1,
              }}>
                {example.text}
              </Text>
            </View>
          ))}
        </View>

        {/* Compact Categories */}
        <View style={{
          backgroundColor: '#FEFCE8',
          borderRadius: isMobile ? 8 : 10,
          padding: isMobile ? 8 : 10,
          marginBottom: isMobile ? 10 : 12,
          borderWidth: 1,
          borderColor: '#FDE68A',
        }}>
          <Text style={{ 
            fontSize: isMobile ? 11 : 12, 
            fontWeight: '600', 
            color: '#854D0E',
            marginBottom: 4,
          }}>
            Categories:
          </Text>
          <Text style={{ 
            fontSize: isMobile ? 10 : 11, 
            color: '#713F12', 
            lineHeight: isMobile ? 14 : 16,
          }}>
            Food • Transport • Bills • School • Shopping • Savings • Others
          </Text>
        </View>
      </ScrollView>

      {/* Compact Action Buttons */}
      <View style={{ gap: isMobile ? 6 : 8, marginTop: isMobile ? 8 : 10 }}>
        <TouchableOpacity
          style={{
            backgroundColor: '#2563EB',
            borderRadius: isMobile ? 10 : 12,
            paddingVertical: isMobile ? 10 : 12,
            alignItems: 'center',
            shadowColor: '#2563EB',
            shadowOpacity: 0.3,
            shadowRadius: 8,
            shadowOffset: { width: 0, height: 2 },
            elevation: 4,
          }}
          onPress={() => {
            setShowVoiceFormatModal(false);
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name="checkmark-circle" size={isMobile ? 16 : 18} color="#fff" style={{ marginRight: 6 }} />
            <Text style={{ 
              color: '#fff', 
              fontSize: isMobile ? 14 : 15, 
              fontWeight: '600',
            }}>
              Got It!
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={{
            backgroundColor: '#F1F5F9',
            borderRadius: isMobile ? 10 : 12,
            paddingVertical: isMobile ? 10 : 12,
            alignItems: 'center',
          }}
          onPress={() => setShowVoiceFormatModal(false)}
        >
          <Text style={{ 
            color: '#475569', 
            fontSize: isMobile ? 13 : 14, 
            fontWeight: '600',
          }}>
            Close
          </Text>
        </TouchableOpacity>
      </View>

      {/* Compact Tip */}
      <View style={{
        marginTop: isMobile ? 8 : 10,
        padding: isMobile ? 8 : 10,
        backgroundColor: '#F0F9FF',
        borderRadius: isMobile ? 6 : 8,
        borderLeftWidth: 2,
        borderLeftColor: '#0EA5E9',
      }}>
        <Text style={{ 
          fontSize: isMobile ? 10 : 11, 
          color: '#0C4A6E', 
          textAlign: 'center',
          lineHeight: isMobile ? 14 : 16,
        }}>
          💬 You can also chat! Say "hi" or ask for help.
        </Text>
      </View>
    </Pressable>
  </Pressable>
</Modal>

{/* 📸 Scan Receipt Guide Modal */}
<Modal
  visible={showScanGuideModal}
  transparent
  animationType="slide"
  onRequestClose={() => setShowScanGuideModal(false)}
>
  <Pressable 
    style={styles.modalOverlay} 
    onPress={() => setShowScanGuideModal(false)}
  >
    <Pressable 
      style={[
        styles.modalContainer, 
        { 
          maxWidth: isMobile ? '92%' : 380,
          maxHeight: isMobile ? '85%' : '90%',
          padding: isMobile ? 14 : 20,
        }
      ]} 
      onPress={() => {}}
    >
      {/* Header */}
      <View style={{ alignItems: 'center', marginBottom: isMobile ? 12 : 16 }}>
        <View style={{
          width: isMobile ? 48 : 56,
          height: isMobile ? 48 : 56,
          borderRadius: isMobile ? 24 : 28,
          backgroundColor: '#EFF6FF',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: isMobile ? 8 : 10,
        }}>
          <Ionicons name="camera" size={isMobile ? 24 : 28} color="#2563EB" />
        </View>
        <Text style={{ 
          fontSize: isMobile ? 17 : 20, 
          fontWeight: '700', 
          color: '#1E293B',
        }}>
          Scan Receipt Guide
        </Text>
        <Text style={{ 
          fontSize: isMobile ? 12 : 14, 
          color: '#64748B', 
          textAlign: 'center',
          marginTop: 2,
        }}>
          Auto-detect amounts from receipts
        </Text>
      </View>

      <ScrollView 
        style={{ flex: 1 }} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 8 }}
      >
        {/* Step 1: Open Scanner */}
        <View style={{
          backgroundColor: '#F0F9FF',
          borderRadius: isMobile ? 10 : 12,
          padding: isMobile ? 10 : 14,
          marginBottom: isMobile ? 10 : 12,
          borderLeftWidth: 3,
          borderLeftColor: '#2563EB',
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
            <View style={{
              width: isMobile ? 24 : 28,
              height: isMobile ? 24 : 28,
              borderRadius: isMobile ? 12 : 14,
              backgroundColor: '#2563EB',
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: 8,
            }}>
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: isMobile ? 12 : 14 }}>1</Text>
            </View>
            <Text style={{ 
              fontSize: isMobile ? 13 : 14, 
              fontWeight: '700', 
              color: '#1E293B',
            }}>
              Open Scanner
            </Text>
          </View>
          <Text style={{
            fontSize: isMobile ? 11 : 12,
            color: '#475569',
            lineHeight: isMobile ? 16 : 18,
            marginLeft: isMobile ? 32 : 36,
          }}>
            Tap "📸 Scan Receipt" button when adding an expense
          </Text>
        </View>

        {/* Step 2: Choose Source */}
        <View style={{
          backgroundColor: '#F0FDF4',
          borderRadius: isMobile ? 10 : 12,
          padding: isMobile ? 10 : 14,
          marginBottom: isMobile ? 10 : 12,
          borderLeftWidth: 3,
          borderLeftColor: '#16A34A',
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
            <View style={{
              width: isMobile ? 24 : 28,
              height: isMobile ? 24 : 28,
              borderRadius: isMobile ? 12 : 14,
              backgroundColor: '#16A34A',
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: 8,
            }}>
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: isMobile ? 12 : 14 }}>2</Text>
            </View>
            <Text style={{ 
              fontSize: isMobile ? 13 : 14, 
              fontWeight: '700', 
              color: '#1E293B',
            }}>
              Choose Source
            </Text>
          </View>
          <View style={{ marginLeft: isMobile ? 32 : 36, gap: 6 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="camera" size={isMobile ? 14 : 16} color="#16A34A" style={{ marginRight: 6 }} />
              <Text style={{
                fontSize: isMobile ? 11 : 12,
                color: '#475569',
                flex: 1,
              }}>
                <Text style={{ fontWeight: '600' }}>Camera:</Text> Take a new photo
              </Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="images" size={isMobile ? 14 : 16} color="#16A34A" style={{ marginRight: 6 }} />
              <Text style={{
                fontSize: isMobile ? 11 : 12,
                color: '#475569',
                flex: 1,
              }}>
                <Text style={{ fontWeight: '600' }}>Photos:</Text> Upload from gallery
              </Text>
            </View>
          </View>
        </View>

        {/* Step 3: Capture Receipt */}
        <View style={{
          backgroundColor: '#FEF3C7',
          borderRadius: isMobile ? 10 : 12,
          padding: isMobile ? 10 : 14,
          marginBottom: isMobile ? 10 : 12,
          borderLeftWidth: 3,
          borderLeftColor: '#F59E0B',
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
            <View style={{
              width: isMobile ? 24 : 28,
              height: isMobile ? 24 : 28,
              borderRadius: isMobile ? 12 : 14,
              backgroundColor: '#F59E0B',
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: 8,
            }}>
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: isMobile ? 12 : 14 }}>3</Text>
            </View>
            <Text style={{ 
              fontSize: isMobile ? 13 : 14, 
              fontWeight: '700', 
              color: '#1E293B',
            }}>
              Capture Receipt
            </Text>
          </View>
          <Text style={{
            fontSize: isMobile ? 11 : 12,
            color: '#475569',
            lineHeight: isMobile ? 16 : 18,
            marginLeft: isMobile ? 32 : 36,
          }}>
            Make sure the receipt is clear, well-lit, and the text is readable
          </Text>
        </View>

        {/* Step 4: Review & Confirm */}
        <View style={{
          backgroundColor: '#FEE2E2',
          borderRadius: isMobile ? 10 : 12,
          padding: isMobile ? 10 : 14,
          marginBottom: isMobile ? 10 : 12,
          borderLeftWidth: 3,
          borderLeftColor: '#EF4444',
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
            <View style={{
              width: isMobile ? 24 : 28,
              height: isMobile ? 24 : 28,
              borderRadius: isMobile ? 12 : 14,
              backgroundColor: '#EF4444',
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: 8,
            }}>
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: isMobile ? 12 : 14 }}>4</Text>
            </View>
            <Text style={{ 
              fontSize: isMobile ? 13 : 14, 
              fontWeight: '700', 
              color: '#1E293B',
            }}>
              Review & Confirm
            </Text>
          </View>
          <Text style={{
            fontSize: isMobile ? 11 : 12,
            color: '#475569',
            lineHeight: isMobile ? 16 : 18,
            marginLeft: isMobile ? 32 : 36,
          }}>
            The app will auto-detect the amount and category. Verify and adjust if needed before saving
          </Text>
        </View>

        {/* Tips Section */}
        <View style={{
          backgroundColor: '#F8FAFC',
          borderRadius: isMobile ? 10 : 12,
          padding: isMobile ? 10 : 14,
          marginBottom: isMobile ? 10 : 12,
          borderWidth: 1,
          borderColor: '#E2E8F0',
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
            <Ionicons name="bulb" size={isMobile ? 16 : 18} color="#F59E0B" style={{ marginRight: 6 }} />
            <Text style={{ 
              fontSize: isMobile ? 12 : 13, 
              fontWeight: '700', 
              color: '#1E293B',
            }}>
              Tips for Better Results
            </Text>
          </View>
          
          <View style={{ gap: 6, marginLeft: isMobile ? 22 : 24 }}>
            {[
              'Ensure good lighting',
              'Avoid shadows and glare',
              'Keep receipt flat and straight',
              'Focus on the total amount area',
              'Works with printed & digital receipts',
            ].map((tip, idx) => (
              <View key={idx} style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                <Text style={{ color: '#2563EB', marginRight: 6, fontSize: isMobile ? 11 : 12 }}>•</Text>
                <Text style={{ 
                  fontSize: isMobile ? 10 : 11, 
                  color: '#475569',
                  flex: 1,
                  lineHeight: isMobile ? 14 : 16,
                }}>
                  {tip}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* What Gets Detected */}
        <View style={{
          backgroundColor: '#ECFDF5',
          borderRadius: isMobile ? 10 : 12,
          padding: isMobile ? 10 : 14,
          borderWidth: 1,
          borderColor: '#A7F3D0',
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
            <Ionicons name="checkmark-circle" size={isMobile ? 16 : 18} color="#10B981" style={{ marginRight: 6 }} />
            <Text style={{ 
              fontSize: isMobile ? 12 : 13, 
              fontWeight: '700', 
              color: '#1E293B',
            }}>
              What Gets Detected
            </Text>
          </View>
          
          <View style={{ gap: 4, marginLeft: isMobile ? 22 : 24 }}>
            <Text style={{ 
              fontSize: isMobile ? 10 : 11, 
              color: '#475569',
              lineHeight: isMobile ? 14 : 16,
            }}>
              <Text style={{ fontWeight: '600' }}>✓ Amount:</Text> Subtotal, total, or transaction amount
            </Text>
            <Text style={{ 
              fontSize: isMobile ? 10 : 11, 
              color: '#475569',
              lineHeight: isMobile ? 14 : 16,
            }}>
              <Text style={{ fontWeight: '600' }}>✓ Category:</Text> Auto-suggested based on merchant
            </Text>
            <Text style={{ 
              fontSize: isMobile ? 10 : 11, 
              color: '#475569',
              lineHeight: isMobile ? 14 : 16,
            }}>
              <Text style={{ fontWeight: '600' }}>✓ Date:</Text> Defaults to today (adjustable)
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Action Buttons */}
      <View style={{ gap: isMobile ? 6 : 8, marginTop: isMobile ? 8 : 10 }}>
        <TouchableOpacity
          style={{
            backgroundColor: '#2563EB',
            borderRadius: isMobile ? 10 : 12,
            paddingVertical: isMobile ? 10 : 12,
            alignItems: 'center',
            shadowColor: '#2563EB',
            shadowOpacity: 0.3,
            shadowRadius: 8,
            shadowOffset: { width: 0, height: 2 },
            elevation: 4,
          }}
          onPress={() => {
            setShowScanGuideModal(false);
            setTimeout(() => {
              handleScanReceipt();
            }, 300);
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name="camera" size={isMobile ? 16 : 18} color="#fff" style={{ marginRight: 6 }} />
            <Text style={{ 
              color: '#fff', 
              fontSize: isMobile ? 14 : 15, 
              fontWeight: '600',
            }}>
              Try Scanning Now
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={{
            backgroundColor: '#F1F5F9',
            borderRadius: isMobile ? 10 : 12,
            paddingVertical: isMobile ? 10 : 12,
            alignItems: 'center',
          }}
          onPress={() => setShowScanGuideModal(false)}
        >
          <Text style={{ 
            color: '#475569', 
            fontSize: isMobile ? 13 : 14, 
            fontWeight: '600',
          }}>
            Close
          </Text>
        </TouchableOpacity>
      </View>

      {/* Voice Command Tip */}
      <View style={{
        marginTop: isMobile ? 8 : 10,
        padding: isMobile ? 8 : 10,
        backgroundColor: '#F0F9FF',
        borderRadius: isMobile ? 6 : 8,
        borderLeftWidth: 2,
        borderLeftColor: '#0EA5E9',
      }}>
        <Text style={{ 
          fontSize: isMobile ? 10 : 11, 
          color: '#0C4A6E', 
          textAlign: 'center',
          lineHeight: isMobile ? 14 : 16,
        }}>
          💬 Say "scan guide" anytime to see this again
        </Text>
      </View>
    </Pressable>
  </Pressable>
</Modal>

{/* View All Deals Modal - Android Optimized */}
{/* View All Deals Modal - Complete with Proper Closing */}
<Modal
  visible={showDealsModal}
  transparent
  animationType="slide"
  onRequestClose={() => setShowDealsModal(false)}
>
  <Pressable
    style={{
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      padding: 16,
    }}
    onPress={() => setShowDealsModal(false)}
  >
    <Pressable
      onPress={(e) => e.stopPropagation()}
      style={{
        backgroundColor: '#fff',
        borderRadius: 20,
        width: '100%',
        maxWidth: isMobile ? 360 : 480,
        maxHeight: '80%',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <View style={{ 
        flexDirection: 'row', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
        backgroundColor: '#fff',
      }}>
        <View style={{ flex: 1 }}>
          <Text style={{ 
            fontWeight: 'bold', 
            fontSize: 16,
            color: '#1E293B',
          }}>
            Available Deals
          </Text>
          <Text style={{ 
            fontSize: 11,
            color: '#64748B', 
            marginTop: 2 
          }}>
            {selectedPlannedDeals?.length || 0} options • Tap to select
          </Text>
        </View>
        <TouchableOpacity 
          onPress={() => setShowDealsModal(false)}
          style={{
            padding: 4,
          }}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="close" size={24} color="#64748B" />
        </TouchableOpacity>
      </View>
      
      {/* Deals List */}
      <ScrollView 
        style={{ flex: 1 }}
        contentContainerStyle={{ 
          padding: 16,
          paddingBottom: 8,
        }}
        showsVerticalScrollIndicator={true}
        nestedScrollEnabled={true}
      >
        {selectedPlannedDeals && selectedPlannedDeals.length > 0 ? (
          selectedPlannedDeals
            .sort((a, b) => (a.price || 0) - (b.price || 0))
            .map((deal, idx) => {
              if (!deal) return null;
              
              const isCurrentSelection = selectedPlannedItem?.marketplaceData?.dealId === deal._id;
              const isLowest = idx === 0;
              
              return (
                <TouchableOpacity
                  key={deal._id || `deal-${idx}`}
                  onPress={() => {
                    if (selectedPlannedItem) {
                      const updated = plannedExpenses.map(p => {
                        if (p.id === selectedPlannedItem.id) {
                          return {
                            ...p,
                            actualAmount: deal.price,
                            marketplaceData: {
                              dealId: deal._id,
                              itemName: deal.itemName,
                              storeName: deal.storeName,
                              price: deal.price,
                              stock: deal.stock,
                              unit: deal.unit,
                              category: deal.category,
                              distance: deal.distance,
                              allDeals: selectedPlannedDeals,
                            },
                          };
                        }
                        return p;
                      });
                      
                      savePlannedExpenses(updated);
                      setShowDealsModal(false);
                      
                      Alert.alert(
                        "✅ Deal Updated",
                        `Now using ${deal.storeName} at ₱${deal.price?.toFixed(2) || '0.00'}`
                      );
                    }
                  }}
                  style={{
                    backgroundColor: isCurrentSelection ? '#EFF6FF' : (isLowest ? '#F0FDF4' : '#fff'),
                    borderRadius: 12,
                    padding: 12,
                    marginBottom: 8,
                    borderWidth: isCurrentSelection ? 2 : 1,
                    borderColor: isCurrentSelection ? '#2563EB' : (isLowest ? '#16A34A' : '#E5E7EB'),
                    elevation: 2,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.1,
                    shadowRadius: 2,
                  }}
                  activeOpacity={0.7}
                >
                  {/* Top Row: Item Info & Price */}
                  <View style={{ 
                    flexDirection: 'row', 
                    justifyContent: 'space-between', 
                    alignItems: 'flex-start',
                    marginBottom: 8,
                  }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ 
                        fontSize: 14, 
                        fontWeight: '600', 
                        color: '#1E293B',
                        marginBottom: 4,
                      }}>
                        {deal.itemName || 'Unknown Item'}
                      </Text>
                      <View style={{ 
                        flexDirection: 'row', 
                        alignItems: 'center',
                        marginBottom: 2,
                      }}>
                        <Ionicons name="storefront-outline" size={12} color="#6B7280" />
                        <Text style={{ 
                          fontSize: 12, 
                          color: '#6B7280', 
                          marginLeft: 4,
                        }}>
                          {deal.storeName || 'Unknown Store'}
                        </Text>
                      </View>
                      {deal.distance && (
                        <View style={{ 
                          flexDirection: 'row', 
                          alignItems: 'center',
                          marginTop: 2,
                        }}>
                          <Ionicons name="location-outline" size={11} color="#9CA3AF" />
                          <Text style={{ fontSize: 11, color: '#6B7280', marginLeft: 2 }}>
                            {(deal.distance / 1000).toFixed(2)} km away
                          </Text>
                        </View>
                      )}
                    </View>
                    
                    {/* Price & Badges */}
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={{ 
                        fontSize: 16, 
                        fontWeight: '700', 
                        color: isCurrentSelection ? '#2563EB' : (isLowest ? '#16A34A' : '#1E293B'),
                        marginBottom: 4,
                      }}>
                        ₱{deal.price?.toFixed(2) || '0.00'}
                      </Text>
                      
                      {/* Lowest Badge */}
                      {isLowest && !isCurrentSelection && (
                        <View style={{
                          backgroundColor: '#16A34A',
                          flexDirection: 'row',
                          alignItems: 'center',
                          paddingHorizontal: 6,
                          paddingVertical: 2,
                          borderRadius: 6,
                          marginBottom: 2,
                        }}>
                          <Ionicons name="star" size={9} color="#fff" />
                          <Text style={{ 
                            color: '#fff', 
                            fontSize: 9, 
                            fontWeight: '700',
                            marginLeft: 2,
                          }}>
                            Lowest
                          </Text>
                        </View>
                      )}
                      
                      {/* Selected Badge */}
                      {isCurrentSelection && (
                        <View style={{
                          backgroundColor: '#2563EB',
                          flexDirection: 'row',
                          alignItems: 'center',
                          paddingHorizontal: 6,
                          paddingVertical: 2,
                          borderRadius: 6,
                          marginBottom: 2,
                        }}>
                          <Ionicons name="checkmark-circle" size={10} color="#fff" />
                          <Text style={{ 
                            color: '#fff', 
                            fontSize: 9, 
                            fontWeight: '700',
                            marginLeft: 2,
                          }}>
                            Selected
                          </Text>
                        </View>
                      )}
                      
                      {/* Stock Badge */}
                      <View style={{
                        backgroundColor: deal.stock ? '#DCFCE7' : '#FEE2E2',
                        borderWidth: 1,
                        borderColor: deal.stock ? '#BBF7D0' : '#FECACA',
                        borderRadius: 6,
                        paddingHorizontal: 6,
                        paddingVertical: 2,
                        flexDirection: 'row',
                        alignItems: 'center',
                      }}>
                        <Ionicons 
                          name={deal.stock ? "checkmark-circle" : "close-circle"} 
                          size={9} 
                          color={deal.stock ? "#16A34A" : "#DC2626"} 
                        />
                        <Text style={{
                          fontSize: 9,
                          fontWeight: '600',
                          color: deal.stock ? '#16A34A' : '#DC2626',
                          marginLeft: 2,
                        }}>
                          {deal.stock ? 'In Stock' : 'Out of Stock'}
                        </Text>
                      </View>
                    </View>
                  </View>
                  
                  {/* Unit */}
                  {deal.unit && (
                    <Text style={{ 
                      fontSize: 11, 
                      color: '#9CA3AF',
                      marginTop: 4,
                    }}>
                      Unit: {deal.unit}
                    </Text>
                  )}
                </TouchableOpacity>
              );
            })
        ) : (
          <View style={{ 
            padding: 40, 
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <Ionicons name="cart-outline" size={48} color="#CBD5E1" />
            <Text style={{ 
              color: '#64748B', 
              fontSize: 14,
              marginTop: 12,
              textAlign: 'center',
            }}>
              No deals available
            </Text>
          </View>
        )}
      </ScrollView>
      
      {/* Close Button */}
      <View style={{ 
        padding: 16, 
        backgroundColor: '#fff',
        borderTopWidth: 1,
        borderTopColor: '#E5E7EB',
      }}>
        <TouchableOpacity
          style={{
            backgroundColor: '#94A3B8',
            borderRadius: 12,
            paddingVertical: 12,
            alignItems: 'center',
          }}
          onPress={() => setShowDealsModal(false)}
        >
          <Text style={{ 
            color: '#fff', 
            fontWeight: '600',
            fontSize: 14,
          }}>
            Close
          </Text>
        </TouchableOpacity>
      </View>
    </Pressable>
  </Pressable>
</Modal>

  </View>
  );
  
}

const styles = StyleSheet.create({

  container: {
    flex: 1,
    backgroundColor: '#f3f6fa',
    
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
    marginTop: Platform.OS === 'ios' ? 20 : Platform.OS === 'web' ? 40 : 45,
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
voiceHintBox: {
  flexDirection: "row",
  alignItems: "flex-start",
  backgroundColor: "#EFF6FF",
  borderColor: "#BFDBFE",
  borderWidth: 1,
  borderRadius: 10,
  padding: 10,
  marginHorizontal: 16,
  marginTop: 10,
  gap: 6,
},
voiceHintText: {
  flex: 1,
  color: "#1e3a8a",
  fontSize: 13,
  fontWeight: "500",
  lineHeight: 18,
},
scrollContent: {
  paddingBottom: 25,   
},
plannedCard: {
  backgroundColor: '#F0F9FF',
  borderRadius: 16,
  marginHorizontal: 16,
  marginBottom: 16,
  borderWidth: 1,
  borderColor: '#BFDBFE',
  overflow: 'hidden',
},
plannedHeader: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: 14,
},
plannedHeaderLeft: {
  flexDirection: 'row',
  alignItems: 'center',
  flex: 1,
},
plannedTitle: {
  fontSize: 15,
  fontWeight: '700',
  color: '#1E293B',
},
plannedSubtitle: {
  fontSize: 12,
  color: '#64748B',
  marginTop: 2,
},
plannedContent: {
  padding: 14,
  paddingTop: 0,
  gap: 10,
},
plannedItem: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  backgroundColor: '#fff',
  padding: 12,
  borderRadius: 12,
  borderWidth: 1,
  borderColor: '#E2E8F0',
},
plannedItemLeft: {
  flexDirection: 'row',
  alignItems: 'center',
  flex: 1,
  gap: 10,
},
plannedItemName: {
  fontSize: 14,
  fontWeight: '600',
  color: '#1E293B',
  marginBottom: 4,
},
plannedItemAmount: {
  fontSize: 13,
  color: '#2563EB',
  fontWeight: '600',
},
plannedItemActions: {
  flexDirection: 'row',
  gap: 8,
},
plannedActionBtn: {
  width: 32,
  height: 32,
  borderRadius: 16,
  alignItems: 'center',
  justifyContent: 'center',
  borderWidth: 1,
  borderColor: '#E5E7EB',
},
marketplaceBadge: {
  flexDirection: 'row',
  alignItems: 'center',
  backgroundColor: '#DCFCE7',
  borderWidth: 1,
  borderColor: '#BBF7D0',
  borderRadius: 6,
  paddingHorizontal: 6,
  paddingVertical: 2,
  gap: 3,
},
marketplaceBadgeText: {
  fontSize: 9,
  fontWeight: '600',
  color: '#16A34A',
},
addPlannedBtn: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: '#fff',
  borderWidth: 1.5,
  borderColor: '#2563EB',
  borderStyle: 'dashed',
  borderRadius: 12,
  padding: 12,
  gap: 8,
},
addPlannedBtnText: {
  fontSize: 14,
  fontWeight: '600',
  color: '#2563EB',
},
emptyPlannedText: {
  textAlign: 'center',
  color: '#94A3B8',
  fontSize: 13,
  fontStyle: 'italic',
  paddingVertical: 12,
},
recurringToggle: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  backgroundColor: '#F8FAFC',
  borderRadius: 10,
  padding: 12,
  marginBottom: 12,
  borderWidth: 1,
  borderColor: '#E2E8F0',
},
checkbox: {
  width: 24,
  height: 24,
  borderRadius: 6,
  borderWidth: 2,
  borderColor: '#CBD5E1',
  alignItems: 'center',
  justifyContent: 'center',
},
checkboxActive: {
  backgroundColor: '#2563EB',
  borderColor: '#2563EB',
},

 // 👇 ADD THESE NEW STYLES HERE
  dealCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dealInfo: {
    flex: 1,
    marginRight: 12,
  },
  storeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 4,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 2,
  },
  storeName: {
    fontSize: 12,
    color: '#6B7280',
    marginLeft: 4,
  },
  priceSection: {
    alignItems: 'flex-end',
  },
  price: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
  },

});