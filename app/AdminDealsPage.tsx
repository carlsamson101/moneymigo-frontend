// @ts-nocheck
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Modal,
  SafeAreaView,
  ScrollView,
  Pressable,
  Alert,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from "@react-native-async-storage/async-storage";

import api from "../lib/api";
import { router } from "expo-router";
import { checkAdminAuth } from "../lib/adminAuthGuard";



type Item = {
  _id: string;
  storeName: string;
  itemName: string;
  price: number;
  unit?: string;
  stock?: number; // ✅ new field
  category?: string; // ✅ Added category

};


type StoreData = {
  storeName: string;
  itemCount: number;
  items: Item[];
  location?: string;
};

export default function AdminDealsPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [editUnit, setEditUnit] = useState("");
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [query, setQuery] = useState("");
  const [newStoreName, setNewStoreName] = useState("");
  const [newItemName, setNewItemName] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [newUnit, setNewUnit] = useState("piece");
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [logoutConfirmVisible, setLogoutConfirmVisible] = useState(false);
  const [selectedStore, setSelectedStore] = useState<StoreData | null>(null);
  const [storeDetailsVisible, setStoreDetailsVisible] = useState(false);
const [newStock, setNewStock] = useState("");
const [editCategory, setEditCategory] = useState("");
const [selectedCategory, setSelectedCategory] = useState("all");
const [itemSearchQuery, setItemSearchQuery] = useState("");
const [logoutModalVisible, setLogoutModalVisible] = useState(false);

