// services/getVariant.js

const norm = (v) =>
  String(v ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");

const normalizeJoined = (s) =>
  s
    .replace(/\bnavyblue\b/g, "navy blue")
    .replace(/\bemeraldgreen\b/g, "emerald green")
    .replace(/\btomatore d\b/g, "tomato red")
    .replace(/\btomato ?red\b/g, "tomato red");

const colorKey = (raw) => {
  let c = normalizeJoined(norm(raw));

  // IMPORTANT: keep this conservative. No fuzzy matching here.
  // Only map very clear synonyms/joins + the special shades you mentioned.
  if (c === "gray") c = "grey";
  if (c === "ash") c = "grey";
  if (c === "offwhite" || c === "off-white") c = "off white";

  // keep requested shades as unique keys
  if (c.includes("navy")) return "navy";
  if (c.includes("emerald")) return "emerald";
  if (c.includes("tomato")) return "tomato";

  // base colors (contains check is okay, but still conservative)
  const base = [
    "black","white","off white","grey","blue","red","yellow","green",
    "pink","purple","orange","brown","beige","cream","gold","silver","wine",
  ];
  for (const b of base) {
    if (c.includes(b)) return b;
  }

  // fallback: normalized string (not “corrected”)
  return c;
};

const sizeKey = (raw) => norm(raw);

export const findVariant = (product, size, color) => {
  if (!Array.isArray(product?.variants)) return null;

  const sk = sizeKey(size);
  const ck = colorKey(color);
  if (!sk || !ck) return null;

  // robust match
  const hit = product.variants.find((v) => {
    return sizeKey(v?.size) === sk && colorKey(v?.color) === ck;
  });

  return hit || null; // <-- returns RAW variant from DB
};

// export keys so UI can dedupe/options if you want
export const normalizeColorKey = colorKey;
export const normalizeSizeKey = sizeKey;
