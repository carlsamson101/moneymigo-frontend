import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";


type UserToken = {
  id: string;
  firstName: string;
  lastName: string;
  token: string;
  budgetPeriod?: "Daily" | "Weekly" | "Monthly" | "Custom";
  avatarUrl?: string;
};


const STORAGE_KEY = "userToken";


// ✅ Save token + user info + expiry date
export async function saveToken(user: UserToken) {
  try {
    // Merge with existing token so details aren’t lost
    const existing = await getToken();
    const merged = { ...existing, ...user };


    const userStr = JSON.stringify(merged);


    if (Platform.OS !== "web") {
      await SecureStore.setItemAsync(STORAGE_KEY, userStr);
    } else {
      localStorage.setItem(STORAGE_KEY, userStr);
    }


    // ✅ Save expiry separately in AsyncStorage (7 days)
    const now = new Date();
    const expiry = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    await AsyncStorage.setItem("authExpiry", expiry.toISOString());


    // ✅ Save cached profile (for offline use)
    await AsyncStorage.setItem("userData", userStr);


    console.log("💾 Token, expiry, and user data saved");
  } catch (error) {
    console.error("❌ Failed to save token:", error);
  }
}


// ✅ Retrieve token + user data
export async function getToken(): Promise<UserToken | null> {
  try {
    const value =
      Platform.OS === "web"
        ? localStorage.getItem(STORAGE_KEY)
        : await SecureStore.getItemAsync(STORAGE_KEY);


    return value ? JSON.parse(value) : null;
  } catch (error) {
    console.error("⚠️ Token parse error:", error);
    return null;
  }
}


// ✅ Retrieve cached user info (for offline)
export async function getCachedUser() {
  try {
    const data = await AsyncStorage.getItem("userData");
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}


// ✅ Remove token + expiry + cached profile
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



