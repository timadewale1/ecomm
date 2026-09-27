import {
  getVariantSwatchSelectionKey,
  hasPurchasableVariantForSize,
  isVariantSizeHidden,
  resolveCurrentVariantSelection,
  resolvePurchasableVariantChoice,
  resolveSinglePurchasableVariant,
  resolveSinglePurchasableVariantForSwatch,
  resolveVariantByRawSelection,
  shouldInitializeProductVariantSelection,
} from "./productVariantSelection";

describe("productVariantSelection", () => {
  test("auto-selects the only complete in-stock row and preserves raw values", () => {
    const row = { color: " Navy Blue ", size: " UK 8 ", stock: "3" };
    const result = resolveSinglePurchasableVariant([row]);

    expect(result).toMatchObject({
      color: " Navy Blue ",
      size: " UK 8 ",
      stock: 3,
      variant: row,
    });
  });

  test("ignores unrelated sold-out rows but never guesses between stocked rows", () => {
    const available = { color: "Red", size: "M", stock: 2 };
    const soldOut = { color: "Blue", size: "L", stock: 0 };

    expect(resolveSinglePurchasableVariant([soldOut, available])?.variant).toBe(
      available,
    );
    expect(
      resolveSinglePurchasableVariant([
        available,
        { color: "Blue", size: "L", stock: 1 },
      ]),
    ).toBeNull();
  });

  test("excludes incomplete and non-positive-stock rows", () => {
    expect(
      resolveSinglePurchasableVariant([
        { color: "", size: "M", stock: 5 },
        { color: "Red", size: "", stock: 5 },
        { color: "Red", size: "M", stock: "not-a-number" },
        { color: "Blue", size: "L", stock: -1 },
      ]),
    ).toBeNull();
  });

  test("rejects duplicates and aliases that the operational matcher could confuse", () => {
    expect(
      resolveSinglePurchasableVariant([
        { color: "Red", size: "M", stock: 4 },
        { color: " red ", size: "m", stock: 0 },
      ]),
    ).toBeNull();

    expect(
      resolveSinglePurchasableVariant([
        { color: "Navy", size: "M", stock: 4 },
        { color: "Navy Blue", size: "m", stock: 0 },
      ]),
    ).toBeNull();
  });

  test("uses distinct UI keys for unrelated unknown colours", () => {
    const first = getVariantSwatchSelectionKey("Vendor Tone Alpha");
    const second = getVariantSwatchSelectionKey("Vendor Tone Beta");

    expect(first).toMatch(/^unknown:/);
    expect(second).toMatch(/^unknown:/);
    expect(first).not.toBe(second);
  });

  test("resolves a selected combination to its exact raw row", () => {
    const row = { color: "Navy Blue", size: 42, stock: "7" };
    const swatchKey = getVariantSwatchSelectionKey(row.color);
    const result = resolvePurchasableVariantChoice([row], {
      swatchKey,
      size: "42",
    });

    expect(result).toMatchObject({ color: "Navy Blue", size: 42, stock: 7 });
    expect(result?.variant).toBe(row);
    expect(hasPurchasableVariantForSize([row], 42)).toBe(true);
  });

  test("re-resolves an exact sold-out selection without switching rows", () => {
    const selected = { color: "Red", size: "S", stock: 0 };
    const other = { color: "Blue", size: "M", stock: 8 };

    const result = resolveVariantByRawSelection([selected, other], {
      color: "Red",
      size: "S",
    });

    expect(result?.variant).toBe(selected);
    expect(result?.stock).toBe(0);
  });

  test("never normalized-remaps a supplied stale raw colour", () => {
    const row = { color: "Navy", size: "M", stock: 8 };
    const swatchKey = getVariantSwatchSelectionKey("Navy Blue");

    // The swatch/size pair alone could resolve to `row`, but the supplied raw
    // colour is a persisted identity and must fail exact lookup instead.
    expect(
      resolveCurrentVariantSelection([row], {
        rawColor: "Navy Blue",
        size: "M",
        swatchKey,
      }),
    ).toBeNull();

    expect(
      resolveCurrentVariantSelection([row], {
        rawColor: "",
        size: "M",
        swatchKey,
      })?.variant,
    ).toBe(row);
  });

  test("resolves one internal row per colour when size UI is hidden", () => {
    const red = { color: "Red", size: "__internal_red", stock: 2 };
    const blue = { color: "Blue", size: "__internal_blue", stock: 5 };

    expect(
      resolveSinglePurchasableVariantForSwatch(
        [red, blue],
        getVariantSwatchSelectionKey("Red"),
      )?.variant,
    ).toBe(red);

    expect(
      resolveSinglePurchasableVariantForSwatch(
        [red, { color: "Red", size: "__internal_red_2", stock: 1 }],
        getVariantSwatchSelectionKey("Red"),
      ),
    ).toBeNull();
  });

  test("hides NONE sizing only for implicit One Size rows", () => {
    expect(isVariantSizeHidden({ sizing: { kind: "NONE" } })).toBe(true);
    expect(
      isVariantSizeHidden({
        sizing: { kind: "none" },
        variants: [{ color: "Red", size: "  one SIZE ", stock: 1 }],
      }),
    ).toBe(true);
    expect(
      isVariantSizeHidden({
        sizing: { kind: "NONE" },
        variants: [{ color: "Red", size: "Legacy Medium", stock: 1 }],
      }),
    ).toBe(false);
    expect(
      isVariantSizeHidden({
        sizing: { kind: "NONE" },
        variants: [
          { color: "Red", size: "One Size", stock: 1 },
          { color: "Blue", size: "42", stock: 1 },
        ],
      }),
    ).toBe(false);
    expect(isVariantSizeHidden({ sizing: { kind: "CLOTHING" } })).toBe(false);
    expect(isVariantSizeHidden({})).toBe(false);
  });

  test("infers audited NONE taxonomies for slim search and feed products", () => {
    expect(
      isVariantSizeHidden({
        productType: "bags",
        subType: "handbags",
        availableSizes: [" one size "],
      }),
    ).toBe(true);
    expect(
      isVariantSizeHidden({
        productType: "Jewelry",
        subType: "Earrings",
        size: "One Size",
      }),
    ).toBe(true);
    expect(
      isVariantSizeHidden({
        productType: "Sportswear",
        subType: "Headbands",
        availableSizes: "One Size",
      }),
    ).toBe(true);
    expect(
      isVariantSizeHidden({
        productType: "Jewelry",
        subType: "Rings",
        availableSizes: ["One Size"],
      }),
    ).toBe(false);
  });

  test("keeps every legacy non-sentinel inventory size visible", () => {
    expect(
      isVariantSizeHidden({
        productType: "Bags",
        variants: [{ color: "Black", size: "Medium", stock: 1 }],
        availableSizes: ["One Size"],
      }),
    ).toBe(false);
    expect(
      isVariantSizeHidden({
        sizing: { kind: "NONE" },
        variants: [{ color: "Black", size: "One Size", stock: 1 }],
        subProducts: [{ color: "Brown", size: "Legacy Large", stock: 1 }],
      }),
    ).toBe(false);
    expect(
      isVariantSizeHidden({
        productType: "Hair Accessories",
        availableSizes: ["One Size", "Small"],
      }),
    ).toBe(false);
    expect(
      isVariantSizeHidden({
        sizing: { kind: "FIT_MODE" },
        productType: "Bags",
        variants: [{ color: "Black", size: "One Size", stock: 1 }],
      }),
    ).toBe(false);
  });

  test("waits for the matching loaded variant payload before initialization", () => {
    const ready = {
      routeProductId: "product-2",
      loadedProductId: "product-2",
      hasVariants: true,
      loading: false,
      initializedProductId: null,
    };

    expect(shouldInitializeProductVariantSelection(ready)).toBe(true);
    expect(
      shouldInitializeProductVariantSelection({ ...ready, loading: true }),
    ).toBe(false);
    expect(
      shouldInitializeProductVariantSelection({ ...ready, hasVariants: false }),
    ).toBe(false);
    expect(
      shouldInitializeProductVariantSelection({
        ...ready,
        loadedProductId: "product-1",
      }),
    ).toBe(false);
    expect(
      shouldInitializeProductVariantSelection({
        ...ready,
        initializedProductId: "product-2",
      }),
    ).toBe(false);
  });
});
