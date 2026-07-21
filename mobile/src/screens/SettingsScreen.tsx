import Ionicons from "react-native-vector-icons/Ionicons";
import { Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, queryKeys, setAuthToken, trackEvent } from "../api/client";
import { clearStoredAuthSession } from "../auth/storage";
import { API_URL } from "../config";
import { EmptyState } from "../components/EmptyState";
import { Header } from "../components/Header";
import { IconButton } from "../components/IconButton";
import { Panel } from "../components/Panel";
import { Screen } from "../components/Screen";
import { useAppStore } from "../store/useAppStore";
import { radii, spacing, themeLabels, useAppTheme, type AppColors, type AppText, type ThemePreference } from "../theme";
import type { Category, Subcategory } from "../types";
import { currentMonth, readableDate } from "../utils/date";
import { money } from "../utils/money";
import { useScreenTracking } from "../utils/useScreenTracking";

const weekDayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const scheduleLabel = (rule: { intervalUnit: string; scheduleDay?: number; intervalEvery: number }) => {
  if (rule.intervalUnit === "month" && rule.scheduleDay) {
    return `monthly on day ${rule.scheduleDay}`;
  }

  if (rule.intervalUnit === "week" && rule.scheduleDay !== undefined) {
    return `weekly on ${weekDayNames[rule.scheduleDay] ?? "selected day"}`;
  }

  return `every ${rule.intervalEvery} ${rule.intervalUnit}${rule.intervalEvery > 1 ? "s" : ""}`;
};

