import { NavigationContainer } from "@react-navigation/native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StatusBar } from "expo-status-bar";
import { Platform, StatusBar as NativeStatusBar } from "react-native";
import { useEffect } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AddCategoryModal } from "./src/components/AddCategoryModal";
import { AddRecurringPaymentModal } from "./src/components/AddRecurringPaymentModal";
import { AddTransactionModal } from "./src/components/AddTransactionModal";
import { BottomTabs } from "./src/navigation/BottomTabs";
import { useBudgetStore } from "./src/store/useBudgetStore";
import { trackEvent } from "./src/api/client";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 20_000,
      retry: 1
    }
  }
});

const AppContent = () => {
  const isAddModalOpen = useBudgetStore((state) => state.isAddModalOpen);
  const isCategoryModalOpen = useBudgetStore((state) => state.isCategoryModalOpen);
  const isRecurringModalOpen = useBudgetStore((state) => state.isRecurringModalOpen);
  const openAddModal = useBudgetStore((state) => state.openAddModal);
  const closeAddModal = useBudgetStore((state) => state.closeAddModal);
  const closeCategoryModal = useBudgetStore((state) => state.closeCategoryModal);
  const closeRecurringModal = useBudgetStore((state) => state.closeRecurringModal);

  useEffect(() => {
    if (Platform.OS === "android") {
      NativeStatusBar.setBackgroundColor("#F7FAFC");
    }
    trackEvent("app_open", { platform: "android-first" });
    const timer = setTimeout(openAddModal, 350);
    return () => clearTimeout(timer);
  }, [openAddModal]);

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

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <AppContent />
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}
