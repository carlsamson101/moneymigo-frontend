import React, { useRef, useState, useEffect } from "react";
import { View, Text, StyleSheet, Platform, TouchableOpacity } from "react-native";

const VoiceWebView: React.FC = () => {
  const [text, setText] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  const isWeb = Platform.OS === "web";

  // Set up Web Speech API only on web
  useEffect(() => {
    if (!isWeb) return;
    const SpeechRecognition: any =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setError("Speech recognition not supported in this browser.");
      return;
    }

    const rec = new SpeechRecognition();
    rec.lang = "en-US";
    rec.interimResults = false;
    rec.maxAlternatives = 1;

    rec.onstart = () => setListening(true);
    rec.onend = () => setListening(false);
    rec.onresult = (e: any) => {
      const t = e.results[0][0].transcript;
      setText(t);
    };
    rec.onerror = (e: any) => {
      setError(e.error || "Unknown error");
      setListening(false);
    };

    recognitionRef.current = rec;

    return () => {
      try {
        rec.abort();
      } catch {}
      recognitionRef.current = null;
    };
  }, [isWeb]);

  const startRecognition = () => {
    if (!isWeb) return;
    setError("");
    try {
      recognitionRef.current?.abort?.();
      // slight delay to reset state
      setTimeout(() => recognitionRef.current?.start?.(), 150);
    } catch (e: any) {
      setError(e?.message || "Could not start recognition");
    }
  };

  if (!isWeb) {
    return (
      <View style={styles.unsupportedContainer}>
        <Text style={styles.unsupportedText}>
          🎤 Voice recognition works only in mobile or desktop browsers.
        </Text>
        <Text style={styles.subText}>
          Open this app in Chrome or Safari to use speech recognition.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <TouchableOpacity
          onPress={startRecognition}
          disabled={listening}
          style={[
            styles.button,
            listening && { backgroundColor: "#64748B" },
          ]}
        >
          <Text style={styles.buttonText}>
            {listening ? "Listening…" : "🎤 Tap to Speak"}
          </Text>
        </TouchableOpacity>

        {!!error && <Text style={styles.errorText}>Error: {error}</Text>}
      </View>

      <View style={styles.outputBox}>
        <Text style={styles.label}>You said:</Text>
        <Text style={styles.result}>{text}</Text>
      </View>
    </View>
  );
};

export default VoiceWebView;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f2f4f7" },
  outputBox: {
    padding: 20,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderColor: "#ddd",
  },
  label: { fontSize: 18, color: "#333" },
  result: { fontSize: 20, fontWeight: "600", marginTop: 0, color: "#1f4b81" },
  unsupportedContainer: {
    flex: 1, justifyContent: "center", alignItems: "center", padding: 30, backgroundColor: "#f8fafc",
  },
  unsupportedText: { fontSize: 18, fontWeight: "700", color: "#1f4b81", textAlign: "center" },
  subText: { fontSize: 14, color: "#475569", textAlign: "center", marginTop: 8 },
  button: {
    backgroundColor: "#1f4b81",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
  },
  buttonText: { color: "#fff", fontSize: 18, fontWeight: "700" },
  errorText: { marginTop: 10, color: "#DC2626" },
});
