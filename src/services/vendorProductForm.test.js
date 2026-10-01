import {
  crossesNoSizeProfileBoundary,
  filterPristineTrailingSizeRows,
  getVariantDescriptionDimensions,
  hasVariantDraft,
} from "./vendorProductForm";

describe("vendorProductForm", () => {
  test("treats colour, size, stock, and sub-products as meaningful drafts", () => {
    expect(hasVariantDraft([{ color: "", sizes: [{ size: "", stock: "" }] }])).toBe(
      false,
    );
    expect(hasVariantDraft([{ color: "Blue", sizes: [] }])).toBe(true);
    expect(hasVariantDraft([{ color: "", sizes: [{ size: "M", stock: "" }] }])).toBe(
      true,
    );
    expect(hasVariantDraft([{ color: "", sizes: [{ size: "", stock: "0" }] }])).toBe(
      true,
    );
    expect(hasVariantDraft([], [{}])).toBe(true);
  });

  test("removes only pristine trailing rows and keeps partial or interior rows", () => {
    const complete = { size: "M", stock: "2" };
    const interiorBlank = { size: "", stock: "" };
    const partial = { size: "L", stock: "" };
    const trailingBlank = { size: " ", stock: "" };
    const variants = [
      {
        color: "Blue",
        sizes: [complete, interiorBlank, partial, trailingBlank],
      },
      { color: "Red", sizes: [interiorBlank] },
    ];

    const result = filterPristineTrailingSizeRows(variants);

    expect(result[0].sizes).toEqual([complete, interiorBlank, partial]);
    expect(result[1].sizes).toEqual([interiorBlank]);
    expect(variants[0].sizes).toHaveLength(4);
  });

  test("recognizes every NONE/non-NONE boundary", () => {
    expect(
      crossesNoSizeProfileBoundary({ kind: "NONE" }, { kind: "APPAREL" }),
    ).toBe(true);
    expect(crossesNoSizeProfileBoundary({ kind: "NONE" }, null)).toBe(true);
    expect(crossesNoSizeProfileBoundary(null, { kind: "NONE" })).toBe(true);
    expect(
      crossesNoSizeProfileBoundary({ kind: "NONE" }, { kind: "NONE" }),
    ).toBe(false);
    expect(crossesNoSizeProfileBoundary(null, { kind: "APPAREL" })).toBe(false);
  });

  test("omits the internal size dimension for NONE descriptions", () => {
    const variants = [
      { color: "Black", sizes: [{ size: "One Size", stock: "3" }] },
    ];

    expect(
      getVariantDescriptionDimensions(variants, { omitSizes: true }),
    ).toEqual({ colours: ["Black"], sizes: [] });
    expect(getVariantDescriptionDimensions(variants)).toEqual({
      colours: ["Black"],
      sizes: ["One Size"],
    });
  });
});
