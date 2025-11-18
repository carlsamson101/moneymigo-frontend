// @ts-nocheck
import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Modal, TextInput,
  ScrollView, Platform, Dimensions, ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import api from '../../lib/api';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getToken } from '../../lib/auth';
import { Alert } from 'react-native';
import Popover from 'react-native-popover-view';
import { Animated, Easing } from "react-native";
import { useRouter } from "expo-router";
import { PieChart as RN_PieChart } from 'react-native-gifted-charts';
import {
  PieChart as WebPieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

const { width } = Dimensions.get("window");
const isMobile = Platform.OS !== "web" && width < 768;

type CustomBudget = {
  category: string;
  amount: number;
  spent?: number;
};

type BudgetItem = {
  category: string;
  amount: number;
  spent: number;
  [key: string]: any;
};

type Category = {
  name: string;
  icon: React.ReactElement;
  color: string;
  parent?: string;
};

const BUILT_IN_CATEGORIES: Category[] = [
  { name: 'Food', icon: <Ionicons name="fast-food-outline" size={22} color="#fff" />, color: '#1f4b81ff' },
  { name: 'Transport', icon: <Ionicons name="bus-outline" size={22} color="#fff" />, color: '#1f4b81ff' },
  { name: 'Bills', icon: <Ionicons name="flash-outline" size={22} color="#fff" />, color: '#1f4b81ff' },
  { name: 'School', icon: <Ionicons name="school-outline" size={22} color="#fff" />, color: '#1f4b81ff' },
  { name: 'Shopping', icon: <Ionicons name="cart-outline" size={22} color="#fff" />, color: '#1f4b81ff' },
  // 👇 Add Savings here so it's treated as top-level
  { name: 'Savings', icon: <Ionicons name="cash-outline" size={22} color="#fff" />, color: '#1f4b81ff' },
  { name: 'Others', icon: <Ionicons name="ellipsis-horizontal-circle-outline" size={22} color="#fbfbfbff" />, color: '#1f4b81ff' },
];

const OTHERS_KEY = "Others";

function getPeriodDateRange(
  period: 'Daily' | 'Weekly' | 'Monthly' | 'Custom',
  start: Date | string | null,
  end?: Date | string | null
) {
  if (!start) return { min: null, max: null };
  let min = new Date(start as string | Date), max;
  min.setHours(0, 0, 0, 0);

  if (period === 'Daily') {
    max = new Date(min); max.setDate(min.getDate() + 1);
  } else if (period === 'Weekly') {
    max = new Date(min); max.setDate(min.getDate() + 7);
  } else if (period === 'Monthly') {
    max = new Date(min); max.setMonth(min.getMonth() + 1);
  } else if (period === 'Custom' && end) {
    max = new Date(end as string | Date); max.setHours(0, 0, 0, 0);
  } else {
    max = null;
  }
  return { min, max };
}

type OverspentCategory = {
  category: string;
  overspent: number;
};

type OverspentBadgeProps = {
  overspentAmount: number;
  overspentCategories: OverspentCategory[];
};

function getProgressColor(percent: number) {
  if (percent < 0.7) return '#00B894';
  if (percent < 0.9) return '#FDCB6E';
  if (percent < 1) return '#E17055';
  return '#D63031';
}

type Budget = {
  category: string;
  amount: number;
  [key: string]: any;
};

export default function BudgetScreen() {
  const router = useRouter();
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [expensesByCategory, setExpensesByCategory] = useState<{ [key: string]: number }>({});
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState('');

  // Budget period/date states
  const [budgetPeriod, setBudgetPeriod] = useState('Weekly');
  const [budgetPeriodStart, setBudgetPeriodStart] = useState<Date | null>(null);
  const [budgetPeriodEnd, setBudgetPeriodEnd] = useState<Date | null>(null);

  // For custom/user categories if needed
  const [customCategories, setCustomCategories] = useState([]);
  const [categories, setCategories] = useState(BUILT_IN_CATEGORIES);

  // Budget allocation
  const [showPercentModal, setShowPercentModal] = useState(false);
  const [percentInput, setPercentInput] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [totalBudget, setTotalBudget] = useState(0);

  // Calculate total expenses for all categories in the filtered period
  const totalExpenses = Object.values(expensesByCategory).reduce((sum, v) => Number(sum) + Number(v), 0);
  const remainingAmount = Math.max(0, totalBudget - totalExpenses);
  const [othersExpanded, setOthersExpanded] = useState(true);
  const [othersAnim] = useState(new Animated.Value(1));

  const overspentFromTotal = Math.max(0, totalExpenses - totalBudget);
  const overspentFromCategories = budgets.reduce((sum, b) => {
    const spent = expensesByCategory[b.category] || 0;
    return sum + Math.max(0, spent - (b.amount || 0));
  }, 0);

  const overspentAmount = Math.max(overspentFromTotal, overspentFromCategories);

  // Find which categories are overspent
  const overspentCategories = budgets
    .map(b => {
      const spent = expensesByCategory[b.category] || 0;
      if (spent > (b.amount || 0)) {
        return {
          category: b.category,
          overspent: spent - (b.amount || 0),
        };
      }
      return null;
    })
    .filter(Boolean);

  const [lastPeriodBudgets, setLastPeriodBudgets] = useState([]);
  const [percentInputs, setPercentInputs] = useState<{ [key: string]: string }>({});
  const [showPopover, setShowPopover] = useState<string | false>(false);

  const handlePeriodSettingsSave = async (newPeriod: string, newAmount: number) => {
    setBudgetPeriod(newPeriod);
    setTotalBudget(newAmount);

    setTimeout(async () => {
      await clearBudgetsForPeriod();
      fetchBudgets();
      fetchExpenses();
    }, 100);
  };

  const toggleOthers = () => {
  setOthersExpanded((prev) => {
    const next = !prev;
    Animated.timing(othersAnim, {
      toValue: next ? 1 : 0,
      duration: 300,
      easing: Easing.out(Easing.ease),
      useNativeDriver: false,
    }).start();
    return next;
  });
};


  useFocusEffect(
    React.useCallback(() => {
      (async () => {
        setLoading(true);
        const user = await getToken();
        if (user && user.id) {
          try {
            const res = await api.get(`/auth/${user.id}`);
            setBudgetPeriod(res.data?.budgetPeriod || 'Weekly');
            setBudgetPeriodStart(res.data?.budgetPeriodStart ? new Date(res.data.budgetPeriodStart) : null);
            setBudgetPeriodEnd(res.data?.budgetPeriodEnd ? new Date(res.data.budgetPeriodEnd) : null);
            setTotalBudget(res.data?.budgetAmount || 0);
            await fetchBudgets(res.data?.budgetPeriod, res.data?.budgetPeriodStart, res.data?.budgetPeriodEnd);
            await fetchExpenses(res.data?.budgetPeriod, res.data?.budgetPeriodStart, res.data?.budgetPeriodEnd);
          } catch (err) {
            setBudgetPeriod('Weekly');
            setBudgetPeriodStart(null);
            setBudgetPeriodEnd(null);
          }
        }
        setLoading(false);
      })();
    }, [])
  );

useEffect(() => {
  (async () => {
    const user = await getToken();
    if (!user?.id) return;

    const stored = await AsyncStorage.getItem(`customCategories_${user.id}`);
    const custom = stored ? JSON.parse(stored) : [];

    console.log("🧩 Loaded custom categories from storage:", custom);

    const merged = [
      ...BUILT_IN_CATEGORIES,
      ...custom.map((cat: string) => ({
        name: cat,
        parent: OTHERS_KEY, // ✅ Must always have this for grouping
        icon:
          BUILT_IN_CATEGORIES.find(c => c.name === OTHERS_KEY)?.icon || (
            <Ionicons
              name="ellipsis-horizontal-circle-outline"
              size={20}
              color="#f2efef"
            />
          ),
        color:
          BUILT_IN_CATEGORIES.find(c => c.name === OTHERS_KEY)?.color ||
          "#1f4b81ff",
      })),
    ];

    console.log("✅ Final merged categories:", merged);

    setCategories(merged);
  })();
}, []);





  const computeOthersBudget = (budgets: Budget[]) => {
    const subcategories = customCategories;
    const sum = subcategories.reduce((acc, sub) => {
      const found = budgets.find(b => b.category === sub);
      return acc + (found?.amount || 0);
    }, 0);

    return [
      ...budgets.filter(b => b.category !== OTHERS_KEY),
      { category: OTHERS_KEY, amount: sum }
    ];
  };

  const fetchBudgets = async (
    period = budgetPeriod,
    periodStart = budgetPeriodStart,
    periodEnd = budgetPeriodEnd
  ) => {
    setLoading(true);
    const user = await getToken();
    if (!user || !user.id || !periodStart || !periodEnd) return setLoading(false);

    try {
      const res = await api.get(
        `/budgets/user/${user.id}?periodType=${period}&periodStart=${new Date(
          periodStart
        ).toISOString()}&periodEnd=${new Date(periodEnd).toISOString()}`
      );

      let data = res.data || [];
      const builtinNames = BUILT_IN_CATEGORIES.map(c => c.name);

      type CustomBudget = BudgetItem;

      const customBudgets: CustomBudget[] = data.filter(
        (b: BudgetItem) => !builtinNames.includes(b.category)
      );

      const othersTotal = customBudgets.reduce(
        (acc: { amount: number; spent: number }, b: CustomBudget) => {
          acc.amount += b.amount || 0;
          acc.spent += b.spent || 0;
          return acc;
        },
        { amount: 0, spent: 0 }
      );

      if (othersTotal.amount > 0 || othersTotal.spent > 0) {
        data = [
          ...data,
          {
            category: OTHERS_KEY,
            amount: othersTotal.amount,
            spent: othersTotal.spent,
            synthetic: true,
          },
        ];
      }

      setBudgets(data);
    } finally {
      setLoading(false);
    }
  };

const fetchExpenses = async (
  period = budgetPeriod,
  periodStart = budgetPeriodStart,
  periodEnd = budgetPeriodEnd
) => {
  const user = await getToken();
  if (!user || !user.id || !periodStart) return;

  try {
    const res = await api.get(`/expenses/user/${user.id}`);
    const byCategory: { [key: string]: number } = {};
    const foundCategories: Set<string> = new Set();

    for (const exp of res.data || []) {
      const expDate = new Date(exp.date);
      if (
        expDate >= new Date(periodStart) &&
        (!periodEnd || expDate <= new Date(periodEnd))
      ) {
        byCategory[exp.category] =
          (byCategory[exp.category] || 0) + exp.amount;
        foundCategories.add(exp.category);
      }
    }

    // ✅ Update expense totals
    setExpensesByCategory(byCategory);

    // ✅ Single unified category update (no double set)
    setCategories((prev) => {
      const existingNames = new Set(prev.map((c) => c.name));

      // Add new categories discovered in expenses
      const extras = Array.from(foundCategories)
        .filter((name) => !existingNames.has(name))
        .map((name) => {
          const isSub = name.startsWith("Others:");
          const displayName = name.replace(/^Others:/, "");

          return {
  name,
  displayName,
  parent: isSub ? OTHERS_KEY : undefined,
  icon:
    BUILT_IN_CATEGORIES.find((c) => c.name === OTHERS_KEY)?.icon || (
      <Ionicons name="ellipsis-horizontal-circle-outline" size={20} color="#fff" />
    ),
  color:
    BUILT_IN_CATEGORIES.find((c) => c.name === OTHERS_KEY)?.color || "#1f4b81ff",
};

        });

      // Fix existing categories to ensure consistency
      const updated = prev.map((c) => {
        const isBuiltIn = BUILT_IN_CATEGORIES.some((b) => b.name === c.name);
        if (
          !isBuiltIn &&
          c.name !== OTHERS_KEY &&
          c.name.startsWith("Others:") &&
          !c.parent
        ) {
          return {
            ...c,
            parent: OTHERS_KEY,
            displayName: c.name.replace(/^Others:/, ""),
          };
        }
        return c;
      });

      // Return updated + any new found categories
      return [...updated, ...extras];
    });
  } catch (err) {
    console.error("fetchExpenses error:", err);
  }
};



  // Helper functions and derived values
  const getBudgetForCategory = (cat: string) =>
    budgets.find((b) => b.category === cat);

  const sumBudgets = budgets.reduce((sum, b) => sum + (b.amount || 0), 0);

  const getCategoryPercent = (cat: string) =>
    totalBudget ? Math.round(100 * ((getBudgetForCategory(cat)?.amount || 0) / totalBudget)) : 0;

  const unallocatedPercent = totalBudget
    ? Math.max(0, 100 - categories.reduce((a, c) => a + getCategoryPercent(c.name), 0))
    : 100;



  // Save absolute amount via modal
  const saveBudget = async () => {
    if (editingCategory?.startsWith("Others")) {
  alert(`You can't directly allocate to '${OTHERS_KEY}'. It's automatically calculated.`);
  return;
}


    const newAmount = Number(inputValue);
    if (isNaN(newAmount) || newAmount < 0) {
      alert('Invalid amount');
      return;
    }

    const currentAllocations = budgets.reduce((sum, b) => {
      if (b.category === editingCategory) return sum;
      return sum + (b.amount || 0);
    }, 0);

    const newTotal = currentAllocations + newAmount;
    if (newTotal > totalBudget) {
      alert(`Over allocation! Your total budget is ₱${totalBudget.toLocaleString()} but this would reach ₱${newTotal.toLocaleString()}.`);
      return;
    }

    try {
      const token = await getToken();
      if (!token || !token.id) return;

      await api.post('/budgets', {
        userId: token.id,
        category: editingCategory,
        amount: newAmount,
        periodType: budgetPeriod,
        periodStart: budgetPeriodStart ? budgetPeriodStart.toISOString() : '',
        periodEnd: budgetPeriodEnd ? budgetPeriodEnd.toISOString() : '',
      });

      setShowModal(false);
      setInputValue('');
      setEditingCategory(null);
      fetchBudgets();
    } catch (err: any) {
      alert((err?.response?.data?.error) || 'Failed to save budget');
    }
  };

  function scaleAllocationsWithFix(
    prevAllocations: { amount: number }[],
    newBudget: number
  ): { amount: number; oldAmount: number }[] {
    const prevTotal = prevAllocations.reduce((sum: number, a: { amount: number }) => sum + (a.amount || 0), 0);
    if (prevTotal === 0) {
      return prevAllocations.map((a: { amount: number }) => ({ ...a, oldAmount: a.amount, amount: 0 }));
    }

    const scaleFactor = newBudget / prevTotal;
    const scaledRaw = prevAllocations.map((a: { amount: number }) => (a.amount || 0) * scaleFactor);
    let scaled = scaledRaw.map((v: number) => Math.floor(v));
    let remainder = newBudget - scaled.reduce((s: number, v: number) => s + v, 0);

    const fracParts = scaledRaw.map((v: number, i: number) => ({ idx: i, frac: v - Math.floor(v) }));
    fracParts.sort((a: { idx: number; frac: number }, b: { idx: number; frac: number }) => b.frac - a.frac);

    for (let i = 0; i < fracParts.length && remainder > 0; i++, remainder--) {
      scaled[fracParts[i].idx] += 1;
    }

    return prevAllocations.map((a: { amount: number }, idx: number) => ({
      ...a,
      oldAmount: a.amount,
      amount: scaled[idx],
    }));
  }

  function getPrevPeriod(budgetPeriod: 'Daily' | 'Weekly' | 'Monthly', currentStart: Date) {
    const prevStart = new Date(currentStart);
    if (budgetPeriod === 'Daily') prevStart.setDate(prevStart.getDate() - 1);
    else if (budgetPeriod === 'Weekly') prevStart.setDate(prevStart.getDate() - 7);
    else if (budgetPeriod === 'Monthly') prevStart.setMonth(prevStart.getMonth() - 1);
    return prevStart;
  }

  const fetchLastPeriodBudgets = async () => {
    const user = await getToken();
    if (!user?.id) return;

    try {
      const res = await api.get(
        `/budgets/user/${user.id}?periodType=${budgetPeriod}&latest=true`
      );

      console.log('Fetched last period budgets:', res.data);
      setLastPeriodBudgets(res.data || []);
    } catch (err) {
      console.error('Error fetching last period budgets:', err);
      setLastPeriodBudgets([]);
    }
  };

  useEffect(() => {
    if (budgetPeriodStart) fetchLastPeriodBudgets();
  }, [budgetPeriod, budgetPeriodStart]);

  useEffect(() => {
    const fetchOnAuth = async () => {
      const user = await getToken();
      if (user?.id && budgetPeriod && budgetPeriodStart) {
        fetchBudgets();
        fetchExpenses();
      }
    };
    fetchOnAuth();
  }, [budgetPeriod, budgetPeriodStart]);

  const handlePeriodChange = async (
    newPeriod: 'Daily' | 'Weekly' | 'Monthly' | 'Custom',
    newStart: Date,
    newEnd: Date | null
  ) => {
    setBudgetPeriod(newPeriod);
    setBudgetPeriodStart(newStart);
    setBudgetPeriodEnd(newEnd);

    setTimeout(async () => {
      await clearBudgetsForPeriod();
      await fetchBudgets();
      await fetchExpenses();
    }, 100);
  };

  const clearAllocationsNow = async () => {
    const user = await getToken();
    if (!user?.id || !budgetPeriodStart || !budgetPeriodEnd) return;

    try {
      await api.delete(
        `/budgets/user/${user.id}/period?periodType=${budgetPeriod}&periodStart=${budgetPeriodStart.toISOString()}&periodEnd=${budgetPeriodEnd.toISOString()}`
      );

      setBudgets([]);
      setPercentInputs({});

      await fetchBudgets();
      Alert.alert("Cleared", "All allocations removed. You can set new ones.");
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Failed to clear allocations");
    }
  };

  const clearBudgetsForPeriod = async () => {
    const user = await getToken();
    if (!user?.id || !budgetPeriodStart || !budgetPeriodEnd) return;
    try {
      await api.delete(`/budgets/user/${user.id}/period?periodType=${budgetPeriod}&periodStart=${budgetPeriodStart.toISOString()}&periodEnd=${budgetPeriodEnd.toISOString()}`);

      const promises = categories.map(cat =>
        api.post('/budgets', {
          userId: user.id,
          category: cat.name,
          amount: 0,
          periodType: budgetPeriod,
          periodStart: budgetPeriodStart.toISOString(),
          periodEnd: budgetPeriodEnd.toISOString(),
        })
      );
      await Promise.all(promises);

      await fetchBudgets();
    } catch (err) {
      alert('Failed to clear previous allocations');
    }
  };

  const copyBudgetsWithScaling = async (
    budgetsList: { category: string; amount: number }[],
    scaleFactor: number,
    user: { id: string }
  ) => {
    try {
      if (!budgetPeriodStart || !budgetPeriodEnd) {
        throw new Error('Budget period start/end is null');
      }
      const requests = budgetsList.map((b: { category: string; amount: number }) => {
        const scaledAmount = Math.round((b.amount || 0) * scaleFactor);
        return api.post('/budgets', {
          userId: user.id,
          category: b.category,
          amount: scaledAmount,
          periodType: budgetPeriod,
          periodStart: budgetPeriodStart.toISOString(),
          periodEnd: budgetPeriodEnd.toISOString(),
        });
      });
      await Promise.all(requests);
      await fetchBudgets();
    } catch (e: unknown) {
      let errorMsg = 'Unknown error';
      if (typeof e === 'object' && e !== null) {
        if ('response' in e && e.response?.data?.error) {
          errorMsg = e.response.data.error;
        } else if ('message' in e) {
          errorMsg = e.message;
        }
      }
      console.log('Copy allocation error', e?.response?.data || e);
      Alert.alert("Error", 'Copy allocation error: ' + errorMsg);
    }
  };

const saveMultiPercentAllocations = async () => {
  const user = await getToken();
  if (!user?.id || !budgetPeriodStart || !budgetPeriodEnd) return;

  let totalUsed = 0;
  const requests: Promise<any>[] = [];

  // 🧩 Helper: ensure Others prefix for custom categories
  const ensureOthersPrefix = (name: string) => {
    if (BUILT_IN_CATEGORIES.some(b => b.name === name)) return name; // built-in stays as is
    if (name.startsWith("Others:")) return name; // already prefixed
    return `Others:${name}`; // prefix custom ones
  };

  for (const cat of categories) {
    if (cat.name === OTHERS_KEY) continue; // skip parent "Others" row

    const percent = Number(
      (percentInputs as Record<string, string | number>)[cat.name] || 0
    );
    if (percent <= 0) continue;

    totalUsed += percent;
    const amount = Math.round((percent / 100) * totalBudget);
    const categoryName = ensureOthersPrefix(cat.name);

    requests.push(
      api.post("/budgets", {
        userId: user.id,
        category: categoryName,
        amount,
        periodType: budgetPeriod,
        periodStart: budgetPeriodStart.toISOString(),
        periodEnd: budgetPeriodEnd.toISOString(),
      })
    );
  }

  if (totalUsed > 100) {
    Alert.alert("Error", "Total allocation exceeds 100% of the budget.");
    return;
  }

  try {
    // 🔹 Save all allocations
    await Promise.all(requests);
    await fetchBudgets();

    // 🔹 Collect new custom subcategories (non-built-ins)
    const customSubs = Object.keys(percentInputs)
      .filter(name => !BUILT_IN_CATEGORIES.some(b => b.name === name))
      .map(name => name.replace(/^Others:/, "")); // remove prefix before storing

    if (customSubs.length > 0) {
      // 🔹 Save them to AsyncStorage (for mobile persistence)
      await AsyncStorage.setItem(
        `customCategories_${user.id}`,
        JSON.stringify(customSubs)
      );
      console.log("✅ Synced custom categories to AsyncStorage:", customSubs);

      // 🩵 NEW: Immediately merge into categories state so mobile shows instantly
      setCategories(prev => {
        const existingNames = new Set(prev.map(c => c.name));
        const newCustom = customSubs
          .filter(name => !existingNames.has(`Others:${name}`))
          .map(name => ({
            name: `Others:${name}`,
            parent: OTHERS_KEY,
            icon:
              BUILT_IN_CATEGORIES.find(c => c.name === OTHERS_KEY)?.icon || (
                <Ionicons
                  name="ellipsis-horizontal-circle-outline"
                  size={20}
                  color="#fff"
                />
              ),
            color:
              BUILT_IN_CATEGORIES.find(c => c.name === OTHERS_KEY)?.color ||
              "#1f4b81ff",
          }));

        return [...prev, ...newCustom];
      });
    }

    setShowPercentModal(false);
    setPercentInputs({});
  } catch (e) {
    console.log("Save failed", e);
    Alert.alert("Error", "Failed to save allocations.");
  }
};



  const unplannedCategories = categories
    .map(c => {
      const allocated = getBudgetForCategory(c.name)?.amount || 0;
      const spent = expensesByCategory[c.name] || 0;
      if (allocated === 0 && spent > 0) {
        return { category: c.name, unplanned: spent };
      }
      return null;
    })
    .filter(Boolean);

  const unplannedAmount = unplannedCategories.reduce(
    (sum, c) => sum + (c?.unplanned || 0),
    0
  );

  
  // Categories with NO allocation at all
const unallocatedCategories = categories.filter(c => {
  const budget = getBudgetForCategory(c.name);
  return !budget || (budget.amount || 0) === 0;
});

// Amount left in total budget
const unallocatedAmount =
  totalBudget - budgets.reduce((sum, b) => sum + (b.amount || 0), 0);
  

const BudgetPieChart = ({ categories, getBudgetForCategory, OTHERS_KEY, totalBudget }) => {
  const screenWidth = Dimensions.get("window").width;
  const isSmallPhone = screenWidth < 380;
  const isTablet = screenWidth > 720;

  const colorPalette = [
    "#74B9FF", "#FDCB6E", "#6C5CE7", "#55E6C1", "#FF7675",
    "#A29BFE", "#00CEC9", "#E17055", "#81ECEC", "#FAB1A0",
  ];

  const rawData = categories
    .filter((c) => c.name !== OTHERS_KEY)
    .map((c, i) => ({
      name: c.name,
      value: getBudgetForCategory(c.name)?.amount || 0,
      color: colorPalette[i % colorPalette.length],
    }));

  const totalValue = rawData.reduce((sum, d) => sum + d.value, 0);
  const threshold = 0.05;
  const visible = rawData.filter((d) => d.value / (totalValue || 1) >= threshold);
  const hidden = rawData.filter((d) => d.value / (totalValue || 1) < threshold);
  const othersValue = hidden.reduce((sum, d) => sum + d.value, 0);

  const chartData =
    othersValue > 0
      ? [...visible, { name: "Others", value: othersValue, color: "#868B8E" }]
      : visible;

  const hasData = chartData.some((d) => d.value > 0);
  if (!hasData) {
    chartData.push({ name: "No Allocations Yet", value: 1, color: "#444" });
  }

  /* 💻 Web version */
  if (Platform.OS === "web") {
    return (
      <View
        style={{
          width: "100%",
          alignItems: "center",
          justifyContent: "center",
          paddingVertical: 10,
        }}
      >
        <View style={{ width: 280, height: 280 }}>
          <ResponsiveContainer width="100%" height="100%">
            <WebPieChart>
              <Pie
                data={chartData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius="60%"
                outerRadius="85%"
                labelLine={false}
                isAnimationActive
              >
                {chartData.map((entry, i) => (
                  <Cell key={`cell-${i}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value, name) => {
                  const percent = ((value / totalValue) * 100).toFixed(1);
                  return [`₱${value.toLocaleString()} (${percent}%)`, name];
                }}
                contentStyle={{
                  backgroundColor: "#fef7f7ff",
                  border: "none",
                  borderRadius: 8,
                  color: "#fff",
                }}
              />
            </WebPieChart>
          </ResponsiveContainer>

          {/* 🎯 Center label */}
          <View
            style={{
              position: "absolute",
              top: "50%",
              left: 0,
              right: 0,
              alignItems: "center",
              transform: [{ translateY: -10 }],
            }}
          >
            <Text style={{ color: "#fff", fontSize: 12, fontWeight: "600" }}>
              Budget Allocation
            </Text>
            <Text style={{ color: "#fff", fontSize: 12, fontWeight: "600" }}>
              Distribution
            </Text>
          </View>
        </View>
      </View>
    );
  }
// 📱 MOBILE VERSION — Donut + Legend side by side
return (
  <View
    style={{
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "flex-start",
      width: "100%",
      marginVertical: 10,
      paddingHorizontal: 8,
      gap: 16,
    }}
  >
    {/* 🟣 Donut Chart */}
    <View
      style={{
        width: 160,
        alignItems: "center",
        justifyContent: "center",
        marginLeft: -80,
      }}
    >
      <RN_PieChart
        data={chartData.map((d) => ({
          value: d.value,
          color: d.color,
          text: "",
        }))}
        donut
        radius={80}
        innerRadius={50}
        showText={false}
        centerLabelComponent={() => null}
      />
    </View>

    {/* 🟢 Legend (single column on right side) */}
    <View
      style={{
        flexDirection: "column",
        justifyContent: "center",
        gap: 10,
        paddingRight: 8,
      }}
    >
      {chartData.map((item, index) => (
        <View
          key={index}
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            minWidth: 100,
          }}
        >
          <View
            style={{
              width: 12,
              height: 12,
              borderRadius: 6,
              backgroundColor: item.color,
              flexShrink: 0,
            }}
          />
          <Text
            style={{
              color: "#FFFFFF",
              fontSize: 12,
              fontWeight: "600",
            }}
          >
            {item.name}
          </Text>
        </View>
      ))}
    </View>
  </View>
);


};




    



  return (
    <ScrollView style={styles.container}>
      {/* Header with gradient background */}

<LinearGradient
    colors={['#1f4b81ff', '#7fb1d6ff']}
  start={{ x: 0, y: 0 }}
  end={{ x: 1, y: 1 }}
  style={styles.headerGradient}
>
  {/* Subtle decorative background */}
  <View style={styles.backgroundCircle1} />
  <View style={styles.backgroundCircle2} />
  
  {Platform.OS !== "web" && (
     <TouchableOpacity
          style={styles.backButton}
            onPress={() => router.back()}
          activeOpacity={0.8}
             >
             <Ionicons name="arrow-back" size={24} color="#ffffff" />
            </TouchableOpacity>
  )}

  <View style={styles.headerContent}>
    {/* Compact Title Section */}
    <View style={styles.titleSection}>
      <Text style={styles.heading}>Budget Overview</Text>
      <View style={styles.durationPill}>
        <Ionicons name="calendar-outline" size={12} color="#8ab4f8" />
        <Text style={styles.durationText} numberOfLines={1} ellipsizeMode="tail">
          {budgetPeriod}
          {budgetPeriodStart && budgetPeriodEnd
            ? ` • ${new Date(budgetPeriodStart).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              })} - ${new Date(budgetPeriodEnd).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              })}`
            : ""}
        </Text>
      </View>
    </View>

    {/* Compact Chart and Cards Container */}
    <View style={styles.chartAndCardsContainer}>
      {/* Chart Section */}
      <View style={styles.chartSection}>
        <BudgetPieChart
          categories={categories}
          getBudgetForCategory={getBudgetForCategory}
          OTHERS_KEY={OTHERS_KEY}
          totalBudget={totalBudget}
        />
      </View>

      {/* Compact Summary Cards */}
      <View style={styles.summaryCardsColumn}>
        {/* Total Budget Card */}
        <View style={styles.summaryCard}>
          <View style={styles.cardIcon}>
            <Ionicons name="wallet" size={14} color="#8ab4f8" />
          </View>
          <View style={styles.cardContent}>
            <Text style={styles.cardLabel}>TOTAL BUDGET</Text>
            <Text style={styles.cardValue}>₱{totalBudget.toLocaleString()}</Text>
            <Text style={styles.cardSubtext}>
              {((totalExpenses / totalBudget) * 100).toFixed(0)}% used
            </Text>
          </View>
        </View>

        {/* Expenses Card */}
        <View style={styles.summaryCard}>
          <View style={styles.cardIcon}>
            <Ionicons 
              name="trending-down" 
              size={14} 
              color={totalExpenses > totalBudget ? "#f28b82" : "#f48fb1"} 
            />
          </View>
          <View style={styles.cardContent}>
            <Text style={styles.cardLabel}>EXPENSES</Text>
            <Text style={styles.cardValue}>₱{totalExpenses.toLocaleString()}</Text>
            {totalExpenses > totalBudget && (
              <Text style={styles.cardWarning}>
                ₱{(totalExpenses - totalBudget).toLocaleString()} over
              </Text>
            )}
          </View>
        </View>

        {/* Remaining Card */}
        <View style={styles.summaryCard}>
          <View style={styles.cardIcon}>
            <Ionicons 
              name={remainingAmount > 0 ? "checkmark-circle" : "alert-circle"} 
              size={14} 
              color={remainingAmount > 0 ? "#1f4b81ff" : "#1f4b81ff"} 
            />
          </View>
          <View style={styles.cardContent}>
            <Text style={styles.cardLabel}>
              {remainingAmount > 0 ? 'REMAINING' : 'OVER BUDGET'}
            </Text>
            <Text style={styles.cardValue}>₱{Math.abs(remainingAmount).toLocaleString()}</Text>
            <Text style={styles.cardSubtext}>
              {remainingAmount > 0 
                ? `${((remainingAmount / totalBudget) * 100).toFixed(0)}% left`
                : 'Budget exceeded'
              }
            </Text>
          </View>
        </View>
      </View>
    </View>
  </View>
</LinearGradient>



{/* Status Pills */}
<View style={styles.statusRow}>
  {/* 🔸 Unallocated Pill */}
{unallocatedAmount > 0 && unallocatedCategories.length > 0 && (
  <TouchableOpacity
    style={styles.unallocatedPill}
    onPress={() =>
      setShowPopover(showPopover === "unallocated" ? false : "unallocated")
    }
    activeOpacity={0.8}
  >
    <Ionicons name="hourglass-outline" size={14} color="#ffffffff" />
    <Text style={styles.pillText}>
      Unallocated ₱{unallocatedAmount.toLocaleString()}
    </Text>
  </TouchableOpacity>
)}


  {/* 🔸 Overspent Pill */}
  {overspentAmount > 0 && (
    <TouchableOpacity
      style={styles.overspentPill}
      onPress={() =>
        setShowPopover(showPopover === "overspent" ? false : "overspent")
      }
      activeOpacity={0.8}
    >
      <Ionicons name="warning-outline" size={14} color="#d63031" />
      <Text style={styles.pillText}>
        Overspent ₱{overspentAmount.toLocaleString()}
      </Text>
    </TouchableOpacity>
  )}

  {/* 🔸 Unplanned Pill */}
  {unplannedAmount > 0 && (
    <TouchableOpacity
      style={styles.unplannedPill}
      onPress={() =>
        setShowPopover(showPopover === "unplanned" ? false : "unplanned")
      }
      activeOpacity={0.8}
    >
      <Ionicons name="help-circle-outline" size={14} color="#ffffffff" />
      <Text style={styles.pillText}>
        Unplanned ₱{unplannedAmount.toLocaleString()}
      </Text>
    </TouchableOpacity>
  )}

  {/* --- Shared Popover --- */}
  {showPopover && (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <View style={styles.popoverWrapper}>
        <View style={styles.popoverContainer}>

          {/* Overspent */}
          {showPopover === "overspent" && (
            <>
              <Text style={styles.popoverTitle}>Overspent Categories</Text>
              {overspentCategories.length > 0 ? (
                overspentCategories.map((c) =>
                  c && c.category ? (
                    <View key={c.category} style={styles.popoverRow}>
                      <Text style={styles.popoverCategory}>{c.category}</Text>
                      <Text style={styles.popoverAmount}>
                        ₱{c.overspent.toLocaleString()}
                      </Text>
                    </View>
                  ) : null
                )
              ) : (
                <Text style={styles.popoverEmpty}>No overspending 🎉</Text>
              )}
            </>
          )}

          {/* Unplanned */}
          {showPopover === "unplanned" && (
            <>
              <Text style={styles.popoverTitle}>Unplanned Spending</Text>
              {unplannedCategories.length > 0 ? (
                unplannedCategories.map((c) =>
                  c && c.category ? (
                    <View key={c.category} style={styles.popoverRow}>
                      <Text style={styles.popoverCategory}>{c.category}</Text>
                      <Text style={styles.popoverAmount}>
                        ₱{c.unplanned.toLocaleString()}
                      </Text>
                    </View>
                  ) : null
                )
              ) : (
                <Text style={styles.popoverEmpty}>No unplanned spending 🎉</Text>
              )}
            </>
          )}

          {/* Unallocated */}
          {showPopover === "unallocated" && (
            <>
              <Text style={styles.popoverTitle}>Unallocated Categories</Text>
              {categories.filter(c => !getBudgetForCategory(c.name) || (getBudgetForCategory(c.name)?.amount || 0) === 0).length > 0 ? (
                categories
                  .filter(c => !getBudgetForCategory(c.name) || (getBudgetForCategory(c.name)?.amount || 0) === 0)
                  .map((c) => (
                    <View key={c.name} style={styles.popoverRow}>
                      <Text style={styles.popoverCategory}>{c.name}</Text>
                      <Text style={styles.popoverAmount}>Not Set</Text>
                    </View>
                  ))
              ) : (
                <Text style={styles.popoverEmpty}>All categories allocated 🎉</Text>
              )}
            </>
          )}

        </View>
      </View>
    </View>
  )}
</View>

    {/* ==================== ACTION BUTTONS ==================== */}
<View style={styles.actionSection}>
  {/* 🎯 Set Allocation */}
  <TouchableOpacity
    style={styles.primaryActionBtn}
    onPress={() => setShowPercentModal(true)}
  >
    <LinearGradient
      colors={["#1f4b81ff", "#7fb1d6ff"]}
      style={styles.actionBtnGradient}
    >
      <Ionicons
        name="pie-chart-outline"
        size={20}
        color="#fff"
        style={{ marginRight: 8 }}
      />
      <Text style={styles.actionBtnText}>Set Allocation</Text>
    </LinearGradient>
  </TouchableOpacity>

  {/* 🔁 Clear All */}
  <TouchableOpacity
    style={styles.secondaryActionBtn}
    onPress={clearAllocationsNow}
  >
    <Ionicons
      name="refresh-outline"
      size={18}
      color="#1f4b81ff"
      style={{ marginRight: 6 }}
    />
    <Text style={styles.secondaryActionText}>Clear All</Text>
  </TouchableOpacity>


<TouchableOpacity
  style={styles.copyPeriodBtn}
  onPress={async () => {
    try {
      const user = await getToken();
      if (!user?.id) {
        Alert.alert("Error", "User not found.");
        return;
      }

      if (!budgetPeriodStart || !budgetPeriodEnd) {
        Alert.alert("Error", "Budget period not set.");
        return;
      }

      if (!lastPeriodBudgets || lastPeriodBudgets.length === 0) {
        Alert.alert("Info", "No budgets found from last period.");
        return;
      }

      // Log for debugging
      console.log("Last period budgets:", lastPeriodBudgets);
      console.log("Current period:", budgetPeriod);
      console.log("Period start:", budgetPeriodStart);
      console.log("Period end:", budgetPeriodEnd);

      // Group last period budgets by category (sum duplicates)
      const groupedLastBudgets = {};
      
      for (const b of lastPeriodBudgets) {
        if (!b.category) continue;
        const amount = Number(b.amount) || 0;
        if (amount <= 0) continue;
        
        groupedLastBudgets[b.category] = (groupedLastBudgets[b.category] || 0) + amount;
      }

      const uniqueLastBudgets = Object.entries(groupedLastBudgets)
        .map(([category, amount]) => ({ 
          category, 
          amount: Math.round(Number(amount))
        }))
        .filter(b => b.amount > 0);

      if (uniqueLastBudgets.length === 0) {
        Alert.alert("Error", "No valid budgets to copy from last period.");
        return;
      }

      const lastSum = uniqueLastBudgets.reduce((sum, b) => sum + b.amount, 0);

      // Helper function to copy budgets ONE BY ONE with error handling
      const copyBudgets = async (budgetsToSave) => {
        try {
          let successCount = 0;
          let failedBudgets = [];

          for (const b of budgetsToSave) {
            try {
              const payload = {
                userId: user.id,
                category: b.category,
                amount: Math.round(Number(b.amount)),
                periodType: budgetPeriod,
                periodStart: budgetPeriodStart.toISOString(),
                periodEnd: budgetPeriodEnd.toISOString(),
              };

              console.log("Sending budget:", payload);

              await api.post("/budgets", payload);
              successCount++;
            } catch (err) {
              console.error(`Failed to save ${b.category}:`, err.response?.data || err.message);
              failedBudgets.push({
                category: b.category,
                error: err.response?.data?.error || err.message
              });
            }
          }

          await fetchBudgets();

          if (failedBudgets.length > 0) {
            const errorMsg = failedBudgets
              .map(f => `${f.category}: ${f.error}`)
              .join("\n");
            
            Alert.alert(
              "Partial Success",
              `${successCount} budgets copied successfully.\n\nFailed:\n${errorMsg}`
            );
          } else {
            Alert.alert("Success", `All ${successCount} budgets copied successfully!`);
          }
        } catch (error) {
          console.error("Copy budgets error:", error);
          Alert.alert(
            "Error",
            error?.response?.data?.error || error?.message || "Failed to copy budgets"
          );
        }
      };

      // Handle confirmation with proper scaling
      const handleConfirm = (budgetsToSave, message) => {
        if (Platform.OS === "web") {
          const confirmed = window.confirm(message);
          if (confirmed) {
            copyBudgets(budgetsToSave);
          }
        } else {
          Alert.alert(
            "Copy Last Period",
            message,
            [
              {
                text: "Confirm",
                onPress: () => copyBudgets(budgetsToSave),
              },
              { text: "Cancel", style: "cancel" },
            ]
          );
        }
      };

      // 🔽 SCALE DOWN
      if (lastSum > totalBudget) {
        const scaleFactor = totalBudget / lastSum;
        const scaled = uniqueLastBudgets.map(b => ({
          category: b.category,
          amount: Math.round(b.amount * scaleFactor),
          oldAmount: b.amount,
        }));

        const preview = scaled
          .map(b => `${b.category}: ₱${b.amount.toLocaleString()} (was ₱${b.oldAmount.toLocaleString()})`)
          .join("\n");

        const message = `Last period's allocations (₱${lastSum.toLocaleString()}) exceed your current budget (₱${totalBudget.toLocaleString()}).\n\nThey will be scaled DOWN proportionally.\n\n${preview}\n\nProceed?`;
        
        handleConfirm(scaled, message);
      }
      // 🔼 SCALE UP
      else if (lastSum < totalBudget) {
        const scaleFactor = totalBudget / lastSum;
        const scaled = uniqueLastBudgets.map(b => ({
          category: b.category,
          amount: Math.round(b.amount * scaleFactor),
          oldAmount: b.amount,
        }));

        const preview = scaled
          .map(b => `${b.category}: ₱${b.amount.toLocaleString()} (was ₱${b.oldAmount.toLocaleString()})`)
          .join("\n");

        const message = `Your current budget (₱${totalBudget.toLocaleString()}) is greater than last period's (₱${lastSum.toLocaleString()}).\n\nScale UP allocations proportionally?\n\n${preview}`;
        
        handleConfirm(scaled, message);
      }
      // ⚖ SAME BUDGET
      else {
        const message = `Copy last period's budgets (₱${lastSum.toLocaleString()})?`;
        handleConfirm(uniqueLastBudgets, message);
      }
    } catch (error) {
      console.error("Copy last period error:", error);
      Alert.alert(
        "Error",
        error?.response?.data?.error || error?.message || "Failed to copy last period"
      );
    }
  }}
>
  <Ionicons
    name="copy-outline"
    size={18}
    color="#00b894"
    style={{ marginRight: 6 }}
  />
  <Text style={styles.copyPeriodText}>Copy Last Period</Text>
</TouchableOpacity>

</View>


      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#667eea" />
          <Text style={styles.loadingText}>Loading budgets...</Text>
        </View>
      )}




     {/* Categories List */}
