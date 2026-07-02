import { ReactNode } from "react";
import { SafeAreaView, StyleSheet, View } from "react-native";
import { colors } from "../theme";

type ScreenProps = {
  children: ReactNode;
};

export const Screen = ({ children }: ScreenProps) => (
  <SafeAreaView style={styles.safeArea}>
    <View style={styles.content}>{children}</View>
  </SafeAreaView>
);

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background
  },
  content: {
    flex: 1
  }
});

