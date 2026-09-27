import Compressor from "compressorjs";
import {
  deleteObject,
  getDownloadURL,
  ref,
  uploadBytesResumable,
} from "firebase/storage";

export const MAX_STORED_PRODUCT_IMAGE_BYTES = 3 * 1024 * 1024;
export const PRODUCT_IMAGE_TARGET_BYTES = Math.floor(2.85 * 1024 * 1024);
export const MAX_SOURCE_PRODUCT_IMAGE_BYTES = 32 * 1024 * 1024;

const QUALITY_STEPS = [0.82, 0.7, 0.58, 0.46, 0.36, 0.28];
const DIRECTLY_COMPRESSIBLE_TYPES = new Set(["image/jpeg", "image/webp"]);

const loadImageDimensions = (file) =>
  new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();

    const release = () => URL.revokeObjectURL(objectUrl);
    image.onload = () => {
      const dimensions = {
        width: image.naturalWidth,
        height: image.naturalHeight,
      };
      release();
      resolve(dimensions);
    };
    image.onerror = () => {
      release();
      reject(new Error(`${file.name || "This image"} could not be read.`));
    };
    image.src = objectUrl;
  });

const compressOnce = (file, quality, mimeType) =>
  new Promise((resolve, reject) => {
    new Compressor(file, {
      quality,
      mimeType,
      strict: false,
      checkOrientation: true,
      retainExif: false,
      convertSize: Infinity,
      success: resolve,
      error: reject,
    });
  });

const extensionForMimeType = (mimeType) => {
  if (mimeType === "image/jpeg") return "jpg";
  if (mimeType === "image/webp") return "webp";
  if (mimeType === "image/png") return "png";
  return "img";
};

const withMatchingFileName = (blob, originalFile, mimeType) => {
  const baseName = String(originalFile.name || "product-image")
    .replace(/\.[^.]+$/, "")
    .trim();
  return new File(
    [blob],
    `${baseName || "product-image"}.${extensionForMimeType(mimeType)}`,
    {
      type: mimeType,
      lastModified: originalFile.lastModified || Date.now(),
    },
  );
};

/**
 * Reduces encoded storage bytes without setting width/height constraints.
 * A decoded dimension check guards against browser/encoder regressions.
 */
export const prepareProductImage = async (
  file,
  { onAttempt, targetBytes = PRODUCT_IMAGE_TARGET_BYTES } = {},
) => {
  if (!(file instanceof Blob) || !file.type?.startsWith("image/")) {
    throw new Error(`${file?.name || "This file"} is not a valid image.`);
  }
  if (file.size > MAX_SOURCE_PRODUCT_IMAGE_BYTES) {
    throw new Error(
      `${file.name || "This image"} is too large to prepare safely. Please choose an image under 32MB.`,
    );
  }

  const sourceDimensions = await loadImageDimensions(file);
  if (file.size <= MAX_STORED_PRODUCT_IMAGE_BYTES) {
    return {
      file,
      originalBytes: file.size,
      storedBytes: file.size,
      wasOptimized: false,
      dimensions: sourceDimensions,
    };
  }

  const mimeType = DIRECTLY_COMPRESSIBLE_TYPES.has(file.type)
    ? file.type
    : "image/webp";
  let smallestResult = null;

  for (const [index, quality] of QUALITY_STEPS.entries()) {
    onAttempt?.({ attempt: index + 1, totalAttempts: QUALITY_STEPS.length });
    const compressedBlob = await compressOnce(file, quality, mimeType);
    const compressedFile = withMatchingFileName(
      compressedBlob,
      file,
      compressedBlob.type || mimeType,
    );

    if (!smallestResult || compressedFile.size < smallestResult.size) {
      smallestResult = compressedFile;
    }
    if (compressedFile.size <= targetBytes) break;
  }

  if (!smallestResult || smallestResult.size > MAX_STORED_PRODUCT_IMAGE_BYTES) {
    throw new Error(
      `${file.name || "This image"} could not be reduced below 3MB without changing its dimensions.`,
    );
  }

  const resultDimensions = await loadImageDimensions(smallestResult);
  const dimensionsMatch =
    (resultDimensions.width === sourceDimensions.width &&
      resultDimensions.height === sourceDimensions.height) ||
    (resultDimensions.width === sourceDimensions.height &&
      resultDimensions.height === sourceDimensions.width);
  if (!dimensionsMatch) {
    throw new Error(
      `${file.name || "This image"} could not be optimised without changing its dimensions.`,
    );
  }

  return {
    file: smallestResult,
    originalBytes: file.size,
    storedBytes: smallestResult.size,
    wasOptimized: true,
    dimensions: sourceDimensions,
  };
};

