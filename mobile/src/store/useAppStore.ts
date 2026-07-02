import { create } from "zustand";
import type { Category, User } from "../types";

type AppStore = {
  isAuthReady: boolean;
  user: User | null;
  isAddModalOpen: boolean;
  isCategoryModalOpen: boolean;
  isRecurringModalOpen: boolean;
  editingCategory: Category | null;
  setAuthReady: (ready: boolean) => void;
  signIn: (user: User) => void;
  signOut: () => void;
  openAddModal: () => void;
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
  setAuthReady: (ready) => set({ isAuthReady: ready }),
  signIn: (user) => set({ user, isAuthReady: true }),
  signOut: () =>
    set({
      user: null,
      isAuthReady: true,
      isAddModalOpen: false,
      isCategoryModalOpen: false,
      isRecurringModalOpen: false,
      editingCategory: null
    }),
  openAddModal: () => set({ isAddModalOpen: true }),
  closeAddModal: () => set({ isAddModalOpen: false }),
  openCategoryModal: () => set({ isCategoryModalOpen: true, editingCategory: null }),
  openEditCategoryModal: (category) => set({ isCategoryModalOpen: true, editingCategory: category }),
  closeCategoryModal: () => set({ isCategoryModalOpen: false, editingCategory: null }),
  openRecurringModal: () => set({ isRecurringModalOpen: true }),
  closeRecurringModal: () => set({ isRecurringModalOpen: false })
}));
