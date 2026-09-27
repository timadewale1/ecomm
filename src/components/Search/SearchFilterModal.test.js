import {
  buildFiltersPayload,
  getSizeFilterTypes,
  getSizesForType,
  sanitizeSizeFilterValues,
} from "./SearchFilterModal";

describe("SearchFilterModal sizing", () => {
  test("removes audited NONE leaves without removing meaningful sibling sizes", () => {
    expect(getSizesForType("Bags")).toEqual([]);
    expect(getSizesForType("Jewelry", ["Earrings"])).toEqual([]);
    expect(getSizesForType("Sportswear", ["Headbands"])).toEqual([]);

    expect(getSizesForType("Jewelry", ["Rings"])).toContain("US 7");
    expect(getSizesForType("Sportswear", ["Jerseys"])).toContain("M");
  });

  test("uses nested result leaves when deciding whether a size type exists", () => {
    expect(
      getSizeFilterTypes([], {
        productTypes: [
          { key: "jewelry", subTypes: [{ key: "earrings" }] },
          { key: "sportswear", subTypes: [{ key: "headbands" }] },
        ],
      }),
    ).toEqual([]);

    expect(
      getSizeFilterTypes([], {
        productTypes: [
          {
            key: "sportswear",
            subTypes: [{ key: "headbands" }, { key: "jerseys" }],
          },
        ],
      }),
    ).toEqual(["sportswear"]);
  });

  test("drops stale NONE payloads but preserves exact legacy raw values", () => {
    expect(
      buildFiltersPayload({
        sizeType: "Bags",
        subTypes: ["Handbags"],
        sizes: ["One Size"],
      }),
    ).toEqual({ subTypes: ["handbags"] });

    expect(
      sanitizeSizeFilterValues({
        sizeType: "Jewelry",
        subTypes: ["Earrings"],
        sizes: ["One Size", "Legacy Medium"],
      }),
    ).toEqual([]);

    expect(
      sanitizeSizeFilterValues({
        sizeType: "Jewelry",
        subTypes: ["Rings"],
        sizes: ["One Size", "Legacy Vendor Label"],
      }),
    ).toEqual(["One Size", "Legacy Vendor Label"]);
  });
});
