import Ionicons from "react-native-vector-icons/Ionicons";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, queryKeys, trackEvent } from "../api/client";
import { useAppStore } from "../store/useAppStore";
import { radii, spacing, useAppTheme, type AppColors, type AppText } from "../theme";
import type { Category } from "../types";
import { successFeedback } from "../utils/haptics";

type AddSubcategoryModalProps = {
  visible: boolean;
  onClose: () => void;
};

export const AddSubcategoryModal = ({ visible, onClose }: AddSubcategoryModalProps) => {
  const { colors, text } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, text), [colors, text]);
  const queryClient = useQueryClient();
  const editingSubcategory = useAppStore((state) => state.editingSubcategory);
  const preferredCategoryId = useAppStore((state) => state.preferredSubcategoryCategoryId);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const categoriesQuery = useQuery({ queryKey: queryKeys.categories, queryFn: api.categories });
  const categories = useMemo(() => categoriesQuery.data?.categories ?? [], [categoriesQuery.data?.categories]);
  const isEditing = Boolean(editingSubcategory);

  useEffect(() => {
    if (!visible) {
      return;
    }

    if (editingSubcategory) {
      setCategoryId(editingSubcategory.categoryId);
      setName(editingSubcategory.name);
      return;
    }

    setCategoryId(preferredCategoryId ?? categories[0]?.id ?? null);
    setName("");
  }, [categories, editingSubcategory, preferredCategoryId, visible]);

  const mutation = useMutation({
    mutationFn: (input: Parameters<typeof api.createSubcategory>[0]) =>
      editingSubcategory
        ? api.updateSubcategory(editingSubcategory.id, input)
        : api.createSubcategory(input),
    onSuccess: async () => {
      trackEvent(isEditing ? "subcategory_updated_from_app" : "subcategory_created_from_app", { categoryId });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.subcategories }),
        queryClient.invalidateQueries({ queryKey: queryKeys.transactions }),
        queryClient.invalidateQueries({ queryKey: queryKeys.recurringPayments })
      ]);
      await successFeedback();
      onClose();
    },
    onError: (error) => {
      Alert.alert("Could not save subcategory", error instanceof Error ? error.message : "Try again.");
    }
  });

  const submit = () => {
    if (!categoryId) {
      Alert.alert("Category needed", "Choose a parent category.");
      return;
    }

    if (!name.trim()) {
      Alert.alert("Name needed", "Add a subcategory name.");
      return;
    }

    const input = { categoryId, name: name.trim() };
    if (editingSubcategory && editingSubcategory.categoryId !== categoryId) {
      Alert.alert(
        "Move subcategory?",
        "Its label will be cleared from transactions and recurring payments in the previous category.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Move", onPress: () => mutation.mutate(input) }
        ]
      );
      return;
    }

    mutation.mutate(input);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.overlay}>
        <Pressable style={styles.scrim} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <View style={styles.headerCopy}>
              <Text style={styles.title}>{isEditing ? "Edit subcategory" : "Add subcategory"}</Text>
              <Text style={styles.subtitle}>Organize a category into more specific groups.</Text>
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={22} color={colors.ink} />
            </Pressable>
          </View>

          <Text style={styles.label}>Parent category</Text>
          {categoriesQuery.isLoading ? (
            <ActivityIndicator color={colors.primary} style={styles.loader} />
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryList}>
              {categories.map((category: Category) => {
                const selected = category.id === categoryId;
                return (
                  <Pressable
                    key={category.id}
                    onPress={() => setCategoryId(category.id)}
                    style={[
                      styles.categoryChip,
                      selected && { borderColor: category.color, backgroundColor: `${category.color}16` }
                    ]}
                  >
                    <Ionicons
                      name={(category.icon as keyof typeof Ionicons.glyphMap) ?? "pricetag"}
                      size={16}
                      color={category.color}
                    />
                    <Text style={styles.categoryText}>{category.name}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          )}

          <Text style={styles.label}>Name</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="For example: Fuel"
            autoFocus
            maxLength={40}
            style={styles.input}
            placeholderTextColor={colors.muted}
          />

          <Pressable
            accessibilityRole="button"
            onPress={submit}
            disabled={mutation.isPending}
            style={({ pressed }) => [styles.submit, { opacity: pressed || mutation.isPending ? 0.72 : 1 }]}
          >
            {mutation.isPending ? (
              <ActivityIndicator color={colors.surface} />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={20} color={colors.surface} />
                <Text style={styles.submitText}>{isEditing ? "Update subcategory" : "Save subcategory"}</Text>
              </>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const createStyles = (colors: AppColors, text: AppText) => StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end"
  },
  scrim: {
    ...StyleSheet.absoluteFill,
    backgroundColor: colors.overlay
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
    paddingTop: spacing.sm
  },
  handle: {
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.border,
    alignSelf: "center",
    marginBottom: spacing.lg
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
    marginBottom: spacing.lg
  },
  headerCopy: {
    flex: 1
  },
  title: {
    ...text.h2,
    fontSize: 22
  },
  subtitle: {
    ...text.muted,
    marginTop: 2
  },
  closeButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.surfaceAlt,
    alignItems: "center",
    justifyContent: "center"
  },
  label: {
    ...text.muted,
    fontWeight: "800",
    marginBottom: spacing.sm,
    marginTop: spacing.md
  },
  loader: {
    paddingVertical: spacing.md
  },
  categoryList: {
    gap: spacing.sm,
    paddingRight: spacing.lg
  },
  categoryChip: {
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm
  },
  categoryText: {
    color: colors.ink,
    fontWeight: "800"
  },
  input: {
    minHeight: 52,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    color: colors.ink,
    backgroundColor: colors.background,
    fontSize: 16
  },
  submit: {
    minHeight: 54,
    borderRadius: radii.md,
    marginTop: spacing.xl,
    backgroundColor: colors.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm
  },
  submitText: {
    color: colors.surface,
    fontWeight: "900",
    fontSize: 16
  }
});
