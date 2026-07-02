import { create } from "zustand";
import type { Category } from "../types";

type BudgetStore = {
  isAddModalOpen: boolean;
  isCategoryModalOpen: boolean;
  isRecurringModalOpen: boolean;
  editingCategory: Category | null;
  openAddModal: () => void;
  closeAddModal: () => void;
  openCategoryModal: () => void;
  openEditCategoryModal: (category: Category) => void;
  closeCategoryModal: () => void;
  openRecurringModal: () => void;
  closeRecurringModal: () => void;
};

export const useBudgetStore = create<BudgetStore>((set) => ({
  isAddModalOpen: false,
  isCategoryModalOpen: false,
  isRecurringModalOpen: false,
  editingCategory: null,
  openAddModal: () => set({ isAddModalOpen: true }),
  closeAddModal: () => set({ isAddModalOpen: false }),
  openCategoryModal: () => set({ isCategoryModalOpen: true, editingCategory: null }),
  openEditCategoryModal: (category) => set({ isCategoryModalOpen: true, editingCategory: category }),
  closeCategoryModal: () => set({ isCategoryModalOpen: false, editingCategory: null }),
  openRecurringModal: () => set({ isRecurringModalOpen: true }),
  closeRecurringModal: () => set({ isRecurringModalOpen: false })
}));
