// @ts-nocheck
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Platform,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  StyleSheet,
  ScrollView,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import api from "../lib/api";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";


const StoreAuth = () => {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [storeName, setStoreName] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);


  /* =========================================================
     🧠 AUTO LOGIN IF TOKEN EXISTS
  ========================================================= */
  useEffect(() => {
    const checkAuth = async () => {
      const token = await AsyncStorage.getItem("storeToken");
      const storedName = await AsyncStorage.getItem("storeName");
      if (token && storedName) {
        router.replace("/StoreDashboard");
      }
    };
    checkAuth();
  }, []);


  /* =========================================================
   🔑 LOGIN HANDLER — with robust error handling
========================================================= */
const handleLogin = async () => {
  if (!storeName.trim() || !password.trim()) {
    return showAlert("Missing Fields", "Please enter both store name and password.");
  }


  setLoading(true);
  try {
    const res = await api.post("/storeUsers/login", { storeName, password });


    const { token, storeName: name, message } = res.data || {};


    if (token && name) {
      await AsyncStorage.setItem("storeToken", token);
      await AsyncStorage.setItem("storeName", name);


      showAlert("Welcome!", message || `Logged in as ${name}`);
      router.replace("/StoreDashboard");
      return;
    }


    showAlert("Unexpected Response", "Login succeeded but no token was received.");


  } catch (err: any) {
    console.error("Login error:", err);


    if (err.response) {
      const status = err.response.status;
      const msg =
        err.response.data?.message ||
        err.response.data?.error ||
        "An unknown error occurred.";


      if (status === 400 || status === 401) {
        showAlert("Invalid Credentials", msg || "Incorrect store name or password.");
      } else if (status === 404) {
        showAlert("Store Not Found", "This store name does not exist.");
      } else if (status >= 500) {
        showAlert("Server Error", "The server encountered a problem. Please try again later.");
      } else {
        showAlert("Login Failed", msg);
      }
    } else if (err.request) {
      showAlert(
        "Network Error",
        "Unable to reach the server. Please check your internet connection."
      );
    } else {
      showAlert("Error", "Something went wrong while preparing your request.");
    }
  } finally {
    setLoading(false);
  }
};


function showAlert(title: string, message: string) {
  if (Platform.OS === "web") {
    window.alert(`${title}\n\n${message}`);
  } else {
    Alert.alert(title, message);
  }
}


  /* =========================================================
     🧾 REGISTER HANDLER
  ========================================================= */
  const handleRegister = async () => {
    if (!storeName || !password)
      return showAlert("Error", "Enter store name and password");


    setLoading(true);
    try {
      const res = await api.post("/storeUsers/register", { storeName, password });


      if (res.data?.message?.includes("Store registered")) {
        showAlert("Success", `Store "${storeName}" registered!`);
        setMode("login");
      } else {
        showAlert(
          "Register Failed",
          res.data?.message || "Could not register store"
        );
      }
    } catch (err: any) {
      console.log("Register error:", err.response?.data || err);
      showAlert(
        "Register Failed",
        err.response?.data?.message || "Could not register"
      );
    } finally {
      setLoading(false);
    }
  };


  /* =========================================================
     🧹 LOGOUT HANDLER
  ========================================================= */
  const handleLogout = async () => {
    await AsyncStorage.removeItem("storeToken");
    await AsyncStorage.removeItem("storeName");
    showAlert("Logged out", "You have been logged out");
  };


  return (
    <LinearGradient
      colors={["#6B1C23", "#8B2530", "#6B1C23"]}
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <View style={styles.backgroundDecor}>
        <View style={styles.circle1} />
        <View style={styles.circle2} />
        <View style={styles.circle3} />
        <View style={styles.circle4} />
      </View>


      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* ==================== HEADER ==================== */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <View style={styles.logoCircle}>
              <Text style={styles.logoText}>M</Text>
            </View>
          </View>
          <Text style={styles.appTitle}>MoneyMigo</Text>
          <Text style={styles.subtitle}>Smart Store Management</Text>
        </View>


        {/* ==================== AUTH CARD ==================== */}
        <View style={styles.authCard}>
          {/* Mode Switch */}
          <View style={styles.modeToggle}>
            <TouchableOpacity
              style={[styles.toggleButton, mode === "login" && styles.activeToggle]}
              onPress={() => setMode("login")}
            >
              <Text
                style={[
                  styles.toggleText,
                  mode === "login" && styles.activeToggleText,
                ]}
              >
                Login
              </Text>
            </TouchableOpacity>


            <TouchableOpacity
              style={[styles.toggleButton, mode === "register" && styles.activeToggle]}
              onPress={() => setMode("register")}
            >
              <Text
                style={[
                  styles.toggleText,
                  mode === "register" && styles.activeToggleText,
                ]}
              >
                Register
              </Text>
            </TouchableOpacity>
          </View>


          {/* Form */}
          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Store Name</Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  placeholder="Enter your store name"
                  value={storeName}
                  onChangeText={setStoreName}
                  style={styles.input}
                  autoCapitalize="words"
                  placeholderTextColor="#9ca3af"
                />
              </View>
            </View>


            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Password</Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  placeholder="Enter your password"
                  value={password}
                  secureTextEntry
                  onChangeText={setPassword}
                  style={styles.input}
                  placeholderTextColor="#9ca3af"
                />
              </View>
            </View>


            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#F4B942" />
                <Text style={styles.loadingText}>
                  {mode === "login" ? "Signing in..." : "Creating account..."}
                </Text>
              </View>
            ) : (
              <LinearGradient
                colors={["#F4B942", "#D4A140"]}
                style={styles.primaryButton}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <TouchableOpacity
                  onPress={mode === "login" ? handleLogin : handleRegister}
                  style={styles.buttonTouchable}
                >
                  <Text style={styles.primaryButtonText}>
                    {mode === "login" ? "Sign In" : "Create Account"}
                  </Text>
                </TouchableOpacity>
              </LinearGradient>
            )}
          </View>


          {/* Footer Links */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              {mode === "login"
                ? "New to MoneyMigo?"
                : "Already have an account?"}
            </Text>
            <TouchableOpacity
              onPress={() => setMode(mode === "login" ? "register" : "login")}
              style={styles.linkButton}
            >
              <Text style={styles.linkText}>
                {mode === "login" ? "Create Account" : "Sign In"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>


        <View style={styles.bottomInfo}>
          <Text style={styles.bottomText}>Secure • Simple • Efficient</Text>
          <TouchableOpacity onPress={handleLogout}>
            <Text style={styles.debugText}>
              (Logout / Reset)
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </LinearGradient>
  );
};


