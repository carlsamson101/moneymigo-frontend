// @ts-nocheck
import React, { useState, useEffect } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from "react-native";
import { useRouter } from "expo-router";
import api from "../lib/api";
import { getToken } from "../lib/auth";

export default function EditProfileScreen() {
  const router = useRouter();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");

  useEffect(() => {
    (async () => {
      const token = await getToken();
      if (token?.id) {
        const res = await api.get(`/auth/${token.id}`);
        setFirstName(res.data.firstName || "");
        setLastName(res.data.lastName || "");
      }
    })();
  }, []);

const handleSave = async () => {
  console.log("🟡 Save pressed:", { firstName, lastName });

  try {
    const token = await getToken();
    if (!token?.id) {
      console.log("❌ No token found");
      return Alert.alert("Error", "Not logged in. Please log in again.");
    }

    console.log("📤 Sending PATCH request:", `/auth/${token.id}`, {
      firstName,
      lastName,
    });

    const res = await api.patch(`/auth/${token.id}`, {
      firstName,
      lastName,
    });

    console.log("✅ Response:", res.data);

    Alert.alert("Success", "Profile updated successfully", [
      { text: "OK", onPress: () => router.back() },
    ]);
  } catch (err: any) {
    console.error("❌ Save failed:", err.response?.data || err.message);
    Alert.alert("Error", err.response?.data?.error || "Failed to update profile");
  }
};


  return (
    <View style={styles.container}>
      <Text style={styles.title}>Edit Profile</Text>

      <Text style={styles.label}>First Name</Text>
      <TextInput style={styles.input} value={firstName} onChangeText={setFirstName} />

      <Text style={styles.label}>Last Name</Text>
      <TextInput style={styles.input} value={lastName} onChangeText={setLastName} />

      <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
        <Text style={styles.saveBtnText}>Save Changes</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc", padding: 20 },
  title: { fontSize: 20, fontWeight: "bold", marginBottom: 20, color: "#1e293b" },
  label: { fontSize: 15, fontWeight: "500", marginTop: 12 },
  input: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    padding: 12,
    borderRadius: 8,
    marginTop: 6,
    fontSize: 16,
    backgroundColor: "#fff",
  },
  saveBtn: {
    backgroundColor: "#2563eb",
    marginTop: 28,
    padding: 14,
    borderRadius: 10,
  },
  saveBtnText: { textAlign: "center", color: "#fff", fontWeight: "bold", fontSize: 16 },
});
