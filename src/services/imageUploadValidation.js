const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

const decodeImage = (file) =>
  new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve({ width: image.naturalWidth, height: image.naturalHeight });
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("The selected file is not a readable image."));
    };
    image.src = objectUrl;
  });

export const validateVendorImage = async (
  file,
  { label = "image", maxBytes = 3 * 1024 * 1024 } = {}
) => {
  if (!file) throw new Error(`Choose a ${label} to continue.`);
  if (!ALLOWED_IMAGE_TYPES.has(String(file.type).toLowerCase())) {
    throw new Error("Use a JPG, PNG or WebP image.");
  }
  if (file.size <= 0 || file.size > maxBytes) {
    throw new Error("The image must be no larger than 3MB.");
  }
  const dimensions = await decodeImage(file);
  if (!dimensions.width || !dimensions.height) {
    throw new Error("The selected file is not a readable image.");
  }
  if (dimensions.width > 12000 || dimensions.height > 12000) {
    throw new Error("The image dimensions are too large. Choose a smaller image.");
  }
  return dimensions;
};
