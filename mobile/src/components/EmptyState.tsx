import Ionicons from "react-native-vector-icons/Ionicons";
import { StyleSheet, Text, View } from "react-native";
import { radii, spacing, useAppTheme } from "../theme";

type EmptyStateProps = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  body: string;
};

export const EmptyState = ({ icon, title, body }: EmptyStateProps) => {
  const { colors, text } = useAppTheme();

  return (
    <View style={[styles.empty, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Ionicons name={icon} size={26} color={colors.muted} />
      <Text style={[styles.title, text.h2]}>{title}</Text>
      <Text style={[styles.body, text.muted]}>{body}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  empty: {
    alignItems: "center",
    gap: spacing.sm,
    padding: spacing.xl,
    borderRadius: radii.md,
    borderWidth: 1
  },
  title: {
    textAlign: "center"
  },
  body: {
    textAlign: "center",
    lineHeight: 20
  }
});
