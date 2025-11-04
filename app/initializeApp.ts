// app/initializeApp.ts
import { initOfflineSyncListener } from "../lib/offlineCache";

let appInitialized = false;

export function initializeApp() {
  if (appInitialized) {
    return;
  }
  
  appInitialized = true;
  
  // Initialize offline sync listener once globally
  initOfflineSyncListener();
  
  console.log("✅ App initialized globally");
}

export function resetAppInitialization() {
  appInitialized = false;
}