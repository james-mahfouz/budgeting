import { Ionicons } from "@expo/vector-icons";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { API_URL, api, queryKeys, trackEvent } from "../api/client";
import { Header } from "../components/Header";
import { Panel } from "../components/Panel";
import { Screen } from "../components/Screen";
import { useBudgetStore } from "../store/useBudgetStore";
import { colors, radii, spacing, text } from "../theme";
import { useScreenTracking } from "../utils/useScreenTracking";

export const SettingsScreen = () => {
  useScreenTracking("settings");
  const openAddModal = useBudgetStore((state) => state.openAddModal);
  const queryClient = useQueryClient();
  const healthQuery = useQuery({
    queryKey: queryKeys.health,
    queryFn: api.health,
    retry: 1
  });

  const refreshAll = () => {
    trackEvent("manual_refresh");
    void queryClient.invalidateQueries();
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
          <ActionButton icon="sync" label="Refresh data" onPress={refreshAll} />
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
  }
});

