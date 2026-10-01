import {
  Haptics,
  ImpactStyle,
  NotificationType,
} from "@capacitor/haptics";
import { isNativeApp } from "./platform";

const runNativeHaptic = (operation) => {
  if (!isNativeApp) return Promise.resolve();
  return operation().catch(() => {});
};

export const appHaptics = {
  light: () =>
    runNativeHaptic(() => Haptics.impact({ style: ImpactStyle.Light })),
  medium: () =>
    runNativeHaptic(() => Haptics.impact({ style: ImpactStyle.Medium })),
  strong: () =>
    runNativeHaptic(() => Haptics.impact({ style: ImpactStyle.Heavy })),
  favorite: (isNowFavorite = true) =>
    runNativeHaptic(() =>
      isNowFavorite
        ? Haptics.impact({ style: ImpactStyle.Light })
        : Haptics.selectionChanged(),
    ),
  addToCart: () =>
    runNativeHaptic(() => Haptics.impact({ style: ImpactStyle.Medium })),
  removeFromCart: () =>
    runNativeHaptic(() => Haptics.impact({ style: ImpactStyle.Light })),
  selection: () =>
    runNativeHaptic(async () => {
      // Capacitor 5's iOS plugin only creates its
      // UISelectionFeedbackGenerator in selectionStart(). Calling
      // selectionChanged() alone is therefore a silent no-op on iOS.
      await Haptics.selectionStart();
      try {
        await Haptics.selectionChanged();
      } finally {
        await Haptics.selectionEnd();
      }
    }),
  success: () =>
    runNativeHaptic(() =>
      Haptics.notification({ type: NotificationType.Success }),
    ),
  warning: () =>
    runNativeHaptic(() =>
      Haptics.notification({ type: NotificationType.Warning }),
    ),
  error: () =>
    runNativeHaptic(() =>
      Haptics.notification({ type: NotificationType.Error }),
    ),
};
