// @ts-nocheck
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Pressable ,
  Platform,
  Dimensions,
  ActivityIndicator,
  SafeAreaView,
  Alert,
  Modal,
  TextInput,
} from "react-native";

import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import api from "../lib/api";
import { checkAdminAuth } from "../lib/adminAuthGuard";
import { usePathname } from "expo-router";

export default function AdminHomePage() {
    const currentPage = "home"; // Change per page

  useEffect(() => {
  (async () => {
    const isValid = await checkAdminAuth();
    if (!isValid) return; // 🚫 stops rendering if not authorized
  })();
}, []);

  const [users, setUsers] = useState([]);
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
const pathname = usePathname();
  // Delete modal
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [targetType, setTargetType] = useState(null);
  const [targetName, setTargetName] = useState("");
  const [targetId, setTargetId] = useState("");

  // Edit store modal
  const [editStoreVisible, setEditStoreVisible] = useState(false);
  const [editStoreName, setEditStoreName] = useState("");
  const [editStorePassword, setEditStorePassword] = useState("");
  const [editStoreId, setEditStoreId] = useState("");
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);
// Add these state variables after your existing useState hooks
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const { width } = Dimensions.get('window');
  const isMobile = width < 768;

  /* =========================================================
     FETCH USERS & STORES
  ========================================================= */
  const fetchData = async () => {
    try {
      const [usersRes, storesRes] = await Promise.all([
        api.get("/admin/users"),
        api.get("/admin/stores"),
      ]);
      setUsers(usersRes.data);
      setStores(storesRes.data);
    } catch (err) {
      console.error("❌ Fetch error:", err);
      alert("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  /* =========================================================
     DELETE FUNCTIONS
  ========================================================= */
  const handleDeleteConfirm = async () => {
    setConfirmVisible(false);
    try {
      if (targetType === "user") {
        const res = await api.delete(`/admin/user/${targetId}`);
        if (res.status === 200) {
          setUsers((prev) => prev.filter((u) => u._id !== targetId));
          alert("User deleted successfully!");
        }
      } else if (targetType === "store") {
        const res = await api.delete(`/admin/store/${encodeURIComponent(targetName)}`);
        if (res.status === 200) {
          setStores((prev) => prev.filter((s) => s.storeName !== targetName));
          alert(`Store "${targetName}" deleted successfully!`);
        }
      }
    } catch (err) {
      console.error("❌ Delete failed:", err);
      alert("Failed to delete item.");
    }
  };

  /* =========================================================
     RENDER
  ========================================================= */
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.layout}>
      {/* Mobile Hamburger Button */}
{isMobile && !sidebarVisible && (
  <TouchableOpacity 
    style={styles.hamburgerBtn}
    onPress={() => setSidebarVisible(true)}
  >
    <Ionicons name="menu" size={28} color="white" />
  </TouchableOpacity>
)}

{/* Sidebar Overlay for Mobile */}
{isMobile && sidebarVisible && (
  <TouchableOpacity
    style={styles.sidebarOverlay}
    activeOpacity={1}
    onPress={() => setSidebarVisible(false)}
  />
)}

{/* Sidebar - Always rendered, positioned based on state */}
<LinearGradient
  colors={['#0D7C8A', '#16A9B8']}
  style={[
    styles.sidebar,
    isMobile && {
      position: 'absolute',
      left: sidebarVisible ? 0 : -280,
      zIndex: 1000,
      height: '100%',
    }
  ]}
  start={{ x: 0, y: 0 }}
  end={{ x: 0, y: 1 }}
>
  {/* Close button (only on mobile when open) */}
  {isMobile && sidebarVisible && (
    <TouchableOpacity 
      style={styles.closeBtn}
      onPress={() => setSidebarVisible(false)}
    >
      <Ionicons name="close" size={28} color="white" />
    </TouchableOpacity>
  )}

  <View style={styles.sidebarHeader}>
    <View style={styles.logoCircle}>
      <Text style={styles.sidebarLogoText}>M</Text>
    </View>
    <Text style={styles.sidebarTitle}>Admin Panel</Text>
  </View>

<View style={styles.sidebarMenu}>
  <TouchableOpacity
    style={[
      styles.sidebarItem,
      pathname === "/AdminHomePage" && styles.sidebarItemActive
    ]}
    onPress={() => {
      if (isMobile) setSidebarVisible(false);
      router.push("/AdminHomePage");
    }}
  >
    <Ionicons 
      name="home" 
      size={24} 
      color={pathname === "/AdminHomePage" ? "#A4C639" : "rgba(255,255,255,0.7)"} 
    />
    <Text style={[
      styles.sidebarText,
      pathname === "/AdminHomePage" && styles.sidebarTextActive
    ]}>
      Home
    </Text>
  </TouchableOpacity>

  <TouchableOpacity
    style={[
      styles.sidebarItem,
      pathname === "/AdminToolsPage" && styles.sidebarItemActive
    ]}
    onPress={() => {
      if (isMobile) setSidebarVisible(false);
      router.push("/AdminToolsPage");
    }}
  >
    <Ionicons 
      name="settings-outline" 
      size={24} 
      color={pathname === "/AdminToolsPage" ? "#A4C639" : "rgba(255,255,255,0.7)"} 
    />
    <Text style={[
      styles.sidebarText,
      pathname === "/AdminToolsPage" && styles.sidebarTextActive
    ]}>
      Tools
    </Text>
  </TouchableOpacity>

  <TouchableOpacity
    style={[
      styles.sidebarItem,
      pathname === "/AdminDealsPage" && styles.sidebarItemActive
    ]}
    onPress={() => {
      if (isMobile) setSidebarVisible(false);
      router.push("/AdminDealsPage");
    }}
  >
    <Ionicons 
      name="pricetag-outline" 
      size={24} 
      color={pathname === "/AdminDealsPage" ? "#A4C639" : "rgba(255,255,255,0.7)"} 
    />
    <Text style={[
      styles.sidebarText,
      pathname === "/AdminDealsPage" && styles.sidebarTextActive
    ]}>
      Deals
    </Text>
  </TouchableOpacity>
</View>

  <TouchableOpacity
    style={styles.logoutBtn}
    onPress={() => {
      if (isMobile) setSidebarVisible(false);
      setLogoutModalVisible(true);
    }}
  >
    <Ionicons name="log-out-outline" size={24} color="#EF4444" />
    <Text style={styles.logoutText}>Logout</Text>
  </TouchableOpacity>
</LinearGradient>

{/* ===== Logout Confirmation Modal ===== */}
<Modal 
  transparent 
  visible={logoutModalVisible} 
  animationType="fade"
  onRequestClose={() => setLogoutModalVisible(false)}
>
  <Pressable 
    style={styles.modalOverlay} 
    onPress={() => setLogoutModalVisible(false)}
  >
    <View style={styles.dialogBox} onStartShouldSetResponder={() => true}>
      <View style={styles.dialogIconWrapper}>
        <Ionicons name="log-out-outline" size={32} color="#EF4444" />
      </View>

      <Text style={styles.dialogTitle}>Confirm Logout</Text>
      <Text style={styles.dialogMessage}>
        Are you sure you want to log out of the admin panel?
      </Text>

      <View style={styles.dialogActions}>
        <TouchableOpacity 
          style={styles.dialogCancelBtn}
          onPress={() => setLogoutModalVisible(false)}
        >
          <Text style={styles.dialogCancelText}>Cancel</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.dialogConfirmBtn}
          onPress={async () => {
            try {
              await AsyncStorage.removeItem("adminToken");
              setLogoutModalVisible(false);
              router.replace("/AdminLoginPage");
            } catch (err) {
              console.error("Logout failed:", err);
              Alert.alert("Error", "Failed to log out properly.");
            }
          }}
        >
          <Text style={styles.dialogConfirmText}>Logout</Text>
        </TouchableOpacity>
      </View>
    </View>
  </Pressable>
</Modal>

        {/* ===== Main Content ===== */}
        <ScrollView style={styles.mainContent}>
          <LinearGradient
            colors={["#0D7C8A", "#16A9B8"]}
            style={styles.pageHeader}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Text style={styles.pageTitle}>Admin Dashboard</Text>
            <Text style={styles.pageSubtitle}>
              Overview of users and stores
            </Text>
          </LinearGradient>

          {loading ? (
            <ActivityIndicator
              size="large"
              color="#16A9B8"
              style={{ marginTop: 40 }}
            />
          ) : (
            <>
              {/* Stats */}
              <View style={styles.statsRow}>
                <View style={styles.statCard}>
                  <Ionicons name="people" size={28} color="#16A9B8" />
                  <Text style={styles.statNumber}>{users.length}</Text>
                  <Text style={styles.statLabel}>Total Users</Text>
                </View>
                <View style={styles.statCard}>
                  <Ionicons name="storefront" size={28} color="#A4C639" />
                  <Text style={styles.statNumber}>{stores.length}</Text>
                  <Text style={styles.statLabel}>Total Stores</Text>
                </View>
              </View>

              {/* Manage Users */}
<View style={styles.section}>
  <Text style={styles.sectionTitle}>Manage Users ({users.length})</Text>
  {users.length === 0 ? (
    <Text style={styles.emptyText}>No users found.</Text>
  ) : (
    <ScrollView 
      style={styles.scrollableList}
      showsVerticalScrollIndicator={true}
      nestedScrollEnabled={true}
    >
      {users.map((user) => (
        <View key={user._id} style={styles.itemCard}>
          <View style={{ flex: 1 }}>
            <Text style={styles.itemName}>
              {user.username ||
                `${user.firstName} ${user.lastName}`}
            </Text>
            <Text style={styles.itemSub}>
              {user.email || "no email"}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => {
              setTargetType("user");
              setTargetId(user._id);
              setTargetName(user.username || user.email);
              setConfirmVisible(true);
            }}
            style={styles.deleteBtn}
          >
            <Ionicons
              name="trash-outline"
              size={18}
              color="#EF4444"
            />
          </TouchableOpacity>
        </View>
      ))}
    </ScrollView>
  )}
</View>

              {/* Manage Stores */}
<View style={styles.section}>
  <Text style={styles.sectionTitle}>Manage Stores ({stores.length})</Text>
  {stores.length === 0 ? (
    <Text style={styles.emptyText}>No stores found.</Text>
  ) : (
    <ScrollView 
      style={styles.scrollableList}
      showsVerticalScrollIndicator={true}
      nestedScrollEnabled={true}
    >
      {stores.map((store) => (
        <View key={store._id} style={styles.itemCard}>
          <View style={{ flex: 1 }}>
            <Text style={styles.itemName}>{store.storeName}</Text>
            <Text style={styles.itemSub}>
              Role: {store.role || "store"}
            </Text>
          </View>

          <View style={{ flexDirection: "row", gap: 8 }}>
            <TouchableOpacity
              onPress={() => {
                setEditStoreId(store._id);
                setEditStoreName(store.storeName);
                setEditStorePassword("");
                setEditStoreVisible(true);
              }}
              style={[
                styles.deleteBtn,
                { backgroundColor: "#DBEAFE" },
              ]}
            >
              <Ionicons
                name="create-outline"
                size={18}
                color="#2563EB"
              />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                setTargetType("store");
                setTargetName(store.storeName);
                setConfirmVisible(true);
              }}
              style={styles.deleteBtn}
            >
              <Ionicons
                name="trash-outline"
                size={18}
                color="#EF4444"
              />
            </TouchableOpacity>
          </View>
        </View>
      ))}
    </ScrollView>
  )}
