import React, { forwardRef, useRef } from "react";
import toast from "react-hot-toast";
import { appHaptics } from "../../services/haptics";
import {
  pickAndroidImages,
  usesAndroidNativeImagePicker,
} from "../../services/androidImagePicker";

/**
 * Drop-in image input. Web and iOS retain the existing file input. Android
 * gets an explicit native Camera/Gallery action sheet and receives real File
 * objects, so every existing validator/uploader can continue unchanged.
 */
const NativeImageInput = forwardRef(function NativeImageInput(
  {
    onChange,
    onClick,
    multiple = false,
    nativeMaxFiles,
    disabled = false,
    accept = "image/*",
    ...inputProps
  },
  forwardedRef,
) {
  const pickingRef = useRef(false);

  const chooseAndroidImage = async (event) => {
    onClick?.(event);
    if (event.defaultPrevented || disabled || pickingRef.current) return;

    event.preventDefault();
    event.stopPropagation();
    pickingRef.current = true;
    try {
      const files = await pickAndroidImages({
        multiple,
        limit: nativeMaxFiles || (multiple ? 20 : 1),
      });
      if (!files?.length) return;

      const inputLikeTarget = {
        files,
        value: "",
        id: inputProps.id || "",
        name: inputProps.name || "",
        type: "file",
      };
      await Promise.resolve(
        onChange?.({
          target: inputLikeTarget,
          currentTarget: inputLikeTarget,
          nativeEvent: event.nativeEvent,
          preventDefault() {},
          stopPropagation() {},
        }),
      );
    } catch (error) {
      console.error("[android-image-picker] selection failed", {
        code: error?.code || null,
        message: error?.message || String(error),
      });
      void appHaptics.error();
      toast.error(error?.message || "That image could not be opened.");
    } finally {
      pickingRef.current = false;
    }
  };

  return (
    <input
      {...inputProps}
      ref={forwardedRef}
      type="file"
      accept={accept}
      multiple={multiple}
      disabled={disabled}
      onClick={usesAndroidNativeImagePicker ? chooseAndroidImage : onClick}
      onChange={onChange}
    />
  );
});

export default NativeImageInput;
