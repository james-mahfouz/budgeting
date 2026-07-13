import { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { radii, spacing, useAppTheme } from "../theme";

type PanelProps = {
  title?: string;
  action?: ReactNode;
  children: ReactNode;
};

export const Panel = ({ title, action, children }: PanelProps) => {
  const { colors, text } = useAppTheme();

  return (
    <View style={[styles.panel, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      {title || action ? (
        <View style={styles.header}>
          {title ? <Text style={[styles.title, text.h2]}>{title}</Text> : <View />}
          {action}
        </View>
      ) : null}
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  panel: {
    borderRadius: radii.md,
    padding: spacing.lg,
    borderWidth: 1,
    gap: spacing.md
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md
  },
  title: {
    flex: 1
  }
});
