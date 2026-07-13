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
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api, queryKeys, trackEvent } from "../api/client";
import { useAppStore } from "../store/useAppStore";
import { radii, spacing, useAppTheme, type AppColors, type AppText } from "../theme";
import type { TransactionType } from "../types";
import { successFeedback } from "../utils/haptics";

type AddCategoryModalProps = {
  visible: boolean;
  onClose: () => void;
};

const defaultColor = "#0E9384";
const colorOptions = [
  defaultColor,
  "#2563EB",
  "#7C3AED",
  "#DB2777",
  "#E11D48",
  "#DC2626",
  "#EA580C",
  "#D97706",
  "#CA8A04",
  "#65A30D",
  "#16A34A",
  "#059669",
  "#0891B2",
  "#0284C7",
  "#4F46E5",
  "#9333EA",
  "#C026D3",
  "#475569",
  "#64748B",
  "#0F766E",
  "#2F855A",
  "#805AD5",
  "#D53F8C",
  "#4A5568"
];
const iconOptions: Array<keyof typeof Ionicons.glyphMap> = [
  "pricetag",
  "cart",
  "home",
  "car",
  "restaurant",
  "medical",
  "bag",
  "ticket",
  "wallet",
  "swap-horizontal",
  "briefcase",
  "cash",
  "card",
  "receipt",
  "cafe",
  "fast-food",
  "pizza",
  "beer",
  "fitness",
  "heart",
  "school",
  "book",
  "bus",
  "train",
  "airplane",
  "bicycle",
  "construct",
  "phone-portrait",
  "game-controller",
  "musical-notes",
  "shirt",
  "gift",
  "wifi",
  "flash",
  "water",
  "bulb",
  "hammer",
  "build",
  "laptop",
  "desktop",
  "globe",
  "calendar",
  "shield-checkmark",
  "bed",
  "storefront",
  "business",
  "film",
  "sparkles",
  "leaf",
  "barbell",
  "medkit",
  "calculator",
  "stats-chart",
  "trophy",
  "camera",
  "color-palette",
  "cloud"
];

export const AddCategoryModal = ({ visible, onClose }: AddCategoryModalProps) => {
  const { colors, text } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, text), [colors, text]);
  const queryClient = useQueryClient();
  const editingCategory = useAppStore((state) => state.editingCategory);
  const preferredCategoryKind = useAppStore((state) => state.preferredCategoryKind);
  const [kind, setKind] = useState<TransactionType>("expense");
  const [name, setName] = useState("");
  const [color, setColor] = useState(defaultColor);
  const [icon, setIcon] = useState<keyof typeof Ionicons.glyphMap>("pricetag");
  const isEditing = Boolean(editingCategory);

  useEffect(() => {
    if (!visible) {
      return;
    }

    if (editingCategory) {
      setKind(editingCategory.kind);
      setName(editingCategory.name);
      setColor(editingCategory.color);
      setIcon((editingCategory.icon as keyof typeof Ionicons.glyphMap) || "pricetag");
      return;
    }

    reset(preferredCategoryKind ?? "expense");
  }, [editingCategory, preferredCategoryKind, visible]);

  const reset = (nextKind: TransactionType = "expense") => {
    setKind(nextKind);
    setName("");
    setColor(defaultColor);
    setIcon("pricetag");
  };

  const mutation = useMutation({
    mutationFn: () => {
      const input = { name: name.trim(), kind, color, icon };
      return editingCategory ? api.updateCategory(editingCategory.id, input) : api.createCategory(input);
    },
    onSuccess: async () => {
      trackEvent(isEditing ? "category_updated_from_app" : "category_created_from_app", { kind });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.categories }),
        queryClient.invalidateQueries({ queryKey: queryKeys.recurringPayments })
      ]);
      await successFeedback();
      reset();
      onClose();
    },
    onError: (error) => {
      Alert.alert("Could not save category", error instanceof Error ? error.message : "Try again.");
    }
  });

  const submit = () => {
    if (!name.trim()) {
      Alert.alert("Name needed", "Add a category name.");
      return;
    }

    mutation.mutate();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.overlay}>
        <Pressable style={styles.scrim} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>{isEditing ? "Edit category" : "Add category"}</Text>
              <Text style={styles.subtitle}>{isEditing ? "Rename it or change how it appears." : "Create it once, use it everywhere."}</Text>
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={22} color={colors.ink} />
            </Pressable>
          </View>

          <ScrollView
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="none"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            <View style={styles.segment}>
              {(["expense", "income", "loan"] as TransactionType[]).map((value) => {
                const selected = kind === value;
                return (
                  <Pressable
                    key={value}
                    onPress={() => setKind(value)}
                    style={[styles.segmentButton, selected && styles.segmentButtonActive]}
                  >
                    <Text style={[styles.segmentText, selected && styles.segmentTextActive]}>
                      {value === "expense" ? "Expense" : value === "income" ? "Income" : "Loan"}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={styles.label}>Name</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder={kind === "expense" ? "Subscriptions" : kind === "income" ? "Bonus" : "Money lent"}
              style={styles.input}
              placeholderTextColor={colors.muted}
            />

            <Text style={styles.label}>Color</Text>
            <View style={styles.swatches}>
              {colorOptions.map((option) => (
                <Pressable
                  key={option}
                  accessibilityRole="button"
                  accessibilityLabel={`Use color ${option}`}
                  onPress={() => setColor(option)}
                  style={[styles.swatch, { backgroundColor: option }, color === option && styles.swatchActive]}
                />
              ))}
            </View>

            <Text style={styles.label}>Icon</Text>
            <View style={styles.icons}>
              {iconOptions.map((option) => {
                const selected = icon === option;
                return (
                  <Pressable
                    key={option}
                    accessibilityRole="button"
                    accessibilityLabel={`Use icon ${option}`}
                    onPress={() => setIcon(option)}
                    style={[styles.iconButton, selected && { borderColor: color, backgroundColor: `${color}16` }]}
                  >
                    <Ionicons name={option} size={20} color={selected ? color : colors.muted} />
                  </Pressable>
                );
              })}
            </View>

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
                  <Text style={styles.submitText}>{isEditing ? "Update category" : "Save category"}</Text>
                </>
              )}
            </Pressable>
          </ScrollView>
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
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: colors.overlay
  },
  sheet: {
    maxHeight: "88%",
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    paddingTop: spacing.sm
  },
  scrollContent: {
    paddingBottom: spacing.xxl
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
    marginBottom: spacing.lg,
    gap: spacing.md
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
  segment: {
    flexDirection: "row",
    gap: spacing.sm,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radii.md,
    padding: spacing.xs,
    marginBottom: spacing.lg
  },
  segmentButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: radii.sm,
    alignItems: "center",
    justifyContent: "center"
  },
  segmentButtonActive: {
    backgroundColor: colors.primary
  },
  segmentText: {
    color: colors.ink,
    fontWeight: "800"
  },
  segmentTextActive: {
    color: colors.surface
  },
  label: {
    ...text.muted,
    fontWeight: "800",
    marginBottom: spacing.sm,
    marginTop: spacing.md
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
  swatches: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  swatch: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 3,
    borderColor: colors.surface
  },
  swatchActive: {
    borderColor: colors.ink
  },
  icons: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  iconButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center"
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
