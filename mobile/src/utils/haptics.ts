import { Platform, Vibration } from "react-native";

export const successFeedback = async () => {
  if (Platform.OS === "android") {
    Vibration.vibrate(18);
  }
};
