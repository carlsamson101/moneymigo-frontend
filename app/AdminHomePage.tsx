// @ts-nocheck
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
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

export default function AdminHomePage() {
  useEffect(() => {
  (async () => {
    const isValid = await checkAdminAuth();
    if (!isValid) return; // 🚫 stops rendering if not authorized
  })();
}, []);

  const [users, setUsers] = useState([]);
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);

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
        {/* ===== Sidebar ===== */}
        <LinearGradient
          colors={["#0D7C8A", "#16A9B8"]}
          style={styles.sidebar}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
        >
          <View style={styles.sidebarHeader}>
            <View style={styles.logoCircle}>
              <Text style={styles.sidebarLogoText}>M</Text>
            </View>
            <Text style={styles.sidebarTitle}>Admin Panel</Text>
          </View>

          <View style={styles.sidebarMenu}>
            <TouchableOpacity
              style={[styles.sidebarItem, styles.sidebarItemActive]}
              onPress={() => router.push("/AdminHomePage")}
            >
              <Ionicons name="home" size={24} color="#A4C639" />
              <Text style={[styles.sidebarText, styles.sidebarTextActive]}>
                Home
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.sidebarItem}
              onPress={() => router.push("/AdminToolsPage")}
            >
              <Ionicons
                name="settings-outline"
                size={24}
                color="rgba(255,255,255,0.7)"
              />
              <Text style={styles.sidebarText}>Tools</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.sidebarItem}
              onPress={() => router.push("/AdminDealsPage")}
            >
              <Ionicons
                name="pricetag-outline"
                size={24}
                color="rgba(255,255,255,0.7)"
              />
              <Text style={styles.sidebarText}>Deals</Text>
            </TouchableOpacity>
          </View>

       {/* ===== Logout Button ===== */}
<TouchableOpacity
  style={styles.logoutBtn}
  onPress={() => setLogoutModalVisible(true)} // 🔥 Opens modal instead of alert
>
  <Ionicons name="log-out-outline" size={24} color="#EF4444" />
  <Text style={styles.logoutText}>Logout</Text>
</TouchableOpacity>

{/* ===== Logout Confirmation Modal ===== */}
<Modal transparent visible={logoutModalVisible} animationType="fade">
  <View style={styles.modalOverlay}>
    <View style={styles.modalContainer}>
      <Ionicons name="alert-circle-outline" size={42} color="#EF4444" />
      <Text style={[styles.modalTitle, { marginTop: 12 }]}>Confirm Logout</Text>
      <Text style={styles.modalMessage}>
        Are you sure you want to log out of your admin account?
      </Text>

      <View style={styles.modalActions}>
        <TouchableOpacity
          style={[styles.modalButton, styles.cancelBtn]}
          onPress={() => setLogoutModalVisible(false)}
        >
          <Text style={styles.modalCancelText}>Cancel</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.modalButton, { backgroundColor: "#EF4444" }]}
          onPress={async () => {
            try {
              await AsyncStorage.removeItem("adminToken");
              setLogoutModalVisible(false);
              setTimeout(() => {
                router.replace("/AdminLoginPage");
              }, 100);
            } catch (err) {
              console.error("Logout failed:", err);
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


        </LinearGradient>

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
                <Text style={styles.sectionTitle}>Manage Users</Text>
                {users.length === 0 ? (
                  <Text style={styles.emptyText}>No users found.</Text>
                ) : (
                  users.map((user) => (
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
                  ))
                )}
              </View>

              {/* Manage Stores */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Manage Stores</Text>
                {stores.length === 0 ? (
                  <Text style={styles.emptyText}>No stores found.</Text>
                ) : (
                  stores.map((store) => (
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
                  ))
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
  mainContent: { flex: 1 },
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

  /* Modal styles */
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContainer: {
    width: "85%",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1E293B",
    marginBottom: 8,
  },
  modalMessage: {
    fontSize: 15,
    color: "#475569",
    textAlign: "center",
    marginBottom: 20,
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    width: "100%",
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  cancelBtn: { backgroundColor: "#E2E8F0" },
  deleteBtnModal: { backgroundColor: "#EF4444" },
  modalCancelText: { color: "#1E293B", fontWeight: "600" },
  modalDeleteText: { color: "#fff", fontWeight: "600" },
});
