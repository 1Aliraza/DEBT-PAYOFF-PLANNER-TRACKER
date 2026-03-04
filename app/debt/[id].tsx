import React, { useState, useRef, useEffect, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  useColorScheme,
  Platform,
  Modal,
  Alert,
  Dimensions,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Svg, {
  Path,
  Circle,
  Defs,
  LinearGradient as SvgLinearGradient,
  Stop,
  Text as SvgText,
} from "react-native-svg";
import Animated, {
  useSharedValue,
  withTiming,
  useAnimatedStyle,
  runOnJS,
  Easing,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { useDebts } from "@/context/DebtContext";
import {
  Debt,
  DebtType,
  debtTypeLabel,
  debtTypeIcon,
  formatCurrency,
  formatCurrencyFull,
  monthsToText,
  runStrategy,
  MonthlySnapshot,
} from "@/lib/calculations";
import { ProgressRing } from "@/components/ProgressRing";
import { DebtForm } from "@/components/DebtForm";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";

const { width: SCREEN_W } = Dimensions.get("window");
// Chart fits inside card: scroll 32 + card 32 + Y label ~48 + gap 4 = 116
const CHART_W = Math.max(180, SCREEN_W - 116);
const CHART_H = 140;

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

const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

type TabKey = "progress" | "transactions" | "details";

function formatDate(d: Date) {
  return `${MONTH_NAMES[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

function ordinal(n: number): string {
  const s = ["th","st","nd","rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

function buildAreaPath(pts: { x: number; y: number }[], width: number, height: number): string {
  if (pts.length < 2) return "";
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 1; i < pts.length; i++) {
    const prev = pts[i - 1];
    const curr = pts[i];
    const cpX = (prev.x + curr.x) / 2;
    d += ` C ${cpX} ${prev.y}, ${cpX} ${curr.y}, ${curr.x} ${curr.y}`;
  }
  d += ` L ${pts[pts.length - 1].x} ${height} L ${pts[0].x} ${height} Z`;
  return d;
}

function buildLinePath(pts: { x: number; y: number }[]): string {
  if (pts.length < 2) return "";
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 1; i < pts.length; i++) {
    const prev = pts[i - 1];
    const curr = pts[i];
    const cpX = (prev.x + curr.x) / 2;
    d += ` C ${cpX} ${prev.y}, ${cpX} ${curr.y}, ${curr.x} ${curr.y}`;
  }
  return d;
}

function BalanceChart({
  snapshots,
  initialBalance,
  color,
}: {
  snapshots: MonthlySnapshot[];
  initialBalance: number;
  color: string;
}) {
  if (snapshots.length < 2) return null;
  const maxBalance = initialBalance;
  const padTop = 16;
  const padBottom = 24;
  const padX = 0;
  const usableH = CHART_H - padTop - padBottom;

  const allPts = [
    { x: padX, y: padTop },
    ...snapshots.map((s, i) => ({
      x: padX + ((i + 1) / snapshots.length) * (CHART_W - padX),
      y: padTop + (1 - s.totalBalance / maxBalance) * usableH,
    })),
  ];

  const linePath = buildLinePath(allPts);
  const areaPath = buildAreaPath(allPts, CHART_W, CHART_H - padBottom);

  const labelStep = Math.max(1, Math.floor(snapshots.length / 4));
  const labels = snapshots
    .filter((_, i) => i % labelStep === 0 || i === snapshots.length - 1)
    .map((s, _) => ({
      x: padX + ((snapshots.indexOf(s) + 1) / snapshots.length) * (CHART_W - padX),
      label: `${MONTH_NAMES[s.date.getMonth()]} '${String(s.date.getFullYear()).slice(2)}`,
    }));

  return (
    <Svg width={CHART_W} height={CHART_H}>
      <Defs>
        <SvgLinearGradient id={`grad_${color.replace("#", "")}`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={color} stopOpacity="0.35" />
          <Stop offset="1" stopColor={color} stopOpacity="0.04" />
        </SvgLinearGradient>
      </Defs>
      <Path d={areaPath} fill={`url(#grad_${color.replace("#", "")})`} />
      <Path d={linePath} stroke={color} strokeWidth={2.5} fill="none" />
      {allPts.map((p, i) =>
        i % Math.max(1, Math.floor(allPts.length / 8)) === 0 ? (
          <Circle key={i} cx={p.x} cy={p.y} r={3} fill={color} />
        ) : null
      )}
      {labels.map((l, i) => (
        <SvgText
          key={i}
          x={l.x}
          y={CHART_H - 4}
          fontSize={9}
          fill="rgba(120,140,130,0.8)"
          textAnchor="middle"
        >
          {l.label}
        </SvgText>
      ))}
    </Svg>
  );
}