<View style={styles.categoriesWrapper}>

   
  {/* Header */}
  <LinearGradient
       colors={['#1f4b81ff', '#7fb1d6ff']}
    start={{ x: 0, y: 0 }}
    end={{ x: 1, y: 0 }}
    style={styles.tableHeader}
  >
    <Text style={[styles.headerText, { textAlign: "left" }]}>Categories</Text>
    <Text style={styles.headerTextBudget}>Budget</Text>
    <Text style={[styles.headerText, { textAlign: "right" }]}>Remaining</Text>
  </LinearGradient>

  {/* Categories (one single scrollview) */}
 {/* ==================== CATEGORIES SCROLL ==================== */}
<ScrollView
  contentContainerStyle={{ paddingBottom: 20 }}
  showsVerticalScrollIndicator={false}
>
  {/* ==================== MAIN CATEGORIES ==================== */}
  {categories
    .filter(c => c.name !== OTHERS_KEY && !c.parent)
    .map(({ name: cat, icon, color }) => {
      const budget = getBudgetForCategory(cat);
      const spent = expensesByCategory[cat] || 0;
      const allocated = budget?.amount ?? 0;
      const left = allocated > 0 ? allocated - spent : 0;
      const percent = allocated > 0 && totalBudget > 0
        ? Math.round((allocated / totalBudget) * 100)
        : 0;
      const progressRatio = allocated > 0 ? Math.min(spent / allocated, 1) : 0;
      const progressColor = getProgressColor(progressRatio);

      return (
        <TouchableOpacity
          key={cat}
          style={styles.categoryCard}
          onPress={() => {
            setEditingCategory(cat);
            setInputValue(budget ? String(budget.amount) : "");
            setShowModal(true);
          }}
          activeOpacity={0.85}
        >
          {/* progress */}
          {(allocated > 0 || spent > 0) && (
            <View style={styles.progressContainer}>
              <View
                style={[
                  styles.progressBar,
                  {
                    width: `${Math.min(progressRatio * 100, 100)}%`,
                    backgroundColor: progressColor + "20",
                  },
                ]}
              />
            </View>
          )}

          <View style={styles.categoryContent}>
            <View style={styles.colCategory}>
              <View style={[styles.categoryIcon, { backgroundColor: color }]}>
                {icon}
              </View>
              <View style={styles.categoryDetails}>
                <Text style={styles.categoryName}>{cat}</Text>
                {allocated > 0 && (
                  <Text style={styles.categoryPercent}>
                    {percent}% of budget
                  </Text>
                )}
              </View>
            </View>

            {/* Budget & Remaining */}
            <View style={styles.colBudget}>
              {allocated > 0 ? (
                <Text style={styles.budgetAmount}>
                  ₱{allocated.toLocaleString()}
                </Text>
              ) : (
                <View style={styles.noBudgetBadge}>
                  <Text style={styles.noBudgetText}>Not Set</Text>
                </View>
              )}
              <Text style={styles.spentAmount}>
                Spent ₱{spent.toLocaleString()}
              </Text>
            </View>

            <View style={styles.colRemaining}>
              {allocated > 0 ? (
                <>
                  <Text
                    style={[
                      styles.remainingAmount,
                      { color: left >= 0 ? "#00b894" : "#d63031" },
                    ]}
                  >
                    {left >= 0 ? "₱" : "-₱"}
                    {Math.abs(left).toLocaleString()}
                  </Text>
                  <View
                    style={[
                      styles.statusIndicator,
                      {
                        backgroundColor:
                          progressRatio >= 1
                            ? "#d63031"
                            : progressRatio >= 0.8
                            ? "#e17055"
                            : "#00b894",
                      },
                    ]}
                  >
                    <Text style={styles.statusText}>
                      {Math.round(progressRatio * 100)}% of {cat} budget used
                    </Text>
                  </View>
                </>
              ) : (
                <View style={styles.unplannedBadge}>
                  <Ionicons name="alert-circle" size={16} color="#1f4b81ff" />
                  <Text style={styles.unplannedText}>Unplanned</Text>
                </View>
              )}
            </View>
          </View>
        </TouchableOpacity>
      );
    })}

  {/* ==================== OTHERS SECTION ==================== */}
 {/* ==================== OTHERS SECTION (mobile-ready) ==================== */}
{(() => {
  // Always compute subcategories first (prevents undefined issues on mobile)
  const subcats = Array.isArray(categories)
    ? categories.filter(c => c.parent === OTHERS_KEY)
    : [];

  // If no subcategories yet, render nothing
  if (subcats.length === 0) return null;

  return (
    <View style={{ marginTop: 10 }}>
      {/* Divider / Toggle */}
      <TouchableOpacity
        onPress={() => {
          console.log("Others toggled:", !othersExpanded);
          toggleOthers();
        }}
        activeOpacity={0.7}
        hitSlop={{ top: 10, bottom: 10, left: 20, right: 20 }}
        style={[
          styles.othersDivider,
          {
            paddingVertical: 12,
            backgroundColor: "rgba(255,255,255,0.04)",
            borderRadius: 10,
          },
        ]}
      >
        <View style={styles.dividerLine} />
        <View
          style={[
            styles.dividerLabel,
            {
              flexDirection: "row",
              alignItems: "center",
            },
          ]}
        >
          <Ionicons
            name={othersExpanded ? "chevron-down" : "chevron-forward"}
            size={20}
            color="#74B9FF"
            style={{ marginRight: 6 }}
          />
          <Text
            style={[
              styles.dividerText,
              { fontWeight: "600", color: "#74B9FF" },
            ]}
          >
            {OTHERS_KEY}
          </Text>
        </View>
        <View style={styles.dividerLine} />
      </TouchableOpacity>

      {/* Subcategories (expanded view) */}
      {othersExpanded && (
        <Animated.View
          style={{
            overflow: "hidden",
            opacity: othersAnim,
            transform: [
              {
                scaleY: othersAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.95, 1],
                }),
              },
            ],
          }}
        >
          {subcats.map(({ name: cat, icon, color }) => {
            const budget = getBudgetForCategory(cat);
            const spent = expensesByCategory[cat] || 0;
            const allocated = budget?.amount ?? 0;
            const left = allocated > 0 ? allocated - spent : 0;
            const percent =
              allocated > 0 && totalBudget > 0
                ? Math.round((allocated / totalBudget) * 100)
                : 0;
            const progressRatio =
              allocated > 0 ? Math.min(spent / allocated, 1) : 0;
            const progressColor = getProgressColor(progressRatio);

            return (
              <TouchableOpacity
                key={cat}
                style={[styles.categoryCard, styles.subcategoryCard]}
                onPress={() => {
                  setEditingCategory(cat);
                  setInputValue(budget ? String(budget.amount) : "");
                  setShowModal(true);
                }}
                activeOpacity={0.85}
              >
                {(allocated > 0 || spent > 0) && (
                  <View style={styles.progressContainer}>
                    <View
                      style={[
                        styles.progressBar,
                        {
                          width: `${Math.min(progressRatio * 100, 100)}%`,
                          backgroundColor: progressColor + "20",
                        },
                      ]}
                    />
                  </View>
                )}

                <View style={styles.categoryContent}>
                  {/* Left icon + label */}
                  <View style={styles.colCategory}>
                    <View
                      style={[
                        styles.categoryIcon,
                        { backgroundColor: color || "#1f4b81ff" },
                      ]}
                    >
                      {icon}
                    </View>
                    <View style={styles.categoryDetails}>
                      <Text style={styles.categoryName}>
                        {cat.replace(/^Others:/, "")}
                      </Text>
                      {allocated > 0 && (
                        <Text style={styles.categoryPercent}>
                          {percent}% of budget
                        </Text>
                      )}
                    </View>
                  </View>

                  {/* Middle budget column */}
                  <View style={styles.colBudget}>
                    {allocated > 0 ? (
                      <Text style={styles.budgetAmount}>
                        ₱{allocated.toLocaleString()}
                      </Text>
                    ) : (
                      <View style={styles.noBudgetBadge}>
                        <Text style={styles.noBudgetText}>Not Set</Text>
                      </View>
                    )}
                    <Text style={styles.spentAmount}>
                      Spent ₱{spent.toLocaleString()}
                    </Text>
                  </View>

                  {/* Right remaining column */}
                  <View style={styles.colRemaining}>
                    {allocated > 0 ? (
                      <>
                        <Text
                          style={[
                            styles.remainingAmount,
                            { color: left >= 0 ? "#00b894" : "#d63031" },
                          ]}
                        >
                          {left >= 0 ? "₱" : "-₱"}
                          {Math.abs(left).toLocaleString()}
                        </Text>
                        <View
                          style={[
                            styles.statusIndicator,
                            {
                              backgroundColor:
                                progressRatio >= 1
                                  ? "#d63031"
                                  : progressRatio >= 0.8
                                  ? "#e17055"
                                  : "#00b894",
                            },
                          ]}
                        >
                          <Text style={styles.statusText}>
                            {Math.round(progressRatio * 100)}% of{" "}
                            {cat.replace(/^Others:/, "")} budget used
                          </Text>
                        </View>
                      </>
                    ) : (
                      <View style={styles.unplannedBadge}>
                        <Ionicons
                          name="alert-circle"
                          size={16}
                          color="#1f4b81ff"
                        />
                        <Text style={styles.unplannedText}>Unplanned</Text>
                      </View>
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </Animated.View>
      )}
    </View>
  );
})()}

</ScrollView>

</View>





      {/* Edit Budget Modal */}
      <Modal visible={showModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Set Budget</Text>
              <Text style={styles.modalSubtitle}>for {editingCategory}</Text>
            </View>
            
            <View style={styles.inputContainer}>
              <Text style={styles.currencySymbol}>₱</Text>
              <TextInput
                value={inputValue}
                onChangeText={setInputValue}
                keyboardType="numeric"
                placeholder="0"
                style={styles.amountInput}
                autoFocus
              />
            </View>
            
            <View style={styles.modalActions}>
              <TouchableOpacity onPress={saveBudget} style={styles.saveButton}>
                <LinearGradient colors={['#667eea', '#764ba2']} style={styles.saveButtonGradient}>
                  <Text style={styles.saveButtonText}>Save Budget</Text>
                </LinearGradient>
              </TouchableOpacity>
              
              <TouchableOpacity
                onPress={() => {
                  setShowModal(false);
                  setEditingCategory(null);
                }}
                style={styles.cancelButton}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Allocation Percentage Modal */}
      <Modal visible={showPercentModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, styles.allocationModal]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Budget Allocation</Text>
              <Text style={styles.modalSubtitle}>Set percentage for each category</Text>
            </View>

            <ScrollView style={styles.allocationScrollView} showsVerticalScrollIndicator={false}>
              {categories.map((c) => {
               const isOthers = c.name === OTHERS_KEY;
                const isSubOfOthers = c.parent === OTHERS_KEY;


                if (isSubOfOthers) return null;

                let percent = Number(percentInputs[c.name] || 0);
                let pesoEquivalent = 0;

                if (isOthers) {
                  const othersSubs = categories.filter((x) => x.parent === OTHERS_KEY);
                  const totalPercent = othersSubs.reduce(
                    (sum, sub) => sum + Number(percentInputs[sub.name] || 0),
                    0
                  );
                  percent = totalPercent;
                  pesoEquivalent = Math.round((totalPercent / 100) * totalBudget);
                } else {
                  pesoEquivalent = percent > 0 ? Math.round((percent / 100) * totalBudget) : 0;
                }

                return (
                  <View key={c.name} style={styles.allocationItem}>
                    <View style={styles.allocationRow}>
                      <View style={styles.allocationCategory}>
                        <View style={[styles.miniIcon, { backgroundColor: c.color }]}>
                          {c.icon}
                        </View>
                       <Text
                      style={styles.allocationCategoryName}
                      numberOfLines={1}
                      ellipsizeMode="tail"
                    >
                      {c.name}
                    </Text>
                        {isOthers && <Ionicons name="chevron-down" size={16} color="#74B9FF" />}
                      </View>

                      {isOthers ? (
                        <Text style={styles.autoSumText}>Auto-calculated</Text>
                      ) : (
                        <View style={styles.percentInputContainer}>
                          <TextInput
                            value={percentInputs[c.name] || ""}
                            onChangeText={(val) =>
                              setPercentInputs((prev) => ({ ...prev, [c.name]: val }))
                            }
                            placeholder="0"
                            keyboardType="numeric"
                            maxLength={3}
                            style={styles.percentInput}
                          />
                          <Text style={styles.percentSymbol}>%</Text>
                        </View>
                      )}

                      <Text style={[styles.pesoEquivalent, { color: isOthers ? '#74B9FF' : '#667eea' }]}>
                        ₱{pesoEquivalent.toLocaleString()}
                      </Text>
                    </View>

                    {/* Subcategories under Others */}
                    {isOthers && categories
                      .filter((x) => x.parent === OTHERS_KEY)
                      .map((sub) => {
                        const subPercent = Number(percentInputs[sub.name] || 0);
                        const subPeso = subPercent > 0 ? Math.round((subPercent / 100) * totalBudget) : 0;

                        return (
                          <View key={sub.name} style={styles.subcategoryRow}>
                            <View style={styles.subcategoryInfo}>
                              <View style={[styles.miniIcon, { backgroundColor: sub.color }]}>
                                {sub.icon}
                              </View>
                              <Text style={styles.subcategoryName}>{sub.name.replace(/^Others:/, "")}</Text>

                            </View>
                            
                            <View style={styles.percentInputContainer}>
                              <TextInput
                                value={percentInputs[sub.name] || ""}
                                onChangeText={(val) =>
                                  setPercentInputs((prev) => ({ ...prev, [sub.name]: val }))
                                }
                                placeholder="0"
                                keyboardType="numeric"
                                maxLength={3}
                                style={styles.percentInput}
                              />
                              <Text style={styles.percentSymbol}>%</Text>
                            </View>
                            
                            <Text style={styles.pesoEquivalent}>₱{subPeso.toLocaleString()}</Text>
                          </View>
                        );
                      })}
                  </View>
                );
              })}
            </ScrollView>

            {/* Total Summary */}
            <View style={styles.allocationSummary}>
              {(() => {
                const totalPercent = Object.values(percentInputs).reduce((sum, val) => sum + Number(val || 0), 0);
                const totalAmount = Math.round((totalPercent / 100) * totalBudget);
                return (
                  <View style={[
                    styles.summaryContainer,
                    { backgroundColor: totalPercent > 100 ? '#fee2e2' : '#f0f9ff' }
                  ]}>
                    <Text style={[
                      styles.summaryText,
                      { color: totalPercent > 100 ? '#dc2626' : '#0369a1' }
                    ]}>
                      Total: {totalPercent}% • ₱{totalAmount.toLocaleString()}
                    </Text>
                  </View>
                );
              })()}
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                onPress={() => {
                  const totalPercent = Object.values(percentInputs).reduce((sum, val) => sum + Number(val || 0), 0);
                  if (totalPercent > 100) {
                    Alert.alert("Error", "Total allocation exceeds 100% of your budget. Please adjust.");
                    return;
                  }
                  saveMultiPercentAllocations();
                }}
                style={styles.saveButton}
              >
                <LinearGradient colors={['#1d1f28ff', '#39383aff']} style={styles.saveButtonGradient}>
                  <Text style={styles.saveButtonText}>Save Allocation</Text>
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setShowPercentModal(false)}
                style={styles.cancelButton}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
   heading: {
      textAlign: "center",           // ✅ text itself centered
      fontSize: 24,
      fontWeight: "700",
      color: "#fff",
       marginTop:10,
    },
  actionSection: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    gap: 10,
  },

  loadingText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 14,
  },


  cardContent: {
    flex: 1,
    gap: 2,
  },
 
 

  // Status Pills
 statusRow: {
    position: 'relative',
     zIndex: 1000, 
  flexDirection: "row",
  justifyContent: "center",
  alignItems: "center",
  paddingHorizontal: 20,
  marginBottom: 20,
  flexWrap: "wrap",
  marginTop: 10,
  gap: 8,
},

