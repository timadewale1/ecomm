// helpers/tawk.js
export const loadTawk = (src, onReady) => {
  if (window.tawkLoaded) return onReady?.(); // don’t double-inject
  window.tawkLoaded = true;

  window.Tawk_API = window.Tawk_API || {};
  window.Tawk_LoadStart = new Date();

  const s1 = document.createElement("script");
  s1.async = true;
  s1.src = src;
  s1.charset = "UTF-8";
  s1.setAttribute("crossorigin", "*");
  s1.onload = () => {
    window.Tawk_API.hideWidget();  // hide default launcher
    onReady?.();
  };
  document.head.appendChild(s1);
};
