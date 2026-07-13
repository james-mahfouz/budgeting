import { Image, StyleSheet, View } from "react-native";
import { useAppTheme } from "../theme";

type AppLogoProps = {
  size?: number;
};

export const AppLogo = ({ size = 72 }: AppLogoProps) => {
  const { colors } = useAppTheme();

  return (
    <View style={[styles.wrap, { width: size, height: size, borderRadius: size * 0.24, shadowColor: colors.shadow }]}>
      <Image
        source={require("../../assets/logo.png")}
        resizeMode="contain"
        style={{ width: size, height: size, borderRadius: size * 0.24 }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    shadowOpacity: 1,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6
  }
});