unallocatedPill: {
  flexDirection: "row",
  alignItems: "center",
  backgroundColor: "#1f4b81ff",
  paddingHorizontal: 12,
  paddingVertical: 6,
  borderRadius: 16,
  borderWidth: 1,
  borderColor: "#1f4b81ff",
},
overspentPill: {
  flexDirection: "row",
  alignItems: "center",
  backgroundColor: "#f42c2cff",
  paddingHorizontal: 12,
  paddingVertical: 6,
  borderRadius: 16,
  borderWidth: 1,
  borderColor: "#f42c2cff",
},
unplannedPill: {
  flexDirection: "row",
  alignItems: "center",
  backgroundColor: "#1f4b81ff",
  paddingHorizontal: 12,
  paddingVertical: 6,
  borderRadius: 16,
  borderWidth: 1,
  borderColor: "#1f4b81ff",
},

pillText: {
  fontSize: 12,
  fontWeight: "600",
  marginLeft: 4,
  color: "#ffffffff",
},
// Popover
  popoverWrapper: {
    position: 'absolute',
    top: 60, // Position below the status pills
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 10000,
    elevation: 10000,
  },
  popoverContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 14,
    minWidth: 240,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    zIndex: 10001,
  },
  popoverTitle: {
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
    fontSize: 14,
    textAlign: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    paddingBottom: 6,
  },
  popoverRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
    paddingVertical: 2,
  },
  popoverCategory: {
    color: '#6b7280',
    fontSize: 13,
    flex: 1,
  },
  popoverAmount: {
    color: '#ef4444', // Softer red
    fontWeight: '500',
    fontSize: 13,
  },
  popoverEmpty: {
    color: '#9ca3af',
    fontStyle: 'italic',
    fontSize: 13,
    textAlign: 'center',
    paddingVertical: 6,
  },


  // Action Buttons
  primaryActionBtn: {
  borderRadius: 8,
  overflow: 'hidden',
  elevation: 2,
  alignSelf: "center",    // center the button
  width: 200,             // fixed width (adjust as you like)
  marginBottom: 10,
},
actionBtnGradient: {
  paddingVertical: 8,     // smaller height
  paddingHorizontal: 12,
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
},
actionBtnText: {
  color: '#fff',
  fontWeight: '600',
  fontSize: 14,
},

