import React, { useEffect, useMemo, useRef, useState } from "react";
import { Check, Info, LoaderCircle } from "lucide-react";
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";
import { toast } from "react-hot-toast";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import AppPageHeader from "../../components/layout/AppPageHeader";
import SEO from "../../components/Helmet/SEO";
import { MY_SIZES_V1_OPTIONS } from "../../config/sizingV1";
import { useAuth } from "../../custom-hooks/useAuth";
import {
  fetchMySizes,
  persistMySizes,
  selectMySizesState,
} from "../../redux/reducers/mySizesSlice";
import { appHaptics } from "../../services/haptics";
import {
  createEmptyMySizesProfiles,
  getMySizesErrorMessage,
  normalizeMySizesProfiles,
} from "../../services/mySizes";
import "./my-sizes.css";

const SIZE_SECTIONS = Object.freeze([
  {
    key: "footwear",
    title: "Footwear",
    description: "Choose the EU shoe sizes you usually wear.",
    systemLabel: "EU",
    options: MY_SIZES_V1_OPTIONS.footwear,
  },
  {
    key: "upperBody",
    title: "Tops & outerwear",
    description: "For tops, shirts, jackets, hoodies and sweaters.",
    systemLabel: "International",
    options: MY_SIZES_V1_OPTIONS.upperBody,
  },
  {
    key: "wholeBody",
    title: "Dresses & one-piece",
    description: "Choose the EU apparel sizes you usually wear.",
    systemLabel: "EU",
    options: MY_SIZES_V1_OPTIONS.wholeBody,
  },
  {
    key: "lowerBody",
    title: "Bottoms",
    description: "For skirts, trousers, shorts and similar EU-sized items.",
    systemLabel: "EU",
    options: MY_SIZES_V1_OPTIONS.lowerBody,
  },
  {
    key: "jeans",
    title: "Jeans",
    description: "Choose your usual waist and inseam in inches.",
    systemLabel: "W / L",
    options: MY_SIZES_V1_OPTIONS.jeans,
    selectionMode: "waistInseam",
  },
]);

const JEANS_WAISTS = Object.freeze(
  Array.from({ length: 21 }, (_, index) => String(24 + index)),
);
const JEANS_INSEAMS = Object.freeze(["28", "30", "32", "34", "36"]);

const cloneProfiles = (profiles) =>
  normalizeMySizesProfiles(
    JSON.parse(JSON.stringify(profiles || createEmptyMySizesProfiles())),
  );

const profilesFingerprint = (profiles) =>
  JSON.stringify(normalizeMySizesProfiles(profiles));

const MY_SIZES_DRAFT_VERSION = 2;
const MY_SIZES_CACHE_TTL_MS = 5 * 60 * 1000;
const draftStorageKey = (uid) => `mythrift:my-sizes-draft:v2:${uid}`;
const legacyDraftStorageKey = (uid) => `mythrift:my-sizes-draft:v1:${uid}`;

const readStoredDraft = (uid) => {
  if (!uid) return null;
  try {
    const storage = window.sessionStorage;
    if (!storage) return null;

    // V1 drafts did not record which server state they were based on. Some
    // empty V1 drafts were created by the old hydration race, so they cannot
    // safely override Firestore after an app rebuild.
    storage.removeItem(legacyDraftStorageKey(uid));

    const key = draftStorageKey(uid);
    const raw = storage.getItem(key);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (
      parsed?.version !== MY_SIZES_DRAFT_VERSION ||
      parsed?.ownerUid !== uid ||
      typeof parsed?.baseFingerprint !== "string" ||
      !parsed?.profiles ||
      typeof parsed.profiles !== "object"
    ) {
      storage.removeItem(key);
      return null;
    }

    return {
      baseFingerprint: parsed.baseFingerprint,
      profiles: normalizeMySizesProfiles(parsed.profiles),
    };
  } catch (_) {
    try {
      window.sessionStorage?.removeItem(draftStorageKey(uid));
    } catch (_) {}
    return null;
  }
};

const storeDraft = (uid, profiles, baseFingerprint) => {
  if (!uid || !baseFingerprint) return;
  try {
    window.sessionStorage?.setItem(
      draftStorageKey(uid),
      JSON.stringify({
        version: MY_SIZES_DRAFT_VERSION,
        ownerUid: uid,
        baseFingerprint,
        profiles: normalizeMySizesProfiles(profiles),
      }),
    );
  } catch (_) {}
};