useEffect(() => {
  checkAdminAuth();
}, []);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const res = await api.get("/storeItems");
      setItems(res.data);
    } catch (err) {
      console.error("❌ Fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

const startEdit = (item: Item) => {
  setEditingId(item._id);
  setEditName(item.itemName);
  setEditPrice(item.price.toString());
  setEditUnit(item.unit || "");
  setEditModalVisible(true);
};


  const saveEdit = async (id: string) => {
    try {
      await api.put(`/storeItems/${id}`, {
        price: parseFloat(editPrice),
        unit: editUnit,
      });
      setEditingId(null);
      fetchItems();
    } catch (err) {
      console.error("❌ Update item error:", err);
    }
  };

  const deleteItem = async (id: string) => {
    try {
      await api.delete(`/storeItems/${id}`);
      fetchItems();
    } catch (err) {
      console.error("❌ Delete error:", err);
    }
  };

  const q = query.toLowerCase();
  const filtered = items.filter((d) =>
    d.itemName.toLowerCase().includes(q) || d.storeName.toLowerCase().includes(q)
  );

  // Group items by store
  const storeGroups: StoreData[] = Object.values(
    filtered.reduce((acc: any, item) => {
      if (!acc[item.storeName]) {
        acc[item.storeName] = {
          storeName: item.storeName,
          itemCount: 0,
          items: [],
          location: "Downtown", // You can add actual location data from API
        };
      }
      acc[item.storeName].items.push(item);
      acc[item.storeName].itemCount = acc[item.storeName].items.length;
      return acc;
    }, {})
  );

  const totalStores = storeGroups.length;
  const totalItems = items.length;

 const addItem = async () => {
  if (!newStoreName || !newItemName || !newPrice) {
    return;
  }

  try {
    await api.post("/storeItems", {
      storeName: newStoreName,
      itemName: newItemName,
      price: parseFloat(newPrice),
      unit: newUnit,
      currency: "PHP",
      stock: parseInt(newStock) || 0, // ✅ include stock
    });

    setAddModalVisible(false);
    setNewStoreName("");
    setNewItemName("");
    setNewPrice("");
    setNewUnit("piece");
    setNewStock(""); // ✅ reset stock
    fetchItems();
  } catch (err: any) {
    console.error("❌ Add item error:", err.response?.data || err.message);
  }
};


  const openStoreDetails = (store: StoreData) => {
    setSelectedStore(store);
    setStoreDetailsVisible(true);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.layout}>
        {/* ===== Sidebar ===== */}
        <LinearGradient
          colors={['#0D7C8A', '#16A9B8']}
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
              style={styles.sidebarItem}
              onPress={() => router.push("/AdminHomePage")}
            >
              <Ionicons name="home" size={24} color="rgba(255, 255, 255, 0.7)" />
              <Text style={styles.sidebarText}>Home</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.sidebarItem}
              onPress={() => router.push("/AdminToolsPage")}
            >
              <Ionicons name="settings-outline" size={24} color="rgba(255, 255, 255, 0.7)" />
              <Text style={styles.sidebarText}>Tools</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.sidebarItem, styles.sidebarItemActive]}
            >
              <Ionicons name="pricetag" size={24} color="#A4C639" />
              <Text style={[styles.sidebarText, styles.sidebarTextActive]}>Deals</Text>
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
          {/* Page Header */}
          <LinearGradient
            colors={['#0D7C8A', '#16A9B8']}
            style={styles.pageHeader}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <View>
              <Text style={styles.pageTitle}>Deals Dashboard</Text>
              <Text style={styles.pageSubtitle}>Manage store items and pricing</Text>
            </View>
            <LinearGradient
              colors={['#A4C639', '#8AB028']}
              style={styles.addButtonHeader}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <TouchableOpacity
                style={styles.addButtonTouchable}
                onPress={() => setAddModalVisible(true)}
              >
                <Ionicons name="add" size={20} color="white" />
                <Text style={styles.addButtonText}>Add Item</Text>
              </TouchableOpacity>
            </LinearGradient>
          </LinearGradient>

          {/* Dashboard Stats */}
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <View style={[styles.statIconWrapper, { backgroundColor: '#E0F2F4' }]}>
                <Ionicons name="storefront" size={28} color="#16A9B8" />
              </View>
              <Text style={styles.statNumber}>{totalStores}</Text>
              <Text style={styles.statLabel}>Total Stores</Text>
            </View>
            <View style={styles.statCard}>
              <View style={[styles.statIconWrapper, { backgroundColor: '#F4F8E8' }]}>
                <Ionicons name="cube" size={28} color="#A4C639" />
              </View>
              <Text style={styles.statNumber}>{totalItems}</Text>
              <Text style={styles.statLabel}>Total Items</Text>
            </View>
          </View>

          {/* Search Bar */}
          <View style={styles.searchContainer}>
            <View style={styles.searchBox}>
              <Ionicons name="search" size={20} color="#64748B" style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search items or stores..."
                value={query}
                onChangeText={setQuery}
                placeholderTextColor="#94A3B8"
              />
              {query.length > 0 && (
                <TouchableOpacity onPress={() => setQuery("")} style={styles.clearIconBtn}>
                  <Ionicons name="close-circle" size={20} color="#94A3B8" />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Store Cards */}
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#16A9B8" />
              <Text style={styles.loadingText}>Loading stores...</Text>
            </View>
          ) : (
            <View style={styles.storesGrid}>
              {storeGroups.map((store, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.storeCard}
                  onPress={() => openStoreDetails(store)}
                  activeOpacity={0.7}
                >
                  <LinearGradient
                    colors={['#FFFFFF', '#F8FAFC']}
                    style={styles.storeCardGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 0, y: 1 }}
                  >
                    {/* Store Header */}
                    <View style={styles.storeCardHeader}>
                      <View style={styles.storeIconLarge}>
                        <Ionicons name="storefront" size={32} color="#16A9B8" />
                      </View>
                      <View style={styles.storeInfo}>
                        <Text style={styles.storeName}>{store.storeName}</Text>
                        <View style={styles.locationRow}>
                          <Ionicons name="location" size={14} color="#64748B" />
                          <Text style={styles.storeLocation}>{store.location}</Text>
                        </View>
                      </View>
                    </View>

                    {/* Store Stats */}
                    <View style={styles.storeStats}>
                      <View style={styles.statItem}>
                        <Ionicons name="cube-outline" size={18} color="#16A9B8" />
                        <Text style={styles.statText}>{store.itemCount} Items</Text>
                      </View>
                      <View style={styles.statDivider} />
                      <View style={styles.statItem}>
                        <Ionicons name="pricetag-outline" size={18} color="#A4C639" />
                        <Text style={styles.statText}>Active</Text>
                      </View>
                    </View>
                    
                    {/* Item Preview */}
                    <View style={styles.itemsPreview}>
                      <Text style={styles.previewTitle}>Item Preview:</Text>
                      {store.items.slice(0, 3).map((item, idx) => (
                        <View key={idx} style={styles.previewItem}>
                          <Text style={styles.previewItemName}>{item.itemName}</Text>
                          <Text style={styles.previewItemPrice}>₱{item.price.toFixed(2)}</Text>
                        </View>
                      ))}
                      {store.itemCount > 3 && (
                        <Text style={styles.moreItems}>+{store.itemCount - 3} more items</Text>
                      )}
                    </View>


                    {/* View All Button */}
                    <View style={styles.viewAllButton}>
                      <Text style={styles.viewAllText}>View All Items</Text>
                      <Ionicons name="arrow-forward" size={16} color="#16A9B8" />
                    </View>
                  </LinearGradient>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </ScrollView>
      </View>

      {/* Store Details Modal */}
      <Modal
  visible={storeDetailsVisible}
  animationType="slide"
  presentationStyle="fullScreen"
  onRequestClose={() => setStoreDetailsVisible(false)}
>
  <SafeAreaView style={styles.storeDetailsScreen}>
{/* Top Header */}
<LinearGradient
  colors={['#0D7C8A', '#16A9B8']}
  style={styles.modalHeaderBar}
  start={{ x: 0, y: 0 }}
  end={{ x: 1, y: 0 }}
>
  <View style={styles.modalHeaderContent}>
    <View style={styles.modalStoreIcon}>
      <Ionicons name="storefront" size={28} color="#FFFFFF" />
    </View>
    <View>
      <Text style={styles.modalStoreName}>{selectedStore?.storeName}</Text>
      <Text style={styles.modalItemCount}>{selectedStore?.itemCount} items</Text>
    </View>
  </View>
  <TouchableOpacity
    style={styles.closeButton}
    onPress={() => setStoreDetailsVisible(false)}
  >
    <Ionicons name="close" size={24} color="#FFFFFF" />
  </TouchableOpacity>
</LinearGradient>

  {/* Item List */}
<ScrollView style={styles.modalContent}>
  <View style={styles.itemsGrid}>
    {selectedStore?.items.map((item) => (
      <View key={item._id} style={styles.itemCard}>
        {/* Card Header with Icon Badge */}
        <View style={styles.itemCardHeader}>
          <View style={styles.iconBadge}>
            <Ionicons name="cube-outline" size={20} color="#16A9B8" />
          </View>
          <Text style={styles.itemCardTitle} numberOfLines={2}>
            {item.itemName}
          </Text>
        </View>

        {/* Price Section */}
        {/* Price + Stock Section */}
<View style={styles.priceSection}>
  <Text style={styles.itemCardPrice}>₱{item.price.toFixed(2)}</Text>
  <View style={styles.unitBadge}>
    <Text style={styles.itemCardUnit}>/{item.unit || "pc"}</Text>
  </View>
</View>

{/* 🧮 Editable Stock */}
<View style={styles.stockRow}>
  <Ionicons name="cube-outline" size={16} color="#059669" />
  <TextInput
    style={styles.stockInput}
    value={item.stock?.toString() || "0"}
    keyboardType="numeric"
    onChangeText={async (text) => {
      const newStock = parseInt(text) || 0;

      // 🔁 Update locally
      setSelectedStore((prev) =>
        prev
          ? {
              ...prev,
              items: prev.items.map((i) =>
                i._id === item._id ? { ...i, stock: newStock } : i
              ),
            }
          : prev
      );

      // 💾 Save to backend
      try {
        await api.put(`/storeItems/${item._id}`, { stock: newStock });
      } catch (err) {
        console.error("❌ Stock update error:", error.response?.data || err.message);
      }
    }}
    placeholder="0"
    placeholderTextColor="#94A3B8"
  />
  <Text style={styles.stockLabel}>in stock</Text>
</View>

{item.stock <= 5 && (
  <Text style={styles.lowStockWarning}>⚠️ Low stock</Text>
)}


        {/* Actions */}
        <View style={styles.itemCardActions}>
          <TouchableOpacity
            style={styles.itemEditBtn}
            onPress={() => startEdit(item)}
            activeOpacity={0.7}
          >
            <Ionicons name="create-outline" size={18} color="#F59E0B" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.itemDeleteBtn}
            onPress={() => deleteItem(item._id)}
            activeOpacity={0.7}
          >
            <Ionicons name="trash-outline" size={18} color="#EF4444" />
          </TouchableOpacity>
        </View>
      </View>
    ))}
  </View>
</ScrollView>

  </SafeAreaView>
</Modal>


      {/* Add Item Modal */}
      <Modal
        visible={addModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setAddModalVisible(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setAddModalVisible(false)}>
          <Pressable style={styles.addModal} onPress={() => {}}>
            <View style={styles.modalHeader}>
              <View style={styles.modalIconWrapper}>
                <Ionicons name="add-circle" size={32} color="#16A9B8" />
              </View>
              <Text style={styles.modalTitle}>Add New Item</Text>
              <Text style={styles.modalSubtitle}>Enter item details below</Text>
            </View>

            <View style={styles.modalBody}>
             <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Stocks Left</Text>
            <View style={styles.inputWithIcon}>
              <Ionicons name="cube-outline" size={18} color="#64748B" />
              <TextInput
                style={styles.modalInput}
                placeholder="e.g. 10"
                keyboardType="numeric"
                value={newStock}
                onChangeText={setNewStock}
                placeholderTextColor="#94A3B8"
              />
            </View>
          </View>


              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Item Name</Text>
                <View style={styles.inputWithIcon}>
                  <Ionicons name="cube-outline" size={18} color="#64748B" />
                  <TextInput
                    style={styles.modalInput}
                    placeholder="e.g. Eggs"
                    value={newItemName}
                    onChangeText={setNewItemName}
                    placeholderTextColor="#94A3B8"
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Price</Text>
                <View style={styles.inputWithIcon}>
                  <MaterialCommunityIcons name="currency-php" size={18} color="#64748B" />
                  <TextInput
                    style={styles.modalInput}
                    placeholder="0.00"
                    keyboardType="numeric"
                    value={newPrice}
                    onChangeText={setNewPrice}
                    placeholderTextColor="#94A3B8"
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Unit</Text>
                <View style={styles.inputWithIcon}>
                  <Ionicons name="list-outline" size={18} color="#64748B" />
                  <TextInput
                    style={styles.modalInput}
                    placeholder="e.g. kilo, pack, piece"
                    value={newUnit}
                    onChangeText={setNewUnit}
                    placeholderTextColor="#94A3B8"
                  />
                </View>
              </View>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setAddModalVisible(false)}
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
                  style={styles.modalSaveTouchable}
                  onPress={addItem}
                >
                  <Ionicons name="checkmark" size={20} color="white" />
                  <Text style={styles.modalSaveText}>Add Item</Text>
                </TouchableOpacity>
              </LinearGradient>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Edit Item Modal */}
