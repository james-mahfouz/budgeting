import { create } from "zustand";

type BudgetStore = {
  isAddModalOpen: boolean;
  openAddModal: () => void;
  closeAddModal: () => void;
};

export const useBudgetStore = create<BudgetStore>((set) => ({
  isAddModalOpen: false,
  openAddModal: () => set({ isAddModalOpen: true }),
  closeAddModal: () => set({ isAddModalOpen: false })
}));

