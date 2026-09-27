const JOURNEY_STORAGE_KEY = "mythrift:product-journey:v1";
export const PRODUCT_JOURNEY_CHANGE_EVENT = "mythrift:product-journey-change";

const PRODUCT_PATH_RE = /^\/product\/([^/?#]+)/;
const VENDOR_STORE_PATH_RE = /^\/store\/([^/?#]+)/;
const MAX_STORED_ENTRIES = 30;
const MAX_HISTORY_OPTIONS = 8;

const asFiniteNumber = (value) => {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

const currentHistoryIndex = () =>
  asFiniteNumber(window.history?.state?.idx);

const routeFromLocation = (location) =>
  `${location?.pathname || "/"}${location?.search || ""}${
    location?.hash || ""
  }`;

const productIdFromPath = (pathname = "") => {
  const match = String(pathname).match(PRODUCT_PATH_RE);
  return match?.[1] ? decodeURIComponent(match[1]) : null;
};

const isProductPath = (pathname = "") => PRODUCT_PATH_RE.test(pathname);
const isVendorStorePath = (pathname = "") =>
  VENDOR_STORE_PATH_RE.test(pathname);
const isJourneyPath = (pathname = "") =>
  isProductPath(pathname) || isVendorStorePath(pathname);

const vendorIdFromPath = (pathname = "") => {
  const match = String(pathname).match(VENDOR_STORE_PATH_RE);
  return match?.[1] ? decodeURIComponent(match[1]) : null;
};

const cleanLabel = (value, fallback) => {
  const label = String(value || "")
    .replace(/\s+/g, " ")
    .trim();
  return label || fallback;
};

const truncate = (value, max = 54) => {
  const text = cleanLabel(value, "");
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
};

const getQueryLabel = (location) => {
  const params = new URLSearchParams(location?.search || "");
  return params.get("q") || params.get("query") || params.get("search") || "";
};

export const getRouteLabel = (location) => {
  const explicit = location?.state?.mtJourneyLabel;
  if (explicit) return cleanLabel(explicit, "Previous page");

  const path = location?.pathname || "/";
  if (path === "/") return "Home";
  if (path === "/search") {
    const query = getQueryLabel(location);
    return query ? `Search: “${truncate(query, 30)}”` : "Search";
  }
  if (path.startsWith("/store/")) return "Vendor Store";
  if (path === "/favorites") return "Favourites";
  if (path === "/offers" || path.startsWith("/offers/")) return "Offers";
  if (path === "/user-orders") return "Orders";
  if (path === "/notifications") return "Notifications";
  if (path === "/latest-cart") return "Cart";
  if (path === "/explore") return "Categories";
  if (path.startsWith("/producttype/")) return "Product Type";
  if (path.startsWith("/products/condition/")) return "Condition";
  if (path.startsWith("/category/")) return "Category";
  if (path.startsWith("/inapp-discounts/")) return "Discounts";
  return "Previous page";
};

const isValidEntry = (entry) =>
  entry &&
  typeof entry.path === "string" &&
  typeof entry.label === "string" &&
  asFiniteNumber(entry.index) !== null;

const readJourney = () => {
  try {
    const parsed = JSON.parse(sessionStorage.getItem(JOURNEY_STORAGE_KEY));
    if (!isValidEntry(parsed?.origin)) {
      return null;
    }

    // Read the first product-only version so an in-progress journey survives
    // an app update. Every subsequent write uses the discovery-aware schema.
    const entries =
      parsed?.version === 2 && Array.isArray(parsed.entries)
        ? parsed.entries
        : parsed?.version === 1 && Array.isArray(parsed.products)
          ? parsed.products
          : null;
    if (!entries) return null;

    return {
      version: 2,
      origin: parsed.origin,
      entries: entries.filter(isValidEntry).slice(-MAX_STORED_ENTRIES),
    };
  } catch {
    return null;
  }
};

const emitChange = () => {
  window.dispatchEvent(new Event(PRODUCT_JOURNEY_CHANGE_EVENT));
};

const writeJourney = (journey) => {
  try {
    sessionStorage.setItem(JOURNEY_STORAGE_KEY, JSON.stringify(journey));
  } catch {
    // History is an enhancement. Navigation must still work if storage is full
    // or unavailable (for example, a restrictive private-browsing session).
  }
  emitChange();
};

export const clearProductJourney = () => {
  try {
    sessionStorage.removeItem(JOURNEY_STORAGE_KEY);
  } catch {
    // See writeJourney: failure must never block normal navigation.
  }
  emitChange();
};

const makeJourneyEntry = ({ location, index }) => {
  if (isProductPath(location.pathname)) {
    return {
      type: "product",
      id: productIdFromPath(location.pathname),
      path: routeFromLocation(location),
      label: cleanLabel(location.state?.mtProductName, "Previous item"),
      index,
    };
  }

  if (isVendorStorePath(location.pathname)) {
    return {
      type: "store",
      id: vendorIdFromPath(location.pathname),
      path: routeFromLocation(location),
      label: cleanLabel(location.state?.mtVendorName, "Vendor Store"),
      index,
    };
  }

  return null;
};

const makeOriginEntry = ({ location, index }) => ({
  type: "origin",
  path: routeFromLocation(location),
  label: getRouteLabel(location),
  index,
});

/**
 * Observe real React Router transitions without replacing its history stack.
 * A journey starts when a discovery page opens a product or Vendor Store. It
 * remains active while the user moves between products and stores, preserving
 * the original Home/Search/etc. origin through every intermediate route.
 */
export const trackProductJourneyTransition = ({ previous, current }) => {
  const currentIndex = asFiniteNumber(current?.index);
  if (!current?.location || currentIndex === null) return;

  const currentIsJourney = isJourneyPath(current.location.pathname);
  const previousIsJourney = isJourneyPath(
    previous?.location?.pathname || "",
  );

  if (!currentIsJourney) {
    if (previousIsJourney) clearProductJourney();
    return;
  }

  const existing = readJourney();

  // A reload/remount on a product/store route can retain a valid session
  // journey, but a direct deep link must not invent a return destination.
  if (!previous?.location) {
    const currentMatchesStored = existing?.entries?.some(
      (entry) =>
        entry.index === currentIndex &&
        entry.path === routeFromLocation(current.location),
    );
    if (currentMatchesStored) emitChange();
    return;
  }

  const previousIndex = asFiniteNumber(previous.index);
  if (previousIndex === null) return;

  if (!previousIsJourney) {
    // POP into a product/store can be a forward-navigation replay. Only start
    // a new journey for a genuine forward entry so every jump has a real depth.
    if (currentIndex <= previousIndex) return;

    const firstEntry = makeJourneyEntry({
      location: current.location,
      index: currentIndex,
    });
    if (!firstEntry) return;

    writeJourney({
      version: 2,
      origin: makeOriginEntry({
        location: previous.location,
        index: previousIndex,
      }),
      entries: [firstEntry],
    });
    return;
  }

  if (!existing) return;

  const currentPath = routeFromLocation(current.location);
  const existingAtIndex = existing.entries.find(
    (entry) => entry.index === currentIndex,
  );

  if (existingAtIndex?.path === currentPath) {
    emitChange();
    return;
  }

  const currentEntry = makeJourneyEntry({
    location: current.location,
    index: currentIndex,
  });
  if (!currentEntry) return;

  // A new push after going back replaces the browser's forward branch. Mirror
  // that here so the selector never offers a stale, unreachable destination.
  const entries = existing.entries
    .filter((entry) => entry.index < currentIndex)
    .concat(currentEntry)
    .slice(-MAX_STORED_ENTRIES);

  writeJourney({ ...existing, version: 2, entries });
};

const updateCurrentJourneyLabel = ({
  pathname,
  entityId,
  label,
  fallback,
  type,
}) => {
  const index = currentHistoryIndex();
  const journey = readJourney();
  if (index === null || !journey) return;

  const nextLabel = cleanLabel(label, fallback);
  let changed = false;
  const entries = journey.entries.map((entry) => {
    const sameEntry =
      entry.type === type &&
      entry.index === index &&
      (entry.id === String(entityId) || entry.path.startsWith(pathname));
    if (!sameEntry || entry.label === nextLabel) return entry;
    changed = true;
    return { ...entry, id: String(entityId), label: nextLabel };
  });

  if (changed) writeJourney({ ...journey, entries });
};

export const updateCurrentProductJourneyLabel = ({
  pathname,
  productId,
  productName,
}) => {
  updateCurrentJourneyLabel({
    pathname,
    entityId: productId,
    label: productName,
    fallback: "Previous item",
    type: "product",
  });
};

export const updateCurrentVendorJourneyLabel = ({
  pathname,
  vendorId,
  vendorName,
}) => {
  updateCurrentJourneyLabel({
    pathname,
    entityId: vendorId,
    label: vendorName,
    fallback: "Vendor Store",
    type: "store",
  });
};

export const getProductJourneyOptions = ({ pathname } = {}) => {
  const currentIndex = currentHistoryIndex();
  const journey = readJourney();
  if (currentIndex === null || !journey || !isJourneyPath(pathname || "")) {
    return [];
  }

  const earlierEntries = journey.entries
    .filter((entry) => entry.index < currentIndex)
    .sort((a, b) => b.index - a.index)
    .map((entry) => ({
      id: `history:${entry.index}`,
      title: truncate(
        entry.type === "store"
          ? entry.label === "Vendor Store"
            ? entry.label
            : `Store · ${entry.label}`
          : entry.label === "Previous item"
            ? entry.label
            : `Item · ${entry.label}`,
      ),
      index: entry.index,
      path: entry.path,
      type: entry.type,
    }));

  const originIsReachable = journey.origin.index < currentIndex;
  const originOption = originIsReachable
    ? {
        id: `history:${journey.origin.index}`,
        title: truncate(`Back to ${journey.origin.label} · Start`),
        index: journey.origin.index,
        path: journey.origin.path,
        type: "origin",
      }
    : null;

  const slotsForEntries = originOption
    ? MAX_HISTORY_OPTIONS - 1
    : MAX_HISTORY_OPTIONS;
  const options = earlierEntries.slice(0, slotsForEntries);
  if (originOption) options.push(originOption);

  // A replace-state update can produce duplicates at one history index. Keep
  // the first (nearest) option only.
  return options.filter(
    (option, position, all) =>
      all.findIndex((candidate) => candidate.index === option.index) === position,
  );
};

export const getProductJourneyDepth = (option) => {
  const currentIndex = currentHistoryIndex();
  const targetIndex = asFiniteNumber(option?.index);
  if (currentIndex === null || targetIndex === null) return null;
  const depth = currentIndex - targetIndex;
  return depth > 0 ? depth : null;
};

export const productJourneyInternals = {
  isProductPath,
  isVendorStorePath,
  isJourneyPath,
  routeFromLocation,
  currentHistoryIndex,
};
