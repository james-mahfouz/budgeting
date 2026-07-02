import { Ionicons } from "@expo/vector-icons";
import { Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { API_URL, api, queryKeys, trackEvent } from "../api/client";
import { EmptyState } from "../components/EmptyState";
import { Header } from "../components/Header";
import { IconButton } from "../components/IconButton";
import { Panel } from "../components/Panel";
import { Screen } from "../components/Screen";
import { useBudgetStore } from "../store/useBudgetStore";
import { colors, radii, spacing, text } from "../theme";
import { readableDate } from "../utils/date";
import { money } from "../utils/money";
import { useScreenTracking } from "../utils/useScreenTracking";

export const SettingsScreen = () => {
  useScreenTracking("settings");
  const openAddModal = useBudgetStore((state) => state.openAddModal);
  const openCategoryModal = useBudgetStore((state) => state.openCategoryModal);
  const openRecurringModal = useBudgetStore((state) => state.openRecurringModal);
  const queryClient = useQueryClient();
  const healthQuery = useQuery({
    queryKey: queryKeys.health,
    queryFn: api.health,
    retry: 1
  });
  const categoriesQuery = useQuery({ queryKey: queryKeys.categories, queryFn: api.categories });
  const recurringQuery = useQuery({ queryKey: queryKeys.recurringPayments, queryFn: api.recurringPayments });

  const categoriesById = useMemo(() => {
    return new Map((categoriesQuery.data?.categories ?? []).map((category) => [category.id, category]));
  }, [categoriesQuery.data?.categories]);

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

  const refreshAll = () => {
    trackEvent("manual_refresh");
    void queryClient.invalidateQueries();
  };

  const confirmDeleteRecurring = (id: string) => {
    Alert.alert("Delete recurring payment?", "Future automatic payments will stop.", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => deleteRecurringMutation.mutate(id) }
    ]);
  };

  return (
    <Screen>
      <Header title="Settings" subtitle="App status and controls" />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={healthQuery.isRefetching} onRefresh={() => void healthQuery.refetch()} />}
      >
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
          <Text style={styles.note}>
            Android emulator uses 10.0.2.2 for the host machine. Physical devices need your computer LAN IP in
            EXPO_PUBLIC_API_URL.
          </Text>
        </Panel>

        <Panel title="Quick actions">
          <ActionButton icon="add-circle" label="Add transaction" onPress={openAddModal} />
          <ActionButton icon="pricetag" label="Add category" onPress={openCategoryModal} />
          <ActionButton icon="repeat" label="Add recurring payment" onPress={openRecurringModal} />
          <ActionButton icon="sync" label="Refresh data" onPress={refreshAll} />
        </Panel>

        <Panel title="Recurring payments">
          {(recurringQuery.data?.recurringPayments ?? []).length ? (
            recurringQuery.data?.recurringPayments.map((rule) => {
              const category = categoriesById.get(rule.categoryId);
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
                      {money(rule.amount)} every {rule.intervalEvery} {rule.intervalUnit}
                      {rule.intervalEvery > 1 ? "s" : ""} · next {readableDate(rule.nextRunAt)}
                    </Text>
                  </View>
                  <IconButton
                    name="trash-outline"
                    label="Delete recurring payment"
                    onPress={() => confirmDeleteRecurring(rule.id)}
                    color={colors.danger}
                    backgroundColor="#FEF3F2"
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

        <Panel title="Analytics">
          <View style={styles.analyticsRow}>
            <Ionicons name="analytics" size={22} color={colors.primary} />
            <Text style={styles.analyticsText}>
              The app records lightweight first-party events such as app open, screen views, modal close, refresh, and
              transaction creation. It does not include a third-party analytics SDK.
            </Text>
          </View>
        </Panel>
      </ScrollView>
    </Screen>
  );
};

const ActionButton = ({ icon, label, onPress }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void }) => (
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

const styles = StyleSheet.create({
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
  analyticsRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md
  },
  analyticsText: {
    ...text.muted,
    flex: 1,
    lineHeight: 20
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
  }
});
