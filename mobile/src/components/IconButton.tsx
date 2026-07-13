import Ionicons from "react-native-vector-icons/Ionicons";
import { Pressable, StyleSheet, ViewStyle } from "react-native";
import { useAppTheme } from "../theme";

type IconButtonProps = {
  name: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  color?: string;
  backgroundColor?: string;
  style?: ViewStyle;
};

export const IconButton = ({ name, label, onPress, color, backgroundColor, style }: IconButtonProps) => {
  const { colors } = useAppTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: backgroundColor ?? colors.surfaceAlt, opacity: pressed ? 0.72 : 1 },
        style
      ]}
    >
      <Ionicons name={name} size={20} color={color ?? colors.ink} />
    </Pressable>
  );
};

const styles = StyleSheet.create({
  button: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 21
  }
});
