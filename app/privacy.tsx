import { useRouter } from "expo-router";
import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  useColorScheme,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/colors";

export default function PrivacyScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme();
  const isDark = scheme === "dark";
  const C = isDark ? Colors.dark : Colors.light;

  return (
    <View style={[styles.container, { backgroundColor: C.surface }]}>
      <View style={[styles.header, { borderBottomColor: C.border, paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={C.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: C.text }]}>Privacy Policy</Text>
        <View style={{ width: 44 }} />
      </View>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.updated, { color: C.textSecondary }]}>
          Last updated: March 2026
        </Text>

        <Text style={[styles.paragraph, { color: C.text }]}>
          DebtFree – Payoff Planner & Tracker ("we", "our", or "the app") is committed to protecting your privacy. This policy describes how we collect, use, and safeguard your information.
        </Text>

        <Text style={[styles.heading, { color: C.text }]}>Information We Collect</Text>
        <Text style={[styles.paragraph, { color: C.text }]}>
          <Text style={styles.bold}>Data stored on your device:</Text> Debt names, balances, interest rates, payment history, and strategy preferences are stored locally on your device using encrypted storage (iOS Keychain / secure storage). This financial data does not leave your device unless you choose to submit a lead form.
        </Text>
        <Text style={[styles.paragraph, { color: C.text }]}>
          <Text style={styles.bold}>Lead form submissions:</Text> If you request a free consultation, we collect first name, last name, email, phone number, state of residence, best time to call, debt type, and approximate amount. This information is used only to contact you about the consultation you requested and is transmitted over HTTPS to our secure backend.
        </Text>

        <Text style={[styles.heading, { color: C.text }]}>How We Use Your Information</Text>
        <Text style={[styles.paragraph, { color: C.text }]}>
          Device-stored data is used solely to provide payoff calculations, strategies, and progress tracking within the app. Lead form data is used to schedule and deliver the free consultation and related services you requested. We do not sell your personal information.
        </Text>

        <Text style={[styles.heading, { color: C.text }]}>Contact Consent</Text>
        <Text style={[styles.paragraph, { color: C.text }]}>
          By submitting a lead form, you consent to be contacted by phone (which may include autodialed or prerecorded calls), text message, and email regarding debt relief options. Message and data rates may apply. You may opt out at any time by telling us when we contact you.
        </Text>

        <Text style={[styles.heading, { color: C.text }]}>Data Security</Text>
        <Text style={[styles.paragraph, { color: C.text }]}>
          Sensitive financial data on your device is stored using platform secure storage (e.g., iOS Keychain). Lead form submissions are sent over HTTPS. We retain lead data only as long as needed to fulfill your request and comply with law.
        </Text>

        <Text style={[styles.heading, { color: C.text }]}>Your Rights</Text>
        <Text style={[styles.paragraph, { color: C.text }]}>
          You may request deletion of your lead submission data by contacting us. Data stored only on your device can be removed by uninstalling the app or using any in-app data deletion option we provide.
        </Text>

        <Text style={[styles.heading, { color: C.text }]}>Children</Text>
        <Text style={[styles.paragraph, { color: C.text }]}>
          The app is not directed at children under 13. We do not knowingly collect information from children.
        </Text>

        <Text style={[styles.heading, { color: C.text }]}>Changes</Text>
        <Text style={[styles.paragraph, { color: C.text }]}>
          We may update this privacy policy from time to time. The "Last updated" date at the top will reflect the latest version. Continued use of the app after changes constitutes acceptance of the updated policy.
        </Text>

        <Text style={[styles.paragraph, { color: C.textSecondary, marginTop: 24 }]}>
          If you have questions about this privacy policy, please contact us through the contact information provided in the app or on our website.
        </Text>
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
  scrollContent: { padding: 20, paddingTop: 16 },
  updated: { fontSize: 13, marginBottom: 16 },
  heading: { fontSize: 16, fontWeight: "700", marginTop: 20, marginBottom: 8 },
  paragraph: { fontSize: 15, lineHeight: 22, marginBottom: 12 },
  bold: { fontWeight: "600" },
});
