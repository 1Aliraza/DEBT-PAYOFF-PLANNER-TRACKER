import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  Modal,
  useColorScheme,
  Platform,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
} from "react-native-reanimated";
import { GestureDetector, Gesture } from "react-native-gesture-handler";
import Colors from "@/constants/colors";
import { useDebts } from "@/context/DebtContext";
import {
  Debt,
  DebtType,
  debtTypeLabel,
  debtTypeIcon,
  formatCurrency,
  estimatePayoffDate,
  monthsToText,
} from "@/lib/calculations";
import { DebtForm } from "@/components/DebtForm";
import { ProgressRing } from "@/components/ProgressRing";

const DEBT_TYPE_COLORS: Record<DebtType, string> = {
  creditCard: "#3498DB",
  personalLoan: "#9B59B6",
  studentLoan: "#E67E22",
  medical: "#E74C3C",
  auto: "#1ABC9C",
  taxDebt: "#F39C12",
  businessDebt: "#34495E",
  other: "#95A5A6",
};

const DEBT_TYPE_COLORS_DARK: Partial<Record<DebtType, string>> = {
  // Lighten this type for readability on dark backgrounds
  businessDebt: "#A9B6C2",
};

function getDebtTypeColor(type: DebtType, isDark: boolean): string {
  return (
    (isDark ? DEBT_TYPE_COLORS_DARK[type] : undefined) ??
    DEBT_TYPE_COLORS[type] ??
    Colors.primary
  );
}

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

function TotalDebtCard({
  totalBalance,
  principalPaid,
  debtFreeDate,
  formatCurrency,
}: {
  totalBalance: number;
  principalPaid: number;
  debtFreeDate: Date | null;
  formatCurrency: (n: number) => string;
}) {
  const [ringProgress, setRingProgress] = useState(0);
  const totalOriginal = totalBalance + principalPaid;
  const pctPaid = totalOriginal > 0 ? (principalPaid / totalOriginal) * 100 : 0;

  useEffect(() => {
    const t = setTimeout(() => setRingProgress(pctPaid / 100), 100);
    return () => clearTimeout(t);
  }, [pctPaid]);

  const debtFreeStr = debtFreeDate
    ? `${MONTH_NAMES[debtFreeDate.getMonth()]} ${debtFreeDate.getFullYear()}`
    : "—";

  return (
    <View style={styles.totalCardOuter}>
      <LinearGradient
        colors={["#1e7a4c", "#166b3f", "#0d5c32"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.totalCard}
      >
        <View style={styles.totalGlowOrb1} />
        <View style={styles.totalGlowOrb2} />
        <View style={styles.totalTopRow}>
          <View style={styles.totalLeft}>
            <Text style={styles.totalLabel}>Principal Paid</Text>
            <Text style={styles.totalAmount} numberOfLines={1} adjustsFontSizeToFit>
              {formatCurrency(principalPaid)}
            </Text>
            <Text style={styles.totalDebtFree}>Debt-Free {debtFreeStr}</Text>
          </View>
          <View style={styles.totalCircleWrap}>
            <ProgressRing
              size={112}
              strokeWidth={6}
              progress={ringProgress}
              color={Colors.progressGreen}
              trackColor="rgba(255,255,255,0.08)"
            />
            <View style={styles.totalCircleInner}>
              <Text
                style={styles.totalCirclePct}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.5}
              >
                {pctPaid >= 99.95 ? "100%" : pctPaid.toFixed(1) + "%"}
              </Text>
              <Text style={styles.totalCirclePctLabel}>PAID</Text>
            </View>
          </View>
        </View>
        <View style={styles.totalSeparator} />
        <View style={styles.totalBottomRow}>
          <View style={styles.totalWalletIcon}>
            <Ionicons name="wallet" size={20} color="#fff" />
          </View>
          <View style={styles.totalBottomText}>
            <Text style={styles.totalLabel}>Total Balance</Text>
            <Text style={styles.totalAmount} numberOfLines={1} adjustsFontSizeToFit>
              {formatCurrency(totalBalance)}
            </Text>
          </View>
        </View>
      </LinearGradient>
    </View>
  );
}

