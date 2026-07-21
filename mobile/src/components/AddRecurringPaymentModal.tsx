import Ionicons from "react-native-vector-icons/Ionicons";
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
import { useAppStore } from "../store/useAppStore";
import { radii, spacing, useAppTheme, type AppColors, type AppText } from "../theme";
import type { Category, Currency, RecurringPayment, Subcategory, TransactionType } from "../types";
import { currentMonth } from "../utils/date";
import { successFeedback } from "../utils/haptics";
import { LBP_PER_USD, amountInputToNumber, amountToUsd, money } from "../utils/money";

type AddRecurringPaymentModalProps = {
  visible: boolean;
  onClose: () => void;
};

type RepeatMode = "month" | "week";

const weekDays = [
  { label: "Sun", value: 0 },
  { label: "Mon", value: 1 },
  { label: "Tue", value: 2 },
  { label: "Wed", value: 3 },
  { label: "Thu", value: 4 },
  { label: "Fri", value: 5 },
  { label: "Sat", value: 6 }
];

export const AddRecurringPaymentModal = ({ visible, onClose }: AddRecurringPaymentModalProps) => {
  const { colors, text } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, text), [colors, text]);
  const queryClient = useQueryClient();
  const openSubcategoryModal = useAppStore((state) => state.openSubcategoryModal);
  const month = currentMonth();
  const [type, setType] = useState<TransactionType>("expense");
  const [currency, setCurrency] = useState<Currency>("USD");
  const [amount, setAmount] = useState("");
  const [merchant, setMerchant] = useState("");
  const [note, setNote] = useState("");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [subcategoryId, setSubcategoryId] = useState<string | null>(null);
  const [repeatMode, setRepeatMode] = useState<RepeatMode>("month");
  const [monthDay, setMonthDay] = useState(String(new Date().getDate()));
  const [weekDay, setWeekDay] = useState(new Date().getDay());
  const [addNow, setAddNow] = useState(true);

  const categoriesQuery = useQuery({
    queryKey: queryKeys.categories,
    queryFn: api.categories
  });
  const subcategoriesQuery = useQuery({
    queryKey: queryKeys.subcategories,
    queryFn: api.subcategories
  });

  const filteredCategories = useMemo(
    () => (categoriesQuery.data?.categories ?? []).filter((category) => category.kind === type),
    [categoriesQuery.data?.categories, type]
  );
  const categoriesByType = useMemo(() => {
    const categories = categoriesQuery.data?.categories ?? [];
    return {
      expense: categories.filter((category) => category.kind === "expense"),
      income: categories.filter((category) => category.kind === "income"),
      loan: categories.filter((category) => category.kind === "loan")
    };
  }, [categoriesQuery.data?.categories]);
  const filteredSubcategories = useMemo(
    () => (subcategoriesQuery.data?.subcategories ?? []).filter((subcategory) => subcategory.categoryId === categoryId),
    [categoryId, subcategoriesQuery.data?.subcategories]
  );
  const parsedAmount = amountInputToNumber(amount);
  const usdEstimate = amountToUsd(Number.isFinite(parsedAmount) ? parsedAmount : 0, currency, LBP_PER_USD);

  const changeType = (nextType: TransactionType) => {
    setType(nextType);
    setCategoryId(categoriesByType[nextType][0]?.id ?? null);
    setSubcategoryId(null);
  };

  const changeCategory = (nextCategoryId: string) => {
    setCategoryId(nextCategoryId);
    setSubcategoryId(null);
  };

  useEffect(() => {
    const stillValid = filteredCategories.some((category) => category.id === categoryId);
    if (!stillValid) {
      setCategoryId(filteredCategories[0]?.id ?? null);
    }
  }, [categoryId, filteredCategories]);

  useEffect(() => {
    if (!subcategoriesQuery.isSuccess || !subcategoryId) {
      return;
    }

    if (!filteredSubcategories.some((subcategory) => subcategory.id === subcategoryId)) {
      setSubcategoryId(null);
    }
  }, [filteredSubcategories, subcategoriesQuery.isSuccess, subcategoryId]);

  const reset = () => {
    setType("expense");
    setCurrency("USD");
    setAmount("");
    setMerchant("");
    setNote("");
    setCategoryId(null);
    setSubcategoryId(null);
    setRepeatMode("month");
    setMonthDay(String(new Date().getDate()));
    setWeekDay(new Date().getDay());
    setAddNow(true);
  };

  const mutation = useMutation({
    mutationFn: api.createRecurringPayment,
    onSuccess: async ({ recurringPayment }) => {
      trackEvent("recurring_payment_created_from_app", { type, repeatMode });
      queryClient.setQueryData<{ recurringPayments: RecurringPayment[] }>(
        queryKeys.recurringPayments,
        (current) => ({
          recurringPayments: [...(current?.recurringPayments ?? []), recurringPayment].sort((a, b) =>
            a.nextRunAt.localeCompare(b.nextRunAt)
          )
        })
      );
      await Promise.all([
        queryClient.refetchQueries({ queryKey: queryKeys.recurringPayments, type: "active" }),
        queryClient.invalidateQueries({ queryKey: queryKeys.transactions }),
        queryClient.invalidateQueries({ queryKey: queryKeys.summary(month) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.categorySpend(month) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.cashFlow })
      ]);
      await successFeedback();
      reset();
      onClose();
    },
    onError: (error) => {
      Alert.alert("Could not save recurring payment", error instanceof Error ? error.message : "Try again.");
    }
  });

  const submit = () => {
    const parsedAmount = amountInputToNumber(amount);
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

    const selectedMonthDay = Number(monthDay);
    const scheduleDay = repeatMode === "month" ? selectedMonthDay : weekDay;

    if (repeatMode === "month" && (!Number.isInteger(selectedMonthDay) || selectedMonthDay < 1 || selectedMonthDay > 31)) {
      Alert.alert("Day needed", "Enter a day from 1 to 31.");
      return;
    }

    mutation.mutate({
      type,
      amount: parsedAmount,
      currency,
      exchangeRate: currency === "LBP" ? LBP_PER_USD : undefined,
      categoryId,
      subcategoryId: subcategoryId ?? undefined,
      merchant: merchant.trim(),
      note: note.trim() || undefined,
      intervalUnit: repeatMode,
      intervalEvery: 1,
      scheduleDay,
      addNow
    });
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.overlay}>
        <Pressable style={styles.scrim} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Recurring payment</Text>
              <Text style={styles.subtitle}>Automate bills, subscriptions, income, and loans.</Text>
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={22} color={colors.ink} />
            </Pressable>
          </View>

          <ScrollView
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="none"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            <View style={styles.segment}>
              {(["expense", "income", "loan"] as TransactionType[]).map((value) => {
                const selected = type === value;
                return (
                  <Pressable
                    key={value}
                    onPress={() => changeType(value)}
                    style={[styles.segmentButton, selected && styles.segmentButtonActive]}
                  >
                    <Text style={[styles.segmentText, selected && styles.segmentTextActive]}>
                      {value === "expense" ? "Expense" : value === "income" ? "Income" : "Loan"}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={styles.label}>Amount</Text>
            <View style={styles.currencySegment}>
              {(["USD", "LBP"] as Currency[]).map((value) => {
                const selected = currency === value;
                return (
                  <Pressable
                    key={value}
                    onPress={() => setCurrency(value)}
                    style={[styles.currencyButton, selected && styles.currencyButtonActive]}
                  >
                    <Text style={[styles.currencyText, selected && styles.currencyTextActive]}>{value}</Text>
                  </Pressable>
                );
              })}
            </View>
            <TextInput
              value={amount}
              onChangeText={setAmount}
              placeholder={currency === "USD" ? "0.00" : "0"}
              keyboardType="decimal-pad"
              style={styles.amountInput}
              placeholderTextColor={colors.muted}
            />
            {currency === "LBP" && parsedAmount > 0 ? (
              <Text style={styles.conversionText}>{money(usdEstimate)} at 89,500 LBP/USD</Text>
            ) : null}

            <Text style={styles.label}>Merchant or source</Text>
            <TextInput
              value={merchant}
              onChangeText={setMerchant}
              placeholder={type === "income" ? "Salary" : type === "loan" ? "Monthly loan" : "Netflix"}
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
                      onPress={() => changeCategory(category.id)}
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

            {categoryId ? (
              <>
                <Text style={styles.label}>Subcategory</Text>
                {subcategoriesQuery.isLoading ? (
                  <ActivityIndicator color={colors.primary} style={styles.loader} />
                ) : (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryList}>
                    <Pressable
                      onPress={() => openSubcategoryModal(categoryId)}
                      style={[styles.categoryChip, styles.addSubcategoryChip]}
                      accessibilityRole="button"
                      accessibilityLabel="Add subcategory"
                    >
                      <Ionicons name="add" size={16} color={colors.primary} />
                      <Text style={[styles.categoryText, styles.addSubcategoryText]}>New</Text>
                    </Pressable>
                    {filteredSubcategories.map((subcategory: Subcategory) => {
                      const selected = subcategory.id === subcategoryId;
                      return (
                        <Pressable
                          key={subcategory.id}
                          onPress={() => setSubcategoryId(selected ? null : subcategory.id)}
                          style={[styles.categoryChip, selected && styles.optionalChipSelected]}
                        >
                          <Text style={styles.categoryText}>{subcategory.name}</Text>
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                )}
              </>
            ) : null}

            <Text style={styles.label}>Repeats</Text>
            <View style={styles.segment}>
              {([
                { label: "Monthly", value: "month" },
                { label: "Weekly", value: "week" }
              ] as Array<{ label: string; value: RepeatMode }>).map((item) => {
                const selected = repeatMode === item.value;
                return (
                  <Pressable
                    key={item.value}
                    onPress={() => setRepeatMode(item.value)}
                    style={[styles.segmentButton, selected && styles.segmentButtonActive]}
                  >
                    <Text style={[styles.segmentText, selected && styles.segmentTextActive]}>{item.label}</Text>
                  </Pressable>
                );
              })}
            </View>

            {repeatMode === "month" ? (
              <>
                <Text style={styles.label}>Day of month</Text>
                <TextInput
                  value={monthDay}
                  onChangeText={setMonthDay}
                  placeholder="1"
                  keyboardType="number-pad"
                  style={styles.input}
                  placeholderTextColor={colors.muted}
                />
                <Text style={styles.scheduleHint}>If the month is shorter, it runs on the last day.</Text>
              </>
            ) : (
              <>
                <Text style={styles.label}>Day of week</Text>
                <View style={styles.weekGrid}>
                  {weekDays.map((day) => {
                    const selected = weekDay === day.value;
                    return (
                      <Pressable
                        key={day.value}
                        onPress={() => setWeekDay(day.value)}
                        style={[styles.weekButton, selected && styles.weekButtonActive]}
                      >
                        <Text style={[styles.weekText, selected && styles.weekTextActive]}>{day.label}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </>
            )}

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

const createStyles = (colors: AppColors, text: AppText) => StyleSheet.create({
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
    backgroundColor: colors.overlay
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
  scrollContent: {
    paddingBottom: spacing.xxl
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
  currencySegment: {
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: spacing.sm
  },
  currencyButton: {
    minWidth: 76,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center"
  },
  currencyButtonActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft
  },
  currencyText: {
    color: colors.muted,
    fontWeight: "900"
  },
  currencyTextActive: {
    color: colors.primaryDark
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
  conversionText: {
    ...text.muted,
    marginTop: spacing.sm,
    fontWeight: "800"
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
  addSubcategoryChip: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft
  },
  addSubcategoryText: {
    color: colors.primaryDark
  },
  optionalChipSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft
  },
  scheduleHint: {
    ...text.muted,
    marginTop: spacing.sm,
    lineHeight: 18
  },
  weekGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  weekButton: {
    minHeight: 42,
    minWidth: 70,
    borderRadius: 21,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.md
  },
  weekButtonActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft
  },
  weekText: {
    color: colors.ink,
    fontWeight: "800"
  },
  weekTextActive: {
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
