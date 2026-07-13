import { NavigationContainer } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ActivityIndicator, Platform, StatusBar as NativeStatusBar, StyleSheet, useColorScheme, View } from "react-native";
import { useEffect, useMemo, useState } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AddCategoryModal } from "./src/components/AddCategoryModal";
import { AddRecurringPaymentModal } from "./src/components/AddRecurringPaymentModal";
import { AddTransactionModal } from "./src/components/AddTransactionModal";
import { AuthScreen } from "./src/screens/AuthScreen";
import { BottomTabs } from "./src/navigation/BottomTabs";
import { useAppStore } from "./src/store/useAppStore";
import { api, queryKeys, setAuthToken, trackEvent } from "./src/api/client";
import { authTokenKey, themePreferenceKey } from "./src/auth/storage";
import { createAppTheme, ThemeContext } from "./src/theme";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 20_000,
      retry: 1
    }
  }
});

const AppContent = () => {
  const [isThemeReady, setThemeReady] = useState(false);
  const systemScheme = useColorScheme();
  const isAuthReady = useAppStore((state) => state.isAuthReady);
  const user = useAppStore((state) => state.user);
  const isAddModalOpen = useAppStore((state) => state.isAddModalOpen);
  const isCategoryModalOpen = useAppStore((state) => state.isCategoryModalOpen);
  const isRecurringModalOpen = useAppStore((state) => state.isRecurringModalOpen);
  const themePreference = useAppStore((state) => state.themePreference);
  const openAddModal = useAppStore((state) => state.openAddModal);
  const closeAddModal = useAppStore((state) => state.closeAddModal);
  const closeCategoryModal = useAppStore((state) => state.closeCategoryModal);
  const closeRecurringModal = useAppStore((state) => state.closeRecurringModal);
  const setAuthReady = useAppStore((state) => state.setAuthReady);
  const signIn = useAppStore((state) => state.signIn);
  const signOut = useAppStore((state) => state.signOut);
  const setThemePreference = useAppStore((state) => state.setThemePreference);
  const resolvedTheme = themePreference === "system" ? (systemScheme === "dark" ? "dark" : "light") : themePreference;
  const appTheme = useMemo(() => createAppTheme(resolvedTheme), [resolvedTheme]);
  const palette = appTheme.colors;

  useEffect(() => {
    if (Platform.OS === "android") {
      NativeStatusBar.setBackgroundColor(palette.background);
      NativeStatusBar.setBarStyle(appTheme.isDark ? "light-content" : "dark-content");
    }
  }, [appTheme.isDark, palette.background]);

  useEffect(() => {
    const restoreThemePreference = async () => {
      const stored = await AsyncStorage.getItem(themePreferenceKey);
      if (stored === "system" || stored === "light" || stored === "dark") {
        setThemePreference(stored);
      }
      setThemeReady(true);
    };

    void restoreThemePreference();
  }, [setThemePreference]);

  useEffect(() => {
    if (!isThemeReady) {
      return;
    }

    void AsyncStorage.setItem(themePreferenceKey, themePreference);
  }, [isThemeReady, themePreference]);

  useEffect(() => {
    const restoreSession = async () => {
      const token = await AsyncStorage.getItem(authTokenKey);
      if (!token) {
        setAuthReady(true);
        return;
      }

      try {
        setAuthToken(token);
        const refreshed = await api.refresh();
        if (!refreshed.token || !refreshed.user) {
          throw new Error("Session refresh did not return a token");
        }
        setAuthToken(refreshed.token);
        await AsyncStorage.setItem(authTokenKey, refreshed.token);
        signIn(refreshed.user);
      } catch {
        setAuthToken(null);
        await AsyncStorage.removeItem(authTokenKey);
        signOut();
      }
    };

    void restoreSession();
  }, [setAuthReady, signIn, signOut]);

  useEffect(() => {
    if (!user) {
      return;
    }

    void queryClient.prefetchQuery({ queryKey: queryKeys.categories, queryFn: api.categories });
    trackEvent("app_open", { platform: "android-first" });
    const timer = setTimeout(() => openAddModal(), 350);
    return () => clearTimeout(timer);
  }, [openAddModal, user]);

  useEffect(() => {
    if (!user) {
      return;
    }

    const refreshSession = async () => {
      try {
        const refreshed = await api.refresh();
        if (!refreshed.token || !refreshed.user) {
          throw new Error("Session refresh did not return a token");
        }
        setAuthToken(refreshed.token);
        await AsyncStorage.setItem(authTokenKey, refreshed.token);
        signIn(refreshed.user);
      } catch {
        setAuthToken(null);
        await AsyncStorage.removeItem(authTokenKey);
        queryClient.clear();
        signOut();
      }
    };

    const interval = setInterval(() => void refreshSession(), 12 * 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, [signIn, signOut, user]);

  if (!isAuthReady) {
    return (
      <ThemeContext.Provider value={appTheme}>
        <View style={[styles.loading, { backgroundColor: palette.background }]}>
          <ActivityIndicator color={palette.primary} />
        </View>
      </ThemeContext.Provider>
    );
  }

  if (!user) {
    return (
      <ThemeContext.Provider value={appTheme}>
        <AuthScreen />
      </ThemeContext.Provider>
    );
  }

  return (
    <ThemeContext.Provider value={appTheme}>
      <NavigationContainer theme={appTheme.navigation}>
        <BottomTabs />
      </NavigationContainer>
      <AddTransactionModal visible={isAddModalOpen} onClose={closeAddModal} />
      <AddCategoryModal visible={isCategoryModalOpen} onClose={closeCategoryModal} />
      <AddRecurringPaymentModal visible={isRecurringModalOpen} onClose={closeRecurringModal} />
    </ThemeContext.Provider>
  );
};

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center"
  }
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <AppContent />
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}