secondaryActionBtn: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  borderWidth: 1.5,
  borderColor: '#1f4b81ff',
  backgroundColor: '#fff',
  paddingVertical: 8,
  paddingHorizontal: 12,
  borderRadius: 8,
  alignSelf: "center",    // center it
  width: 200,             // same width as primary
  marginBottom: 10,
},
secondaryActionText: {
  color: '#1f4b81ff',
  fontWeight: '500',
  fontSize: 13,
},

  copyPeriodBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#d1f2eb',
    borderWidth: 1,
    borderColor: '#00b894',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 16,
  },
  copyPeriodText: {
    color: '#00b894',
    fontWeight: '600',
    fontSize: 15,
  },

  // Loading
  loadingContainer: {
    alignItems: 'center',
    marginTop: 40,
  },

  // Categories Section
  categoriesContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },

  tableHeaderWrapper: {
  marginBottom: 0,
  shadowColor: '#262e51',   // ✅ shadow hue based on your gradient
  shadowOpacity: 0.5,
  shadowRadius: 6,
  shadowOffset: { width: 0, height: 3 },
  elevation: 6,             // ✅ Android shadow
},
categoriesWrapper: {
    flex: 1, 
  marginHorizontal: 16,
  marginBottom: 20,
  borderRadius: 16,
  overflow: "hidden",          // ✅ rounded edges apply to children
  backgroundColor: "#fff",
  shadowColor: "#262e51",      // ✅ matches your gradient hue
  shadowOpacity: 0.25,
  shadowRadius: 8,
  shadowOffset: { width: 0, height: 4 },
  elevation: 6,                // ✅ Android shadow
},

