import AsyncStorage from "@react-native-async-storage/async-storage";
import { jwtDecode } from "jwt-decode";
import { router } from "expo-router";

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
 * Redirects to /storeAuth if invalid or expired.
 * Logs remaining token lifetime to console.
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
      console.error("❌ Invalid token — clearing session");
      await AsyncStorage.multiRemove(["storeToken", "storeName", "storeId"]);
      router.replace("/storeAuth");
      return null;
    }

    const now = Date.now() / 1000;

    // ⏰ Compute remaining lifetime
    if (decoded.exp) {
      const secondsLeft = decoded.exp - now;
      if (secondsLeft <= 0) {
        console.warn("⚠️ Store token expired — logging out");
        await AsyncStorage.multiRemove(["storeToken", "storeName", "storeId"]);
        router.replace("/storeAuth");
        return null;
      }

      const hours = Math.floor(secondsLeft / 3600);
      const minutes = Math.floor((secondsLeft % 3600) / 60);
      const seconds = Math.floor(secondsLeft % 60);
      console.log(
        `⏳ Store token valid for ${hours}h ${minutes}m ${seconds}s`
      );
    }

    console.log(`✅ Authenticated as ${decoded.storeName || storeName}`);
    return decoded;
  } catch (err) {
    console.error("❌ Store auth check failed:", err);
    await AsyncStorage.multiRemove(["storeToken", "storeName", "storeId"]);
    router.replace("/storeAuth");
    return null;
  }
};
