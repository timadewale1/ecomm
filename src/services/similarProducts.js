import { auth } from "../firebase.config";
import { getAnonymousIdV2 } from "./signals";

export const SIMILAR_PRODUCTS_ENDPOINT =
  import.meta.env.VITE_PUBLIC_SIMILAR_PRODUCTS_V1_ENDPOINT ||
  "https://us-central1-ecommerce-ba520.cloudfunctions.net/similarProductsV1";

export const SIMILAR_PRODUCTS_BATCH_SIZE = 60;

function normalizeProduct(product) {
  const availableSizes = product?.availableSizes;
  const size =
    typeof product?.size === "string" && product.size.trim()
      ? product.size.trim()
      : Array.isArray(availableSizes)
        ? availableSizes.filter(Boolean).join(", ")
        : typeof availableSizes === "string"
          ? availableSizes
          : "";

  return {
    ...product,
    id: product?.id || product?.productId,
    size,
    condition:
      product?.condition ||
      product?.itemCondition ||
      product?.productCondition ||
      "",
  };
}

export async function requestSimilarProducts({
  productId,
  limit = SIMILAR_PRODUCTS_BATCH_SIZE,
  signal,
}) {
  const numericLimit = Number(limit);
  const safeLimit = Number.isFinite(numericLimit)
    ? Math.min(SIMILAR_PRODUCTS_BATCH_SIZE, Math.max(1, numericLimit))
    : SIMILAR_PRODUCTS_BATCH_SIZE;
  const headers = { "Content-Type": "application/json" };
  const currentUser = auth.currentUser;
  if (currentUser) {
    // Do not silently submit an authenticated viewer as a guest. That would
    // split their exposure history and make repeated recommendations return.
    headers.Authorization = `Bearer ${await currentUser.getIdToken()}`;
  }

  const response = await fetch(SIMILAR_PRODUCTS_ENDPOINT, {
    method: "POST",
    headers,
    signal,
    body: JSON.stringify({
      productId,
      limit: safeLimit,
      anonymousId: getAnonymousIdV2(),
    }),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    const error = new Error(
      body?.error || `Similar items request failed (${response.status})`,
    );
    error.status = response.status;
    error.requestId = body?.requestId || null;
    throw error;
  }

  const data = await response.json();
  return {
    items: (Array.isArray(data.items) ? data.items : [])
      .map(normalizeProduct)
      .filter((item) => item.id),
    requestId: data.requestId || null,
    algorithmVersion:
      data.algorithmVersion || "similar_items_v1_2026_09_09_exposure",
  };
}
