import Ionicons from "react-native-vector-icons/Ionicons";
import { StyleSheet, Text, View } from "react-native";
import { radii, spacing, useAppTheme } from "../theme";

type StatCardProps = {
  label: string;
  value: string;
  icon: keyof typeof Ionicons.glyphMap;
  tone?: "primary" | "income" | "expense" | "loan" | "blue";
};

export const StatCard = ({ label, value, icon, tone = "primary" }: StatCardProps) => {
  const { colors, text } = useAppTheme();
  const toneColor = colors[tone];

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border, shadowColor: colors.shadow }]}>
      <View style={[styles.icon, { backgroundColor: `${toneColor}18` }]}>
        <Ionicons name={icon} size={20} color={toneColor} />
      </View>
      <Text style={[styles.label, text.muted]}>{label}</Text>
      <Text style={[styles.value, { color: colors.ink }]} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minHeight: 124,
    borderRadius: radii.md,
    padding: spacing.lg,
    borderWidth: 1,
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
    marginBottom: spacing.xs
  },
  value: {
    fontSize: 21,
    fontWeight: "800"
  }
});
