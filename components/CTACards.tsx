import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  useColorScheme,
} from "react-native";
import * as Linking from "expo-linking";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Colors from "@/constants/colors";
import { useDebts } from "@/context/DebtContext";
import { formatCurrency, approximateDebtRange } from "@/lib/calculations";
import { LeadForm } from "./LeadForm";

interface CTACardData {
  id: string;
  title: string;
  body: string;
  ctaLabel: string;
  icon: keyof typeof Ionicons.glyphMap;
  triggerType: string;
  debtType?: string;
  amount?: number;
  gradient: [string, string];
  url?: string;
}

export function CTACards() {
  const scheme = useColorScheme();
  const isDark = scheme === "dark";
  const C = isDark ? Colors.dark : Colors.light;
  const {
    totalUnsecuredBalance,
    hasTaxDebt,
    hasHighAprDebt,
    creditCardCount,
    hasMissedPayment,
    debts,
    leadSubmittedAt,
    totalMinimums,
    avalancheResult,
  } = useDebts();

  const [leadFormVisible, setLeadFormVisible] = useState(false);
  const [activeCTA, setActiveCTA] = useState<CTACardData | null>(null);
  const [dismissed, setDismissed] = useState<string[]>([]);

  const isLeadRecent = () => {
    if (!leadSubmittedAt) return false;
    const submitted = new Date(leadSubmittedAt).getTime();
    const thirtyDays = 30 * 24 * 60 * 60 * 1000;
    return Date.now() - submitted < thirtyDays;
  };

  if (isLeadRecent()) return null;

  const cards: CTACardData[] = [];

  if (totalUnsecuredBalance > 10000) {
    const savings = approximateDebtRange(totalUnsecuredBalance);
    const programMonths = "24–48 months";
    const currentPayoff = avalancheResult.totalMonths;
    cards.push({
      id: "settlement",
      title: "Free Debt Relief Consultation",
      body: `Based on your ${formatCurrency(
        totalUnsecuredBalance
      )} in unsecured debt, you may qualify for programs that can reduce payments and help you become debt‑free faster.`,
      ctaLabel: "Get Free Debt Consultation",
      icon: "shield-checkmark",
      triggerType: "settlement",
      debtType: "Unsecured Debt",
      amount: totalUnsecuredBalance,
      gradient: [Colors.primary + "CC", Colors.accent + "CC"],
      url: "https://www.curadebt.com/debtpps",
    });
  }

  if (hasTaxDebt) {
    const taxDebt = debts.find((d) => d.debtType === "taxDebt");
    cards.push({
      id: "tax",
      title: "Tax Debt Relief Options",
      body: `Tax debt over $10K may qualify for IRS programs like Offer in Compromise. A free confidential consultation can evaluate your options.`,
      ctaLabel: "Get Free Tax Consultation",
      icon: "document-text",
      triggerType: "tax",
      debtType: "Tax Debt",
      amount: taxDebt?.balance,
      gradient: ["#E67E22CC", "#F39C12CC"],
      url: "https://www.curadebt.com/taxpps",
    });
  }

  const businessDebts = debts.filter((d) => d.debtType === "businessDebt");
  const totalBusinessBalance = businessDebts.reduce(
    (sum, d) => sum + d.balance,
    0
  );

  if (totalBusinessBalance > 10000) {
    cards.push({
      id: "business",
      title: "Business Debt Relief",
      body: `You have business debt that may qualify for tailored programs to reduce payments and improve cash flow.`,
      ctaLabel: "See Business Debt Options",
      icon: "briefcase",
      triggerType: "business",
      debtType: "Business Debt",
      amount: totalBusinessBalance,
      // Use brand colors for better contrast in dark mode
      gradient: [Colors.accent + "CC", Colors.primary + "CC"],
      url: "https://www.curadebt.com/biz",
    });
  }

  if (hasHighAprDebt) {
    const highDebt = debts.find((d) => d.apr > 10);
    cards.push({
      id: "highApr",
      title: "High Interest Rate?",
      body: `You have debt at about ${highDebt?.apr}% APR. See if you qualify for a lower‑rate consolidation loan and become debt‑free faster.`,
      ctaLabel: "Check Consolidation Options",
      icon: "trending-down",
      triggerType: "highApr",
      debtType: "High Interest Debt",
      amount: totalUnsecuredBalance,
      gradient: ["#9B59B6CC", "#8E44ADCC"],
      url: "https://www.curadebt.com/debtpps",
    });
  }

  if (creditCardCount >= 3) {
    cards.push({
      id: "multipleCards",
      title: "Simplify Your Payments",
      body: `You have ${creditCardCount} credit card debts with ${formatCurrency(totalMinimums)}/mo in minimums. See consolidation options that could lower your rate and payment.`,
      ctaLabel: "Explore Consolidation",
      icon: "layers",
      triggerType: "multipleCards",
      debtType: "Credit Card",
      amount: totalUnsecuredBalance,
      gradient: ["#3498DBCC", "#2980B9CC"],
    });
  }

  if (hasMissedPayment) {
    cards.push({
      id: "missed",
      title: "Falling Behind?",
      body: `There are options. A certified debt specialist can review programs that may stop collection calls and reduce what you owe — free and confidential.`,
      ctaLabel: "Talk to an Expert",
      icon: "alert-circle",
      triggerType: "missed",
      debtType: "Delinquent Debt",
      amount: totalUnsecuredBalance,
      gradient: [Colors.danger + "CC", "#C0392BCC"],
    });
  }

  const visible = cards.filter((c) => !dismissed.includes(c.id));
  if (visible.length === 0) return null;

  const openLead = (card: CTACardData) => {
    if (card.url) {
      Linking.openURL(card.url).catch(() => {
        // Ignore linking errors for now
      });
      return;
    }
    setActiveCTA(card);
    setLeadFormVisible(true);
  };

  return (
    <>
      <View style={styles.container}>
        <Text style={[styles.sectionTitle, { color: C.text }]}>
          Personalized Options
        </Text>
        {visible.map((card) => (
          <CTACard
            key={card.id}
            card={card}
            isDark={isDark}
            C={C}
            onPress={() => openLead(card)}
            onDismiss={() => setDismissed((d) => [...d, card.id])}
          />
        ))}
      </View>

      <LeadForm
        visible={leadFormVisible}
        onClose={() => setLeadFormVisible(false)}
        triggerType={activeCTA?.triggerType}
        prefilledDebtType={activeCTA?.debtType}
        prefilledAmount={activeCTA?.amount}
      />
    </>
  );
}

