import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  SectionList,
  Pressable,
  useColorScheme,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { useDebts } from "@/context/DebtContext";
import {
  formatCurrency,
  formatCurrencyFull,
  monthsToText,
  MonthlySnapshot,
  Debt,
} from "@/lib/calculations";

const MONTH_NAMES = [
  "Jan","Feb","Mar","Apr","May","Jun",
  "Jul","Aug","Sep","Oct","Nov","Dec",
];

function formatMonth(date: Date): string {
  return `${MONTH_NAMES[date.getMonth()]} ${date.getFullYear()}`;
}

function AmortizationRow({
  snapshot,
  debts,
  expanded,
  onToggle,
  C,
  isDark,
}: {
  snapshot: MonthlySnapshot;
  debts: Debt[];
  expanded: boolean;
  onToggle: () => void;
  C: typeof Colors.light;
  isDark: boolean;
}) {
  const isFirst = snapshot.month === 1;
  const hasPaidOff = snapshot.paidOffDebts.length > 0;

  return (
    <View>
      <Pressable
        onPress={onToggle}
        style={[
          styles.monthRow,
          {
            backgroundColor: hasPaidOff
              ? Colors.progressGreen + "15"
              : C.surface,
            borderColor: hasPaidOff ? Colors.progressGreen + "40" : C.border,
          },
        ]}
      >
        <View style={styles.monthLeft}>
          <Text style={[styles.monthNum, { color: C.textSecondary }]}>
            Mo {snapshot.month}
          </Text>
          <Text style={[styles.monthDate, { color: C.text }]}>
            {formatMonth(snapshot.date)}
          </Text>
          {hasPaidOff && (
            <View style={styles.paidOffBadge}>
              <Ionicons name="checkmark-circle" size={12} color={Colors.progressGreen} />
              <Text style={[styles.paidOffText, { color: Colors.progressGreen }]}>
                Paid off!
              </Text>
            </View>
          )}
        </View>
        <View style={styles.monthRight}>
          <Text style={[styles.monthBalance, { color: C.text }]}>
            {formatCurrency(snapshot.totalBalance)}
          </Text>
          <Text style={[styles.monthInterest, { color: Colors.danger }]}>
            {formatCurrency(snapshot.totalInterestPaid)} total interest
          </Text>
        </View>
        <Ionicons
          name={expanded ? "chevron-up" : "chevron-down"}
          size={16}
          color={C.textSecondary}
        />
      </Pressable>

      {expanded && (
        <View style={[styles.breakdown, { backgroundColor: C.surfaceSecondary, borderColor: C.border }]}>
          {snapshot.debtBreakdown.map((b) => {
            const debt = debts.find((d) => d.id === b.debtId);
            if (!debt) return null;
            const isPaidOff = b.balance <= 0;
            return (
              <View
                key={b.debtId}
                style={[styles.breakdownRow, { borderBottomColor: C.border }]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[styles.breakdownName, { color: isPaidOff ? Colors.progressGreen : C.text }]}>
                    {debt.name}
                    {isPaidOff ? " ✓" : ""}
                  </Text>
                  <View style={styles.breakdownStats}>
                    <Text style={[styles.breakdownStat, { color: C.textSecondary }]}>
                      Interest: {formatCurrencyFull(b.interest)}
                    </Text>
                    <Text style={[styles.breakdownStat, { color: C.textSecondary }]}>
                      Principal: {formatCurrencyFull(b.principal)}
                    </Text>
                  </View>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={[styles.breakdownPayment, { color: C.text }]}>
                    {formatCurrencyFull(b.payment)}
                  </Text>
                  <Text style={[styles.breakdownBalance, { color: isPaidOff ? Colors.progressGreen : C.textSecondary }]}>
                    {isPaidOff ? "PAID" : formatCurrency(b.balance)}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

export default function PlanScreen() {
  const scheme = useColorScheme();
  const isDark = scheme === "dark";
  const C = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const { activeResult, debts, selectedStrategy } = useDebts();

  const [expandedMonths, setExpandedMonths] = useState<Set<number>>(new Set([1]));

  const toggleMonth = (month: number) => {
    setExpandedMonths((prev) => {
      const next = new Set(prev);
      if (next.has(month)) next.delete(month);
      else next.add(month);
      return next;
    });
  };

  const webTopPad = Platform.OS === "web" ? 67 : 0;

  const { snapshots, totalInterestPaid, totalMonths, totalPaid } = activeResult;

  const stratLabel =
    selectedStrategy === "avalanche"
      ? "Avalanche"
      : selectedStrategy === "snowball"
      ? "Snowball"
      : "Custom";

  if (debts.length === 0) {
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
          <Text style={[styles.headerTitle, { color: C.text }]}>Payoff Plan</Text>
        </View>
        <View style={styles.emptyWrap}>
          <View style={[styles.emptyIcon, { backgroundColor: Colors.primary + "15" }]}>
            <Ionicons name="calendar-outline" size={48} color={Colors.primary} />
          </View>
          <Text style={[styles.emptyTitle, { color: C.text }]}>No Plan Yet</Text>
          <Text style={[styles.emptyBody, { color: C.textSecondary }]}>
            Add your debts and choose a strategy to see your month-by-month payoff plan.
          </Text>
        </View>
      </View>
    );
  }

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
          <Text style={[styles.headerTitle, { color: C.text }]}>Payoff Plan</Text>
          <Text style={[styles.headerSub, { color: C.textSecondary }]}>
            {stratLabel} strategy • {monthsToText(totalMonths)}
          </Text>
        </View>
      </View>

      <View style={[styles.summaryRow, { backgroundColor: C.surface, borderBottomColor: C.border }]}>
        <View style={styles.summaryStat}>
          <Text style={[styles.summaryLabel, { color: C.textSecondary }]}>Total Paid</Text>
          <Text style={[styles.summaryValue, { color: C.text }]}>{formatCurrency(totalPaid)}</Text>
        </View>
        <View style={[styles.summaryDivider, { backgroundColor: C.border }]} />
        <View style={styles.summaryStat}>
          <Text style={[styles.summaryLabel, { color: C.textSecondary }]}>Interest</Text>
          <Text style={[styles.summaryValue, { color: Colors.danger }]}>{formatCurrency(totalInterestPaid)}</Text>
        </View>
        <View style={[styles.summaryDivider, { backgroundColor: C.border }]} />
        <View style={styles.summaryStat}>
          <Text style={[styles.summaryLabel, { color: C.textSecondary }]}>Months</Text>
          <Text style={[styles.summaryValue, { color: Colors.primary }]}>{totalMonths}</Text>
        </View>
      </View>

      <View style={[styles.colHeader, { backgroundColor: C.surfaceSecondary, borderBottomColor: C.border }]}>
        <Text style={[styles.colHeaderText, { color: C.textSecondary }]}>Month</Text>
        <Text style={[styles.colHeaderText, { color: C.textSecondary }]}>Balance / Cumulative Interest</Text>
        <View style={{ width: 20 }} />
      </View>

      <SectionList
        sections={[{ data: snapshots }]}
        keyExtractor={(item) => item.month.toString()}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={[
          styles.listContent,
          Platform.OS === "web" && { paddingBottom: 34 },
        ]}
        showsVerticalScrollIndicator={false}
        stickySectionHeadersEnabled={false}
        renderItem={({ item }) => (
          <AmortizationRow
            snapshot={item}
            debts={debts}
            expanded={expandedMonths.has(item.month)}
            onToggle={() => toggleMonth(item.month)}
            C={C}
            isDark={isDark}
          />
        )}
        renderSectionHeader={() => null}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: { fontSize: 28, fontWeight: "700", letterSpacing: -0.5 },
  headerSub: { fontSize: 14, marginTop: 2 },
  summaryRow: {
    flexDirection: "row",
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  summaryStat: { flex: 1, alignItems: "center" },
  summaryLabel: { fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5 },
  summaryValue: { fontSize: 17, fontWeight: "700", marginTop: 3 },
  summaryDivider: { width: StyleSheet.hairlineWidth },
  colHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  colHeaderText: { fontSize: 11, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5 },
  listContent: { gap: 2, padding: 8, paddingTop: 4 },
  monthRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  monthLeft: { flex: 1, gap: 2 },
  monthNum: { fontSize: 11, textTransform: "uppercase", letterSpacing: 0.4 },
  monthDate: { fontSize: 15, fontWeight: "600" },
  paidOffBadge: { flexDirection: "row", alignItems: "center", gap: 3, marginTop: 2 },
  paidOffText: { fontSize: 11, fontWeight: "600" },
  monthRight: { alignItems: "flex-end" },
  monthBalance: { fontSize: 15, fontWeight: "700" },
  monthInterest: { fontSize: 11, marginTop: 1 },
  breakdown: {
    marginTop: 2,
    borderRadius: 10,
    borderWidth: 1,
    overflow: "hidden",
    marginBottom: 2,
  },
  breakdownRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  breakdownName: { fontSize: 14, fontWeight: "600" },
  breakdownStats: { flexDirection: "row", gap: 8, marginTop: 2 },
  breakdownStat: { fontSize: 11 },
  breakdownPayment: { fontSize: 14, fontWeight: "700" },
  breakdownBalance: { fontSize: 11, marginTop: 2 },
  emptyWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    gap: 14,
  },
  emptyIcon: {
    width: 96,
    height: 96,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: { fontSize: 22, fontWeight: "700" },
  emptyBody: { fontSize: 15, textAlign: "center", lineHeight: 22 },
});
