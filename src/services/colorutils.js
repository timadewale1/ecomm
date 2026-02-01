// services/colorutils.js
// ✅ UI-ONLY swatch utilities (SAFE):
// - Swatches are ONLY for display (style + label + grouping)
// - NEVER store/use swatch.key for cart/stock/order
// - Always store RAW Firestore strings for operations

// ---------- small helpers ----------
const toTitleCase = (str = "") =>
  String(str)
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

const compact = (arr) => arr.filter(Boolean);

const isProbablyJunkColor = (s) => {
  const v = String(s || "").trim();
  if (!v) return true;

  const lower = v.toLowerCase();
  if (lower === "none") return true;
  if (/^\d+(\.\d+)?$/.test(lower)) return true;
  if (lower === "available in other colors") return true;

  return false;
};

// Levenshtein (ONLY for display grouping)
function levenshtein(a = "", b = "") {
  a = String(a);
  b = String(b);
  const m = a.length;
  const n = b.length;
  if (!m) return n;
  if (!n) return m;

  const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost,
      );
    }
  }
  return dp[m][n];
}

// ---------- UI palette ----------
const PALETTE = {
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
// --- add to PALETTE ---
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
// --- add to PALETTE (10 more single-colour swatches) ---
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
  // shades
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
  pattern: {
    css: "repeating-linear-gradient(45deg, #111827 0 8px, #F9FAFB 8px 16px)",
    label: "Pattern",
    needsBorder: true,
  },
  unknown: { css: "#E5E7EB", label: "Colour", needsBorder: true },
};

// synonyms + common typos (display grouping only)
const SYNONYMS = {
  gray: "grey",
  ash: "grey",
  blues: "blue",

  navyblue: "navy",
  "navy blue": "navy",
  "royal blue": "royalblue",
  "light blue": "lightblue",
  "sky blue": "sky",
  "mint green": "mint",
  "stonewash blue": "stonewashblue",
  "hot pink": "hotpink",

  "emerald green": "emerald",
  emerald: "emerald",
  "tomato red": "tomato",
  tomato: "tomato",

  "color as seen": "pattern",
  "colour as seen": "pattern",
  "as seen": "pattern",

  camo: "pattern",
  camouflage: "pattern",
  "animal skin": "pattern",
  "houndstooth fabric": "pattern",
  "patchwork b/w": "pattern",
  floral: "pattern",
  flowery: "pattern",
};

const FUZZY_TARGETS = Object.keys(PALETTE)
  .concat(Object.keys(SYNONYMS))
  .map((s) => s.toLowerCase());

function splitToColorPhrases(raw) {
  const s = String(raw || "").trim();
  if (!s) return [];

  const lower = s.toLowerCase().trim();

  if (
    lower.includes("all colour") ||
    lower.includes("all color") ||
    lower === "all" ||
    lower.includes("mixed") ||
    lower.includes("multi")
  ) {
    return ["multicolor"];
  }

  const normalized = lower
    .replace(/&/g, " and ")
    .replace(/\+/g, " and ")
    .replace(/\s+/g, " ")
    .trim();

  return compact(
    normalized.split(/\s*(?:,|\/|\band\b)\s*/g).map((x) => x.trim()),
  );
}

