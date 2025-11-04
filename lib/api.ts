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
    }
  } catch (err) {
    console.warn("⚠️ Unable to attach token:", err);
  }
  return config;
});

// Example API helper
export const getBudgetHistory = async (userId:string) => {
  const res = await api.get(`/budget-history/${userId}`);
  return res.data;
};

export default api;
