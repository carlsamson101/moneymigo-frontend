import React, { useEffect, useState, useCallback } from "react";
import { router } from "expo-router";
import { RefreshControl } from 'react-native';
import * as Haptics from 'expo-haptics';

import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  ScrollView,
  TextInput,
  Alert,
  Image,
  Dimensions,
  StatusBar,
  KeyboardAvoidingView,
   Modal, 
  Animated,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import api from "../../lib/api";
import { getToken, saveToken } from "../../lib/auth";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system";


const { width: SCREEN_WIDTH } = Dimensions.get('window');
const isSmallDevice = SCREEN_WIDTH < 375;


const InfoModal = ({ visible, title, message, onClose }) => {
  if (!visible) return null;
  return (
    <View style={styles.modalOverlay}>
      <BlurView intensity={80} tint="light" style={styles.modalContainer}>
        <View style={styles.modalIconWrapper}>
          <LinearGradient
            colors={['#1f4b81ff', '#7fb1d6ff']}
            style={styles.modalIconGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Ionicons name="information-circle" size={32} color="#fff" />
          </LinearGradient>
        </View>
        
        <Text style={styles.modalTitle}>{title}</Text>
        <Text style={styles.modalMessage}>{message}</Text>

        <TouchableOpacity style={styles.modalButton} onPress={onClose} activeOpacity={0.8}>
          <LinearGradient
            colors={['#1f4b81ff', '#7fb1d6ff']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.modalButtonGradient}
          >
            <Text style={styles.modalButtonText}>Got it</Text>
          </LinearGradient>
        </TouchableOpacity>
      </BlurView>
    </View>
  );
};

const ChoiceModal = ({ visible, title, message, onCamera, onGallery, onCancel }) => {
  if (!visible) return null;
  return (
    <View style={styles.modalOverlay}>
      <BlurView intensity={80} tint="light" style={styles.modalContainer}>
        <View style={styles.modalIconWrapper}>
          <LinearGradient
            colors={['#1f4b81ff', '#7fb1d6ff']}
            style={styles.modalIconGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Ionicons name="camera" size={32} color="#fff" />
          </LinearGradient>
        </View>
        
        <Text style={styles.modalTitle}>{title}</Text>
        <Text style={styles.modalMessage}>{message}</Text>

        <View style={styles.modalOptionsContainer}>
          <TouchableOpacity style={styles.modalOption} onPress={onCamera} activeOpacity={0.8}>
            <LinearGradient
              colors={['#1f4b81ff', '#7fb1d6ff']}
              style={styles.modalOptionGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Ionicons name="camera" size={20} color="#fff" />
              <Text style={styles.modalOptionText}>Take Photo</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity style={styles.modalOption} onPress={onGallery} activeOpacity={0.8}>
            <LinearGradient
              colors={['#1f4b81ff', '#7fb1d6ff']}
              style={styles.modalOptionGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Ionicons name="images-outline" size={20} color="#fff" />
              <Text style={styles.modalOptionText}>Choose from Gallery</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.modalCancelButton} onPress={onCancel} activeOpacity={0.8}>
          <Text style={styles.modalCancelText}>Cancel</Text>
        </TouchableOpacity>
      </BlurView>
    </View>
  );
};



interface User {
  id: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  username?: string;
  email: string;
  avatarUrl?: string;
  createdAt: string;
  budgetPeriod?: string;
}

interface ProfileFormData {
  firstName: string;
  lastName: string;
  username: string;
  avatarUrl: string;
}

interface PinFormData {
  oldPin: string;
  newPin: string;
  confirmPin: string;
}

export default function ProfileScreen() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [changingPin, setChangingPin] = useState(false);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [choiceVisible, setChoiceVisible] = useState(false);

  const [modalVisible, setModalVisible] = useState(false);
  const [modalTitle, setModalTitle] = useState("");
  const [modalMessage, setModalMessage] = useState("");

  const showModal = (title, message) => {
    setModalTitle(title);
    setModalMessage(message);
    setModalVisible(true);
  };
  
  const [formData, setFormData] = useState<ProfileFormData>({
    firstName: "",
    lastName: "",
    username: "",
    avatarUrl: "",
  });
  const [pinData, setPinData] = useState<PinFormData>({
    oldPin: "",
    newPin: "",
    confirmPin: "",
  });
  const [saving, setSaving] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(50));
  const [refreshing, setRefreshing] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  
  const handleAvatarPress = () => {
    if (Platform.OS === "web") {
      fileInputRef.current?.click();
    } else {
      setChoiceVisible(true);
    }
  };

  const [spendingStreak, setSpendingStreak] = useState(0);

  const calculateStreak = useCallback((expenses) => {
    if (!expenses || expenses.length === 0) {
      setSpendingStreak(0);
      return;
    }

    const dateSet = new Set(
      expenses.map(e => {
        const d = new Date(e.date || e.createdAt);
        const local = new Date(d.getTime() + (d.getTimezoneOffset() * -60000));
        local.setHours(0, 0, 0, 0);
        return local.toLocaleDateString("en-CA");
      })
    );

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let streak = 0;
    const current = new Date(today);

    while (dateSet.has(current.toLocaleDateString("en-CA"))) {
      streak++;
      current.setDate(current.getDate() - 1);
    }

    setSpendingStreak(streak);
  }, []);

  const fetchExpenseCount = useCallback(async () => {
    try {
      const token = await getToken();
      if (!token?.id) return;

      const today = new Date().toISOString().slice(0, 10);
      const response = await api.get(
        `/auth/expenses/history?userId=${token.id}&start=2000-01-01&end=${today}`
      );

      const rawExpenses = response.data.expenses || [];

      const manilaExpenses = rawExpenses.map((e) => ({
        ...e,
        localDate: new Date(
          new Date(e.date || e.createdAt).toLocaleString("en-US", {
            timeZone: "Asia/Manila",
          })
        ),
      }));

      setTotalExpenses(manilaExpenses.length);
      calculateStreak(manilaExpenses);
    } catch (error) {
      console.error("❌ Failed to fetch expenses:", error.response?.data || error.message);
    }
  }, [calculateStreak]);

  useEffect(() => {
    const syncProfile = async () => {
      try {
        const token = await getToken();
        if (!token?.id) return;

        const response = await api.get(`/auth/${token.id}`);
        const updatedUser = response.data;

        setUser(updatedUser);

        if (!editing && !changingPin) {
          setFormData({
            firstName: updatedUser.firstName || "",
            lastName: updatedUser.lastName || "",
            username: updatedUser.username || "",
            avatarUrl: updatedUser.avatarUrl || "",
          });
        }
      } catch (error) {
        console.error("⚠️ Auto profile sync failed:", error);
      }
    };

    syncProfile();
    const interval = setInterval(syncProfile, 5000);
    return () => clearInterval(interval);
  }, [editing, changingPin]);

  const uploadAvatar = async (uri: string) => {
    try {
      setUploadingAvatar(true);
      const token = await getToken();
      if (!token?.id) throw new Error("Authentication required");

      let normalizedUri = uri;
      if (!normalizedUri.startsWith("file://")) {
        normalizedUri = `file://${uri}`;
      }

      const formData = new FormData();
      formData.append("avatar", {
        uri: normalizedUri,
        name: "avatar.jpg",
        type: "image/jpeg",
      } as any);

      const res = await api.post(`/auth/${token.id}/avatar`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const newAvatar = res.data?.user?.avatarUrl;
      if (newAvatar) {
        setUser((prev) => (prev ? { ...prev, avatarUrl: newAvatar } : null));
        setFormData((prev) => ({ ...prev, avatarUrl: newAvatar }));
        await saveToken({ ...token, avatarUrl: newAvatar });

        if (Platform.OS !== 'web') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
        showModal("✅ Success", "Avatar uploaded successfully!");
      }
    } catch (err) {
      console.error("Upload failed:", err);
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
      showModal("❌ Error", "Failed to upload avatar");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const pickImage = async (fromCamera: boolean) => {
    try {
      const permission = fromCamera
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (permission.status !== "granted") {
        Alert.alert(
          "Permission required",
          fromCamera ? "Camera access is needed." : "Gallery access is needed."
        );
        return;
      }

      const result = fromCamera
        ? await ImagePicker.launchCameraAsync({
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.7,
          })
        : await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.7,
          });

      if (!result.canceled) {
        let uri = result.assets[0].uri;

        if (Platform.OS === "ios" && uri.startsWith("ph://")) {
          const assetId = uri.split("/")[2];
          const dest = `${FileSystem.cacheDirectory}${assetId}.jpg`;
          await FileSystem.copyAsync({ from: uri, to: dest });
          uri = dest;
        }

        if (Platform.OS === "android" && uri.startsWith("content://")) {
          const dest = `${FileSystem.cacheDirectory}avatar.jpg`;
          await FileSystem.copyAsync({ from: uri, to: dest });
          uri = dest;
        }

        await uploadAvatar(uri);
      }
    } catch (err) {
      console.error("Image pick error:", err);
      Alert.alert("Error", "Something went wrong while picking an image.");
    }
  };

  const resetForms = useCallback(() => {
    if (user) {
      setFormData({
        firstName: user.firstName || "",
        lastName: user.lastName || "",
        username: user.username || "",
        avatarUrl: user.avatarUrl || "",
      });
    }
    setPinData({ oldPin: "", newPin: "", confirmPin: "" });
  }, [user]);

  const fetchUserData = useCallback(async () => {
    try {
      setLoading(true);
      const token = await getToken();
      if (!token?.id) {
        throw new Error("No user token found");
      }

      const response = await api.get(`/auth/${token.id}`);
      const userData = response.data;
      
      setUser(userData);
      setFormData({
        firstName: userData.firstName || "",
        lastName: userData.lastName || "",
        username: userData.username || "",
        avatarUrl: userData.avatarUrl || "",
      });

      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 800,
          useNativeDriver: true,
        }),
      ]).start();
    } catch (error: any) {
      console.error("Failed to fetch user data:", error);
      Alert.alert("Error", "Failed to load profile data");
    } finally {
      setLoading(false);
    }
  }, [fadeAnim, slideAnim]);

  useEffect(() => {
    fetchUserData();
    fetchExpenseCount();
  }, [fetchUserData, fetchExpenseCount]);

  const validateProfileForm = (): boolean => {
    if (!formData.firstName.trim()) {
      Alert.alert("Error", "First name is required");
      return false;
    }
    if (formData.username && !/^[a-zA-Z0-9_]+$/.test(formData.username)) {
      Alert.alert("Error", "Username can only contain letters, numbers, and underscores");
      return false;
    }
    return true;
  };

  const validatePinForm = (): boolean => {
    if (!pinData.oldPin || !pinData.newPin || !pinData.confirmPin) {
      Alert.alert("Error", "All PIN fields are required");
      return false;
    }
    if (!/^\d{6}$/.test(pinData.newPin)) {
      Alert.alert("Error", "PIN must be exactly 6 digits");
      return false;
    }
    if (pinData.newPin !== pinData.confirmPin) {
      Alert.alert("Error", "New PINs do not match");
      return false;
    }
    if (pinData.oldPin === pinData.newPin) {
      Alert.alert("Error", "New PIN must be different from current PIN");
      return false;
    }
    return true;
  };

  const handleSaveProfile = async () => {
    if (!validateProfileForm() || !user) return;

    try {
      setSaving(true);
      const token = await getToken();
      if (!token?.id) throw new Error("Authentication required");

      await api.patch(`/auth/${token.id}`, formData);
      
      setUser(prev => prev ? { ...prev, ...formData } : null);
      setEditing(false);
      showModal("✅ Success", "Profile updated successfully");
    } catch (error: any) {
      const message = error.response?.data?.error || "Failed to update profile";
      Alert.alert("Error", message);
    } finally {
      setSaving(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      fetchUserData(),
      fetchExpenseCount()
    ]);
    setRefreshing(false);
  }, [fetchUserData, fetchExpenseCount]);

  const handleChangePin = async () => {
    if (!validatePinForm() || !user) return;

    try {
      setSaving(true);
      const token = await getToken();
      if (!token?.id) throw new Error("Authentication required");

      await api.put(`/auth/${token.id}/pin`, {
        oldPin: pinData.oldPin,
        newPin: pinData.newPin,
      });

      setPinData({ oldPin: "", newPin: "", confirmPin: "" });
      setChangingPin(false);
      showModal("✅ Success", "PIN updated successfully");
    } catch (error: any) {
      const message = error.response?.data?.error || "Failed to update PIN";
      Alert.alert("Error", message);
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setEditing(false);
    resetForms();
  };

  const handleCancelPinChange = () => {
    setChangingPin(false);
    setPinData({ oldPin: "", newPin: "", confirmPin: "" });
  };

  const renderAvatar = () => {
    const displayName =
      user?.fullName ||
      `${user?.firstName || ""} ${user?.lastName || ""}`.trim() ||
      "User";

    return (
      <View style={styles.avatarContainer}>
        <View style={styles.avatarWrapper}>
          <View style={styles.avatarGlow} />

          {uploadingAvatar && (
            <View style={styles.uploadingOverlay}>
              <ActivityIndicator size="large" color="#fff" />
              <Text style={styles.uploadingText}>Uploading...</Text>
            </View>
          )}

          {user?.avatarUrl ? (
            <Image
              source={{ uri: `${user.avatarUrl}?t=${Date.now()}` }}
              style={[styles.avatarImage, uploadingAvatar && styles.avatarImageDimmed]}
              onError={() => console.log("❌ Avatar failed to load:", user.avatarUrl)}
            />
          ) : (
            <LinearGradient
              colors={['#1f4b81ff', '#2e86de']}
              style={styles.avatarPlaceholder}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Text style={styles.avatarText}>
                {displayName.charAt(0).toUpperCase()}
              </Text>
            </LinearGradient>
          )}
        </View>

        <TouchableOpacity
          style={styles.avatarBadge}
          activeOpacity={0.8}
          onPress={() => {
            if (Platform.OS !== 'web') {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            }
            handleAvatarPress();
          }}
          disabled={uploadingAvatar}
        >
          <LinearGradient
            colors={uploadingAvatar ? ["#9ca3af", "#9ca3af"] : ["#3b82f6", "#1d4ed8"]}
            style={styles.avatarBadgeGradient}
          >
            <Ionicons 
              name={uploadingAvatar ? "hourglass-outline" : "camera"} 
              size={18} 
              color="#fff" 
            />
          </LinearGradient>
        </TouchableOpacity>

        {Platform.OS === "web" && (
          <input
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            ref={fileInputRef}
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;

              try {
                setUploadingAvatar(true);
                const token = await getToken();
                const formData = new FormData();
                formData.append("avatar", file);

                const res = await api.post(`/auth/${token.id}/avatar`, formData, {
                  headers: { "Content-Type": "multipart/form-data" },
                });

                const newAvatar = res.data?.user?.avatarUrl;
                if (newAvatar) {
                  setUser((prev) =>
                    prev ? { ...prev, avatarUrl: newAvatar } : null
                  );
                  await saveToken({ ...token, avatarUrl: newAvatar });
                  showModal("✅ Success", "Avatar uploaded successfully!");
                }
              } catch (err) {
                console.error("❌ Web avatar upload failed:", err);
                showModal("❌ Error", "Failed to upload avatar");
              } finally {
                setUploadingAvatar(false);
              }
            }}
          />
        )}
      </View>
    );
  };

  const renderUserInfo = () => {
    const displayName = user?.fullName || 
      `${user?.firstName || ""} ${user?.lastName || ""}`.trim() || 
      "User";
    
    return (
      <Animated.View 
        style={[
          styles.userInfoContainer,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          }
        ]}
      >
        <Text style={styles.displayName}>{displayName}</Text>
        {user?.username && (
          <View style={styles.usernameContainer}>
            <View style={styles.usernameBadge}>
              <Text style={styles.username}>@{user.username}</Text>
            </View>
          </View>
        )}
        <Text style={styles.email}>{user?.email}</Text>
        <View style={styles.joinedContainer}>
          <View style={styles.joinedBadge}>
            <Ionicons name="calendar-outline" size={16} color="#6366f1" />
            <Text style={styles.joinedText}>
              Joined {user?.createdAt
                ? new Date(user.createdAt).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })
                : '--'}
            </Text>
          </View>
        </View>
      </Animated.View>
    );
  };

  const renderActionButtons = () => {
    if (editing || changingPin) return null;
    
    return (
      <Animated.View 
        style={[
          styles.actionButtonsContainer,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          }
        ]}
      >
        <TouchableOpacity 
          style={styles.primaryButton} 
          onPress={() => {
            if (Platform.OS !== 'web') {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            }
            setEditing(true);
          }}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={['#1f4b81ff', '#7fb1d6ff']}
            style={styles.buttonGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Ionicons name="create-outline" size={22} color="#fff" />
            <Text style={styles.primaryButtonText}>Edit Profile</Text>
          </LinearGradient>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.secondaryButton} 
          onPress={() => {
            if (Platform.OS !== 'web') {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            }
            setChangingPin(true);
          }}
          activeOpacity={0.8}
        >
          <View style={styles.secondaryButtonContent}>
            <Ionicons name="key-outline" size={22} color="#6366f1" />
            <Text style={styles.secondaryButtonText}>Change PIN</Text>
          </View>
        </TouchableOpacity>

        <View style={styles.statsContainer}>
          <TouchableOpacity
            style={styles.statItemRow}
            onPress={() => {
              if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              showModal(
                "Account Status",
                "Your account is active and verified. You have full access to all expense tracking features and can safely store your financial data."
              );
            }}
          >
            <View style={styles.statIconContainer}>
              <Ionicons name="shield-checkmark" size={20} color="#10b981" />
            </View>
            <View style={styles.statTextContainer}>
              <Text style={styles.statValue}>Active</Text>
              <Text style={styles.statLabel}>Account Status</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.statItemRow}
            onPress={() => {
              if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              const exp = totalExpenses || 0;
              const expText = exp === 0 ? "None" : `${exp} expense${exp === 1 ? "" : "s"}`;
              showModal(
                "Expenses Tracked",
                `You've logged ${expText} since joining. This shows your total transaction history and helps you understand your spending patterns.`
              );
            }}
          >
            <View style={styles.statIconContainer}>
              <Ionicons name="receipt-outline" size={20} color="#3b82f6" />
            </View>
            <View style={styles.statTextContainer}>
              <Text style={styles.statValue}>
                {totalExpenses === 0 ? "None" : totalExpenses}
              </Text>
              <Text style={styles.statLabel}>Expenses Tracked</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.statItemRow}
            onPress={() => {
              if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              showModal(
                "Spending Streak",
                spendingStreak > 0
                  ? `You've logged expenses for ${spendingStreak} consecutive day${spendingStreak > 1 ? "s" : ""}! Keep your tracking habit going strong.`
                  : "No active streak yet — start logging expenses daily to build consistency!"
              );
            }}
          >
            <View style={styles.statIconContainer}>
              <Ionicons name="flame-outline" size={20} color="#f97316" />
            </View>
            <View style={styles.statTextContainer}>
              <Text style={styles.statValue}>
                {spendingStreak > 0 ? `${spendingStreak} day${spendingStreak > 1 ? "s" : ""}` : "None"}
              </Text>
              <Text style={styles.statLabel}>Spending Streak</Text>
            </View>
          </TouchableOpacity>
        </View>
      </Animated.View>
    );
  };

 const renderEditForm = () => {
  if (!editing) return null;

  return (
    <Modal
      visible={editing}
      animationType="slide"
      transparent={true}
      onRequestClose={handleCancelEdit}
    >
      <KeyboardAvoidingView 
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.modalFormContainer}>
          <TouchableOpacity 
            style={styles.modalBackdrop} 
            activeOpacity={1} 
            onPress={handleCancelEdit}
          />
          
          <View style={styles.modalFormContent}>
            <View style={styles.formHeader}>
              <View style={styles.formTitleContainer}>
                <View style={styles.formIconContainer}>
                  <LinearGradient
                    colors={['#1f4b81ff', '#7fb1d6ff']}
                    style={styles.formIconGradient}
                  >
                    <Ionicons name="person-outline" size={20} color="#fff" />
                  </LinearGradient>
                </View>
                <Text style={styles.formTitle}>Edit Profile</Text>
              </View>
              <TouchableOpacity onPress={handleCancelEdit} style={styles.closeButton}>
                <Ionicons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>
                  First Name <Text style={styles.required}>*</Text>
                </Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="person-outline" size={18} color="#9ca3af" style={styles.inputIcon} />
                  <TextInput
                    style={styles.textInput}
                    value={formData.firstName}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, firstName: text }))}
                    placeholder="Enter your first name"
                    placeholderTextColor="#9ca3af"
                  />
                </View>
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Last Name</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="person-outline" size={18} color="#9ca3af" style={styles.inputIcon} />
                  <TextInput
                    style={styles.textInput}
                    value={formData.lastName}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, lastName: text }))}
                    placeholder="Enter your last name"
                    placeholderTextColor="#9ca3af"
                  />
                </View>
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Username</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="at" size={18} color="#9ca3af" style={styles.inputIcon} />
                  <TextInput
                    style={styles.textInput}
                    value={formData.username}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, username: text }))}
                    placeholder="Choose a username"
                    placeholderTextColor="#9ca3af"
                    autoCapitalize="none"
                  />
                </View>
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Avatar URL</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="image-outline" size={18} color="#9ca3af" style={styles.inputIcon} />
                  <TextInput
                    style={styles.textInput}
                    value={formData.avatarUrl}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, avatarUrl: text }))}
                    placeholder="https://example.com/avatar.jpg"
                    placeholderTextColor="#9ca3af"
                    autoCapitalize="none"
                    keyboardType="url"
                  />
                </View>
              </View>
            </ScrollView>

            <View style={styles.formActions}>
              <TouchableOpacity 
                style={[styles.formButton, styles.cancelButton]} 
                onPress={handleCancelEdit}
                activeOpacity={0.8}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.formButton, styles.saveButton]} 
                onPress={handleSaveProfile}
                disabled={saving}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={saving ? ['#9ca3af', '#9ca3af'] : ['#1f4b81ff', '#7fb1d6ff']}
                  style={styles.saveButtonGradient}
                >
                  {saving ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="checkmark" size={18} color="#fff" />
                      <Text style={styles.saveButtonText}>Save Changes</Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

 const renderPinForm = () => {
  if (!changingPin) return null;

  return (
    <Modal
      visible={changingPin}
      animationType="slide"
      transparent={true}
      onRequestClose={handleCancelPinChange}
    >
      <KeyboardAvoidingView 
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.modalFormContainer}>
          <TouchableOpacity 
            style={styles.modalBackdrop} 
            activeOpacity={1} 
            onPress={handleCancelPinChange}
          />
          
          <View style={styles.modalFormContent}>
            <View style={styles.formHeader}>
              <View style={styles.formTitleContainer}>
                <View style={styles.formIconContainer}>
                  <LinearGradient
                    colors={['#f59e0b', '#d97706']}
                    style={styles.formIconGradient}
                  >
                    <Ionicons name="key-outline" size={20} color="#fff" />
                  </LinearGradient>
                </View>
                <Text style={styles.formTitle}>Change PIN</Text>
              </View>
              <TouchableOpacity onPress={handleCancelPinChange} style={styles.closeButton}>
                <Ionicons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Current PIN</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="lock-closed-outline" size={18} color="#9ca3af" style={styles.inputIcon} />
                  <TextInput
                    style={styles.textInput}
                    value={pinData.oldPin}
                    onChangeText={(text) => setPinData(prev => ({ ...prev, oldPin: text }))}
                    placeholder="Enter current PIN"
                    placeholderTextColor="#9ca3af"
                    secureTextEntry
                    keyboardType="numeric"
                    maxLength={6}
                  />
                </View>
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>New PIN</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="key-outline" size={18} color="#9ca3af" style={styles.inputIcon} />
                  <TextInput
                    style={styles.textInput}
                    value={pinData.newPin}
                    onChangeText={(text) => setPinData(prev => ({ ...prev, newPin: text }))}
                    placeholder="Enter new 6-digit PIN"
                    placeholderTextColor="#9ca3af"
                    secureTextEntry
                    keyboardType="numeric"
                    maxLength={6}
                  />
                </View>
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Confirm New PIN</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="checkmark-circle-outline" size={18} color="#9ca3af" style={styles.inputIcon} />
                  <TextInput
                    style={styles.textInput}
                    value={pinData.confirmPin}
                    onChangeText={(text) => setPinData(prev => ({ ...prev, confirmPin: text }))}
                    placeholder="Confirm new PIN"
                    placeholderTextColor="#9ca3af"
                    secureTextEntry
                    keyboardType="numeric"
                    maxLength={6}
                  />
                </View>
              </View>
            </ScrollView>

            <View style={styles.formActions}>
              <TouchableOpacity 
                style={[styles.formButton, styles.cancelButton]} 
                onPress={handleCancelPinChange}
                activeOpacity={0.8}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.formButton, styles.saveButton]} 
                onPress={handleChangePin}
                disabled={saving}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={saving ? ['#9ca3af', '#9ca3af'] : ['#f59e0b', '#d97706']}
                  style={styles.saveButtonGradient}
                >
                  {saving ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="shield-checkmark" size={18} color="#fff" />
                      <Text style={styles.saveButtonText}>Update PIN</Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>
           </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <LinearGradient
          colors={['#1f4b81ff', '#7fb1d6ff']}
          style={StyleSheet.absoluteFillObject}
        />
        <View style={styles.loadingContent}>
          <View style={styles.loadingSpinner}>
            <ActivityIndicator size="large" color="#fff" />
          </View>
          <Text style={styles.loadingText}>Loading your profile...</Text>
          <Text style={styles.loadingSubtext}>Please wait a moment</Text>
        </View>
      </View>
    );
  }

  return (
    <>
      <KeyboardAvoidingView 
        style={styles.container} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <StatusBar barStyle="light-content" />
        <LinearGradient
          colors={['#1f4b81ff', '#7fb1d6ff']}
          style={styles.headerGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
        
        {(Platform.OS === "ios" || Platform.OS === "android") && (
          <TouchableOpacity
            style={styles.backArrowTop}
            onPress={() => router.back()}
            activeOpacity={0.8}
          >
            <Ionicons name="arrow-back" size={26} color="#fff" />
          </TouchableOpacity>
        )}
        
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#fff"
              colors={['#1f4b81ff', '#7fb1d6ff']}
              progressBackgroundColor="#fff"
            />
          }
        >
          <View style={styles.headerSection}>
            {renderAvatar()}
            {renderUserInfo()}
          </View>

          <View style={styles.contentSection}>
            {renderActionButtons()}
          </View>
        </ScrollView>

        {renderEditForm()}
        {renderPinForm()}
      </KeyboardAvoidingView>

      <InfoModal
        visible={modalVisible}
        title={modalTitle}
        message={modalMessage}
        onClose={() => setModalVisible(false)}
      />

      <ChoiceModal
        visible={choiceVisible}
        title="Update Profile Picture"
        message="Choose how you want to update your profile picture."
        onCamera={() => {
          setChoiceVisible(false);
          pickImage(true);
        }}
        onGallery={() => {
          setChoiceVisible(false);
          pickImage(false);
        }}
        onCancel={() => setChoiceVisible(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContent: {
    alignItems: 'center',
  },
  loadingSpinner: {
    marginBottom: 24,
  },
  loadingText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  loadingSubtext: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 16,
    fontWeight: '400',
  },
  headerGradient: {
    height: 300,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 120,
  },
  headerSection: {
    paddingTop: Platform.OS === 'ios' ? 100 : 80,
    paddingBottom: 40,
    alignItems: 'center',
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 24,
  },
  avatarWrapper: {
    width: 140,
    height: 140,
    borderRadius: 70,
    position: 'relative',
  },
  avatarGlow: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    top: -10,
    left: -10,
    opacity: 0.6,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 70,
    borderWidth: 4,
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    borderRadius: 70,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  avatarText: {
    fontSize: 56,
    fontWeight: '700',
    color: '#fff',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  avatarBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 3,
    borderColor: '#fff',
  },
  avatarBadgeGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userInfoContainer: {
    alignItems: 'center',
    paddingHorizontal: 24,
    width: '100%',
  },
  displayName: {
    fontSize: 32,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 12,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  usernameContainer: {
    marginBottom: 12,
  },
  usernameBadge: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  username: {
    fontSize: 16,
    color: '#1f2937',
    fontWeight: '600',
  },
  email: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.95)',
    marginBottom: 16,
    fontWeight: '500',
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  joinedContainer: {
    alignItems: 'center',
  },
  joinedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  joinedText: {
    fontSize: 14,
    color: '#4b5563',
    fontWeight: '600',
  },
  contentSection: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  actionButtonsContainer: {
    gap: 16,
  },
  primaryButton: {
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    minHeight: 56,
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: isSmallDevice ? 16 : 18,
    paddingHorizontal: isSmallDevice ? 24 : 32,
    gap: 12,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  secondaryButton: {
    backgroundColor: '#fff',
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  secondaryButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 32,
    gap: 12,
  },
  secondaryButtonText: {
    color: '#6366f1',
    fontSize: 18,
    fontWeight: '700',
  },
  statsContainer: {
    flexDirection: "column",
    backgroundColor: "#fff",
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 20,
    marginTop: 12,
    gap: 12,
    width: "100%",
    alignSelf: "center",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  statItemRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f9fafb",
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#f1f5f9",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  statTextContainer: {
    flex: 1,
  },
  statValue: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1f2937",
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 14,
    color: "#64748b",
    fontWeight: "500",
  },
  formContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
    alignItems: "center",
    zIndex: 9999,
  },
  formOverlay: {
    width: "100%",
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    maxHeight: Platform.OS === 'web' ? '80%' : '85%',
    elevation: 30,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    overflow: "hidden",
  },
  formContent: {
    flex: 1,
  },
  formHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    backgroundColor: '#fff',
  },
  formTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  formIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
  },
  formIconGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  formTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1f2937',
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
  },
  inputContainer: {
    marginBottom: 24,
    paddingHorizontal: 24,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  required: {
    color: '#ef4444',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#e2e8f0',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 4,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  inputIcon: {
    marginRight: 12,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    color: '#1f2937',
    paddingVertical: 14,
    fontWeight: '500',
  },
  formActions: {
    flexDirection: 'row',
    gap: 16,
    paddingHorizontal: 24,
    paddingVertical: 24,
    backgroundColor: '#f8fafc',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  formButton: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
  },
  cancelButton: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#e2e8f0',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  cancelButtonText: {
    color: '#64748b',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    paddingVertical: 16,
  },
  saveButton: {
    elevation: 4,
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  saveButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    gap: 8,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  backArrowTop: {
    position: "absolute",
    top: Platform.OS === "ios" ? 60 : 50,
    left: 20,
    zIndex: 200,
    backgroundColor: "rgba(0,0,0,0.3)",
    borderRadius: 30,
    padding: 8,
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  uploadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 70,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  uploadingText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 8,
  },
  avatarImageDimmed: {
    opacity: 0.5,
  },
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 99999,
  },
  modalContainer: {
    width: '85%',
    maxWidth: 400,
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
  },
  modalIconWrapper: {
    width: 72,
    height: 72,
    borderRadius: 36,
    marginBottom: 20,
    overflow: 'hidden',
    shadowColor: '#1f4b81ff',
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  modalIconGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1f2937',
    marginBottom: 12,
    textAlign: 'center',
  },
  modalMessage: {
    fontSize: 15,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
    fontWeight: '500',
  },
  modalOptionsContainer: {
    width: '100%',
    gap: 12,
    marginBottom: 16,
  },
  modalButton: {
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#1f4b81ff',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  modalButtonGradient: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },
  modalOption: {
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#1f4b81ff',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  modalOptionGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    gap: 10,
  },
  modalOptionText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  modalCancelButton: {
    width: '100%',
    paddingVertical: 14,
    backgroundColor: '#f1f5f9',
    borderRadius: 16,
    marginTop: 8,
  },
  modalCancelText: {
    color: '#64748b',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  modalFormContainer: {
  flex: 1,
  justifyContent: 'center',
  alignItems: 'center',
  backgroundColor: 'rgba(0, 0, 0, 0.5)',
  paddingHorizontal: 20,
},
modalBackdrop: {
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
},
modalFormContent: {
  width: '100%',
  maxWidth: 500,
  backgroundColor: '#fff',
  borderRadius: 24,
  maxHeight: '80%',
  overflow: 'hidden',
  elevation: 10,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.3,
  shadowRadius: 12,
},
});