export default function DebtDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const scheme = useColorScheme();
  const isDark = scheme === "dark";
  const C = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const { debts, payments, updateDebt, deleteDebt, logPayment } = useDebts();

  const debt = useMemo(() => debts.find((d) => d.id === id), [debts, id]);

  const [activeTab, setActiveTab] = useState<TabKey>("progress");
  const [editVisible, setEditVisible] = useState(false);
  const [markPaidVisible, setMarkPaidVisible] = useState(false);
  const [markPaidAmount, setMarkPaidAmount] = useState("");
  const [whatIfExtra, setWhatIfExtra] = useState(0);
  const [whatIfInput, setWhatIfInput] = useState("");

  const typeColor = debt ? (DEBT_TYPE_COLORS[debt.debtType] ?? Colors.primary) : Colors.primary;

  const debtPayments = useMemo(
    () => payments.filter((p) => p.debtId === id && !p.isMissed),
    [payments, id]
  );

  const totalPaid = useMemo(
    () => debtPayments.reduce((s, p) => s + p.amount, 0),
    [debtPayments]
  );

  const originalBalance = useMemo(
    () => (debt ? debt.balance + totalPaid : 0),
    [debt, totalPaid]
  );

  const progress = originalBalance > 0 ? totalPaid / originalBalance : 0;

  const singleResult = useMemo(
    () => (debt ? runStrategy([debt], 0, "avalanche") : null),
    [debt]
  );

  const whatIfResult = useMemo(
    () =>
      debt && whatIfExtra > 0
        ? runStrategy([debt], whatIfExtra, "avalanche")
        : null,
    [debt, whatIfExtra]
  );

  const upcomingPayments = useMemo(() => {
    if (!debt) return [];
    let balance = debt.balance;
    const monthlyRate = debt.apr / 100 / 12;
    const result: {
      date: Date;
      amount: number;
      interest: number;
      principal: number;
      balanceAfter: number;
    }[] = [];
    const now = new Date();

    for (let i = 0; i < 12 && balance > 0.01; i++) {
      const d = new Date(now);
      d.setMonth(d.getMonth() + i + 1);
      d.setDate(Math.min(debt.dueDate, 28));
      const interest = balance * monthlyRate;
      const payment = Math.min(debt.minimumPayment, balance + interest);
      const principal = Math.max(0, payment - interest);
      balance = Math.max(0, balance - principal);
      result.push({ date: d, amount: payment, interest, principal, balanceAfter: balance });
    }
    return result;
  }, [debt]);

  if (!debt) {
    return (
      <View style={[styles.root, { backgroundColor: C.background }]}>
        <Text style={[styles.notFound, { color: C.textSecondary }]}>Debt not found</Text>
      </View>
    );
  }

  const payoffDate = singleResult?.payoffDate ?? new Date();
  const totalMonths = singleResult?.totalMonths ?? 0;
  const totalInterest = singleResult?.totalInterestPaid ?? 0;
  const snapshots = singleResult?.snapshots ?? [];

  const handleDelete = () => {
    Alert.alert(
      "Delete Debt",
      `Remove "${debt.name}" permanently? This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            await deleteDebt(debt.id);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            router.back();
          },
        },
      ]
    );
  };

  const handleMarkPaid = async () => {
    const amount = parseFloat(markPaidAmount) || debt.minimumPayment;
    await logPayment({
      debtId: debt.id,
      amount,
      date: new Date().toISOString(),
      isMissed: false,
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setMarkPaidVisible(false);
    setMarkPaidAmount("");
  };

  const webTop = Platform.OS === "web" ? 67 : 0;

  return (
    <View style={[styles.root, { backgroundColor: C.background }]}>
      <LinearGradient
        colors={isDark ? [typeColor + "22", C.background] : [typeColor + "18", C.background]}
        style={[
          styles.headerGrad,
          { paddingTop: insets.top + webTop + 8 },
        ]}
      >
        <View style={styles.headerRow}>
          <Pressable
            onPress={() => router.back()}
            style={[styles.backBtn, { backgroundColor: C.surface + "CC" }]}
            hitSlop={8}
          >
            <Ionicons name="chevron-back" size={22} color={C.text} />
          </Pressable>
          <View style={styles.headerMeta}>
            <View style={[styles.headerTypeIcon, { backgroundColor: typeColor + "25" }]}>
              <Ionicons name={debtTypeIcon(debt.debtType) as any} size={18} color={typeColor} />
            </View>
            <View>
              <Text style={[styles.headerName, { color: C.text }]} numberOfLines={1}>
                {debt.name}
              </Text>
              <Text style={[styles.headerType, { color: typeColor }]}>
                {debtTypeLabel(debt.debtType)}{debt.isSecured ? " • Secured" : ""}
              </Text>
            </View>
          </View>
          <Pressable
            onPress={() => setEditVisible(true)}
            style={[styles.editBtn, { backgroundColor: C.surface + "CC" }]}
            hitSlop={8}
          >
            <Ionicons name="create-outline" size={20} color={typeColor} />
          </Pressable>
        </View>

        <View style={styles.segmentedWrap}>
          {(["progress", "transactions", "details"] as TabKey[]).map((tab) => (
            <Pressable
              key={tab}
              onPress={() => { setActiveTab(tab); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
              style={[
                styles.segTab,
                activeTab === tab && { backgroundColor: typeColor },
              ]}
            >
              <Text
                style={[
                  styles.segTabText,
                  { color: activeTab === tab ? "#fff" : C.textSecondary },
                ]}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </Text>
            </Pressable>
          ))}
        </View>
      </LinearGradient>

      <KeyboardAwareScrollViewCompat
        style={{ flex: 1 }}
        contentContainerStyle={[
          styles.scrollContent,
          Platform.OS === "web" && { paddingBottom: 34 },
        ]}
        showsVerticalScrollIndicator={false}
        bottomOffset={24}
      >
        {activeTab === "progress" && (
          <ProgressTab
            debt={debt}
            C={C}
            isDark={isDark}
            typeColor={typeColor}
            progress={progress}
            totalPaid={totalPaid}
            originalBalance={originalBalance}
            payoffDate={payoffDate}
            totalMonths={totalMonths}
            totalInterest={totalInterest}
            snapshots={snapshots}
            whatIfExtra={whatIfExtra}
            setWhatIfExtra={setWhatIfExtra}
            whatIfInput={whatIfInput}
            setWhatIfInput={setWhatIfInput}
            whatIfResult={whatIfResult}
            singleResult={singleResult}
          />
        )}

        {activeTab === "transactions" && (
          <TransactionsTab
            debt={debt}
            C={C}
            isDark={isDark}
            typeColor={typeColor}
            upcomingPayments={upcomingPayments}
            pastPayments={debtPayments}
            onMarkPaid={() => {
              setMarkPaidAmount(debt.minimumPayment.toFixed(2));
              setMarkPaidVisible(true);
            }}
            allPayments={payments}
          />
        )}

        {activeTab === "details" && (
          <DetailsTab
            debt={debt}
            C={C}
            isDark={isDark}
            typeColor={typeColor}
            totalInterest={totalInterest}
            totalMonths={totalMonths}
            onEdit={() => setEditVisible(true)}
            onDelete={handleDelete}
          />
        )}
      </KeyboardAwareScrollViewCompat>

      <Modal
        visible={editVisible}
        animationType="slide"
        presentationStyle="formSheet"
        onRequestClose={() => setEditVisible(false)}
      >
        <DebtForm
          initial={debt}
          onSave={async (data) => {
            await updateDebt(debt.id, data);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            setEditVisible(false);
          }}
          onCancel={() => setEditVisible(false)}
        />
      </Modal>

      <Modal
        visible={markPaidVisible}
        animationType="slide"
        presentationStyle="formSheet"
        onRequestClose={() => setMarkPaidVisible(false)}
      >
        <View style={[styles.paidModal, { backgroundColor: C.surface }]}>
          <View style={[styles.paidModalHeader, { borderBottomColor: C.border }]}>
            <Pressable onPress={() => setMarkPaidVisible(false)} hitSlop={12} style={styles.paidModalHeaderBtn}>
              <Ionicons name="close" size={24} color={C.textSecondary} />
            </Pressable>
            <Text style={[styles.paidModalTitle, { color: C.text }]}>Log Payment</Text>
            <Pressable onPress={handleMarkPaid} style={styles.paidModalHeaderBtn}>
              <Text style={[styles.paidModalSave, { color: Colors.primary }]}>Confirm</Text>
            </Pressable>
          </View>
          <View style={styles.paidModalBody}>
            <View style={[styles.paidModalIconWrap, { backgroundColor: Colors.primary + "18" }]}>
              <Ionicons name="checkmark-circle" size={40} color={Colors.primary} />
            </View>
            <Text style={[styles.paidModalDebtName, { color: C.text }]}>{debt.name}</Text>
            <Text style={[styles.paidModalSub, { color: C.textSecondary }]}>
              How much did you pay?
            </Text>
            <View style={[styles.paidInputCard, { backgroundColor: C.surfaceSecondary, borderColor: C.border }]}>
              <Text style={[styles.paidInputPrefix, { color: C.textSecondary }]}>$</Text>
              <TextInput
                style={[styles.paidInput, { color: C.text }]}
                value={markPaidAmount}
                onChangeText={setMarkPaidAmount}
                keyboardType="decimal-pad"
                placeholder={debt.minimumPayment.toFixed(2)}
                placeholderTextColor={C.textSecondary}
                autoFocus
              />
            </View>
            <Pressable onPress={handleMarkPaid} style={({ pressed }) => [styles.paidConfirmBtnWrap, { opacity: pressed ? 0.9 : 1 }]}>
              <LinearGradient
                colors={[Colors.primary, Colors.primaryDark]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.paidConfirmBtn}
              >
                <View style={styles.paidConfirmBtnContent}>
                  <Ionicons name="checkmark-circle" size={20} color="#fff" />
                  <Text style={styles.paidConfirmText}>Mark as Paid</Text>
                </View>
              </LinearGradient>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function ProgressTab({
  debt, C, isDark, typeColor, progress, totalPaid, originalBalance,
  payoffDate, totalMonths, totalInterest, snapshots,
  whatIfExtra, setWhatIfExtra, whatIfInput, setWhatIfInput,
  whatIfResult, singleResult,
}: any) {
  const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const interestSaved = whatIfResult
    ? Math.max(0, (singleResult?.totalInterestPaid ?? 0) - whatIfResult.totalInterestPaid)
    : 0;
  const monthsSaved = whatIfResult
    ? Math.max(0, (singleResult?.totalMonths ?? 0) - whatIfResult.totalMonths)
    : 0;

  return (
    <View style={styles.tabContent}>
      <View style={[styles.card, { backgroundColor: C.surface, borderColor: C.border }]}>
        <Text style={[styles.cardLabel, { color: C.textSecondary }]}>Debt-Free Date</Text>
        <Text style={[styles.payoffDateLarge, { color: C.text }]}>
          {MONTH_NAMES[payoffDate.getMonth()]} {payoffDate.getFullYear()}
        </Text>
        <Text style={[styles.payoffSub, { color: typeColor }]}>
          {monthsToText(totalMonths)} from today
        </Text>
      </View>

      <View style={[styles.card, { backgroundColor: C.surface, borderColor: C.border }]}>
        <View style={styles.ringAndStats}>
          <View style={styles.ringWrap}>
            <ProgressRing
              size={160}
              strokeWidth={16}
              progress={progress}
              color={Colors.progressGreen}
              trackColor={Colors.progressGreen + "20"}
            />
            <View style={styles.ringCenter}>
              <Text
                style={[styles.ringPct, { color: Colors.progressGreen }]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.5}
              >
                {Math.round(progress * 100)}%
              </Text>
              <Text style={[styles.ringLabel, { color: C.textSecondary }]}>paid</Text>
            </View>
          </View>

          <View style={styles.ringStats}>
            <View style={styles.ringStat}>
              <Text style={[styles.ringStatLabel, { color: C.textSecondary }]}>Principal Paid</Text>
              <Text style={[styles.ringStatValue, { color: Colors.progressGreen }]}>
                {formatCurrency(totalPaid)}
              </Text>
            </View>
            <View style={[styles.ringStatDivider, { backgroundColor: C.border }]} />
            <View style={styles.ringStat}>
              <Text style={[styles.ringStatLabel, { color: C.textSecondary }]}>Remaining</Text>
              <Text style={[styles.ringStatValue, { color: Colors.danger }]}>
                {formatCurrency(debt.balance)}
              </Text>
            </View>
            <View style={[styles.ringStatDivider, { backgroundColor: C.border }]} />
            <View style={styles.ringStat}>
              <Text style={[styles.ringStatLabel, { color: C.textSecondary }]}>Total Interest</Text>
              <Text style={[styles.ringStatValue, { color: Colors.warning }]}>
                {formatCurrency(totalInterest)}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {snapshots.length > 2 && (
        <View style={[styles.card, { backgroundColor: C.surface, borderColor: C.border }]}>
          <Text style={[styles.cardTitle, { color: C.text }]}>Balance Over Time</Text>
          <View style={styles.chartWrap}>
            <View style={styles.chartYLabel}>
              <Text style={[styles.chartAxisText, { color: C.textSecondary }]}>
                {formatCurrency(debt.balance)}
              </Text>
              <Text style={[styles.chartAxisText, { color: C.textSecondary }]}>$0</Text>
            </View>
            <BalanceChart
              snapshots={snapshots}
              initialBalance={debt.balance}
              color={typeColor}
            />
          </View>
        </View>
      )}

      <View style={[styles.card, { backgroundColor: C.surface, borderColor: C.border }]}>
        <View style={styles.cardTitleRow}>
          <Ionicons name="bulb" size={16} color={Colors.warning} />
          <Text style={[styles.cardTitle, { color: C.text }]}>What If I Pay Extra?</Text>
        </View>
        <Text style={[styles.whatIfSub, { color: C.textSecondary }]}>
          Enter an extra monthly amount to see the impact
        </Text>
        <View style={styles.whatIfInputRow}>
          <Text style={[styles.whatIfPrefix, { color: C.textSecondary }]}>+$</Text>
          <TextInput
            style={[styles.whatIfInput, { backgroundColor: C.surfaceSecondary, color: C.text, borderColor: typeColor }]}
            value={whatIfInput}
            onChangeText={(v) => {
              setWhatIfInput(v.replace(/[^0-9]/g, ""));
              setWhatIfExtra(parseInt(v.replace(/[^0-9]/g, "")) || 0);
            }}
            placeholder="0"
            placeholderTextColor={C.textSecondary}
            keyboardType="number-pad"
          />
          <Text style={[styles.whatIfSuffix, { color: C.textSecondary }]}>/month</Text>
        </View>
        <View style={styles.whatIfQuickRow}>
          {[50, 100, 200, 500].map((v) => (
            <Pressable
              key={v}
              onPress={() => { setWhatIfExtra(v); setWhatIfInput(String(v)); }}
              style={[
                styles.whatIfQuickBtn,
                { backgroundColor: whatIfExtra === v ? typeColor + "20" : C.surfaceSecondary, borderColor: whatIfExtra === v ? typeColor : C.border },
              ]}
            >
              <Text style={[styles.whatIfQuickText, { color: whatIfExtra === v ? typeColor : C.textSecondary }]}>
                +${v}
              </Text>
            </Pressable>
          ))}
        </View>
        {whatIfResult && whatIfExtra > 0 && (
          <View style={[styles.whatIfResult, { backgroundColor: typeColor + "10", borderColor: typeColor + "30" }]}>
            <View style={styles.whatIfResultStat}>
              <Text style={[styles.whatIfResultLabel, { color: C.textSecondary }]}>New Payoff</Text>
              <Text style={[styles.whatIfResultValue, { color: typeColor }]}>
                {MONTH_NAMES[whatIfResult.payoffDate.getMonth()]} {whatIfResult.payoffDate.getFullYear()}
              </Text>
            </View>
            <View style={[styles.whatIfResultDivider, { backgroundColor: typeColor + "30" }]} />
            <View style={styles.whatIfResultStat}>
              <Text style={[styles.whatIfResultLabel, { color: C.textSecondary }]}>Saves</Text>
              <Text style={[styles.whatIfResultValue, { color: typeColor }]}>
                {formatCurrency(interestSaved)}
              </Text>
            </View>
            <View style={[styles.whatIfResultDivider, { backgroundColor: typeColor + "30" }]} />
            <View style={styles.whatIfResultStat}>
              <Text style={[styles.whatIfResultLabel, { color: C.textSecondary }]}>Sooner</Text>
              <Text style={[styles.whatIfResultValue, { color: typeColor }]}>
                {monthsToText(monthsSaved)}
              </Text>
            </View>
          </View>
        )}
      </View>
    </View>
  );
}

function TransactionsTab({
  debt, C, isDark, typeColor, upcomingPayments, pastPayments, onMarkPaid, allPayments,
}: any) {
  const [tab, setTab] = useState<"upcoming" | "past">("upcoming");

  return (
    <View style={styles.tabContent}>
      <View style={[styles.subSegmented, { backgroundColor: C.surfaceSecondary, borderColor: C.border }]}>
        {(["upcoming", "past"] as const).map((t) => (
          <Pressable
            key={t}
            onPress={() => setTab(t)}
            style={[
              styles.subSegTab,
              tab === t && { backgroundColor: typeColor },
            ]}
          >
            <Text style={[styles.subSegText, { color: tab === t ? "#fff" : C.textSecondary }]}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </Text>
          </Pressable>
        ))}
      </View>

      {tab === "upcoming" && (
        <View>
          <Pressable
            onPress={onMarkPaid}
            style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}
          >
            <LinearGradient
              colors={[typeColor, typeColor + "CC"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.markPaidBtn}
            >
              <Ionicons name="checkmark-circle" size={18} color="#fff" />
              <Text style={styles.markPaidText}>Mark Payment as Paid</Text>
            </LinearGradient>
          </Pressable>

          <View style={styles.timelineContainer}>
            {upcomingPayments.map((p: any, i: number) => (
              <View key={i} style={styles.timelineItem}>
                <View style={styles.timelineLeft}>
                  <View style={[styles.timelineDot, { borderColor: typeColor, backgroundColor: i === 0 ? typeColor : "transparent" }]} />
                  {i < upcomingPayments.length - 1 && (
                    <View style={[styles.timelineLine, { backgroundColor: typeColor + "30" }]} />
                  )}
                </View>
                <View style={[styles.timelineContent, { backgroundColor: C.surface, borderColor: C.border }]}>
                  <View style={styles.timelineRow}>
                    <Text style={[styles.timelineDate, { color: C.text }]}>
                      {formatDate(p.date)}
                    </Text>
                    <Text style={[styles.timelineAmount, { color: i === 0 ? typeColor : C.text }]}>
                      {formatCurrencyFull(p.amount)}
                    </Text>
                  </View>
                  <View style={styles.timelineRow}>
                    <View style={[styles.timelineBadge, { backgroundColor: typeColor + "18" }]}>
                      <Text style={[styles.timelineBadgeText, { color: typeColor }]}>Minimum</Text>
                    </View>
                    <Text style={[styles.timelineBalAfter, { color: C.textSecondary }]}>
                      Balance: {formatCurrency(p.balanceAfter)}
                    </Text>
                  </View>
                </View>
              </View>
            ))}
            {upcomingPayments.length === 0 && (
              <View style={styles.emptyTransactions}>
                <Ionicons name="checkmark-done-circle" size={40} color={Colors.progressGreen} />
                <Text style={[styles.emptyTransText, { color: C.textSecondary }]}>
                  This debt is fully paid off!
                </Text>
              </View>
            )}
          </View>
        </View>
      )}

      {tab === "past" && (
        <View style={styles.timelineContainer}>
          {pastPayments.length === 0 ? (
            <View style={styles.emptyTransactions}>
              <Ionicons name="receipt-outline" size={40} color={C.textSecondary} />
              <Text style={[styles.emptyTransText, { color: C.textSecondary }]}>
                No payments logged yet.{"\n"}Use "Mark as Paid" to track payments.
              </Text>
            </View>
          ) : (
            [...pastPayments].reverse().map((p: any, i: number) => (
              <View key={p.id} style={styles.timelineItem}>
                <View style={styles.timelineLeft}>
                  <View style={[styles.timelineDot, { borderColor: Colors.progressGreen, backgroundColor: Colors.progressGreen }]}>
                    <Ionicons name="checkmark" size={8} color="#fff" />
                  </View>
                  {i < pastPayments.length - 1 && (
                    <View style={[styles.timelineLine, { backgroundColor: Colors.progressGreen + "30" }]} />
                  )}
                </View>
                <View style={[styles.timelineContent, { backgroundColor: C.surface, borderColor: C.border }]}>
                  <View style={styles.timelineRow}>
                    <Text style={[styles.timelineDate, { color: C.text }]}>
                      {new Date(p.date).toLocaleDateString()}
                    </Text>
                    <Text style={[styles.timelineAmount, { color: Colors.progressGreen }]}>
                      {formatCurrencyFull(p.amount)}
                    </Text>
                  </View>
                  <View style={[styles.timelineBadge, { backgroundColor: Colors.progressGreen + "15" }]}>
                    <Text style={[styles.timelineBadgeText, { color: Colors.progressGreen }]}>Paid</Text>
                  </View>
                </View>
              </View>
            ))
          )}
        </View>
      )}
    </View>
  );
}

function DetailsTab({
  debt, C, isDark, typeColor, totalInterest, totalMonths, onEdit, onDelete,
}: any) {
  const sections = [
    {
      title: "Loan Info",
      icon: "information-circle-outline",
      rows: [
        { label: "Nickname", value: debt.name },
        { label: "Category", value: debtTypeLabel(debt.debtType) },
        { label: "Collateral", value: debt.isSecured ? "Secured" : "Unsecured" },
        { label: "Date Added", value: new Date(debt.dateAdded).toLocaleDateString() },
      ],
    },
    {
      title: "Balance & Rate",
      icon: "wallet-outline",
      rows: [
        { label: "Current Balance", value: formatCurrencyFull(debt.balance) },
        { label: "Annual Percentage Rate", value: `${debt.apr}%` },
        { label: "Monthly Interest", value: formatCurrencyFull(debt.balance * (debt.apr / 100 / 12)) },
        { label: "Total Interest to Pay", value: formatCurrencyFull(totalInterest) },
      ],
    },
    {
      title: "Payment Terms",
      icon: "repeat-outline",
      rows: [
        { label: "Minimum Payment", value: formatCurrencyFull(debt.minimumPayment) },
        { label: "Payment Frequency", value: "Once per month" },
        { label: "Due Day", value: ordinal(debt.dueDate) + " of the month" },
        { label: "Payoff in", value: monthsToText(totalMonths) },
      ],
    },
  ];

  return (
    <View style={styles.tabContent}>
      {sections.map((s) => (
        <View key={s.title} style={[styles.card, { backgroundColor: C.surface, borderColor: C.border }]}>
          <View style={styles.cardTitleRow}>
            <Ionicons name={s.icon as any} size={16} color={typeColor} />
            <Text style={[styles.cardTitle, { color: C.text }]}>{s.title}</Text>
          </View>
          {s.rows.map((r, i) => (
            <View
              key={r.label}
              style={[
                styles.detailsRow,
                i < s.rows.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.border },
              ]}
            >
              <Text style={[styles.detailsLabel, { color: C.textSecondary }]}>{r.label}</Text>
              <Text style={[styles.detailsValue, { color: C.text }]} numberOfLines={1}>
                {r.value}
              </Text>
            </View>
          ))}
        </View>
      ))}

      <Pressable
        onPress={onEdit}
        style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}
      >
        <LinearGradient
          colors={[typeColor, typeColor + "CC"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.editAllBtn}
        >
          <Ionicons name="create" size={18} color="#fff" />
          <Text style={styles.editAllText}>Edit All Details</Text>
        </LinearGradient>
      </Pressable>

      <Pressable
        onPress={onDelete}
        style={({ pressed }) => [
          styles.deleteBtn,
          { backgroundColor: Colors.danger + "10", borderColor: Colors.danger + "30", opacity: pressed ? 0.8 : 1 },
        ]}
      >
        <Ionicons name="trash-outline" size={18} color={Colors.danger} />
        <Text style={[styles.deleteBtnText, { color: Colors.danger }]}>Delete Debt</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  notFound: { flex: 1, textAlign: "center", marginTop: 100 },
  headerGrad: {
    paddingHorizontal: 16,
    paddingBottom: 0,
    gap: 14,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  headerMeta: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  headerTypeIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  headerName: {
    fontSize: 17,
    fontWeight: "700",
  },
  headerType: {
    fontSize: 12,
    fontWeight: "600",
    marginTop: 1,
  },
  editBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  segmentedWrap: {
    flexDirection: "row",
    backgroundColor: "rgba(0,0,0,0.08)",
    borderRadius: 12,
    padding: 3,
    marginBottom: 12,
  },
  segTab: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 8,
    borderRadius: 10,
  },
  segTabText: {
    fontSize: 13,
    fontWeight: "600",
  },
  scrollContent: {
    padding: 16,
    gap: 14,
    paddingBottom: 40,
  },
  tabContent: { gap: 14 },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 12,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  cardLabel: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  cardTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  payoffDateLarge: {
    fontSize: 34,
    fontWeight: "800",
    letterSpacing: -1,
    marginTop: 4,
  },
  payoffSub: {
    fontSize: 14,
    fontWeight: "600",
    marginTop: -4,
  },
  ringAndStats: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  ringWrap: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },
  ringCenter: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
    maxWidth: "75%",
  },
  ringPct: {
    fontSize: 26,
    fontWeight: "800",
    letterSpacing: -1,
  },
  ringLabel: {
    fontSize: 11,
    marginTop: -2,
  },
  ringStats: {
    flex: 1,
    gap: 10,
  },
  ringStat: { gap: 2 },
  ringStatLabel: {
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  ringStatValue: {
    fontSize: 15,
    fontWeight: "700",
  },
  ringStatDivider: {
    height: StyleSheet.hairlineWidth,
  },
  chartWrap: {
    flexDirection: "row",
    alignItems: "stretch",
    gap: 4,
    overflow: "hidden",
  },
  chartYLabel: {
    justifyContent: "space-between",
    paddingVertical: 16,
  },
  chartAxisText: {
    fontSize: 9,
    fontWeight: "500",
  },
  whatIfSub: { fontSize: 13, marginTop: -4 },
  whatIfInputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  whatIfPrefix: {
    fontSize: 16,
    fontWeight: "600",
  },
  whatIfInput: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === "ios" ? 11 : 9,
    fontSize: 18,
    fontWeight: "700",
  },
  whatIfSuffix: { fontSize: 13 },
  whatIfQuickRow: {
    flexDirection: "row",
    gap: 8,
  },
  whatIfQuickBtn: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
  },
  whatIfQuickText: {
    fontSize: 13,
    fontWeight: "600",
  },
  whatIfResult: {
    flexDirection: "row",
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
  },
  whatIfResultStat: {
    flex: 1,
    alignItems: "center",
    gap: 3,
  },
  whatIfResultLabel: {
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  whatIfResultValue: {
    fontSize: 14,
    fontWeight: "700",
  },
  whatIfResultDivider: {
    width: StyleSheet.hairlineWidth,
  },
  subSegmented: {
    flexDirection: "row",
    borderRadius: 12,
    borderWidth: 1,
    padding: 3,
    gap: 3,
  },
  subSegTab: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 8,
    borderRadius: 9,
  },
  subSegText: {
    fontSize: 13,
    fontWeight: "600",
  },
  markPaidBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 14,
    paddingVertical: 14,
    marginBottom: 16,
  },
  markPaidText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  timelineContainer: {
    gap: 0,
  },
  timelineItem: {
    flexDirection: "row",
    gap: 12,
    minHeight: 72,
  },
  timelineLeft: {
    alignItems: "center",
    width: 20,
    paddingTop: 4,
  },
  timelineDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  timelineLine: {
    flex: 1,
    width: 2,
    marginTop: 4,
    marginBottom: -4,
  },
  timelineContent: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    gap: 6,
    marginBottom: 8,
  },
  timelineRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  timelineDate: {
    fontSize: 14,
    fontWeight: "600",
  },
  timelineAmount: {
    fontSize: 15,
    fontWeight: "700",
  },
  timelineBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  timelineBadgeText: {
    fontSize: 11,
    fontWeight: "700",
  },
  timelineBalAfter: {
    fontSize: 12,
  },
  emptyTransactions: {
    alignItems: "center",
    gap: 12,
    paddingVertical: 32,
  },
  emptyTransText: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
  detailsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 11,
  },
  detailsLabel: {
    fontSize: 14,
  },
  detailsValue: {
    fontSize: 14,
    fontWeight: "600",
    maxWidth: "55%",
    textAlign: "right",
  },
  editAllBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 14,
    paddingVertical: 15,
  },
  editAllText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  deleteBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 14,
    paddingVertical: 15,
    borderWidth: 1,
  },
  deleteBtnText: {
    fontSize: 16,
    fontWeight: "700",
  },
  paidModal: {
    flex: 1,
  },
  paidModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  paidModalHeaderBtn: {
    minWidth: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  paidModalTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
  },
  paidModalSave: {
    fontSize: 16,
    fontWeight: "600",
  },
  paidModalBody: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 24,
    alignItems: "center",
  },
  paidModalIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  paidModalDebtName: {
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 4,
  },
  paidModalSub: {
    fontSize: 15,
    textAlign: "center",
    marginBottom: 20,
  },
  paidInputCard: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 4,
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  paidInputPrefix: {
    fontSize: 24,
    fontWeight: "600",
    marginRight: 4,
  },
  paidInput: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 26,
    fontWeight: "700",
    textAlign: "center",
  },
  paidConfirmBtnWrap: {
    width: "100%",
  },
  paidConfirmBtn: {
    borderRadius: 14,
    paddingVertical: 16,
    width: "100%",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  paidConfirmBtnContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  paidConfirmText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "700",
    textAlign: "center",
  },
});
