// ✅ Extend the Window interface to include our custom property
declare global {
  interface Window {
    _storeRecognition?: any;
  }
}

import React, { useEffect, useState } from "react";
import { router } from "expo-router";
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  StyleSheet,
  Modal,
  Pressable,
  ScrollView,
  StatusBar,
  Dimensions,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from 'expo-linear-gradient';
import api from "../lib/api";
import UniversalMap from "../components/UniversalMap";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { checkStoreAuth } from "../lib/checkStoreAuth";
import { Platform } from 'react-native';
// Voice Recognition Setup with proper typing
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

const STORE_CATEGORY_ALIASES = {
  "instant noodles": ["noodles", "noodle", "instant", "pancit", "lucky me", "instant noodles"],
  "canned goods": ["canned", "can", "sardines", "corned beef", "spam", "canned goods"],
  "snacks": ["snack", "snacks", "chips", "biscuit", "cookie", "candy", "chocolate"],
  "beverages": ["beverage", "beverages", "drink", "drinks", "soda", "juice", "coffee", "tea", "water"],
  "cooking essentials": ["cooking", "oil", "salt", "sugar", "flour", "spices", "egg", "eggs", "cooking essentials"],
  "personal care": ["personal", "soap", "shampoo", "toothpaste", "deodorant", "personal care"],
  "household": ["household", "cleaner", "tissue", "paper"],
  "laundry": ["laundry", "detergent", "fabric", "softener"],
  "medicine": ["medicine", "med", "paracetamol", "biogesic", "vitamins"],
  "school supplies": ["school", "notebook", "pen", "pencil", "paper", "school supplies"],
  "condiments": ["condiment", "condiments", "sauce", "vinegar", "ketchup", "soy sauce"],
  "other": ["other", "others", "misc"],
};


const STORE_UNIT_ALIASES = {
  "piece": ["piece", "pieces", "pc", "pcs"],
  "kilo": ["kilo", "kilogram", "kg"],
  "gram": ["gram", "grams", "g"],
  "liter": ["liter", "liters", "l"],
  "ml": ["ml", "milliliter"],
  "pack": ["pack", "packs", "sachet"],
  "dozen": ["dozen", "dozens"],
  "other": ["other"],
};

const STORE_CATEGORY_LOOKUP: Record<string, string> = Object.entries(STORE_CATEGORY_ALIASES).reduce(
  (acc, [canon, list]) => {
    list.forEach((alias) => (acc[alias.toLowerCase()] = canon));
    return acc;
  },
  {} as Record<string, string>
);


const STORE_UNIT_LOOKUP: Record<string, string> = Object.entries(STORE_UNIT_ALIASES).reduce(
  (acc, [canon, list]) => {
    list.forEach((alias) => (acc[alias.toLowerCase()] = canon));
    return acc;
  },
  {} as Record<string, string>
);

// 🗣 Browser voice feedback for confirmations
function speak(text: string) {
  if ('speechSynthesis' in window) {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-PH';  // or 'en-US'
    utterance.rate = 1.1;
    utterance.pitch = 1.0;
    speechSynthesis.speak(utterance);
  } else {
    console.warn('Speech synthesis not supported in this browser.');
  }
}

let DateTimePicker: any = () => null;
if (Platform.OS !== 'web') {
  DateTimePicker = require('@react-native-community/datetimepicker').default;
}
const { width } = Dimensions.get('window');
const numColumns = width > 768 ? 5 : width > 480 ? 3 : 2;

type Item = {
  _id: string;
  storeName: string;
  itemName: string;
  price: number;
  unit: string;
  currency: string;
  category?: string;
};

type StoreLocation = {
  lat: number;
  lng: number;
};

const StoreDashboard = () => {

  useEffect(() => {
  checkStoreAuth(); // ✅ Blocks access if token is invalid or expired
}, []);

  const [confirmVisible, setConfirmVisible] = useState(false);
  const [storeName, setStoreName] = useState<string | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
 const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);
const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
const [deleteDealConfirmVisible, setDeleteDealConfirmVisible] = useState(false);
const [deleteDealTargetId, setDeleteDealTargetId] = useState<string | null>(null);

const [addDealModalVisible, setAddDealModalVisible] = useState(false);
const [dealMessage, setDealMessage] = useState("");
const [dealDiscount, setDealDiscount] = useState("");
// Remove: dealItemName and dealPrice (we'll use selectedDealItem instead)  
const [deals, setDeals] = useState([]);
const [selectedDealItem, setSelectedDealItem] = useState<Item | null>(null);
const [showItemPicker, setShowItemPicker] = useState(false);
const [dealStartDate, setDealStartDate] = useState("");
const [dealEndDate, setDealEndDate] = useState("");
const [dealItemSearch, setDealItemSearch] = useState("");
  // Form state
  const [itemName, setItemName] = useState("");
  const [price, setPrice] = useState("");
  const [unit, setUnit] = useState("piece");
  const [category, setCategory] = useState("other");
  const [location, setLocation] = useState<StoreLocation | null>(null);
  const [locationVisible, setLocationVisible] = useState(false);

  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
const [showEndDatePicker, setShowEndDatePicker] = useState(false);
const [startDate, setStartDate] = useState(new Date());
const [endDate, setEndDate] = useState(new Date());

// Add these to your existing useState declarations
const [isListening, setIsListening] = useState(false);
const [voiceTranscript, setVoiceTranscript] = useState("");
const [hasSpokenHint, setHasSpokenHint] = useState(false);

  // Filter state
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>("all");

  // Edit modal state
  const [editItem, setEditItem] = useState<Item | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  // ADD ITEM MODAL STATE
  const [addItemModalVisible, setAddItemModalVisible] = useState(false);

  // Dropdown state for category selection
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [showEditCategoryDropdown, setShowEditCategoryDropdown] = useState(false);

  // Fetch store name & items
  const fetchItems = async () => {
    setLoading(true);
    try {
      const storedName = await AsyncStorage.getItem("storeName");
      if (!storedName) {
        Alert.alert("Error", "No logged-in store found");
        return;
      }
      setStoreName(storedName);

      const res = await api.get(`/storeItems/${storedName}`);
      setItems(res.data);
    } catch (err: any) {
      console.error("Fetch items error:", err.response?.data || err.message);
      Alert.alert("Error", "Failed to fetch items");
    } finally {
      setLoading(false);
    }
  };

  // Fetch deals
const fetchDeals = async () => {
  if (!storeName) return;
  try {
    const res = await api.get(`/deals/store/${storeName}`);
    setDeals(res.data);
  } catch (err) {
    console.error("Fetch deals error:", err);
  }
};

// ✅ Converts spoken number words (one, two, seven, etc.) to numeric value
function wordToNumber(word: string): number | null {
  const map: Record<string, number> = {
    zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5,
    six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
    eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15,
    sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20
  };
  return map[word.toLowerCase()] ?? null;
}

