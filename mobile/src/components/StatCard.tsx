import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";
import { colors, radii, spacing, text } from "../theme";

type StatCardProps = {
  label: string;
  value: string;
  icon: keyof typeof Ionicons.glyphMap;
  tone?: "primary" | "income" | "expense" | "blue";
};

const toneColors = {
  primary: colors.primary,
  income: colors.income,
  expense: colors.expense,
  blue: colors.blue
};

export const StatCard = ({ label, value, icon, tone = "primary" }: StatCardProps) => (
  <View style={styles.card}>
    <View style={[styles.icon, { backgroundColor: `${toneColors[tone]}18` }]}>
      <Ionicons name={icon} size={20} color={toneColors[tone]} />
    </View>
    <Text style={styles.label}>{label}</Text>
    <Text style={styles.value} numberOfLines={1} adjustsFontSizeToFit>
      {value}
    </Text>
  </View>
);

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minHeight: 124,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.shadow,
    shadowOpacity: 1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2
  },
  icon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md
  },
  label: {
    ...text.muted,
    marginBottom: spacing.xs
  },
  value: {
    fontSize: 21,
    fontWeight: "800",
    color: colors.ink
  }
});

