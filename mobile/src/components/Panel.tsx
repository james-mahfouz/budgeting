import { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { colors, radii, spacing, text } from "../theme";

type PanelProps = {
  title?: string;
  action?: ReactNode;
  children: ReactNode;
};

export const Panel = ({ title, action, children }: PanelProps) => (
  <View style={styles.panel}>
    {title || action ? (
      <View style={styles.header}>
        {title ? <Text style={styles.title}>{title}</Text> : <View />}
        {action}
      </View>
    ) : null}
    {children}
  </View>
);

const styles = StyleSheet.create({
  panel: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.md
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md
  },
  title: {
    ...text.h2,
    flex: 1
  }
});

