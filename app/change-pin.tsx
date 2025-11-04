import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import api from "../lib/api";
import { getToken } from "../lib/auth";

export default function ChangePinScreen() {
  const [oldPin, setOldPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const router = useRouter();

const handleChangePin = async () => {
  console.log("📤 Sending PIN update:", { oldPin, newPin });
  try {
    const token = await getToken();
    if (!token || !token.id) {
      return Alert.alert("Error", "Not logged in. Please log in again.");
    }

    const res = await api.put(`/auth/${token.id}/pin`, { oldPin, newPin });
    console.log("✅ Response:", res.data);

    Alert.alert("Success", "PIN updated successfully", [
      { text: "OK", onPress: () => router.back() },
    ]);
  } catch (err: any) {
    console.error("❌ Change PIN failed:", err.response?.data || err);
    Alert.alert("Error", err.response?.data?.error || "Something went wrong");
  }
};


  return (
    <View style={styles.container}>
      <Text style={styles.title}>Change PIN</Text>

      <Text style={styles.label}>Old PIN</Text>
      <TextInput
        style={styles.input}
        secureTextEntry
        keyboardType="numeric"
        value={oldPin}
        onChangeText={setOldPin}
        maxLength={6}
      />

      <Text style={styles.label}>New PIN</Text>
      <TextInput
        style={styles.input}
        secureTextEntry
        keyboardType="numeric"
        value={newPin}
        onChangeText={setNewPin}
        maxLength={6}
      />

      <Text style={styles.label}>Confirm New PIN</Text>
      <TextInput
        style={styles.input}
        secureTextEntry
        keyboardType="numeric"
        value={confirmPin}
        onChangeText={setConfirmPin}
        maxLength={6}
      />

      <TouchableOpacity style={styles.saveBtn} onPress={handleChangePin}>
        <Text style={styles.saveBtnText}>Update PIN</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc", padding: 20 },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 20,
    color: "#1e293b",
  },
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
  saveBtnText: {
    textAlign: "center",
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
});
