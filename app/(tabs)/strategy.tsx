import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  useColorScheme,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { useDebts } from "@/context/DebtContext";
import {
  Strategy,
  formatCurrency,
  monthsToText,
  Debt,
} from "@/lib/calculations";

type StrategyTab = Strategy;

const STRATEGIES: { key: StrategyTab; label: string; icon: string; description: string }[] = [
  {
    key: "avalanche",
    label: "Avalanche",
    icon: "trending-down",
    description: "Highest APR first. Minimize total interest paid.",
  },
  {
    key: "snowball",
    label: "Snowball",
    icon: "snow",
    description: "Smallest balance first. Build momentum quickly.",
  },
  {
    key: "custom",
    label: "Custom",
    icon: "reorder-three",
    description: "Set your own payoff order.",
  },
];

function StrategyCard({
  stratKey,
  label,
  icon,
  description,
  months,
  interest,
  isSelected,
  isBest,
  onSelect,
  C,
  isDark,
}: {
  stratKey: StrategyTab;
  label: string;
  icon: string;
  description: string;
  months: number;
  interest: number;
  isSelected: boolean;
  isBest: boolean;
  onSelect: () => void;
  C: typeof Colors.light;
  isDark: boolean;
}) {
  return (
    <Pressable
      onPress={onSelect}
      style={({ pressed }) => [
        styles.stratCard,
        {
          backgroundColor: isSelected ? Colors.primary + "15" : C.surface,
          borderColor: isSelected ? Colors.primary : C.border,
          shadowColor: isSelected ? Colors.primary : "#000",
          opacity: pressed ? 0.9 : 1,
        },
      ]}
    >
      {isBest && (
        <View style={styles.bestBadge}>
          <Text style={styles.bestBadgeText}>BEST</Text>
        </View>
      )}
      <View style={styles.stratCardHeader}>
        <View
          style={[
            styles.stratIcon,
            { backgroundColor: isSelected ? Colors.primary : Colors.primary + "20" },
          ]}
        >
          <Ionicons name={icon as any} size={20} color={isSelected ? "#fff" : Colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.stratLabel, { color: C.text }]}>{label}</Text>
          <Text style={[styles.stratDesc, { color: C.textSecondary }]} numberOfLines={2}>
            {description}
          </Text>
        </View>
        {isSelected && (
          <View style={[styles.stratCheckWrap, { backgroundColor: Colors.primary }]}>
            <Ionicons name="checkmark" size={18} color="#fff" />
          </View>
        )}
      </View>
      <View style={[styles.stratDivider, { backgroundColor: C.border }]} />
      <View style={styles.stratStats}>
        <View style={styles.stratStat}>
          <Text style={[styles.stratStatLabel, { color: C.textSecondary }]}>Payoff</Text>
          <Text style={[styles.stratStatValue, { color: C.text }]}>{monthsToText(months)}</Text>
        </View>
        <View style={[styles.stratStat, { alignItems: "flex-end" }]}>
          <Text style={[styles.stratStatLabel, { color: C.textSecondary }]}>Total Interest</Text>
          <Text style={[styles.stratStatValue, { color: Colors.danger }]}>
            {formatCurrency(interest)}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

export default function StrategyScreen() {
  const scheme = useColorScheme();
  const isDark = scheme === "dark";
  const C = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const {
    debts,
    selectedStrategy,
    setSelectedStrategy,
    extraPayment,
    setExtraPayment,
    avalancheResult,
    snowballResult,
    customResult,
    customOrder,
    setCustomOrder,
    totalBalance,
  } = useDebts();

  const [sliderValue, setSliderValue] = useState(extraPayment);
  const [draggingOrder, setDraggingOrder] = useState<string[] | null>(null);

  const handleStrategySelect = (s: Strategy) => {
    setSelectedStrategy(s);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleExtraChange = (val: number) => {
    const rounded = Math.round(val / 25) * 25;
    setSliderValue(rounded);
  };

  const commitExtra = () => {
    setExtraPayment(sliderValue);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const savedVsMinimum = Math.max(
    0,
    avalancheResult.totalInterestPaid - (selectedStrategy === "snowball" ? snowballResult.totalInterestPaid : selectedStrategy === "custom" ? customResult.totalInterestPaid : avalancheResult.totalInterestPaid)
  );

  const avalancheSavings = Math.max(0, snowballResult.totalInterestPaid - avalancheResult.totalInterestPaid);

  const webTopPad = Platform.OS === "web" ? 67 : 0;

  const currentResult = selectedStrategy === "avalanche" ? avalancheResult : selectedStrategy === "snowball" ? snowballResult : customResult;

  const orderedDebts =
    customOrder.length > 0
      ? ([
          ...customOrder.map((id) => debts.find((d) => d.id === id)).filter(Boolean),
          ...debts.filter((d) => !customOrder.includes(d.id)),
        ] as Debt[])
      : debts;

  const moveDebt = (fromIdx: number, toIdx: number) => {
    const ids = orderedDebts.map((d) => d.id);
    const moved = ids.splice(fromIdx, 1)[0];
    ids.splice(toIdx, 0, moved);
    setCustomOrder(ids);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

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
        <Text style={[styles.headerTitle, { color: C.text }]}>Strategy</Text>
        <Text style={[styles.headerSub, { color: C.textSecondary }]}>
          Choose your debt payoff approach
        </Text>
      </View>

      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={[
          styles.scroll,
          Platform.OS === "web" && { paddingBottom: 34 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {avalancheResult.totalMonths > 0 && avalancheSavings > 0 && (
          <LinearGradient
            colors={[Colors.primary, Colors.primaryDark]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.ahaMoment}
          >
            <Ionicons name="bulb" size={22} color="rgba(255,255,255,0.9)" />
            <View style={{ flex: 1 }}>
              <Text style={styles.ahaMomentTitle}>Avalanche saves you</Text>
              <Text style={styles.ahaMomentSaving}>{formatCurrency(avalancheSavings)}</Text>
              <Text style={styles.ahaMomentSub}>
                vs. Snowball in total interest
              </Text>
            </View>
          </LinearGradient>
        )}

        <Text style={[styles.sectionTitle, { color: C.textSecondary }]}>Strategy</Text>

        <View style={styles.strategyCards}>
          {STRATEGIES.map((s) => {
            const result =
              s.key === "avalanche"
                ? avalancheResult
                : s.key === "snowball"
                ? snowballResult
                : customResult;
            const isBest =
              s.key === "avalanche" &&
              avalancheResult.totalInterestPaid <= snowballResult.totalInterestPaid;
            return (
              <StrategyCard
                key={s.key}
                stratKey={s.key}
                label={s.label}
                icon={s.icon}
                description={s.description}
                months={result.totalMonths}
                interest={result.totalInterestPaid}
                isSelected={selectedStrategy === s.key}
                isBest={isBest}
                onSelect={() => handleStrategySelect(s.key)}
                C={C}
                isDark={isDark}
              />
            );
          })}
        </View>

        <Text style={[styles.sectionTitle, { color: C.textSecondary }]}>
          Extra Monthly Payment
        </Text>

        <View style={[styles.sliderCard, { backgroundColor: C.surface, borderColor: C.border }]}>
          <View style={styles.sliderTop}>
            <Text style={[styles.sliderLabel, { color: C.text }]}>Extra Payment</Text>
            <Text style={[styles.sliderValue, { color: Colors.primary }]}>
              +{formatCurrency(sliderValue)}/mo
            </Text>
          </View>

          <View style={styles.sliderTrackWrap}>
            <View style={[styles.sliderTrack, { backgroundColor: C.border }]}>
              <View
                style={[
                  styles.sliderFill,
                  {
                    width: `${Math.min(100, (sliderValue / 1000) * 100)}%`,
                    backgroundColor: Colors.primary,
                  },
                ]}
              />
            </View>
            <View style={styles.sliderBtns}>
              {[0, 50, 100, 200, 300, 500, 750, 1000].map((v) => (
                <Pressable
                  key={v}
                  onPress={() => { setSliderValue(v); setExtraPayment(v); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                  style={[
                    styles.sliderPip,
                    {
                      backgroundColor: sliderValue >= v ? Colors.primary : C.border,
                    },
                  ]}
                />
              ))}
            </View>
            <View style={styles.sliderQuickBtns}>
              {[0, 100, 250, 500, 1000].map((v) => (
                <Pressable
                  key={v}
                  onPress={() => { setSliderValue(v); setExtraPayment(v); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                  style={[
                    styles.sliderQuickBtn,
                    {
                      backgroundColor: sliderValue === v ? Colors.primary : C.surfaceSecondary,
                      borderColor: sliderValue === v ? Colors.primary : C.border,
                    },
                  ]}
                >
                  <Text style={[styles.sliderQuickBtnText, { color: sliderValue === v ? "#fff" : C.textSecondary }]}>
                    {v === 0 ? "None" : `+$${v}`}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {sliderValue > 0 && currentResult.totalMonths > 0 && (
            <View style={[styles.impactRow, { backgroundColor: Colors.primary + "10", borderColor: Colors.primary + "30" }]}>
              <View style={styles.impactStat}>
                <Text style={[styles.impactLabel, { color: C.textSecondary }]}>Payoff</Text>
                <Text style={[styles.impactValue, { color: Colors.primary }]}>
                  {monthsToText(currentResult.totalMonths)}
                </Text>
              </View>
              <View style={[styles.impactDivider, { backgroundColor: C.border }]} />
              <View style={styles.impactStat}>
                <Text style={[styles.impactLabel, { color: C.textSecondary }]}>Interest</Text>
                <Text style={[styles.impactValue, { color: Colors.primary }]}>
                  {formatCurrency(currentResult.totalInterestPaid)}
                </Text>
              </View>
            </View>
          )}
        </View>

        {selectedStrategy === "custom" && debts.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { color: C.textSecondary }]}>
              Custom Order (tap to reorder)
            </Text>
            <View style={[styles.customOrderCard, { backgroundColor: C.surface, borderColor: C.border }]}>
              {orderedDebts.map((debt, idx) => (
                <View
                  key={debt.id}
                  style={[styles.orderRow, { borderBottomColor: C.border, borderBottomWidth: idx < orderedDebts.length - 1 ? StyleSheet.hairlineWidth : 0 }]}
                >
                  <View style={[styles.orderNum, { backgroundColor: Colors.primary }]}>
                    <Text style={styles.orderNumText}>{idx + 1}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.orderName, { color: C.text }]}>{debt.name}</Text>
                    <Text style={[styles.orderBalance, { color: C.textSecondary }]}>
                      {formatCurrency(debt.balance)}
                    </Text>
                  </View>
                  <View style={styles.orderArrows}>
                    {idx > 0 && (
                      <Pressable onPress={() => moveDebt(idx, idx - 1)} hitSlop={8}>
                        <Ionicons name="chevron-up" size={20} color={Colors.primary} />
                      </Pressable>
                    )}
                    {idx < orderedDebts.length - 1 && (
                      <Pressable onPress={() => moveDebt(idx, idx + 1)} hitSlop={8}>
                        <Ionicons name="chevron-down" size={20} color={Colors.primary} />
                      </Pressable>
                    )}
                  </View>
                </View>
              ))}
            </View>
          </>
        )}

        <Text style={[styles.sectionTitle, { color: C.textSecondary }]}>Comparison</Text>
        <View style={[styles.compTable, { backgroundColor: C.surface, borderColor: C.border }]}>
          <View style={[styles.compHeader, { borderBottomColor: C.border }]}>
            <Text style={[styles.compHeaderCell, { color: C.textSecondary, flex: 1.5 }]}>Strategy</Text>
            <Text style={[styles.compHeaderCell, { color: C.textSecondary }]}>Months</Text>
            <Text style={[styles.compHeaderCell, { color: C.textSecondary }]}>Interest</Text>
          </View>
          {[
            { label: "Avalanche", result: avalancheResult, key: "avalanche" },
            { label: "Snowball", result: snowballResult, key: "snowball" },
            { label: "Custom", result: customResult, key: "custom" },
          ].map((row) => (
            <View
              key={row.key}
              style={[
                styles.compRow,
                { borderBottomColor: C.border },
                selectedStrategy === row.key && { backgroundColor: Colors.primary + "0A" },
              ]}
            >
              <View style={[styles.compRowLabel, { flex: 1.5 }]}>
                {selectedStrategy === row.key && (
                  <Ionicons name="radio-button-on" size={14} color={Colors.primary} />
                )}
                <Text style={[styles.compCell, { color: selectedStrategy === row.key ? Colors.primary : C.text, fontWeight: selectedStrategy === row.key ? "600" : "400" }]}>
                  {row.label}
                </Text>
              </View>
              <Text style={[styles.compCell, { color: C.text }]}>
                {monthsToText(row.result.totalMonths)}
              </Text>
              <Text style={[styles.compCell, { color: Colors.danger }]}>
                {formatCurrency(row.result.totalInterestPaid)}
              </Text>
            </View>
          ))}
        </View>
      </ScrollView>
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
  scroll: { padding: 16, gap: 12 },
  ahaMoment: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 16,
    padding: 16,
  },
  ahaMomentTitle: { color: "rgba(255,255,255,0.8)", fontSize: 13 },
  ahaMomentSaving: { color: "#fff", fontSize: 24, fontWeight: "800" },
  ahaMomentSub: { color: "rgba(255,255,255,0.7)", fontSize: 12 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    paddingHorizontal: 2,
    marginTop: 4,
  },
  strategyCards: { gap: 10 },
  stratCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 4,
    position: "relative",
  },
  bestBadge: {
    position: "absolute",
    top: 10,
    right: 10,
    backgroundColor: Colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  bestBadgeText: { color: "#fff", fontSize: 10, fontWeight: "800", letterSpacing: 0.5 },
  stratCardHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
  stratCheckWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  stratIcon: { width: 40, height: 40, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  stratLabel: { fontSize: 16, fontWeight: "700" },
  stratDesc: { fontSize: 13, marginTop: 2, lineHeight: 18 },
  stratDivider: { height: StyleSheet.hairlineWidth, marginVertical: 10 },
  stratStats: { flexDirection: "row", justifyContent: "space-between" },
  stratStat: {},
  stratStatLabel: { fontSize: 11, textTransform: "uppercase", letterSpacing: 0.4 },
  stratStatValue: { fontSize: 15, fontWeight: "700", marginTop: 2 },
  sliderCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    gap: 14,
  },
  sliderTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  sliderLabel: { fontSize: 16, fontWeight: "600" },
  sliderValue: { fontSize: 20, fontWeight: "800" },
  sliderTrackWrap: { gap: 10 },
  sliderTrack: {
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
  },
  sliderFill: {
    height: "100%",
    borderRadius: 3,
  },
  sliderPips: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: -4,
  },
  sliderBtns: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  sliderPip: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  sliderQuickBtns: {
    flexDirection: "row",
    gap: 6,
    flexWrap: "wrap",
  },
  sliderQuickBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
  },
  sliderQuickBtnText: { fontSize: 13, fontWeight: "500" },
  impactRow: {
    flexDirection: "row",
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
    gap: 12,
  },
  impactStat: { flex: 1, alignItems: "center" },
  impactLabel: { fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5 },
  impactValue: { fontSize: 18, fontWeight: "700", marginTop: 2 },
  impactDivider: { width: StyleSheet.hairlineWidth },
  customOrderCard: { borderRadius: 14, borderWidth: 1, overflow: "hidden" },
  orderRow: { flexDirection: "row", alignItems: "center", padding: 14, gap: 12 },
  orderNum: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  orderNumText: { color: "#fff", fontSize: 13, fontWeight: "700" },
  orderName: { fontSize: 15, fontWeight: "600" },
  orderBalance: { fontSize: 13 },
  orderArrows: { flexDirection: "column", gap: 0 },
  compTable: { borderRadius: 14, borderWidth: 1, overflow: "hidden" },
  compHeader: {
    flexDirection: "row",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  compHeaderCell: { flex: 1, fontSize: 12, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5 },
  compRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  compRowLabel: { flexDirection: "row", alignItems: "center", gap: 6 },
  compCell: { flex: 1, fontSize: 14 },
});