export const createProductImagePreview = (file) => ({
  file,
  preview: URL.createObjectURL(file),
});

export const safeStorageFileName = (fileName, fallback = "image") => {
  const source = String(fileName || fallback).trim();
  const extensionMatch = source.match(/\.([a-zA-Z0-9]{2,5})$/);
  const extension = extensionMatch ? `.${extensionMatch[1].toLowerCase()}` : "";
  const base = source
    .replace(/\.[^.]+$/, "")
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return `${base || fallback}${extension}`;
};

const uploadOne = ({ storage, entry, reportProgress, activeTasks }) =>
  new Promise((resolve, reject) => {
    const storageRef = ref(storage, entry.path);
    const task = uploadBytesResumable(storageRef, entry.file, {
      contentType: entry.file.type || "application/octet-stream",
      cacheControl: "public,max-age=31536000,immutable",
    });
    activeTasks.add(task);

    task.on(
      "state_changed",
      (snapshot) => reportProgress(entry.key, snapshot.bytesTransferred),
      (error) => {
        activeTasks.delete(task);
        reject(error);
      },
      async () => {
        activeTasks.delete(task);
        try {
          reportProgress(entry.key, entry.file.size);
          resolve({
            ...entry,
            url: await getDownloadURL(task.snapshot.ref),
            storageRef: task.snapshot.ref,
          });
        } catch (error) {
          reject(error);
        }
      },
    );
  });

/** Uploads in a small pool so mobile memory/network use stays bounded. */
export const uploadProductImageBatch = async ({
  storage,
  entries,
  concurrency = 2,
  onProgress,
}) => {
  if (!entries.length) return [];

  const transferredByKey = new Map(entries.map((entry) => [entry.key, 0]));
  const totalBytes = entries.reduce((sum, entry) => sum + entry.file.size, 0);
  const results = new Array(entries.length);
  const activeTasks = new Set();
  let cursor = 0;
  let firstError = null;

  const reportProgress = (key, bytes) => {
    transferredByKey.set(key, bytes);
    const transferredBytes = [...transferredByKey.values()].reduce(
      (sum, value) => sum + value,
      0,
    );
    const completed = entries.reduce(
      (count, entry) =>
        count +
        (transferredByKey.get(entry.key) >= entry.file.size ? 1 : 0),
      0,
    );
    onProgress?.({
      transferredBytes,
      totalBytes,
      completed,
      percent: totalBytes
        ? Math.min(100, Math.round((transferredBytes / totalBytes) * 100))
        : 100,
    });
  };

  const worker = async () => {
    while (!firstError) {
      const index = cursor;
      cursor += 1;
      if (index >= entries.length) return;

      try {
        results[index] = await uploadOne({
          storage,
          entry: entries[index],
          reportProgress,
          activeTasks,
        });
      } catch (error) {
        if (!firstError) {
          firstError = error;
          activeTasks.forEach((task) => task.cancel());
        }
        throw firstError;
      }
    }
  };

  try {
    const workers = Array.from(
      { length: Math.min(Math.max(1, concurrency), entries.length) },
      worker,
    );
    await Promise.allSettled(workers);
    if (firstError) throw firstError;
    return results;
  } catch (error) {
    const uploadError = new Error(
      error?.message || "One or more product images could not be uploaded.",
      { cause: error },
    );
    uploadError.code = error?.code;
    uploadError.storageRefs = entries.map((entry) => ref(storage, entry.path));
    throw uploadError;
  }
};

export const deleteProductImageRefs = async (storageRefs) => {
  await Promise.allSettled(
    (storageRefs || []).map(async (storageRef) => {
      try {
        await deleteObject(storageRef);
      } catch (error) {
        if (error?.code !== "storage/object-not-found") throw error;
      }
    }),
  );
};