export const SettingsScreen = () => {
  const { colors, text } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, text), [colors, text]);
  useScreenTracking("settings");
  const openAddModal = useAppStore((state) => state.openAddModal);
  const openCategoryModal = useAppStore((state) => state.openCategoryModal);
  const openEditCategoryModal = useAppStore((state) => state.openEditCategoryModal);
  const openSubcategoryModal = useAppStore((state) => state.openSubcategoryModal);
  const openEditSubcategoryModal = useAppStore((state) => state.openEditSubcategoryModal);
  const openRecurringModal = useAppStore((state) => state.openRecurringModal);
  const user = useAppStore((state) => state.user);
  const signOut = useAppStore((state) => state.signOut);
  const themePreference = useAppStore((state) => state.themePreference);
  const setThemePreference = useAppStore((state) => state.setThemePreference);
  const queryClient = useQueryClient();
  const healthQuery = useQuery({
    queryKey: queryKeys.health,
    queryFn: api.health,
    retry: 1
  });
  const categoriesQuery = useQuery({ queryKey: queryKeys.categories, queryFn: api.categories });
  const subcategoriesQuery = useQuery({ queryKey: queryKeys.subcategories, queryFn: api.subcategories });
  const recurringQuery = useQuery({ queryKey: queryKeys.recurringPayments, queryFn: api.recurringPayments });

  const categoriesById = useMemo(() => {
    return new Map((categoriesQuery.data?.categories ?? []).map((category) => [category.id, category]));
  }, [categoriesQuery.data?.categories]);

  const subcategoriesById = useMemo(() => {
    return new Map((subcategoriesQuery.data?.subcategories ?? []).map((subcategory) => [subcategory.id, subcategory]));
  }, [subcategoriesQuery.data?.subcategories]);

  const deleteRecurringMutation = useMutation({
    mutationFn: api.deleteRecurringPayment,
    onSuccess: async () => {
      trackEvent("recurring_payment_deleted");
      await queryClient.invalidateQueries({ queryKey: queryKeys.recurringPayments });
    },
    onError: (error) => {
      Alert.alert("Could not delete recurring payment", error instanceof Error ? error.message : "Try again.");
    }
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: api.deleteCategory,
    onSuccess: async () => {
      trackEvent("category_deleted_from_app");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.categories }),
        queryClient.invalidateQueries({ queryKey: queryKeys.subcategories }),
        queryClient.invalidateQueries({ queryKey: queryKeys.recurringPayments }),
        queryClient.invalidateQueries({ queryKey: queryKeys.summary(currentMonth()) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.categorySpend(currentMonth()) })
      ]);
    },
    onError: (error) => {
      Alert.alert("Could not delete category", error instanceof Error ? error.message : "Try again.");
    }
  });

  const deleteSubcategoryMutation = useMutation({
    mutationFn: api.deleteSubcategory,
    onSuccess: async () => {
      trackEvent("subcategory_deleted_from_app");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.subcategories }),
        queryClient.invalidateQueries({ queryKey: queryKeys.transactions }),
        queryClient.invalidateQueries({ queryKey: queryKeys.recurringPayments })
      ]);
    },
    onError: (error) => {
      Alert.alert("Could not delete subcategory", error instanceof Error ? error.message : "Try again.");
    }
  });

  const refreshAll = () => {
    trackEvent("manual_refresh");
    void queryClient.invalidateQueries();
  };

  const logout = async () => {
    await api.logout().catch(() => undefined);
    setAuthToken(null);
    await clearStoredAuthSession();
    queryClient.clear();
    signOut();
  };

  const confirmDeleteRecurring = (id: string) => {
    Alert.alert("Delete recurring payment?", "Future automatic payments will stop.", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => deleteRecurringMutation.mutate(id) }
    ]);
  };

  const confirmDeleteCategory = (category: Category) => {
    Alert.alert("Delete category?", `${category.name} and its subcategories will be removed. Existing transactions remain.`, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => deleteCategoryMutation.mutate(category.id) }
    ]);
  };

  const confirmDeleteSubcategory = (subcategory: Subcategory) => {
    Alert.alert("Delete subcategory?", `${subcategory.name} will be cleared from existing transactions and recurring payments.`, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => deleteSubcategoryMutation.mutate(subcategory.id) }
    ]);
  };

  return (
    <Screen>
      <Header title="Settings" subtitle="App status and controls" />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={healthQuery.isRefetching} onRefresh={() => void healthQuery.refetch()} />}
      >
        <Panel title="Account">
          <View style={styles.statusRow}>
            <View style={[styles.statusDot, { backgroundColor: colors.primary }]} />
            <View style={styles.statusCopy}>
              <Text style={styles.statusTitle}>{user?.name ?? "Signed in"}</Text>
              <Text style={styles.statusMeta} numberOfLines={1}>
                {user?.username}
              </Text>
            </View>
          </View>
          <ActionButton icon="log-out-outline" label="Logout" onPress={logout} />
        </Panel>

        <Panel title="Appearance">
          <View style={styles.themeSegment}>
            {(["system", "light", "dark"] as ThemePreference[]).map((preference) => {
              const active = preference === themePreference;
              return (
                <Pressable
                  key={preference}
                  accessibilityRole="button"
                  onPress={() => setThemePreference(preference)}
                  style={[styles.themeButton, active && styles.themeButtonActive]}
                >
                  <Text style={[styles.themeButtonText, active && styles.themeButtonTextActive]}>
                    {themeLabels[preference]}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </Panel>

        <Panel title="Quick actions">
          <ActionButton icon="add-circle" label="Add transaction" onPress={() => openAddModal()} />
          <ActionButton icon="pricetag" label="Add category" onPress={() => openCategoryModal()} />
          <ActionButton icon="repeat" label="Add recurring payment" onPress={openRecurringModal} />
          <ActionButton icon="sync" label="Refresh data" onPress={refreshAll} />
        </Panel>

        <Panel title="Categories">
          {(categoriesQuery.data?.categories ?? []).length ? (
            categoriesQuery.data?.categories.map((category) => {
              const subcategories = (subcategoriesQuery.data?.subcategories ?? []).filter(
                (subcategory) => subcategory.categoryId === category.id
              );
              return (
                <View key={category.id} style={styles.categoryGroup}>
                  <View style={styles.categoryRow}>
                    <View style={[styles.categoryIcon, { backgroundColor: `${category.color}18` }]}>
                      <Ionicons
                        name={(category.icon as keyof typeof Ionicons.glyphMap) ?? "pricetag"}
                        size={18}
                        color={category.color}
                      />
                    </View>
                    <View style={styles.categoryCopy}>
                      <Text style={styles.categoryTitle} numberOfLines={1}>
                        {category.name}
                      </Text>
                      <Text style={styles.categoryMeta}>
                        {category.kind === "income" ? "Income" : category.kind === "loan" ? "Loan" : "Expense"}
                        {` · ${subcategories.length} subcategor${subcategories.length === 1 ? "y" : "ies"}`}
                      </Text>
                    </View>
                    <IconButton
                      name="add-outline"
                      label={`Add subcategory to ${category.name}`}
                      onPress={() => openSubcategoryModal(category.id)}
                      color={colors.primary}
                      backgroundColor={colors.primarySoft}
                    />
                    <IconButton
                      name="create-outline"
                      label="Edit category"
                      onPress={() => openEditCategoryModal(category)}
                      color={colors.primary}
                      backgroundColor={colors.primarySoft}
                    />
                    <IconButton
                      name="trash-outline"
                      label="Delete category"
                      onPress={() => confirmDeleteCategory(category)}
                      color={colors.danger}
                      backgroundColor={colors.dangerSoft}
                    />
                  </View>
                  {subcategories.map((subcategory) => (
                    <View key={subcategory.id} style={styles.subcategoryRow}>
                      <View style={[styles.subcategoryMarker, { backgroundColor: category.color }]} />
                      <Text style={styles.subcategoryTitle} numberOfLines={1}>{subcategory.name}</Text>
                      <IconButton
                        name="create-outline"
                        label="Edit subcategory"
                        onPress={() => openEditSubcategoryModal(subcategory)}
                        color={colors.primary}
                        backgroundColor={colors.primarySoft}
                      />
                      <IconButton
                        name="trash-outline"
                        label="Delete subcategory"
                        onPress={() => confirmDeleteSubcategory(subcategory)}
                        color={colors.danger}
                        backgroundColor={colors.dangerSoft}
                      />
                    </View>
                  ))}
                </View>
              );
            })
          ) : (
            <EmptyState icon="pricetag" title="No categories" body="Create income, expense, and loan categories for your transactions." />
          )}
        </Panel>

        <Panel title="Recurring payments">
          {(recurringQuery.data?.recurringPayments ?? []).length ? (
            recurringQuery.data?.recurringPayments.map((rule) => {
              const category = categoriesById.get(rule.categoryId);
              const subcategory = rule.subcategoryId ? subcategoriesById.get(rule.subcategoryId) : undefined;
              return (
                <View key={rule.id} style={styles.recurringRow}>
                  <View style={[styles.recurringIcon, { backgroundColor: `${category?.color ?? colors.primary}18` }]}>
                    <Ionicons
                      name={(category?.icon as keyof typeof Ionicons.glyphMap) ?? "repeat"}
                      size={18}
                      color={category?.color ?? colors.primary}
                    />
                  </View>
                  <View style={styles.recurringCopy}>
                    <Text style={styles.recurringTitle} numberOfLines={1}>
                      {rule.merchant}
                    </Text>
                    <Text style={styles.recurringMeta} numberOfLines={1}>
                      {money(rule.amount)} · {category?.name ?? "Uncategorized"}
                      {subcategory ? ` / ${subcategory.name}` : ""} · {scheduleLabel(rule)} · next {readableDate(rule.nextRunAt)}
                    </Text>
                  </View>
                  <IconButton
                    name="trash-outline"
                    label="Delete recurring payment"
                    onPress={() => confirmDeleteRecurring(rule.id)}
                    color={colors.danger}
                    backgroundColor={colors.dangerSoft}
                  />
                </View>
              );
            })
          ) : (
            <EmptyState
              icon="repeat"
              title="No recurring payments"
              body="Add rent, subscriptions, salary, or any payment that repeats."
            />
          )}
        </Panel>

        <Panel title="Backend">
          <View style={styles.statusRow}>
            <View style={[styles.statusDot, { backgroundColor: healthQuery.data?.ok ? colors.income : colors.danger }]} />
            <View style={styles.statusCopy}>
              <Text style={styles.statusTitle}>{healthQuery.data?.ok ? "Connected" : "Not connected"}</Text>
              <Text style={styles.statusMeta} numberOfLines={2}>
                {API_URL}
              </Text>
            </View>
          </View>
          <Text style={styles.note}>Release builds use the app backend URL configured in src/config.ts.</Text>
        </Panel>
      </ScrollView>
    </Screen>
  );
};

const ActionButton = ({ icon, label, onPress }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void }) => {
  const { colors, text } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, text), [colors, text]);

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.actionButton, { opacity: pressed ? 0.72 : 1 }]}
    >
      <Ionicons name={icon} size={22} color={colors.primary} />
      <Text style={styles.actionText}>{label}</Text>
      <Ionicons name="chevron-forward" size={18} color={colors.muted} />
    </Pressable>
  );
};

