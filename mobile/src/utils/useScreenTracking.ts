import { useFocusEffect } from "@react-navigation/native";
import { useCallback } from "react";
import { trackEvent } from "../api/client";

export const useScreenTracking = (screen: string) => {
  useFocusEffect(
    useCallback(() => {
      trackEvent("screen_view", { screen });
    }, [screen])
  );
};

