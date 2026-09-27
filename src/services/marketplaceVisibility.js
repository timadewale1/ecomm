export function isMarketplaceVendorEligible(vendor) {
  return Boolean(
    vendor?.isApproved === true && vendor?.isDeactivated !== true,
  );
}

export function isMarketplaceProductPublished(product) {
  return Boolean(
    product?.published === true &&
      product?.isDeleted !== true &&
      product?.isDeactivated !== true &&
      product?.deactivated !== true,
  );
}

// `vendorEligible` is maintained by Cloud Functions. Customer-facing list
// surfaces deliberately fail closed when an older/malformed product lacks it.
export function isMarketplaceProductEligible(product) {
  return Boolean(
    isMarketplaceProductPublished(product) &&
      product?.vendorEligible === true,
  );
}

export function isMarketplaceProductAvailable(product, vendor) {
  return Boolean(
    isMarketplaceProductPublished(product) &&
      isMarketplaceVendorEligible(vendor),
  );
}
