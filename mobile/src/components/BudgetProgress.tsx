import { StyleSheet, Text, View } from "react-native";
import { colors, radii, spacing, text } from "../theme";
import { money } from "../utils/money";

type BudgetProgressProps = {
  name: string;
  color: string;
  spent: number;
  limit: number;
};

export const BudgetProgress = ({ name, color, spent, limit }: BudgetProgressProps) => {
  const progress = limit > 0 ? Math.min((spent / limit) * 100, 100) : 0;
  const isOver = spent > limit;

  return (
    <View style={styles.row}>
      <View style={styles.header}>
        <Text style={styles.name} numberOfLines={1}>
          {name}
        </Text>
        <Text style={[styles.amount, isOver && styles.over]}>{`${money(spent)} / ${money(limit)}`}</Text>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${progress}%`, backgroundColor: isOver ? colors.danger : color }]} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    gap: spacing.sm
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.md
  },
  name: {
    ...text.body,
    flex: 1,
    fontWeight: "700"
  },
  amount: {
    ...text.muted,
    fontWeight: "700"
  },
  over: {
    color: colors.danger
  },
  track: {
    height: 10,
    backgroundColor: colors.surfaceAlt,
    borderRadius: 5,
    overflow: "hidden"
  },
  fill: {
    height: "100%",
    borderRadius: 5
  }
});

