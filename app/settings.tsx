import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  useColorScheme,
  Alert,
  Linking,
  Share,
  Platform,
  Modal,
  ActionSheetIOS,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { useDebts } from "@/context/DebtContext";
import { useThemePreference, type ThemePreference } from "@/context/ThemeContext";

const APP_VERSION = "1.0.0";
// Replace with your App Store ID once the app is published (e.g. id1234567890)
const APP_STORE_REVIEW_URL = "https://apps.apple.com/app/id0000000000?action=write-review";
const APP_STORE_URL = "https://apps.apple.com/app/id0000000000";

export default function SettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme();
  const isDark = scheme === "dark";
  const C = isDark ? Colors.dark : Colors.light;
  const { clearAllData } = useDebts();
  const { themePreference, setThemePreference } = useThemePreference();
  const [deleting, setDeleting] = useState(false);
  const [appearanceDropdownOpen, setAppearanceDropdownOpen] = useState(false);

  const appearanceLabel = themePreference === "system" ? "System" : themePreference === "light" ? "Light" : "Dark";

  const handleThemeSelect = (pref: ThemePreference) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setThemePreference(pref);
    setAppearanceDropdownOpen(false);
  };

  const openAppearancePicker = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ["System", "Light", "Dark", "Cancel"],
          cancelButtonIndex: 3,
        },
        (buttonIndex) => {
          if (buttonIndex === 0) handleThemeSelect("system");
          else if (buttonIndex === 1) handleThemeSelect("light");
          else if (buttonIndex === 2) handleThemeSelect("dark");
        }
      );
    } else {
      setAppearanceDropdownOpen(true);
    }
  };

  const handleRateApp = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (Platform.OS === "ios") {
      Linking.openURL(APP_STORE_REVIEW_URL).catch(() => Linking.openURL(APP_STORE_URL));
    } else if (Platform.OS === "android") {
      Linking.openURL("market://details?id=com.debtfree.payoffplanner").catch(() => {});
    }
  };

  const handleShare = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await Share.share({
        title: "DebtFree – Payoff Planner",
        message: "Track your debts and get debt-free with DebtFree. Free payoff planner with Snowball & Avalanche methods.",
        url: APP_STORE_URL,
      });
    } catch (_) {}
  };

  const handleDeleteAllData = () => {
    Alert.alert(
      "Delete All Data",
      "This will permanently remove all your debts, payment history, and preferences. You cannot undo this.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete All",
          style: "destructive",
          onPress: async () => {
            setDeleting(true);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            await clearAllData();
            setDeleting(false);
            router.replace("/onboarding");
          },
        },
      ]
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: C.background }]}>
      <View style={[styles.header, { borderBottomColor: C.border, paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={C.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: C.text }]}>Settings</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.section, { backgroundColor: C.surface, borderColor: C.border }]}>
          <Pressable
            onPress={openAppearancePicker}
            style={[styles.row, styles.rowLast]}
          >
            <View style={[styles.rowIcon, { backgroundColor: C.textSecondary + "20" }]}>
              <Ionicons name="phone-portrait-outline" size={20} color={C.textSecondary} />
            </View>
            <Text style={[styles.rowLabel, { color: C.text }]}>Appearance</Text>
            <Text style={[styles.rowValue, { color: C.textSecondary }]}>{appearanceLabel}</Text>
            <Ionicons name="chevron-down" size={18} color={C.textSecondary} />
          </Pressable>
        </View>

        {Platform.OS !== "ios" && (
          <Modal
            visible={appearanceDropdownOpen}
            transparent
            animationType="fade"
            onRequestClose={() => setAppearanceDropdownOpen(false)}
          >
            <Pressable
              style={styles.dropdownBackdrop}
              onPress={() => setAppearanceDropdownOpen(false)}
            >
              <View style={[styles.dropdownBox, { backgroundColor: C.surface }]}>
                <Text style={[styles.dropdownTitle, { color: C.textSecondary }]}>Appearance</Text>
                {(["system", "light", "dark"] as const).map((pref) => (
                  <Pressable
                    key={pref}
                    onPress={() => handleThemeSelect(pref)}
                    style={[
                      styles.dropdownOption,
                      { borderBottomColor: C.border },
                      pref === "dark" && styles.dropdownOptionLast,
                    ]}
                  >
                    <Text style={[styles.dropdownOptionLabel, { color: C.text }]}>
                      {pref === "system" ? "System" : pref === "light" ? "Light" : "Dark"}
                    </Text>
                    {themePreference === pref && (
                      <Ionicons name="checkmark-circle" size={22} color={Colors.primary} />
                    )}
                  </Pressable>
                ))}
              </View>
            </Pressable>
          </Modal>
        )}

        <View style={[styles.section, { backgroundColor: C.surface, borderColor: C.border }]}>
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push("/privacy");
            }}
            style={[styles.row, { borderBottomColor: C.border }]}
          >
            <View style={[styles.rowIcon, { backgroundColor: Colors.primary + "18" }]}>
              <Ionicons name="shield-checkmark-outline" size={20} color={Colors.primary} />
            </View>
            <Text style={[styles.rowLabel, { color: C.text }]}>Privacy Policy</Text>
            <Ionicons name="chevron-forward" size={18} color={C.textSecondary} />
          </Pressable>

          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push("/terms");
            }}
            style={[styles.row, { borderBottomColor: C.border }]}
          >
            <View style={[styles.rowIcon, { backgroundColor: Colors.primary + "18" }]}>
              <Ionicons name="document-text-outline" size={20} color={Colors.primary} />
            </View>
            <Text style={[styles.rowLabel, { color: C.text }]}>Terms of Service</Text>
            <Ionicons name="chevron-forward" size={18} color={C.textSecondary} />
          </Pressable>

          <View style={[styles.row, styles.rowLast]}>
            <View style={[styles.rowIcon, { backgroundColor: C.textSecondary + "25" }]}>
              <Ionicons name="information-circle-outline" size={20} color={C.textSecondary} />
            </View>
            <Text style={[styles.rowLabel, { color: C.text }]}>Version</Text>
            <Text style={[styles.rowValue, { color: C.textSecondary }]}>{APP_VERSION}</Text>
          </View>
        </View>

        <View style={[styles.section, { backgroundColor: C.surface, borderColor: C.border }]}>
          <Pressable
            onPress={handleRateApp}
            style={[styles.row, { borderBottomColor: C.border }]}
          >
            <View style={[styles.rowIcon, { backgroundColor: Colors.warning + "22" }]}>
              <Ionicons name="star-outline" size={20} color={Colors.warning} />
            </View>
            <Text style={[styles.rowLabel, { color: C.text }]}>Rate the App</Text>
            <Ionicons name="chevron-forward" size={18} color={C.textSecondary} />
          </Pressable>

          <Pressable
            onPress={handleShare}
            style={[styles.row, styles.rowLast]}
          >
            <View style={[styles.rowIcon, { backgroundColor: Colors.accent + "22" }]}>
              <Ionicons name="share-outline" size={20} color={Colors.accent} />
            </View>
            <Text style={[styles.rowLabel, { color: C.text }]}>Share the App</Text>
            <Ionicons name="chevron-forward" size={18} color={C.textSecondary} />
          </Pressable>
        </View>

        <View style={[styles.section, { backgroundColor: C.surface, borderColor: C.border }]}>
          <Pressable
            onPress={handleDeleteAllData}
            disabled={deleting}
            style={[styles.row, styles.rowLast]}
          >
            <View style={[styles.rowIcon, { backgroundColor: Colors.danger + "18" }]}>
              <Ionicons name="trash-outline" size={20} color={Colors.danger} />
            </View>
            <Text style={[styles.rowLabel, { color: Colors.danger }]}>
              {deleting ? "Deleting…" : "Delete All My Data"}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 17, fontWeight: "600" },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, gap: 16 },
  section: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 8,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowLast: { borderBottomWidth: 0 },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  rowLabel: { flex: 1, fontSize: 16, fontWeight: "500" },
  rowValue: { fontSize: 15 },
  dropdownBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  dropdownBox: {
    width: "100%",
    maxWidth: 320,
    borderRadius: 16,
    overflow: "hidden",
  },
  dropdownTitle: {
    fontSize: 13,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 8,
  },
  dropdownOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  dropdownOptionLast: { borderBottomWidth: 0 },
  dropdownOptionLabel: { fontSize: 16, fontWeight: "500" },
});
