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
  Modal,
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
  { key: "businessDebt", icon: "briefcase", color: "#34495E" },
  { key: "other", icon: "ellipsis-horizontal-circle", color: "#95A5A6" },
];

interface Props {
  initial?: Partial<Debt>;
  onSave: (debt: Omit<Debt, "id" | "dateAdded">) => Promise<void> | void;
  onCancel: () => void;
  headerExtra?: React.ReactNode;
  title?: string;
}

function formatCurrencyInput(value: string): string {
  const digits = value.replace(/[^0-9.]/g, "");
  const parts = digits.split(".");
  if (parts.length > 2) return value.slice(0, -1);
  return digits;
}

export function DebtForm({ initial, onSave, onCancel, headerExtra, title }: Props) {
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
  const [categoryPickerOpen, setCategoryPickerOpen] = useState(false);

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
    if (isNaN(dd) || dd < 1 || dd > 31) errs.dueDate = "Due date must be between 1 and 31";
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
    backgroundColor: "transparent",
    color: C.text,
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
          {title ?? "Debt Details"}
        </Text>
        <View style={{ width: 44 }} />
      </View>

      {headerExtra && (
        <View style={[styles.headerExtra]}>
          {headerExtra}
        </View>
      )}

      <KeyboardAwareScrollViewCompat
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 100 },
        ]}
        bottomOffset={80}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View
          style={[
            styles.fieldsSection,
            {
              paddingHorizontal: 0,
              paddingTop: 12,
              paddingBottom: 24,
              transform: [{ translateX: shakeAnim }],
            },
          ]}
        >
          <FormField label="Category *" error={errors.debtType} C={C}>
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setCategoryPickerOpen(true);
              }}
              style={[
                styles.selectInput,
                {
                  backgroundColor: C.surfaceSecondary,
                  borderColor: errors.debtType ? Colors.danger : C.border,
                },
              ]}
            >
              <Text style={[styles.selectText, { color: C.text }]}>
                {debtTypeLabel(debtType)}
              </Text>
              <Ionicons name="chevron-down" size={18} color={C.textSecondary} />
            </Pressable>
          </FormField>

          <FormField label="Nickname *" error={errors.name} C={C}>
            <TextInput
              style={[styles.input, inputBase, errors.name && styles.inputError]}
              value={name}
              onChangeText={(v) => { setName(v); if (errors.name) setErrors((e) => ({ ...e, name: "" })); }}
              placeholder="e.g. Chase Sapphire, Student Aid"
              placeholderTextColor={C.textSecondary + "99"}
              autoCapitalize="words"
              returnKeyType="next"
              onFocus={() => Haptics.selectionAsync()}
            />
          </FormField>

          <FormField label="Current balance *" prefix="$" error={errors.balance} C={C}>
            <TextInput
              style={[styles.input, styles.inputWithPrefix, inputBase, errors.balance && styles.inputError]}
              value={balance}
              onChangeText={(v) => {
                setBalance(formatCurrencyInput(v));
                if (errors.balance) setErrors((e) => ({ ...e, balance: "" }));
              }}
              placeholder="5,000"
                  placeholderTextColor={C.textSecondary + "99"}
              keyboardType="decimal-pad"
              returnKeyType="next"
              onFocus={() => Haptics.selectionAsync()}
            />
          </FormField>

          <FormField label="Annual Percentage Rate *" suffix="%" error={errors.apr} C={C}>
            <TextInput
              style={[styles.input, styles.inputWithSuffix, inputBase, errors.apr && styles.inputError]}
              value={apr}
              onChangeText={(v) => {
                setApr(formatCurrencyInput(v));
                if (errors.apr) setErrors((e) => ({ ...e, apr: "" }));
              }}
              placeholder="18.99"
                  placeholderTextColor={C.textSecondary + "99"}
              keyboardType="decimal-pad"
              returnKeyType="next"
              onFocus={() => Haptics.selectionAsync()}
            />
          </FormField>

          <FormField label="Minimum payment *" prefix="$" error={errors.minPayment} C={C}>
            <TextInput
              style={[styles.input, styles.inputWithPrefix, inputBase, errors.minPayment && styles.inputError]}
              value={minPayment}
              onChangeText={(v) => {
                setMinPayment(formatCurrencyInput(v));
                if (errors.minPayment) setErrors((e) => ({ ...e, minPayment: "" }));
              }}
              placeholder="150"
                  placeholderTextColor={C.textSecondary + "99"}
              keyboardType="decimal-pad"
              returnKeyType="next"
              onFocus={() => Haptics.selectionAsync()}
            />
          </FormField>

          <FormField label="Day of the month *" error={errors.dueDate} C={C}>
            <View style={styles.dueGrid}>
              {Array.from({ length: 30 }, (_, i) => i + 1).map((day) => {
                const selected = parseInt(dueDate, 10) === day;
                return (
                  <Pressable
                    key={day}
                    onPress={() => {
                      Haptics.selectionAsync();
                      setDueDate(String(day));
                      if (errors.dueDate) setErrors((e) => ({ ...e, dueDate: "" }));
                    }}
                    style={[
                      styles.dueChip,
                      {
                        backgroundColor: selected ? Colors.primary : C.surfaceSecondary,
                        borderColor: selected ? Colors.primary : C.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.dueChipText,
                        { color: selected ? "#fff" : C.text },
                      ]}
                    >
                      {day}
                    </Text>
                  </Pressable>
                );
              })}
              <Pressable
                onPress={() => {
                  Haptics.selectionAsync();
                  setDueDate("31");
                  if (errors.dueDate) setErrors((e) => ({ ...e, dueDate: "" }));
                }}
                style={[
                  styles.dueChip,
                  {
                    backgroundColor: parseInt(dueDate, 10) === 31 ? Colors.primary : C.surfaceSecondary,
                    borderColor: parseInt(dueDate, 10) === 31 ? Colors.primary : C.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.dueChipText,
                    { color: parseInt(dueDate, 10) === 31 ? "#fff" : C.text },
                  ]}
                >
                  Last
                </Text>
              </Pressable>
            </View>
          </FormField>
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

      <Modal
        visible={categoryPickerOpen}
        animationType="slide"
        presentationStyle="formSheet"
        onRequestClose={() => setCategoryPickerOpen(false)}
      >
        <View style={[styles.container, { backgroundColor: C.surface }]}>
          <View style={[styles.header, { borderBottomColor: C.border }]}>
            <View style={{ width: 44 }} />
            <Text style={[styles.headerTitle, { color: C.text }]}>Select Category</Text>
            <Pressable
              onPress={() => {
                Haptics.selectionAsync();
                setCategoryPickerOpen(false);
              }}
              style={styles.headerIconBtn}
            >
              <Ionicons name="close" size={24} color={C.textSecondary} />
            </Pressable>
          </View>
          <KeyboardAwareScrollViewCompat
            style={styles.scroll}
            contentContainerStyle={[
              styles.scrollContent,
              { paddingBottom: insets.bottom + 24 },
            ]}
          >
            {DEBT_TYPES.map((t) => {
              const selected = debtType === t.key;
              return (
                <Pressable
                  key={t.key}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    handleTypeSelect(t.key);
                    setCategoryPickerOpen(false);
                    if (errors.debtType) setErrors((e) => ({ ...e, debtType: "" }));
                  }}
                  style={[
                    styles.categoryRow,
                    {
                      borderBottomColor: C.border,
                      backgroundColor: selected ? Colors.primary + "12" : "transparent",
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.categoryRowText,
                      { color: selected ? Colors.primary : C.text },
                    ]}
                  >
                    {debtTypeLabel(t.key)}
                  </Text>
                  {selected && (
                    <Ionicons name="checkmark" size={18} color={Colors.primary} />
                  )}
                </Pressable>
              );
            })}
          </KeyboardAwareScrollViewCompat>
        </View>
      </Modal>
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
        <Text style={[styles.fieldLabel, { color: C.text }]}>{label}</Text>
        {hint && (
          <Text style={[styles.fieldHint, { color: C.textSecondary }]}>{hint}</Text>
        )}
      </View>
      <View
        style={[
          styles.fieldInputWrap,
          { borderBottomColor: C.border },
          error && styles.fieldInputError,
        ]}
      >
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
    paddingLeft: 16,
    paddingRight: 16,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerIconBtn: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    letterSpacing: -0.3,
  },
  headerExtra: {
    paddingVertical: 8,
    alignItems: "center",
  },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 0,
    paddingVertical: 16,
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
    paddingHorizontal: 16,
  },
  fieldLabel: {
    fontSize: 13,
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
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 6,
  },
  selectInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === "ios" ? 13 : 11,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  selectText: {
    fontSize: 16,
    fontWeight: "500",
  },
  input: {
    borderWidth: 0,
    borderRadius: 0,
    paddingHorizontal: 0,
    paddingVertical: Platform.OS === "ios" ? 10 : 8,
    fontSize: 16,
    fontWeight: "500",
  },
  inputWithPrefix: {
    // keep digits close to the "$" while aligning with label
    paddingLeft: 18,
  },
  inputWithSuffix: {
    paddingRight: 26,
  },
  inputError: {
    borderBottomColor: Colors.danger,
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
    // align "$" with the left edge of the label/content
    left: 16,
  },
  adornmentRight: {
    right: 18,
  },
  errorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 1,
    paddingHorizontal: 16,
  },
  errorText: {
    color: Colors.danger,
    fontSize: 11,
    flex: 1,
  },
  fieldInputError: {
    borderBottomColor: Colors.danger,
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
  categoryRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  categoryRowText: {
    fontSize: 16,
  },
  dueGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    columnGap: 10,
    rowGap: 8,
    marginTop: 4,
    justifyContent: "flex-start",
  },
  dueChip: {
    width: 40,
    height: 32,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  dueChipText: {
    fontSize: 13,
    fontWeight: "600",
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
