import Ionicons from "react-native-vector-icons/Ionicons";
import { useMemo } from "react";
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
import { radii, spacing, useAppTheme, type AppColors, type AppText } from "../theme";
import type { Transaction } from "../types";
import { currentMonth } from "../utils/date";
import { money } from "../utils/money";
import { useScreenTracking } from "../utils/useScreenTracking";

const sum = (transactions: Transaction[]) => transactions.reduce((total, transaction) => total + transaction.amount, 0);

export const LoansScreen = () => {
  const { colors, text } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, text), [colors, text]);
  useScreenTracking("loans");
  const queryClient = useQueryClient();
  const month = currentMonth();
  const openAddModal = useAppStore((state) => state.openAddModal);
  const openEditTransactionModal = useAppStore((state) => state.openEditTransactionModal);

  const categoriesQuery = useQuery({ queryKey: queryKeys.categories, queryFn: api.categories });
  const transactionsQuery = useQuery({ queryKey: queryKeys.transactions, queryFn: () => api.transactions(200) });

  const categoriesById = useMemo(() => {
    return new Map((categoriesQuery.data?.categories ?? []).map((category) => [category.id, category]));
  }, [categoriesQuery.data?.categories]);

  const loans = useMemo(
    () => (transactionsQuery.data?.transactions ?? []).filter((transaction) => transaction.type === "loan"),
    [transactionsQuery.data?.transactions]
  );
  const outstandingLoans = useMemo(() => loans.filter((transaction) => !transaction.repaidAt), [loans]);
  const returnedLoans = useMemo(() => loans.filter((transaction) => transaction.repaidAt), [loans]);

  const refreshData = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.transactions }),
      queryClient.invalidateQueries({ queryKey: queryKeys.summary(month) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.cashFlow })
    ]);
  };

  const repayMutation = useMutation({
    mutationFn: api.repayLoan,
    onSuccess: async () => {
      trackEvent("loan_marked_returned_from_app");
      await refreshData();
    },
    onError: (error) => {
      Alert.alert("Could not update loan", error instanceof Error ? error.message : "Try again.");
    }
  });

  const reopenMutation = useMutation({
    mutationFn: api.reopenLoan,
    onSuccess: async () => {
      trackEvent("loan_reopened_from_app");
      await refreshData();
    },
    onError: (error) => {
      Alert.alert("Could not update loan", error instanceof Error ? error.message : "Try again.");
    }
  });

  const deleteMutation = useMutation({
    mutationFn: api.deleteTransaction,
    onSuccess: async () => {
      trackEvent("loan_deleted_from_app");
      await refreshData();
    },
    onError: (error) => {
      Alert.alert("Could not delete loan", error instanceof Error ? error.message : "Try again.");
    }
  });

  const refresh = () => {
    void Promise.all([transactionsQuery.refetch(), categoriesQuery.refetch()]);
  };

  const confirmDelete = (loan: Transaction) => {
    Alert.alert("Delete loan?", `${loan.merchant} will be removed from your records.`, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => deleteMutation.mutate(loan.id) }
    ]);
  };

  const renderLoan = (loan: Transaction, returned: boolean) => (
    <TransactionRow
      key={loan.id}
      transaction={loan}
      category={categoriesById.get(loan.categoryId)}
      onPress={() => openEditTransactionModal(loan)}
      trailing={
        <View style={styles.rowActions}>
          <IconButton
            name={returned ? "refresh" : "checkmark"}
            label={returned ? "Reopen loan" : "Mark returned"}
            onPress={() => (returned ? reopenMutation.mutate(loan.id) : repayMutation.mutate(loan.id))}
            color={returned ? colors.muted : colors.income}
            backgroundColor={returned ? colors.surfaceAlt : `${colors.income}18`}
          />
          <IconButton
            name="trash-outline"
            label="Delete loan"
            onPress={() => confirmDelete(loan)}
            color={colors.danger}
            backgroundColor={colors.dangerSoft}
          />
        </View>
      }
    />
  );

  return (
    <Screen>
      <Header
        title="Loans"
        subtitle="Money you paid that should come back"
        action={<IconButton name="add" label="Add loan" onPress={() => openAddModal("loan")} backgroundColor={colors.primary} color={colors.surface} />}
      />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={transactionsQuery.isRefetching || categoriesQuery.isRefetching}
            onRefresh={refresh}
          />
        }
      >
        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}>
            <View style={[styles.summaryIcon, { backgroundColor: `${colors.loan}18` }]}>
              <Ionicons name="hourglass" size={20} color={colors.loan} />
            </View>
            <Text style={styles.summaryLabel}>Outstanding</Text>
            <Text style={styles.summaryValue}>{money(sum(outstandingLoans))}</Text>
          </View>
          <View style={styles.summaryCard}>
            <View style={[styles.summaryIcon, { backgroundColor: `${colors.income}18` }]}>
              <Ionicons name="checkmark-circle" size={20} color={colors.income} />
            </View>
            <Text style={styles.summaryLabel}>Returned</Text>
            <Text style={styles.summaryValue}>{money(sum(returnedLoans))}</Text>
          </View>
        </View>

        <Panel title="Outstanding">
          {outstandingLoans.length ? (
            outstandingLoans.map((loan) => renderLoan(loan, false))
          ) : (
            <EmptyState icon="hourglass" title="No outstanding loans" body="Loan transactions waiting to be returned will appear here." />
          )}
        </Panel>

        <Panel title="Returned">
          {returnedLoans.length ? (
            returnedLoans.map((loan) => renderLoan(loan, true))
          ) : (
            <EmptyState icon="checkmark-circle" title="Nothing returned yet" body="Mark a loan returned when the money comes back." />
          )}
        </Panel>
      </ScrollView>
    </Screen>
  );
};

const createStyles = (colors: AppColors, text: AppText) => StyleSheet.create({
  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: 112,
    gap: spacing.lg
  },
  summaryRow: {
    flexDirection: "row",
    gap: spacing.md
  },
  summaryCard: {
    flex: 1,
    minHeight: 122,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.lg
  },
  summaryIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md
  },
  summaryLabel: {
    ...text.muted,
    fontWeight: "800"
  },
  summaryValue: {
    ...text.h2,
    marginTop: spacing.xs
  },
  rowActions: {
    flexDirection: "row",
    gap: spacing.xs
  }
});
