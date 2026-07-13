declare module "react-native-vector-icons/Ionicons" {
  import type { ComponentType } from "react";
  import type { TextStyle } from "react-native";

  type IconProps = {
    name: string;
    size?: number;
    color?: string;
    style?: TextStyle;
  };

  const Ionicons: ComponentType<IconProps> & {
    glyphMap: Record<string, number>;
  };

  export default Ionicons;
}