<Modal
  visible={editModalVisible}
  transparent
  animationType="fade"
  onRequestClose={() => setEditModalVisible(false)}
>
  <Pressable style={styles.modalOverlay} onPress={() => setEditModalVisible(false)}>
    <Pressable style={styles.addModal} onPress={() => {}}>
      <View style={styles.modalHeader}>
        <View style={styles.modalIconWrapper}>
          <Ionicons name="create-outline" size={32} color="#16A9B8" />
        </View>
        <Text style={styles.modalTitle}>Edit Item</Text>
        <Text style={styles.modalSubtitle}>Update the details below</Text>
      </View>

      <View style={styles.modalBody}>
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Item Name</Text>
          <View style={styles.inputWithIcon}>
            <Ionicons name="cube-outline" size={18} color="#64748B" />
            <TextInput
              style={styles.modalInput}
              value={editName}
              editable={false}
              placeholderTextColor="#94A3B8"
            />
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Price</Text>
          <View style={styles.inputWithIcon}>
            <MaterialCommunityIcons name="currency-php" size={18} color="#64748B" />
            <TextInput
              style={styles.modalInput}
              placeholder="0.00"
              keyboardType="numeric"
              value={editPrice}
              onChangeText={setEditPrice}
              placeholderTextColor="#94A3B8"
            />
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Unit</Text>
          <View style={styles.inputWithIcon}>
            <Ionicons name="list-outline" size={18} color="#64748B" />
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. kilo, pack, piece"
              value={editUnit}
              onChangeText={setEditUnit}
              placeholderTextColor="#94A3B8"
            />
          </View>
        </View>
      </View>

      <View style={styles.modalActions}>
        <TouchableOpacity
          style={styles.modalCancelBtn}
          onPress={() => setEditModalVisible(false)}
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
            style={styles.modalSaveTouchable}
            onPress={async () => {
              if (editingId) {
                await saveEdit(editingId);
                setEditModalVisible(false);
              }
            }}
          >
            <Ionicons name="checkmark" size={20} color="white" />
            <Text style={styles.modalSaveText}>Save</Text>
          </TouchableOpacity>
        </LinearGradient>
      </View>
    </Pressable>
  </Pressable>