function cleanPhrase(phrase) {
  let s = String(phrase || "")
    .toLowerCase()
    .trim();
  if (!s) return "";

  s = s
    .replace(/[()'"!.?]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  s = s
    .replace(/\b(colour|color|variant|variations|available|per)\b/g, "")
    .replace(/\b(ish)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();

  return s;
}

// UI canonical key from phrase (for palette + grouping)
function canonicalKeyFromPhrase(phrase) {
  const cleaned = cleanPhrase(phrase);
  if (!cleaned) return "";

  if (SYNONYMS[cleaned]) return SYNONYMS[cleaned];
  if (PALETTE[cleaned]) return cleaned;

  if (cleaned.includes("navy")) return "navy";
  if (cleaned.includes("emerald") || cleaned.includes("emarald"))
    return "emerald";
  if (cleaned.includes("tomato")) return "tomato";

 const baseHits = [
  // core neutrals
  "black",
  "white",
  "offwhite",
  "ivory",
  "grey",
  "gray",
  "charcoal",
  "lavagrey",

  // blues
  "blue",
  "navy",
  "sky",
  "lightblue",
  "royalblue",
  "cobalt",
  "indigo",
  "stonewashblue",

  // greens
  "green",
  "emerald",
  "mint",
  "olive",
  "khaki",
  "teal",
  "turquoise",
  "lime",

  // reds / pinks / purples
  "red",
  "tomato",
  "wine",
  "maroon",
  "burgundy",
  "pink",
  "hotpink",
  "rose",
  "coral",
  "salmon",
  "purple",
  "lavender",
  "lilac",
  "magenta",

  // yellows / oranges
  "yellow",
  "mustard",
  "orange",
  "rust",

  // browns / nudes / tans
  "brown",
  "chocolate",
  "tan",
  "camel",
  "taupe",
  "beige",
  "cream",
  "nude",
  "peach",

  // metals
  "gold",
  "silver",
  "bronze",
];

  for (const base of baseHits) {
    if (cleaned.includes(base)) {
      const mapped = SYNONYMS[base] || base;
      if (PALETTE[mapped]) return mapped;
    }
  }

  // Fuzzy (display only)
  const word = cleaned.replace(/\s+/g, "");
  let best = null;
  let bestDist = Infinity;

  for (const target of FUZZY_TARGETS) {
    const dist = levenshtein(word, target.replace(/\s+/g, ""));
    if (dist < bestDist) {
      bestDist = dist;
      best = target;
    }
  }

  const maxAllowed = word.length <= 5 ? 1 : 2;
  if (best && bestDist <= maxAllowed) {
    const mapped = SYNONYMS[best] || best;
    if (PALETTE[mapped]) return mapped;
  }

  return "unknown";
}

// Build a swatch from ANY raw color string
export function getSwatchFromRawColor(rawColor) {
  const raw = String(rawColor || "").trim();
  if (!raw || isProbablyJunkColor(raw)) return null;

  const parts = splitToColorPhrases(raw).map(cleanPhrase).filter(Boolean);

  // explicit multicolor words
  if (parts.length === 1 && parts[0] === "multicolor") {
    return {
      key: "multicolor",
      label: PALETTE.multicolor.label,
      style: { background: PALETTE.multicolor.css },
      needsBorder: PALETTE.multicolor.needsBorder,
      rawValues: [raw],
    };
  }

  // list like "red, white and yellow" -> one safe multicolor swatch
  if (parts.length >= 2) {
    const canonKeys = parts
      .map((p) => canonicalKeyFromPhrase(p))
      .filter((k) => k && k !== "unknown");

    const colorsForGradient = canonKeys
      .map((k) => PALETTE[k]?.css)
      .filter((c) => typeof c === "string" && c.startsWith("#"));

    const label = canonKeys.length
      ? canonKeys.map((k) => PALETTE[k]?.label || toTitleCase(k)).join(" / ")
      : toTitleCase(raw);

    return {
      key: "multicolor",
      label: label || PALETTE.multicolor.label,
      style: {
        background:
          colorsForGradient.length >= 2
            ? `conic-gradient(${colorsForGradient.join(", ")})`
            : PALETTE.multicolor.css,
      },
      needsBorder: true,
      rawValues: [raw],
    };
  }

  // single
  const key = canonicalKeyFromPhrase(parts[0] || raw);
  const palette = PALETTE[key] || PALETTE.unknown;

  const label =
    key === "unknown" ? toTitleCase(raw) : palette.label || toTitleCase(key);

  return {
    key,
    label,
    style: { background: palette.css },
    needsBorder: !!palette.needsBorder,
    rawValues: [raw],
  };
}

// ✅ UI-only: distinct swatches with separate raw sources
export function getProductColorSwatches(product, opts = {}) {
  if (!product) return [];

  const source = opts?.source || "all"; // "variants" | "subProducts" | "all"

  const items = [];

  if (
    (source === "variants" || source === "all") &&
    Array.isArray(product.variants)
  ) {
    for (const v of product.variants) {
      if (v?.color) items.push({ raw: v.color, src: "variant" });
    }
  }

  if (
    (source === "subProducts" || source === "all") &&
    Array.isArray(product.subProducts)
  ) {
    for (const sp of product.subProducts) {
      if (sp?.color) items.push({ raw: sp.color, src: "subProduct" });
    }
  }

  const map = new Map();

  for (const it of items) {
    const sw = getSwatchFromRawColor(it.raw);
    if (!sw) continue;

    const dedupeKey =
      sw.key === "unknown" ? `unknown:${sw.label.toLowerCase()}` : sw.key;

    if (!map.has(dedupeKey)) {
      map.set(dedupeKey, {
        ...sw,
        rawVariantValues: it.src === "variant" ? [it.raw] : [],
        rawSubProductValues: it.src === "subProduct" ? [it.raw] : [],
      });
    } else {
      const prev = map.get(dedupeKey);

      // merge the original raw list too
      prev.rawValues = Array.from(new Set([...(prev.rawValues || []), it.raw]));

      if (it.src === "variant") {
        prev.rawVariantValues = Array.from(
          new Set([...(prev.rawVariantValues || []), it.raw]),
        );
      } else {
        prev.rawSubProductValues = Array.from(
          new Set([...(prev.rawSubProductValues || []), it.raw]),
        );
      }

      map.set(dedupeKey, prev);
    }
  }

  return Array.from(map.values());
}

// ✅ UI-only grouping key (do NOT use for cart/stock/order)
export function normalizeColorKeyForSwatch(rawColor) {
  const sw = getSwatchFromRawColor(rawColor);
  return sw?.key || "";
}
