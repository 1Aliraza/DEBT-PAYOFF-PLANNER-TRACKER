import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { Appearance } from "react-native";

const THEME_KEY = "@debtfree_theme";

export type ThemePreference = "light" | "dark" | "system";

interface ThemeContextValue {
  themePreference: ThemePreference;
  setThemePreference: (pref: ThemePreference) => Promise<void>;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themePreference, setThemePreferenceState] = useState<ThemePreference>("system");

  const applyScheme = useCallback((pref: ThemePreference) => {
    try {
      const api = Appearance as typeof Appearance & { setColorScheme?: (s: "light" | "dark" | null) => void };
      if (typeof api.setColorScheme === "function") {
        api.setColorScheme(pref === "system" ? null : pref);
      }
    } catch (_) {}
  }, []);

  useEffect(() => {
    (async () => {
      const saved = await AsyncStorage.getItem(THEME_KEY);
      if (saved === "light" || saved === "dark" || saved === "system") {
        setThemePreferenceState(saved);
        applyScheme(saved);
      }
    })();
  }, [applyScheme]);

  const setThemePreference = useCallback(async (pref: ThemePreference) => {
    setThemePreferenceState(pref);
    await AsyncStorage.setItem(THEME_KEY, pref);
    applyScheme(pref);
  }, [applyScheme]);

  const value: ThemeContextValue = { themePreference, setThemePreference };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useThemePreference() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useThemePreference must be used within ThemeProvider");
  return ctx;
}
