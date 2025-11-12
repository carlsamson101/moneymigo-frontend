import AsyncStorage from "@react-native-async-storage/async-storage";
import { jwtDecode } from "jwt-decode";
import { router } from "expo-router";
import api from "./api";

interface DecodedToken {
  id?: string;
  storeName?: string;
  role?: string;
  exp?: number;
  iat?: number;
  [key: string]: any;
}

/**
 * ✅ checkStoreAuth()
 * Ensures that a store user is logged in with a valid, unexpired JWT.
 * Verifies token both client-side AND with backend.
 * Redirects to /storeAuth if invalid or expired.
 */
export const checkStoreAuth = async (): Promise<DecodedToken | null> => {
  try {
    const token = await AsyncStorage.getItem("storeToken");
    const storeName = await AsyncStorage.getItem("storeName");

    if (!token || !storeName) {
      console.warn("❌ No store session found — redirecting to login");
      router.replace("/storeAuth");
      return null;
    }

    let decoded: DecodedToken;
    try {
      decoded = jwtDecode<DecodedToken>(token);
    } catch {
      console.error("❌ Invalid token format — clearing session");
      await AsyncStorage.multiRemove(["storeToken", "storeName", "storeId"]);
      router.replace("/storeAuth");
      return null;
    }

    const now = Date.now() / 1000;

    // ⏰ Check client-side expiry first (fast check)
    if (decoded.exp && decoded.exp - now <= 0) {
      console.warn("⚠️ Store token expired (client-side) — logging out");
      await AsyncStorage.multiRemove(["storeToken", "storeName", "storeId"]);
      router.replace("/storeAuth");
      return null;
    }

    // ⏰ Log remaining lifetime
    if (decoded.exp) {
      const secondsLeft = decoded.exp - now;
      const hours = Math.floor(secondsLeft / 3600);
      const minutes = Math.floor((secondsLeft % 3600) / 60);
      const seconds = Math.floor(secondsLeft % 60);
      console.log(
        `⏳ Store token valid for ${hours}h ${minutes}m ${seconds}s (client-side)`
      );
    }

    // 🔐 VERIFY WITH BACKEND (the critical part that was missing)
    try {
      // Try to fetch store items as a lightweight auth check
      console.log("🔍 Verifying token with backend...");
      const testResponse = await api.get(`/storeItems/${encodeURIComponent(storeName)}`);
      
      if (testResponse.status === 200) {
        console.log(`✅ Token verified with backend - Authenticated as ${decoded.storeName || storeName}`);
        return decoded;
      }
    } catch (backendError: any) {
      const status = backendError.response?.status;
      
      if (status === 401 || status === 403) {
        console.error("🚫 Backend rejected token (401/403) — token invalid or expired");
        console.error("Backend error:", backendError.response?.data);
        await AsyncStorage.multiRemove(["storeToken", "storeName", "storeId"]);
        router.replace("/storeAuth");
        return null;
      }
      
      // For other errors (network issues, 500, etc.), allow through
      // We don't want to log users out due to temporary network issues
      console.warn("⚠️ Backend check failed with status:", status, "— allowing through");
      console.log(`✅ Authenticated as ${decoded.storeName || storeName} (backend check skipped)`);
      return decoded;
    }

    return decoded;
  } catch (err) {
    console.error("❌ Store auth check failed:", err);
    await AsyncStorage.multiRemove(["storeToken", "storeName", "storeId"]);
    router.replace("/storeAuth");
    return null;
  }
};