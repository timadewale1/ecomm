import { App as CapacitorApp } from "@capacitor/app";
import { Browser } from "@capacitor/browser";
import { Share } from "@capacitor/share";
import { isNativeApp } from "./platform";
import { getAppPath } from "../config/siteUrls.mjs";

export const getInternalPath = getAppPath;

export const openExternalUrl = async (url) => {
  const href = String(url || "").trim();
  if (!href) return false;

  if (!isNativeApp) {
    window.open(href, "_blank", "noopener,noreferrer");
    return true;
  }

  if (/^(mailto|tel|sms):/i.test(href)) {
    window.location.href = href;
    return true;
  }

  if (!/^https?:/i.test(href)) {
    throw new Error(`Unsupported external URL: ${href}`);
  }

  await Browser.open({
    url: href,
    presentationStyle: "fullscreen",
  });
  return true;
};

export const openUrl = async (url, { navigate, replace = false } = {}) => {
  const internalPath = getInternalPath(url);

  if (internalPath) {
    if (typeof navigate === "function") {
      navigate(internalPath, { replace });
    } else if (replace) {
      window.location.replace(internalPath);
    } else {
      window.location.assign(internalPath);
    }
    return "internal";
  }

  await openExternalUrl(url);
  return "external";
};

export const isShareCancellation = (error) => {
  const name = String(error?.name || "").toLowerCase();
  const code = String(error?.code || "").toLowerCase();
  const message = String(error?.message || error || "").toLowerCase();

  return (
    name === "aborterror" ||
    code.includes("cancel") ||
    code.includes("dismiss") ||
    /\b(cancelled|canceled|cancel|dismissed|user abort)\b/.test(message)
  );
};

export const shareContent = async ({ title, text, url }) => {
  try {
    if (isNativeApp) {
      await Share.share({ title, text, url, dialogTitle: title });
      return "shared";
    }

    if (navigator.share) {
      await navigator.share({ title, text, url });
      return "shared";
    }

    await navigator.clipboard.writeText(text || url);
    return "copied";
  } catch (error) {
    // Closing the native/web share sheet is a normal user action. Normalize it
    // here so every product, store and payment-link surface behaves the same.
    if (isShareCancellation(error)) return "cancelled";
    throw error;
  }
};

export const installNativeLinkHandling = ({ navigate }) => {
  if (!isNativeApp) return () => {};

  let urlOpenHandle;
  let disposed = false;

  const routeIncomingUrl = (url) => {
    const path = getInternalPath(url);
    if (!path) return;

    // A payment or other web flow may have returned through a Universal Link.
    // Closing is harmless when no Capacitor Browser is currently presented.
    void Browser.close().catch(() => {});
    navigate(path);
  };

  const onDocumentClick = (event) => {
    const anchor = event.target?.closest?.("a[href]");
    if (!anchor || event.defaultPrevented) return;
    if (anchor.hasAttribute("download")) return;

    const href = anchor.href;
    if (!href) return;

    const internalPath = getInternalPath(href);
    if (internalPath) {
      event.preventDefault();
      navigate(internalPath);
      return;
    }

    if (!/^(https?:|mailto:|tel:|sms:)/i.test(href)) return;

    event.preventDefault();
    void openExternalUrl(href);
  };

  document.addEventListener("click", onDocumentClick);

  void CapacitorApp.addListener("appUrlOpen", ({ url }) => {
    routeIncomingUrl(url);
  }).then((handle) => {
    if (disposed) handle.remove();
    else urlOpenHandle = handle;
  });

  void CapacitorApp.getLaunchUrl().then((result) => {
    if (!disposed && result?.url) routeIncomingUrl(result.url);
  });

  return () => {
    disposed = true;
    document.removeEventListener("click", onDocumentClick);
    urlOpenHandle?.remove();
  };
};
