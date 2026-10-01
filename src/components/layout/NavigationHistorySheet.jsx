import React from "react";
import { ArrowLeft, Home, Store, X } from "lucide-react";
import AppBottomSheet from "./AppBottomSheet";
import "./navigation-history.css";

export default function NavigationHistorySheet({
  open,
  options,
  onClose,
  onSelect,
}) {
  return (
    <AppBottomSheet
      open={open}
      onClose={onClose}
      height="min(62dvh, 520px)"
      ariaLabel="Browsing history"
      surfaceClassName="navigation-history-sheet"
    >
      <header className="navigation-history-sheet__header">
        <div>
          <h2>Browsing history</h2>
          <p>Choose where you want to return.</p>
        </div>
        <button type="button" onClick={onClose} aria-label="Close browsing history">
          <X aria-hidden="true" />
        </button>
      </header>

      <div className="navigation-history-sheet__options">
        {options.map((option) => {
          const Icon =
            option.type === "origin"
              ? Home
              : option.type === "store"
                ? Store
                : ArrowLeft;
          return (
            <button
              key={option.id}
              type="button"
              className={
                option.type === "origin"
                  ? "navigation-history-sheet__option is-origin"
                  : "navigation-history-sheet__option"
              }
              onClick={() => onSelect(option)}
            >
              <span className="navigation-history-sheet__icon">
                <Icon aria-hidden="true" />
              </span>
              <span>{option.title}</span>
            </button>
          );
        })}
      </div>
    </AppBottomSheet>
  );
}
