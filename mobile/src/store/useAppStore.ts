import { create } from "zustand";
import type { ThemePreference } from "../theme";
import type { Category, Subcategory, Transaction, TransactionType, User } from "../types";

type AppStore = {
  isAuthReady: boolean;
  user: User | null;
  isAddModalOpen: boolean;
  isCategoryModalOpen: boolean;
  isSubcategoryModalOpen: boolean;
  isRecurringModalOpen: boolean;
  editingCategory: Category | null;
  editingSubcategory: Subcategory | null;
  editingTransaction: Transaction | null;
  preferredTransactionType: TransactionType | null;
  preferredCategoryKind: TransactionType | null;
  preferredSubcategoryCategoryId: string | null;
  themePreference: ThemePreference;
  setAuthReady: (ready: boolean) => void;
  signIn: (user: User) => void;
  signOut: () => void;
  setThemePreference: (preference: ThemePreference) => void;
  openAddModal: (type?: TransactionType) => void;
  openEditTransactionModal: (transaction: Transaction) => void;
  closeAddModal: () => void;
  openCategoryModal: (kind?: TransactionType) => void;
  openEditCategoryModal: (category: Category) => void;
  closeCategoryModal: () => void;
  openSubcategoryModal: (categoryId: string) => void;
  openEditSubcategoryModal: (subcategory: Subcategory) => void;
  closeSubcategoryModal: () => void;
  openRecurringModal: () => void;
  closeRecurringModal: () => void;
};

export const useAppStore = create<AppStore>((set) => ({
  isAuthReady: false,
  user: null,
  isAddModalOpen: false,
  isCategoryModalOpen: false,
  isSubcategoryModalOpen: false,
  isRecurringModalOpen: false,
  editingCategory: null,
  editingSubcategory: null,
  editingTransaction: null,
  preferredTransactionType: null,
  preferredCategoryKind: null,
  preferredSubcategoryCategoryId: null,
  themePreference: "system",
  setAuthReady: (ready) => set({ isAuthReady: ready }),
  signIn: (user) => set({ user, isAuthReady: true }),
  setThemePreference: (preference) => set({ themePreference: preference }),
  signOut: () =>
    set({
      user: null,
      isAuthReady: true,
      isAddModalOpen: false,
      isCategoryModalOpen: false,
      isSubcategoryModalOpen: false,
      isRecurringModalOpen: false,
      editingCategory: null,
      editingSubcategory: null,
      editingTransaction: null,
      preferredTransactionType: null,
      preferredCategoryKind: null,
      preferredSubcategoryCategoryId: null
    }),
  openAddModal: (type = "expense") => set({ isAddModalOpen: true, editingTransaction: null, preferredTransactionType: type }),
  openEditTransactionModal: (transaction) =>
    set({ isAddModalOpen: true, editingTransaction: transaction, preferredTransactionType: null }),
  closeAddModal: () => set({ isAddModalOpen: false, editingTransaction: null, preferredTransactionType: null }),
  openCategoryModal: (kind = "expense") => set({ isCategoryModalOpen: true, editingCategory: null, preferredCategoryKind: kind }),
  openEditCategoryModal: (category) => set({ isCategoryModalOpen: true, editingCategory: category, preferredCategoryKind: null }),
  closeCategoryModal: () => set({ isCategoryModalOpen: false, editingCategory: null, preferredCategoryKind: null }),
  openSubcategoryModal: (categoryId) =>
    set({ isSubcategoryModalOpen: true, editingSubcategory: null, preferredSubcategoryCategoryId: categoryId }),
  openEditSubcategoryModal: (subcategory) =>
    set({ isSubcategoryModalOpen: true, editingSubcategory: subcategory, preferredSubcategoryCategoryId: null }),
  closeSubcategoryModal: () =>
    set({ isSubcategoryModalOpen: false, editingSubcategory: null, preferredSubcategoryCategoryId: null }),
  openRecurringModal: () => set({ isRecurringModalOpen: true }),
  closeRecurringModal: () => set({ isRecurringModalOpen: false })
}));
