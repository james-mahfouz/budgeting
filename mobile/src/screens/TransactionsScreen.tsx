import { useMemo, useState } from "react";
import { Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, queryKeys, trackEvent } from "../api/client";
import { EmptyState } from "../components/EmptyState";
import { Header } from "../components/Header";
import { IconButton } from "../components/IconButton";
import { Panel } from "../components/Panel";
import { Screen } from "../components/Screen";
import { TransactionRow } from "../components/TransactionRow";
import { useAppStore } from "../store/useAppStore";
import { colors, radii, spacing, text } from "../theme";
import type { TransactionType } from "../types";
import { currentMonth } from "../utils/date";
import { useScreenTracking } from "../utils/useScreenTracking";

type Filter = "all" | TransactionType;

const filters: Array<{ label: string; value: Filter }> = [
  { label: "All", value: "all" },
  { label: "Expenses", value: "expense" },
  { label: "Income", value: "income" }
];

export const TransactionsScreen = () => {
  useScreenTracking("transactions");
  const [filter, setFilter] = useState<Filter>("all");
  const openAddModal = useAppStore((state) => state.openAddModal);
  const queryClient = useQueryClient();
  const month = currentMonth();

  const categoriesQuery = useQuery({ queryKey: queryKeys.categories, queryFn: api.categories });
  const transactionsQuery = useQuery({ queryKey: queryKeys.transactions, queryFn: () => api.transactions(100) });

  const categoriesById = useMemo(() => {
    return new Map((categoriesQuery.data?.categories ?? []).map((category) => [category.id, category]));
  }, [categoriesQuery.data?.categories]);

  const transactions = useMemo(() => {
    const items = transactionsQuery.data?.transactions ?? [];
    return filter === "all" ? items : items.filter((transaction) => transaction.type === filter);
  }, [filter, transactionsQuery.data?.transactions]);

  const deleteMutation = useMutation({
    mutationFn: api.deleteTransaction,
    onSuccess: async () => {
      trackEvent("transaction_deleted");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.transactions }),
        queryClient.invalidateQueries({ queryKey: queryKeys.summary(month) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.categorySpend(month) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.cashFlow })
      ]);
    },
    onError: (error) => {
      Alert.alert("Could not delete transaction", error instanceof Error ? error.message : "Try again.");
    }
  });

  const confirmDelete = (id: string) => {
    Alert.alert("Delete transaction?", "This removes it from your transactions and analytics.", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => deleteMutation.mutate(id) }
    ]);
  };

  const refresh = () => {
    void Promise.all([transactionsQuery.refetch(), categoriesQuery.refetch()]);
  };

  return (
    <Screen>
      <Header
        title="Transactions"
        subtitle="Filter, review, and clean up entries"
        action={<IconButton name="add" label="Add transaction" onPress={openAddModal} backgroundColor={colors.primary} color={colors.surface} />}
      />
      <View style={styles.filters}>
        {filters.map((item) => {
          const active = item.value === filter;
          return (
            <Pressable
              key={item.value}
              onPress={() => setFilter(item.value)}
              style={[styles.filterButton, active && styles.filterButtonActive]}
            >
              <Text style={[styles.filterText, active && styles.filterTextActive]}>{item.label}</Text>
            </Pressable>
          );
        })}
      </View>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={transactionsQuery.isRefetching || categoriesQuery.isRefetching}
            onRefresh={refresh}
          />
        }
      >
        <Panel>
          {transactions.length ? (
            transactions.map((transaction) => (
              <TransactionRow
                key={transaction.id}
                transaction={transaction}
                category={categoriesById.get(transaction.categoryId)}
                trailing={
                  <IconButton
                    name="trash-outline"
                    label="Delete transaction"
                    onPress={() => confirmDelete(transaction.id)}
                    color={colors.danger}
                    backgroundColor="#FEF3F2"
                  />
                }
              />
            ))
          ) : (
            <EmptyState
              icon="receipt"
              title="No matching transactions"
              body="Change the filter or add a transaction from the plus button."
            />
          )}
        </Panel>
      </ScrollView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  filters: {
    flexDirection: "row",
    marginHorizontal: spacing.lg,
    padding: spacing.xs,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceAlt,
    gap: spacing.xs
  },
  filterButton: {
    flex: 1,
    minHeight: 42,
    borderRadius: radii.sm,
    alignItems: "center",
    justifyContent: "center"
  },
  filterButtonActive: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border
  },
  filterText: {
    ...text.muted,
    fontWeight: "900"
  },
  filterTextActive: {
    color: colors.ink
  },
  content: {
    padding: spacing.lg,
    paddingBottom: 112
  }
});
