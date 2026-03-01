import React, { useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  useColorScheme,
  Platform,
  Switch,
  Animated,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { Debt, DebtType, debtTypeLabel, debtTypeIcon, isSecuredByType } from "@/lib/calculations";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";

const DEBT_TYPES: { key: DebtType; icon: string; color: string }[] = [
  { key: "creditCard", icon: "card", color: "#3498DB" },
  { key: "personalLoan", icon: "cash", color: "#9B59B6" },
  { key: "studentLoan", icon: "school", color: "#E67E22" },
  { key: "medical", icon: "medkit", color: "#E74C3C" },
  { key: "auto", icon: "car", color: "#1ABC9C" },
  { key: "taxDebt", icon: "business", color: "#F39C12" },
  { key: "other", icon: "ellipsis-horizontal-circle", color: "#95A5A6" },
];

interface Props {
  initial?: Partial<Debt>;
  onSave: (debt: Omit<Debt, "id" | "dateAdded">) => Promise<void> | void;
  onCancel: () => void;
}

function formatCurrencyInput(value: string): string {
  const digits = value.replace(/[^0-9.]/g, "");
  const parts = digits.split(".");
  if (parts.length > 2) return value.slice(0, -1);
  return digits;
}

export function DebtForm({ initial, onSave, onCancel }: Props) {
  const scheme = useColorScheme();
  const isDark = scheme === "dark";
  const C = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();

  const [name, setName] = useState(initial?.name ?? "");
  const [balance, setBalance] = useState(
    initial?.balance ? initial.balance.toString() : ""
  );
  const [apr, setApr] = useState(
    initial?.apr ? initial.apr.toString() : ""
  );
  const [minPayment, setMinPayment] = useState(
    initial?.minimumPayment ? initial.minimumPayment.toString() : ""
  );
  const [debtType, setDebtType] = useState<DebtType>(
    initial?.debtType ?? "creditCard"
  );
  const [isSecured, setIsSecured] = useState(initial?.isSecured ?? false);
  const [dueDate, setDueDate] = useState(
    initial?.dueDate ? initial.dueDate.toString() : "1"
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const shakeAnim = useRef(new Animated.Value(0)).current;

  const selectedType = DEBT_TYPES.find((t) => t.key === debtType)!;

  const handleTypeSelect = (type: DebtType) => {
    setDebtType(type);
    setIsSecured(isSecuredByType(type));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const shake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 6, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -6, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = "Creditor name is required";
    const b = parseFloat(balance);
    if (isNaN(b) || b <= 0) errs.balance = "Enter a valid balance greater than $0";
    const a = parseFloat(apr);
    if (isNaN(a) || a < 0 || a > 100) errs.apr = "APR must be between 0% and 100%";
    const m = parseFloat(minPayment);
    if (isNaN(m) || m < 0) errs.minPayment = "Enter a valid minimum payment";
    const dd = parseInt(dueDate);
    if (isNaN(dd) || dd < 1 || dd > 28) errs.dueDate = "Due date must be between 1 and 28";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) {
      shake();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    setSaving(true);
    try {
      await onSave({
        name: name.trim(),
        balance: parseFloat(balance),
        apr: parseFloat(apr),
        minimumPayment: parseFloat(minPayment),
        debtType,
        isSecured,
        dueDate: parseInt(dueDate),
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } finally {
      setSaving(false);
    }
  };

  const inputBase = {
    backgroundColor: C.surfaceSecondary,
    color: C.text,
    borderColor: C.border,
  };

  return (
    <View style={[styles.container, { backgroundColor: C.background }]}>
      <View style={[styles.header, { backgroundColor: C.surface, borderBottomColor: C.border }]}>
        <Pressable
          onPress={onCancel}
          style={({ pressed }) => [styles.headerIconBtn, { opacity: pressed ? 0.6 : 1 }]}
          hitSlop={12}
        >
          <Ionicons name="close" size={24} color={C.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: C.text }]}>
          {initial?.id ? "Edit Debt" : "Add Debt"}
        </Text>
        <View style={{ width: 44 }} />
      </View>

      <KeyboardAwareScrollViewCompat
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 100 },
        ]}
        bottomOffset={80}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.card, { backgroundColor: C.surface, borderColor: C.border }]}>
          <Text style={[styles.sectionLabel, { color: C.textSecondary }]}>Debt Type</Text>
          <View style={styles.typeGrid}>
            {DEBT_TYPES.map((t) => {
              const isActive = debtType === t.key;
              return (
                <Pressable
                  key={t.key}
                  onPress={() => handleTypeSelect(t.key)}
                  style={[
                    styles.typeChip,
                    {
                      backgroundColor: isActive ? t.color + "18" : C.surfaceSecondary,
                      borderColor: isActive ? t.color : "transparent",
                    },
                  ]}
                >
                  <Ionicons
                    name={t.icon as any}
                    size={16}
                    color={isActive ? t.color : C.textSecondary}
                  />
                  <Text
                    style={[
                      styles.typeChipLabel,
                      { color: isActive ? t.color : C.textSecondary, fontWeight: isActive ? "600" : "500" },
                    ]}
                    numberOfLines={1}
                  >
                    {debtTypeLabel(t.key)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <Animated.View
          style={[styles.card, styles.fieldsSection, { backgroundColor: C.surface, borderColor: C.border, transform: [{ translateX: shakeAnim }] }]}
        >
          <FormField label="Creditor Name" error={errors.name} C={C}>
            <TextInput
              style={[styles.input, inputBase, errors.name && styles.inputError]}
              value={name}
              onChangeText={(v) => { setName(v); if (errors.name) setErrors((e) => ({ ...e, name: "" })); }}
              placeholder="e.g. Chase Sapphire, Student Aid"
              placeholderTextColor={C.textSecondary}
              autoCapitalize="words"
              returnKeyType="next"
            />
          </FormField>

          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <FormField label="Current Balance" prefix="$" error={errors.balance} C={C}>
                <TextInput
                  style={[styles.input, styles.inputWithPrefix, inputBase, errors.balance && styles.inputError]}
                  value={balance}
                  onChangeText={(v) => {
                    setBalance(formatCurrencyInput(v));
                    if (errors.balance) setErrors((e) => ({ ...e, balance: "" }));
                  }}
                  placeholder="5,000"
                  placeholderTextColor={C.textSecondary}
                  keyboardType="decimal-pad"
                  returnKeyType="next"
                />
              </FormField>
            </View>
            <View style={{ flex: 1 }}>
              <FormField label="Interest Rate" suffix="%" error={errors.apr} C={C}>
                <TextInput
                  style={[styles.input, styles.inputWithSuffix, inputBase, errors.apr && styles.inputError]}
                  value={apr}
                  onChangeText={(v) => {
                    setApr(formatCurrencyInput(v));
                    if (errors.apr) setErrors((e) => ({ ...e, apr: "" }));
                  }}
                  placeholder="18.99"
                  placeholderTextColor={C.textSecondary}
                  keyboardType="decimal-pad"
                  returnKeyType="next"
                />
              </FormField>
            </View>
          </View>

          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <FormField label="Min. Payment" prefix="$" error={errors.minPayment} C={C}>
                <TextInput
                  style={[styles.input, styles.inputWithPrefix, inputBase, errors.minPayment && styles.inputError]}
                  value={minPayment}
                  onChangeText={(v) => {
                    setMinPayment(formatCurrencyInput(v));
                    if (errors.minPayment) setErrors((e) => ({ ...e, minPayment: "" }));
                  }}
                  placeholder="150"
                  placeholderTextColor={C.textSecondary}
                  keyboardType="decimal-pad"
                  returnKeyType="next"
                />
              </FormField>
            </View>
            <View style={{ flex: 1 }}>
              <FormField label="Due Day" error={errors.dueDate} C={C} hint="1–28">
                <TextInput
                  style={[styles.input, inputBase, errors.dueDate && styles.inputError]}
                  value={dueDate}
                  onChangeText={(v) => {
                    const digits = v.replace(/[^0-9]/g, "");
                    setDueDate(digits);
                    if (errors.dueDate) setErrors((e) => ({ ...e, dueDate: "" }));
                  }}
                  placeholder="15"
                  placeholderTextColor={C.textSecondary}
                  keyboardType="number-pad"
                  maxLength={2}
                  returnKeyType="done"
                />
              </FormField>
            </View>
          </View>

          <View style={[styles.securedRow, { backgroundColor: C.surfaceSecondary, borderColor: C.border }]}>
            <Ionicons name="lock-closed-outline" size={20} color={Colors.warning} />
            <View style={styles.securedText}>
              <Text style={[styles.securedLabel, { color: C.text }]}>Secured Debt</Text>
              <Text style={[styles.securedSub, { color: C.textSecondary }]}>Collateral-backed (auto, mortgage)</Text>
            </View>
            <Switch
              value={isSecured}
              onValueChange={(v) => {
                setIsSecured(v);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
              trackColor={{ true: Colors.primary, false: C.border }}
              thumbColor="#fff"
              ios_backgroundColor={C.border}
            />
          </View>

          {parseFloat(balance) > 0 && parseFloat(apr) > 0 && parseFloat(minPayment) > 0 && (
            <View style={[styles.previewCard, { backgroundColor: Colors.primary + "12", borderColor: Colors.primary + "30" }]}>
              <Ionicons name="calculator-outline" size={18} color={Colors.primary} />
              <Text style={[styles.previewText, { color: C.text }]}>
                ~${(parseFloat(balance) * (parseFloat(apr) / 100 / 12)).toFixed(2)}/mo in interest
              </Text>
            </View>
          )}
        </Animated.View>
      </KeyboardAwareScrollViewCompat>

      <View
        style={[
          styles.footer,
          {
            backgroundColor: C.surface,
            borderTopColor: C.border,
            paddingBottom: Math.max(insets.bottom, 20),
          },
        ]}
      >
        {Object.keys(errors).length > 0 && (
          <View style={styles.errorSummary}>
            <Ionicons name="alert-circle" size={14} color={Colors.danger} />
            <Text style={styles.errorSummaryText}>
              {Object.values(errors).find(Boolean)}
            </Text>
          </View>
        )}
        <Pressable
          onPress={handleSave}
          disabled={saving}
          style={({ pressed }) => [{ opacity: pressed || saving ? 0.8 : 1 }]}
        >
          <LinearGradient
            colors={[Colors.primary, Colors.primaryDark]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.saveBtn}
          >
            {saving ? (
              <Text style={styles.saveBtnText}>Saving…</Text>
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={20} color="#fff" />
                <Text style={styles.saveBtnText}>
                  {initial?.id ? "Save Changes" : "Add Debt"}
                </Text>
              </>
            )}
          </LinearGradient>
        </Pressable>
      </View>
    </View>
  );
}

function FormField({
  label,
  error,
  prefix,
  suffix,
  hint,
  C,
  children,
}: {
  label: string;
  error?: string;
  prefix?: string;
  suffix?: string;
  hint?: string;
  C: typeof Colors.light;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.field}>
      <View style={styles.fieldLabelRow}>
        <Text style={[styles.fieldLabel, { color: C.textSecondary }]}>{label}</Text>
        {hint && (
          <Text style={[styles.fieldHint, { color: C.textSecondary }]}>{hint}</Text>
        )}
      </View>
      <View style={styles.fieldInputWrap}>
        {prefix && (
          <Text style={[styles.adornment, styles.adornmentLeft, { color: C.textSecondary }]}>
            {prefix}
          </Text>
        )}
        {children}
        {suffix && (
          <Text style={[styles.adornment, styles.adornmentRight, { color: C.textSecondary }]}>
            {suffix}
          </Text>
        )}
      </View>
      {error ? (
        <View style={styles.errorRow}>
          <Ionicons name="alert-circle" size={12} color={Colors.danger} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}
    </View>
  );
}

const ADORNMENT_H = Platform.OS === "ios" ? 46 : undefined;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerIconBtn: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: -0.3,
  },
  scroll: { flex: 1 },
  scrollContent: {
    padding: 16,
    gap: 16,
  },
  card: {
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  typeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  typeChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 8,
    borderWidth: 1.5,
  },
  typeChipLabel: {
    fontSize: 13,
  },
  fieldsSection: { gap: 16 },
  row: { flexDirection: "row", gap: 10 },
  field: { gap: 5 },
  fieldLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: "500",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    flex: 1,
  },
  fieldHint: {
    fontSize: 11,
  },
  fieldInputWrap: {
    position: "relative",
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === "ios" ? 14 : 12,
    fontSize: 16,
    fontWeight: "500",
  },
  inputWithPrefix: {
    paddingLeft: 26,
  },
  inputWithSuffix: {
    paddingRight: 26,
  },
  inputError: {
    borderColor: Colors.danger,
  },
  adornment: {
    position: "absolute",
    fontSize: 15,
    fontWeight: "500",
    zIndex: 1,
    height: ADORNMENT_H,
    lineHeight: ADORNMENT_H,
    top: Platform.OS === "android" ? 11 : 0,
  },
  adornmentLeft: {
    left: 12,
  },
  adornmentRight: {
    right: 12,
  },
  errorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 1,
  },
  errorText: {
    color: Colors.danger,
    fontSize: 11,
    flex: 1,
  },
  securedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
  },
  securedText: { flex: 1 },
  securedLabel: { fontSize: 15, fontWeight: "600" },
  securedSub: { fontSize: 12, marginTop: 2, lineHeight: 16 },
  previewCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
  },
  previewText: {
    fontSize: 14,
    fontWeight: "500",
    flex: 1,
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  errorSummary: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  errorSummaryText: {
    color: Colors.danger,
    fontSize: 13,
    flex: 1,
  },
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 14,
    paddingVertical: 15,
  },
  saveBtnText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "700",
  },
});
