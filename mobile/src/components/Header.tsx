import { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { spacing, useAppTheme } from "../theme";

type HeaderProps = {
  title: string;
  subtitle?: string;
  action?: ReactNode;
};

export const Header = ({ title, subtitle, action }: HeaderProps) => {
  const { text } = useAppTheme();

  return (
    <View style={styles.header}>
      <View style={styles.copy}>
        <Text style={text.title} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? <Text style={[styles.subtitle, text.muted]}>{subtitle}</Text> : null}
      </View>
      {action}
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md
  },
  copy: {
    flex: 1,
    minWidth: 0
  },
  subtitle: {
    marginTop: 2
  }
});
