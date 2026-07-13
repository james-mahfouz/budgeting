import Ionicons from "react-native-vector-icons/Ionicons";
import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { Category, Transaction } from "../types";
import { spacing, useAppTheme } from "../theme";
import { money } from "../utils/money";
import { readableDate } from "../utils/date";

type TransactionRowProps = {
  transaction: Transaction;
  category?: Category;
  trailing?: ReactNode;
  onPress?: () => void;
};

export const TransactionRow = ({ transaction, category, trailing, onPress }: TransactionRowProps) => {
  const { colors, text } = useAppTheme();
  const fallbackColor =
    transaction.type === "income" ? colors.income : transaction.type === "loan" ? colors.loan : colors.expense;
  const color = category?.color ?? fallbackColor;
  const sign = transaction.type === "income" ? "+" : "-";
  const metaPrefix = transaction.type === "loan" && transaction.repaidAt ? "Returned" : category?.name ?? "Uncategorized";

  return (
    <View style={styles.row}>
      <Pressable
        accessibilityRole={onPress ? "button" : undefined}
        accessibilityLabel={onPress ? `Edit ${transaction.merchant}` : undefined}
        disabled={!onPress}
        onPress={onPress}
        style={({ pressed }) => [styles.rowPressTarget, pressed && styles.rowPressed]}
      >
        <View style={[styles.icon, { backgroundColor: `${color}1A` }]}>
          <Ionicons name={(category?.icon as keyof typeof Ionicons.glyphMap) ?? "cash"} size={20} color={color} />
        </View>
        <View style={styles.copy}>
          <Text style={[styles.merchant, text.body]} numberOfLines={1}>
            {transaction.merchant}
          </Text>
          <Text style={[styles.meta, text.muted]} numberOfLines={1}>
            {metaPrefix} - {readableDate(transaction.occurredAt)}
          </Text>
        </View>
        <Text style={[styles.amount, { color: fallbackColor }]}>
          {sign}
          {money(transaction.amount)}
        </Text>
      </Pressable>
      {trailing}
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    minHeight: 68,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.sm
  },
  rowPressTarget: {
    flex: 1,
    minWidth: 0,
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md
  },
  rowPressed: {
    opacity: 0.72
  },
  icon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center"
  },
  copy: {
    flex: 1,
    minWidth: 0
  },
  merchant: {
    fontSize: 15,
    fontWeight: "800"
  },
  meta: {
    marginTop: 3
  },
  amount: {
    fontSize: 15,
    fontWeight: "900"
  }
});
