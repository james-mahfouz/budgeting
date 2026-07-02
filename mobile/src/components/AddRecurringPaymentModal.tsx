import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, queryKeys, trackEvent } from "../api/client";
import { colors, radii, spacing, text } from "../theme";
import type { Category, RecurringIntervalUnit, TransactionType } from "../types";
import { currentMonth } from "../utils/date";

type AddRecurringPaymentModalProps = {
  visible: boolean;
  onClose: () => void;
};

type Preset = {
  label: string;
  value: string;
  unit: RecurringIntervalUnit;
  every: number;
};

const presets: Preset[] = [
  { label: "Monthly", value: "monthly", unit: "month", every: 1 },
  { label: "Weekly", value: "weekly", unit: "week", every: 1 },
  { label: "2 weeks", value: "biweekly", unit: "week", every: 2 },
  { label: "Custom", value: "custom", unit: "day", every: 30 }
];
const defaultPreset = presets[0] as Preset;

export const AddRecurringPaymentModal = ({ visible, onClose }: AddRecurringPaymentModalProps) => {
  const queryClient = useQueryClient();
  const month = currentMonth();
  const [type, setType] = useState<TransactionType>("expense");
  const [amount, setAmount] = useState("");
  const [merchant, setMerchant] = useState("");
  const [note, setNote] = useState("");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [preset, setPreset] = useState("monthly");
  const [customDays, setCustomDays] = useState("30");
  const [addNow, setAddNow] = useState(true);

  const categoriesQuery = useQuery({
    queryKey: queryKeys.categories,
    queryFn: api.categories
  });

  const filteredCategories = useMemo(
    () => (categoriesQuery.data?.categories ?? []).filter((category) => category.kind === type),
    [categoriesQuery.data?.categories, type]
  );

  useEffect(() => {
    const stillValid = filteredCategories.some((category) => category.id === categoryId);
    if (!stillValid) {
      setCategoryId(filteredCategories[0]?.id ?? null);
    }
  }, [categoryId, filteredCategories]);

  const reset = () => {
    setType("expense");
    setAmount("");
    setMerchant("");
    setNote("");
    setCategoryId(null);
    setPreset("monthly");
    setCustomDays("30");
    setAddNow(true);
  };

  const mutation = useMutation({
    mutationFn: api.createRecurringPayment,
    onSuccess: async () => {
      trackEvent("recurring_payment_created_from_app", { type, preset });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.recurringPayments }),
        queryClient.invalidateQueries({ queryKey: queryKeys.transactions }),
        queryClient.invalidateQueries({ queryKey: queryKeys.summary(month) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.budgets(month) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.categorySpend(month) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.cashFlow })
      ]);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      reset();
      onClose();
    },
    onError: (error) => {
      Alert.alert("Could not save recurring payment", error instanceof Error ? error.message : "Try again.");
    }
  });

  const submit = () => {
    const parsedAmount = Number(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      Alert.alert("Amount needed", "Enter a positive amount.");
      return;
    }

    if (!merchant.trim()) {
      Alert.alert("Name needed", "Add a merchant or short description.");
      return;
    }

    if (!categoryId) {
      Alert.alert("Category needed", "Choose a category.");
      return;
    }

    const selectedPreset = presets.find((item) => item.value === preset) ?? defaultPreset;
    const customEvery = Number(customDays);
    const intervalUnit = preset === "custom" ? "day" : selectedPreset.unit;
    const intervalEvery = preset === "custom" ? customEvery : selectedPreset.every;

    if (!Number.isInteger(intervalEvery) || intervalEvery <= 0) {
      Alert.alert("Timing needed", "Enter a positive number of days.");
      return;
    }

    mutation.mutate({
      type,
      amount: parsedAmount,
      categoryId,
      merchant: merchant.trim(),
      note: note.trim() || undefined,
      intervalUnit,
      intervalEvery,
      addNow
    });
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.overlay}>
        <Pressable style={styles.scrim} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Recurring payment</Text>
              <Text style={styles.subtitle}>Automate bills, subscriptions, and income.</Text>
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={22} color={colors.ink} />
            </Pressable>
          </View>

          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <View style={styles.segment}>
              {(["expense", "income"] as TransactionType[]).map((value) => {
                const selected = type === value;
                return (
                  <Pressable
                    key={value}
                    onPress={() => setType(value)}
                    style={[styles.segmentButton, selected && styles.segmentButtonActive]}
                  >
                    <Text style={[styles.segmentText, selected && styles.segmentTextActive]}>
                      {value === "expense" ? "Expense" : "Income"}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={styles.label}>Amount</Text>
            <TextInput
              value={amount}
              onChangeText={setAmount}
              placeholder="0.00"
              keyboardType="decimal-pad"
              style={styles.amountInput}
              placeholderTextColor={colors.muted}
            />

            <Text style={styles.label}>Merchant or source</Text>
            <TextInput
              value={merchant}
              onChangeText={setMerchant}
              placeholder={type === "income" ? "Salary" : "Netflix"}
              style={styles.input}
              placeholderTextColor={colors.muted}
            />

            <Text style={styles.label}>Category</Text>
            {categoriesQuery.isLoading ? (
              <ActivityIndicator color={colors.primary} style={styles.loader} />
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryList}>
                {filteredCategories.map((category: Category) => {
                  const selected = category.id === categoryId;
                  return (
                    <Pressable
                      key={category.id}
                      onPress={() => setCategoryId(category.id)}
                      style={[
                        styles.categoryChip,
                        selected && { borderColor: category.color, backgroundColor: `${category.color}16` }
                      ]}
                    >
                      <Ionicons
                        name={(category.icon as keyof typeof Ionicons.glyphMap) ?? "pricetag"}
                        size={16}
                        color={category.color}
                      />
                      <Text style={styles.categoryText}>{category.name}</Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            )}

            <Text style={styles.label}>Repeats</Text>
            <View style={styles.presetGrid}>
              {presets.map((item) => {
                const selected = preset === item.value;
                return (
                  <Pressable
                    key={item.value}
                    onPress={() => setPreset(item.value)}
                    style={[styles.presetButton, selected && styles.presetButtonActive]}
                  >
                    <Text style={[styles.presetText, selected && styles.presetTextActive]}>{item.label}</Text>
                  </Pressable>
                );
              })}
            </View>

            {preset === "custom" ? (
              <>
                <Text style={styles.label}>Every custom days</Text>
                <TextInput
                  value={customDays}
                  onChangeText={setCustomDays}
                  placeholder="30"
                  keyboardType="number-pad"
                  style={styles.input}
                  placeholderTextColor={colors.muted}
                />
              </>
            ) : null}

            <Pressable onPress={() => setAddNow((value) => !value)} style={styles.checkRow}>
              <View style={[styles.checkbox, addNow && styles.checkboxActive]}>
                {addNow ? <Ionicons name="checkmark" size={16} color={colors.surface} /> : null}
              </View>
              <View style={styles.checkCopy}>
                <Text style={styles.checkTitle}>Add first payment now</Text>
                <Text style={styles.checkMeta}>The next one follows the timing above.</Text>
              </View>
            </Pressable>

            <Text style={styles.label}>Note</Text>
            <TextInput
              value={note}
              onChangeText={setNote}
              placeholder="Optional"
              style={[styles.input, styles.noteInput]}
              placeholderTextColor={colors.muted}
              multiline
            />

            <Pressable
              accessibilityRole="button"
              onPress={submit}
              disabled={mutation.isPending}
              style={({ pressed }) => [styles.submit, { opacity: pressed || mutation.isPending ? 0.72 : 1 }]}
            >
              {mutation.isPending ? (
                <ActivityIndicator color={colors.surface} />
              ) : (
                <>
                  <Ionicons name="repeat" size={20} color={colors.surface} />
                  <Text style={styles.submitText}>Save recurring payment</Text>
                </>
              )}
            </Pressable>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end"
  },
  scrim: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: "rgba(15, 23, 42, 0.36)"
  },
  sheet: {
    maxHeight: "92%",
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    paddingTop: spacing.sm
  },
  handle: {
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.border,
    alignSelf: "center",
    marginBottom: spacing.lg
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.lg,
    gap: spacing.md
  },
  title: {
    ...text.h2,
    fontSize: 22
  },
  subtitle: {
    ...text.muted,
    marginTop: 2
  },
  closeButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.surfaceAlt,
    alignItems: "center",
    justifyContent: "center"
  },
  segment: {
    flexDirection: "row",
    gap: spacing.sm,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radii.md,
    padding: spacing.xs,
    marginBottom: spacing.lg
  },
  segmentButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: radii.sm,
    alignItems: "center",
    justifyContent: "center"
  },
  segmentButtonActive: {
    backgroundColor: colors.primary
  },
  segmentText: {
    color: colors.ink,
    fontWeight: "800"
  },
  segmentTextActive: {
    color: colors.surface
  },
  label: {
    ...text.muted,
    fontWeight: "800",
    marginBottom: spacing.sm,
    marginTop: spacing.md
  },
  amountInput: {
    minHeight: 76,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    fontSize: 34,
    fontWeight: "900",
    color: colors.ink,
    backgroundColor: colors.background
  },
  input: {
    minHeight: 52,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    color: colors.ink,
    backgroundColor: colors.background,
    fontSize: 16
  },
  loader: {
    paddingVertical: spacing.lg
  },
  categoryList: {
    gap: spacing.sm,
    paddingRight: spacing.lg
  },
  categoryChip: {
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm
  },
  categoryText: {
    color: colors.ink,
    fontWeight: "800"
  },
  presetGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  presetButton: {
    minHeight: 42,
    minWidth: "47%",
    borderRadius: 21,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.md
  },
  presetButtonActive: {
    borderColor: colors.primary,
    backgroundColor: "#E6FFFA"
  },
  presetText: {
    color: colors.ink,
    fontWeight: "800"
  },
  presetTextActive: {
    color: colors.primaryDark
  },
  checkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    marginTop: spacing.lg,
    padding: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.background
  },
  checkbox: {
    width: 26,
    height: 26,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center"
  },
  checkboxActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary
  },
  checkCopy: {
    flex: 1,
    minWidth: 0
  },
  checkTitle: {
    ...text.body,
    fontWeight: "900"
  },
  checkMeta: {
    ...text.muted,
    marginTop: 2
  },
  noteInput: {
    minHeight: 82,
    paddingTop: spacing.md,
    textAlignVertical: "top"
  },
  submit: {
    minHeight: 54,
    borderRadius: radii.md,
    marginTop: spacing.xl,
    backgroundColor: colors.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm
  },
  submitText: {
    color: colors.surface,
    fontWeight: "900",
    fontSize: 16
  }
});
