export const colors = {
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
  accent: "#F2A900",
  blue: "#2563EB",
  danger: "#B42318",
  shadow: "rgba(16, 24, 40, 0.12)"
};

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

export const text = {
  title: {
    fontSize: 26,
    fontWeight: "800" as const,
    color: colors.ink
  },
  h2: {
    fontSize: 18,
    fontWeight: "800" as const,
    color: colors.ink
  },
  body: {
    fontSize: 15,
    color: colors.ink
  },
  muted: {
    fontSize: 13,
    color: colors.muted
  }
};

