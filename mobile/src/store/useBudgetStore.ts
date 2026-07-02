import { create } from "zustand";

type BudgetStore = {
  isAddModalOpen: boolean;
  isCategoryModalOpen: boolean;
  isRecurringModalOpen: boolean;
  openAddModal: () => void;
  closeAddModal: () => void;
  openCategoryModal: () => void;
  closeCategoryModal: () => void;
  openRecurringModal: () => void;
  closeRecurringModal: () => void;
};

export const useBudgetStore = create<BudgetStore>((set) => ({
  isAddModalOpen: false,
  isCategoryModalOpen: false,
  isRecurringModalOpen: false,
  openAddModal: () => set({ isAddModalOpen: true }),
  closeAddModal: () => set({ isAddModalOpen: false }),
  openCategoryModal: () => set({ isCategoryModalOpen: true }),
  closeCategoryModal: () => set({ isCategoryModalOpen: false }),
  openRecurringModal: () => set({ isRecurringModalOpen: true }),
  closeRecurringModal: () => set({ isRecurringModalOpen: false })
}));