</Modal>


      {/* Logout Confirm Modal */}
      <Modal
        visible={logoutConfirmVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setLogoutConfirmVisible(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setLogoutConfirmVisible(false)}>
          <View style={styles.dialogBox}>
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
                onPress={() => setLogoutConfirmVisible(false)}
              >
                <Text style={styles.dialogCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.dialogConfirmBtn}
                onPress={() => {
                  setLogoutConfirmVisible(false);
                  router.replace("/AdminToolsPage");
                }}
              >
                <Text style={styles.dialogConfirmText}>Logout</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F1F5F9",
  },
  layout: {
    flex: 1,
    flexDirection: "row",
  },
  sidebar: {
    width: 260,
    borderRightWidth: 1,
    borderRightColor: "rgba(255, 255, 255, 0.1)",
    paddingTop: 24,
    paddingHorizontal: 16,
    justifyContent: "space-between",
    shadowColor: "#000",
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  sidebarHeader: {
    alignItems: "center",
    marginBottom: 32,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.2)',
  },
  logoCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  sidebarTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "white",
    letterSpacing: 0.3,
  },
  sidebarMenu: {
    flex: 1,
  },
  sidebarItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  sidebarItemActive: {
    backgroundColor: "rgba(164, 198, 57, 0.2)",
    borderLeftWidth: 4,
    borderLeftColor: "#A4C639",
  },
  sidebarText: {
    marginLeft: 12,
    fontSize: 15,
    fontWeight: "500",
    color: "rgba(255, 255, 255, 0.7)",
  },
  sidebarTextActive: {
    color: "#A4C639",
    fontWeight: "700",
  },
  sidebarLogoText: {
    fontSize: 28,
    fontWeight: "900",
    color: "#16A9B8",
  },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    marginBottom: 16,
  },
  logoutText: {
    marginLeft: 12,
    fontSize: 15,
    fontWeight: "600",
    color: "#EF4444",
  },
  mainContent: {
    flex: 1,
    backgroundColor: "#F1F5F9",
  },
  pageHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 28,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 5,
  },
  pageTitle: {
    fontSize: 30,
    fontWeight: "800",
    color: "white",
    marginBottom: 6,
    letterSpacing: -0.5,
  },
  pageSubtitle: {
    fontSize: 15,
    color: "rgba(255, 255, 255, 0.95)",
    fontWeight: "500",
  },
  addButtonHeader: {
    borderRadius: 14,
    shadowColor: "#A4C639",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 5,
  },
  addButtonTouchable: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 13,
    paddingHorizontal: 22,
  },
  addButtonText: {
    color: "white",
    fontSize: 15,
    fontWeight: "700",
    marginLeft: 8,
  },
  statsRow: {
    flexDirection: "row",
    padding: 24,
    gap: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    padding: 24,
    borderRadius: 18,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  statIconWrapper: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 14,
  },
  statNumber: {
    fontSize: 36,
    fontWeight: "800",
    color: "#1E293B",
    marginBottom: 6,
    letterSpacing: -1,
  },
  statLabel: {
    fontSize: 14,
    color: "#64748B",
    fontWeight: "600",
  },
  searchContainer: {
    paddingHorizontal: 24,
    paddingBottom: 20,
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderWidth: 2,
    borderColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: "#1E293B",
    fontWeight: "500",
  },
  clearIconBtn: {
    padding: 4,
  },
  loadingContainer: {
    alignItems: "center",
    paddingVertical: 60,
    gap: 16,
  },
  loadingText: {
    fontSize: 15,
    color: "#64748B",
    fontWeight: "500",
  },
  storesGrid: {
    padding: 24,
    gap: 20,
  },
  storeCard: {
    borderRadius: 20,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  storeCardGradient: {
    padding: 24,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  storeCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  storeIconLarge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#E0F2F4",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  storeInfo: {
    flex: 1,
  },
  storeName: {
    fontSize: 22,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 6,
    letterSpacing: -0.5,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  storeLocation: {
    fontSize: 14,
    color: "#64748B",
    fontWeight: "500",
  },
  storeStats: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    marginBottom: 20,
  },
  statItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: "#E2E8F0",
    marginHorizontal: 12,
  },
  statText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#475569",
  },
  itemsPreview: {
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  previewTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#64748B",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  previewItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    gap: 8,
  },
  previewItemName: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
    color: "#1E293B",
  },
  previewItemPrice: {
    fontSize: 14,
    fontWeight: "700",
    color: "#16A9B8",
  },
  moreItems: {
    fontSize: 13,
    fontWeight: "600",
    color: "#16A9B8",
    marginTop: 8,
    fontStyle: "italic",
  },
  viewAllButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    backgroundColor: "#E0F2F4",
    borderRadius: 12,
    gap: 8,
  },
  viewAllText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#16A9B8",
  },
  storeDetailsModal: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    marginTop: 60,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: -4 },
    elevation: 10,
  },
  modalHeaderBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 24,
    borderBottomWidth: 2,
    borderBottomColor: "#F1F5F9",
  },
  modalHeaderContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },


  modalStoreName: {
  fontSize: 22,
  fontWeight: "800",
  color: "#FFFFFF", // Changed to white
  marginBottom: 4,
  letterSpacing: -0.5,
},
modalItemCount: {
  fontSize: 14,
  color: "rgba(255, 255, 255, 0.9)", // Changed to white with slight transparency
  fontWeight: "600",
},
modalStoreIcon: {
  width: 56,
  height: 56,
  borderRadius: 28,
  backgroundColor: "rgba(255, 255, 255, 0.2)", // Semi-transparent white background
  justifyContent: "center",
  alignItems: "center",
  marginRight: 14,
  borderWidth: 1,
  borderColor: "rgba(255, 255, 255, 0.3)",
},
closeButton: {
  width: 40,
  height: 40,
  borderRadius: 20,
  backgroundColor: "rgba(255, 255, 255, 0.2)", // Semi-transparent white background
  justifyContent: "center",
  alignItems: "center",
  borderWidth: 1,
  borderColor: "rgba(255, 255, 255, 0.3)",
},
  modalContent: {
    flex: 1,
    padding: 24,
  },
  modalItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F8FAFC",
    padding: 16,
    borderRadius: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  modalItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  modalItemIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#E0F2F4",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  modalItemInfo: {
    flex: 1,
  },
  modalItemName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1E293B",
    marginBottom: 4,
  },
  modalItemUnit: {
    fontSize: 13,
    color: "#64748B",
    fontWeight: "500",
  },
  modalItemRight: {
    alignItems: "flex-end",
    gap: 8,
  },
  modalItemPrice: {
    fontSize: 20,
    fontWeight: "800",
    color: "#16A9B8",
    letterSpacing: -0.5,
  },
  modalItemActions: {
    flexDirection: "row",
    gap: 8,
  },
  modalEditBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#FEF3C7",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#FDE68A",
  },
  modalDeleteBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#FEE2E2",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  editContainer: {
    gap: 12,
    flex: 1,
  },
  editTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1E293B",
    marginBottom: 4,
  },
  inputGroup: {
    gap: 6,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#475569",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  inputWithIcon: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  editInput: {
    flex: 1,
    fontSize: 15,
    color: "#1E293B",
    fontWeight: "500",
  },
  input: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: "#1E293B",
    fontWeight: "500",
  },
  saveEditBtn: {
    borderRadius: 10,
    marginTop: 4,
    shadowColor: "#16A9B8",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  saveEditTouchable: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 12,
    gap: 6,
  },
  saveEditText: {
    color: "white",
    fontWeight: "700",
    fontSize: 15,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  addModal: {
    width: "90%",
    maxWidth: 480,
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 28,
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },
  modalHeader: {
    alignItems: "center",
    marginBottom: 28,
    paddingBottom: 24,
    borderBottomWidth: 2,
    borderBottomColor: "#F1F5F9",
  },
  modalIconWrapper: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: "#E0F2F4",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#1E293B",
    marginBottom: 6,
    letterSpacing: -0.5,
  },
  modalSubtitle: {
    fontSize: 14,
    color: "#64748B",
    fontWeight: "500",
  },
  modalBody: {
    gap: 18,
    marginBottom: 28,
  },
  modalInput: {
    flex: 1,
    fontSize: 15,
    color: "#1E293B",
    fontWeight: "500",
  },
  modalActions: {
    flexDirection: "row",
    gap: 12,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 15,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#E2E8F0",
    backgroundColor: "#F8FAFC",
    alignItems: "center",
  },
  modalCancelText: {
    fontSize: 15,
    fontWeight: "700",
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
    paddingVertical: 15,
    gap: 6,
  },
  modalSaveText: {
    fontSize: 15,
    fontWeight: "700",
    color: "white",
  },
  dialogBox: {
    width: "85%",
    maxWidth: 400,
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 28,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  dialogIconWrapper: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: "#FEF2F2",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 18,
  },
  dialogTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#1E293B",
    marginBottom: 10,
    letterSpacing: -0.5,
  },
  dialogMessage: {
    fontSize: 15,
    color: "#64748B",
    textAlign: "center",
    marginBottom: 28,
    lineHeight: 22,
    fontWeight: "500",
  },
  dialogActions: {
    flexDirection: "row",
    width: "100%",
    gap: 12,
  },
  dialogCancelBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    backgroundColor: "#F8FAFC",
    borderWidth: 2,
    borderColor: "#E2E8F0",
    alignItems: "center",
  },
  dialogCancelText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#64748B",
  },
  dialogConfirmBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    backgroundColor: "#EF4444",
    alignItems: "center",
    shadowColor: "#EF4444",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  dialogConfirmText: {
    fontSize: 15,
    fontWeight: "700",
    color: "white",
  },
  storeDetailsScreen: {
  flex: 1,
  backgroundColor: "#FFFFFF",
},



