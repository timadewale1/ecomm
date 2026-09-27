const DRAFT_VERSION = 2;
const DRAFT_KEY_PREFIX = "mythrift:add-product-draft:";
const DRAFT_IMAGE_DB = "mythrift-add-product-drafts";
const DRAFT_IMAGE_STORE = "listing-images";
const DRAFT_IMAGE_DB_VERSION = 1;

const draftKey = (vendorId) =>
  `${DRAFT_KEY_PREFIX}${encodeURIComponent(String(vendorId || ""))}`;

const cleanPickerOption = (option) => {
  if (!option?.value) return null;
  return {
    value: String(option.value),
    label: String(option.label || option.value),
    ...(Array.isArray(option.subTypes)
      ? {
          subTypes: option.subTypes.map((subType) =>
            typeof subType === "string"
              ? subType
              : { name: String(subType?.name || subType?.value || "") },
          ),
        }
      : {}),
  };
};

const stripTransientVariantState = (variants) =>
  (Array.isArray(variants) ? variants : []).map((variant) => ({
    color: String(variant?.color || ""),
    sizes: (Array.isArray(variant?.sizes) ? variant.sizes : []).map((entry) => ({
      size: String(entry?.size || ""),
      stock: String(entry?.stock || ""),
      ...(entry?.sizeRef ? { sizeRef: entry.sizeRef } : {}),
      isActive: entry?.isActive !== false,
    })),
  }));

const stripSubProductImages = (subProducts) =>
  (Array.isArray(subProducts) ? subProducts : []).map((subProduct) => ({
    ...subProduct,
    images: [],
    draftImageCount: Array.isArray(subProduct?.images)
      ? subProduct.images.length
      : Number(subProduct?.draftImageCount || 0),
  }));

export const createAddProductDraft = ({
  vendorId,
  itemClass,
  productName,
  productDescription,
  productPrice,
  stockQuantity,
  productCondition,
  productDefectDescription,
  category,
  selectedProductType,
  selectedSubType,
  productVariants,
  tags,
  hasVariations,
  subProducts,
  discountDetails,
  runDiscount,
  productImageCount,
  parcelSize,
  parcelSizeSource,
}) => ({
  version: DRAFT_VERSION,
  vendorId: String(vendorId || ""),
  updatedAt: Date.now(),
  itemClass: itemClass === "everyday" ? "everyday" : "fashion",
  productName: String(productName || ""),
  productDescription: String(productDescription || ""),
  productPrice: String(productPrice || ""),
  stockQuantity: String(stockQuantity || ""),
  productCondition: String(productCondition || ""),
  productDefectDescription: String(productDefectDescription || ""),
  category: String(category || ""),
  selectedProductType: cleanPickerOption(selectedProductType),
  selectedSubType: cleanPickerOption(selectedSubType),
  productVariants: stripTransientVariantState(productVariants),
  tags: Array.isArray(tags) ? tags.map(String).slice(0, 10) : [],
  hasVariations: hasVariations === true,
  subProducts: stripSubProductImages(subProducts),
  discountDetails: discountDetails || null,
  runDiscount: runDiscount === true,
  productImageCount: Number(productImageCount || 0),
  parcelSize: String(parcelSize || ""),
  parcelSizeSource:
    parcelSizeSource === "vendor-confirmed"
      ? "vendor-confirmed"
      : "taxonomy-default",
});

const hasMeaningfulSubProduct = (subProduct) =>
  Boolean(
    subProduct?.name ||
      subProduct?.color ||
      subProduct?.size ||
      subProduct?.stock ||
      Number(subProduct?.draftImageCount || 0) > 0,
  );

const hasMeaningfulDiscount = (discount) =>
  Boolean(
    discount &&
      typeof discount === "object" &&
      Object.values(discount).some((value) =>
        Array.isArray(value)
          ? value.length > 0
          : value != null && String(value).trim() !== "",
      ),
  );

export const hasMeaningfulAddProductDraft = (draft) => {
  if (!draft) return false;

  // `all` is the schema-compatible default for an Everyday listing, not a
  // choice the vendor made. Counting it created a phantom empty draft every
  // time the untouched form was closed.
  const meaningfulCategory =
    draft.itemClass === "fashion" &&
    Boolean(draft.category && draft.category !== "all");

  return Boolean(
    String(draft.productName || "").trim() ||
      String(draft.productDescription || "").trim() ||
      String(draft.productPrice || "").trim() ||
      String(draft.stockQuantity || "").trim() ||
      String(draft.productCondition || "").trim() ||
      String(draft.productDefectDescription || "").trim() ||
      meaningfulCategory ||
      draft.selectedProductType?.value ||
      draft.selectedSubType?.value ||
      draft.tags?.some((tag) => String(tag || "").trim()) ||
      hasMeaningfulDiscount(draft.discountDetails) ||
      Number(draft.productImageCount || 0) > 0 ||
      draft.productVariants?.some(
        (variant) =>
          String(variant?.color || "").trim() ||
          variant?.sizes?.some(
            (entry) =>
              String(entry?.size || "").trim() ||
              String(entry?.stock || "").trim(),
          ),
      ) ||
      draft.subProducts?.some(hasMeaningfulSubProduct),
  );
};

