// src/components/vendor/VendorTutorials.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import Hls from "hls.js";
import { useDispatch, useSelector } from "react-redux";
import { fetchVendorTutorials,  setScrollX, } from "../../redux/reducers/vendortutorialSlice";
// --------------------- simple in-view hook ---------------------
function useInView(threshold = 0.35) {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      { threshold }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [threshold]);
  return [ref, inView];
}

// ------------------------------ card ------------------------------
function TutorialCard({ t }) {
  const [ref, inView] = useInView();
  const [useMp4Fallback, setUseMp4Fallback] = useState(!t?.hlsUrl);
  const videoRef = useRef(null);
  const lastSavedRef = useRef(0);
  const progressKey = `tutorialProgress:${t.id}`;

  const svgFallback =
    `data:image/svg+xml;utf8,` +
    encodeURIComponent(`
      <svg xmlns='http://www.w3.org/2000/svg' width='800' height='450'>
        <defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>
          <stop stop-color='#f97316' offset='0'/><stop stop-color='#f59e0b' offset='1'/>
        </linearGradient></defs>
        <rect fill='url(#g)' width='100%' height='100%'/>
        <text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle'
              fill='white' font-size='36' font-family='Satoshi, Arial, sans-serif' opacity='0.9'>
          ${(t.title || "Tutorial").slice(0, 34)}
        </text>
      </svg>`);

  // Do not copy remote posters into localStorage. Browser/native HTTP caching
  // already handles them and avoids filling the app's small preference store.
  const poster = t.posterURL || svgFallback;
  const shouldMountSources = inView;

  const sources = useMemo(() => {
    const list = [];
    if (t.mp4_480) list.push({ src: t.mp4_480, type: "video/mp4" });
    if (t.mp4_720) list.push({ src: t.mp4_720, type: "video/mp4" });
    if (!t.mp4_480 && !t.mp4_720 && t.downloadURL) {
      list.push({ src: t.downloadURL, type: "video/mp4" });
    }
    return list;
  }, [t]);

  useEffect(() => {
    if (!shouldMountSources || !t.hlsUrl) return;
    const video = videoRef.current;
    if (!video) return;

    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = t.hlsUrl;
      setUseMp4Fallback(false);
      return;
    }

    if (Hls.isSupported()) {
      const hls = new Hls({ lowLatencyMode: true });
      hls.loadSource(t.hlsUrl);
      hls.attachMedia(video);
      setUseMp4Fallback(false);
      return () => hls.destroy();
    }

    setUseMp4Fallback(true);
  }, [shouldMountSources, t.hlsUrl]);

  useEffect(() => {
    if (!shouldMountSources) return;
    const v = videoRef.current;
    if (!v) return;

    const onLoadedMetadata = () => {
      const raw = localStorage.getItem(progressKey);
      const saved = raw ? parseFloat(raw) : NaN;
      if (!isNaN(saved) && saved > 0 && isFinite(saved)) {
        const target = Math.min(saved, Math.max(0, (v.duration || saved) - 1));
        try {
          v.currentTime = target;
        } catch {}
      }
    };
    v.addEventListener("loadedmetadata", onLoadedMetadata);
    return () => v.removeEventListener("loadedmetadata", onLoadedMetadata);
  }, [shouldMountSources, progressKey]);

  useEffect(() => {
    if (!shouldMountSources) return;
    const v = videoRef.current;
    if (!v) return;
    const SAVE_EVERY_SEC = 5;

    const saveNow = () => {
      try {
        localStorage.setItem(
          progressKey,
          String(Math.floor(v.currentTime || 0))
        );
      } catch {}
    };

    const onTimeUpdate = () => {
      const now = v.currentTime || 0;
      if (now - lastSavedRef.current >= SAVE_EVERY_SEC) {
        lastSavedRef.current = now;
        saveNow();
      }
    };

    const onPause = saveNow;
    const onEnded = () => {
      try {
        localStorage.removeItem(progressKey);
      } catch {}
    };

    v.addEventListener("timeupdate", onTimeUpdate);
    v.addEventListener("pause", onPause);
    v.addEventListener("ended", onEnded);

    const emergencySave = () => saveNow();
    window.addEventListener("pagehide", emergencySave);
    window.addEventListener("beforeunload", emergencySave);
    const onVis = () => document.hidden && emergencySave();
    document.addEventListener("visibilitychange", onVis);

    return () => {
      v.removeEventListener("timeupdate", onTimeUpdate);
      v.removeEventListener("pause", onPause);
      v.removeEventListener("ended", onEnded);
      window.removeEventListener("pagehide", emergencySave);
      window.removeEventListener("beforeunload", emergencySave);
      document.removeEventListener("visibilitychange", onVis);
      emergencySave();
    };
  }, [shouldMountSources, progressKey]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (!inView && !v.paused) v.pause();
  }, [inView]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const eventName = "mythrift:tutorial-play";
    const stopForAnotherVideo = (event) => {
      if (event.detail !== t.id && !v.paused) v.pause();
    };
    const announcePlayback = () => window.dispatchEvent(
      new CustomEvent(eventName, {detail: t.id}),
    );
    window.addEventListener(eventName, stopForAnotherVideo);
    v.addEventListener("play", announcePlayback);
    return () => {
      window.removeEventListener(eventName, stopForAnotherVideo);
      v.removeEventListener("play", announcePlayback);
    };
  }, [t.id]);

  const showMp4Sources = shouldMountSources && (useMp4Fallback || !t.hlsUrl);

  return (
    <div
      ref={ref}
      className="
        relative shrink-0 snap-start
        min-w-[45vw] max-w-[48vw] h-[56vw]
        md:min-w-[32vw] md:max-w-[34vw] md:h-[28vw]
        lg:min-w-[28vw] lg:max-w-[30vw] lg:h-[24vw]
        rounded-2xl overflow-hidden shadow-sm bg-black/5 border border-black/10
      "
    >
      <video
        ref={videoRef}
        className="w-full h-full object-cover"
        poster={poster}
        preload={shouldMountSources ? "metadata" : "none"}
        playsInline
        controls
        muted={false}
        controlsList="nodownload"
        aria-label={t.title ? `Tutorial: ${t.title}` : "Vendor tutorial"}
      >
        {showMp4Sources &&
          sources.map((s, i) => <source key={i} src={s.src} type={s.type} />)}
        {(t.captionsUrl || t.subtitleURL) && (
          <track
            kind="captions"
            src={t.captionsUrl || t.subtitleURL}
            srcLang={t.captionLanguage || "en"}
            label={t.captionLabel || "English"}
          />
        )}
      </video>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/60 to-transparent" />
      <div className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2">
        <span className="px-3 py-1 rounded-full bg-black/70 text-white text-[11px] md:text-xs font-medium line-clamp-1">
          {t.title}
        </span>
      </div>
    </div>
  );
}

