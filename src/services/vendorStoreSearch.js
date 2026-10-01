import { createCanonicalSizeKeys } from "../config/sizingV1";

export const VENDOR_STORE_SEARCH_URL =
  "https://us-central1-ecommerce-ba520.cloudfunctions.net/vendorStoreProductsV1";

export const VENDOR_STORE_PAGE_SIZE = 60;

const clean = (value) =>
  typeof value === "string" ? value.trim().toLowerCase() : "";

const cleanList = (values) =>
  Array.from(
    new Set((Array.isArray(values) ? values : []).map(clean).filter(Boolean)),
  );

// OpenSearch stores the catalogue image under `productCoverImage`, while
// legacy Firestore-backed UI still reads `coverImageUrl`. Keep both aliases at
// this service boundary so every vendor-catalogue consumer receives the same
// product shape without changing the persisted product document.
const normalizeVendorStoreProduct = (product) => {
  if (!product || typeof product !== "object") return product;

  const coverImage = String(
    product.productCoverImage || product.coverImageUrl || "",
  ).trim();

  if (!coverImage) return product;

  return {
    ...product,
    productCoverImage: product.productCoverImage || coverImage,
    coverImageUrl: product.coverImageUrl || coverImage,
  };
};

export function buildVendorStoreFilters(filters = {}) {
  const payload = {};

  // SearchFilterModal keeps a suggested size type selected so it can render
  // the relevant size choices. That UI-only selection is not an active
  // product-type filter until the shopper actually selects at least one size.
  if (filters.sizeType && filters.sizes?.length) {
    payload.productType = clean(filters.sizeType);
    payload.sizes = cleanList(filters.sizes);
    const subtypeContexts = filters.subTypes?.length ? filters.subTypes : [""];
    const sizeKeys = cleanList(
      subtypeContexts.flatMap((subType) =>
        createCanonicalSizeKeys(
          filters.sizes,
          filters.sizeType,
          subType,
          { source: "forward" },
        ),
      ),
    );
    if (sizeKeys.length) payload.sizeKeys = sizeKeys;
  }
  if (filters.category) payload.category = [clean(filters.category)];
  if (filters.conditions?.length) {
    payload.conditions = cleanList(filters.conditions);
  }
  if (filters.colors?.length) payload.colors = cleanList(filters.colors);
  if (filters.subTypes?.length) payload.subTypes = cleanList(filters.subTypes);

  const priceMin = Number(filters.priceMin);
  const priceMax = Number(filters.priceMax);
  if (Number.isFinite(priceMin) && priceMin > 0) payload.priceMin = priceMin;
  if (Number.isFinite(priceMax) && priceMax > 0) payload.priceMax = priceMax;

  return payload;
}

export async function fetchVendorStoreProducts({
  vendorId,
  query = "",
  filters = {},
  cursor = null,
  signal,
}) {
  const response = await fetch(VENDOR_STORE_SEARCH_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal,
    body: JSON.stringify({
      vendorId,
      q: String(query || "").trim(),
      pageSize: VENDOR_STORE_PAGE_SIZE,
      cursor,
      sort: filters.sort || (query ? "relevance" : "newest"),
      strictVariant: true,
      filters: buildVendorStoreFilters(filters),
    }),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    const error = new Error(
      body?.error || `Vendor products request failed (${response.status})`,
    );
    error.status = response.status;
    error.requestId = body?.requestId || null;
    throw error;
  }

  const data = await response.json();
  return {
    items: Array.isArray(data.items)
      ? data.items.map(normalizeVendorStoreProduct)
      : [],
    total: Math.max(0, Number(data.total || 0)),
    availableTotal:
      data.availableTotal != null &&
      Number.isFinite(Number(data.availableTotal))
        ? Math.max(0, Number(data.availableTotal))
        : null,
    nextCursor: data.nextCursor || null,
    facets: data.facets || null,
    requestId: data.requestId || null,
    algorithmVersion: data.algorithmVersion || "vendor_store_search_v1",
  };
}
