import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo from "@react-native-community/netinfo";
import api from "./api";

type OfflineAction = {
  id: string;
  endpoint: string;
  method: "GET" | "POST" | "PUT" | "DELETE";
  data?: Record<string, any>;
  timestamp: number;
};

const OFFLINE_QUEUE_KEY = "offlineQueueV2";
let syncInProgress = false;
let lastSyncAttempt = 0;
const SYNC_DEBOUNCE_MS = 3000;

/* -------------------------------------------------------------------------- */
/* 📦 1. Get Cached or Online Data                                            */
/* -------------------------------------------------------------------------- */
export async function getCachedData<T>(
  endpoint: string,
  cacheKey: string
): Promise<T[]> {
  try {
    const net = await NetInfo.fetch();
    if (net.isConnected) {
      const res = await api.get(endpoint);
      await AsyncStorage.setItem(cacheKey, JSON.stringify(res.data));
      return res.data;
    } else {
      console.log("📦 Offline: using cached data for", cacheKey);
      const cached = await AsyncStorage.getItem(cacheKey);
      return cached ? JSON.parse(cached) : [];
    }
  } catch (err) {
    console.warn("⚠️ Cache fetch error:", err);
    const cached = await AsyncStorage.getItem(cacheKey);
    return cached ? JSON.parse(cached) : [];
  }
}

export const queueOfflineChange = async (type: string, data: any) => {
  try {
    const queueKey = `offlineQueue`;
    const existingQueue = await AsyncStorage.getItem(queueKey);
    const queue = existingQueue ? JSON.parse(existingQueue) : [];
    
    queue.push({ type, data, timestamp: Date.now() });
    await AsyncStorage.setItem(queueKey, JSON.stringify(queue));
    
    return true;
  } catch (error) {
    console.error('Failed to queue offline change:', error);
    return false;
  }
};

/* -------------------------------------------------------------------------- */
/* 🧠 2. Queue Offline Actions                                                */
/* -------------------------------------------------------------------------- */
export async function queueOfflineAction(
  endpoint: string,
  method: "POST" | "PUT" | "DELETE",
  data: any
) {
  try {
    const queue: OfflineAction[] = JSON.parse(
      (await AsyncStorage.getItem(OFFLINE_QUEUE_KEY)) || "[]"
    );

    const id = `${method}-${endpoint}-${data?.userId || Date.now()}`;

    if (queue.some((q) => q.id === id)) {
      console.log("⚠️ Duplicate offline action ignored:", id);
      return;
    }

    queue.push({
      id,
      endpoint,
      method,
      data,
      timestamp: Date.now(),
    });

    await AsyncStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
    console.log("📥 Queued offline action:", { method, endpoint });
  } catch (err) {
    console.error("❌ Failed to queue offline action:", err);
  }
}

/* -------------------------------------------------------------------------- */
/* 🔄 3. Sync Offline Queue                                                  */
/* -------------------------------------------------------------------------- */
export async function syncOfflineChanges(force = false) {
  if (syncInProgress) return;
  const now = Date.now();
  if (!force && now - lastSyncAttempt < SYNC_DEBOUNCE_MS) return;

  syncInProgress = true;
  lastSyncAttempt = now;

  try {
    const net = await NetInfo.fetch();
    if (!net.isConnected) {
      syncInProgress = false;
      return;
    }

    const queue: OfflineAction[] = JSON.parse(
      (await AsyncStorage.getItem(OFFLINE_QUEUE_KEY)) || "[]"
    );

    if (queue.length === 0) {
      syncInProgress = false;
      return;
    }

    console.log(`🔄 Syncing ${queue.length} offline action(s)...`);
    const successIds: string[] = [];
    const failedItems: OfflineAction[] = [];

    for (const item of queue) {
      try {
        if (item.method === "POST") await api.post(item.endpoint, item.data);
        else if (item.method === "PUT") await api.put(item.endpoint, item.data);
        else if (item.method === "DELETE")
          await api.delete(item.endpoint, { data: item.data });

        console.log("✅ Synced:", item.method, item.endpoint);
        successIds.push(item.id);
      } catch (err: any) {
        console.error(`❌ Failed to sync ${item.method} ${item.endpoint}:`, err?.message);
        const age = Date.now() - item.timestamp;
        const maxAge = 24 * 60 * 60 * 1000; // 24h
        if (age < maxAge) failedItems.push(item);
        else console.warn(`🗑️ Discarding old offline action (${Math.round(age / 1000 / 60)} mins old)`);
      }
    }

    const remaining = queue.filter(
      (q) => !successIds.includes(q.id) && failedItems.some((f) => f.id === q.id)
    );
    await AsyncStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(remaining));

    if (successIds.length > 0)
      console.log(`✅ Synced ${successIds.length} action(s), ${remaining.length} remaining`);
  } catch (err) {
    console.error("❌ Offline sync error:", err);
  } finally {
    syncInProgress = false;
  }
}

