import React, { useRef, useState, useEffect } from "react";
import { View, Text, StyleSheet, Platform } from "react-native";

interface VoiceWebViewProps {
  onResult?: (text: string) => void;
  onError?: (error: string) => void;
  isListening?: boolean;
  onListeningChange?: (listening: boolean) => void;
}

const VoiceWebView: React.FC<VoiceWebViewProps> = ({
  onResult,
  onError,
  isListening = false,
  onListeningChange,
}) => {
  const recognitionRef = useRef<any>(null);
  const isWeb = Platform.OS === "web";

  // Set up Web Speech API only on web
  useEffect(() => {
    if (!isWeb) return;

    const SpeechRecognition: any =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      onError?.("Speech recognition not supported in this browser.");
      return;
    }

    const rec = new SpeechRecognition();
    rec.lang = "en-US";
    rec.interimResults = false;
    rec.maxAlternatives = 1;

    rec.onstart = () => {
      console.log("🎤 Speech recognition started");
      onListeningChange?.(true);
    };

    rec.onend = () => {
      console.log("🎤 Speech recognition ended");
      onListeningChange?.(false);
    };

    rec.onresult = (e: any) => {
      const transcript = e.results[0][0].transcript;
      console.log("🎤 Transcript:", transcript);
      onResult?.(transcript);
    };

    rec.onerror = (e: any) => {
      console.error("🎤 Speech error:", e.error);
      onError?.(e.error || "Unknown error");
      onListeningChange?.(false);
    };

    recognitionRef.current = rec;

    return () => {
      try {
        rec.abort();
      } catch {}
      recognitionRef.current = null;
    };
  }, [isWeb]);

  // Start recognition when isListening prop changes
  useEffect(() => {
    if (!isWeb || !recognitionRef.current) return;

    if (isListening) {
      try {
        recognitionRef.current.abort();
        setTimeout(() => {
          try {
            recognitionRef.current?.start();
          } catch (err) {
            console.error("Failed to start recognition:", err);
          }
        }, 150);
      } catch (err) {
        console.error("Failed to abort previous recognition:", err);
      }
    } else {
      try {
        recognitionRef.current.abort();
      } catch {}
    }
  }, [isListening, isWeb]);

  // ✅ Return nothing - this is a hidden service component
  if (!isWeb) {
    return null;
  }

  return null; // Component has no UI
};

export default VoiceWebView;

const styles = StyleSheet.create({
  // No styles needed - component is invisible
});