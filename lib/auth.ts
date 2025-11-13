import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

type UserToken = {
  id: string;
  firstName?: string;
  lastName?: string;
  token: string;
  budgetPeriod?: "Daily" | "Weekly" | "Monthly" | "Custom";
  avatarUrl?: string;
};

const STORAGE_KEY = "userToken";

// ========================================================
// SAVE TOKEN (fixed merge, fixed web persistence, no break)
// ========================================================
export async function saveToken(user: UserToken) {
  try {
    const existing = await getToken(); // can be null!

    // FIX: avoid merging null → {}
    const merged = { ...(existing || {}), ...(user || {}) };

    const userStr = JSON.stringify(merged);

    // FIX: SecureStore does NOT work on web → use localStorage
    if (Platform.OS === "web") {
      localStorage.setItem(STORAGE_KEY, userStr);
    } else {
      await SecureStore.setItemAsync(STORAGE_KEY, userStr);
    }

    // Save expiry (7 days)
    const now = new Date();
    const expiry = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    await AsyncStorage.setItem("authExpiry", expiry.toISOString());

    // Save cached data
    await AsyncStorage.setItem("userData", userStr);

    console.log("💾 Token, expiry, and user data saved");
  } catch (error) {
    console.error("❌ Failed to save token:", error);
  }
}

// ========================================================
// GET TOKEN (fixed: always return correct platform storage)
// ========================================================
export async function getToken(): Promise<UserToken | null> {
  try {
    let value;

    if (Platform.OS === "web") {
      value = localStorage.getItem(STORAGE_KEY);
    } else {
      value = await SecureStore.getItemAsync(STORAGE_KEY);
    }

    if (!value) return null;

    return JSON.parse(value);
  } catch (error) {
    console.error("⚠️ Token parse error:", error);
    return null;
  }
}

// ========================================================
// GET CACHED USER (unchanged, still correct)
// ========================================================
export async function getCachedUser() {
  try {
    const data = await AsyncStorage.getItem("userData");
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}

// ========================================================
// REMOVE TOKEN (fixed: remove both web + native properly)
// ========================================================
export async function removeToken() {
  try {
    if (Platform.OS === "web") {
      localStorage.removeItem(STORAGE_KEY);
    } else {
      await SecureStore.deleteItemAsync(STORAGE_KEY);
    }

    await AsyncStorage.multiRemove(["authExpiry", "userData", "migo-email"]);

    console.log("🧹 Cleared token, expiry, and cached user data");
  } catch (error) {
    console.error("⚠️ Failed to clear auth data:", error);
  }
}
