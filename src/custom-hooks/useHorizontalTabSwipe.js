import { useSwipeable } from "react-swipeable";

const DEFAULT_EDGE_EXCLUSION = 28;
const DEFAULT_IGNORE_SELECTOR = [
  "input",
  "textarea",
  "select",
  '[contenteditable="true"]',
  '[role="slider"]',
  "[data-tab-swipe-ignore]",
  ".swiper",
  ".checkout-pile-strip",
  ".order-card-products",
].join(",");

const shouldIgnoreTarget = (target, selector) =>
  target instanceof Element && Boolean(target.closest(selector));

/**
 * Adds an optional horizontal gesture to an existing tab controller. Buttons
 * remain the source of truth; this hook only chooses the adjacent tab.
 */
export default function useHorizontalTabSwipe({
  tabs,
  activeTab,
  onChange,
  enabled = true,
  edgeExclusion = DEFAULT_EDGE_EXCLUSION,
  ignoreSelector = DEFAULT_IGNORE_SELECTOR,
}) {
  const changeByDirection = (direction, swipe) => {
    if (!enabled || !Array.isArray(tabs) || tabs.length < 2) return;
    if (swipe.absX < 44 || swipe.absX < swipe.absY * 1.35) return;

    const viewportWidth = window.innerWidth || 0;
    const startX = Number(swipe.initial?.[0] || 0);
    if (
      startX <= edgeExclusion ||
      (viewportWidth > 0 && startX >= viewportWidth - edgeExclusion)
    ) {
      return;
    }

    if (shouldIgnoreTarget(swipe.event?.target, ignoreSelector)) return;

    const currentIndex = tabs.indexOf(activeTab);
    if (currentIndex < 0) return;

    const nextIndex = direction === "left" ? currentIndex + 1 : currentIndex - 1;
    if (nextIndex < 0 || nextIndex >= tabs.length) return;

    onChange?.(tabs[nextIndex], {
      source: "swipe",
      direction,
    });
  };

  return useSwipeable({
    onSwipedLeft: (swipe) => changeByDirection("left", swipe),
    onSwipedRight: (swipe) => changeByDirection("right", swipe),
    delta: 36,
    swipeDuration: 650,
    preventScrollOnSwipe: false,
    trackMouse: false,
    trackTouch: true,
    touchEventOptions: { passive: true },
  });
}