const parseVoiceItemCommand = (command) => {
  const lower = command.toLowerCase().trim();
  console.log("🎤 Parsing store item:", lower);

  const result = {
    itemName: "",
    price: null,
    unit: "piece",
    category: "other"
  };

  // ✅ Extract price - EXPANDED patterns
  // ✅ Extract price (supports number words too)
const priceMatch =
  lower.match(/(?:at|price|for|cost|costs|worth)\s+(\w+(?:\.\w+)?)/i) ||
  lower.match(/(\w+(?:\.\w+)?)\s*(?:pesos|php|peso|piso|pisos)\s*(?:per|each)?/i);

if (priceMatch) {
  const rawPrice = priceMatch[1];
  const numeric = parseFloat(rawPrice);
  if (!isNaN(numeric)) {
    result.price = numeric;
  } else {
    const fromWord = wordToNumber(rawPrice);
    if (fromWord !== null) result.price = fromWord;
  }
}
  // ✅ Extract unit (after "per", "each", "every")
  const unitMatch = lower.match(/(?:per|each|every)\s+(\w+)/i);
  if (unitMatch) {
    const unitWord = unitMatch[1].toLowerCase();
    result.unit = STORE_UNIT_LOOKUP[unitWord] || "piece";
  }

  // ✅ Extract category (after "category" keyword)
  const categoryMatch = lower.match(/category\s+([a-z\s]+?)(?:\s*$)/i);
  if (categoryMatch) {
    const categoryPhrase = categoryMatch[1].trim().toLowerCase();
    
    // Try exact match first
    if (STORE_CATEGORY_LOOKUP[categoryPhrase]) {
      result.category = STORE_CATEGORY_LOOKUP[categoryPhrase];
    } else {
      // Try matching longest substring
      const words = categoryPhrase.split(/\s+/);
      for (let i = words.length; i > 0; i--) {
        const phrase = words.slice(0, i).join(' ');
        if (STORE_CATEGORY_LOOKUP[phrase]) {
          result.category = STORE_CATEGORY_LOOKUP[phrase];
          break;
        }
      }
    }
  } else {
    // Infer category from item name keywords
    const words = lower.split(/[^a-z]+/).filter(Boolean);
    for (const word of words) {
      if (STORE_CATEGORY_LOOKUP[word]) {
        result.category = STORE_CATEGORY_LOOKUP[word];
        break;
      }
    }
  }

  // ✅✅ IMPROVED: Extract item name
  let cleanedText = lower.replace(/^add\s+/i, '');
  
  // Match everything before price indicators
  let itemNameMatch = 
    cleanedText.match(/^(.+?)\s+(?:at|price|for|cost|costs|worth|is|are)\s+\d/i) ||
    cleanedText.match(/^(.+?)\s+\d+(?:\.\d+)?\s*(?:pesos|php|peso|piso)?(?:\s+per|\s+each)?/i);
  
  if (itemNameMatch) {
    result.itemName = itemNameMatch[1]
      .replace(/[()]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  } else {
    // Fallback
    const fallbackMatch = cleanedText.match(/^(.+?)\s+(?:category|per|each|$)/i);
    if (fallbackMatch) {
      result.itemName = fallbackMatch[1].replace(/[()]/g, '').trim();
    } else {
      const words = cleanedText.split(/\s+/).filter(Boolean);
      result.itemName = words.slice(0, 6).join(' ').replace(/[()]/g, '');
    }
  }

  // ✅ Capitalize properly (Title Case)
  result.itemName = result.itemName
    .split(' ')
    .map(word => {
      // Keep common abbreviations uppercase
      if (/^(ml|kg|g|l|pc|pcs)$/i.test(word)) {
        return word.toUpperCase();
      }
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');

  return result;
};

const handleVoiceItemConversation = (spokenText) => {
  const lower = spokenText.toLowerCase().trim();

  if (/(hi|hello|hey)/i.test(lower)) {
    Speech.speak(
      "Hello! Ready to add items to your store? Just say: add item name at price per unit",
      { language: "en-US", rate: 1.2 }
    );
    return true;
  }

  if (/(help|how|what)/i.test(lower)) {
    Speech.speak(
      "To add an item, say: add lucky me at 15 per piece category instant noodles",
      { language: "en-US", rate: 1.2 }
    );
    return true;
  }

  return false;
};

const applyVoiceItemCommand = async (command) => {
  console.log("🎤 Voice input:", command);

  if (!storeName) {
    Alert.alert("Error", "Store not loaded yet");
    return;
  }

  const handled = handleVoiceItemConversation(command);
  if (handled) return;

  const parsed = parseVoiceItemCommand(command);

  // Validation
  if (!parsed.itemName || !parsed.price || parsed.price <= 0) {
    const msg = "I didn't catch the item name or price. Please try again: add item name at price per unit";
    Alert.alert("Try Again", msg);
    Speech.speak(msg, { language: "en-US", rate: 1.2 });
    setVoiceTranscript("");
    return;
  }

  // ✅ Show parsed details for confirmation
  console.log("✅ Parsed item:", parsed);

  try {
    // Speak back what was understood
    const confirmation = `Adding ${parsed.itemName}, ${parsed.price} pesos per ${parsed.unit}`;
    Speech.speak(confirmation, { language: "en-US", rate: 1.1 });

    // Save to database
    await api.post("/storeItems", {
      storeName,
      itemName: parsed.itemName,
      price: parsed.price,
      currency: "PHP",
      unit: parsed.unit,
      category: parsed.category,
    });

    Alert.alert(
  "✅ Item Added",
  `${parsed.itemName}\n₱${parsed.price} per ${parsed.unit}\nCategory: ${parsed.category}`
);
speak(`Successfully added ${parsed.itemName} at ${parsed.price} pesos per ${parsed.unit} in ${parsed.category}`);

    
    fetchItems(); // Refresh list

    setTimeout(() => setVoiceTranscript(""), 5000);
  } catch (err) {
    console.error("❌ Voice add failed:", err);
    Alert.alert("Error", "Failed to add item. Please try again.");
    speak("Sorry, I could not add the item. Please try again.");
    setVoiceTranscript("");
  }
};

const startVoiceRecognition = async () => {
  console.log("🎤 Voice button clicked");

  if (Platform.OS !== "web") {
    Alert.alert(
      "🎙️ Voice Input",
      "Voice recognition only works in browser"
    );
    return;
  }

  if (!SpeechRecognition) {
    Alert.alert("Not Supported", "Your browser doesn't support voice recognition.");
    return;
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach(t => t.stop());

    const recognition = new SpeechRecognition();
    window._storeRecognition = recognition;

    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.continuous = false;

    let timeoutId = null;

    recognition.onstart = () => {
      setIsListening(true);
      setVoiceTranscript("");
      console.log("🎧 Listening...");

      if (!hasSpokenHint) {
        setHasSpokenHint(true);
        timeoutId = setTimeout(() => {
          Speech.speak(
            "Say: add item name at price per unit",
            { language: "en-US", rate: 1.0 }
          );
        }, 1000);
      }
    };

    recognition.onresult = (event) => {
      if (timeoutId) clearTimeout(timeoutId);
      const spokenText = event.results[0][0].transcript.trim();
      console.log("🗣️ Heard:", spokenText);
      setVoiceTranscript(spokenText);
      applyVoiceItemCommand(spokenText);
    };

    recognition.onerror = (err) => {
      console.error("❌ Error:", err);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();

    setTimeout(() => {
      try {
        recognition.stop();
      } catch (e) {}
    }, 8000);

  } catch (err) {
    console.error("❌ Voice error:", err);
    Alert.alert("Error", "Failed to start voice recognition");
    setIsListening(false);
  }
};

// Helper to stop recognition safely
const stopVoiceRecognition = () => {
  setIsListening(false);
  try {
    if ((window as any)._storeRecognition) {
      (window as any)._storeRecognition.stop();
      console.log("🛑 Voice recognition stopped");
    }
  } catch (err) {
    console.warn("⚠️ Failed to stop recognition:", err);
  }
};

useEffect(() => {
  fetchItems();
}, []);

useEffect(() => {
  if (storeName) {
    fetchDeals(); // ✅ Runs again once storeName is loaded
  }
}, [storeName]);


  // Fetch current store location on mount
  useEffect(() => {
    const fetchLocation = async () => {
      if (!storeName) return;
      try {
        const res = await api.get(`/storeUsers/${storeName}/location`);
        if (res.data && res.data.coordinates) {
          const [lng, lat] = res.data.coordinates;
          setLocation({ lat, lng });
        }
      } catch (err) {
        console.error("Fetch store location error:", err);
      }
    };
    fetchLocation();
  }, [storeName]);

  // Save location to backend
  const saveLocation = async (coords: StoreLocation) => {
    if (!storeName) return;
    try {
      await api.put(`/storeUsers/${storeName}/location`, coords);
      setLocation(coords);
      setLocationVisible(false);
      Alert.alert("✅ Success", "Store location updated!");
    } catch (err) {
      Alert.alert("Error", "Failed to update location");
    }
  };

const addDealHandler = async () => {
  if (!storeName || !selectedDealItem || !dealMessage || !dealDiscount || !dealStartDate || !dealEndDate)
    return Alert.alert("Error", "Please complete all fields.");

  const discountValue = parseFloat(dealDiscount);
  if (isNaN(discountValue) || discountValue <= 0 || discountValue > 100)
    return Alert.alert("Error", "Please enter a valid discount (1-100%)");

  const originalPrice = selectedDealItem.price;
  const discountedPrice = originalPrice - (originalPrice * (discountValue / 100));

  try {
    await api.post("/deals/add", {
      storeName,
      itemName: selectedDealItem.itemName,
      message: dealMessage,
      price: discountedPrice,
      originalPrice: originalPrice,
      discount: discountValue,
      startDate: dealStartDate,
      endDate: dealEndDate,
    });

    Alert.alert("✅ Success", "Deal added and users notified!");
    setAddDealModalVisible(false);
    setSelectedDealItem(null);
    setDealMessage("");
    setDealDiscount("");
    setDealStartDate("");
    setDealEndDate("");
    fetchDeals(); // Refresh deals list
  } catch (err: any) {
    console.error("Add deal error:", err.response?.data || err.message);
    Alert.alert("Error", "Failed to post deal. Please try again.");
  }
};

const deleteDealHandler = async (dealId: string) => {
  try {
    console.log("🗑️ Attempting to delete deal:", dealId);
    
    const res = await api.delete(`/deals/${dealId}`);
    console.log("✅ Delete response:", res.status, res.data);
    
    // Refresh deals list after successful deletion
    fetchDeals();
  } catch (err: any) {
    console.error(
      "❌ Delete deal error:",
      err?.response?.status,
      err?.response?.data || err?.message
    );
  }
};


  const addItemHandler = async () => {
    const parsedPrice = parseFloat(price);
    if (!storeName) return Alert.alert("Error", "Store not loaded yet");
    if (!itemName || isNaN(parsedPrice))
      return Alert.alert("Error", "Enter valid name and price");
    if (!category) return Alert.alert("Error", "Please select a category");

    try {
      await api.post("/storeItems", {
        storeName,
        itemName,
        price: parsedPrice,
        currency: "PHP",
        unit,
        category,
      });
      setItemName("");
      setPrice("");
      setUnit("piece");
      setCategory("other");
      setAddItemModalVisible(false);
      Alert.alert("✅ Success", "Item added successfully!");
      fetchItems();
    } catch (err: any) {
      console.error("Add item error:", err.response?.data || err.message);
      Alert.alert("Error", err.response?.data?.message || "Failed to add item");
    }
  };

  // Delete item
  const confirmDelete = async () => {
    if (!deleteTargetId) return;
    try {
      await api.delete(`/storeItems/${deleteTargetId}`);
      await fetchItems();
    } catch (err: any) {
      console.error("❌ Delete item error:", err.response?.data || err.message);
    } finally {
      setDeleteConfirmVisible(false);
      setDeleteTargetId(null);
    }
  };

  const handleDeleteRequest = (id: string) => {
    setDeleteTargetId(id);
    setDeleteConfirmVisible(true);
  };

  // Edit modal
  const openEditModal = (item: Item) => {
    setEditItem(item);
    setModalVisible(true);
  };

  const saveEditItem = async () => {
  if (!editItem) return Alert.alert("Error", "No item selected.");

  try {
    const payload = {
      itemName: editItem.itemName.trim(),
      price: parseFloat(editItem.price) || 0,
      currency: "PHP", // ✅ backend expects this
      unit: editItem.unit,
      category: editItem.category || "other",
      stock: editItem.stock ?? 0, // ✅ avoid sending undefined
    };

    console.log("📝 Updating item:", editItem._id, payload);

    const res = await api.put(`/storeItems/${editItem._id}`, payload);

    console.log("✅ Update success:", res.data);
    Alert.alert("✅ Success", "Item updated successfully!");
    setModalVisible(false);
    setEditItem(null);
    fetchItems(); // refresh list
  } catch (err: any) {
    console.error("❌ Update item error:", err.response?.data || err.message);
    Alert.alert(
      "Error",
      err.response?.data?.message || "Failed to update item."
    );
  }
};

  const filteredItems = items.filter((i) => {
    const matchesSearch = i.itemName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategoryFilter === "all" || i.category === selectedCategoryFilter;
    return matchesSearch && matchesCategory;
  });

  // Get category icon
  const getCategoryIcon = (category?: string) => {
    switch (category?.toLowerCase()) {
      case "instant noodles":
        return "restaurant";
      case "canned goods":
        return "nutrition";
      case "snacks":
        return "fast-food";
      case "beverages":
        return "cafe";
      case "cooking essentials":
        return "flame";
      case "personal care":
        return "medkit";
      case "household":
        return "home";
      case "laundry":
        return "water";
      case "medicine":
        return "medical";
      case "school supplies":
        return "pencil";
      case "condiments":
        return "wine";
      case "other":
        return "cube";
      default:
        return "cube";
    }
  };

  const unitOptions = [
    "piece",
    "kilo",
    "gram",
    "liter",
    "ml",
    "pack",
    "dozen",
    "tray",
    "box",
    "bundle",
    "sack",
    "other",
  ];

  const categoryOptions = [
    "instant noodles",
    "canned goods",
    "snacks",
    "beverages",
    "cooking essentials",
    "personal care",
    "household",
    "laundry",
    "medicine",
    "school supplies",
    "condiments",
    "other",
  ];

  if (loading) {
    return (
      <LinearGradient
        colors={['#0D7C8A', '#16A9B8', '#4DD0E1']}
        style={styles.loadingContainer}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.loadingCircle}>
          <Ionicons name="storefront" size={48} color="#16A9B8" />
        </View>
        <ActivityIndicator size="large" color="white" style={{ marginTop: 20 }} />
        <Text style={styles.loadingText}>Loading your store...</Text>
      </LinearGradient>
    );
  }
  
  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="#0D7C8A" />
      <ScrollView
  style={styles.container}
  showsVerticalScrollIndicator={false}
  contentContainerStyle={{ paddingBottom: 120 }} // prevent cutoff at bottom
>
        {/* Header with Gradient */}
       <LinearGradient
  colors={['#0D7C8A', '#16A9B8']}
  style={styles.header}
  start={{ x: 0, y: 0 }}
  end={{ x: 1, y: 0 }}
>
  <View style={styles.headerTop}>
    <View style={styles.headerLeft}>
      <View style={styles.storeIconCircle}>
        <Ionicons name="storefront" size={28} color="#16A9B8" />
      </View>
      <View style={styles.storeNameContainer}>
        <Text style={styles.headerTitle} numberOfLines={1} ellipsizeMode="tail">
          {storeName}
        </Text>
        <Text style={styles.headerSubtitle}>Store Dashboard</Text>
      </View>
    </View>

    {/* ===== Logout Button ===== */}
    <TouchableOpacity
      onPress={() => setConfirmVisible(true)}
      style={styles.logoutButton}
    >
      <Ionicons name="log-out-outline" size={20} color="#EF4444" />
    </TouchableOpacity>
  </View>

  {/* ===== Logout Confirmation Modal ===== */}
  <Modal transparent visible={confirmVisible} animationType="fade">
    <View style={styles.modalOverlay}>
      <View style={styles.modalContainer}>
        <Ionicons name="alert-circle-outline" size={42} color="#EF4444" />
        <Text style={[styles.modalTitle, { marginTop: 12 }]}>Confirm Logout</Text>
        <Text style={styles.modalMessage}>
          Are you sure you want to log out of this store account?
        </Text>

        <View style={styles.modalActions}>
          <TouchableOpacity
            style={[styles.modalButton, styles.cancelBtn]}
            onPress={() => setConfirmVisible(false)}
          >
            <Text style={styles.modalCancelText}>Cancel</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.modalButton, { backgroundColor: "#EF4444" }]}
            onPress={async () => {
              try {
                await AsyncStorage.multiRemove([
                  "storeToken",
                  "storeName",
                  "storeId",
                ]);
                setConfirmVisible(false);
                setTimeout(() => router.replace("/storeAuth"), 100);
              } catch (err) {
                console.error("❌ Logout failed:", err);
                Alert.alert("Error", "Failed to log out properly.");
              }
            }}
          >
            <Text style={styles.modalDeleteText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  </Modal>

  {/* Location & Stats Row */}
  <View style={styles.headerBottom}>
    <View style={styles.locationContainer}>
      <Ionicons name="location" size={16} color="#16A9B8" />
      {location ? (
        <Text style={styles.locationText} numberOfLines={1}>
          {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
        </Text>
      ) : (
        <Text style={styles.noLocationText}>No location set</Text>
      )}
    </View>

    <View style={styles.statsContainer}>
      <View style={styles.statBadge}>
        <Ionicons name="cube" size={16} color="#A4C639" />
        <Text style={styles.statText}>{items.length} Items</Text>
      </View>
    </View>
  </View>
</LinearGradient>

        {/* Action Buttons Row */}
        <View style={styles.actionRow}>
  <TouchableOpacity
    onPress={() => setLocationVisible(true)}
    style={styles.actionButton}
  >
    <Ionicons name="map" size={20} color="#16A9B8" />
    <Text style={styles.actionButtonText}>
      {location ? "Update Location" : "Set Location"}
    </Text>
  </TouchableOpacity>

  {/* 🔹 Add Deal Button */}
  <LinearGradient
    colors={['#0D7C8A', '#16A9B8']}
    style={styles.actionButtonPrimary}
    start={{ x: 0, y: 0 }}
    end={{ x: 1, y: 0 }}
  >
    <TouchableOpacity
      onPress={() => setAddDealModalVisible(true)}
      style={styles.actionButtonTouchable}
    >
      <Ionicons name="pricetag" size={20} color="white" />
      <Text style={styles.actionButtonTextPrimary}>Add Deal</Text>
    </TouchableOpacity>
  </LinearGradient>

  <LinearGradient
    colors={['#16A9B8', '#0D7C8A']}
    style={styles.actionButtonPrimary}
    start={{ x: 0, y: 0 }}
    end={{ x: 1, y: 0 }}
  >
    <TouchableOpacity
      onPress={() => setAddItemModalVisible(true)}
      style={styles.actionButtonTouchable}
    >
      <Ionicons name="add" size={20} color="white" />
      <Text style={styles.actionButtonTextPrimary}>Add Item</Text>
    </TouchableOpacity>
  </LinearGradient>
</View>

{/* Active Deals Section */}
{deals.length > 0 && (
  <View style={styles.dealsSection}>
    <View style={styles.dealsSectionHeader}>
      <View style={styles.dealsSectionTitleRow}>
        <Ionicons name="pricetag" size={24} color="#16A9B8" />
        <Text style={styles.dealsSectionTitle}>Active Deals ({deals.length})</Text>
      </View>
    </View>

    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dealsScrollContent}>
      {deals.map((deal) => (
        <View key={deal._id} style={styles.dealCard}>
          <LinearGradient
            colors={['#16A9B8', '#0D7C8A']}
            style={styles.dealCardGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.dealBadge}>
              <Text style={styles.dealBadgeText}>{deal.discount}% OFF</Text>
            </View>

            <Text style={styles.dealItemName} numberOfLines={2}>{deal.itemName}</Text>
            <Text style={styles.dealMessage} numberOfLines={2}>{deal.message}</Text>

            <View style={styles.dealPriceRow}>
              <Text style={styles.dealOriginalPrice}>₱{deal.originalPrice?.toFixed(2)}</Text>
              <Text style={styles.dealPrice}>₱{deal.price.toFixed(2)}</Text>
            </View>

            <View style={styles.dealDateRow}>
              <Ionicons name="calendar-outline" size={14} color="rgba(255,255,255,0.9)" />
              <Text style={styles.dealDateText}>
                {new Date(deal.startDate).toLocaleDateString()} - {new Date(deal.endDate).toLocaleDateString()}
              </Text>
            </View>

          <TouchableOpacity
  onPress={() => {
    console.log("🗑️ Delete button pressed for deal:", deal._id);
    setDeleteDealTargetId(deal._id);
    setDeleteDealConfirmVisible(true);
  }}
  style={styles.dealDeleteBtn}
  activeOpacity={0.7}
>
  <Ionicons name="trash-outline" size={16} color="white" />
</TouchableOpacity>

{/* Delete Deal Confirmation Modal */}
<Modal
  visible={deleteDealConfirmVisible}
  transparent
  animationType="fade"
  onRequestClose={() => setDeleteDealConfirmVisible(false)}
>
  <Pressable style={styles.modalOverlay} onPress={() => setDeleteDealConfirmVisible(false)}>
    <View style={styles.dialogBox}>
      <View style={styles.dialogIconWrapper}>
        <Ionicons name="trash-outline" size={32} color="#EF4444" />
      </View>
      <Text style={styles.dialogTitle}>Delete Deal</Text>
      <Text style={styles.dialogMessage}>
        Are you sure you want to delete this deal? This action cannot be undone.
      </Text>

      <View style={styles.dialogActions}>
        <TouchableOpacity 
          style={styles.dialogCancelBtn}
          onPress={() => setDeleteDealConfirmVisible(false)}
        >
          <Text style={styles.dialogCancelText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.dialogConfirmBtn}
          onPress={() => {
            if (deleteDealTargetId) {
              console.log("✅ User confirmed deletion of deal:", deleteDealTargetId);
              deleteDealHandler(deleteDealTargetId);
              setDeleteDealConfirmVisible(false);
              setDeleteDealTargetId(null);
            }
          }}
        >
          <Text style={styles.dialogConfirmText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  </Pressable>
</Modal>

          </LinearGradient>
        </View>
      ))}

    </ScrollView>
  </View>
)}

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#64748B" style={styles.searchIcon} />
          <TextInput
            placeholder="Search items..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={styles.searchInput}
            placeholderTextColor="#94A3B8"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")} style={styles.clearIconBtn}>
              <Ionicons name="close-circle" size={20} color="#94A3B8" />
            </TouchableOpacity>
          )}
        </View>

        {/* Items Grid */}
        <View style={styles.listContainer}>
          <View style={styles.sectionTitleRow}>
            <Text style={styles.sectionTitle}>
              Your Products ({filteredItems.length})
            </Text>
          </View>
          
          {/* Category Filter - Horizontal Scrollable */}
          <View style={styles.categoryFilterContainer}>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoryFilterContent}
            >
              <TouchableOpacity
                onPress={() => setSelectedCategoryFilter("all")}
                style={[
                  styles.filterChip,
                  selectedCategoryFilter === "all" && styles.filterChipActive
                ]}
              >
                <Ionicons 
                  name="apps" 
                  size={16} 
                  color={selectedCategoryFilter === "all" ? "white" : "#16A9B8"} 
                />
                <Text style={[
                  styles.filterChipText,
                  selectedCategoryFilter === "all" && styles.filterChipTextActive
                ]}>
                  All
                </Text>
              </TouchableOpacity>
              {categoryOptions.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  onPress={() => setSelectedCategoryFilter(cat)}
                  style={[
                    styles.filterChip,
                    selectedCategoryFilter === cat && styles.filterChipActive
                  ]}
                >
                  <Ionicons 
                    name={getCategoryIcon(cat)} 
                    size={16} 
                    color={selectedCategoryFilter === cat ? "white" : "#16A9B8"} 
                  />
                  <Text style={[
                    styles.filterChipText,
                    selectedCategoryFilter === cat && styles.filterChipTextActive
                  ]}>
                    {cat.charAt(0).toUpperCase() + cat.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
          
           {filteredItems.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIconCircle}>
                <Ionicons name="cube-outline" size={48} color="#16A9B8" />
              </View>
              <Text style={styles.emptyStateTitle}>No items found</Text>
              <Text style={styles.emptyStateMessage}>
                {searchQuery ? "Try a different search term" : "Add your first item to get started"}
              </Text>
            </View>
          ) : (
            <FlatList
              data={filteredItems}
              numColumns={numColumns}
              key={numColumns}
              keyExtractor={(item) => item._id}
              renderItem={({ item }) => (
                <View style={[styles.productCard, { width: (width - 24 - (numColumns - 1) * 10) / numColumns }]}>
                  <View style={styles.productImagePlaceholder}>
                    <Ionicons name={getCategoryIcon(item.category)} size={32} color="#16A9B8" />
                  </View>
                  
                  <View style={styles.productInfo}>
                    <Text style={styles.productName} numberOfLines={2}>
                      {item.itemName}
                    </Text>
                    
                    <View style={styles.priceRow}>
                      <Text style={styles.productPrice}>₱{item.price.toFixed(2)}</Text>
                    </View>
                    
                    <Text style={styles.productUnit}>per {item.unit}</Text>

                    {item.category && (
                      <View style={styles.categoryBadge}>
                        <Text style={styles.categoryBadgeText}>
                          {item.category.charAt(0).toUpperCase() + item.category.slice(1)}
                        </Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.productActions}>
                    <TouchableOpacity
                      onPress={() => openEditModal(item)}
                      style={styles.editButton}
                    >
                      <Ionicons name="create-outline" size={18} color="#F59E0B" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleDeleteRequest(item._id)}
                      style={styles.deleteButton}
                    >
                      <Ionicons name="trash-outline" size={18} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                </View>
              )}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.gridContent}
              columnWrapperStyle={styles.columnWrapper}
            />
          )}
        </View>


        {/* ADD ITEM MODAL */}
        <Modal
          visible={addItemModalVisible}
          animationType="fade"
          transparent
          onRequestClose={() => setAddItemModalVisible(false)}
        >
          <Pressable style={styles.modalOverlay} onPress={() => setAddItemModalVisible(false)}>
            <Pressable style={styles.addItemModal} onPress={() => {}}>
              <View style={styles.modalHeader}>
                <View style={styles.modalIconWrapper}>
                  <Ionicons name="add-circle" size={28} color="#16A9B8" />
                </View>
                <Text style={styles.modalTitle}>Add New Item</Text>
                <Text style={styles.modalSubtitle}>Fill in the product details</Text>
              </View>
              
              <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Item Name</Text>
                  <View style={styles.inputWithIcon}>
                    <Ionicons name="pricetag-outline" size={18} color="#64748B" />
                    <TextInput
                      placeholder="e.g. Rice, Eggs"
                      value={itemName}
                      onChangeText={setItemName}
                      style={styles.formInput}
                      placeholderTextColor="#94A3B8"
                    />
                  </View>
                </View>

                <View style={styles.inputRow}>
                  <View style={[styles.inputGroup, { flex: 1 }]}>
                    <Text style={styles.inputLabel}>Price</Text>
                    <View style={styles.inputWithIcon}>
                      <MaterialCommunityIcons name="currency-php" size={18} color="#64748B" />
                      <TextInput
                        placeholder="0.00"
                        keyboardType="numeric"
                        value={price}
                        onChangeText={setPrice}
                        style={styles.formInput}
                        placeholderTextColor="#94A3B8"
                      />
                    </View>
                  </View>

                  <View style={[styles.inputGroup, { flex: 1 }]}>
                    <Text style={styles.inputLabel}>Unit</Text>
                    <ScrollView 
                      style={styles.unitDropdownScroll}
                      showsVerticalScrollIndicator={false}
                      nestedScrollEnabled={true}
                    >
                      {unitOptions.map((u) => (
                        <TouchableOpacity
                          key={u}
                          onPress={() => setUnit(u)}
                          style={[
                            styles.unitOption,
                            unit === u && styles.unitOptionActive
                          ]}
                        >
                          <Text style={[
                            styles.unitOptionText,
                            unit === u && styles.unitOptionTextActive
                          ]}>
                            {u.charAt(0).toUpperCase() + u.slice(1)}
                          </Text>
                          {unit === u && (
                            <Ionicons name="checkmark-circle" size={16} color="#16A9B8" />
                          )}
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                </View>

                {/* Category Dropdown */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Category</Text>
                  <TouchableOpacity
                    onPress={() => setShowCategoryDropdown(!showCategoryDropdown)}
                    style={styles.dropdownButton}
                  >
                    <View style={styles.dropdownButtonContent}>
                      <Ionicons name={getCategoryIcon(category)} size={18} color="#16A9B8" />
                      <Text style={styles.dropdownButtonText}>
                        {category.charAt(0).toUpperCase() + category.slice(1)}
                      </Text>
                    </View>
                    <Ionicons 
                      name={showCategoryDropdown ? "chevron-up" : "chevron-down"} 
                      size={20} 
                      color="#64748B" 
                    />
                  </TouchableOpacity>
                  
                  {showCategoryDropdown && (
                    <ScrollView 
                      style={styles.categoryDropdownScroll}
                      showsVerticalScrollIndicator={false}
                      nestedScrollEnabled={true}
                    >
                      {categoryOptions.map((cat) => (
                        <TouchableOpacity
                          key={cat}
                          onPress={() => {
                            setCategory(cat);
                            setShowCategoryDropdown(false);
                          }}
                          style={[
                            styles.dropdownOption,
                            category === cat && styles.dropdownOptionActive
                          ]}
                        >
                          <View style={styles.dropdownOptionContent}>
                            <Ionicons name={getCategoryIcon(cat)} size={18} color={category === cat ? "#16A9B8" : "#64748B"} />
                            <Text style={[
                              styles.dropdownOptionText,
                              category === cat && styles.dropdownOptionTextActive
                            ]}>
                              {cat.charAt(0).toUpperCase() + cat.slice(1)}
                            </Text>
                          </View>
                          {category === cat && (
                            <Ionicons name="checkmark-circle" size={18} color="#16A9B8" />
                          )}
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  )}
                </View>
              </ScrollView>
              
              <View style={styles.modalActions}>
                <TouchableOpacity
                  onPress={() => {
                    setAddItemModalVisible(false);
                    setItemName("");
                    setPrice("");
                    setUnit("piece");
                    setCategory("other");
                    setShowCategoryDropdown(false);
                  }}
                  style={styles.modalCancelBtn}
                >
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </TouchableOpacity>
                <LinearGradient
                  colors={['#16A9B8', '#0D7C8A']}
                  style={styles.modalSaveBtn}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <TouchableOpacity
                    onPress={addItemHandler}
                    style={styles.modalSaveTouchable}
                  >
                    <Ionicons name="checkmark" size={20} color="white" />
                    <Text style={styles.modalSaveText}>Add Item</Text>
                  </TouchableOpacity>
                </LinearGradient>
              </View>
            </Pressable>
          </Pressable>
        </Modal>

        {/* ADD DEAL MODAL */}
{/* ADD DEAL MODAL - IMPROVED */}
<Modal
  visible={addDealModalVisible}
  animationType="fade"
  transparent
  onRequestClose={() => setAddDealModalVisible(false)}
>
  <Pressable style={styles.modalOverlay} onPress={() => setAddDealModalVisible(false)}>
    <Pressable style={styles.addItemModal} onPress={() => {}}>
      <View style={styles.modalHeader}>
        <View style={styles.modalIconWrapper}>
          <Ionicons name="pricetag" size={28} color="#16A9B8" />
        </View>
        <Text style={styles.modalTitle}>Add New Deal</Text>
        <Text style={styles.modalSubtitle}>Create a promotional offer</Text>
      </View>

      <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
       {/* Select Item */}
<View style={styles.inputGroup}>
  <Text style={styles.inputLabel}>Select Product</Text>
  
  {/* Search Input */}
  <View style={styles.inputWithIcon}>
    <Ionicons name="search" size={18} color="#64748B" />
    <TextInput
      placeholder="Search for a product..."
      value={dealItemSearch}
      onChangeText={setDealItemSearch}
      style={styles.formInput}
      placeholderTextColor="#94A3B8"
      onFocus={() => setShowItemPicker(true)}
    />
    {dealItemSearch.length > 0 && (
      <TouchableOpacity onPress={() => setDealItemSearch("")}>
        <Ionicons name="close-circle" size={18} color="#94A3B8" />
      </TouchableOpacity>
    )}
  </View>

  {/* Selected Item Display */}
  {selectedDealItem && !showItemPicker && (
    <TouchableOpacity
      onPress={() => setShowItemPicker(true)}
      style={styles.selectedItemBox}
    >
      <View style={styles.dropdownButtonContent}>
        <Ionicons name={getCategoryIcon(selectedDealItem.category)} size={18} color="#16A9B8" />
        <View style={{ flex: 1 }}>
          <Text style={styles.selectedItemName}>{selectedDealItem.itemName}</Text>
          <Text style={styles.itemPriceHint}>₱{selectedDealItem.price.toFixed(2)}</Text>
        </View>
      </View>
      <Ionicons name="create-outline" size={18} color="#16A9B8" />
    </TouchableOpacity>
  )}

  {/* Item Picker Dropdown */}
  {showItemPicker && (
    <ScrollView 
      style={styles.categoryDropdownScroll}
      showsVerticalScrollIndicator={false}
      nestedScrollEnabled={true}
    >
      {items
        .filter(item => 
          item.itemName.toLowerCase().includes(dealItemSearch.toLowerCase())
        )
        .map((item) => (
          <TouchableOpacity
            key={item._id}
            onPress={() => {
              setSelectedDealItem(item);
              setShowItemPicker(false);
              setDealItemSearch(item.itemName);
            }}
            style={[
              styles.dropdownOption,
              selectedDealItem?._id === item._id && styles.dropdownOptionActive
            ]}
          >
            <View style={styles.dropdownOptionContent}>
              <Ionicons name={getCategoryIcon(item.category)} size={18} color={selectedDealItem?._id === item._id ? "#16A9B8" : "#64748B"} />
              <View style={{ flex: 1 }}>
                <Text style={[
                  styles.dropdownOptionText,
                  selectedDealItem?._id === item._id && styles.dropdownOptionTextActive
                ]}>
                  {item.itemName}
                </Text>
                <Text style={styles.itemPriceHint}>₱{item.price.toFixed(2)}</Text>
              </View>
            </View>
            {selectedDealItem?._id === item._id && (
              <Ionicons name="checkmark-circle" size={18} color="#16A9B8" />
            )}
          </TouchableOpacity>
        ))}
      {items.filter(item => 
        item.itemName.toLowerCase().includes(dealItemSearch.toLowerCase())
      ).length === 0 && (
        <View style={styles.noResultsBox}>
          <Ionicons name="search-outline" size={32} color="#94A3B8" />
          <Text style={styles.noResultsText}>No items found</Text>
        </View>
      )}
    </ScrollView>
  )}
</View>

        {/* Show Original Price */}
        {selectedDealItem && (
          <View style={styles.priceInfoBox}>
            <Text style={styles.priceInfoLabel}>Original Price:</Text>
            <Text style={styles.priceInfoValue}>₱{selectedDealItem.price.toFixed(2)}</Text>
          </View>
        )}

        {/* Discount Percentage */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Discount Percentage (%)</Text>
          <View style={styles.inputWithIcon}>
            <Ionicons name="percent-outline" size={18} color="#64748B" />
            <TextInput
              placeholder="e.g. 20"
              keyboardType="numeric"
              value={dealDiscount}
              onChangeText={setDealDiscount}
              style={styles.formInput}
              placeholderTextColor="#94A3B8"
            />
          </View>
          {selectedDealItem && dealDiscount && parseFloat(dealDiscount) > 0 && (
            <Text style={styles.calculatedPrice}>
              New Price: ₱{(selectedDealItem.price - (selectedDealItem.price * parseFloat(dealDiscount) / 100)).toFixed(2)}
            </Text>
          )}
        </View>

        {/* Deal Message */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Promo Message</Text>
          <View style={styles.inputWithIcon}>
            <Ionicons name="chatbubble-outline" size={18} color="#64748B" />
            <TextInput
              placeholder="e.g. Limited time offer!"
              value={dealMessage}
              onChangeText={setDealMessage}
              style={styles.formInput}
              placeholderTextColor="#94A3B8"
              multiline
            />
          </View>
        </View>

       {/* Date Range */}
<View style={styles.inputRow}>
  <View style={[styles.inputGroup, { flex: 1 }]}>
    <Text style={styles.inputLabel}>Start Date</Text>
    <View style={styles.inputWithIcon}>
      <Ionicons name="calendar-outline" size={18} color="#64748B" />
      <TextInput
        placeholder="YYYY-MM-DD"
        value={dealStartDate}
        onChangeText={setDealStartDate}
        style={styles.formInput}
        placeholderTextColor="#94A3B8"
        // @ts-ignore - type prop works on web
        type="date"
      />
    </View>
  </View>

  <View style={[styles.inputGroup, { flex: 1 }]}>
    <Text style={styles.inputLabel}>End Date</Text>
    <View style={styles.inputWithIcon}>
      <Ionicons name="calendar-outline" size={18} color="#64748B" />
      <TextInput
        placeholder="YYYY-MM-DD"
        value={dealEndDate}
        onChangeText={setDealEndDate}
        style={styles.formInput}
        placeholderTextColor="#94A3B8"
        // @ts-ignore - type prop works on web
        type="date"
      />
    </View>
  </View>
</View>
      </ScrollView>

      <View style={styles.modalActions}>
       <TouchableOpacity
  onPress={() => {
    setAddDealModalVisible(false);
    setSelectedDealItem(null);
    setDealMessage("");
    setDealDiscount("");
    setDealStartDate("");
    setDealEndDate("");
    setShowItemPicker(false);
    setDealItemSearch("");
    setShowStartDatePicker(false);  // Add this
    setShowEndDatePicker(false);     // Add this
  }}
  style={styles.modalCancelBtn}
>
  <Text style={styles.modalCancelText}>Cancel</Text>
</TouchableOpacity>

        <LinearGradient
          colors={['#16A9B8', '#0D7C8A']}
          style={styles.modalSaveBtn}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          <TouchableOpacity
            onPress={addDealHandler}
            style={styles.modalSaveTouchable}
          >
            <Ionicons name="checkmark" size={20} color="white" />
            <Text style={styles.modalSaveText}>Post Deal</Text>
          </TouchableOpacity>
        </LinearGradient>
      </View>
    </Pressable>
  </Pressable>
</Modal>


        {/* Location Modal */}
        <Modal visible={locationVisible} transparent animationType="fade">
          <Pressable style={styles.modalOverlay} onPress={() => setLocationVisible(false)}>
            <Pressable style={styles.locationModal} onPress={() => {}}>
              <View style={styles.modalHeader}>
                <View style={styles.modalIconWrapper}>
                  <Ionicons name="map" size={28} color="#16A9B8" />
                </View>
                <Text style={styles.modalTitle}>Set Store Location</Text>
                <Text style={styles.modalSubtitle}>Pin your store on the map</Text>
              </View>

              <View style={styles.mapContainer}>
                <UniversalMap
                  deals={
                    location
                      ? [
                          {
                            _id: "store",
                            storeName: storeName!,
                            itemName: "Store",
                            price: 0,
                            location: { coordinates: [location.lng, location.lat] },
                          },
                        ]
                      : []
                  }
                  editable={true}
                  onSelectLocation={(coords) => setLocation(coords)}
                />
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  onPress={() => setLocationVisible(false)}
                  style={styles.modalCancelBtn}
                >
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </TouchableOpacity>
                <LinearGradient
                  colors={['#16A9B8', '#0D7C8A']}
                  style={styles.modalSaveBtn}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <TouchableOpacity
                    onPress={() => {
                      if (location) {
                        saveLocation(location);
                      } else {
                        Alert.alert("Error", "Please pick a location on the map first!");
                      }
                    }}
                    style={styles.modalSaveTouchable}
                  >
                    <Ionicons name="checkmark" size={20} color="white" />
                    <Text style={styles.modalSaveText}>Save Location</Text>
                  </TouchableOpacity>
                </LinearGradient>
              </View>
            </Pressable>
          </Pressable>
        </Modal>

        {/* Delete Confirmation Modal */}
        <Modal
          visible={deleteConfirmVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setDeleteConfirmVisible(false)}
        >
          <Pressable style={styles.modalOverlay} onPress={() => setDeleteConfirmVisible(false)}>
            <View style={styles.dialogBox}>
              <View style={styles.dialogIconWrapper}>
                <Ionicons name="trash-outline" size={32} color="#EF4444" />
              </View>
              <Text style={styles.dialogTitle}>Delete Item</Text>
              <Text style={styles.dialogMessage}>
                Are you sure you want to delete this item? This action cannot be undone.
              </Text>

              <View style={styles.dialogActions}>
                <TouchableOpacity 
                  style={styles.dialogCancelBtn}
                  onPress={() => setDeleteConfirmVisible(false)}
                >
                  <Text style={styles.dialogCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.dialogConfirmBtn}
                  onPress={confirmDelete}
                >
                  <Text style={styles.dialogConfirmText}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Pressable>
        </Modal>

        {/* Edit Modal */}
        <Modal
          visible={modalVisible}
          animationType="fade"
          transparent
          onRequestClose={() => setModalVisible(false)}
        >
          <Pressable style={styles.modalOverlay} onPress={() => setModalVisible(false)}>
            <Pressable style={styles.editModal} onPress={() => {}}>
              <View style={styles.modalHeader}>
                <View style={styles.modalIconWrapper}>
                  <Ionicons name="create" size={28} color="#16A9B8" />
                </View>
                <Text style={styles.modalTitle}>Edit Item</Text>
                <Text style={styles.modalSubtitle}>Update item details</Text>
              </View>
              
              <ScrollView style={styles.modalBody}>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Item Name</Text>
                  <View style={styles.inputWithIcon}>
                    <Ionicons name="pricetag-outline" size={18} color="#64748B" />
                    <TextInput
                      placeholder="Item Name"
                      value={editItem?.itemName}
                      onChangeText={(text) =>
                        setEditItem((prev) => prev && { ...prev, itemName: text })
                      }
                      style={styles.formInput}
                      placeholderTextColor="#94A3B8"
                    />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Price</Text>
                  <View style={styles.inputWithIcon}>
                    <MaterialCommunityIcons name="currency-php" size={18} color="#64748B" />
                    <TextInput
                      placeholder="Price"
                      keyboardType="numeric"
                      value={editItem?.price.toString()}
                      onChangeText={(text) =>
                        setEditItem(
                          (prev) => prev && { ...prev, price: parseFloat(text) || 0 }
                        )
                      }
                      style={styles.formInput}
                      placeholderTextColor="#94A3B8"
                    />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Unit</Text>
                  <ScrollView 
                    style={styles.unitDropdownScroll}
                    showsVerticalScrollIndicator={false}
                    nestedScrollEnabled={true}
                  >
                    {unitOptions.map((u) => (
                      <TouchableOpacity
                        key={u}
                        onPress={() => setEditItem((prev) => prev && { ...prev, unit: u })}
                        style={[
                          styles.unitOption,
                          editItem?.unit === u && styles.unitOptionActive
                        ]}
                      >
                        <Text style={[
                          styles.unitOptionText,
                          editItem?.unit === u && styles.unitOptionTextActive
                        ]}>
                          {u.charAt(0).toUpperCase() + u.slice(1)}
                        </Text>
                        {editItem?.unit === u && (
                          <Ionicons name="checkmark-circle" size={16} color="#16A9B8" />
                        )}
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>

                {/* Category Dropdown for Edit */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Category</Text>
                  <TouchableOpacity
                    onPress={() => setShowEditCategoryDropdown(!showEditCategoryDropdown)}
                    style={styles.dropdownButton}
                  >
                    <View style={styles.dropdownButtonContent}>
                      <Ionicons name={getCategoryIcon(editItem?.category)} size={18} color="#16A9B8" />
                      <Text style={styles.dropdownButtonText}>
                        {editItem?.category ? editItem.category.charAt(0).toUpperCase() + editItem.category.slice(1) : "Select Category"}
                      </Text>
                    </View>
                    <Ionicons 
                      name={showEditCategoryDropdown ? "chevron-up" : "chevron-down"} 
                      size={20} 
                      color="#64748B" 
                    />
                  </TouchableOpacity>
                  
                  {showEditCategoryDropdown && (
                    <ScrollView 
                      style={styles.categoryDropdownScroll}
                      showsVerticalScrollIndicator={false}
                      nestedScrollEnabled={true}
                    >
                      {categoryOptions.map((cat) => (
                        <TouchableOpacity
                          key={cat}
                          onPress={() => {
                            setEditItem((prev) => prev && { ...prev, category: cat });
                            setShowEditCategoryDropdown(false);
                          }}
                          style={[
                            styles.dropdownOption,
                            editItem?.category === cat && styles.dropdownOptionActive
                          ]}
                        >
                          <View style={styles.dropdownOptionContent}>
                            <Ionicons name={getCategoryIcon(cat)} size={18} color={editItem?.category === cat ? "#16A9B8" : "#64748B"} />
                            <Text style={[
                              styles.dropdownOptionText,
                              editItem?.category === cat && styles.dropdownOptionTextActive
                            ]}>
                              {cat.charAt(0).toUpperCase() + cat.slice(1)}
                            </Text>
                          </View>
                          {editItem?.category === cat && (
                            <Ionicons name="checkmark-circle" size={18} color="#16A9B8" />
                          )}
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  )}
                </View>
              </ScrollView>
              
              <View style={styles.modalActions}>
                <TouchableOpacity
                  onPress={() => {
                    setModalVisible(false);
                    setShowEditCategoryDropdown(false);
                  }}
                  style={styles.modalCancelBtn}
                >
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </TouchableOpacity>
                <LinearGradient
                  colors={['#16A9B8', '#0D7C8A']}
                  style={styles.modalSaveBtn}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <TouchableOpacity
                    onPress={saveEditItem}
                    style={styles.modalSaveTouchable}
                  >
                    <Ionicons name="checkmark" size={20} color="white" />
                    <Text style={styles.modalSaveText}>Save Changes</Text>
                  </TouchableOpacity>
                </LinearGradient>
              </View>
            </Pressable>
          </Pressable>
        </Modal>

        
      {/* Voice Listening Indicator */}
{isListening && (
  <View style={styles.voiceListeningBubble}>
    <Text style={styles.voiceListeningText}>🎧 Listening...</Text>
  </View>
)}

{/* Voice Transcript Bubble */}
{voiceTranscript && (
  <View style={styles.voiceTranscriptBubble}>
    <View style={styles.voiceTranscriptHeader}>
      <Ionicons name="checkmark-circle" size={14} color="#4ade80" />
      <Text style={styles.voiceTranscriptLabel}>Heard</Text>
    </View>
    <Text style={styles.voiceTranscriptText}>"{voiceTranscript}"</Text>
  </View>
)}

{/* Voice FAB Button */}
<TouchableOpacity
  onPress={isListening ? stopVoiceRecognition : startVoiceRecognition}
  activeOpacity={0.8}
  style={[
    styles.voiceFab,
    isListening && styles.voiceFabActive
  ]}
>
  <Ionicons 
    name={isListening ? "mic-off" : "mic"} 
    size={28} 
    color="#fff" 
  />
</TouchableOpacity>

</ScrollView>
    </>
  );
};

export default StoreDashboard;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  loadingCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 10,
  },
  
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: "600",
    color: "white",
  },

 header: {
    paddingHorizontal: 16, // ✅ Reduced from 20 for mobile
    paddingTop: Platform.OS === 'ios' ? 50 : 40, // ✅ Adjust for status bar
    paddingBottom: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },

  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },

  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1, // ✅ Allow it to shrink
    marginRight: 8, // ✅ Space before logout button
  },


  storeIconCircle: {
    width: 48, // ✅ Reduced from 56 for mobile
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    flexShrink: 0, // ✅ Prevent icon from shrinking
  },

  // ✅ NEW: Container for store name to handle overflow
  storeNameContainer: {
    flex: 1, // ✅ Take remaining space
    marginRight: 4,
  },

  headerTitle: {
    fontSize: 20, // ✅ Reduced from 24 for mobile
    fontWeight: "800",
    color: "white",
    marginBottom: 2,
    flexShrink: 1, // ✅ Allow text to shrink if needed
  },

  headerSubtitle: {
    fontSize: 13, // ✅ Reduced from 14
    color: "rgba(255, 255, 255, 0.9)",
    fontWeight: "500",
  },

  logoutButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    flexShrink: 0, // ✅ Prevent button from shrinking
  },

  headerBottom: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.2)",
    flexWrap: "wrap", // ✅ Wrap on small screens
    gap: 8, // ✅ Add spacing when wrapped
  },

  locationContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    paddingHorizontal: 10, // ✅ Reduced from 12
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
    maxWidth: "60%", // ✅ Prevent overflow
  },

  locationText: {
    fontSize: 11, // ✅ Reduced from 12
    fontWeight: "600",
    color: "#16A9B8",
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    flexShrink: 1,
  },

  noLocationText: {
    fontSize: 11, // ✅ Reduced from 12
    fontWeight: "500",
    color: "#64748B",
  },



  statsContainer: {
    flexDirection: "row",
    gap: 12,
  },

statBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    paddingHorizontal: 10, // ✅ Reduced from 12
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
  },

  statText: {
    fontSize: 12, // ✅ Reduced from 13
    fontWeight: "600",
    color: "#A4C639",
  },

  // Modal styles remain the same
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16, // ✅ Add padding for mobile
  },

  modalContainer: {
    width: "90%", // ✅ Responsive width
    maxWidth: 400, // ✅ Max width for larger screens
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
  },

  actionRow: {
    flexDirection: "row",
    padding: 16,
    gap: 12,
  },

  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
  },

  actionButtonPrimary: {
    flex: 1,
    borderRadius: 12,
    shadowColor: "#16A9B8",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },

  actionButtonTouchable: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    gap: 8,
  },

  actionButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#16A9B8",
  },

  actionButtonTextPrimary: {
    fontSize: 15,
    fontWeight: "600",
    color: "white",
  },

  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    marginHorizontal: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },

  searchIcon: {
    marginRight: 12,
  },

  searchInput: {
    flex: 1,
    fontSize: 15,
    color: "#1E293B",
  },

  clearIconBtn: {
    padding: 4,
  },

  inputGroup: {
    marginBottom: 16,
  },

  inputLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#475569",
    marginBottom: 8,
  },

  inputWithIcon: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },

  formInput: {
    flex: 1,
    fontSize: 15,
    color: "#1E293B",
  },

  inputRow: {
    flexDirection: "row",
    gap: 12,
  },

  unitDropdownScroll: {
    maxHeight: 150,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    backgroundColor: "#F8FAFC",
  },

  unitOption: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },

  unitOptionActive: {
    backgroundColor: "#E0F2F4",
  },

  unitOptionText: {
    fontSize: 14,
    color: "#475569",
    fontWeight: "500",
  },

  unitOptionTextActive: {
    color: "#16A9B8",
    fontWeight: "600",
  },

  // Dropdown styles for category
  dropdownButton: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 12,
    paddingVertical: 12,
  },

  dropdownButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  dropdownButtonText: {
    fontSize: 15,
    color: "#1E293B",
    fontWeight: "500",
  },

  categoryDropdownScroll: {
    maxHeight: 200,
    marginTop: 8,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
  },

  dropdownOption: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },

  dropdownOptionActive: {
    backgroundColor: "#E0F2F4",
  },

  dropdownOptionContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  dropdownOptionText: {
    fontSize: 14,
    color: "#475569",
    fontWeight: "500",
  },

  dropdownOptionTextActive: {
    color: "#16A9B8",
    fontWeight: "600",
  },

  listContainer: {
    flex: 1,
    marginTop: 16,
  },

  sectionTitleRow: {
    paddingHorizontal: 20,
    marginBottom: 12,
  },

  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1E293B",
  },

  
  categoryFilterContainer: {
    height: 50,
    marginBottom: 16,
    backgroundColor: "#F8FAFC",
  },

  categoryFilterContent: {
    paddingHorizontal: 16,
    alignItems: "center",
    height: 50,
  },

  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    gap: 1,
    marginRight: 5,
    height: 40,
  },

  filterChipActive: {
    backgroundColor: "#16A9B8",
    borderColor: "#16A9B8",
  },

  filterChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#16A9B8",
  },

  filterChipTextActive: {
    color: "white",
  },

  gridContent: {
    paddingHorizontal: 12,
    paddingBottom: 40,
  },

  columnWrapper: {
    gap: 10,
    marginBottom: 10,
    paddingHorizontal: 4,
  },

  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 80,
    paddingHorizontal: 40,
  },

  emptyIconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: "#E0F2F4",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },

  emptyStateTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#1E293B",
    marginBottom: 8,
  },

  emptyStateMessage: {
    fontSize: 15,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 22,
  },

  productCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    minHeight: 220,
    marginBottom: 0,
  },

  productImagePlaceholder: {
    width: "100%",
    height: 100,
    backgroundColor: "#E0F2F4",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },


  productInfo: {
    flex: 1,
    marginBottom: 12,
  },

  productName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1E293B",
    marginBottom: 6,
    height: 40,
  },

  priceRow: {
    flexDirection: "row",
    alignItems: "baseline",
    marginBottom: 4,
  },

  productPrice: {
    fontSize: 18,
    fontWeight: "700",
    color: "#16A9B8",
  },

  productUnit: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "500",
    marginBottom: 6,
  },

  categoryBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#E0F2F4",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginTop: 4,
  },

  categoryBadgeText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#16A9B8",
  },

  productActions: {
    flexDirection: "row",
    gap: 8,
  },

  editButton: {
    flex: 1,
    backgroundColor: "#FEF3C7",
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },

  deleteButton: {
    flex: 1,
    backgroundColor: "#FEE2E2",
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },

  addItemModal: {
    width: "90%",
    maxWidth: 480,
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 24,
    maxHeight: "85%",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },


  locationModal: {
    width: "90%",
    maxWidth: 900,
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 24,
    height: 700,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },

  editModal: {
    width: "90%",
    maxWidth: 480,
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 24,
    maxHeight: "80%",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },

  modalHeader: {
    alignItems: "center",
    marginBottom: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },

  modalIconWrapper: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#E0F2F4",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },

  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1E293B",
    marginBottom: 8,
    textAlign: "center",
  },

  modalSubtitle: {
    fontSize: 14,
    color: "#64748B",
  },

  mapContainer: {
    height: 400,
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 20,
  },

  modalBody: {
    maxHeight: 350,
  },