function DebtCardItem({
  debt,
  onDelete,
  C,
  isDark,
}: {
  debt: Debt;
  onDelete: () => void;
  C: typeof Colors.light;
  isDark: boolean;
}) {
  const translateX = useSharedValue(0);
  const deleteWidth = 80;
  const typeColor = getDebtTypeColor(debt.debtType, isDark);

  const pan = Gesture.Pan()
    .activeOffsetX([-10, 10])
    .onChange((e) => {
      translateX.value = Math.min(0, Math.max(-deleteWidth, e.translationX));
    })
    .onEnd(() => {
      if (translateX.value < -deleteWidth / 2) {
        translateX.value = withTiming(-deleteWidth);
      } else {
        translateX.value = withTiming(0);
      }
    });

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const handleDelete = () => {
    translateX.value = withTiming(0);
    runOnJS(onDelete)();
  };

  const payoffDate = estimatePayoffDate(debt);
  const monthsLeft = Math.max(
    0,
    (payoffDate.getFullYear() - new Date().getFullYear()) * 12 +
      payoffDate.getMonth() -
      new Date().getMonth()
  );

  return (
    <View style={styles.swipeContainer}>
      <View style={[styles.deleteBg, { backgroundColor: Colors.danger }]}>
        <Pressable onPress={handleDelete} style={styles.deleteAction}>
          <Ionicons name="trash" size={22} color="#fff" />
        </Pressable>
      </View>

      <GestureDetector gesture={pan}>
        <Animated.View style={animStyle}>
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push(`/debt/${debt.id}`);
            }}
            style={({ pressed }) => [
              styles.debtCard,
              {
                backgroundColor: C.surface,
                borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
                shadowColor: isDark ? "#000" : typeColor,
                opacity: pressed ? 0.95 : 1,
              },
            ]}
          >
            <View style={styles.debtCardTop}>
              <View
                style={[
                  styles.debtTypeIcon,
                  { backgroundColor: typeColor + "18" },
                ]}
              >
                <Ionicons
                  name={debtTypeIcon(debt.debtType) as any}
                  size={20}
                  color={typeColor}
                />
              </View>
              <View style={styles.debtCardInfo}>
                <Text style={[styles.debtName, { color: C.text }]} numberOfLines={1}>
                  {debt.name}
                </Text>
                <Text style={[styles.debtTypeBadge, { color: typeColor + "CC" }]}>
                  {debtTypeLabel(debt.debtType)}
                  {debt.isSecured ? " • Secured" : ""}
                </Text>
              </View>
              <View style={styles.debtBalanceWrap}>
                <Text style={[styles.debtBalance, { color: C.text }]}>
                  {formatCurrency(debt.balance)}
                </Text>
                <Text style={[styles.debtApr, { color: Colors.danger }]}>
                  {debt.apr}% APR
                </Text>
              </View>
            </View>

            <View style={styles.debtCardDividerRow}>
              <View style={[styles.debtCardDivider, { backgroundColor: C.border }]} />
              <View style={styles.debtCardChevronWrap}>
                <Ionicons name="chevron-forward" size={14} color={C.textSecondary} />
              </View>
            </View>

            <View style={styles.debtCardBottom}>
              <View style={styles.debtStat}>
                <Text style={[styles.debtStatLabel, { color: C.textSecondary }]}>
                  Min. Payment
                </Text>
                <Text style={[styles.debtStatValue, { color: C.text }]}>
                  {formatCurrency(debt.minimumPayment)}/mo
                </Text>
              </View>
              <View style={styles.debtStat}>
                <Text style={[styles.debtStatLabel, { color: C.textSecondary }]}>
                  Due Day
                </Text>
                <Text style={[styles.debtStatValue, { color: C.text }]}>
                  {ordinal(debt.dueDate)}
                </Text>
              </View>
              <View style={[styles.debtStat, { alignItems: "flex-end" }]}>
                <Text style={[styles.debtStatLabel, { color: C.textSecondary }]}>
                  Payoff Est.
                </Text>
                <Text style={[styles.debtStatValue, { color: typeColor }]}>
                  {monthsToText(monthsLeft)}
                </Text>
              </View>
            </View>
          </Pressable>
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

