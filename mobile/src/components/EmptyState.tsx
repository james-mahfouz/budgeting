import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";
import { colors, radii, spacing, text } from "../theme";

type EmptyStateProps = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  body: string;
};

export const EmptyState = ({ icon, title, body }: EmptyStateProps) => (
  <View style={styles.empty}>
    <Ionicons name={icon} size={26} color={colors.muted} />
    <Text style={styles.title}>{title}</Text>
    <Text style={styles.body}>{body}</Text>
  </View>
);

const styles = StyleSheet.create({
  empty: {
    alignItems: "center",
    gap: spacing.sm,
    padding: spacing.xl,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border
  },
  title: {
    ...text.h2,
    textAlign: "center"
  },
  body: {
    ...text.muted,
    textAlign: "center",
    lineHeight: 20
  }
});