export const saveAddProductDraft = (draft) => {
  if (!draft?.vendorId) return false;
  try {
    if (!hasMeaningfulAddProductDraft(draft)) {
      localStorage.removeItem(draftKey(draft.vendorId));
      return true;
    }
    localStorage.setItem(draftKey(draft.vendorId), JSON.stringify(draft));
    return true;
  } catch (error) {
    console.warn("[AddProductDraft] Draft could not be saved", {
      code: error?.name || "storage-unavailable",
    });
    return false;
  }
};

export const loadAddProductDraft = (vendorId) => {
  if (!vendorId) return null;
  try {
    const parsed = JSON.parse(localStorage.getItem(draftKey(vendorId)) || "null");
    if (
      !parsed ||
      ![1, DRAFT_VERSION].includes(parsed.version) ||
      parsed.vendorId !== String(vendorId)
    ) {
      return null;
    }
    if (!hasMeaningfulAddProductDraft(parsed)) {
      localStorage.removeItem(draftKey(vendorId));
      return null;
    }
    return parsed;
  } catch (error) {
    console.warn("[AddProductDraft] Invalid saved draft was ignored", {
      code: error?.name || "invalid-json",
    });
    return null;
  }
};

export const clearAddProductDraft = (vendorId) => {
  if (!vendorId) return;
  try {
    localStorage.removeItem(draftKey(vendorId));
  } catch (error) {
    console.warn("[AddProductDraft] Draft could not be cleared", {
      code: error?.name || "storage-unavailable",
    });
  }
};

const openDraftImageDatabase = () =>
  new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB is unavailable."));
      return;
    }
    const request = indexedDB.open(DRAFT_IMAGE_DB, DRAFT_IMAGE_DB_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(DRAFT_IMAGE_STORE)) {
        database.createObjectStore(DRAFT_IMAGE_STORE, { keyPath: "vendorId" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("Draft image storage failed."));
  });

const filePayload = (image) => {
  const file = image?.file || image;
  if (!(file instanceof Blob)) return null;
  return {
    blob: file,
    name: String(file.name || "draft-product-image"),
    type: String(file.type || "image/jpeg"),
    lastModified: Number(file.lastModified || Date.now()),
    originalBytes: Number(image?.originalBytes || file.size || 0),
    storedBytes: Number(image?.storedBytes || file.size || 0),
    wasOptimized: image?.wasOptimized === true,
  };
};

const runImageStoreRequest = async (mode, operation) => {
  const database = await openDraftImageDatabase();
  try {
    return await new Promise((resolve, reject) => {
      const transaction = database.transaction(DRAFT_IMAGE_STORE, mode);
      const store = transaction.objectStore(DRAFT_IMAGE_STORE);
      let result;
      try {
        result = operation(store);
      } catch (error) {
        reject(error);
        return;
      }
      transaction.oncomplete = () => resolve(result?.result);
      transaction.onerror = () =>
        reject(transaction.error || result?.error || new Error("Draft image transaction failed."));
      transaction.onabort = () =>
        reject(transaction.error || new Error("Draft image transaction was cancelled."));
    });
  } finally {
    database.close();
  }
};

export const saveAddProductDraftImages = async ({
  vendorId,
  productImages,
  subProducts,
}) => {
  if (!vendorId) return false;
  const mainImages = (productImages || []).map(filePayload).filter(Boolean);
  const variationImages = (subProducts || [])
    .map((subProduct) => ({
      subProductId: String(subProduct?.subProductId || ""),
      images: (subProduct?.images || []).map(filePayload).filter(Boolean),
    }))
    .filter((entry) => entry.subProductId && entry.images.length);

  if (!mainImages.length && !variationImages.length) {
    await clearAddProductDraftImages(vendorId);
    return true;
  }

  await runImageStoreRequest("readwrite", (store) =>
    store.put({
      vendorId: String(vendorId),
      version: DRAFT_IMAGE_DB_VERSION,
      updatedAt: Date.now(),
      mainImages,
      variationImages,
    }),
  );
  return true;
};

const restoreFile = (entry) => {
  if (!(entry?.blob instanceof Blob)) return null;
  return new File([entry.blob], entry.name || "draft-product-image", {
    type: entry.type || entry.blob.type || "image/jpeg",
    lastModified: Number(entry.lastModified || Date.now()),
  });
};

export const loadAddProductDraftImages = async (vendorId) => {
  if (!vendorId) return null;
  const database = await openDraftImageDatabase();
  try {
    const record = await new Promise((resolve, reject) => {
      const transaction = database.transaction(DRAFT_IMAGE_STORE, "readonly");
      const request = transaction.objectStore(DRAFT_IMAGE_STORE).get(String(vendorId));
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error || new Error("Draft images could not be restored."));
    });
    if (!record || record.version !== DRAFT_IMAGE_DB_VERSION) return null;
    return {
      mainImages: (record.mainImages || [])
        .map((entry) => ({ ...entry, file: restoreFile(entry) }))
        .filter((entry) => entry.file),
      variationImages: (record.variationImages || []).map((variation) => ({
        subProductId: variation.subProductId,
        images: (variation.images || [])
          .map((entry) => ({ ...entry, file: restoreFile(entry) }))
          .filter((entry) => entry.file),
      })),
    };
  } finally {
    database.close();
  }
};

export const clearAddProductDraftImages = async (vendorId) => {
  if (!vendorId || typeof indexedDB === "undefined") return;
  await runImageStoreRequest("readwrite", (store) =>
    store.delete(String(vendorId)),
  );
};