const clearStoredDraft = (uid) => {
  if (!uid) return;
  try {
    window.sessionStorage?.removeItem(draftStorageKey(uid));
    window.sessionStorage?.removeItem(legacyDraftStorageKey(uid));
  } catch (_) {}
};

const selectedValuesFor = (profile) =>
  [profile?.primary, ...(profile?.alternates || [])].filter(Boolean);

const toggleSelectedValue = (profiles, key, value) => {
  const next = cloneProfiles(profiles);
  const current = next[key];
  const selected = selectedValuesFor(current);
  const index = selected.indexOf(value);

  if (index >= 0) {
    selected.splice(index, 1);
  } else {
    if (selected.length >= 5) return null;
    selected.push(value);
  }

  current.primary = selected[0] || "";
  current.alternates = selected.slice(1, 5);
  return next;
};

const MySizesSkeleton = () => (
  <div className="my-sizes-skeleton" aria-label="Loading your sizes">
    <Skeleton height={76} borderRadius={14} />
    {[0, 1, 2].map((section) => (
      <section key={section}>
        <Skeleton width={150} height={22} />
        <Skeleton width="78%" height={15} />
        <div>
          {Array.from({ length: section === 0 ? 12 : 8 }, (_, index) => (
            <Skeleton key={index} height={44} borderRadius={12} />
          ))}
        </div>
      </section>
    ))}
  </div>
);