tableHeader: {
  flexDirection: "row",
  alignItems: "center",
  paddingHorizontal: 16,
  paddingVertical: 14,
},

categoriesList: {
  paddingVertical: 8,
  backgroundColor: "#f9fafb",  // ✅ subtle background
},

headerText: {
  flex: 1,
  fontSize: 13,
  fontWeight: '700',
  color: '#fff',
  textTransform: 'uppercase',
  letterSpacing: 0.5,
},


  // Category Cards
  categoryCard: {
    backgroundColor: '#fff',
    borderRadius: 0,
    marginBottom: 12,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    position: 'relative',
  },
  subcategoryCard: {
    marginLeft: 20,
    backgroundColor: '#f8fafc',
  },
  progressContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  progressBar: {
    height: '100%',
    borderRadius: 16,
  },
categoryContent: {
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  paddingVertical: 10,
  paddingHorizontal: 8,        // ✅ reduced from 12
  backgroundColor: "#F9FAFB",
  borderRadius: 10,
  flexWrap: "nowrap",
  minHeight: 60,               // ✅ added minimum height
},

// 2️⃣ Fix colCategory (around line 1509)
colCategory: {
  flexDirection: "row",
  alignItems: "center",
  flex: 1,                     // ✅ changed from 0.2
  minWidth: 80,                // ✅ added minimum width
  maxWidth: 120,               // ✅ added maximum width
},
  categoryInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
