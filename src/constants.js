// Brand Colors
export const COLORS = {
  primary: "#08e6dc",
  lime: "#adf87c",
  purple: "#855dff",
  darkBlue: "#0c2f66",
  gray: "#666666",
  light: "#f1f2f2",
  white: "#fff",
  text: "#1a1a1a",
};

// Defaults (Lead Times, Price Tiers)
export const DEFAULTS = {
  leadTimes: [
    { id: "L1", label: "Ready Stock", sub: "1–3 days" },
    { id: "L2", label: "Local Prod", sub: "5–7 days" },
    { id: "L3", label: "Import", sub: "2–3 weeks" },
    { id: "L4", label: "Custom", sub: "4–6 weeks" },
  ],
  priceTiers: [
    { label: "Below RM5", min: 0, max: 5 },
    { label: "RM5 – RM15", min: 5, max: 15 },
    { label: "RM15 – RM50", min: 15, max: 50 },
    { label: "RM50 – RM150", min: 50, max: 150 },
    { label: "Above RM150", min: 150, max: Infinity },
  ],
};

// Options (Printing, Lead Time Colors)
export const OPTIONS = {
  printing: [
    "Silkscreen",
    "Laser",
    "Emboss",
    "Deboss",
    "Print",
    "Full Print",
    "Custom Box",
    "Heat Transfer"
  ],
  leadColors: {
    L1: { bg: "#d0f9f7", text: "#0c5f5c", badge: "#08e6dc" },
    L2: { bg: "#e8fdc4", text: "#5a7d1e", badge: "#adf87c" },
    L3: { bg: "#f3e5ff", text: "#5a3a8a", badge: "#855dff" },
    L4: { bg: "#dfe8f7", text: "#1a3a6b", badge: "#0c2f66" },
  },
};

