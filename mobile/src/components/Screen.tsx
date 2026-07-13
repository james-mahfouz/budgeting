import { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAppTheme } from "../theme";

type ScreenProps = {
  children: ReactNode;
};

export const Screen = ({ children }: ScreenProps) => {
  const insets = useSafeAreaInsets();
  const { colors } = useAppTheme();

  return (
    <View style={[styles.safeArea, { paddingTop: insets.top, backgroundColor: colors.background }]}>
      <View style={styles.content}>{children}</View>
    </View>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1
  },
  content: {
    flex: 1
  }
});