categoryIcon: {
  width: 36,
  height: 36,
  borderRadius: 18,
  marginRight: 8,
  justifyContent: "center",
  alignItems: "center",
},
  categoryDetails: {
    flex: 1,
  },
 categoryName: {
  color: "#1E293B",
  fontSize: 12,                // ✅ reduced from 13
  fontWeight: "600",
  flexShrink: 1,
  flexWrap: "nowrap",
  textAlign: "left",
  numberOfLines: 1,            // ✅ added single line limit
},
  categoryPercent: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
  },

  // Budget Column
budgetColumn: {
  width: 100,            // instead of minWidth
  alignItems: 'center',
  marginHorizontal: 8,
},
  budgetAmount: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 2,
  },
  spentAmount: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '500',
  },
  

  // Status Column
 statusColumn: {
  width: 120,            // instead of minWidth
  alignItems: 'flex-end',
},
  remainingAmount: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  statusIndicator: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    minWidth: 40,
    alignItems: 'center',
  },

  unplannedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  unplannedText: {
    fontSize: 11,
    color: '#1f4b81ff',
    fontWeight: '600',
    marginLeft: 4,
  },

  // Others Divider
  othersDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
    paddingHorizontal: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e2e8f0',
  },
  dividerLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  dividerText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#74B9FF',
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
  },
  allocationModal: {
    maxHeight: '85%',
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
  },

  // Input Styles
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    marginBottom: 20,
    paddingHorizontal: 16,
  },
  currencySymbol: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#667eea',
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    paddingVertical: 12,
  },

  // Modal Actions
  modalActions: {
    marginTop: 20,
  },
  saveButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 12,
  },
  saveButtonGradient: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  cancelButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  cancelButtonText: {
    color: '#64748b',
    fontWeight: '600',
    fontSize: 15,
  },

  // Allocation Modal Specific
  allocationScrollView: {
    maxHeight: 300,
    marginBottom: 16,
  },
  allocationItem: {
    marginBottom: 16,
  },



  miniIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
