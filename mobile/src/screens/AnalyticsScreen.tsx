import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { api, queryKeys } from "../api/client";
import { EmptyState } from "../components/EmptyState";
import { Header } from "../components/Header";
import { Panel } from "../components/Panel";
import { Screen } from "../components/Screen";
import { StatCard } from "../components/StatCard";
import { spacing, useAppTheme, type AppColors, type AppText } from "../theme";
import { currentMonth, readableMonth } from "../utils/date";
import { compactMoney, money } from "../utils/money";
import { useScreenTracking } from "../utils/useScreenTracking";

export const AnalyticsScreen = () => {
  const { colors, text } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, text), [colors, text]);
  useScreenTracking("analytics");
  const month = currentMonth();
  const summaryQuery = useQuery({ queryKey: queryKeys.summary(month), queryFn: () => api.summary(month) });
  const spendQuery = useQuery({ queryKey: queryKeys.categorySpend(month), queryFn: () => api.categorySpend(month) });
  const cashFlowQuery = useQuery({ queryKey: queryKeys.cashFlow, queryFn: api.cashFlow });

  const summary = summaryQuery.data?.summary;
  const categorySpend = spendQuery.data?.categories ?? [];
  const cashFlow = cashFlowQuery.data?.cashFlow ?? [];
  const maxCategory = Math.max(...categorySpend.map((item) => item.amount), 1);
  const maxCashFlow = Math.max(...cashFlow.map((item) => Math.max(item.income, item.expenses)), 1);
  const refreshing = summaryQuery.isRefetching || spendQuery.isRefetching || cashFlowQuery.isRefetching;

  const refresh = () => {
    void Promise.all([summaryQuery.refetch(), spendQuery.refetch(), cashFlowQuery.refetch()]);
  };

  return (
    <Screen>
      <Header title="Analytics" subtitle={readableMonth(month)} />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
      >
        {summaryQuery.isLoading ? (
          <ActivityIndicator color={colors.primary} style={styles.loader} />
        ) : (
          <>
            <View style={styles.statRow}>
              <StatCard label="Income" value={money(summary?.income ?? 0)} icon="arrow-down-circle" tone="income" />
              <StatCard label="Expenses" value={money(summary?.expenses ?? 0)} icon="arrow-up-circle" tone="expense" />
            </View>
            <View style={styles.statRow}>
              <StatCard label="Net" value={money(summary?.balance ?? 0)} icon="wallet" tone="blue" />
              <StatCard label="Loans" value={money(summary?.loans ?? 0)} icon="swap-horizontal" tone="loan" />
            </View>
            <View style={styles.statRow}>
              <StatCard label="Savings rate" value={`${summary?.savingsRate ?? 0}%`} icon="trending-up" tone="primary" />
              <StatCard label="Outstanding loans" value={money(summary?.outstandingLoans ?? 0)} icon="hourglass" tone="loan" />
            </View>
          </>
        )}

        <Panel title="Cash flow">
          {cashFlow.length ? (
            <View style={styles.chart}>
              {cashFlow.map((point) => (
                <View key={point.month} style={styles.monthColumn}>
                  <View style={styles.barGroup}>
                    <View
                      style={[
                        styles.bar,
                        styles.incomeBar,
                        { height: Math.max((point.income / maxCashFlow) * 128, 4) }
                      ]}
                    />
                    <View
                      style={[
                        styles.bar,
                        styles.expenseBar,
                        { height: Math.max((point.expenses / maxCashFlow) * 128, 4) }
                      ]}
                    />
                  </View>
                  <Text style={styles.monthLabel}>{point.month.slice(5)}</Text>
                </View>
              ))}
            </View>
          ) : (
            <EmptyState icon="bar-chart" title="No cash flow yet" body="Monthly income and expenses appear after transactions are added." />
          )}
          <View style={styles.legend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: colors.income }]} />
              <Text style={styles.legendText}>Income</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: colors.expense }]} />
              <Text style={styles.legendText}>Expenses</Text>
            </View>
          </View>
        </Panel>

        <Panel title="Spending by category">
          {categorySpend.length ? (
            categorySpend.map((item) => (
              <View key={item.categoryId} style={styles.categoryRow}>
                <View style={styles.categoryHeader}>
                  <Text style={styles.categoryName} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text style={styles.categoryAmount}>{compactMoney(item.amount)}</Text>
                </View>
                <View style={styles.categoryTrack}>
                  <View
                    style={[
                      styles.categoryFill,
                      {
                        backgroundColor: item.color,
                        width: `${Math.max((item.amount / maxCategory) * 100, 4)}%`
                      }
                    ]}
                  />
                </View>
                <Text style={styles.percentage}>{item.percentage}% of tracked spending</Text>
              </View>
            ))
          ) : (
            <EmptyState icon="pie-chart" title="No breakdown" body="Expense categories populate this chart automatically." />
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
    paddingVertical: spacing.xl
  },
  statRow: {
    flexDirection: "row",
    gap: spacing.md
  },
  chart: {
    height: 178,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: spacing.sm
  },
  monthColumn: {
    flex: 1,
    alignItems: "center",
    gap: spacing.sm
  },
  barGroup: {
    height: 138,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "center",
    gap: 4
  },
  bar: {
    width: 12,
    borderRadius: 6
  },
  incomeBar: {
    backgroundColor: colors.income
  },
  expenseBar: {
    backgroundColor: colors.expense
  },
  monthLabel: {
    ...text.muted,
    fontWeight: "800"
  },
  legend: {
    flexDirection: "row",
    gap: spacing.lg,
    paddingTop: spacing.sm
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5
  },
  legendText: {
    ...text.muted,
    fontWeight: "800"
  },
  categoryRow: {
    gap: spacing.sm
  },
  categoryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.md
  },
  categoryName: {
    ...text.body,
    fontWeight: "800",
    flex: 1
  },
  categoryAmount: {
    ...text.body,
    fontWeight: "900"
  },
  categoryTrack: {
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.surfaceAlt,
    overflow: "hidden"
  },
  categoryFill: {
    height: "100%",
    borderRadius: 6
  },
  percentage: {
    ...text.muted
  }
});
