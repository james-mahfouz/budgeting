import { NavigationContainer } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StatusBar } from "expo-status-bar";
import { ActivityIndicator, Platform, StatusBar as NativeStatusBar, StyleSheet, View } from "react-native";
import { useEffect } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AddCategoryModal } from "./src/components/AddCategoryModal";
import { AddRecurringPaymentModal } from "./src/components/AddRecurringPaymentModal";
import { AddTransactionModal } from "./src/components/AddTransactionModal";
import { AuthScreen } from "./src/screens/AuthScreen";
import { BottomTabs } from "./src/navigation/BottomTabs";
import { useAppStore } from "./src/store/useAppStore";
import { api, queryKeys, setAuthToken, trackEvent } from "./src/api/client";
import { authTokenKey } from "./src/auth/storage";
import { colors } from "./src/theme";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 20_000,
      retry: 1
    }
  }
});

const AppContent = () => {
  const isAuthReady = useAppStore((state) => state.isAuthReady);
  const user = useAppStore((state) => state.user);
  const isAddModalOpen = useAppStore((state) => state.isAddModalOpen);
  const isCategoryModalOpen = useAppStore((state) => state.isCategoryModalOpen);
  const isRecurringModalOpen = useAppStore((state) => state.isRecurringModalOpen);
  const openAddModal = useAppStore((state) => state.openAddModal);
  const closeAddModal = useAppStore((state) => state.closeAddModal);
  const closeCategoryModal = useAppStore((state) => state.closeCategoryModal);
  const closeRecurringModal = useAppStore((state) => state.closeRecurringModal);
  const setAuthReady = useAppStore((state) => state.setAuthReady);
  const signIn = useAppStore((state) => state.signIn);
  const signOut = useAppStore((state) => state.signOut);

  useEffect(() => {
    if (Platform.OS === "android") {
      NativeStatusBar.setBackgroundColor("#F7FAFC");
    }
  }, []);

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
    const timer = setTimeout(openAddModal, 350);
    return () => clearTimeout(timer);
  }, [openAddModal, user]);

  useEffect(() => {
    if (!user) {
      return;
    }

    const refreshSession = async () => {
      try {
        const refreshed = await api.refresh();
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
      <View style={styles.loading}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!user) {
    return (
      <>
        <AuthScreen />
        <StatusBar style="dark" />
      </>
    );
  }

  return (
    <>
      <NavigationContainer>
        <BottomTabs />
      </NavigationContainer>
      <AddTransactionModal visible={isAddModalOpen} onClose={closeAddModal} />
      <AddCategoryModal visible={isCategoryModalOpen} onClose={closeCategoryModal} />
      <AddRecurringPaymentModal visible={isRecurringModalOpen} onClose={closeRecurringModal} />
      <StatusBar style="dark" />
    </>
  );
};

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background
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
