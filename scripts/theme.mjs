export const THEMES = {
  dark: {
    ground: "#121316",
    ground2: "#18191d",
    ink: "#f2f1ee",
    inkDim: "#8c8d93",
    ember: "#ff5227",
    emberText: "#ff6a44",
    emberMark: "#ff6a44",
    line: "rgba(242,241,238,.09)",
    lineStrong: "rgba(242,241,238,.24)",
  },
  light: {
    ground: "#f4f1ea",
    ground2: "#ebe7de",
    ink: "#17181b",
    inkDim: "#5d5e64",
    ember: "#ff5227",
    // R7: ember text darkened for AA on the light ground (5.2:1); marks keep the true ember.
    emberText: "#b8360f",
    emberMark: "#ff5227",
    line: "rgba(23,24,27,.12)",
    lineStrong: "rgba(23,24,27,.32)",
  },
};

const fonts = new URL("../assets/fonts/", import.meta.url).pathname;
export const FONT = {
  display: `${fonts}Archivo-Bold.ttf`,
  serif: `${fonts}InstrumentSerif-Regular.ttf`,
  serifItalic: `${fonts}InstrumentSerif-Italic.ttf`,
  mono: `${fonts}GeistMono-Regular.ttf`,
  monoMedium: `${fonts}GeistMono-Medium.ttf`,
  sans: `${fonts}InstrumentSans-Regular.ttf`,
  sansSemibold: `${fonts}InstrumentSans-SemiBold.ttf`,
};
