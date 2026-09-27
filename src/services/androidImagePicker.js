import { ActionSheet, ActionSheetButtonStyle } from "@capacitor/action-sheet";
import {
  Camera,
  MediaTypeSelection,
} from "@capacitor/camera";
import { Capacitor } from "@capacitor/core";
import { isNativeApp, nativePlatform } from "./platform";

const CAMERA_CANCEL_CODES = new Set([
  "OS-PLUG-CAMR-0006",
  "OS-PLUG-CAMR-0020",
]);

export const usesAndroidNativeImagePicker =
  isNativeApp && nativePlatform === "android";

const mimeForFormat = (format) => {
  const normalized = String(format || "jpeg").toLowerCase();
  if (normalized === "jpg" || normalized === "jpeg") return "image/jpeg";
  if (normalized === "png") return "image/png";
  if (normalized === "webp") return "image/webp";
  if (normalized === "gif") return "image/gif";
  return "image/jpeg";
};

const extensionForMime = (mimeType) => {
  if (mimeType === "image/png") return "png";
  if (mimeType === "image/webp") return "webp";
  if (mimeType === "image/gif") return "gif";
  return "jpg";
};

const base64ToBlob = async (base64, mimeType) => {
  const response = await fetch(`data:${mimeType};base64,${base64}`);
  return response.blob();
};

const mediaResultToFile = async (result, index) => {
  const declaredMime = mimeForFormat(result?.metadata?.format);
  const readableUrl =
    result?.webPath ||
    (result?.uri ? Capacitor.convertFileSrc(result.uri) : "");

  let blob = null;
  if (readableUrl) {
    const response = await fetch(readableUrl);
    if (response.ok) blob = await response.blob();
  }
  if (!blob && result?.thumbnail) {
    blob = await base64ToBlob(result.thumbnail, declaredMime);
  }
  if (!blob?.size) {
    const error = new Error(
      "Android could not read that image. Please choose another photo.",
    );
    error.code = "ANDROID_IMAGE_UNREADABLE";
    throw error;
  }

  const mimeType = blob.type?.startsWith("image/")
    ? blob.type
    : declaredMime;
  return new File(
    [blob],
    `my-thrift-image-${Date.now()}-${index + 1}.${extensionForMime(mimeType)}`,
    { type: mimeType, lastModified: Date.now() },
  );
};

const normalizePickerError = (error) => {
  if (CAMERA_CANCEL_CODES.has(error?.code)) return null;
  const pickerError = new Error(
    error?.code === "OS-PLUG-CAMR-0007"
      ? "No camera is available on this device. Choose from your gallery instead."
      : error?.message || "The image picker could not be opened.",
    { cause: error },
  );
  pickerError.code = error?.code || "ANDROID_IMAGE_PICKER_FAILED";
  return pickerError;
};

/**
 * Uses Android's camera and Photo Picker, then materializes every returned URI
 * as a normal browser File. This prevents content:// provider URIs from being
 * passed into FileReader, Compressor.js or Firebase Storage.
 */
export const pickAndroidImages = async ({ multiple = false, limit = 1 } = {}) => {
  if (!usesAndroidNativeImagePicker) return null;

  const { index, canceled } = await ActionSheet.showActions({
    title: "Add a photo",
    message: multiple
      ? "Take a new photo or select one or more from your gallery."
      : "Take a new photo or select one from your gallery.",
    cancelable: true,
    options: [
      { title: "Take photo" },
      { title: multiple ? "Choose from gallery" : "Choose photo" },
      { title: "Cancel", style: ActionSheetButtonStyle.Cancel },
    ],
  });
  if (canceled || index < 0 || index === 2) return [];

  try {
    const results =
      index === 0
        ? [
            await Camera.takePhoto({
              // Re-encode camera captures to a mobile-safe byte size without
              // changing their pixel dimensions. Existing per-screen limits
              // and product optimisation still run afterwards.
              quality: 88,
              correctOrientation: true,
              saveToGallery: false,
              includeMetadata: true,
            }),
          ]
        : (
            await Camera.chooseFromGallery({
              mediaType: MediaTypeSelection.Photo,
              allowMultipleSelection: Boolean(multiple),
              limit: multiple ? Math.max(1, Number(limit) || 1) : 1,
              includeMetadata: true,
            })
          ).results;

    return Promise.all(
      results
        .slice(0, multiple ? Math.max(1, Number(limit) || 1) : 1)
        .map(mediaResultToFile),
    );
  } catch (error) {
    const normalized = normalizePickerError(error);
    if (!normalized) return [];
    throw normalized;
  }
};