itemsGrid: {
  flexDirection: "row",
  flexWrap: "wrap",
  justifyContent: "flex-start",
  gap: 12,
  paddingHorizontal: 4,
  paddingVertical: 8,
},
itemCard: {
  width: "31.5%", // Optimized for 3-column grid
  backgroundColor: "#FFFFFF",
  borderRadius: 16,
  padding: 14,
  marginBottom: 12,
  borderWidth: 1,
  borderColor: "#E2E8F0",
  shadowColor: "#0F172A",
  shadowOpacity: 0.08,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 4 },
  elevation: 3,
},
itemCardHeader: {
  flexDirection: "row",
  alignItems: "flex-start",
  marginBottom: 12,
  gap: 10,
},
iconBadge: {
  width: 40,
  height: 40,
  borderRadius: 12,
  backgroundColor: "#ECFEFF",
  justifyContent: "center",
  alignItems: "center",
  borderWidth: 1,
  borderColor: "#A5F3FC",
},
itemCardTitle: {
  flex: 1,
  fontSize: 15,
  fontWeight: "600",
  color: "#0F172A",
  lineHeight: 20,
  marginTop: 2,
},
priceSection: {
  flexDirection: "row",
  alignItems: "baseline",
  marginBottom: 14,
  gap: 4,
},
itemCardPrice: {
  fontSize: 22,
  fontWeight: "800",
  color: "#16A9B8",
  letterSpacing: -0.5,
},
unitBadge: {
  backgroundColor: "#F1F5F9",
  paddingHorizontal: 8,
  paddingVertical: 2,
  borderRadius: 6,
},
itemCardUnit: {
  fontSize: 12,
  color: "#64748B",
  fontWeight: "600",
},
itemCardActions: {
  flexDirection: "row",
  justifyContent: "flex-end",
  gap: 8,
  paddingTop: 8,
  borderTopWidth: 1,
  borderTopColor: "#F1F5F9",
},
itemEditBtn: {
  width: 38,
  height: 38,
  borderRadius: 12,
  backgroundColor: "#FFFBEB",
  justifyContent: "center",
  alignItems: "center",
  borderWidth: 1.5,
  borderColor: "#FDE68A",
},
itemDeleteBtn: {
  width: 38,
  height: 38,
  borderRadius: 12,
  backgroundColor: "#FEF2F2",
  justifyContent: "center",
  alignItems: "center",
  borderWidth: 1.5,
  borderColor: "#FECACA",
},
stockRow: {
  flexDirection: "row",
  alignItems: "center",
  marginTop: 4,
  gap: 6,
},

