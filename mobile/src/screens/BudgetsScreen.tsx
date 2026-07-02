import { Ionicons } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, queryKeys, trackEvent } from "../api/client";
import { BudgetProgress } from "../components/BudgetProgress";
import { EmptyState } from "../components/EmptyState";
import { Header } from "../components/Header";
import { IconButton } from "../components/IconButton";
import { Panel } from "../components/Panel";
import { Screen } from "../components/Screen";
import { colors, radii, spacing, text } from "../theme";
import type { Category } from "../types";
import { currentMonth, readableMonth } from "../utils/date";
import { money } from "../utils/money";
import { useScreenTracking } from "../utils/useScreenTracking";

export const BudgetsScreen = () => {
  useScreenTracking("budgets");
  const month = currentMonth();
  const queryClient = useQueryClient();
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [limit, setLimit] = useState("");

  const categoriesQuery = useQuery({ queryKey: queryKeys.categories, queryFn: api.categories });
  const budgetsQuery = useQuery({ queryKey: queryKeys.budgets(month), queryFn: () => api.budgets(month) });

  const expenseCategories = useMemo(
    () => (categoriesQuery.data?.categories ?? []).filter((category) => category.kind === "expense"),
    [categoriesQuery.data?.categories]
  );

  const budgetByCategory = useMemo(() => {
    return new Map((budgetsQuery.data?.budgets ?? []).map((budget) => [budget.categoryId, budget]));
  }, [budgetsQuery.data?.budgets]);

  const mutation = useMutation({
    mutationFn: api.upsertBudget,
    onSuccess: async () => {
      trackEvent("budget_saved", { month });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.budgets(month) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.summary(month) })
      ]);
      closeEditor();
    },
    onError: (error) => {
      Alert.alert("Could not save budget", error instanceof Error ? error.message : "Try again.");
    }
  });

  const openEditor = (category: Category) => {
    const budget = budgetByCategory.get(category.id);
    setEditingCategory(category);
    setLimit(budget?.limit ? String(budget.limit) : "");
  };

  const closeEditor = () => {
    setEditingCategory(null);
    setLimit("");
  };

  const saveBudget = () => {
    if (!editingCategory) {
      return;
    }

    const parsedLimit = Number(limit);
    if (!Number.isFinite(parsedLimit) || parsedLimit <= 0) {
      Alert.alert("Limit needed", "Enter a positive monthly limit.");
      return;
    }

    mutation.mutate({ categoryId: editingCategory.id, month, limit: parsedLimit });
  };

  const refresh = () => {
    void Promise.all([categoriesQuery.refetch(), budgetsQuery.refetch()]);
  };

  return (
    <Screen>
      <Header title="Budgets" subtitle={readableMonth(month)} />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={categoriesQuery.isRefetching || budgetsQuery.isRefetching} onRefresh={refresh} />
        }
      >
        <Panel title="Monthly limits">
          {categoriesQuery.isLoading || budgetsQuery.isLoading ? (
            <ActivityIndicator color={colors.primary} style={styles.loader} />
          ) : expenseCategories.length ? (
            expenseCategories.map((category) => {
              const budget = budgetByCategory.get(category.id);
              return (
                <View key={category.id} style={styles.budgetRow}>
                  {budget ? (
                    <BudgetProgress name={category.name} color={category.color} spent={budget.spent} limit={budget.limit} />
                  ) : (
                    <View style={styles.unsetRow}>
                      <View style={[styles.categoryIcon, { backgroundColor: `${category.color}18` }]}>
                        <Ionicons name={(category.icon as keyof typeof Ionicons.glyphMap) ?? "pricetag"} size={18} color={category.color} />
                      </View>
                      <View style={styles.unsetCopy}>
                        <Text style={styles.categoryName}>{category.name}</Text>
                        <Text style={styles.categoryMeta}>No limit set</Text>
                      </View>
                    </View>
                  )}
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => openEditor(category)}
                    style={({ pressed }) => [styles.editButton, { opacity: pressed ? 0.72 : 1 }]}
                  >
                    <Text style={styles.editText}>{budget ? "Edit" : "Set"}</Text>
                  </Pressable>
                </View>
              );
            })
          ) : (
            <EmptyState icon="speedometer" title="No categories" body="Expense categories will appear here." />
          )}
        </Panel>
      </ScrollView>

      <Modal visible={Boolean(editingCategory)} transparent animationType="fade" onRequestClose={closeEditor}>
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>{editingCategory?.name}</Text>
                <Text style={styles.modalSubtitle}>Monthly limit</Text>
              </View>
              <IconButton name="close" label="Close" onPress={closeEditor} />
            </View>
            <TextInput
              value={limit}
              onChangeText={setLimit}
              placeholder="0.00"
              keyboardType="decimal-pad"
              style={styles.limitInput}
              placeholderTextColor={colors.muted}
            />
            {limit ? <Text style={styles.preview}>{money(Number(limit) || 0)} per month</Text> : null}
            <Pressable
              onPress={saveBudget}
              disabled={mutation.isPending}
              style={({ pressed }) => [styles.saveButton, { opacity: pressed || mutation.isPending ? 0.72 : 1 }]}
            >
              {mutation.isPending ? (
                <ActivityIndicator color={colors.surface} />
              ) : (
                <Text style={styles.saveText}>Save budget</Text>
              )}
            </Pressable>
          </View>
        </View>
      </Modal>
    </Screen>
  );
};

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: 112
  },
  loader: {
    paddingVertical: spacing.xl
  },
  budgetRow: {
    minHeight: 72,
    gap: spacing.md
  },
  unsetRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md
  },
  categoryIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center"
  },
  unsetCopy: {
    flex: 1,
    minWidth: 0
  },
  categoryName: {
    ...text.body,
    fontWeight: "800"
  },
  categoryMeta: {
    ...text.muted,
    marginTop: 2
  },
  editButton: {
    alignSelf: "flex-start",
    minWidth: 72,
    height: 38,
    paddingHorizontal: spacing.md,
    borderRadius: 19,
    backgroundColor: colors.surfaceAlt,
    alignItems: "center",
    justifyContent: "center"
  },
  editText: {
    color: colors.primaryDark,
    fontWeight: "900"
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.36)",
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.lg
  },
  modal: {
    width: "100%",
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.lg,
    gap: spacing.lg
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: spacing.md
  },
  modalTitle: {
    ...text.h2
  },
  modalSubtitle: {
    ...text.muted,
    marginTop: 2
  },
  limitInput: {
    minHeight: 72,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.lg,
    color: colors.ink,
    fontSize: 30,
    fontWeight: "900"
  },
  preview: {
    ...text.muted,
    fontWeight: "800"
  },
  saveButton: {
    minHeight: 52,
    borderRadius: radii.md,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center"
  },
  saveText: {
    color: colors.surface,
    fontWeight: "900",
    fontSize: 16
  }
});