</View>
            </>
          )}
        </ScrollView>
      </View>

      {/* ===== Delete Confirmation Modal ===== */}
      <Modal transparent visible={confirmVisible} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Confirm Delete</Text>
            <Text style={styles.modalMessage}>
              Are you sure you want to delete{" "}
              {targetType === "store"
                ? `store "${targetName}"`
                : `user "${targetName}"`}?
            </Text>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelBtn]}
                onPress={() => setConfirmVisible(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.deleteBtnModal]}
                onPress={handleDeleteConfirm}
              >
                <Text style={styles.modalDeleteText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ===== Edit Store Modal ===== */}
      <Modal transparent visible={editStoreVisible} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { alignItems: "stretch" }]}>
            <Text style={styles.modalTitle}>Edit Store</Text>
            <Text style={styles.modalMessage}>
              Update the store name or password below.
            </Text>

            <View style={{ marginBottom: 12 }}>
              <Text style={{ fontWeight: "600", marginBottom: 4 }}>
                Store Name
              </Text>
              <View style={{ backgroundColor: "#F1F5F9", borderRadius: 8 }}>
                <TextInput
                  value={editStoreName}
                  onChangeText={setEditStoreName}
                  style={{ padding: 10, fontSize: 15 }}
                  placeholder="Enter new store name"
                />
              </View>
            </View>

            <View style={{ marginBottom: 12 }}>
              <Text style={{ fontWeight: "600", marginBottom: 4 }}>
                Password
              </Text>
              <View style={{ backgroundColor: "#F1F5F9", borderRadius: 8 }}>
                <TextInput
                  value={editStorePassword}
                  onChangeText={setEditStorePassword}
                  style={{ padding: 10, fontSize: 15 }}
                  placeholder="Enter new password"
                  secureTextEntry
                />
              </View>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelBtn]}
                onPress={() => setEditStoreVisible(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>

             <TouchableOpacity
  style={[styles.modalButton, { backgroundColor: "#16A9B8" }]}
  onPress={async () => {
    if (!editStoreName && !editStorePassword) {
      alert("Please provide a new name or password to update.");
      return;
    }

    try {
      const payload = {
        ...(editStoreName ? { storeName: editStoreName } : {}),
        ...(editStorePassword ? { password: editStorePassword } : {}),
      };

      const res = await api.put(`/admin/store/${editStoreId}`, payload);

      if (res.status === 200) {
        alert("✅ Store updated successfully!");
        setEditStoreVisible(false);
        fetchData();
      }
    } catch (err) {
      console.error("❌ Update store failed:", err.response?.data || err);
      alert(err.response?.data?.error || "Failed to update store.");
    }
  }}
>
  <Text style={styles.modalDeleteText}>Save Changes</Text>
</TouchableOpacity>

            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

/* =========================================================
   STYLES
========================================================= */
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F8FAFC" },
  layout: { flex: 1, flexDirection: "row" },
   sidebar: {
    width: 260,
    paddingTop: 24,
    paddingHorizontal: 16,
    justifyContent: "space-between",
    // Add smooth transition on web
    ...(Platform.OS === 'web' && {
      transition: 'left 0.3s ease-in-out',
    }),
  },
  sidebarHeader: {
    alignItems: "center",
    marginBottom: 32,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.15)",
  },
  logoCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(255,255,255,0.95)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  sidebarLogoText: { fontSize: 28, fontWeight: "900", color: "#16A9B8" },
  sidebarTitle: { fontSize: 20, fontWeight: "700", color: "white" },
  sidebarMenu: { flex: 1 },
  sidebarItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  sidebarItemActive: { backgroundColor: "rgba(164,198,57,0.15)" },
  sidebarText: { marginLeft: 12, fontSize: 15, color: "rgba(255,255,255,0.7)" },
  sidebarTextActive: { color: "#A4C639", fontWeight: "600" },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.95)",
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  logoutText: { marginLeft: 12, fontSize: 15, color: "#EF4444" },
  mainContent: { flex: 1,     marginTop: Dimensions.get('window').width < 768 ? 60 : 0, },
  pageHeader: { padding: 24 },
  pageTitle: { fontSize: 28, fontWeight: "700", color: "white" },
  pageSubtitle: { fontSize: 14, color: "rgba(255,255,255,0.9)" },
  statsRow: { flexDirection: "row", gap: 16, padding: 24 },
  statCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
  },
  statNumber: { fontSize: 28, fontWeight: "700", color: "#1E293B" },
  statLabel: { fontSize: 14, color: "#64748B" },
  section: { paddingHorizontal: 24, paddingVertical: 16 },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1E293B",
    marginBottom: 12,
  },
  itemCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  itemName: { fontSize: 16, fontWeight: "600", color: "#1E293B" },
  itemSub: { fontSize: 13, color: "#64748B" },
  deleteBtn: { padding: 8, borderRadius: 8, backgroundColor: "#FEE2E2" },
  emptyText: { color: "#94A3B8", fontSize: 14 },

  


 // ADD these NEW styles:
  hamburgerBtn: {
    position: 'absolute',
    top: 20,
    left: 20,
    zIndex: 999,
    backgroundColor: '#16A9B8',
    padding: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  sidebarOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    zIndex: 999,
  },
  closeBtn: {
    alignSelf: 'flex-end',
    padding: 8,
    marginBottom: 8,
  },
  scrollableList: {
  maxHeight: 600, // Adjust this value (shows ~5-6 items)
  backgroundColor: '#FFFFFF',
  borderRadius: 12,
  padding: 8,
},

 // Add these NEW styles instead:
