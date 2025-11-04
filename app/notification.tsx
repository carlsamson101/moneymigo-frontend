// @ts-nocheck
import React, { useEffect, useState } from "react";
import { useRouter } from "expo-router";
import * as Notifications from "expo-notifications";

import { LinearGradient } from 'expo-linear-gradient';
import { 
  View, 
  Text, 
  FlatList, 
  TouchableOpacity, 
  StyleSheet, 
  RefreshControl,
  ActivityIndicator,
  Alert 
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { getToken } from "../lib/auth";
import api from "../lib/api";
import { Platform, Dimensions } from "react-native";



type Notification = {
  _id: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  type?: string; 
  budgetAmount?: number;
  spentAmount?: number;
  itemName?: string;
  storeName?: string;
  price?: number;
};

const { width, height } = Dimensions.get("window");
const isMobile = Platform.OS === "ios" || Platform.OS === "android";

const categories = ["All", "Goals", "Savings", "Transactions","Overspent","Deals"];

export default function NotificationsScreen() {

  useEffect(() => {
  if (Platform.OS !== "web") {
    const subscription = Notifications.addPushTokenListener(token => {
      console.log("🔔 Push token changed:", token);
    });
    return () => subscription.remove();
  }
}, []);
  // ✅ FIXED: Move useRouter INSIDE the component
  const router = useRouter();
  
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState("All");


  if (!notifications) {
  return (
    <View style={[styles.container, styles.centered]}>
      <Text style={{ color: "#ef4444" }}>Something went wrong loading notifications.</Text>
    </View>
  );
}


  const fetchNotifications = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    
    const token = await getToken();
    if (!token?.id) {
      setLoading(false);
      setRefreshing(false);
      return;
    }

    try {
     const res = await api.get(`/notifications/${token.id}`);
    if (!res?.data || !Array.isArray(res.data)) {
      console.warn("⚠️ Unexpected notification data:", res?.data);
      setNotifications([]);
      return;
    }
    setNotifications(res.data);

    } catch (err) {
      console.error("❌ Failed to fetch notifications:", err);
    safeAlert("Error", "Failed to load notifications. Please try again.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    const token = await getToken();
    if (!token?.accessToken) return;

    try {
      await api.put(
        `/notifications/${notificationId}/read`,
        {}, 
        { headers: { Authorization: `Bearer ${token.accessToken}` } }
      );

      setNotifications(prev =>
        prev.map(notif =>
          notif._id === notificationId ? { ...notif, read: true } : notif
        )
      );
    } catch (err) {
      console.error("❌ Failed to mark as read:", err);
    }
  };

  const markAllAsRead = async () => {
    const token = await getToken();
    if (!token?.id) return;

    try {
      await api.patch(`/notifications/${token.id}/read-all`);
      setNotifications(prev => prev.map(notif => ({ ...notif, read: true })));
    } catch (err) {
      console.error("❌ Failed to mark all as read:", err);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const formatDate = (date: string) => {
    const d = new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 1) return "Just now";
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return d.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const getNotificationStyle = (item: Notification) => {
    let iconName = "notifications";
    let iconColor = "#3B82F6";
    let bgColor = "#3B82F6";

    if (item.type) {
      switch (item.type.toLowerCase()) {
        case "achievement":
          iconName = "emoji-events";
          iconColor = "#10B981";
          bgColor = "#10B981";
          break;
        case "warning":
          iconName = "warning";
          iconColor = "#F59E0B";
          bgColor = "#F59E0B";
          break;
        case "error":
          iconName = "error";
          iconColor = "#EF4444";
          bgColor = "#EF4444";
          break;
        case "update":
          iconName = "system-update";
          iconColor = "#8B5CF6";
          bgColor = "#8B5CF6";
          break;
        case "goal":
          iconName = "notifications-active";
          iconColor = "#3B82F6";
          bgColor = "#3B82F6";
          break;
        case "savings":
          iconName = "savings";
          iconColor = "#059669";
          bgColor = "#059669";
          break;
        case "transaction":
          iconName = "swap-horiz";
          iconColor = "#2563EB";
          bgColor = "#2563EB";
          break;
        case "overspent":
          iconName = "warning";       
          iconColor = "#d63031";      
          bgColor = "#f8d7da";  
          break;
        case "deal":
          iconName = "local-offer";
          iconColor = "#16a34a";
          bgColor = "#bbf7d0";
          break;
        default:
          break;
      }
    } else {
      if (item.title.includes("Deleted")) {
        iconName = "delete";
        iconColor = "#EF4444";
        bgColor = "#EF4444";
      } else if (item.title.includes("Achieved")) {
        iconName = "emoji-events";
        iconColor = "#10B981";
        bgColor = "#10B981";
      } else if (item.title.includes("Updated")) {
        iconName = "edit";
        iconColor = "#F59E0B";
        bgColor = "#F59E0B";
      } else if (item.title.includes("Created")) {
        iconName = "flag";
        iconColor = "#3B82F6";
        bgColor = "#3B82F6";
      }
    }

    return { iconName, iconColor, bgColor };
  };

  const filteredNotifications = notifications.filter((n) => {
    if (activeTab === "All") return true;
    if (activeTab === "Goals") return n.type === "goal";
    if (activeTab === "Savings") return n.type === "savings";
    if (activeTab === "Transactions") return n.type === "transaction";
    if (activeTab === "Overspent") return n.type === "warning";
    if (activeTab === "Deals") return n.type === "deal";
    return true;
  });

  const renderItem = ({ item }: { item: Notification }) => {
    const { iconName, iconColor, bgColor } = getNotificationStyle(item);

    return (
      <TouchableOpacity 
        style={[
          styles.card, 
          !item.read && styles.unreadCard,
          { shadowColor: !item.read ? bgColor : "#000" }
        ]}
        onPress={() => !item.read && markAsRead(item._id)}
        activeOpacity={0.7}
      >
        <View style={[
          styles.iconWrapper, 
          { backgroundColor: bgColor + "15" }
        ]}>
          <MaterialIcons name={iconName as any} size={24} color={iconColor} />
        </View>

        <View style={styles.content}>
          <View style={styles.titleRow}>
            <Text style={[
              styles.title, 
              !item.read && styles.unreadTitle
            ]} numberOfLines={2}>
              {item.title}
            </Text>
            {!item.read && <View style={[styles.unreadDot, { backgroundColor: bgColor }]} />}
          </View>
          
          <Text style={styles.message} numberOfLines={3}>
            {item.message}
          </Text>

          {item.type === "warning" && (
  <View style={{ marginTop: 6 }}>
    {typeof item.spentAmount === "number" && !isNaN(item.spentAmount) && (
      <Text style={{ color: "#d63031", fontWeight: "600" }}>
        Spent ₱{item.spentAmount.toLocaleString()}
      </Text>
    )}
    {typeof item.budgetAmount === "number" && !isNaN(item.budgetAmount) && (
      <Text style={{ color: "#6b7280", fontWeight: "600" }}>
        Budget ₱{item.budgetAmount.toLocaleString()}
      </Text>
    )}
  </View>
)}


        {item.type === "deal" && (
  <View style={{ marginTop: 6 }}>
    {item.itemName && (
      <Text style={{ color: "#16a34a", fontWeight: "600" }}>
        Item: {item.itemName}
      </Text>
    )}
    {item.storeName && (
      <Text style={{ color: "#065f46", fontWeight: "600" }}>
        Store: {item.storeName}
      </Text>
    )}
    {typeof item.price === "number" && !isNaN(item.price) && (
      <Text style={{ color: "#111827", fontWeight: "600" }}>
        Price: ₱{item.price.toLocaleString()}
      </Text>
    )}
  </View>
)}

          <View style={styles.footer}>
            <Text style={styles.date}>{formatDate(item.createdAt)}</Text>
            {item.type && (
              <View style={[styles.typeBadge, { backgroundColor: bgColor + "20" }]}>
                <Text style={[styles.typeText, { color: bgColor }]}>
                  {item.type.toUpperCase()}
                </Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <MaterialIcons name="notifications-none" size={64} color="#9CA3AF" />
      <Text style={styles.emptyTitle}>No notifications yet</Text>
      <Text style={styles.emptyMessage}>
        When you receive notifications, they'll appear here
      </Text>
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>Loading notifications...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#1f4b81ff', '#7fb1d6ff']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerGradient}
      >
        <View style={[styles.headerRow, { alignItems: "center" }]}>
          {isMobile && (
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.backButton}
              activeOpacity={0.8}
            >
              <MaterialIcons name="arrow-back" size={26} color="#fff" />
            </TouchableOpacity>
          )}

          <View style={{ flex: 1 }}>
            <Text style={styles.heading}>Notifications</Text>
            {unreadCount > 0 && (
              <Text style={styles.unreadCount}>{unreadCount} unread</Text>
            )}
          </View>

          <TouchableOpacity onPress={markAllAsRead} style={{ position: "relative" }}>
            <MaterialIcons
              name={unreadCount > 0 ? "notifications-active" : "notifications-none"}
              size={28}
              color="#fff"
            />
            {unreadCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>
                  {unreadCount > 9 ? "9+" : unreadCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </LinearGradient>

     <View style={styles.tabsContainer}>
  <FlatList
    horizontal
    data={["All", "Goals", "Savings", "Transactions", "Overspent", "Deals"]}
    keyExtractor={(item) => item}
    showsHorizontalScrollIndicator={false}
    contentContainerStyle={{ paddingHorizontal: 4 }}
    renderItem={({ item: tab }) => (
      <TouchableOpacity
        key={tab}
        style={[
          styles.tabButton,
          activeTab === tab && styles.activeTabButton,
        ]}
        onPress={() => setActiveTab(tab)}
      >
        <Text
          style={[
            styles.tabText,
            activeTab === tab && styles.activeTabText,
          ]}
        >
          {tab}
        </Text>
      </TouchableOpacity>
    )}
  />
</View>

      <FlatList
        data={filteredNotifications}
        keyExtractor={(item) => item._id}
        renderItem={renderItem}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        contentContainerStyle={
          notifications.length === 0
            ? styles.emptyContainer
            : styles.listContainer
        }
        ListEmptyComponent={renderEmptyState}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchNotifications(true)}
            colors={["#3B82F6"]}
            tintColor="#3B82F6"
          />
        }
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: "#F8FAFC",
  },
  centered: {
    justifyContent: "center",
    alignItems: "center",
  },
  listContainer: {
    padding: 16,
  },
  card: {
    flexDirection: "row",
    padding: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    alignItems: "flex-start",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },
  unreadCard: {
    backgroundColor: "#FEFEFF",
    borderColor: "#DBEAFE",
    shadowOpacity: 0.12,
    transform: [{ scale: 1.02 }],
  },
  iconWrapper: {
    marginRight: 14,
    padding: 12,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    flex: 1,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  title: { 
    fontWeight: "600", 
    fontSize: 16, 
    color: "#111827",
    flex: 1,
    lineHeight: 22,
  },
  unreadTitle: { 
    color: "#1D4ED8",
    fontWeight: "700",
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#2563EB",
    marginLeft: 8,
    marginTop: 6,
    shadowColor: "#2563EB",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
  },
  message: { 
    fontSize: 14, 
    color: "#4B5563", 
    lineHeight: 20,
    marginBottom: 8,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  date: { 
    fontSize: 12, 
    color: "#9CA3AF",
    fontWeight: "500",
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  typeText: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  separator: { 
    height: 12,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#6B7280",
  },
  emptyContainer: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 100,
  },
  emptyState: {
    alignItems: "center",
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#374151",
    marginTop: 16,
    marginBottom: 8,
  },
  emptyMessage: {
    fontSize: 16,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 24,
  },
  tabsContainer: {
  backgroundColor: "#F8FAFC",
  paddingVertical: 8,
  marginBottom: 12,
  borderBottomWidth: 1,
  borderBottomColor: "#E2E8F0",
},
tabButton: {
  paddingHorizontal: isMobile ? 14 : 20,
  paddingVertical: 10,
  borderRadius: 20,
  backgroundColor: "#FFFFFF",
  alignItems: "center",
  justifyContent: "center",
  marginHorizontal: 4,
  minHeight: 38,
  borderWidth: 1,
  borderColor: "#E2E8F0",
  shadowColor: "#000",
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.05,
  shadowRadius: 2,
  elevation: 2,
},
activeTabButton: {
  backgroundColor: "#3B82F6",
  borderColor: "#3B82F6",
  shadowColor: "#3B82F6",
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.25,
  shadowRadius: 4,
  elevation: 4,
},
tabText: {
  color: "#64748B",
  fontWeight: "600",
  fontSize: isMobile ? 13 : 14,
  letterSpacing: 0.2,
  textAlign: "center",
  whiteSpace: "nowrap", // ✅ Prevents text wrapping
},
activeTabText: {
  color: "#FFFFFF",
  fontWeight: "700",
  fontSize: isMobile ? 13 : 14,
},
  badge: {
    position: "absolute",
    top: -4,
    right: -4,
    backgroundColor: "#EF4444",
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
    borderWidth: 2,
    borderColor: "#fff",
  },
  badgeText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
  },
  headerGradient: {
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    marginBottom: 12,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  heading: {
    fontSize: 28,
    fontWeight: "700",
    color: "#fff",
    letterSpacing: -0.5,
  },
  unreadCount: {
    fontSize: 14,
    color: "rgba(255,255,255,0.8)",
    marginTop: 2,
  },
  backButton: {
    marginRight: 10,
    padding: 6,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.15)",
    justifyContent: "center",
    alignItems: "center",
  },
});