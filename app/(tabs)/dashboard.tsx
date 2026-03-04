import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  useColorScheme,
  Platform,
  Modal,
  TextInput,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
  Easing,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { useDebts } from "@/context/DebtContext";
import {
  formatCurrency,
  monthsToText,
  runStrategy,
} from "@/lib/calculations";
import { ProgressRing } from "@/components/ProgressRing";
import { CTACards } from "@/components/CTACards";

const AnimatedText = Animated.createAnimatedComponent(Text);

const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function formatPayoffDate(date: Date): string {
  return `${MONTH_NAMES[date.getMonth()]} ${date.getFullYear()}`;
}

function daysUntil(date: Date): number {
  const now = new Date();
  return Math.max(0, Math.round((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
}

function StatCard({ label, value, sub, color, icon, C, isDark }: {
  label: string;
  value: string;
  sub?: string;
  color: string;
  icon: keyof typeof Ionicons.glyphMap;
  C: typeof Colors.light;
  isDark: boolean;
}) {
  return (
    <View style={[styles.statCard, { backgroundColor: C.surface, borderColor: isDark ? C.border : "rgba(0,0,0,0.06)", shadowColor: isDark ? "#000" : Colors.primary }]}>
      <View style={[styles.statIcon, { backgroundColor: color + "20" }]}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <Text style={[styles.statLabel, { color: C.textSecondary }]}>{label}</Text>
      <Text style={[styles.statValue, { color: C.text }]}>{value}</Text>
      {sub && <Text style={[styles.statSub, { color: C.textSecondary }]}>{sub}</Text>}
    </View>
  );
}

export default function DashboardScreen() {
  const scheme = useColorScheme();
  const isDark = scheme === "dark";
  const C = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const {
    debts,
    totalBalance,
    activeResult,
    avalancheResult,
    extraPayment,
    payments,
    logPayment,
  } = useDebts();

  const [whatIfExtra, setWhatIfExtra] = useState(extraPayment);
  const [whatIfLump, setWhatIfLump] = useState(0);
  const [logModalVisible, setLogModalVisible] = useState(false);
  const [logDebtId, setLogDebtId] = useState<string>(debts[0]?.id ?? "");
  const [logAmount, setLogAmount] = useState("");
  const [logMissed, setLogMissed] = useState(false);

  const originalBalance = useRef(totalBalance + payments.filter(p => !p.isMissed).reduce((s, p) => s + p.amount, 0));
  const paidOff = Math.max(0, originalBalance.current - totalBalance);
  const progress = originalBalance.current > 0 ? paidOff / originalBalance.current : 0;

  const whatIfResult = runStrategy(debts, whatIfExtra, "avalanche");
  const whatIfLumpResult = whatIfLump > 0
    ? runStrategy(
        debts.map((d) => ({ ...d, balance: Math.max(0, d.balance - whatIfLump / debts.length) })),
        extraPayment,
        "avalanche"
      )
    : null;

  const interestSaved = Math.max(0, avalancheResult.totalInterestPaid - whatIfResult.totalInterestPaid);
  const monthsSaved = Math.max(0, avalancheResult.totalMonths - whatIfResult.totalMonths);

  const payoffDate = activeResult.payoffDate;
  const days = daysUntil(payoffDate);

  const totalInterestSaved = Math.max(
    0,
    (debts.reduce((s, d) => s + d.balance * (d.apr / 100) * (activeResult.totalMonths / 12), 0)) - activeResult.totalInterestPaid
  );

  const monthlyInterest = debts.reduce((s, d) => s + d.balance * (d.apr / 100 / 12), 0);
  const totalMonthlies = debts.reduce((s, d) => s + d.minimumPayment + extraPayment, 0);
  const principalRatio = totalMonthlies > 0 ? Math.max(0, Math.min(1, (totalMonthlies - monthlyInterest) / totalMonthlies)) : 0;

  const webTopPad = Platform.OS === "web" ? 67 : 0;

  const handleLogPayment = async () => {
    if (!logDebtId || !logAmount) return;
    await logPayment({
      debtId: logDebtId,
      amount: parseFloat(logAmount) || 0,
      date: new Date().toISOString(),
      isMissed: logMissed,
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setLogModalVisible(false);
    setLogAmount("");
    setLogMissed(false);
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
        <View>
          <Text style={[styles.headerTitle, { color: C.text }]}>Dashboard</Text>
          <Text style={[styles.headerSub, { color: C.textSecondary }]}>
            Your path to debt freedom
          </Text>
        </View>
        <Pressable
          onPress={() => { setLogModalVisible(true); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); }}
          style={[styles.logBtn, { backgroundColor: Colors.primary + "20", borderColor: Colors.primary + "40" }]}
        >
          <Ionicons name="add" size={18} color={Colors.primary} />
          <Text style={[styles.logBtnText, { color: Colors.primary }]}>Log</Text>
        </Pressable>
      </View>

      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={[
          styles.scroll,
          Platform.OS === "web" && { paddingBottom: 34 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {debts.length > 0 ? (
          <>
            <LinearGradient
              colors={isDark ? ["#142819", "#0D1C10"] : ["#E8F8EF", "#D0F0DE"]}
              style={styles.heroCard}
            >
              <View style={styles.heroTop}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.heroLabel, { color: C.textSecondary }]}>Total Remaining</Text>
                  <Text style={[styles.heroBalance, { color: C.text }]}>
                    {formatCurrency(totalBalance)}
                  </Text>
                  <View style={styles.heroMeta}>
                    <Ionicons name="calendar" size={13} color={Colors.primary} />
                    <Text style={[styles.heroMetaText, { color: C.textSecondary }]}>
                      Debt-free {formatPayoffDate(payoffDate)} • {days.toLocaleString()} days
                    </Text>
                  </View>
                </View>

                <View style={styles.heroRing}>
                  <ProgressRing
                    size={100}
                    strokeWidth={10}
                    progress={progress}
                    color={Colors.progressGreen}
                    trackColor={isDark ? "rgba(46,204,113,0.22)" : "rgba(46,204,113,0.2)"}
                  />
                  <View style={styles.heroRingCenter}>
                    <Text
                      style={[styles.heroRingPct, { color: Colors.progressGreen }]}
                      numberOfLines={1}
                      adjustsFontSizeToFit
                      minimumFontScale={0.5}
                    >
                      {Math.round(progress * 100)}%
                    </Text>
                    <Text style={[styles.heroRingLabel, { color: C.textSecondary }]}>paid</Text>
                  </View>
                </View>
              </View>

              {paidOff > 0 && (
                <View style={[styles.progressBar, { backgroundColor: isDark ? "rgba(34,197,94,0.22)" : "rgba(34,197,94,0.2)" }]}>
                  <Animated.View
                    style={[
                      styles.progressFill,
                      {
                        width: `${Math.round(progress * 100)}%`,
                        backgroundColor: Colors.progressGreen,
                      },
                    ]}
                  />
                </View>
              )}
            </LinearGradient>

            <View style={styles.statsGrid}>
              <StatCard
                label="Monthly Payment"
                value={formatCurrency(debts.reduce((s, d) => s + d.minimumPayment, 0) + extraPayment)}
                sub="minimums + extra"
                color={Colors.primary}
                icon="wallet"
                C={C}
                isDark={isDark}
              />
              <StatCard
                label="Payoff Timeline"
                value={monthsToText(activeResult.totalMonths)}
                sub={formatPayoffDate(payoffDate)}
                color={Colors.accent}
                icon="time"
                C={C}
                isDark={isDark}
              />
              <StatCard
                label="Total Interest"
                value={formatCurrency(activeResult.totalInterestPaid)}
                sub="at current strategy"
                color={Colors.danger}
                icon="trending-up"
                C={C}
                isDark={isDark}
              />
              <StatCard
                label="Principal/Interest"
                value={`${Math.round(principalRatio * 100)}%`}
                sub="goes to principal"
                color={Colors.warning}
                icon="pie-chart"
                C={C}
                isDark={isDark}
              />
            </View>

            <View style={[styles.section, { backgroundColor: C.surface, borderColor: C.border }]}>
              <View style={styles.sectionHeader}>
                <Ionicons name="analytics" size={18} color={Colors.primary} />
                <Text style={[styles.sectionTitle, { color: C.text }]}>Payment Breakdown</Text>
              </View>

              <View style={styles.ringRow}>
                <View style={{ alignItems: "center" }}>
                  <ProgressRing
                    size={80}
                    strokeWidth={8}
                    progress={principalRatio}
                    color={Colors.progressGreen}
                    trackColor={Colors.danger + "30"}
                  />
                  <Text style={[styles.ringLabel, { color: C.textSecondary }]}>Principal</Text>
                </View>
                <View style={styles.ringLegend}>
                  <View style={styles.ringLegendItem}>
                    <View style={[styles.ringLegendDot, { backgroundColor: Colors.progressGreen }]} />
                    <Text style={[styles.ringLegendText, { color: C.text }]}>
                      Principal: {formatCurrency(Math.max(0, totalMonthlies - monthlyInterest))}/mo
                    </Text>
                  </View>
                  <View style={styles.ringLegendItem}>
                    <View style={[styles.ringLegendDot, { backgroundColor: Colors.danger }]} />
                    <Text style={[styles.ringLegendText, { color: C.text }]}>
                      Interest: {formatCurrency(monthlyInterest)}/mo
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            <View style={[styles.section, { backgroundColor: C.surface, borderColor: C.border }]}>
              <View style={styles.sectionHeader}>
                <Ionicons name="bulb" size={18} color={Colors.warning} />
                <Text style={[styles.sectionTitle, { color: C.text }]}>What-If Scenarios</Text>
              </View>

              <Text style={[styles.whatIfLabel, { color: C.textSecondary }]}>
                Extra monthly payment
              </Text>
              <View style={styles.whatIfQuickBtns}>
                {[0, 50, 100, 200, 500].map((v) => (
                  <Pressable
                    key={v}
                    onPress={() => setWhatIfExtra(v)}
                    style={[
                      styles.whatIfBtn,
                      {
                        backgroundColor: whatIfExtra === v ? Colors.primary : C.surfaceSecondary,
                        borderColor: whatIfExtra === v ? Colors.primary : C.border,
                      },
                    ]}
                  >
                    <Text style={[styles.whatIfBtnText, { color: whatIfExtra === v ? "#fff" : C.textSecondary }]}>
                      {v === 0 ? "Min only" : `+$${v}`}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {whatIfExtra > 0 && (
                <View style={[styles.whatIfResult, { backgroundColor: Colors.primary + "10", borderColor: Colors.primary + "30" }]}>
                  <View style={styles.whatIfResultStat}>
                    <Text style={[styles.whatIfResultLabel, { color: C.textSecondary }]}>Saves</Text>
                    <Text style={[styles.whatIfResultValue, { color: Colors.primary }]}>
                      {formatCurrency(interestSaved)}
                    </Text>
                    <Text style={[styles.whatIfResultSub, { color: C.textSecondary }]}>in interest</Text>
                  </View>
                  <View style={[styles.whatIfDivider, { backgroundColor: Colors.primary + "30" }]} />
                  <View style={styles.whatIfResultStat}>
                    <Text style={[styles.whatIfResultLabel, { color: C.textSecondary }]}>Earlier</Text>
                    <Text style={[styles.whatIfResultValue, { color: Colors.primary }]}>
                      {monthsToText(monthsSaved)}
                    </Text>
                    <Text style={[styles.whatIfResultSub, { color: C.textSecondary }]}>sooner</Text>
                  </View>
                </View>
              )}

              <Text style={[styles.whatIfLabel, { color: C.textSecondary, marginTop: 12 }]}>
                Lump sum windfall
              </Text>
              <View style={styles.whatIfQuickBtns}>
                {[0, 500, 1000, 2500, 5000].map((v) => (
                  <Pressable
                    key={v}
                    onPress={() => setWhatIfLump(v)}
                    style={[
                      styles.whatIfBtn,
                      {
                        backgroundColor: whatIfLump === v ? Colors.accent : C.surfaceSecondary,
                        borderColor: whatIfLump === v ? Colors.accent : C.border,
                      },
                    ]}
                  >
                    <Text style={[styles.whatIfBtnText, { color: whatIfLump === v ? "#fff" : C.textSecondary }]}>
                      {v === 0 ? "None" : `$${v.toLocaleString()}`}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {whatIfLump > 0 && whatIfLumpResult && (
                <View style={[styles.whatIfResult, { backgroundColor: Colors.accent + "10", borderColor: Colors.accent + "30" }]}>
                  <View style={styles.whatIfResultStat}>
                    <Text style={[styles.whatIfResultLabel, { color: C.textSecondary }]}>New Payoff</Text>
                    <Text style={[styles.whatIfResultValue, { color: Colors.accent }]}>
                      {monthsToText(whatIfLumpResult.totalMonths)}
                    </Text>
                  </View>
                  <View style={[styles.whatIfDivider, { backgroundColor: Colors.accent + "30" }]} />
                  <View style={styles.whatIfResultStat}>
                    <Text style={[styles.whatIfResultLabel, { color: C.textSecondary }]}>Interest</Text>
                    <Text style={[styles.whatIfResultValue, { color: Colors.accent }]}>
                      {formatCurrency(whatIfLumpResult.totalInterestPaid)}
                    </Text>
                  </View>
                </View>
              )}
            </View>

            {payments.length > 0 && (
              <View style={[styles.section, { backgroundColor: C.surface, borderColor: C.border }]}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="receipt" size={18} color={Colors.accent} />
                  <Text style={[styles.sectionTitle, { color: C.text }]}>Recent Payments</Text>
                </View>
                {payments.slice(0, 5).map((p) => {
                  const debt = debts.find((d) => d.id === p.debtId);
                  return (
                    <View key={p.id} style={[styles.paymentRow, { borderBottomColor: C.border }]}>
                      <View style={[styles.paymentDot, { backgroundColor: p.isMissed ? Colors.danger : Colors.progressGreen }]} />
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.paymentName, { color: C.text }]}>
                          {debt?.name ?? "Unknown"}
                        </Text>
                        <Text style={[styles.paymentDate, { color: C.textSecondary }]}>
                          {new Date(p.date).toLocaleDateString()}
                          {p.isMissed ? " • Missed" : ""}
                        </Text>
                      </View>
                      <Text style={[styles.paymentAmount, { color: p.isMissed ? Colors.danger : Colors.progressGreen }]}>
                        {p.isMissed ? "—" : formatCurrency(p.amount)}
                      </Text>
                    </View>
                  );
                })}
              </View>
            )}

            <CTACards />

            <View style={styles.comingSoonWrap}>
              <LinearGradient
                colors={isDark ? ["#0D2818", "#0A1F12"] : ["#E8F8EE", "#D4F0E0"]}
                style={[styles.comingSoonCard, { borderColor: isDark ? "rgba(46,204,113,0.25)" : "rgba(46,204,113,0.35)" }]}
              >
                <View style={styles.comingSoonBadge}>
                  <Ionicons name="rocket-outline" size={14} color="#fff" />
                  <Text style={styles.comingSoonBadgeText}>We're building</Text>
                </View>
                <View style={styles.comingSoonCardHeader}>
                  <View style={styles.comingSoonCardIconWrap}>
                    <LinearGradient
                      colors={[Colors.primary, Colors.primaryDark]}
                      style={styles.comingSoonCardIcon}
                    >
                      <Ionicons name="sparkles" size={26} color="#fff" />
                    </LinearGradient>
                  </View>
                  <View style={styles.comingSoonTitleWrap}>
                    <Text style={[styles.comingSoonCardTitle, { color: C.text }]}>Coming soon</Text>
                    <Text style={[styles.comingSoonCardSub, { color: C.textSecondary }]}>
                      Like Duolingo — but for getting out of debt
                    </Text>
                  </View>
                </View>
                <View style={styles.comingSoonPills}>
                  {[
                    { icon: "people" as const, label: "Friends" },
                    { icon: "people-circle" as const, label: "Community" },
                    { icon: "flame" as const, label: "Streaks" },
                    { icon: "sparkles" as const, label: "Celebrations" },
                  ].map((item) => (
                    <View
                      key={item.label}
                      style={[
                        styles.comingSoonPill,
                        { backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.9)" },
                      ]}
                    >
                      <Ionicons name={item.icon} size={16} color={Colors.primary} />
                      <Text style={[styles.comingSoonPillLabel, { color: C.text }]}>{item.label}</Text>
                    </View>
                  ))}
                </View>
              </LinearGradient>
            </View>
          </>
        ) : (
          <View style={styles.emptyDash}>
            <LinearGradient
              colors={[Colors.primary + "20", Colors.primary + "05"]}
              style={styles.emptyDashIcon}
            >
              <Ionicons name="speedometer-outline" size={56} color={Colors.primary} />
            </LinearGradient>
            <Text style={[styles.emptyDashTitle, { color: C.text }]}>
              Add debts to see your dashboard
            </Text>
            <Text style={[styles.emptyDashBody, { color: C.textSecondary }]}>
              Head to the Debts tab to add your accounts. Your progress, payoff date, and personalized options will appear here.
            </Text>

            <View style={styles.comingSoonWrap}>
              <LinearGradient
                colors={isDark ? ["#0D2818", "#0A1F12"] : ["#E8F8EE", "#D4F0E0"]}
                style={[styles.comingSoonCard, { borderColor: isDark ? "rgba(46,204,113,0.25)" : "rgba(46,204,113,0.35)" }]}
              >
                <View style={styles.comingSoonBadge}>
                  <Ionicons name="rocket-outline" size={14} color="#fff" />
                  <Text style={styles.comingSoonBadgeText}>We're building</Text>
                </View>
                <View style={styles.comingSoonCardHeader}>
                  <View style={styles.comingSoonCardIconWrap}>
                    <LinearGradient
                      colors={[Colors.primary, Colors.primaryDark]}
                      style={styles.comingSoonCardIcon}
                    >
                      <Ionicons name="sparkles" size={26} color="#fff" />
                    </LinearGradient>
                  </View>
                  <View style={styles.comingSoonTitleWrap}>
                    <Text style={[styles.comingSoonCardTitle, { color: C.text }]}>Coming soon</Text>
                    <Text style={[styles.comingSoonCardSub, { color: C.textSecondary }]}>
                      Friends, community, streaks & celebrations — like Duolingo for debt.
                    </Text>
                  </View>
                </View>
              </LinearGradient>
            </View>
          </View>
        )}
      </ScrollView>

      <Modal
        visible={logModalVisible}
        animationType="slide"
        presentationStyle="formSheet"
        onRequestClose={() => setLogModalVisible(false)}
      >
        <View style={[styles.logModal, { backgroundColor: C.surface }]}>
          <View style={[styles.logModalHeader, { borderBottomColor: C.border }]}>
            <Pressable onPress={() => setLogModalVisible(false)} hitSlop={12} style={styles.logModalHeaderBtn}>
              <Ionicons name="close" size={24} color={C.textSecondary} />
            </Pressable>
            <Text style={[styles.logModalTitle, { color: C.text }]}>Log Payment</Text>
            <Pressable onPress={handleLogPayment} style={styles.logModalHeaderBtn}>
              <Text style={[styles.logModalSave, { color: Colors.primary }]}>Save</Text>
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.logModalContent} keyboardShouldPersistTaps="handled">
            <Text style={[styles.logModalLabel, { color: C.textSecondary }]}>Debt Account</Text>
            <View style={styles.debtSelectRow}>
              {debts.map((d) => (
                <Pressable
                  key={d.id}
                  onPress={() => setLogDebtId(d.id)}
                  style={[
                    styles.debtSelectChip,
                    {
                      backgroundColor: logDebtId === d.id ? Colors.primary : C.surfaceSecondary,
                      borderColor: logDebtId === d.id ? Colors.primary : C.border,
                    },
                  ]}
                >
                  <Text style={[styles.debtSelectText, { color: logDebtId === d.id ? "#fff" : C.text }]} numberOfLines={1}>
                    {d.name}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={[styles.logModalLabel, { color: C.textSecondary }]}>Payment Type</Text>
            <View style={styles.typeRow}>
              <Pressable
                onPress={() => setLogMissed(false)}
                style={[
                  styles.typeChip,
                  {
                    backgroundColor: !logMissed ? Colors.primary : C.surfaceSecondary,
                    borderColor: !logMissed ? Colors.primary : C.border,
                  },
                ]}
              >
                <Text style={[styles.typeChipText, { color: !logMissed ? "#fff" : C.text }]}>Payment Made</Text>
              </Pressable>
              <Pressable
                onPress={() => setLogMissed(true)}
                style={[
                  styles.typeChip,
                  {
                    backgroundColor: logMissed ? Colors.danger : C.surfaceSecondary,
                    borderColor: logMissed ? Colors.danger : C.border,
                  },
                ]}
              >
                <Text style={[styles.typeChipText, { color: logMissed ? "#fff" : C.text }]}>Missed Payment</Text>
              </Pressable>
            </View>

            {!logMissed && (
              <>
                <Text style={[styles.logModalLabel, { color: C.textSecondary }]}>Amount ($)</Text>
                <TextInput
                  style={[styles.logInput, { backgroundColor: C.surfaceSecondary, color: C.text, borderColor: C.border }]}
                  value={logAmount}
                  onChangeText={setLogAmount}
                  placeholder="150.00"
                  placeholderTextColor={C.textSecondary}
                  keyboardType="decimal-pad"
                />
              </>
            )}
          </ScrollView>
        </View>
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
  headerTitle: { fontSize: 28, fontWeight: "700", letterSpacing: -0.5 },
  headerSub: { fontSize: 14, marginTop: 2 },
  logBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  logBtnText: { fontSize: 14, fontWeight: "600" },
  scroll: { padding: 16, gap: 14 },
  heroCard: {
    borderRadius: 20,
    padding: 20,
    gap: 16,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 5,
  },
  heroTop: { flexDirection: "row", alignItems: "center", gap: 16 },
  heroLabel: { fontSize: 13, fontWeight: "500", textTransform: "uppercase", letterSpacing: 0.5 },
  heroBalance: { fontSize: 36, fontWeight: "800", letterSpacing: -1, marginTop: 4 },
  heroMeta: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 6 },
  heroMetaText: { fontSize: 12 },
  heroRing: { position: "relative", alignItems: "center", justifyContent: "center" },
  heroRingCenter: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
    maxWidth: "75%",
  },
  heroRingPct: { fontSize: 20, fontWeight: "800" },
  heroRingLabel: { fontSize: 10, marginTop: -2 },
  progressBar: {
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 3,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  statCard: {
    width: "48%",
    borderRadius: 14,
    padding: 14,
    gap: 6,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 4,
  },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  statLabel: { fontSize: 11, textTransform: "uppercase", letterSpacing: 0.4 },
  statValue: { fontSize: 18, fontWeight: "700" },
  statSub: { fontSize: 11 },
  section: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 12,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  sectionTitle: { fontSize: 16, fontWeight: "700" },
  ringRow: { flexDirection: "row", alignItems: "center", gap: 16 },
  ringLabel: { fontSize: 11, marginTop: 4 },
  ringLegend: { flex: 1, gap: 8 },
  ringLegendItem: { flexDirection: "row", alignItems: "center", gap: 8 },
  ringLegendDot: { width: 10, height: 10, borderRadius: 5 },
  ringLegendText: { fontSize: 14 },
  whatIfLabel: { fontSize: 13, fontWeight: "500" },
  whatIfQuickBtns: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  whatIfBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1 },
  whatIfBtnText: { fontSize: 13, fontWeight: "500" },
  whatIfResult: {
    flexDirection: "row",
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginTop: 4,
  },
  whatIfResultStat: { flex: 1, alignItems: "center" },
  whatIfResultLabel: { fontSize: 11, textTransform: "uppercase", letterSpacing: 0.4 },
  whatIfResultValue: { fontSize: 20, fontWeight: "800", marginTop: 2 },
  whatIfResultSub: { fontSize: 11, marginTop: 2 },
  whatIfDivider: { width: StyleSheet.hairlineWidth },
  paymentRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  paymentDot: { width: 8, height: 8, borderRadius: 4 },
  paymentName: { fontSize: 14, fontWeight: "600" },
  paymentDate: { fontSize: 12, marginTop: 1 },
  paymentAmount: { fontSize: 15, fontWeight: "700" },
  emptyDash: { alignItems: "center", paddingVertical: 48, gap: 16, paddingHorizontal: 32 },
  comingSoonWrap: { marginTop: 4 },
  comingSoonCard: {
    borderRadius: 20,
    borderWidth: 1.5,
    padding: 18,
    gap: 14,
    overflow: "hidden",
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
  },
  comingSoonBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 6,
    backgroundColor: Colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  comingSoonBadgeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  comingSoonCardHeader: { flexDirection: "row", alignItems: "center", gap: 14 },
  comingSoonCardIconWrap: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  comingSoonCardIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  comingSoonTitleWrap: { flex: 1 },
  comingSoonCardTitle: { fontSize: 19, fontWeight: "800", letterSpacing: -0.3 },
  comingSoonCardSub: { fontSize: 14, lineHeight: 20, marginTop: 2 },
  comingSoonPills: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  comingSoonPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  comingSoonPillLabel: { fontSize: 14, fontWeight: "600" },
  emptyDashIcon: {
    width: 120,
    height: 120,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyDashTitle: { fontSize: 20, fontWeight: "700", textAlign: "center" },
  emptyDashBody: { fontSize: 15, textAlign: "center", lineHeight: 22 },
  logModal: { flex: 1 },
  logModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  logModalHeaderBtn: { minWidth: 44, alignItems: "center", justifyContent: "center" },
  logModalTitle: { flex: 1, fontSize: 18, fontWeight: "700", textAlign: "center" },
  logModalSave: { fontSize: 16, fontWeight: "600" },
  logModalContent: { padding: 24, gap: 16 },
  logModalLabel: { fontSize: 13, fontWeight: "500", textTransform: "uppercase", letterSpacing: 0.5 },
  debtSelectRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  debtSelectChip: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, borderWidth: 1, maxWidth: "48%", alignItems: "center", justifyContent: "center" },
  debtSelectText: { fontSize: 14, fontWeight: "600", textAlign: "center" },
  typeRow: { flexDirection: "row", gap: 10 },
  typeChip: { flex: 1, paddingVertical: 14, borderRadius: 12, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  typeChipText: { fontSize: 15, fontWeight: "600", textAlign: "center" },
  logInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 18,
    fontWeight: "600",
  },
});