modalOverlay: {
  flex: 1,
  backgroundColor: "rgba(0,0,0,0.5)",
  justifyContent: "center",
  alignItems: "center",
},

dialogBox: {
  width: "85%",
  maxWidth: 400,
  backgroundColor: "#fff",
  borderRadius: 16,
  padding: 24,
  alignItems: "center",
  shadowColor: "#000",
  shadowOpacity: 0.2,
  shadowRadius: 10,
  elevation: 10,
},

dialogIconWrapper: {
  width: 56,
  height: 56,
  borderRadius: 28,
  backgroundColor: "#FEE2E2",
  justifyContent: "center",
  alignItems: "center",
  marginBottom: 16,
},

dialogTitle: {
  fontSize: 20,
  fontWeight: "700",
  color: "#1E293B",
  textAlign: "center",
  marginBottom: 8,
},

dialogMessage: {
  fontSize: 15,
  color: "#475569",
  textAlign: "center",
  marginBottom: 20,
  lineHeight: 22,
},

dialogActions: {
  flexDirection: "row",
  justifyContent: "space-between",
  width: "100%",
  gap: 12,
},

dialogCancelBtn: {
  flex: 1,
  paddingVertical: 12,
  borderRadius: 10,
  alignItems: "center",
  backgroundColor: "#E2E8F0",
},

dialogConfirmBtn: {
  flex: 1,
  paddingVertical: 12,
  borderRadius: 10,
  alignItems: "center",
  backgroundColor: "#EF4444",
},

dialogCancelText: {
  color: "#1E293B",
  fontWeight: "600",
  fontSize: 15,
},

dialogConfirmText: {
  color: "#fff",
  fontWeight: "600",
  fontSize: 15,
},
});