export default function DebtsScreen() {
  const scheme = useColorScheme();
  const isDark = scheme === "dark";
  const C = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const { debts, totalBalance, totalMinimums, payments, avalancheResult, addDebt, deleteDebt } =
    useDebts();
  const principalPaid = payments.reduce((s, p) => s + (p.isMissed ? 0 : p.amount), 0);

  const [formVisible, setFormVisible] = useState(false);

  const openAdd = () => {
    setFormVisible(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const handleDelete = (debt: Debt) => {
    Alert.alert(
      "Delete Debt",
      `Remove "${debt.name}" from your list?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            deleteDebt(debt.id);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          },
        },
      ]
    );
  };

  const handleSave = async (data: Omit<Debt, "id" | "dateAdded">) => {
    await addDebt(data);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setFormVisible(false);
  };

  const webTopPad = Platform.OS === "web" ? 67 : 0;

  return (
    <View style={[styles.container, { backgroundColor: C.background }]}>
      <View
        style={[
          styles.header,
          {
            paddingTop: Platform.OS === "web" ? webTopPad : insets.top + 8,
            backgroundColor: C.background,
            borderBottomColor: C.border,
          },
        ]}
      >
        <View>
          <Text style={[styles.headerTitle, { color: C.text }]}>DebtFree</Text>
          {debts.length > 0 && (
            <Text style={[styles.headerSub, { color: C.textSecondary }]}>
              {debts.length} {debts.length === 1 ? "account" : "accounts"} •{" "}
              {formatCurrency(totalMinimums)}/mo minimums
            </Text>
          )}
        </View>
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push("/settings");
          }}
          style={styles.headerIconBtn}
          hitSlop={12}
        >
          <Ionicons name="settings-outline" size={24} color={C.text} />
        </Pressable>
      </View>

      {debts.length > 0 && (
        <TotalDebtCard
          totalBalance={totalBalance}
          principalPaid={principalPaid}
          debtFreeDate={avalancheResult.payoffDate}
          formatCurrency={formatCurrency}
        />
      )}

      <FlatList
        data={[...debts].reverse()}
        keyExtractor={(d) => d.id}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={[
          styles.listContent,
          debts.length === 0 && styles.emptyListContent,
          Platform.OS === "web" && { paddingBottom: 34 },
          debts.length > 0 && { paddingBottom: Math.max(insets.bottom, 16) + 88 },
        ]}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <DebtCardItem
            debt={item}
            onDelete={() => handleDelete(item)}
            C={C}
            isDark={isDark}
          />
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <View style={[styles.emptyIcon, { backgroundColor: Colors.primary + "15" }]}>
              <Ionicons name="card-outline" size={48} color={Colors.primary} />
            </View>
            <Text style={[styles.emptyTitle, { color: C.text }]}>
              Add Your First Debt
            </Text>
            <Text style={[styles.emptyBody, { color: C.textSecondary }]}>
              Track all your debts in one place and watch your path to financial freedom.
            </Text>
            <Pressable onPress={openAdd}>
              <LinearGradient
                colors={[Colors.primary, Colors.primaryDark]}
                style={styles.emptyBtn}
              >
                <Ionicons name="add" size={18} color="#fff" />
                <Text style={styles.emptyBtnText}>Add Debt</Text>
              </LinearGradient>
            </Pressable>
          </View>
        }
      />

      <Pressable
        onPress={openAdd}
        style={[
          styles.fab,
          {
            right: 20,
            bottom: Math.max(insets.bottom, 16) + 72,
            backgroundColor: C.surface,
            shadowColor: isDark ? "#000" : Colors.primary,
          },
        ]}
        hitSlop={8}
      >
        <LinearGradient
          colors={[Colors.primary, Colors.primaryDark]}
          style={styles.fabGradient}
        >
          <Ionicons name="add" size={28} color="#fff" />
        </LinearGradient>
      </Pressable>

      <Modal
        visible={formVisible}
        animationType="slide"
        presentationStyle="formSheet"
        onRequestClose={() => setFormVisible(false)}
      >
        <DebtForm
          initial={undefined}
          onSave={handleSave}
          onCancel={() => setFormVisible(false)}
        />
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "700",
    letterSpacing: -0.5,
  },
  headerSub: {
    fontSize: 14,
    marginTop: 2,
  },
  headerIconBtn: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  fab: {
    position: "absolute",
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 8,
  },
  fabGradient: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  totalCardOuter: {
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 4,
    borderRadius: 28,
    overflow: "hidden",
    shadowColor: "#0d5c32",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 16,
    elevation: 12,
  },
  totalCard: {
    borderRadius: 28,
    paddingVertical: 16,
    paddingHorizontal: 24,
    overflow: "hidden",
  },
  totalTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  totalLeft: {
    flex: 1,
  },
  totalLabel: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 12,
    fontWeight: "500",
  },
  totalAmount: {
    color: "#fff",
    fontSize: 26,
    fontWeight: "800",
    marginTop: 2,
    letterSpacing: -0.5,
    textShadowColor: "rgba(0,0,0,0.2)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  totalDebtFree: {
    color: Colors.progressGreen,
    fontSize: 14,
    fontWeight: "600",
    marginTop: 4,
  },
  totalSeparator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(255,255,255,0.25)",
    marginVertical: 12,
  },
  totalBottomRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  totalWalletIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  totalBottomText: {
    flex: 1,
  },
  totalGlowOrb1: {
    position: "absolute",
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: "rgba(255,255,255,0.12)",
    top: -60,
    left: -40,
  },
  totalGlowOrb2: {
    position: "absolute",
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "rgba(255,255,255,0.08)",
    bottom: -30,
    right: -20,
  },
  totalCircleWrap: {
    position: "relative",
    width: 112,
    height: 112,
    alignItems: "center",
    justifyContent: "center",
  },
  totalCircleInner: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
    maxWidth: "85%",
  },
  totalCirclePct: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "800",
    letterSpacing: -0.5,
    textShadowColor: "rgba(0,0,0,0.2)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  totalCirclePctLabel: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 11,
    fontWeight: "600",
    marginTop: 2,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  emptyListContent: {
    flexGrow: 1,
    justifyContent: "center",
  },
  swipeContainer: {
    position: "relative",
    overflow: "hidden",
    borderRadius: 16,
  },
  deleteBg: {
    position: "absolute",
    right: 0,
    top: 0,
    bottom: 0,
    width: 80,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  deleteAction: {
    width: 80,
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  debtCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.14,
    shadowRadius: 12,
    elevation: 5,
  },
  debtCardTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  debtTypeIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  debtCardInfo: { flex: 1 },
  debtName: {
    fontSize: 16,
    fontWeight: "600",
  },
  debtTypeBadge: {
    fontSize: 13,
    marginTop: 2,
  },
  debtBalanceWrap: { alignItems: "flex-end" },
  debtBalance: {
    fontSize: 18,
    fontWeight: "700",
  },
  debtApr: {
    fontSize: 12,
    fontWeight: "600",
    marginTop: 2,
  },
  debtCardDivider: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
  },
  debtCardDividerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 12,
  },
  debtCardChevronWrap: {
    paddingLeft: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  debtCardBottom: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  debtStat: {
    gap: 2,
  },
  debtStatLabel: {
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  debtStatValue: {
    fontSize: 14,
    fontWeight: "600",
  },
  empty: {
    alignItems: "center",
    gap: 14,
    paddingHorizontal: 32,
  },
  emptyIcon: {
    width: 96,
    height: 96,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: "700",
  },
  emptyBody: {
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
  },
  emptyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 8,
  },
  emptyBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
});
