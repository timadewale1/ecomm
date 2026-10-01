import test from "node:test";
import assert from "node:assert/strict";
import {
  buildImageLabelTagSuggestions,
  rankProductTaxonomySuggestions,
} from "./productTaxonomyInference.mjs";

const fashionTypes = [
  { type: "Footwear", subTypes: ["Sneakers", "Loafers", "Boots", "Sandals"] },
  { type: "Bags", subTypes: ["Handbags", "Backpacks", "Tote Bags"] },
  { type: "Dresses", subTypes: ["Maxi Dresses", "Mini Dresses"] },
];

const everydayTypes = [
  { type: "Furniture", subTypes: ["Chairs", "Tables", "Sofas"] },
  { type: "Electronics", subTypes: ["Headphones", "Smartphones", "Laptops"] },
];

const rank = (labels) =>
  rankProductTaxonomySuggestions({ labels, fashionTypes, everydayTypes });

test("maps a strong shoe label into the existing footwear taxonomy", () => {
  const [result] = rank([
    { text: "Shoe", confidence: 0.92 },
    { text: "Footwear", confidence: 0.88 },
  ]);
  assert.equal(result.itemClass, "fashion");
  assert.equal(result.productType, "Footwear");
});

test("uses explicit subtype aliases without inventing a new catalog value", () => {
  const [result] = rank([{ text: "Handbag", confidence: 0.94 }]);
  assert.equal(result.productType, "Bags");
  assert.equal(result.subType, "Handbags");
});

test("can rank lifestyle inventory", () => {
  const [result] = rank([{ text: "Sofa", confidence: 0.91 }]);
  assert.equal(result.itemClass, "everyday");
  assert.equal(result.productType, "Furniture");
  assert.equal(result.subType, "Sofas");
  assert.equal(result.category, "all");
});

test("does not force a fashion audience from a generic garment", () => {
  const [result] = rank([{ text: "Dress", confidence: 0.93 }]);
  assert.equal(result.productType, "Dresses");
  assert.equal(result.category, null);
});

test("returns no suggestion for unrelated or low-confidence labels", () => {
  assert.deepEqual(rank([{ text: "Sky", confidence: 0.97 }]), []);
  assert.deepEqual(rank([{ text: "Shoe", confidence: 0.2 }]), []);
});

test("turns specific high-confidence labels into optional tag suggestions", () => {
  assert.deepEqual(
    buildImageLabelTagSuggestions([
      { text: "Clothing", confidence: 0.99 },
      { text: "Floral design", confidence: 0.91 },
      { text: "Summer", confidence: 0.76 },
      { text: "Low confidence", confidence: 0.2 },
      { text: "Summer", confidence: 0.7 },
    ]),
    ["Floral design", "Summer"],
  );
});
