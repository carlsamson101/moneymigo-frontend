import React, { useEffect, useState } from "react";
import { router } from "expo-router";

import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  Modal,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  Dimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, MaterialIcons, Feather } from "@expo/vector-icons";
import { Switch } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Linking } from "react-native";

import { Picker } from "@react-native-picker/picker";  
import api from "../lib/api";
import { checkAdminAuth } from "../lib/adminAuthGuard";


const { width } = Dimensions.get('window');


type Tool = {
  _id: string;
  title: string;
  desc: string;
  link: string;
  category: string;
  color: string;
  visible: boolean;
};


export default function AdminToolsPage() {
  const [tools, setTools] = useState<Tool[]>([]);
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [link, setLink] = useState("");
  const [category, setCategory] = useState("");
  const [color, setColor] = useState("#b0e0e6");
  const [loading, setLoading] = useState(false);
  const [visible, setVisible] = useState(true);
  const [editingToolId, setEditingToolId] = useState<string | null>(null);
const [logoutModalVisible, setLogoutModalVisible] = useState(false);

useEffect(() => {
  checkAdminAuth();
}, []);


  useEffect(() => {
    fetchTools();
  }, []);


  const fetchTools = async () => {
    setLoading(true);
    try {
      const res = await api.get('/tools');
      setTools(res.data);
    } catch (err) {
      Alert.alert("Error", "Failed to fetch tools");
    }
    setLoading(false);
  };


  const addTool = async () => {
    if (!title || !desc || !link || !category) {
      Alert.alert("Error", "Please fill all fields");
      return;
    }
    try {
      await api.post("/tools", {
        title,
        desc,
        link,
        category,
        color: "#b0e0e6",
        visible,
      });
      fetchTools();
      resetForm();
      Alert.alert("Success", "Tool added successfully!");
    } catch (err) {
      Alert.alert("Error", "Failed to add tool");
    }
  };


  const startEdit = (tool: Tool) => {
    setEditingToolId(tool._id);
    setTitle(tool.title);
    setDesc(tool.desc);
    setLink(tool.link);
    setCategory(tool.category);
    setVisible(tool.visible);
  };


  const updateTool = async () => {
    if (!editingToolId) return;
    try {
      const res = await api.put(`/tools/${editingToolId}`, {
        title,
        desc,
        link,
        category,
        color: "#b0e0e6",
        visible,
      });


      setTools((prev) =>
        prev.map((t) => (t._id === editingToolId ? res.data : t))
      );


      resetForm();
      Alert.alert("Success", "Tool updated successfully!");
    } catch (err) {
      Alert.alert("Error", "Failed to update tool");
    }
  };


  const resetForm = () => {
    setEditingToolId(null);
    setTitle("");
    setDesc("");
    setLink("");
    setCategory("");
    setVisible(true);
  };


   const deleteTool = async (id: string) => {
    try {
      await api.delete(`/tools/${id}`);
      setTools((prev) => prev.filter((t) => t._id !== id));
    } catch (err) {
      Alert.alert("Error", "Failed to delete tool");
    }
  };


  const handleOpenLink = async (tool: Tool) => {
    if (!tool.link) {
      Alert.alert("No link available", "This tool does not have a link.");
      return;
    }


    try {
      const supported = await Linking.canOpenURL(tool.link);
      if (supported) {
        await Linking.openURL(tool.link);
      } else {
        Alert.alert("Invalid Link", "Cannot open this URL.");
      }
    } catch (error) {
      Alert.alert("Error", "Failed to open link.");
    }
  };


  const getCategoryColor = (category: string) => {
    const colorMap: { [key: string]: string } = {
      'Information': '#16A9B8',
      'Article': '#0D7C8A',
      'Guide': '#A4C639',
      'Tips': '#F7B32B',
    };
    return colorMap[category] || '#16A9B8';
  };


  const getCategoryIcon = (category: string) => {
    const iconMap: { [key: string]: string } = {
      'Information': 'information-circle',
      'Article': 'document-text',
      'Guide': 'book',
      'Tips': 'bulb',
    };
    return iconMap[category] || 'help-circle';
  };


  return (
   <SafeAreaView style={styles.safeArea}>
    <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

    <View style={styles.layout}>
      {/* ===== Sidebar ===== */}
      <LinearGradient
          colors={['#0D7C8A', '#16A9B8']}
          style={styles.sidebar}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
        >
        <View style={styles.sidebarHeader}>
          <View style={styles.sidebarLogoCircle}>
            <Text style={styles.sidebarLogoText}>M</Text>
          </View>
          <Text style={styles.sidebarTitle}>Admin Panel</Text>
        </View>

      <View style={styles.sidebarMenu}>
       <TouchableOpacity
                    style={styles.sidebarItem}
                    onPress={() => router.push("/AdminHomePage")}
                  >
                    <Ionicons name="home" size={24} color="#A4C639" />
                    <Text style={styles.sidebarText}>Home</Text>
                  </TouchableOpacity>

  <TouchableOpacity
    style={[styles.sidebarItem, styles.sidebarItemActive]}
    onPress={() => router.push("/AdminToolsPage")}
  >
    <Ionicons name="settings-outline" size={24} color="#A4C639" />
    <Text style={[styles.sidebarText, styles.sidebarTextActive]}>Tools</Text>
  </TouchableOpacity>

  <TouchableOpacity
    style={styles.sidebarItem}
    onPress={() => router.push("/AdminDealsPage")}
  >
    <Ionicons name="pricetag-outline" size={24} color="rgba(255,255,255,0.7)" />
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
      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header */}
        <LinearGradient
          colors={['#0D7C8A', '#16A9B8']}
          style={styles.header}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          <View style={styles.headerContent}>
           
            <View style={styles.headerText}>
              <Text style={styles.pageTitle}>Tools Dashboard</Text>
              <Text style={styles.pageSubtitle}>
                Manage financial tools and resources
              </Text>
            </View>
          </View>
        </LinearGradient>


        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <LinearGradient
            colors={['#16A9B8', '#4DD0E1']}
            style={styles.statCard}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.statIcon}>
              <Ionicons name="library" size={24} color="#16A9B8" />
            </View>
            <Text style={styles.statNumber}>{tools.length}</Text>
            <Text style={styles.statLabel}>Total Tools</Text>
          </LinearGradient>
         
          <LinearGradient
            colors={['#A4C639', '#C5E86C']}
            style={styles.statCard}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.statIcon}>
              <Ionicons name="eye" size={24} color="#A4C639" />
            </View>
            <Text style={styles.statNumber}>{tools.filter(t => t.visible).length}</Text>
            <Text style={styles.statLabel}>Visible</Text>
          </LinearGradient>
         
          <LinearGradient
            colors={['#F7B32B', '#FFC85C']}
            style={styles.statCard}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.statIcon}>
              <Ionicons name="eye-off" size={24} color="#F7B32B" />
            </View>
            <Text style={styles.statNumber}>{tools.filter(t => !t.visible).length}</Text>
            <Text style={styles.statLabel}>Hidden</Text>
          </LinearGradient>
        </View>


        {/* Add/Edit Tool Form */}
        <View style={styles.formCard}>
          <View style={styles.formHeader}>
            <Ionicons
              name={editingToolId ? "create" : "add-circle"}
              size={24}
              color="#16A9B8"
            />
            <Text style={styles.formTitle}>
              {editingToolId ? "Edit Tool" : "Add New Tool"}
            </Text>
          </View>


          <View style={styles.formContent}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Title</Text>
              <TextInput
                style={styles.inputField}
                placeholder="Enter tool title"
                value={title}
                onChangeText={setTitle}
                placeholderTextColor="#718096"
              />
            </View>


            <View style={styles.inputGroup}>
              <Text style={styles.label}>Description</Text>
              <TextInput
                style={[styles.inputField, styles.textArea]}
                placeholder="Enter tool description"
                value={desc}
                onChangeText={setDesc}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                placeholderTextColor="#718096"
              />
            </View>


            <View style={styles.inputGroup}>
              <Text style={styles.label}>Link</Text>
              <TextInput
                style={styles.inputField}
                placeholder="https://example.com"
                value={link}
                onChangeText={setLink}
                autoCapitalize="none"
                placeholderTextColor="#718096"
              />
            </View>


            <View style={styles.inputGroup}>
              <Text style={styles.label}>Category</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={category}
                  onValueChange={(itemValue) => setCategory(itemValue)}
                  style={styles.picker}
                >
                  <Picker.Item label="Select a category" value="" />
                  <Picker.Item label="Information" value="Information" />
                  <Picker.Item label="Article" value="Article" />
                  <Picker.Item label="Guide" value="Guide" />
                  <Picker.Item label="Tips" value="Tips" />
                </Picker>
              </View>
            </View>


            <View style={styles.switchContainer}>
              <Text style={styles.label}>Visibility</Text>
              <View style={styles.switchWrapper}>
                <Text style={[styles.switchLabel, !visible && styles.switchLabelInactive]}>
                  {visible ? "Visible to users" : "Hidden from users"}
                </Text>
                <Switch
                  value={visible}
                  onValueChange={setVisible}
                  trackColor={{ false: "#f1f5f9", true: "#B3E5E6" }}
                  thumbColor={visible ? "#16A9B8" : "#94a3b8"}
                />
              </View>
            </View>


            <View style={styles.formActions}>
              {editingToolId ? (
                <View style={styles.editActions}>
                  <LinearGradient
                    colors={['#16A9B8', '#0D7C8A']}
                    style={styles.updateButton}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    <TouchableOpacity
                      onPress={updateTool}
                      style={styles.buttonTouchable}
                    >
                      <Ionicons name="checkmark" size={20} color="#ffffff" />
                      <Text style={styles.updateButtonText}>Update Tool</Text>
                    </TouchableOpacity>
                  </LinearGradient>
                 
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={resetForm}
                  >
                    <Ionicons name="close" size={20} color="#64748b" />
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <LinearGradient
                  colors={['#16A9B8', '#0D7C8A']}
                  style={styles.addButton}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <TouchableOpacity onPress={addTool} style={styles.buttonTouchable}>
                    <Ionicons name="add" size={20} color="#ffffff" />
                    <Text style={styles.addButtonText}>Add Tool</Text>
                  </TouchableOpacity>
                </LinearGradient>
              )}
            </View>
          </View>
        </View>


        {/* Tools List */}
        <View style={styles.toolsSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              Manage Tools ({tools.length})
            </Text>
          </View>


          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#16A9B8" />
              <Text style={styles.loadingText}>Loading tools...</Text>
            </View>
          ) : tools.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="library-outline" size={48} color="#cbd5e1" />
              <Text style={styles.emptyStateTitle}>No tools found</Text>
              <Text style={styles.emptyStateDesc}>Add your first tool using the form above</Text>
            </View>
          ) : (
            <View style={styles.toolsGrid}>
              {tools.map((tool) => (
                <View key={tool._id} style={styles.toolCard}>
                  <View style={styles.toolHeader}>
                    <View style={[styles.categoryBadge, { backgroundColor: getCategoryColor(tool.category) + '20' }]}>
                      <Ionicons
                        name={getCategoryIcon(tool.category) as any}
                        size={14}
                        color={getCategoryColor(tool.category)}
                      />
                      <Text style={[styles.categoryText, { color: getCategoryColor(tool.category) }]}>
                        {tool.category}
                      </Text>
                    </View>
                   
                    <View style={styles.visibilityIndicator}>
                      <Ionicons
                        name={tool.visible ? "eye" : "eye-off"}
                        size={16}
                        color={tool.visible ? "#A4C639" : "#94a3b8"}
                      />
                    </View>
                  </View>


                  <Text style={styles.toolTitle} numberOfLines={2}>
                    {tool.title}
                  </Text>
                 
                  <Text style={styles.toolDesc} numberOfLines={3}>
                    {tool.desc}
                  </Text>


                  <View style={styles.visibilityToggle}>
                    <Text style={styles.visibilityLabel}>
                      {tool.visible ? "Visible" : "Hidden"}
                    </Text>
                    <Switch
                      value={tool.visible}
                      onValueChange={async (val) => {
                        try {
                          const res = await api.put(`/tools/${tool._id}`, {
                            ...tool,
                            visible: val,
                          });
                          setTools((prev) =>
                            prev.map((t) => (t._id === tool._id ? res.data : t))
                          );
                        } catch (err) {
                          Alert.alert("Error", "Failed to update visibility");
                        }
                      }}
                      trackColor={{ false: "#f1f5f9", true: "#B3E5E6" }}
                      thumbColor={tool.visible ? "#16A9B8" : "#94a3b8"}
                    />
                  </View>


                  <View style={styles.toolActions}>
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => handleOpenLink(tool)}
                    >
                      <Feather name="external-link" size={14} color="#16A9B8" />
                      <Text style={styles.actionButtonText}>Open</Text>
                    </TouchableOpacity>


                    <TouchableOpacity
                      style={[styles.actionButton, styles.editActionButton]}
                      onPress={() => startEdit(tool)}
                    >
                      <Feather name="edit-2" size={14} color="#F7B32B" />
                      <Text style={[styles.actionButtonText, styles.editActionText]}>Edit</Text>
                    </TouchableOpacity>


                    <TouchableOpacity
                      style={[styles.actionButton, styles.deleteActionButton]}
                      onPress={() => deleteTool(tool._id)}
                    >
                      <Feather name="trash-2" size={14} color="#ef4444" />
                      <Text style={[styles.actionButtonText, styles.deleteActionText]}>Delete</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
       </View>
    </SafeAreaView>
  );
}


const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#ffffff',
  },

  // ===== DASHBOARD STYLES =====
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
  },

  sidebarHeader: {
    alignItems: "center",
    marginBottom: 32,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },

  sidebarLogoCircle: {
  width: 64,
  height: 64,
  borderRadius: 32,
  backgroundColor: "rgba(255, 255, 255, 0.95)",
  justifyContent: "center",
  alignItems: "center",
  marginBottom: 12,
},
sidebarLogoText: {
  fontSize: 28,
  fontWeight: "900",
  color: "#16A9B8",
},
sidebarTitle: {
  fontSize: 20,
  fontWeight: "700",
  color: "white",
  letterSpacing: 0.3,
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
  backgroundColor: "rgba(164, 198, 57, 0.15)", // active highlight
},
sidebarMenu: {
  flex: 1,
  marginTop: 0,      // ensures items start right below the header
},
sidebarText: {
  marginLeft: 12,
  fontSize: 15,
  fontWeight: "500",
  color: "rgba(255, 255, 255, 0.7)",
},
sidebarTextActive: {
  color: "#A4C639",
  fontWeight: "600",
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



  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },

  scrollContent: {
    paddingBottom: 30,
  },

  header: {
    paddingHorizontal: 24,
    paddingVertical: 24,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.2)',
  },

  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  headerIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },

  headerText: {
    flex: 1,
  },

  pageTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 4,
  },

  pageSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '500',
  },

  // Stats
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingVertical: 20,
    gap: 16,
  },

  statCard: {
    flex: 1,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
  },

  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },

  statNumber: {
    fontSize: 24,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 4,
  },

  statLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.95)',
    fontWeight: '600',
  },

  // Form Styles
  formCard: {
    backgroundColor: '#ffffff',
    marginHorizontal: 24,
    marginBottom: 24,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },

  formHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    gap: 12,
  },

  formTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a202c',
  },

  formContent: {
    padding: 24,
  },

  inputGroup: {
    marginBottom: 20,
  },

  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },

  inputField: {
    backgroundColor: '#F7FAFC',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#2D3748',
    borderWidth: 2,
    borderColor: '#E2E8F0',
  },

  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },

  pickerContainer: {
    backgroundColor: '#F7FAFC',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
  },

  picker: {
    height: 56,
  },

  switchContainer: {
    marginBottom: 24,
  },

  switchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F7FAFC',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E2E8F0',
  },

  switchLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#16A9B8',
  },

  switchLabelInactive: {
    color: '#94a3b8',
  },

  formActions: {
    marginTop: 8,
  },

  editActions: {
    flexDirection: 'row',
    gap: 12,
  },

  addButton: {
    borderRadius: 12,
    shadowColor: '#16A9B8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },

  buttonTouchable: {
    paddingVertical: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },

  addButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },

  updateButton: {
    flex: 1,
    borderRadius: 12,
    shadowColor: '#16A9B8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },

  updateButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },

  cancelButton: {
    flex: 1,
    backgroundColor: '#f8fafc',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    gap: 8,
  },

  cancelButtonText: {
    color: '#64748b',
    fontSize: 16,
    fontWeight: '600',
  },

  // Tools Section
  toolsSection: {
    paddingHorizontal: 24,
  },

  sectionHeader: {
    marginBottom: 20,
  },

  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a202c',
  },

  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },

  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#64748b',
    fontWeight: '500',
  },

  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },

  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a202c',
    marginTop: 16,
    marginBottom: 8,
  },

  emptyStateDesc: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
  },

  toolsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 16,
  },

  toolCard: {
    width: '48%',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },

  toolHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },

  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 6,
  },

  categoryText: {
    fontSize: 12,
    fontWeight: '600',
  },

  visibilityIndicator: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f8fafc',
    justifyContent: 'center',
    alignItems: 'center',
  },

  toolTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a202c',
    marginBottom: 8,
    lineHeight: 22,
  },

  toolDesc: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 16,
    lineHeight: 20,
  },

  visibilityToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8fafc',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    marginBottom: 16,
  },

  visibilityLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },

  toolActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },

  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: '#E8F7F8',
    gap: 4,
  },

  actionButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#16A9B8',
  },

  editActionButton: {
    backgroundColor: '#FEF3E2',
  },

  editActionText: {
    color: '#F7B32B',
  },

  deleteActionButton: {
    backgroundColor: '#fef2f2',
  },

  deleteActionText: {
    color: '#ef4444',
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