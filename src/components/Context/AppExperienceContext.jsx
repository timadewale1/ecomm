import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  APP_EXPERIENCE_CHANGED_EVENT,
  clearAppExperience,
  getCachedAppExperience,
  loadAppExperience,
  normalizeAppExperience,
  persistAppExperience,
} from "../../services/appExperience";

const AppExperienceContext = createContext(null);

export const AppExperienceProvider = ({ children }) => {
  const [experience, setExperienceState] = useState(getCachedAppExperience);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;

    loadAppExperience()
      .then((storedExperience) => {
        if (active) setExperienceState(storedExperience);
      })
      .finally(() => {
        if (active) setReady(true);
      });

    const onExperienceChanged = (event) => {
      if (active) setExperienceState(event.detail?.experience || null);
    };
    window.addEventListener(APP_EXPERIENCE_CHANGED_EVENT, onExperienceChanged);

    return () => {
      active = false;
      window.removeEventListener(
        APP_EXPERIENCE_CHANGED_EVENT,
        onExperienceChanged,
      );
    };
  }, []);

  const selectExperience = useCallback(async (nextExperience) => {
    const normalizedExperience = normalizeAppExperience(nextExperience);
    if (!normalizedExperience) {
      throw new Error("Invalid My Thrift app experience.");
    }
    // Update React immediately; the native write completes in the background.
    setExperienceState(normalizedExperience);
    return persistAppExperience(normalizedExperience);
  }, []);

  const resetExperience = useCallback(async () => {
    setExperienceState(null);
    await clearAppExperience();
  }, []);

  const value = useMemo(
    () => ({
      experience,
      ready,
      selectExperience,
      resetExperience,
    }),
    [experience, ready, resetExperience, selectExperience],
  );

  return (
    <AppExperienceContext.Provider value={value}>
      {children}
    </AppExperienceContext.Provider>
  );
};

export const useAppExperience = () => {
  const context = useContext(AppExperienceContext);
  if (!context) {
    throw new Error("useAppExperience must be used inside AppExperienceProvider.");
  }
  return context;
};