modalMessage: {
    fontSize: 14,
    color: "#475569",
    textAlign: "center",
    marginBottom: 20,
    lineHeight: 20,
  },

  modalActions: {
    flexDirection: "row",
    width: "100%",
    gap: 12,
  },

  modalCancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    backgroundColor: "#F8FAFC",
    alignItems: "center",
  },

  modalCancelText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#64748B",
  },

  modalSaveBtn: {
    flex: 1,
    borderRadius: 12,
    shadowColor: "#16A9B8",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },

  modalSaveTouchable: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 14,
    gap: 6,
  },

  modalSaveText: {
    fontSize: 15,
    fontWeight: "600",
    color: "white",
  },

  dialogBox: {
    width: "85%",
    maxWidth: 400,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },

  dialogIconWrapper: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#FEF2F2",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },

  dialogTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1E293B",
    marginBottom: 8,
  },

  dialogMessage: {
    fontSize: 14,
    color: "#64748B",
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 20,
  },

  dialogActions: {
    flexDirection: "row",
    width: "100%",
    gap: 12,
  },

  dialogCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "#F8FAFC",
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    alignItems: "center",
  },

  dialogCancelText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#64748B",
  },

  dialogConfirmBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "#EF4444",
    alignItems: "center",
    shadowColor: "#EF4444",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },

  dialogConfirmText: {
    fontSize: 15,
    fontWeight: "600",
    color: "white",
  },


  
  
  
  imageGradient: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  
  categoryBadgeOverlay: {
    position: "absolute",
    top: 3,
    right: 3,
    backgroundColor: "rgba(22, 169, 184, 0.95)",
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
  },
  
  categoryBadgeOverlayText: {
    fontSize: 7,
    fontWeight: "700",
    color: "#FFFFFF",
    textTransform: "uppercase",
    letterSpacing: 0.2,
  },
  
  
  priceUnitRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 2,
  },


