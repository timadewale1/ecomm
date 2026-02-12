export const SEARCH_SAVE_SNAPSHOT = "SEARCH_SAVE_SNAPSHOT";
export const SEARCH_CLEAR_SNAPSHOT = "SEARCH_CLEAR_SNAPSHOT";

export const saveSearchSnapshot = (payload) => ({
  type: SEARCH_SAVE_SNAPSHOT,
  payload,
});

export const clearSearchSnapshot = () => ({
  type: SEARCH_CLEAR_SNAPSHOT,
});
