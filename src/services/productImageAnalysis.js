import { Capacitor } from "@capacitor/core";
import { PRODUCT_IMAGE_LABEL_THRESHOLD } from "./productTaxonomyInference.mjs";

const TEMP_DIRECTORY = "mythrift-product-analysis";

const extensionForType = (type) => {
  if (type === "image/png") return "png";
  if (type === "image/webp") return "webp";
  return "jpg";
};

const fileToBase64 = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("The photo could not be prepared for analysis."));
    reader.onload = () => {
      const result = String(reader.result || "");
      const commaIndex = result.indexOf(",");
      if (commaIndex < 0) {
        reject(new Error("The photo could not be prepared for analysis."));
        return;
      }
      resolve(result.slice(commaIndex + 1));
    };
    reader.readAsDataURL(file);
  });

const uniqueFileName = (file) => {
  const randomPart =
    globalThis.crypto?.randomUUID?.() ||
    `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `${TEMP_DIRECTORY}/${randomPart}.${extensionForType(file?.type)}`;
};

export const canAnalyzeProductImages = () => Capacitor.isNativePlatform();

/**
 * Runs the bundled ML Kit labeler against a temporary, already-optimised image.
 * The temporary file is always removed and is never uploaded separately.
 */
export const analyzeProductImageLabels = async (
  file,
  { confidenceThreshold = PRODUCT_IMAGE_LABEL_THRESHOLD, signal } = {},
) => {
  if (!canAnalyzeProductImages()) {
    const error = new Error("Product image analysis is only available in the mobile app.");
    error.code = "PRODUCT_IMAGE_ANALYSIS_UNAVAILABLE";
    throw error;
  }
  if (!(file instanceof Blob) || !file.type?.startsWith("image/")) {
    const error = new Error("A valid product image is required for analysis.");
    error.code = "PRODUCT_IMAGE_ANALYSIS_INVALID_FILE";
    throw error;
  }
  if (signal?.aborted) {
    const error = new Error("Product image analysis was cancelled.");
    error.name = "AbortError";
    throw error;
  }

  const [{ Directory, Filesystem }, { ImageLabeling }] = await Promise.all([
    import("@capacitor/filesystem"),
    import("@capacitor-mlkit/image-labeling"),
  ]);
  const path = uniqueFileName(file);
  let wroteTemporaryFile = false;

  try {
    const data = await fileToBase64(file);
    if (signal?.aborted) {
      const error = new Error("Product image analysis was cancelled.");
      error.name = "AbortError";
      throw error;
    }
    await Filesystem.writeFile({
      path,
      data,
      directory: Directory.Cache,
      recursive: true,
    });
    wroteTemporaryFile = true;
    const { uri } = await Filesystem.getUri({
      path,
      directory: Directory.Cache,
    });
    const result = await ImageLabeling.processImage({
      path: uri,
      confidenceThreshold,
    });
    if (signal?.aborted) {
      const error = new Error("Product image analysis was cancelled.");
      error.name = "AbortError";
      throw error;
    }
    return Array.isArray(result?.labels) ? result.labels : [];
  } finally {
    if (wroteTemporaryFile) {
      await Filesystem.deleteFile({
        path,
        directory: Directory.Cache,
      }).catch(() => undefined);
    }
  }
};
