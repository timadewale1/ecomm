import React from "react";
import { Oval } from "react-loader-spinner";
import "./GlassShimmer.css";

export default function NotificationPermissionBanner({ onEnable, loading }) {
  return (
    <div className="px-2">
      <div
        className="glass-card relative w-full flex flex-col items-center justify-center
        bg-neutral-500/20 backdrop-blur-xl border border-white/10
        rounded-2xl mt-2
        py-3 px-2 overflow-hidden"
      >
        <p className="text-sm text-center font-semibold font-opensans text-white z-10">
          🔔 Stay in the loop — enable push notifications to get real-time
          updates, offers, and alerts!
          <br />
          <span className="text-xs font-normal mt-2 block">
            Seeing this more than once?{" "}
            <a
              href="https://mythrift.tawk.help/article/why-you-might-see-the-push-notification-prompt-more-than-once"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 hover:text-orange-300 transition"
            >
              Here’s why
            </a>
            .
          </span>
        </p>

        <button
          onClick={onEnable}
          disabled={loading}
          className="mt-4 z-10 flex w-52  items-center gap-2 text-xs justify-center font-opensans 
          text-white bg-white/10 border border-white/20
          backdrop-blur-md  py-1.5  rounded-md hover:bg-white/20
          transition-all duration-200 disabled:opacity-60 shadow"
        >
          {loading ? (
            <Oval
              height={18}
              width={18}
              strokeWidth={4}
              color="#ffffff"
              secondaryColor="#f9531e"
            />
          ) : (
            "Tap to enable push notifications"
          )}
        </button>
      </div>
    </div>
  );
}
