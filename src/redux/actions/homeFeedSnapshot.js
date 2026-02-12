// src/redux/actions/homeFeedSnapshot.js
export const SAVE_HOMEFEED_SNAPSHOT = "SAVE_HOMEFEED_SNAPSHOT";
export const CLEAR_HOMEFEED_SNAPSHOT = "CLEAR_HOMEFEED_SNAPSHOT";

export const saveHomeFeedSnapshot = (payload) => ({
  type: SAVE_HOMEFEED_SNAPSHOT,
  payload,
});

export const clearHomeFeedSnapshot = () => ({
  type: CLEAR_HOMEFEED_SNAPSHOT,
});
