import React, { useEffect, useMemo, useRef, useState } from "react";
import { Capacitor, registerPlugin } from "@capacitor/core";
import { FiCheck, FiChevronDown, FiX } from "react-icons/fi";
import AppBottomSheet from "../layout/AppBottomSheet";
import { appHaptics } from "../../services/haptics";

const NativeFormPicker = registerPlugin("NativeFormPicker");

const normalizeOptions = (options = []) => {
  const seen = new Set();
  return options
    .map((option) =>
      typeof option === "string"
        ? {
            label: option,
            value: option,
            group: "",
            detail: "",
            searchTerms: [],
          }
        : {
            label: String(option?.label ?? option?.value ?? "").trim(),
            value: String(option?.value ?? "").trim(),
            group: String(option?.group ?? "").trim(),
            detail: String(option?.detail ?? "").trim(),
            searchTerms: Array.isArray(option?.searchTerms)
              ? option.searchTerms
                  .map(String)
                  .map((term) => term.trim())
                  .filter(Boolean)
              : [],
          }
    )
    .filter((option) => {
      if (!option.label || !option.value || seen.has(option.value)) return false;
      seen.add(option.value);
      return true;
    });
};

export default function NativePickerField({
  id,
  name,
  title,
  value,
  options,
  onChange,
  placeholder = "Select an option",
  multiple = false,
  disabled = false,
  searchable = false,
  autoOpenKey,
  className = "",
  ariaLabel,
  sheetZIndex = 5200,
}) {
  const normalizedOptions = useMemo(() => normalizeOptions(options), [options]);
  const selectedValues = useMemo(
    () =>
      multiple
        ? Array.from(new Set(Array.isArray(value) ? value.map(String) : []))
        : value
        ? [String(value)]
        : [],
    [multiple, value]
  );
  const selectedLabels = selectedValues
    .map(
      (selectedValue) =>
        normalizedOptions.find((option) => option.value === selectedValue)?.label
    )
    .filter(Boolean);

  const [fallbackOpen, setFallbackOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [draftValues, setDraftValues] = useState(selectedValues);
  const isNativeIOS = Capacitor.getPlatform() === "ios";
  const useNativeSheet = isNativeIOS;
  const useInlineSelect = !useNativeSheet && !multiple && !searchable;
  const lastAutoOpenKeyRef = useRef(null);

  const openFallback = () => {
    setDraftValues(selectedValues);
    setSearch("");
    setFallbackOpen(true);
  };

  const openPicker = async () => {
    if (disabled || !normalizedOptions.length) return;
    void appHaptics.selection();

    if (!useNativeSheet) {
      openFallback();
      return;
    }

    try {
      const result = await NativeFormPicker.present({
        title: title || placeholder,
        labels: normalizedOptions.map((option) => option.label),
        values: normalizedOptions.map((option) => option.value),
        groups: normalizedOptions.map((option) => option.group),
        details: normalizedOptions.map((option) => option.detail),
        searchTerms: normalizedOptions.map((option) =>
          option.searchTerms.join("\n"),
        ),
        selectedValues,
        multiple,
      });

      if (result?.cancelled) return;
      const nextValues = Array.isArray(result?.selectedValues)
        ? result.selectedValues.map(String)
        : [];
      onChange?.(multiple ? nextValues : nextValues[0] || "");
    } catch (error) {
      console.warn("[NativeFormPicker] Native picker unavailable; using app sheet.", {
        code: error?.code || "unknown",
      });
      openFallback();
    }
  };

  useEffect(() => {
    if (
      autoOpenKey == null ||
      autoOpenKey === lastAutoOpenKeyRef.current ||
      disabled ||
      !normalizedOptions.length
    ) {
      return;
    }

    lastAutoOpenKeyRef.current = autoOpenKey;
    const timeout = window.setTimeout(() => {
      void openPicker();
    }, 80);
    return () => window.clearTimeout(timeout);
    // The key is the intentional trigger; the other values describe whether
    // the picker is ready when that trigger arrives.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoOpenKey, disabled, normalizedOptions.length]);

  const normalizedSearch = search.trim().toLowerCase();
  const filteredOptions = normalizedOptions.filter((option) => {
    if (!normalizedSearch) return true;
    return [option.label, ...option.searchTerms].some((term) =>
      term.toLowerCase().includes(normalizedSearch),
    );
  });
  const groupedOptions = filteredOptions.reduce((groups, option) => {
    const group = option.group || "";
    const existing = groups.find((entry) => entry.label === group);
    if (existing) existing.options.push(option);
    else groups.push({ label: group, options: [option] });
    return groups;
  }, []);

  const getVisibleDetail = (option) => {
    if (!normalizedSearch) return option.detail;
    const matches = option.searchTerms.filter((term) =>
      term.toLowerCase().includes(normalizedSearch),
    );
    return matches.length ? matches.slice(0, 3).join(" · ") : option.detail;
  };

  const selectFallbackOption = (optionValue) => {
    void appHaptics.selection();
    if (!multiple) {
      onChange?.(optionValue);
      setFallbackOpen(false);
      return;
    }

    setDraftValues((current) =>
      current.includes(optionValue)
        ? current.filter((item) => item !== optionValue)
        : [...current, optionValue]
    );
  };

  if (useInlineSelect) {
    return (
      <div className="relative w-full">
        <select
          id={id}
          name={name}
          value={selectedValues[0] || ""}
          onChange={(event) => {
            void appHaptics.selection();
            onChange?.(event.target.value);
          }}
          disabled={disabled}
          aria-label={ariaLabel || title || placeholder}
          className={`w-full appearance-auto bg-white pr-10 ${className}`}
        >
          <option value="" disabled>
            {placeholder}
          </option>
          {normalizedOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    );
  }

  return (
    <>
      <button
        id={id}
        name={name}
        type="button"
        onClick={openPicker}
        disabled={disabled}
        aria-label={ariaLabel || title || placeholder}
        aria-haspopup="dialog"
        className={`flex w-full items-center justify-between bg-white text-left disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      >
        {selectedLabels.length ? (
          multiple ? (
            <span className="flex min-w-0 flex-1 flex-wrap gap-2">
              {selectedLabels.map((label) => (
                <span
                  key={label}
                  className="rounded-full bg-customOrange px-2 py-1 text-xs text-white"
                >
                  {label}
                </span>
              ))}
            </span>
          ) : (
            <span className="min-w-0 flex-1 truncate text-neutral-800">
              {selectedLabels[0]}
            </span>
          )
        ) : (
          <span className="min-w-0 flex-1 truncate text-neutral-400">
            {placeholder}
          </span>
        )}
        <FiChevronDown className="ml-3 h-4 w-4 shrink-0 text-neutral-400" />
      </button>

      <AppBottomSheet
        open={fallbackOpen}
        onClose={() => setFallbackOpen(false)}
        height={multiple ? "72dvh" : "58dvh"}
        ariaLabel={title || placeholder}
        compactTop
        zIndex={sheetZIndex}
      >
        <div className="flex min-h-0 flex-1 flex-col pt-5 font-opensans">
          <header className="flex items-center justify-between border-b border-gray-100 px-4 pb-3">
            <button
              type="button"
              onClick={() => setFallbackOpen(false)}
              aria-label="Cancel selection"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-gray-800"
            >
              <FiX className="h-5 w-5" />
            </button>
            <h2 className="px-3 text-center text-base font-semibold text-gray-950">
              {title || placeholder}
            </h2>
            {multiple ? (
              <button
                type="button"
                onClick={() => {
                  onChange?.(draftValues);
                  setFallbackOpen(false);
                  void appHaptics.success();
                }}
                className="min-w-9 text-sm font-semibold text-customOrange"
              >
                Done
              </button>
            ) : (
              <span className="h-9 w-9" aria-hidden="true" />
            )}
          </header>

          {normalizedOptions.length > 8 && (
            <div className="px-4 pb-2 pt-3">
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={`Search ${String(title || "options").toLowerCase()}`}
                className="h-11 w-full rounded-xl bg-gray-100 px-4 text-sm text-gray-900 outline-none focus:ring-1 focus:ring-customOrange"
              />
            </div>
          )}

          <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
            {groupedOptions.map((group) => (
              <section key={group.label || "options"}>
                {group.label && (
                  <h3 className="sticky top-0 z-10 bg-white pb-2 pt-4 text-xs font-bold uppercase tracking-[0.08em] text-gray-500">
                    {group.label}
                  </h3>
                )}
                {group.options.map((option) => {
                  const checked = (
                    multiple ? draftValues : selectedValues
                  ).includes(option.value);
                  const detail = getVisibleDetail(option);
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => selectFallbackOption(option.value)}
                      className="flex min-h-14 w-full items-center justify-between gap-3 border-b border-gray-100 py-3 text-left text-[15px] text-gray-900"
                    >
                      <span className="min-w-0">
                        <span className="block font-medium">{option.label}</span>
                        {detail && (
                          <span className="mt-0.5 block truncate text-xs text-gray-500">
                            {detail}
                          </span>
                        )}
                      </span>
                      {checked && (
                        <FiCheck className="h-5 w-5 shrink-0 text-customOrange" />
                      )}
                    </button>
                  );
                })}
              </section>
            ))}
            {!filteredOptions.length && (
              <p className="py-8 text-center text-sm text-gray-500">
                No matching options
              </p>
            )}
          </div>
        </div>
      </AppBottomSheet>
    </>
  );
}
