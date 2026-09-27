const activeLocks = new Map();

let nextLockId = 0;
let baselineStyles = null;
let frozenScrollPosition = null;

const canUseDom = () =>
  typeof document !== "undefined" &&
  Boolean(document.body) &&
  Boolean(document.documentElement);

const captureBaselineStyles = () => ({
  body: {
    overflow: document.body.style.overflow,
    touchAction: document.body.style.touchAction,
    position: document.body.style.position,
    top: document.body.style.top,
    right: document.body.style.right,
    left: document.body.style.left,
    width: document.body.style.width,
  },
  root: {
    overflow: document.documentElement.style.overflow,
    overscrollBehavior: document.documentElement.style.overscrollBehavior,
  },
});

const restoreFrozenBodyStyles = () => {
  if (!baselineStyles) return;

  document.body.style.position = baselineStyles.body.position;
  document.body.style.top = baselineStyles.body.top;
  document.body.style.right = baselineStyles.body.right;
  document.body.style.left = baselineStyles.body.left;
  document.body.style.width = baselineStyles.body.width;
};

const restoreScrollPosition = (scrollPosition) => {
  if (scrollPosition == null || typeof window === "undefined") return;

  window.requestAnimationFrame(() => {
    window.scrollTo({ top: scrollPosition, left: 0, behavior: "auto" });
  });
};

const updateDebugAttributes = () => {
  if (!canUseDom()) return;

  if (activeLocks.size === 0) {
    delete document.documentElement.dataset.appScrollLockCount;
    delete document.documentElement.dataset.appScrollLockOwners;
    return;
  }

  const owners = [...activeLocks.values()]
    .map(({ owner }) => owner)
    .filter(Boolean)
    .join(",")
    .slice(0, 240);

  document.documentElement.dataset.appScrollLockCount = String(activeLocks.size);
  document.documentElement.dataset.appScrollLockOwners = owners;
};

const applyActiveLocks = () => {
  if (!canUseDom()) return;

  if (activeLocks.size === 0) {
    if (!baselineStyles) {
      updateDebugAttributes();
      return;
    }

    const scrollPosition = frozenScrollPosition;

    document.body.style.overflow = baselineStyles.body.overflow;
    document.body.style.touchAction = baselineStyles.body.touchAction;
    restoreFrozenBodyStyles();
    document.documentElement.style.overflow = baselineStyles.root.overflow;
    document.documentElement.style.overscrollBehavior =
      baselineStyles.root.overscrollBehavior;

    baselineStyles = null;
    frozenScrollPosition = null;
    updateDebugAttributes();
    restoreScrollPosition(scrollPosition);
    return;
  }

  if (!baselineStyles) {
    baselineStyles = captureBaselineStyles();
  }

  const locks = [...activeLocks.values()];
  const shouldBlockTouch = locks.some(({ blockTouch }) => blockTouch);
  const shouldFreezePosition = locks.some(
    ({ freezePosition }) => freezePosition,
  );

  document.body.style.overflow = "hidden";
  document.documentElement.style.overflow = "hidden";
  document.documentElement.style.overscrollBehavior = "none";
  document.body.style.touchAction = shouldBlockTouch
    ? "none"
    : baselineStyles.body.touchAction;

  if (shouldFreezePosition) {
    if (frozenScrollPosition == null) {
      frozenScrollPosition =
        typeof window === "undefined" ? 0 : window.scrollY || 0;
    }

    document.body.style.position = "fixed";
    document.body.style.top = `-${frozenScrollPosition}px`;
    document.body.style.right = "0";
    document.body.style.left = "0";
    document.body.style.width = "100%";
  } else if (frozenScrollPosition != null) {
    const scrollPosition = frozenScrollPosition;
    frozenScrollPosition = null;
    restoreFrozenBodyStyles();
    restoreScrollPosition(scrollPosition);
  }

  updateDebugAttributes();
};

/**
 * Acquires a global document scroll lock and returns an idempotent release
 * function. Locks are token based, so overlapping sheets can close in any
 * order without restoring another sheet's locked state.
 */
export const acquireScrollLock = (
  owner = "unknown",
  { blockTouch = false, freezePosition = false } = {},
) => {
  if (!canUseDom()) return () => {};

  const token = `app-scroll-lock-${++nextLockId}`;
  activeLocks.set(token, {
    owner: String(owner || "unknown"),
    blockTouch: Boolean(blockTouch),
    freezePosition: Boolean(freezePosition),
  });
  applyActiveLocks();

  let released = false;
  return () => {
    if (released) return;
    released = true;
    activeLocks.delete(token);
    applyActiveLocks();
  };
};

export const reconcileScrollLocks = () => {
  applyActiveLocks();
};

export const getScrollLockState = () => ({
  count: activeLocks.size,
  owners: [...activeLocks.values()].map(({ owner }) => owner),
});
