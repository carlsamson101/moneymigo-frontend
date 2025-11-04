import AsyncStorage from "@react-native-async-storage/async-storage";
import { jwtDecode } from "jwt-decode";
import { router } from "expo-router";

interface DecodedToken {
  id?: string;
  email?: string;
  role?: string;
  exp?: number;
}

export const checkAdminAuth = async (): Promise<boolean> => {
  try {
    const token = await AsyncStorage.getItem("adminToken");
    if (!token) {
      console.log("❌ No admin token found — redirecting to login");
      router.replace("/AdminLoginPage");
      return false;
    }

    const decoded = jwtDecode<DecodedToken>(token);
    const now = Date.now() / 1000;

    if (decoded.exp && decoded.exp < now) {
      console.log("⚠️ Admin token expired — clearing session");
      await AsyncStorage.removeItem("adminToken");
      router.replace("/AdminLoginPage");
      return false;
    }

    // ✅ Log remaining token time
    if (decoded.exp) {
      const remaining = decoded.exp - now;
      const mins = Math.floor(remaining / 60);
      const secs = Math.floor(remaining % 60);
      console.log(`⏳ Admin token valid for ${mins}m ${secs}s`);
    }

    return true;
  } catch (err) {
    console.error("❌ Admin token validation failed:", err);
    await AsyncStorage.removeItem("adminToken");
    router.replace("/AdminLoginPage");
    return false;
  }
};
