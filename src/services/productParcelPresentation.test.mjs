import test from "node:test";
import assert from "node:assert/strict";
import {
  getAllowedParcelSizeOptions,
  getProductParcelPresentation,
  isParcelSizeSelectionSafe,
} from "./productParcelPresentation.js";
import { getExplicitAudienceForProductType } from "./productTaxonomyPresentation.js";

test("compact accessories stay very small while normal fashion starts small", () => {
  assert.equal(
    getProductParcelPresentation({
      itemClass: "fashion",
      productType: "Earrings",
      subType: "Stud Earrings",
    }).key,
    "very-small",
  );
  assert.equal(
    getProductParcelPresentation({
      itemClass: "fashion",
      productType: "Footwear",
      subType: "Sneakers",
    }).key,
    "small",
  );
  assert.equal(
    getProductParcelPresentation({
      itemClass: "fashion",
      productType: "Jackets",
      subType: "Puffer Jackets",
    }).key,
    "small",
  );
});

test("vendors can correct a suggestion without misusing very-small", () => {
  const recommendation = getProductParcelPresentation({
    itemClass: "everyday",
    productType: "Home Decor",
    subType: "Vases",
  });
  assert.equal(recommendation.key, "medium");
  assert.equal(isParcelSizeSelectionSafe("very-small", recommendation), false);
  assert.equal(isParcelSizeSelectionSafe("small", recommendation), true);
  assert.equal(isParcelSizeSelectionSafe("large", recommendation), true);
  assert.deepEqual(
    getAllowedParcelSizeOptions(recommendation).map((option) => option.value),
    ["small", "medium", "large", "special-handling"],
  );
});

test("only explicitly gendered catalogue types infer an audience", () => {
  assert.equal(getExplicitAudienceForProductType("Dresses"), "Womens");
  assert.equal(getExplicitAudienceForProductType("Corporate Men"), "Mens");
  assert.equal(getExplicitAudienceForProductType("Tops"), null);
});
