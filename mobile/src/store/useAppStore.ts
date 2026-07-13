import { create } from "zustand";
import type { Category, Transaction, User } from "../types";

type AppStore = {
  isAuthReady: boolean;
  user: User | null;
  isAddModalOpen: boolean;
  isCategoryModalOpen: boolean;
  isRecurringModalOpen: boolean;
  editingCategory: Category | null;
  editingTransaction: Transaction | null;
  setAuthReady: (ready: boolean) => void;
  signIn: (user: User) => void;
  signOut: () => void;
  openAddModal: () => void;
  openEditTransactionModal: (transaction: Transaction) => void;
  closeAddModal: () => void;
  openCategoryModal: () => void;
  openEditCategoryModal: (category: Category) => void;
  closeCategoryModal: () => void;
  openRecurringModal: () => void;
  closeRecurringModal: () => void;
};

export const useAppStore = create<AppStore>((set) => ({
  isAuthReady: false,
  user: null,
  isAddModalOpen: false,
  isCategoryModalOpen: false,
  isRecurringModalOpen: false,
  editingCategory: null,
  editingTransaction: null,
  setAuthReady: (ready) => set({ isAuthReady: ready }),
  signIn: (user) => set({ user, isAuthReady: true }),
  signOut: () =>
    set({
      user: null,
      isAuthReady: true,
      isAddModalOpen: false,
      isCategoryModalOpen: false,
      isRecurringModalOpen: false,
      editingCategory: null,
      editingTransaction: null
    }),
  openAddModal: () => set({ isAddModalOpen: true, editingTransaction: null }),
  openEditTransactionModal: (transaction) => set({ isAddModalOpen: true, editingTransaction: transaction }),
  closeAddModal: () => set({ isAddModalOpen: false, editingTransaction: null }),
  openCategoryModal: () => set({ isCategoryModalOpen: true, editingCategory: null }),
  openEditCategoryModal: (category) => set({ isCategoryModalOpen: true, editingCategory: category }),
  closeCategoryModal: () => set({ isCategoryModalOpen: false, editingCategory: null }),
  openRecurringModal: () => set({ isRecurringModalOpen: true }),
  closeRecurringModal: () => set({ isRecurringModalOpen: false })
}));
