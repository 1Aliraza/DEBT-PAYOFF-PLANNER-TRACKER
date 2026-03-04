import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ScrollView,
  useColorScheme,
  Switch,
  Modal,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Colors from "@/constants/colors";
import { useDebts } from "@/context/DebtContext";
import { apiRequest } from "@/lib/query-client";

const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA",
  "KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT",
  "VA","WA","WV","WI","WY",
];

const CALL_TIMES = ["Morning", "Afternoon", "Evening"];

interface Props {
  visible: boolean;
  onClose: () => void;
  triggerType?: string;
  prefilledDebtType?: string;
  prefilledAmount?: number;
}

export function LeadForm({ visible, onClose, triggerType, prefilledDebtType, prefilledAmount }: Props) {
  const scheme = useColorScheme();
  const isDark = scheme === "dark";
  const C = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { setLeadSubmitted } = useDebts();

  const [step, setStep] = useState<"form" | "success">("form");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [consent, setConsent] = useState(false);
  const [debtType, setDebtType] = useState(prefilledDebtType ?? "Credit Card");
  const [amount, setAmount] = useState(prefilledAmount ? prefilledAmount.toFixed(0) : "");
  const [callTime, setCallTime] = useState("Morning");
  const [state, setState] = useState("CA");
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [statePickerOpen, setStatePickerOpen] = useState(false);

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!firstName.trim()) errs.firstName = "Required";
    if (!lastName.trim()) errs.lastName = "Required";
    if (!email.trim() || !email.includes("@")) errs.email = "Valid email required";
    if (!phone.trim() || phone.replace(/\D/g, "").length < 10) errs.phone = "Valid phone required";
    if (!consent) errs.consent = "You must agree to be contacted";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSubmitting(true);
    try {
      await apiRequest("POST", "/api/leads", {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        consent,
        debtType,
        approximateAmount: amount,
        callTime,
        state,
        triggerType: triggerType ?? "general",
      });
    } catch (_e) {}
    await setLeadSubmitted();
    setStep("success");
    setSubmitting(false);
  };

  const handleClose = () => {
    setStep("form");
    onClose();
  };

  const inputStyle = [styles.input, { backgroundColor: C.surfaceSecondary, color: C.text, borderColor: C.border }];

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="formSheet" onRequestClose={handleClose}>
      <View style={[styles.container, { backgroundColor: C.surface }]}>
        <View style={[styles.header, { borderBottomColor: C.border }]}>
          <Pressable onPress={handleClose} style={styles.closeBtn} hitSlop={12}>
            <Ionicons name="close" size={24} color={C.textSecondary} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: C.text }]}>Free Consultation</Text>
          <View style={{ width: 44 }} />
        </View>

        {step === "success" ? (
          <View style={[styles.success, { paddingBottom: insets.bottom + 24 }]}>
            <View style={[styles.successIcon, { backgroundColor: Colors.primary + "20" }]}>
              <Ionicons name="checkmark-circle" size={56} color={Colors.primary} />
            </View>
            <Text style={[styles.successTitle, { color: C.text }]}>We'll Be In Touch</Text>
            <Text style={[styles.successBody, { color: C.textSecondary }]}>
              A certified debt specialist will contact you within 1 business day. Your consultation is completely free and confidential.
            </Text>
            <Pressable
              onPress={handleClose}
              style={[styles.submitBtn, { backgroundColor: Colors.primary, marginTop: 24 }]}
            >
              <Text style={styles.submitBtnText}>Done</Text>
            </Pressable>
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 32 }]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Text style={[styles.sectionNote, { color: C.text }]}>
              Free, confidential assessment. No obligation.
            </Text>

            <View style={styles.row}>
              <View style={styles.half}>
                <Text style={[styles.label, { color: C.textSecondary }]}>First Name</Text>
                <TextInput style={inputStyle} value={firstName} onChangeText={setFirstName} placeholder="Jane" placeholderTextColor={C.textSecondary} autoCapitalize="words" />
                {errors.firstName && <Text style={styles.err}>{errors.firstName}</Text>}
              </View>
              <View style={styles.half}>
                <Text style={[styles.label, { color: C.textSecondary }]}>Last Name</Text>
                <TextInput style={inputStyle} value={lastName} onChangeText={setLastName} placeholder="Smith" placeholderTextColor={C.textSecondary} autoCapitalize="words" />
                {errors.lastName && <Text style={styles.err}>{errors.lastName}</Text>}
              </View>
            </View>

            <View style={styles.field}>
              <Text style={[styles.label, { color: C.textSecondary }]}>Email Address</Text>
              <TextInput style={inputStyle} value={email} onChangeText={setEmail} placeholder="jane@example.com" placeholderTextColor={C.textSecondary} keyboardType="email-address" autoCapitalize="none" />
              {errors.email && <Text style={styles.err}>{errors.email}</Text>}
            </View>

            <View style={styles.field}>
              <Text style={[styles.label, { color: C.textSecondary }]}>Phone Number</Text>
              <TextInput style={inputStyle} value={phone} onChangeText={setPhone} placeholder="(555) 555-5555" placeholderTextColor={C.textSecondary} keyboardType="phone-pad" />
              {errors.phone && <Text style={styles.err}>{errors.phone}</Text>}
            </View>

            <View style={styles.field}>
              <Text style={[styles.label, { color: C.textSecondary }]}>Debt Type</Text>
              <TextInput style={inputStyle} value={debtType} onChangeText={setDebtType} placeholder="Credit Card" placeholderTextColor={C.textSecondary} />
            </View>

            <View style={styles.field}>
              <Text style={[styles.label, { color: C.textSecondary }]}>Approximate Total Debt ($)</Text>
              <TextInput style={inputStyle} value={amount} onChangeText={setAmount} placeholder="25000" placeholderTextColor={C.textSecondary} keyboardType="number-pad" />
            </View>

            <View style={styles.field}>
              <Text style={[styles.label, { color: C.textSecondary }]}>Best Time to Call</Text>
              <View style={styles.segmentedRow}>
                {CALL_TIMES.map((t) => (
                  <Pressable
                    key={t}
                    onPress={() => setCallTime(t)}
                    style={[styles.segment, { backgroundColor: callTime === t ? Colors.primary : C.surfaceSecondary, borderColor: callTime === t ? Colors.primary : C.border }]}
                  >
                    <Text style={[styles.segmentText, { color: callTime === t ? "#fff" : C.text }]}>{t}</Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <View style={styles.field}>
              <Text style={[styles.label, { color: C.textSecondary }]}>State of Residence</Text>
              <Pressable
                onPress={() => setStatePickerOpen(true)}
                style={[inputStyle, styles.statePicker]}
              >
                <Text style={{ color: C.text, fontSize: 16 }}>{state}</Text>
                <Ionicons name="chevron-down" size={16} color={C.textSecondary} />
              </Pressable>
            </View>

            <View style={[styles.consentRow, { borderColor: C.border }]}>
              <Switch value={consent} onValueChange={setConsent} trackColor={{ true: Colors.primary, false: C.border }} thumbColor="#fff" />
              <Text style={[styles.consentText, { color: C.textSecondary }]}>
                I agree to be contacted by phone, text, and email regarding debt relief options.
              </Text>
            </View>
            {errors.consent && <Text style={styles.err}>{errors.consent}</Text>}

            <Text style={[styles.disclaimer, { color: C.textSecondary }]}>
              Estimates are for illustration only. Results vary. Not all debts qualify. Free consultation has no obligation.
            </Text>

            <Pressable onPress={() => { onClose(); router.push("/privacy"); }} style={styles.privacyLinkWrap}>
              <Text style={[styles.privacyLink, { color: Colors.primary }]}>
                Privacy Policy
              </Text>
            </Pressable>

            <Pressable
              onPress={handleSubmit}
              disabled={submitting}
              style={[styles.submitBtn, { backgroundColor: Colors.primary, opacity: submitting ? 0.7 : 1 }]}
            >
              <Text style={styles.submitBtnText}>
                {submitting ? "Submitting..." : "Get My Free Assessment"}
              </Text>
            </Pressable>
          </ScrollView>
        )}

        <Modal visible={statePickerOpen} animationType="slide" presentationStyle="formSheet" onRequestClose={() => setStatePickerOpen(false)}>
          <View style={[styles.statePicker2, { backgroundColor: C.surface }]}>
            <View style={[styles.header, { borderBottomColor: C.border }]}>
              <View style={{ width: 44 }} />
              <Text style={[styles.headerTitle, { color: C.text }]}>Select State</Text>
              <Pressable onPress={() => setStatePickerOpen(false)} style={styles.closeBtn}>
                <Ionicons name="close" size={24} color={C.textSecondary} />
              </Pressable>
            </View>
            <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}>
              {US_STATES.map((s) => (
                <Pressable
                  key={s}
                  onPress={() => { setState(s); setStatePickerOpen(false); }}
                  style={[styles.stateRow, { borderBottomColor: C.border, backgroundColor: s === state ? Colors.primary + "15" : "transparent" }]}
                >
                  <Text style={[styles.stateRowText, { color: s === state ? Colors.primary : C.text }]}>{s}</Text>
                  {s === state && <Ionicons name="checkmark" size={18} color={Colors.primary} />}
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </Modal>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: { fontSize: 17, fontWeight: "600" },
  closeBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  scroll: { padding: 20, gap: 14 },
  sectionNote: { fontSize: 14, textAlign: "center", marginBottom: 4 },
  row: { flexDirection: "row", gap: 12 },
  half: { flex: 1, gap: 6 },
  field: { gap: 6 },
  label: { fontSize: 13, fontWeight: "500", textTransform: "uppercase", letterSpacing: 0.5 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13, fontSize: 16 },
  err: { color: Colors.danger, fontSize: 12 },
  segmentedRow: { flexDirection: "row", gap: 8 },
  segment: { flex: 1, paddingVertical: 12, borderRadius: 10, borderWidth: 1, alignItems: "center" },
  segmentText: { fontSize: 14, fontWeight: "500" },
  statePicker: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  consentRow: { flexDirection: "row", alignItems: "flex-start", gap: 12, paddingTop: 8, borderTopWidth: StyleSheet.hairlineWidth },
  consentText: { flex: 1, fontSize: 13, lineHeight: 19 },
  disclaimer: { fontSize: 11, lineHeight: 16, textAlign: "center" },
  privacyLinkWrap: { alignSelf: "center", paddingVertical: 8 },
  privacyLink: { fontSize: 14, fontWeight: "600" },
  submitBtn: { borderRadius: 14, paddingVertical: 16, alignItems: "center" },
  submitBtnText: { color: "#fff", fontSize: 17, fontWeight: "700" },
  success: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32, gap: 16 },
  successIcon: { width: 100, height: 100, borderRadius: 50, alignItems: "center", justifyContent: "center" },
  successTitle: { fontSize: 28, fontWeight: "700", textAlign: "center" },
  successBody: { fontSize: 16, lineHeight: 24, textAlign: "center" },
  statePicker2: { flex: 1 },
  stateRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  stateRowText: { fontSize: 16 },
});
