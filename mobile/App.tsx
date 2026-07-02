import { NavigationContainer } from "@react-navigation/native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
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
  const openAddModal = useBudgetStore((state) => state.openAddModal);
  const closeAddModal = useBudgetStore((state) => state.closeAddModal);

  useEffect(() => {
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

