/**
 * Secure storage for sensitive financial data (MVP: iOS Keychain via expo-secure-store).
 * Falls back to AsyncStorage on web where SecureStore is not available.
 */
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

const USE_SECURE = Platform.OS === "ios" || Platform.OS === "android";

async function getSecureStore(): Promise<{
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  deleteItem: (key: string) => Promise<void>;
} | null> {
  if (!USE_SECURE) return null;
  try {
    const SecureStore = await import("expo-secure-store");
    return {
      getItem: SecureStore.getItemAsync.bind(SecureStore),
      setItem: SecureStore.setItemAsync.bind(SecureStore),
      deleteItem: SecureStore.deleteItemAsync.bind(SecureStore),
    };
  } catch {
    return null;
  }
}

let secureStore: Awaited<ReturnType<typeof getSecureStore>> | undefined;

async function store() {
  if (secureStore === undefined) secureStore = await getSecureStore();
  return secureStore;
}

export async function secureGetItem(key: string): Promise<string | null> {
  const s = await store();
  if (s) {
    try {
      return await s.getItem(key);
    } catch {
      return await AsyncStorage.getItem(key);
    }
  }
  return AsyncStorage.getItem(key);
}

export async function secureSetItem(key: string, value: string): Promise<void> {
  const s = await store();
  if (s) {
    try {
      await s.setItem(key, value);
      return;
    } catch {
      await AsyncStorage.setItem(key, value);
      return;
    }
  }
  await AsyncStorage.setItem(key, value);
}

export async function secureRemoveItem(key: string): Promise<void> {
  const s = await store();
  if (s) {
    try {
      await s.deleteItem(key);
    } catch {}
  }
  await AsyncStorage.removeItem(key);
}