// --------------------------- container ---------------------------
export default function VendorTutorials() {
  const dispatch = useDispatch();
  const { items, status, scrollX } = useSelector((s) => s.vendorTutorials);
  const loading =
    (status === "idle" || status === "loading") && items.length === 0;

  // Fetch once (will skip if cache is fresh due to 'condition' in thunk)
  useEffect(() => {
    dispatch(fetchVendorTutorials());
  }, [dispatch]);

  // Remember horizontal scroll position
  const scrollerRef = useRef(null);
  useEffect(() => {
    const el = scrollerRef.current;
    if (el && typeof scrollX === "number") {
      el.scrollLeft = scrollX;
    }
  }, [scrollX]);

  // Throttle with rAF to keep UI smooth
  const rafRef = useRef();
  const onScroll = () => {
    if (!scrollerRef.current) return;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      dispatch(setScrollX(scrollerRef.current.scrollLeft));
    });
  };
  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

  return (
    <section>
      <h2 className="font-satoshi font-semibold text-base md:text-lg mb-3">
        Vendor Tutorials
      </h2>

      {loading && (
        <div className="flex gap-3 overflow-hidden">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="
                min-w-[45vw] max-w-[48vw] h-[56vw]
                md:min-w-[32vw] md:max-w-[34vw] md:h-[28vw]
                lg:min-w-[28vw] lg:max-w-[30vw] lg:h-[24vw]
                rounded-2xl bg-gray-200 animate-pulse
              "
            />
          ))}
        </div>
      )}

      {!loading && (
        <div
          ref={scrollerRef}
          onScroll={onScroll}
          className="
            flex gap-3 overflow-x-auto  snap-x snap-mandatory
            [-webkit-overflow-scrolling:touch]
          "
        >
          {items.map((t) => (
            <TutorialCard key={t.id} t={t} />
          ))}
        </div>
      )}
    </section>
  );
}