modalButton: {
  flex: 1,
  paddingVertical: 10,
  borderRadius: 8,
  alignItems: "center",
},
cancelBtn: { backgroundColor: "#E2E8F0" },
modalDeleteText: { color: "#fff", fontWeight: "600" },

// Add these to your existing styles object
dealsSection: {
  padding: 16,
  backgroundColor: "#F8FAFC",
},
dealsSectionHeader: {
  marginBottom: 16,
},
dealsSectionTitleRow: {
  flexDirection: "row",
  alignItems: "center",
  gap: 8,
},
dealsSectionTitle: {
  fontSize: 20,
  fontWeight: "700",
  color: "#1E293B",
},
dealsScrollContent: {
  paddingRight: 16,
},
dealCard: {
  width: 280,
  marginRight: 12,
  borderRadius: 16,
  overflow: "hidden",
  shadowColor: "#000",
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.15,
  shadowRadius: 8,
  elevation: 4,
},
dealCardGradient: {
  padding: 16,
  minHeight: 180,
},
dealBadge: {
  position: "absolute",
  top: 12,
  right: 12,
  backgroundColor: "#EF4444",
  paddingHorizontal: 12,
  paddingVertical: 6,
  borderRadius: 20,
},
dealBadgeText: {
  color: "white",
  fontSize: 14,
  fontWeight: "800",
},
dealItemName: {
  fontSize: 18,
  fontWeight: "700",
  color: "white",
  marginBottom: 8,
  marginTop: 8,
},
dealMessage: {
  fontSize: 14,
  color: "rgba(255, 255, 255, 0.9)",
  marginBottom: 12,
},
dealPriceRow: {
  flexDirection: "row",
  alignItems: "center",
  gap: 12,
  marginBottom: 12,
},
dealOriginalPrice: {
  fontSize: 16,
  color: "rgba(255, 255, 255, 0.7)",
  textDecorationLine: "line-through",
},
dealPrice: {
  fontSize: 24,
  fontWeight: "800",
  color: "white",
},
dealDateRow: {
  flexDirection: "row",
  alignItems: "center",
  gap: 6,
  marginTop: 8,
},
dealDateText: {
  fontSize: 12,
  color: "rgba(255, 255, 255, 0.9)",
  fontWeight: "500",
},
dealDeleteBtn: {
  position: "absolute",
  bottom: 12,
  right: 12,
  width: 36,
  height: 36,
  borderRadius: 18,
  backgroundColor: "rgba(0, 0, 0, 0.3)",
  justifyContent: "center",
  alignItems: "center",
  zIndex: 999,
  elevation: 5,
},
priceInfoBox: {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  backgroundColor: "#E0F2F4",
  padding: 12,
  borderRadius: 10,
  marginBottom: 16,
},
priceInfoLabel: {
  fontSize: 14,
  fontWeight: "600",
  color: "#64748B",
},
priceInfoValue: {
  fontSize: 18,
  fontWeight: "700",
  color: "#16A9B8",
},
calculatedPrice: {
  marginTop: 8,
  fontSize: 14,
  fontWeight: "600",
  color: "#16A9B8",
},
itemPriceHint: {
  fontSize: 12,
  color: "#94A3B8",
  marginTop: 2,
},
selectedItemBox: {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  backgroundColor: "#E0F2F4",
  borderRadius: 10,
  padding: 12,
  marginTop: 8,
  borderWidth: 1.5,
  borderColor: "#16A9B8",
},
selectedItemName: {
  fontSize: 15,
  fontWeight: "600",
  color: "#1E293B",
},
noResultsBox: {
  padding: 32,
  alignItems: "center",
  justifyContent: "center",
},
noResultsText: {
  fontSize: 14,
  color: "#94A3B8",
  marginTop: 8,
  fontWeight: "500",
},
datePickerButton: {
  flexDirection: "row",
  alignItems: "center",
  borderRadius: 10,
  borderWidth: 1.5,
  borderColor: "#E2E8F0",
  backgroundColor: "#F8FAFC",
  paddingHorizontal: 12,
  paddingVertical: 12,
  gap: 8,
},
datePickerText: {
  fontSize: 15,
  color: "#1E293B",
  fontWeight: "500",
},
voiceListeningBubble: {
  position: "absolute",
  bottom: 100,
  alignSelf: "center",
  backgroundColor: "#16A9B8",
  borderRadius: 12,
  paddingVertical: 8,
  paddingHorizontal: 14,
  zIndex: 999,
},
voiceListeningText: {
  color: "#fff",
  fontSize: 13,
  fontWeight: "500",
},
voiceTranscriptBubble: {
  position: "absolute",
  bottom: 100,
  alignSelf: "center",
  backgroundColor: "#0D7C8A",
  borderRadius: 12,
  paddingVertical: 10,
  paddingHorizontal: 14,
  maxWidth: 280,
  zIndex: 999,
},
voiceTranscriptHeader: {
  flexDirection: "row",
  alignItems: "center",
  marginBottom: 4,
},
voiceTranscriptLabel: {
  color: "#4ade80",
  fontSize: 11,
  fontWeight: "600",
  marginLeft: 4,
},
voiceTranscriptText: {
  color: "#fff",
  fontSize: 13,
  lineHeight: 18,
},
voiceFab: {
  position: "absolute",
  bottom: 30,
  right: 20,
  backgroundColor: "#0D7C8A",
  borderRadius: 50,
  width: 56,
  height: 56,
  alignItems: "center",
  justifyContent: "center",
  shadowColor: "#000",
  shadowOpacity: 0.3,
  shadowOffset: { width: 0, height: 4 },
  shadowRadius: 8,
  elevation: 5,
  zIndex: 999,
},
voiceFabActive: {
  backgroundColor: "#94A3B8",
},
});