const MySizes = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { currentUser } = useAuth();
  const sizesState = useSelector(selectMySizesState);
  const hasOwnedHydratedState = Boolean(
    currentUser?.uid &&
      sizesState.ownerUid === currentUser.uid &&
      sizesState.lastFetchedAt,
  );
  const [draftProfiles, setDraftProfiles] = useState(() =>
    hasOwnedHydratedState
      ? cloneProfiles(sizesState.profiles)
      : createEmptyMySizesProfiles(),
  );
  const [draftInitializedFor, setDraftInitializedFor] = useState(null);
  const [jeansWaist, setJeansWaist] = useState("");
  const [jeansInseam, setJeansInseam] = useState("");
  const dirtyRef = useRef(false);
  const draftBaseFingerprintRef = useRef(
    hasOwnedHydratedState
      ? profilesFingerprint(sizesState.profiles)
      : null,
  );

  const ownsState = Boolean(
    currentUser?.uid && sizesState.ownerUid === currentUser.uid,
  );
  const savedProfiles = ownsState
    ? sizesState.profiles
    : createEmptyMySizesProfiles();
  const savedFingerprint = useMemo(
    () => profilesFingerprint(savedProfiles),
    [savedProfiles],
  );
  const isInitialLoading =
    !ownsState ||
    (sizesState.status !== "error" &&
      (!sizesState.lastFetchedAt ||
        draftInitializedFor !== currentUser?.uid));
  const isSaving = ownsState && sizesState.saveStatus === "saving";

  const hasChanges = useMemo(
    () => profilesFingerprint(draftProfiles) !== profilesFingerprint(savedProfiles),
    [draftProfiles, savedProfiles],
  );

  useEffect(() => {
    const uid = currentUser?.uid;
    if (!uid) return;

    const ownsCachedSizes = Boolean(
      sizesState.ownerUid === uid && sizesState.lastFetchedAt,
    );
    const cacheIsFresh = Boolean(
      ownsCachedSizes &&
        Date.now() - Number(sizesState.lastFetchedAt) < MY_SIZES_CACHE_TTL_MS,
    );
    if (cacheIsFresh) return;

    // Render an owned persisted snapshot immediately, then quietly reconcile
    // stale data. A slow callable must not gate this page on every visit.
    dispatch(fetchMySizes({ uid, force: ownsCachedSizes })).catch(() => {});
  }, [
    currentUser?.uid,
    dispatch,
    sizesState.lastFetchedAt,
    sizesState.ownerUid,
  ]);

  useEffect(() => {
    const uid = currentUser?.uid;
    if (!uid) {
      dirtyRef.current = false;
      draftBaseFingerprintRef.current = null;
      if (draftInitializedFor !== null) setDraftInitializedFor(null);
      return;
    }
    if (!ownsState || !sizesState.lastFetchedAt) {
      return;
    }

    if (draftInitializedFor !== uid) {
      const storedDraft = readStoredDraft(uid);
      const storedFingerprint = storedDraft
        ? profilesFingerprint(storedDraft.profiles)
        : null;
      const canRestoreDraft = Boolean(
        storedDraft &&
          storedDraft.baseFingerprint === savedFingerprint &&
          storedFingerprint !== savedFingerprint,
      );

      dirtyRef.current = canRestoreDraft;
      draftBaseFingerprintRef.current = savedFingerprint;
      setDraftProfiles(
        canRestoreDraft
          ? cloneProfiles(storedDraft.profiles)
          : cloneProfiles(sizesState.profiles),
      );
      setDraftInitializedFor(uid);
      if (!canRestoreDraft) clearStoredDraft(uid);
      return;
    }

    // Server refreshes may update the canonical profiles, but must never
    // overwrite choices the user has actually changed on this screen.
    if (!dirtyRef.current && !isSaving) {
      draftBaseFingerprintRef.current = savedFingerprint;
      clearStoredDraft(uid);
      setDraftProfiles(cloneProfiles(sizesState.profiles));
    }
  }, [
    currentUser?.uid,
    draftInitializedFor,
    isSaving,
    ownsState,
    sizesState.lastFetchedAt,
    sizesState.profiles,
    sizesState.status,
    savedFingerprint,
  ]);

  useEffect(() => {
    const uid = currentUser?.uid;
    if (!uid || draftInitializedFor !== uid || isSaving) return;

    if (dirtyRef.current && hasChanges) {
      storeDraft(
        uid,
        draftProfiles,
        draftBaseFingerprintRef.current || savedFingerprint,
      );
      return;
    }

    if (!hasChanges) {
      dirtyRef.current = false;
      draftBaseFingerprintRef.current = savedFingerprint;
      clearStoredDraft(uid);
    }
  }, [
    currentUser?.uid,
    draftInitializedFor,
    draftProfiles,
    hasChanges,
    isSaving,
    savedFingerprint,
  ]);

  const commitDraftProfiles = (nextProfiles) => {
    const normalized = cloneProfiles(nextProfiles);
    const nextHasChanges =
      profilesFingerprint(normalized) !== savedFingerprint;

    if (nextHasChanges && !dirtyRef.current) {
      draftBaseFingerprintRef.current = savedFingerprint;
    }
    dirtyRef.current = nextHasChanges;
    if (!nextHasChanges && currentUser?.uid) {
      clearStoredDraft(currentUser.uid);
    }
    setDraftProfiles(normalized);
  };

  const handleToggle = (sectionKey, value) => {
    if (isSaving) return;
    const nextProfiles = toggleSelectedValue(draftProfiles, sectionKey, value);
    if (!nextProfiles) {
      appHaptics.warning();
      toast("You can save up to five usual sizes in each section.");
      return;
    }

    appHaptics.selection();
    commitDraftProfiles(nextProfiles);
  };

  const handleAddJeansSize = () => {
    if (isSaving) return;
    if (!jeansWaist || !jeansInseam) {
      appHaptics.warning();
      toast("Choose both a waist and an inseam.");
      return;
    }
    const value = `W${jeansWaist}/L${jeansInseam}`;
    if (selectedValuesFor(draftProfiles.jeans).includes(value)) {
      appHaptics.selection();
      return;
    }
    const nextProfiles = toggleSelectedValue(draftProfiles, "jeans", value);
    if (!nextProfiles) {
      appHaptics.warning();
      toast("You can save up to five usual sizes in each section.");
      return;
    }
    appHaptics.selection();
    commitDraftProfiles(nextProfiles);
  };

  const handleSave = async () => {
    if (!currentUser?.uid || !hasChanges || isSaving) return;

    try {
      const sizing = await dispatch(
        persistMySizes({
          uid: currentUser.uid,
          profiles: draftProfiles,
        }),
      );
      const saved = cloneProfiles(sizing.profiles);
      dirtyRef.current = false;
      draftBaseFingerprintRef.current = profilesFingerprint(saved);
      setDraftProfiles(saved);
      clearStoredDraft(currentUser.uid);
      appHaptics.success();
      toast.success("Your sizes have been saved.");
    } catch (error) {
      // Keep the buyer's draft intact so a temporary network failure only
      // requires a retry, not reselecting every size.
      appHaptics.error();
      toast.error(getMySizesErrorMessage(error, "save"));
    }
  };

  const retryLoad = () => {
    if (!currentUser?.uid) return;
    dispatch(fetchMySizes({ uid: currentUser.uid, force: true })).catch(() => {});
  };

  return (
    <>
      <SEO
        title="My sizes - My Thrift"
        description="Save the sizes you usually wear for more relevant shopping recommendations."
        url="https://www.shopmythrift.store/my-sizes"
      />

      <main className="my-sizes-page">
        <AppPageHeader
          title="My sizes"
          onBack={() => navigate("/profile", { replace: true })}
        />

        {isInitialLoading ? (
          <MySizesSkeleton />
        ) : sizesState.status === "error" ? (
          <div className="my-sizes-error" role="alert">
            <Info aria-hidden="true" />
            <h2>We couldn’t load your sizes</h2>
            <p>{sizesState.error}</p>
            <button type="button" onClick={retryLoad}>
              Try again
            </button>
          </div>
        ) : (
          <>
            <div className="my-sizes-content">
              <div className="my-sizes-intro">
                <Info aria-hidden="true" />
                <p>
                  Pick the sizes you usually wear. Your first choice in each
                  section is treated as your main size, and you can add up to
                  four alternatives.
                </p>
              </div>

              {sizesState.error && (
                <div className="my-sizes-inline-error" role="status">
                  {sizesState.error} Your saved choices are still available.
                </div>
              )}

              {SIZE_SECTIONS.map((section) => {
                const selected = selectedValuesFor(draftProfiles[section.key]);
                return (
                  <section className="my-sizes-section" key={section.key}>
                    <div className="my-sizes-section-heading">
                      <div>
                        <h2>{section.title}</h2>
                        <p>{section.description}</p>
                      </div>
                      <span>{section.systemLabel}</span>
                    </div>

                    {section.selectionMode === "waistInseam" ? (
                      <div className="my-sizes-jeans-picker">
                        <label>
                          <span>Waist</span>
                          <select
                            value={jeansWaist}
                            disabled={isSaving}
                            onChange={(event) => setJeansWaist(event.target.value)}
                          >
                            <option value="">Choose</option>
                            {JEANS_WAISTS.map((value) => (
                              <option key={value} value={value}>W{value}</option>
                            ))}
                          </select>
                        </label>
                        <label>
                          <span>Inseam</span>
                          <select
                            value={jeansInseam}
                            disabled={isSaving}
                            onChange={(event) => setJeansInseam(event.target.value)}
                          >
                            <option value="">Choose</option>
                            {JEANS_INSEAMS.map((value) => (
                              <option key={value} value={value}>L{value}</option>
                            ))}
                          </select>
                        </label>
                        <button
                          type="button"
                          className="my-sizes-jeans-add"
                          onClick={handleAddJeansSize}
                          disabled={isSaving}
                        >
                          Add size
                        </button>
                      </div>
                    ) : null}

                    <div
                      className={`my-sizes-options${
                        section.selectionMode === "waistInseam"
                          ? " my-sizes-selected-jeans"
                          : ""
                      }`}
                      role="group"
                      aria-label={`${section.title} sizes`}
                    >
                      {(section.selectionMode === "waistInseam"
                        ? selected
                        : section.options
                      ).map((value) => {
                        const selectedIndex = selected.indexOf(value);
                        const isSelected = selectedIndex >= 0;
                        const isPrimary = selectedIndex === 0;

                        return (
                          <button
                            type="button"
                            key={value}
                            className={`my-size-option${
                              isSelected ? " is-selected" : ""
                            }${isPrimary ? " is-primary" : ""}`}
                            aria-pressed={isSelected}
                            disabled={isSaving}
                            aria-label={`${section.systemLabel} ${value}${
                              isPrimary
                                ? ", main size"
                                : isSelected
                                  ? ", alternate size"
                                  : ""
                            }`}
                            onClick={() => handleToggle(section.key, value)}
                          >
                            <span>{value}</span>
                            {isSelected && <Check aria-hidden="true" />}
                          </button>
                        );
                      })}
                    </div>

                    {selected.length > 0 && (
                      <p className="my-sizes-selection-summary">
                        Main: <strong>{selected[0]}</strong>
                        {selected.length > 1 && (
                          <> · Also wear: {selected.slice(1).join(", ")}</>
                        )}
                      </p>
                    )}
                  </section>
                );
              })}

              <p className="my-sizes-fit-note">
                Sizes can vary between brands and individual items. These
                choices improve recommendations but do not guarantee fit.
              </p>
            </div>

            <div className="my-sizes-save-bar">
              <button
                type="button"
                onClick={handleSave}
                disabled={!hasChanges || isSaving}
              >
                {isSaving ? (
                  <>
                    <LoaderCircle className="my-sizes-save-spinner" aria-hidden="true" />
                    Saving…
                  </>
                ) : hasChanges ? (
                  "Save my sizes"
                ) : (
                  "Sizes saved"
                )}
              </button>
            </div>
          </>
        )}
      </main>
    </>
  );
};

export default MySizes;
