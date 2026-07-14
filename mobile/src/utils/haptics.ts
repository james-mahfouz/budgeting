import { Platform, Vibration } from "react-native";

export const successFeedback = async () => {
  if (Platform.OS === "android") {
    try {
      Vibration.vibrate(18);
    } catch {
      // Feedback is optional; never let a device permission quirk crash the app.
    }
  }
};
