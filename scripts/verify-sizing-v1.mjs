import assert from "node:assert/strict";
import {
  IMPLICIT_ONE_SIZE,
  LISTING_SIZE_KINDS,
  createCanonicalSizeKeys,
  createListingSizingMetadata,
  createSizeRef,
  getListingSizingProfile,
  getStandardSizeOptions,
  resolveFitDomain,
} from "../src/config/sizingV1.js";

const legacyKey = (size, type, subType = "") =>
  createSizeRef(size, type, subType, { source: "legacy" })?.canonicalKey || null;

assert.equal(legacyKey("M", "Tops"), "upper_body:intl:m");
assert.equal(legacyKey("Medium", "Tops"), "upper_body:intl:m");
assert.equal(legacyKey("X-Small", "Tops"), "upper_body:intl:xs");
assert.equal(legacyKey("Extra-Small", "Tops"), "upper_body:intl:xs");
assert.equal(legacyKey("XX-Large", "Tops"), "upper_body:intl:2xl");
assert.equal(legacyKey("XXXL", "Jackets"), "upper_body:intl:3xl");
assert.equal(legacyKey("3XL", "Jackets"), "upper_body:intl:3xl");
assert.equal(legacyKey("41", "Footwear", "Sneakers"), "footwear:eu:41");
assert.equal(legacyKey("EU 40", "Dresses"), "whole_body:eu:40");
assert.equal(legacyKey("40", "Skirts"), null, "bare legacy apparel numbers stay ambiguous");
assert.equal(
  legacyKey("W28/L32", "Jeans"),
  "lower_body:waist_inseam:28x32",
);
assert.equal(legacyKey("24x28", "Jeans"), "lower_body:waist_inseam:24x28");
assert.equal(legacyKey("W28/L32", "Jeans"), "lower_body:waist_inseam:28x32");

assert.equal(resolveFitDomain("Sportswear", "Running Shoes"), "footwear");
assert.equal(resolveFitDomain("Corporate Women", "Office Tops"), "upper_body");
assert.equal(resolveFitDomain("Corporate Women", "Pencil Skirts"), "lower_body");
assert.equal(resolveFitDomain("Corporate Women", "Corporate Dresses"), "whole_body");
assert.equal(resolveFitDomain("Corporate Men", "Tailored Suits"), null);
assert.equal(resolveFitDomain("Corsets", "Corset Dress"), "whole_body");
assert.equal(resolveFitDomain("Corsets", "Corset Belt"), null);

assert.deepEqual(getStandardSizeOptions("Tops"), [
  "XXS",
  "XS",
  "S",
  "M",
  "L",
  "XL",
  "2XL",
  "3XL",
  "4XL",
  "5XL",
]);
assert.equal(getStandardSizeOptions("Footwear").length, 31);
assert.equal(getStandardSizeOptions("Footwear")[0], "35");
assert.equal(getStandardSizeOptions("Footwear").at(-1), "50");
assert.equal(getStandardSizeOptions("Dresses")[0], "30");
assert.equal(getStandardSizeOptions("Dresses").at(-1), "62");
assert.equal(getStandardSizeOptions("Jeans").length, 105);
assert.deepEqual(
  createCanonicalSizeKeys(["M", "Medium", "3XL"], "Tops", "", {
    source: "legacy",
  }),
  ["upper_body:intl:m", "upper_body:intl:3xl"],
);

for (const [productType, subType] of [
  ["Bags", "Handbags"],
  ["Earrings", "Stud Earrings"],
  ["Hair Accessories", "Scrunchie"],
  ["Jewelry", "Brooches"],
  ["Jewelry", "Pendants"],
  ["Sportswear", "Headbands"],
]) {
  const profile = getListingSizingProfile(productType, subType);
  assert.equal(profile?.kind, LISTING_SIZE_KINDS.NONE);
  assert.equal(profile?.internalValue, IMPLICIT_ONE_SIZE);
  assert.deepEqual(createListingSizingMetadata(profile), {
    schemaVersion: 1,
    kind: "NONE",
    profileId: "none",
  });
}

assert.equal(
  getListingSizingProfile("Jewelry", "Necklaces"),
  null,
  "measurement-led categories must stay on the legacy path until their structured schema exists",
);
assert.equal(
  getListingSizingProfile("Corporate Men", "Tailored Suits"),
  null,
  "composite sizes must not be guessed",
);
assert.equal(
  getListingSizingProfile("Jewelry", "Necklaces", {
    kind: LISTING_SIZE_KINDS.FIT_MODE,
    profileId: "declared-fit",
  })?.kind,
  LISTING_SIZE_KINDS.FIT_MODE,
  "FIT_MODE remains available only when an existing listing explicitly declares it",
);

console.log("sizingV1 verification passed");
