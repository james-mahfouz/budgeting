import LinearGradient from "react-native-linear-gradient";
import { useMemo } from "react";
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { api, queryKeys } from "../api/client";
import { EmptyState } from "../components/EmptyState";
import { Header } from "../components/Header";
import { IconButton } from "../components/IconButton";
import { Panel } from "../components/Panel";
import { Screen } from "../components/Screen";
import { StatCard } from "../components/StatCard";
import { TransactionRow } from "../components/TransactionRow";
import { useAppStore } from "../store/useAppStore";
import { radii, spacing, useAppTheme, type AppColors, type AppText } from "../theme";
import { currentMonth, readableMonth } from "../utils/date";
import { money } from "../utils/money";
import { useScreenTracking } from "../utils/useScreenTracking";

export const DashboardScreen = () => {
  const { colors, text } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, text), [colors, text]);
  useScreenTracking("dashboard");
  const openAddModal = useAppStore((state) => state.openAddModal);
  const month = currentMonth();

  const categoriesQuery = useQuery({ queryKey: queryKeys.categories, queryFn: api.categories });
  const subcategoriesQuery = useQuery({ queryKey: queryKeys.subcategories, queryFn: api.subcategories });
  const summaryQuery = useQuery({ queryKey: queryKeys.summary(month), queryFn: () => api.summary(month) });
  const transactionsQuery = useQuery({ queryKey: queryKeys.transactions, queryFn: () => api.transactions(5) });
  const spendQuery = useQuery({ queryKey: queryKeys.categorySpend(month), queryFn: () => api.categorySpend(month) });

  const categoriesById = useMemo(() => {
    return new Map((categoriesQuery.data?.categories ?? []).map((category) => [category.id, category]));
  }, [categoriesQuery.data?.categories]);

  const subcategoriesById = useMemo(() => {
    return new Map((subcategoriesQuery.data?.subcategories ?? []).map((subcategory) => [subcategory.id, subcategory]));
  }, [subcategoriesQuery.data?.subcategories]);

  const summary = summaryQuery.data?.summary;
  const spendingProgress = summary?.income ? Math.min((summary.expenses / summary.income) * 100, 100) : 0;
  const refreshing = summaryQuery.isRefetching || transactionsQuery.isRefetching || spendQuery.isRefetching;

  const refresh = () => {
    void Promise.all([
      summaryQuery.refetch(),
      transactionsQuery.refetch(),
      spendQuery.refetch(),
      categoriesQuery.refetch(),
      subcategoriesQuery.refetch()
    ]);
  };

  return (
    <Screen>
      <Header
        title="Budgeting"
        subtitle={readableMonth(month)}
        action={<IconButton name="add" label="Add transaction" onPress={() => openAddModal()} backgroundColor={colors.primary} color={colors.surface} />}
      />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
      >
        {summaryQuery.isLoading ? (
          <ActivityIndicator color={colors.primary} style={styles.loader} />
        ) : (
          <LinearGradient colors={[colors.primary, colors.blue]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
            <Text style={styles.heroLabel}>Available this month</Text>
            <Text style={styles.heroAmount} adjustsFontSizeToFit numberOfLines={1}>
              {money(summary?.balance ?? 0)}
            </Text>
            <View style={styles.heroMetaRow}>
              <Text style={styles.heroMeta}>Income {money(summary?.income ?? 0)}</Text>
              <Text style={styles.heroMeta}>Spent {money(summary?.expenses ?? 0)}</Text>
              <Text style={styles.heroMeta}>Loans {money(summary?.loans ?? 0)}</Text>
            </View>
            <View style={styles.heroTrack}>
              <View style={[styles.heroFill, { width: `${spendingProgress}%` }]} />
            </View>
          </LinearGradient>
        )}

        <View style={styles.statRow}>
          <StatCard label="Savings rate" value={`${summary?.savingsRate ?? 0}%`} icon="trending-up" tone="income" />
          <StatCard label="Outstanding loans" value={money(summary?.outstandingLoans ?? 0)} icon="swap-horizontal" tone="loan" />
        </View>

        <Panel title="Top spending">
          {(spendQuery.data?.categories ?? []).length ? (
            spendQuery.data?.categories.slice(0, 3).map((category) => (
              <View key={category.categoryId} style={styles.spendRow}>
                <View style={[styles.dot, { backgroundColor: category.color }]} />
                <Text style={styles.spendName}>{category.name}</Text>
                <Text style={styles.spendAmount}>{money(category.amount)}</Text>
              </View>
            ))
          ) : (
            <EmptyState icon="pie-chart" title="No spending yet" body="Expenses will appear here after you add transactions." />
          )}
        </Panel>

        <Panel title="Recent transactions">
          {(transactionsQuery.data?.transactions ?? []).length ? (
            transactionsQuery.data?.transactions.map((transaction) => (
              <TransactionRow
                key={transaction.id}
                transaction={transaction}
                category={categoriesById.get(transaction.categoryId)}
                subcategory={transaction.subcategoryId ? subcategoriesById.get(transaction.subcategoryId) : undefined}
              />
            ))
          ) : (
            <EmptyState icon="receipt" title="Nothing tracked" body="The launch popup is ready for your first transaction." />
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
  loader: {
    paddingVertical: spacing.xxl
  },
  hero: {
    borderRadius: radii.lg,
    padding: spacing.xl,
    minHeight: 188,
    justifyContent: "space-between"
  },
  heroLabel: {
    color: "rgba(255,255,255,0.78)",
    fontWeight: "800",
    fontSize: 14
  },
  heroAmount: {
    color: colors.surface,
    fontWeight: "900",
    fontSize: 42,
    marginTop: spacing.sm
  },
  heroMetaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: spacing.md,
    marginTop: spacing.lg
  },
  heroMeta: {
    color: colors.surface,
    fontWeight: "800",
    flexShrink: 1
  },
  heroTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(255,255,255,0.24)",
    overflow: "hidden",
    marginTop: spacing.lg
  },
  heroFill: {
    height: "100%",
    borderRadius: 4,
    backgroundColor: colors.accent
  },
  statRow: {
    flexDirection: "row",
    gap: spacing.md
  },
  spendRow: {
    minHeight: 36,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5
  },
  spendName: {
    ...text.body,
    flex: 1,
    fontWeight: "700"
  },
  spendAmount: {
    ...text.body,
    fontWeight: "900"
  }
});
