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

export default function TermsScreen() {
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
        <Text style={[styles.headerTitle, { color: C.text }]}>Terms of Service</Text>
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
          Welcome to DebtFree – Payoff Planner & Tracker. By using this app, you agree to these Terms of Service.
        </Text>

        <Text style={[styles.heading, { color: C.text }]}>Use of the App</Text>
        <Text style={[styles.paragraph, { color: C.text }]}>
          The app is provided for personal use to help you track debts and explore payoff strategies. You may not use it for any illegal purpose or in a way that could harm the app or others.
        </Text>

        <Text style={[styles.heading, { color: C.text }]}>Not Financial Advice</Text>
        <Text style={[styles.paragraph, { color: C.text }]}>
          The app provides tools and information only. It does not constitute financial, tax, or legal advice. Consult a qualified professional for decisions about your debt or finances.
        </Text>

        <Text style={[styles.heading, { color: C.text }]}>Consultation Services</Text>
        <Text style={[styles.paragraph, { color: C.text }]}>
          If you request a free consultation through the app, your information may be shared with the service provider. Separate terms and agreements may apply to those services.
        </Text>

        <Text style={[styles.heading, { color: C.text }]}>Changes</Text>
        <Text style={[styles.paragraph, { color: C.text }]}>
          We may update these terms from time to time. Continued use of the app after changes means you accept the updated terms.
        </Text>

        <Text style={[styles.paragraph, { color: C.textSecondary, marginTop: 24 }]}>
          If you have questions about these terms, please contact us through the information provided in the app or on our website.
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
