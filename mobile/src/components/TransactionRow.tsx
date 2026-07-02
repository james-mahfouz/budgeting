import { Ionicons } from "@expo/vector-icons";
import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import type { Category, Transaction } from "../types";
import { colors, spacing, text } from "../theme";
import { money } from "../utils/money";
import { readableDate } from "../utils/date";

type TransactionRowProps = {
  transaction: Transaction;
  category?: Category;
  trailing?: ReactNode;
};

export const TransactionRow = ({ transaction, category, trailing }: TransactionRowProps) => {
  const color = category?.color ?? (transaction.type === "income" ? colors.income : colors.expense);
  const sign = transaction.type === "income" ? "+" : "-";

  return (
    <View style={styles.row}>
      <View style={[styles.icon, { backgroundColor: `${color}1A` }]}>
        <Ionicons name={(category?.icon as keyof typeof Ionicons.glyphMap) ?? "cash"} size={20} color={color} />
      </View>
      <View style={styles.copy}>
        <Text style={styles.merchant} numberOfLines={1}>
          {transaction.merchant}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          {category?.name ?? "Uncategorized"} - {readableDate(transaction.occurredAt)}
        </Text>
      </View>
      <Text style={[styles.amount, { color: transaction.type === "income" ? colors.income : colors.expense }]}>
        {sign}
        {money(transaction.amount)}
      </Text>
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
    ...text.body,
    fontWeight: "800"
  },
  meta: {
    ...text.muted,
    marginTop: 3
  },
  amount: {
    fontSize: 15,
    fontWeight: "900"
  }
});
