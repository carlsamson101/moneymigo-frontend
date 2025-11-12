import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

// 🌍 Use your deployed backend or local dev URL
const api = axios.create({
  baseURL: "https://moneymigo-backend.onrender.com/api", 
});

// 🧠 Intercept every request to attach the correct token
api.interceptors.request.use(async (config) => {
  try {
    // Read all possible tokens
    const adminToken = await AsyncStorage.getItem("adminToken");
    const storeToken =
      (await AsyncStorage.getItem("storeToken")) ||
      (await AsyncStorage.getItem("token"));
    const userToken = await AsyncStorage.getItem("userToken");

    // Pick token priority: Admin > Store > User
    const token = adminToken || storeToken || userToken;

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      
      // 🔍 Enhanced debugging
      console.log("📤 API Request:", {
        url: config.url,
        method: config.method?.toUpperCase(),
        hasToken: !!token,
        tokenPreview: token.substring(0, 30) + "...",
        tokenType: adminToken ? "admin" : storeToken ? "store" : "user"
      });
    } else {
      console.warn("⚠️ No token available for request:", config.url);
    }
  } catch (err) {
    console.warn("⚠️ Unable to attach token:", err);
  }
  return config;
});

// 🔍 Response interceptor for better error logging
api.interceptors.response.use(
  (response) => {
    console.log("✅ API Response:", {
      url: response.config.url,
      status: response.status,
      dataSize: JSON.stringify(response.data).length + " bytes"
    });
    return response;
  },
  async (error) => {
    if (error.response) {
      console.error("❌ API Error:", {
        url: error.config?.url,
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data,
        headers: error.response.headers
      });

      // Handle 401 Unauthorized
      if (error.response.status === 401) {
        console.error("🚫 401 Unauthorized - Token may be invalid or expired");
        
        // Check which token type was used
        const storeToken = await AsyncStorage.getItem("storeToken");
        const adminToken = await AsyncStorage.getItem("adminToken");
        const userToken = await AsyncStorage.getItem("userToken");
        
        console.log("Token status:", {
          hasStoreToken: !!storeToken,
          hasAdminToken: !!adminToken,
          hasUserToken: !!userToken
        });

        // Optionally clear tokens on 401
        // Uncomment if you want automatic logout on token expiry
        // await AsyncStorage.multiRemove(['storeToken', 'storeName', 'storeId']);
        // router.replace('/storeAuth');
      }
    } else if (error.request) {
      console.error("❌ Network Error:", error.message);
    } else {
      console.error("❌ Request Error:", error.message);
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