allocationRow: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  paddingVertical: 10,
  backgroundColor: '#f8fafc',
  borderRadius: 12,
  marginBottom: 5,
  width: '100%',
},

allocationCategory: {
  flexDirection: 'row',
  alignItems: 'center',
  flex: 1,           // ✅ allow full use of row space
  minWidth: 0,       // ✅ critical in ScrollView to avoid wrapping
  overflow: 'hidden', // ✅ prevent text overflow
},

allocationCategoryName: {
  fontSize: 14,
  fontWeight: '600',
  color: '#1e293b',
  flexShrink: 1,
  flexGrow: 1,
  minWidth: 0,
  flexWrap: 'nowrap',
  includeFontPadding: false,
  textAlignVertical: 'center',
},

percentInputContainer: {
  flexDirection: 'row',
  alignItems: 'center',
  backgroundColor: '#fff',
  borderRadius: 8,
  borderWidth: 1,
  borderColor: '#e2e8f0',
  paddingHorizontal: 8,
  marginHorizontal: 12,
  minWidth: 60,       // ✅ ensures layout balance
  flexShrink: 0,      // ✅ prevents it from squishing text
},

  percentInput: {
    width: 40,
    textAlign: 'center',
    paddingVertical: 8,
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
  },
  percentSymbol: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
  },
  autoSumText: {
    fontSize: 12,
    color: '#74B9FF',
    fontStyle: 'italic',
    fontWeight: '500',
    marginHorizontal: 12,
  },
  pesoEquivalent: {
    fontSize: 13,
    fontWeight: '700',
    minWidth: 80,
    textAlign: 'right',
  },

  // Subcategory Styles
  subcategoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 24,
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 4,
    marginLeft: 16,
  },
  subcategoryInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  subcategoryName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#475569',
    flex: 1,
  },

  // Allocation Summary
  allocationSummary: {
    marginBottom: 16,
  },
  summaryContainer: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  summaryText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
 colBudget: {
  flex: 1,
  alignItems: "center",
  minWidth: 70,                // ✅ added minimum width
},

// 4️⃣ Fix colRemaining (around line 1771)
colRemaining: {
  flex: 1,
  alignItems: "flex-end",
  minWidth: 80,                // ✅ added minimum width
},

colRemaining: {
  flex: 1,
  alignItems: "flex-end",
},
statusText: {
  fontSize: 13,
  fontWeight: '500',
  color: '#fff',
  textAlign: 'center',
  paddingHorizontal: 4,
},
noBudgetOverspentBadge: {
  backgroundColor: '#ff4d4f', // glaring red
  paddingHorizontal: 8,
  paddingVertical: 4,
  borderRadius: 8,
  marginBottom: 2,
},
noBudgetOverspentText: {
  fontSize: 11,
  color: '#fff',
  fontWeight: '700',
},

noBudgetBadge: {
  backgroundColor: '#e5e7eb', // gray
  paddingHorizontal: 8,
  paddingVertical: 4,
  borderRadius: 8,
  marginBottom: 2,
},
noBudgetText: {
  fontSize: 11,
  color: '#6b7280', // dark gray text
  fontWeight: '600',
},


unplannedSpendingBadge: {
  backgroundColor: '#1f4b81ff', // orange
  paddingHorizontal: 8,
  paddingVertical: 4,
  borderRadius: 8,
  marginBottom: 2,
},
unplannedSpendingText: {
  fontSize: 11,
  color: '#fff',
  fontWeight: '700',
},

unplannedOverspentBadge: {
  backgroundColor: '#1f4b81ff', // red
  paddingHorizontal: 5,
  paddingVertical: 4,
  borderRadius: 8,
  marginBottom: 2,
},
unplannedOverspentText: {
  fontSize: 11,
  color: '#fff',
  fontWeight: '500',
},
headerTextBudget: {
  flex: 1.3,
  fontSize: 13,
  fontWeight: "700",
  color: "#fff",
  textTransform: "uppercase",
  letterSpacing: 0.5,
},
  backButton: {
    position: 'absolute',
    left: 20,
    top: Platform.OS === 'isMobile' ? 70 : 47,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
backText: {
  color: "#fff",
  fontSize: 14,
  fontWeight: "600",
  marginLeft: 4,
},
pieChartContainer: {
  backgroundColor: '#1e1e1e',
  borderRadius: 16,
  paddingVertical: 12,
  paddingHorizontal: 8,
  marginVertical: 12,
  alignItems: 'center',
  justifyContent: 'center',
},
chartSection: {
  backgroundColor: '#1f1f1f',
  borderRadius: 16,
  paddingVertical: 16,
  paddingHorizontal: 12,
  marginHorizontal: 12,
  marginTop: 12,
  marginBottom: 20,
  alignItems: 'center',
  justifyContent: 'center',
  elevation: 4,
  shadowColor: '#000',
  shadowOpacity: 0.2,
  shadowOffset: { width: 0, height: 2 },
  shadowRadius: 4,
},

chartTitle: {
  color: '#fff',
  fontSize: 18,
  fontWeight: '600',
  marginBottom: 10,
},
chartContainer: {
  alignItems: "center",
  justifyContent: "center",
  width: "100%",
  marginTop: 10,
  paddingVertical: 10,
},

chartHeading: {
  color: "#fff",
  fontSize: 24,
  fontWeight: "700",
  marginBottom: 6,
},

  chartContainerInHeader: {
    width: Platform.OS === 'web' ? 280 : 260,
    height: Platform.OS === 'web' ? 280 : 260,
    alignItems: 'center',
    justifyContent: 'center',
  },

  summaryCardInHeader: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    overflow: 'hidden',
  },
  cardContentInHeader: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
    gap: 4,
  },
  overBudgetCard: {
    backgroundColor: 'rgba(239, 83, 80, 0.1)',
  },
  cardLabelInHeader: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  cardValueInHeader: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  summaryCardsColumn: {
  flexGrow: 1,
  justifyContent: "center",
  alignSelf: width < 700 ? "center" : "flex-start",
  gap: 14,
  maxWidth: 420,
},

summaryCard: {
  backgroundColor: "rgba(12, 7, 7, 0.06)",
  borderRadius: 12,
  borderWidth: 1,
  borderColor: "rgba(8, 1, 1, 0.1)",
  flexDirection: "row",
  alignItems: "flex-start",
  padding: 12,
  gap: 10,
},
chartSection: {
  flexShrink: 0,
  alignItems: "center",
  justifyContent: "center",
  width: width < 700 ? "100%" : 360,
},
headerGradient: {
  width: "100%",
  flexGrow: 0,              // ✅ don't fill extra space
  flexShrink: 1,
  flexBasis: "auto",
  flexDirection: "column",
  justifyContent: "flex-start", // ✅ removes vertical centering gap
  alignItems: "center",
  paddingTop: Platform.OS === "ios" ? 16 : 18,  // 🔹 much smaller padding
  paddingBottom: 20,                             // 🔹 minimal bottom padding
  paddingHorizontal: 12,
  borderBottomLeftRadius: 20,
  borderBottomRightRadius: 20,
  position: "relative",
  overflow: "hidden",
},