/* -------------------------------------------------------------------------- */
/* 🌐 4. Auto-Sync Listener (Strong Singleton)                               */
/* -------------------------------------------------------------------------- */
let listenerSet = false;
let unsubscribe: (() => void) | null = null;
let lastConnectionState = false;
let hasRunInitialSync = false; // ✅ new flag

export function initOfflineSyncListener() {
  if (listenerSet) return; // silent skip if already active
  listenerSet = true;
  console.log("🎧 Offline sync listener initialized");

  unsubscribe = NetInfo.addEventListener(async (state) => {
    const isConnected = state.isConnected ?? false;

    // ✅ Only trigger when going from offline → online
    if (isConnected && !lastConnectionState) {
      if (hasRunInitialSync) {
        console.log("🌐 Connection restored — syncing offline queue...");
        try {
          await syncOfflineChanges(true);
        } catch (err) {
          console.error("⚠️ Sync error:", err);
        }
      }
    }

    lastConnectionState = isConnected;
  });

  // ✅ Initial run (executed only once per app session)
  (async () => {
    const net = await NetInfo.fetch();
    if (net.isConnected && !hasRunInitialSync) {
      hasRunInitialSync = true;
      console.log("🌐 App started online — checking offline queue (one-time)");
      await syncOfflineChanges(true);
    }
    lastConnectionState = net.isConnected ?? false;
  })();
}
  // ✅ Initial run (only once)
  (async () => {
    const net = await NetInfo.fetch();
    if (net.isConnected) {
      console.log("🌐 App started online — checking offline queue (init)");
      await syncOfflineChanges(true);
    }
    lastConnectionState = net.isConnected ?? false;
  })();


/* -------------------------------------------------------------------------- */
/* 🧹 5. Cleanup + Utilities                                                 */
/* -------------------------------------------------------------------------- */
export function cleanupOfflineSyncListener() {
  if (unsubscribe) {
    unsubscribe();
    unsubscribe = null;
  }
  listenerSet = false;
  console.log("🧹 Offline sync listener cleaned up");
}

export async function clearOfflineQueue() {
  try {
    await AsyncStorage.removeItem(OFFLINE_QUEUE_KEY);
    console.log("🧹 Offline queue cleared");
  } catch (err) {
    console.error("❌ Failed to clear offline queue:", err);
  }
}

export async function getOfflineQueueStatus() {
  try {
    const queue: OfflineAction[] = JSON.parse(
      (await AsyncStorage.getItem(OFFLINE_QUEUE_KEY)) || "[]"
    );
    return {
      count: queue.length,
      oldestTimestamp:
        queue.length > 0 ? Math.min(...queue.map((q) => q.timestamp)) : null,
      items: queue,
    };
  } catch (err) {
    console.error("❌ Failed to get queue status:", err);
    return { count: 0, oldestTimestamp: null, items: [] };
  }
}