stockInput: {
  backgroundColor: "#F1F5F9",
  borderWidth: 1,
  borderColor: "#E2E8F0",
  borderRadius: 6,
  paddingHorizontal: 8,
  paddingVertical: 2,
  fontSize: 13,
  fontWeight: "600",
  color: "#059669",
  width: 50,
  textAlign: "center",
},

stockLabel: {
  fontSize: 12,
  color: "#475569",
  fontWeight: "500",
},

lowStockWarning: {
  fontSize: 12,
  color: "#EF4444",
  fontWeight: "600",
  marginTop: 4,
},
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
  padding: 24,
  alignItems: "center",
  shadowColor: "#000",
  shadowOpacity: 0.2,
  shadowRadius: 10,
  elevation: 10,
},
modalTitle: {
  fontSize: 20,
  fontWeight: "700",
  color: "#1E293B",
  textAlign: "center",
},
modalMessage: {
  fontSize: 15,
  color: "#475569",
  textAlign: "center",
  marginVertical: 10,
},
modalActions: {
  flexDirection: "row",
  justifyContent: "space-between",
  width: "100%",
  marginTop: 20,
},
modalButton: {
  flex: 1,
  paddingVertical: 10,
  borderRadius: 8,
  alignItems: "center",
  marginHorizontal: 6,
},
cancelBtn: {
  backgroundColor: "#E2E8F0",
},
modalCancelText: {
  color: "#1E293B",
  fontWeight: "600",
},
modalDeleteText: {
  color: "#fff",
  fontWeight: "600",
},

});