export default StoreAuth;


/* ==================== STYLES ==================== */
const styles = StyleSheet.create({
  container: { flex: 1 },
  backgroundDecor: {
    position: "absolute",
    width: "100%",
    height: "100%",
    zIndex: 0
  },
  circle1: {
    position: "absolute",
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: "rgba(244, 185, 66, 0.1)",
    top: -80,
    right: -60
  },
  circle2: {
    position: "absolute",
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: "rgba(244, 185, 66, 0.08)",
    bottom: 80,
    left: -40
  },
  circle3: {
    position: "absolute",
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    top: 180,
    left: 40
  },
  circle4: {
    position: "absolute",
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "rgba(244, 185, 66, 0.12)",
    top: 350,
    right: 50
  },
  scrollView: { flex: 1, zIndex: 1 },
  content: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 40
  },
  header: { alignItems: "center", marginBottom: 32 },
  logoContainer: { marginBottom: 16 },
  logoCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "#F4B942",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 10,
    borderWidth: 3,
    borderColor: "rgba(255, 255, 255, 0.3)"
  },
  logoText: {
    fontSize: 38,
    fontWeight: "900",
    color: "#6B1C23"
  },
  appTitle: {
    fontSize: 34,
    fontWeight: "900",
    color: "white",
    marginBottom: 6,
    textAlign: "center",
    textShadowColor: "rgba(0, 0, 0, 0.3)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4
  },
  subtitle: {
    fontSize: 15,
    color: "rgba(255,255,255,0.95)",
    textAlign: "center",
    fontWeight: "500"
  },
  authCard: {
    backgroundColor: "rgba(255,255,255,0.98)",
    borderRadius: 24,
    paddingVertical: 32,
    paddingHorizontal: 26,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.3,
    shadowRadius: 25,
    elevation: 20,
    borderWidth: 2,
    borderColor: "#F4B942",
    maxWidth: 500,
    width: "100%",
    alignSelf: "center"
  },
  modeToggle: {
    flexDirection: "row",
    backgroundColor: "#F7F7F7",
    borderRadius: 14,
    padding: 5,
    marginBottom: 28,
    borderWidth: 2,
    borderColor: "#E5E5E5"
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 13,
    alignItems: "center",
    borderRadius: 10
  },
  activeToggle: {
    backgroundColor: "#F4B942",
    shadowColor: "#6B1C23",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4
  },
  toggleText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#6B1C23"
  },
  activeToggleText: {
    color: "#6B1C23",
    fontWeight: "800"
  },
  form: { gap: 20 },
  inputContainer: { gap: 10 },
  inputLabel: {
    fontSize: 15,
    fontWeight: "700",
    color: "#6B1C23",
    marginLeft: 6,
    textTransform: "uppercase",
    letterSpacing: 0.5
  },
  inputWrapper: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    borderWidth: 2,
    borderColor: "#6B1C23"
  },
  input: {
    paddingHorizontal: 18,
    paddingVertical: 16,
    fontSize: 16,
    color: "#6B1C23",
    fontWeight: "600"
  },
  loadingContainer: {
    alignItems: "center",
    paddingVertical: 24,
    gap: 14
  },
  loadingText: {
    fontSize: 16,
    color: "#6B1C23",
    fontWeight: "600"
  },
  primaryButton: {
    borderRadius: 14,
    marginTop: 12,
    shadowColor: "#F4B942",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
    borderWidth: 2,
    borderColor: "#6B1C23"
  },
  buttonTouchable: {
    paddingVertical: 18,
    alignItems: "center"
  },
  primaryButtonText: {
    color: "#6B1C23",
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: 0.5
  },
  footer: {
    marginTop: 28,
    alignItems: "center",
    gap: 10
  },
  footerText: {
    fontSize: 14,
    color: "#6B1C23",
    fontWeight: "500"
  },
  linkButton: {
    paddingVertical: 6,
    paddingHorizontal: 12
  },
  linkText: {
    fontSize: 16,
    color: "#6B1C23",
    fontWeight: "700",
    textDecorationLine: "underline"
  },
  bottomInfo: {
    marginTop: 24,
    alignItems: "center",
    paddingBottom: 20
  },
  bottomText: {
    fontSize: 13,
    color: "rgba(255,255,255,0.9)",
    fontWeight: "600",
    letterSpacing: 1.2
  },
  debugText: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 12,
    marginTop: 4
  }
});