headerContent: {
  width: "100%",
  alignItems: "stretch",   // ✅ important: allows full-width child layout
  gap: 24,
},
 backgroundCircle1: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(100, 181, 246, 0.04)',
    top: -150,
    right: -100,
  },
   backgroundCircle2: {
    position: 'absolute',
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: 'rgba(236, 64, 122, 0.03)',
    bottom: -80,
    left: -80,
  },
   

  
  // Centered title
  titleSection: {
    gap: 8,
    alignItems: 'center',
  },
 
   durationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(10, 12, 14, 0.12)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(5, 6, 7, 0.2)',
  },
  durationText: {
    fontSize: 11,
    fontWeight: '500',
    color: 'rgba(19, 22, 27, 1)',
    letterSpacing: 0.2,
  },
});
  
 
if (isMobile) {
  Object.assign(styles, {
     categoryContent: {
      ...styles.categoryContent,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      flexWrap: "nowrap",
      paddingVertical: 8,
      paddingHorizontal: 8,          // ✅ reduced from 10
      minHeight: 60,                 // ✅ added
    },
    colCategory: {
      ...styles.colCategory,
      flex: 1,                       // ✅ changed from 0.8
      flexDirection: "row",
      alignItems: "center",
      minWidth: 70,                  // ✅ changed from 0
      maxWidth: 110,                 // ✅ added
    },
    colBudget: {
      ...styles.colBudget,
      flex: 1,                       // ✅ changed from 0.6
      alignItems: "center",
      minWidth: 65,                  // ✅ added
    },
    colRemaining: {
      ...styles.colRemaining,
      flex: 1,                       // ✅ changed from 0.6
      alignItems: "flex-end",
      minWidth: 75,                  // ✅ added
    },
    categoryName: {
      ...styles.categoryName,
      flexShrink: 1,
      flexWrap: "nowrap",
      textAlign: "left",
      fontSize: 11,                  // ✅ reduced from 13
      numberOfLines: 1,              // ✅ added
    },
    categoryIcon: {                  // ✅ NEW: reduce icon size
      width: 30,
      height: 30,
      borderRadius: 15,
      marginRight: 6,
      justifyContent: "center",
      alignItems: "center",
    },
    budgetAmount: {
      ...styles.budgetAmount,
      fontSize: 11,                  // ✅ reduced from 12
      textAlign: "center",           // ✅ changed from "right"
    },
    remainingAmount: {
      ...styles.remainingAmount,
      fontSize: 11,                  // ✅ reduced from 12
      textAlign: "right",
    },
    spentAmount: {                   // ✅ NEW: reduce spent text size
      fontSize: 10,
      color: '#64748b',
      fontWeight: '500',
    },
    statusText: {                    // ✅ NEW: reduce status text size
      fontSize: 10,
      fontWeight: '500',
      color: '#fff',
      textAlign: 'center',
      paddingHorizontal: 3,
    },
    // ✅ SUBCATEGORY STYLES
    subcategoryRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 10,           // ✅ reduced from 12
      paddingLeft: 35,               // ✅ reduced from 40
      paddingRight: 8,               // ✅ added
      borderTopWidth: 1,
      borderTopColor: 'rgba(255,255,255,0.05)',
    },
    subcategoryInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,                        // ✅ reduced from 8
      flex: 1,
      minWidth: 0,
      maxWidth: 100,                 // ✅ added
    },
    subcategoryName: {
      color: '#94A3B8',
      fontSize: 11,                  // ✅ reduced from 14
      flex: 1,
      minWidth: 0,
      numberOfLines: 1,              // ✅ added
    },
    tableHeader: {
      ...styles.tableHeader,
      paddingHorizontal: 12,         // ✅ reduced from 16
    },
    headerText: {
      ...styles.headerText,
      flex: 1,                       // ✅ changed from 0.8
      textAlign: "left",
      fontSize: 11,                  // ✅ added
    },
    headerTextBudget: {
      ...styles.headerTextBudget,
      flex: 1,                       // ✅ changed from 0.9
      textAlign: "center",
      marginLeft: 0,                 // ✅ changed from 12
      fontSize: 11,                  // ✅ added
    },
    headerTextRemaining: {
      ...styles.headerText,
      flex: 1,                       // ✅ changed from 0.7
      textAlign: "right",
      fontSize: 11,                  // ✅ added
    },
    unplannedSpendingBadge: {
      backgroundColor: '#1f4b81ff',
      paddingHorizontal: 5,          // ✅ reduced from 6
      paddingVertical: 2,            // ✅ reduced from 3
      borderRadius: 8,
      marginBottom: 2,
      alignSelf: 'center',
    },
    unplannedSpendingText: {
      fontSize: 9,                   // ✅ reduced from 10
      color: '#fff',
      fontWeight: '700',
      textAlign: 'center',
    },
    noBudgetText: {                  // ✅ NEW: reduce "Not Set" badge text
      fontSize: 10,
      color: '#6b7280',
      fontWeight: '600',
    },
    headerGradient: {
      width: "100%",
      flexShrink: 1,
      flexGrow: 0,
      flexBasis: "auto",
      flexDirection: "column",
      justifyContent: "flex-start",
      alignItems: "center",
      paddingTop: Platform.OS === "ios" ? 10 : 20,
      paddingBottom: 10,
      paddingHorizontal: 12,
      borderBottomLeftRadius: 24,
      borderBottomRightRadius: 24,
      position: "relative",
      overflow: "hidden",
    },
    backgroundCircle1: {
      ...styles.backgroundCircle1,
      width: 100,
      height: 100,
      top: -20,
      left: -20,
      opacity: 0.1,
    },
    backgroundCircle2: {
      ...styles.backgroundCircle2,
      width: 80,
      height: 80,
      bottom: -15,
      right: -10,
      opacity: 0.08,
    },
    headerContent: {
      ...styles.headerContent,
      alignItems: "center",
      justifyContent: "center",
      width: "100%",
      marginTop: 10,
      paddingVertical: 20,
    },
    titleSection: {
      ...styles.titleSection,
      alignItems: "center",
      justifyContent: "center",
      textAlign: "center",
      marginBottom: 10,
    },
    heading: {
      ...styles.heading,
      textAlign: "center",
      fontSize: 24,
      fontWeight: "700",
      color: "#fff",
      marginTop: 10,
    },
    durationPill: {
      ...styles.durationPill,
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: "rgba(255,255,255,0.15)",
      borderRadius: 10,
      paddingHorizontal: 6,
      paddingVertical: 3,
      marginTop: 4,
    },
    durationText: {
      ...styles.durationText,
      fontSize: 11,
      color: "#e0eaff",
      marginLeft: 3,
    },
    chartSection: {
      ...styles.chartSection,
      width: 150,
      height: 150,
      alignItems: "center",
      justifyContent: "center",
      marginRight: -6,
      transform: [{ translateX: -8 }],
    },
    summaryCardsColumn: {
      ...styles.summaryCardsColumn,
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      width: "90%",
      gap: 6,
    },
    summaryCard: {
      ...styles.summaryCard,
      flex: 1,
      backgroundColor: "rgba(255,255,255,0.1)",
      borderRadius: 10,
      paddingVertical: 6,
      paddingHorizontal: 8,
    },
    cardIcon: {
      ...styles.cardIcon,
      width: 22,
      height: 22,
      borderRadius: 11,
      marginBottom: 4,
      justifyContent: "center",
      alignItems: "center",
    },
    cardContent: {
      ...styles.cardContent,
      alignItems: "flex-start",
    },
    cardLabel: {
      ...styles.cardLabel,
      fontSize: 10,
      color: "#dce9ff",
    },
    cardValue: {
      ...styles.cardValue,
      fontSize: 13,
      fontWeight: "700",
      color: "#fff",
    },
    cardSubtext: {
      ...styles.cardSubtext,
      fontSize: 10,
      color: "#bcd2f8",
    },
    cardWarning: {
      ...styles.cardWarning,
      fontSize: 10,
      color: "#ffb3b3",
    },
subcategoryRow: {
  ...styles.subcategoryRow,
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  paddingVertical: 10,
  paddingLeft: 35,
  paddingRight: 8,
  borderTopWidth: 1,
  borderTopColor: 'rgba(255,255,255,0.05)',
  gap: 6,
},
subcategoryInfo: {
  ...styles.subcategoryInfo,
  flexDirection: 'row',
  alignItems: 'center',
  gap: 6,
  flex: 0,
  minWidth: 0,
  maxWidth: 100,
},
subcategoryName: {
  ...styles.subcategoryName,
  color: '#94A3B8',
  fontSize: 12,
  flex: 1,
  minWidth: 0,
},
percentInputContainer: {
  ...styles.percentInputContainer,
  flexDirection: 'row',
  alignItems: 'center',
  minWidth: 60,
},
percentInput: {
  ...styles.percentInput,
  width: 40,
  fontSize: 13,
},
pesoEquivalent: {
  ...styles.pesoEquivalent,
  fontSize: 12,
  minWidth: 50,
  textAlign: 'right',
},

  });
} 


Object.assign(styles, {
  chartAndCardsContainer: {
    flexDirection: width < 800 ? "column" : "row", // stack on phone
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    marginTop: 0,
    gap: width < 800 ? 10 : 40, // tighter on small screens
    paddingHorizontal: width < 800 ? 10 : 20,
  },

  chartSection: {
    alignItems: "center",
    justifyContent: "center",
    width: width < 500 ? 160 : width < 900 ? 200 : 240,  // auto-scale
    height: width < 500 ? 160 : width < 900 ? 200 : 240,
    marginBottom: width < 800 ? 10 : 0,
    transform: [{ scale: width < 600 ? 0.9 : 1 }],
  },

  summaryCardsColumn: {
    justifyContent: "center",
    alignItems: width < 800 ? "center" : "flex-start",
    gap: width < 500 ? 6 : 10,
    maxWidth: width < 700 ? "90%" : 340,
    width: "100%",
  },

  summaryCard: {
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    paddingVertical: width < 600 ? 6 : 8,
    paddingHorizontal: width < 600 ? 8 : 12,
    gap: 10,
    width: width < 800 ? "95%" : 280, // fits next to chart
    alignSelf: width < 800 ? "center" : "flex-start",
  },

  cardIcon: {
    width: width < 500 ? 20 : 24,
    height: width < 500 ? 20 : 24,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  cardLabel: {
    fontSize: width < 500 ? 9 : 11,
    fontWeight: "600",
    color: "rgba(255,255,255,0.7)",
  },
  cardValue: {
    fontSize: width < 500 ? 13 : 16,
    fontWeight: "700",
    color: "#fff",
  },
  cardSubtext: {
    fontSize: width < 500 ? 9 : 11,
    color: "rgba(255,255,255,0.5)",
  },
});