const createStyles = (colors: AppColors, text: AppText) => StyleSheet.create({
  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: 112,
    gap: spacing.lg
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md
  },
  statusDot: {
    width: 14,
    height: 14,
    borderRadius: 7
  },
  statusCopy: {
    flex: 1,
    minWidth: 0
  },
  statusTitle: {
    ...text.body,
    fontWeight: "900"
  },
  statusMeta: {
    ...text.muted,
    marginTop: 2
  },
  note: {
    ...text.muted,
    lineHeight: 20
  },
  themeSegment: {
    flexDirection: "row",
    gap: spacing.xs,
    padding: spacing.xs,
    borderRadius: radii.md,
    backgroundColor: colors.background
  },
  themeButton: {
    flex: 1,
    minHeight: 42,
    borderRadius: radii.sm,
    alignItems: "center",
    justifyContent: "center"
  },
  themeButtonActive: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border
  },
  themeButtonText: {
    ...text.muted,
    fontWeight: "900"
  },
  themeButtonTextActive: {
    color: colors.ink
  },
  actionButton: {
    minHeight: 54,
    borderRadius: radii.md,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md
  },
  actionText: {
    ...text.body,
    flex: 1,
    fontWeight: "900"
  },
  recurringRow: {
    minHeight: 64,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md
  },
  recurringIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center"
  },
  recurringCopy: {
    flex: 1,
    minWidth: 0
  },
  recurringTitle: {
    ...text.body,
    fontWeight: "900"
  },
  recurringMeta: {
    ...text.muted,
    marginTop: 2
  },
  categoryRow: {
    minHeight: 64,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md
  },
  categoryGroup: {
    gap: spacing.xs
  },
  categoryIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center"
  },
  categoryCopy: {
    flex: 1,
    minWidth: 0
  },
  categoryTitle: {
    ...text.body,
    fontWeight: "900"
  },
  categoryMeta: {
    ...text.muted,
    marginTop: 2
  },
  subcategoryRow: {
    minHeight: 52,
    marginLeft: 21,
    paddingLeft: spacing.lg,
    borderLeftWidth: 1,
    borderLeftColor: colors.border,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm
  },
  subcategoryMarker: {
    width: 7,
    height: 7,
    borderRadius: 4
  },
  subcategoryTitle: {
    ...text.body,
    flex: 1,
    minWidth: 0,
    fontWeight: "800"
  }
});
