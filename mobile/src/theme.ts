import { createContext, useContext } from "react";
import type { Theme } from "@react-navigation/native";

export type ThemePreference = "system" | "light" | "dark";
export type ResolvedTheme = "light" | "dark";

export const lightColors = {
  background: "#F7FAFC",
  surface: "#FFFFFF",
  surfaceAlt: "#EEF2F7",
  ink: "#182230",
  muted: "#667085",
  border: "#D0D5DD",
  primary: "#0E9384",
  primaryDark: "#107569",
  income: "#16803C",
  expense: "#C2410C",
  loan: "#7C3AED",
  accent: "#F2A900",
  blue: "#2563EB",
  danger: "#B42318",
  shadow: "rgba(16, 24, 40, 0.12)",
  overlay: "rgba(15, 23, 42, 0.36)",
  dangerSoft: "#FEF3F2",
  primarySoft: "#E6FFFA"
};

export const darkColors: typeof lightColors = {
  background: "#0B1118",
  surface: "#121A24",
  surfaceAlt: "#1C2633",
  ink: "#F4F7FB",
  muted: "#9AA7B7",
  border: "#2D3A4A",
  primary: "#2DD4BF",
  primaryDark: "#5EEAD4",
  income: "#4ADE80",
  expense: "#FB923C",
  loan: "#C084FC",
  accent: "#FACC15",
  blue: "#60A5FA",
  danger: "#F87171",
  shadow: "rgba(0, 0, 0, 0.36)",
  overlay: "rgba(0, 0, 0, 0.62)",
  dangerSoft: "#3A171A",
  primarySoft: "#123E3A"
};

export type AppColors = typeof lightColors;

export const colors = lightColors;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32
};

export const radii = {
  sm: 8,
  md: 12,
  lg: 20
};

export const createTextStyles = (palette: AppColors) => ({
  title: {
    fontSize: 26,
    fontWeight: "800" as const,
    color: palette.ink
  },
  h2: {
    fontSize: 18,
    fontWeight: "800" as const,
    color: palette.ink
  },
  body: {
    fontSize: 15,
    color: palette.ink
  },
  muted: {
    fontSize: 13,
    color: palette.muted
  }
});

export const text = createTextStyles(colors);
export type AppText = ReturnType<typeof createTextStyles>;

export const themeLabels: Record<ThemePreference, string> = {
  system: "System",
  light: "Light",
  dark: "Dark"
};

export type AppTheme = {
  mode: ResolvedTheme;
  isDark: boolean;
  colors: AppColors;
  text: AppText;
  navigation: Theme;
};

export const createAppTheme = (mode: ResolvedTheme): AppTheme => {
  const palette = mode === "dark" ? darkColors : lightColors;

  return {
    mode,
    isDark: mode === "dark",
    colors: palette,
    text: createTextStyles(palette),
    navigation: {
      dark: mode === "dark",
      colors: {
        primary: palette.primary,
        background: palette.background,
        card: palette.surface,
        text: palette.ink,
        border: palette.border,
        notification: palette.danger
      },
      fonts: {
        regular: { fontFamily: "System", fontWeight: "400" },
        medium: { fontFamily: "System", fontWeight: "500" },
        bold: { fontFamily: "System", fontWeight: "700" },
        heavy: { fontFamily: "System", fontWeight: "800" }
      }
    }
  };
};

export const ThemeContext = createContext<AppTheme>(createAppTheme("light"));

export const useAppTheme = () => useContext(ThemeContext);