function CTACard({
  card,
  isDark,
  C,
  onPress,
  onDismiss,
}: {
  card: CTACardData;
  isDark: boolean;
  C: typeof Colors.light;
  onPress: () => void;
  onDismiss: () => void;
}) {
  return (
    <View style={[styles.card, { backgroundColor: C.surface, borderColor: C.border, shadowColor: C.cardShadow }]}>
      <Pressable onPress={onDismiss} style={styles.dismissBtn} hitSlop={12}>
        <Ionicons name="close" size={16} color={C.textSecondary} />
      </Pressable>

      <LinearGradient
        colors={card.gradient as [string, string]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.cardIcon}
      >
        <Ionicons name={card.icon} size={22} color="#fff" />
      </LinearGradient>

      <Text style={[styles.cardTitle, { color: C.text }]}>{card.title}</Text>
      <Text style={[styles.cardBody, { color: C.textSecondary }]}>{card.body}</Text>

      <Pressable
        onPress={onPress}
        style={({ pressed }) => [styles.ctaBtn, { opacity: pressed ? 0.85 : 1 }]}
      >
        <LinearGradient
          colors={card.gradient as [string, string]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.ctaBtnGradient}
        >
          <Text style={styles.ctaBtnText}>{card.ctaLabel}</Text>
          <Ionicons name="arrow-forward" size={16} color="#fff" />
        </LinearGradient>
      </Pressable>

      <Text style={[styles.disclaimer, { color: C.textSecondary }]}>
        Free consultation. No obligation. Results vary.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
    paddingTop: 4,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    paddingHorizontal: 2,
  },
  card: {
    borderRadius: 16,
    padding: 18,
    gap: 10,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.14,
    shadowRadius: 10,
    elevation: 4,
    position: "relative",
  },
  dismissBtn: {
    position: "absolute",
    top: 14,
    right: 14,
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
  },
  cardIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: "700",
    paddingRight: 24,
  },
  cardBody: {
    fontSize: 14,
    lineHeight: 20,
  },
  ctaBtn: {
    borderRadius: 10,
    overflow: "hidden",
    marginTop: 2,
  },
  ctaBtnGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 13,
    gap: 6,
  },
  ctaBtnText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
  disclaimer: {
    fontSize: 11,
    textAlign: "center",
  },
});
