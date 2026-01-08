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


export default function NotificationsScreen() {


  useEffect(() => {
    if (Platform.OS !== "web") {
      const subscription = Notifications.addPushTokenListener(token => {
        console.log("🔔 Push token changed:", token);
      });
      return () => subscription.remove();
    }
  }, []);


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
      if (Platform.OS === "web") {
        window.alert("Error\n\nFailed to load notifications. Please try again.");
      } else {
        Alert.alert("Error", "Failed to load notifications. Please try again.");
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };


  const markAsRead = async (notificationId: string) => {
    try {
      setNotifications(prev =>
        prev.map(notif =>
          notif._id === notificationId ? { ...notif, read: true } : notif
        )
      );


      const token = await getToken();
      if (!token?.id) {
        console.error("❌ No user token found");
        return;
      }


      await api.put(`/notifications/${notificationId}/read`);
      console.log("✅ Marked notification as read:", notificationId);
    } catch (err) {
      console.error("❌ Failed to mark as read:", err);
      setNotifications(prev =>
        prev.map(notif =>
          notif._id === notificationId ? { ...notif, read: false } : notif
        )
      );
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
    let iconColor = "#F4B942";
    let bgColor = "#F4B942";


    if (item.type) {
      switch (item.type.toLowerCase()) {
        case "achievement":
          iconName = "emoji-events";
          iconColor = "#F4B942";
          bgColor = "#F4B942";
          break;
        case "warning":
          iconName = "warning";
          iconColor = "#DC8500";
          bgColor = "#DC8500";
          break;
        case "error":
          iconName = "error";
          iconColor = "#6B1C23";
          bgColor = "#6B1C23";
          break;
        case "update":
          iconName = "system-update";
          iconColor = "#8B6B47";
          bgColor = "#8B6B47";
          break;
        case "goal":
          iconName = "notifications-active";
          iconColor = "#F4B942";
          bgColor = "#F4B942";
          break;
        case "savings":
          iconName = "savings";
          iconColor = "#C49A3C";
          bgColor = "#C49A3C";
          break;
        case "transaction":
          iconName = "swap-horiz";
          iconColor = "#8B4B47";
          bgColor = "#8B4B47";
          break;
        case "overspent":
          iconName = "warning";      
          iconColor = "#6B1C23";      
          bgColor = "#6B1C23";  
          break;
        case "deal":
          iconName = "local-offer";
          iconColor = "#F4B942";
          bgColor = "#F4B942";
          break;
        default:
          break;
      }
    } else {
      if (item.title.includes("Deleted")) {
        iconName = "delete";
        iconColor = "#6B1C23";
        bgColor = "#6B1C23";
      } else if (item.title.includes("Achieved")) {
        iconName = "emoji-events";
        iconColor = "#F4B942";
        bgColor = "#F4B942";
      } else if (item.title.includes("Updated")) {
        iconName = "edit";
        iconColor = "#DC8500";
        bgColor = "#DC8500";
      } else if (item.title.includes("Created")) {
        iconName = "flag";
        iconColor = "#F4B942";
        bgColor = "#F4B942";
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
          { backgroundColor: bgColor + "20" }
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
            <View style={styles.warningDetailsCard}>
              <View style={styles.warningDetailsContent}>
                <View style={styles.warningDetailsHeader}>
                  <MaterialIcons name="warning" size={18} color="#DC8500" />
                  <Text style={styles.warningDetailsTitle}>Budget Status</Text>
                </View>


                <View style={styles.statsRow}>
                  {typeof item.spentAmount === "number" && !isNaN(item.spentAmount) && (
                    <View style={styles.statCard}>
                      <View style={styles.statCardContent}>
                        <MaterialIcons name="trending-up" size={16} color="#DC8500" />
                        <Text style={styles.statLabel}>Spent</Text>
                        <Text style={styles.statValue}>₱{item.spentAmount.toLocaleString()}</Text>
                      </View>
                    </View>
                  )}


                  {typeof item.budgetAmount === "number" && !isNaN(item.budgetAmount) && (
                    <View style={styles.statCard}>
                      <View style={styles.statCardContent}>
                        <MaterialIcons name="account-balance-wallet" size={16} color="#6B1C23" />
                        <Text style={styles.statLabel}>Budget</Text>
                        <Text style={styles.statValue}>₱{item.budgetAmount.toLocaleString()}</Text>
                      </View>
                    </View>
                  )}
                </View>


                {typeof item.spentAmount === "number" && typeof item.budgetAmount === "number" && !isNaN(item.spentAmount) && !isNaN(item.budgetAmount) && (
                  <View style={styles.enhancedProgressSection}>
                    <View style={styles.progressHeader}>
                      <Text style={styles.progressLabel}>Progress</Text>
                      <View style={[
                        styles.percentageBadge,
                        { backgroundColor: item.spentAmount / item.budgetAmount > 1 ? '#6B1C23' : '#DC8500' }
                      ]}>
                        <Text style={styles.percentageText}>
                          {Math.round((item.spentAmount / item.budgetAmount) * 100)}%
                        </Text>
                      </View>
                    </View>
                   
                    <View style={styles.enhancedProgressBar}>
                      <View
                        style={[
                          styles.enhancedProgressFill,
                          {
                            width: `${Math.min((item.spentAmount / item.budgetAmount) * 100, 100)}%`,
                            backgroundColor: item.spentAmount / item.budgetAmount > 1 ? '#6B1C23' : '#DC8500'
                          }
                        ]}
                      />
                    </View>


                    {item.spentAmount / item.budgetAmount > 1 && (
                      <View style={styles.overbudgetAlert}>
                        <MaterialIcons name="error-outline" size={12} color="#6B1C23" />
                        <Text style={styles.overbudgetText}>
                          ₱{(item.spentAmount - item.budgetAmount).toLocaleString()} over budget
                        </Text>
                      </View>
                    )}
                  </View>
                )}
              </View>
            </View>
          )}


          {item.type === "deal" && (
            <View style={styles.dealDetailsCard}>
              <View style={styles.dealDetailsContent}>
                <View style={styles.dealDetailsHeader}>
                  <MaterialIcons name="stars" size={18} color="#F4B942" />
                  <Text style={styles.dealDetailsTitle}>Deal Details</Text>
                </View>


                <View style={styles.dealInfoContainer}>
                  {item.itemName && (
                    <View style={styles.dealInfoCard}>
                      <View style={styles.dealInfoIconWrapper}>
                        <MaterialIcons name="inventory-2" size={16} color="#DC8500" />
                      </View>
                      <View style={styles.dealInfoTextContainer}>
                        <Text style={styles.dealInfoLabel}>Item</Text>
                        <Text style={styles.dealInfoValue}>{item.itemName}</Text>
                      </View>
                    </View>
                  )}


                  {item.storeName && (
                    <View style={styles.dealInfoCard}>
                      <View style={styles.dealInfoIconWrapper}>
                        <MaterialIcons name="store" size={16} color="#8B6B47" />
                      </View>
                      <View style={styles.dealInfoTextContainer}>
                        <Text style={styles.dealInfoLabel}>Store</Text>
                        <Text style={styles.dealInfoValue}>{item.storeName}</Text>
                      </View>
                    </View>
                  )}
                </View>


                {typeof item.price === "number" && !isNaN(item.price) && (
                  <View style={styles.enhancedPriceHighlight}>
                    <View style={styles.priceContent}>
                      <MaterialIcons name="local-offer" size={22} color="#F4B942" />
                      <View style={styles.priceTextContainer}>
                        <Text style={styles.priceLabel}>Deal Price</Text>
                        <Text style={styles.enhancedPriceText}>₱{item.price.toLocaleString()}</Text>
                      </View>
                    </View>
                  </View>
                )}
              </View>
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
      <MaterialIcons name="notifications-none" size={64} color="#C49A3C" />
      <Text style={styles.emptyTitle}>No notifications yet</Text>
      <Text style={styles.emptyMessage}>
        When you receive notifications, they'll appear here
      </Text>
    </View>
  );


  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#F4B942" />
        <Text style={styles.loadingText}>Loading notifications...</Text>
      </View>
    );
  }


  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#6B1C23', '#8B3A3A']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerGradient}
      >
        <View style={[styles.headerRow, { alignItems: "center" }]}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
            activeOpacity={0.8}
          >
            <MaterialIcons name="arrow-back" size={26} color="#6B1C23" />
          </TouchableOpacity>


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
              color="#F4B942"
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
            colors={["#F4B942"]}
            tintColor="#F4B942"
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
    backgroundColor: "#FFF9F0",
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
    shadowColor: "#6B1C23",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 2,
    borderColor: "#F4B942",
    marginHorizontal: 2,
  },
  unreadCard: {
    backgroundColor: "#FFFBF5",
    borderColor: "#F4B942",
    borderWidth: 2.5,
    shadowOpacity: 0.2,
    shadowColor: "#F4B942",
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
    color: "#6B1C23",
    flex: 1,
    lineHeight: 22,
  },
  unreadTitle: {
    color: "#6B1C23",
    fontWeight: "700",
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#F4B942",
    marginLeft: 8,
    marginTop: 6,
    shadowColor: "#F4B942",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
  },
  message: {
    fontSize: 14,
    color: "#6B4B47",
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
    color: "#8B6B47",
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
    height: 16,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#8B6B47",
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
    color: "#6B1C23",
    marginTop: 16,
    marginBottom: 8,
  },
  emptyMessage: {
    fontSize: 16,
    color: "#8B6B47",
    textAlign: "center",
    lineHeight: 24,
  },
  tabsContainer: {
    backgroundColor: "#FFF9F0",
    paddingVertical: 8,
    marginBottom: 12,
    borderBottomWidth: 2,
    borderBottomColor: "#F4B942",
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
    borderWidth: 2,
    borderColor: "#F4B942",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  activeTabButton: {
    backgroundColor: "#F4B942",
    borderColor: "#6B1C23",
    shadowColor: "#F4B942",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  tabText: {
    color: "#8B6B47",
    fontWeight: "600",
    fontSize: isMobile ? 13 : 14,
    letterSpacing: 0.2,
    textAlign: "center",
  },
  activeTabText: {
    color: "#6B1C23",
    fontWeight: "700",
    fontSize: isMobile ? 13 : 14,
  },
  badge: {
    position: "absolute",
    top: -4,
    right: -4,
    backgroundColor: "#F4B942",
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
    borderWidth: 2,
    borderColor: "#6B1C23",
  },
  badgeText: {
    color: "#6B1C23",
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
    color: "#F4B942",
    letterSpacing: -0.5,
  },
  unreadCount: {
    fontSize: 14,
    color: "rgba(244, 185, 66, 0.8)",
    marginTop: 2,
  },
  backButton: {
    marginRight: 12,
    padding: 8,
    borderRadius: 12,
    backgroundColor: "#F4B942",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#F4B942",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 2,
    borderColor: "rgba(107, 28, 35, 0.2)",
  },


  // Warning Details Styles
  warningDetailsCard: {
    marginTop: 10,
    marginBottom: 6,
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 1.5,
    borderColor: "#DC8500",
    backgroundColor: "rgba(220, 133, 0, 0.05)",
  },
  warningDetailsContent: {
    padding: 14,
  },
  warningDetailsHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  warningDetailsTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#6B1C23",
    letterSpacing: 0.3,
  },
  statsRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 12,
  },
  statCard: {
    flex: 1,
    borderRadius: 10,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(139, 107, 71, 0.2)",
    backgroundColor: "#FFFFFF",
  },
  statCardContent: {
    padding: 10,
    alignItems: "center",
    gap: 4,
  },
  statLabel: {
    fontSize: 10,
    color: "#8B6B47",
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  statValue: {
    fontSize: 15,
    fontWeight: "800",
    color: "#6B1C23",
    marginTop: 2,
  },
  enhancedProgressSection: {
    gap: 8,
  },
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  progressLabel: {
    fontSize: 11,
    color: "#8B6B47",
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  percentageBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  percentageText: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.3,
    color: "#FFFFFF",
  },
  enhancedProgressBar: {
    height: 7,
    backgroundColor: "rgba(139, 107, 71, 0.2)",
    borderRadius: 4,
    overflow: "hidden",
  },
  enhancedProgressFill: {
    height: "100%",
    borderRadius: 4,
  },
  overbudgetAlert: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(107, 28, 35, 0.1)",
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(107, 28, 35, 0.2)",
  },
  overbudgetText: {
    fontSize: 11,
    color: "#6B1C23",
    fontWeight: "700",
  },
 
  // Deal Details Styles
  dealDetailsCard: {
    marginTop: 10,
    marginBottom: 6,
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 1.5,
    borderColor: "#F4B942",
    backgroundColor: "rgba(244, 185, 66, 0.05)",
  },
  dealDetailsContent: {
    padding: 14,
  },
  dealDetailsHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  dealDetailsTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#6B1C23",
    letterSpacing: 0.3,
  },
  dealInfoContainer: {
    gap: 8,
    marginBottom: 12,
  },
  dealInfoCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#FFFFFF",
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(139, 107, 71, 0.2)",
  },
  dealInfoIconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "rgba(244, 185, 66, 0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  dealInfoTextContainer: {
    flex: 1,
  },
  dealInfoLabel: {
    fontSize: 10,
    color: "#8B6B47",
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  dealInfoValue: {
    fontSize: 14,
    color: "#6B1C23",
    fontWeight: "700",
  },
  enhancedPriceHighlight: {
    borderRadius: 10,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "#F4B942",
    backgroundColor: "rgba(244, 185, 66, 0.1)",
  },
  priceContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
  },
  priceTextContainer: {
    flex: 1,
  },
  priceLabel: {
    fontSize: 10,
    color: "#8B6B47",
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  enhancedPriceText: {
    fontSize: 20,
    fontWeight: "900",
    color: "#6B1C23",
    letterSpacing: -0.5,
  },
});



