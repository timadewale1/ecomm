const NON_TEXT_INPUTS = new Set([
  "button", "checkbox", "color", "file", "hidden", "image", "radio", "range", "reset", "submit",
]);

function isEditable(element, win) {
  return element instanceof win.HTMLElement && !element.disabled && !element.readOnly && (
    (element instanceof win.HTMLInputElement && !NON_TEXT_INPUTS.has(element.type)) ||
    element instanceof win.HTMLTextAreaElement || element.isContentEditable
  );
}

/** Minimal scrolling, using the already-resized viewport (no second keyboard inset). */
export function revealFocusedField(win, doc) {
  const field = doc.activeElement;
  if (!isEditable(field, win) || !field.isConnected || !field.getClientRects().length) return;

  const viewport = win.visualViewport;
  const viewportTop = viewport?.offsetTop || 0;
  const viewportBottom = viewportTop + (viewport?.height || win.innerHeight);
  const sheet = field.closest("[data-app-bottom-sheet]");
  const sheetRect = sheet?.getBoundingClientRect();
  const root = doc.scrollingElement;
  const scrollers = [];

  // Scroll the actual form/list. Never move the background page behind a sheet.
  for (let parent = field.parentElement; parent; parent = parent.parentElement) {
    const overflow = win.getComputedStyle(parent).overflowY;
    if (parent !== root && /^(auto|scroll|overlay)$/.test(overflow) && parent.scrollHeight > parent.clientHeight) {
      scrollers.push(parent);
    }
    if (parent === sheet) break;
  }
  if (!sheet && root && ![doc.body, doc.documentElement].some(
    (element) => /^(hidden|clip)$/.test(win.getComputedStyle(element).overflowY),
  )) scrollers.push(root);

  for (const scroller of scrollers) {
    const bounds = scroller === root
      ? { top: viewportTop, bottom: viewportBottom }
      : scroller.getBoundingClientRect();
    const top = Math.max(viewportTop, bounds.top, sheetRect?.top ?? -Infinity) + 16;
    const bottom = Math.min(viewportBottom, bounds.bottom, sheetRect?.bottom ?? Infinity) - 24;
    const rect = field.getBoundingClientRect();
    if (bottom <= top || (rect.top >= top && rect.bottom <= bottom)) continue;
    // A tall textarea cannot fit entirely; don't oscillate between its edges.
    if (rect.height > bottom - top && rect.top <= top && rect.bottom >= bottom) continue;
    const delta = rect.bottom > bottom ? rect.bottom - bottom : rect.top - top;
    scroller.scrollBy({ top: delta, left: 0, behavior: "instant" });
  }
}

/** One iOS focus coordinator, driven by layout/events rather than fixed delays. */
export function installIOSKeyboardViewport({ keyboard, win = window, doc = document }) {
  let disposed = false;
  let keyboardOpen = false;
  let frame = null;
  const handles = [];
  const viewport = win.visualViewport;

  const cancelFrame = () => {
    if (frame !== null) win.cancelAnimationFrame(frame);
    frame = null;
  };
  const scheduleReveal = () => {
    if (disposed || !keyboardOpen || frame !== null) return;
    frame = win.requestAnimationFrame(() => {
      frame = null;
      if (!disposed && keyboardOpen) revealFocusedField(win, doc);
    });
  };
  const show = () => {
    if (disposed) return;
    keyboardOpen = true;
    doc.body.classList.add("native-keyboard-open");
    scheduleReveal();
  };
  const hide = () => {
    if (disposed) return;
    keyboardOpen = false;
    cancelFrame();
    doc.body.classList.remove("native-keyboard-open");
  };

  for (const [name, listener] of [
    ["keyboardWillShow", show],
    ["keyboardDidShow", scheduleReveal], // Final geometry check, not a second animation.
    ["keyboardWillHide", hide],
    ["keyboardDidHide", hide],
  ]) {
    Promise.resolve(keyboard.addListener(name, listener)).then((handle) => {
      if (disposed) return handle.remove();
      handles.push(handle);
    }).catch((error) => {
      if (!disposed) console.warn("[ios-keyboard] listener unavailable:", error);
    });
  }
  viewport?.addEventListener("resize", scheduleReveal);
  // Do not subscribe to viewport scroll: scrolling to read must not snap back
  // to the focused field. Focus changes and size changes are sufficient.
  win.addEventListener("resize", scheduleReveal);
  doc.addEventListener("focusin", scheduleReveal);

  return () => {
    hide();
    disposed = true;
    viewport?.removeEventListener("resize", scheduleReveal);
    win.removeEventListener("resize", scheduleReveal);
    doc.removeEventListener("focusin", scheduleReveal);
    handles.forEach((handle) => { void handle.remove(); });
  };
}
