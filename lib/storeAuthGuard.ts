// lib/storeAuthGuard.ts
import AsyncStorage from "@react-native-async-storage/async-storage";
import { jwtDecode } from "jwt-decode";
import { router } from "expo-router";

interface StoreDecodedToken {
  id?: string;
  storeName?: string;
  exp?: number;
}

export const checkStoreAuth = async (): Promise<boolean> => {
  try {
    const token = await AsyncStorage.getItem("storeToken");

    if (!token) {
      console.log("❌ No store token — redirecting to storeAuth");
      router.replace("/storeAuth");
      return false;
    }

    const decoded = jwtDecode<StoreDecodedToken>(token);
    const now = Date.now() / 1000;

    if (decoded.exp && decoded.exp < now) {
      console.log("⚠️ Store token expired — clearing session");
      await AsyncStorage.removeItem("storeToken");
      await AsyncStorage.removeItem("storeName");
      router.replace("/storeAuth");
      return false;
    }

    console.log("🏪 Store token valid");
    return true;
  } catch (err) {
    console.error("❌ Store token validation failed:", err);
    await AsyncStorage.removeItem("storeToken");
    await AsyncStorage.removeItem("storeName");
    router.replace("/storeAuth");
    return false;
  }
};
