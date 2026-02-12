// src/constants/palette.js
export const PALETTE = {
  black: { css: "#000000", label: "Black", needsBorder: false },
  white: { css: "#FFFFFF", label: "White", needsBorder: true },
  grey: { css: "#9CA3AF", label: "Grey", needsBorder: true },
  blue: { css: "#2563EB", label: "Blue", needsBorder: false },
  red: { css: "#DC2626", label: "Red", needsBorder: false },
  yellow: { css: "#FACC15", label: "Yellow", needsBorder: true },
  green: { css: "#16A34A", label: "Green", needsBorder: false },
  purple: { css: "#7C3AED", label: "Purple", needsBorder: false },
  pink: { css: "#EC4899", label: "Pink", needsBorder: false },
  orange: { css: "#F97316", label: "Orange", needsBorder: false },
  brown: { css: "#7C4A2D", label: "Brown", needsBorder: false },
  cream: { css: "#FFF7D6", label: "Cream", needsBorder: true },
  beige: { css: "#E7D3B0", label: "Beige", needsBorder: true },
  nude: { css: "#E8C3A1", label: "Nude", needsBorder: true },
  gold: { css: "#D4AF37", label: "Gold", needsBorder: true },
  silver: { css: "#C0C0C0", label: "Silver", needsBorder: true },
  peach: { css: "#FDBA9A", label: "Peach", needsBorder: true },
  wine: { css: "#7F1D1D", label: "Wine", needsBorder: false },

  offwhite: { css: "#F9FAFB", label: "Off White", needsBorder: true },
  ivory: { css: "#FFFBEB", label: "Ivory", needsBorder: true },
  charcoal: { css: "#374151", label: "Charcoal", needsBorder: false },

  teal: { css: "#0D9488", label: "Teal", needsBorder: false },
  turquoise: { css: "#06B6D4", label: "Turquoise", needsBorder: true },

  olive: { css: "#556B2F", label: "Olive", needsBorder: false },
  khaki: { css: "#BDB76B", label: "Khaki", needsBorder: true },
  mustard: { css: "#D4A017", label: "Mustard", needsBorder: true },
  rust: { css: "#B45309", label: "Rust", needsBorder: false },
  tan: { css: "#D2B48C", label: "Tan", needsBorder: true },
  chocolate: { css: "#5C3A21", label: "Chocolate", needsBorder: false },

  lime: { css: "#84CC16", label: "Lime", needsBorder: true },
  indigo: { css: "#4F46E5", label: "Indigo", needsBorder: false },
  cobalt: { css: "#1E40AF", label: "Cobalt Blue", needsBorder: false },

  coral: { css: "#FB7185", label: "Coral", needsBorder: true },
  salmon: { css: "#FDA4AF", label: "Salmon", needsBorder: true },

  taupe: { css: "#A69080", label: "Taupe", needsBorder: true },
  camel: { css: "#C19A6B", label: "Camel", needsBorder: true },

  bronze: { css: "#CD7F32", label: "Bronze", needsBorder: true },
  rose: { css: "#FBCFE8", label: "Rose", needsBorder: true },

  lavagrey: { css: "#6B7280", label: "Lava Grey", needsBorder: true },

  lavender: { css: "#A78BFA", label: "Lavender", needsBorder: true },
  lilac: { css: "#C4B5FD", label: "Lilac", needsBorder: true },
  magenta: { css: "#D946EF", label: "Magenta", needsBorder: false },

  maroon: { css: "#6B0F1A", label: "Maroon", needsBorder: false },
  burgundy: { css: "#5B0A1E", label: "Burgundy", needsBorder: false },

  navy: { css: "#0B1F3B", label: "Navy Blue", needsBorder: false },
  emerald: { css: "#047857", label: "Emerald Green", needsBorder: false },
  tomato: { css: "#FF6347", label: "Tomato Red", needsBorder: false },
  mint: { css: "#A7F3D0", label: "Mint Green", needsBorder: true },
  sky: { css: "#60A5FA", label: "Sky Blue", needsBorder: true },
  lightblue: { css: "#93C5FD", label: "Light Blue", needsBorder: true },
  royalblue: { css: "#1D4ED8", label: "Royal Blue", needsBorder: false },
  hotpink: { css: "#FF1493", label: "Hot Pink", needsBorder: false },
  stonewashblue: { css: "#6B8FB4", label: "Stonewash Blue", needsBorder: true },

  multicolor: {
    css: "conic-gradient(from 180deg, #ef4444, #f97316, #facc15, #22c55e, #3b82f6, #a855f7, #ef4444)",
    label: "Multicolor",
    needsBorder: true,
  },
};

// Put “common” colours first (like your screenshot), then the rest.
export const PALETTE_ORDER = [
  "black",
  "white",
  "grey",
  "blue",
  "red",
  "yellow",
  "green",
  "pink",
  "orange",
  "purple",
  "brown",
  ...Object.keys(PALETTE).filter(
    (k) =>
      ![
        "black",
        "white",
        "grey",
        "blue",
        "red",
        "yellow",
        "green",
        "pink",
        "orange",
        "purple",
        "brown",
      ].includes(k)
  ),
];
