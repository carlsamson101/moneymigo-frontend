import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

// 🌍 Use your deployed backend or local dev URL
const api = axios.create({
  baseURL: "https://moneymigo-backend.onrender.com/api",
});

// 🧠 Intercept every request to attach the correct token
api.interceptors.request.use(async (config) => {
  try {
    // Read all possible tokens (FIXED: userToken correct key)
    const adminToken = await AsyncStorage.getItem("adminToken");
    const storeToken = await AsyncStorage.getItem("storeToken");
    const userToken = await AsyncStorage.getItem("token"); // <-- FIXED

    // Pick token priority: Admin > Store > User
    const token = storeToken || adminToken || userToken;

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch (err) {
    console.warn("⚠️ Unable to attach token:", err);
  }
  return config;
});

// =======================================================
// 🔐 RESPONSE INTERCEPTOR — Auto-logout on 401
// ✅ FIXED: Don't intercept login failures
// =======================================================
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401 || error.response?.status === 403) {
      const requestUrl = error.config?.url || "";
      
      // ✅ DON'T intercept login/register requests - these are just wrong credentials
      const isAuthRequest = 
        requestUrl.includes("/login") || 
        requestUrl.includes("/register") ||
        requestUrl.includes("/storeUsers/login") ||
        requestUrl.includes("/storeUsers/register");
      
      if (isAuthRequest) {
        console.log("❌ Login/Register failed - letting component handle it");
        return Promise.reject(error); // Pass error to component's catch block
      }

      // Only clear tokens for authenticated requests (expired sessions)
      console.log("🔐 Token expired — clearing storage...");

      // Clear all relevant tokens
      await AsyncStorage.multiRemove([
        "adminToken",
        "storeToken",
        "token",
        "storeName",
        "userData",
      ]);

      // Redirect on web only
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
    }

    return Promise.reject(error);
  }
);

// Example API helper
export const getBudgetHistory = async (userId: string) => {
  const res = await api.get(`/budget-history/${userId}`);
  return res.data;
};

export default api;