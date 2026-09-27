import React from "react";
import AppBackButton from "./AppBackButton";
import "./app-navigation.css";

const joinClasses = (...values) => values.filter(Boolean).join(" ");

export default function AppPageHeader({
  title,
  onBack,
  backLabel = "Go back",
  alignment = "center",
  rightAction = null,
  showBack = true,
  sticky = true,
  className = "",
  children = null,
}) {
  return (
    <header
      className={joinClasses(
        "app-page-header",
        `app-page-header--${alignment}`,
        sticky && "is-sticky",
        className
      )}
    >
      <div className="app-page-header__row">
        {showBack ? (
          <AppBackButton onClick={onBack} label={backLabel} />
        ) : (
          <span className="app-page-header__placeholder" aria-hidden="true" />
        )}
        <h1>{title}</h1>
        <div className="app-page-header__action">
          {rightAction || <span aria-hidden="true" />}
        </div>
      </div>
      {children}
    </header>
  );
}
