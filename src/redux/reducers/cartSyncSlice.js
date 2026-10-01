const OWNER_CHANGED = "cartSync/ownerChanged";
const CACHE_READY = "cartSync/cacheReady";
const SYNC_READY = "cartSync/syncReady";
const SYNC_DEGRADED = "cartSync/syncDegraded";
const WRITE_QUEUED = "cartSync/writeQueued";
const WRITE_SETTLED = "cartSync/writeSettled";

const initialState = {
  ownerKey: null,
  status: "idle",
  hydrated: false,
  source: null,
  error: null,
  pendingWrites: 0,
  lastSyncedAt: null,
};

export const cartOwnerChanged = (ownerKey) => ({
  type: OWNER_CHANGED,
  payload: { ownerKey },
});

export const cartCacheReady = (ownerKey, source = "cache") => ({
  type: CACHE_READY,
  payload: { ownerKey, source },
});

export const cartSyncReady = (ownerKey, source = "server") => ({
  type: SYNC_READY,
  payload: { ownerKey, source, at: Date.now() },
});

export const cartSyncDegraded = (ownerKey, error, hydrated = true) => ({
  type: SYNC_DEGRADED,
  payload: {
    ownerKey,
    hydrated,
    error: error?.message || String(error || "Cart sync unavailable"),
  },
});

export const cartWriteQueued = (ownerKey) => ({
  type: WRITE_QUEUED,
  payload: { ownerKey },
});

export const cartWriteSettled = (ownerKey, error = null) => ({
  type: WRITE_SETTLED,
  payload: {
    ownerKey,
    error: error?.message || (error ? String(error) : null),
    at: Date.now(),
  },
});

export default function cartSyncReducer(state = initialState, action) {
  switch (action.type) {
    case OWNER_CHANGED:
      return {
        ...initialState,
        ownerKey: action.payload.ownerKey,
        status: "loading",
      };

    case CACHE_READY:
      if (state.ownerKey !== action.payload.ownerKey) return state;
      return {
        ...state,
        status: "ready",
        hydrated: true,
        source: action.payload.source,
        error: null,
      };

    case SYNC_READY:
      if (state.ownerKey !== action.payload.ownerKey) return state;
      return {
        ...state,
        status: "ready",
        hydrated: true,
        source: action.payload.source,
        error: null,
        lastSyncedAt: action.payload.at,
      };

    case SYNC_DEGRADED:
      if (state.ownerKey !== action.payload.ownerKey) return state;
      return {
        ...state,
        status: "degraded",
        hydrated: action.payload.hydrated,
        source: state.source || "cache",
        error: action.payload.error,
      };

    case WRITE_QUEUED:
      if (state.ownerKey !== action.payload.ownerKey) return state;
      return {
        ...state,
        pendingWrites: state.pendingWrites + 1,
      };

    case WRITE_SETTLED:
      if (state.ownerKey !== action.payload.ownerKey) return state;
      return {
        ...state,
        status: action.payload.error ? "degraded" : "ready",
        hydrated: true,
        pendingWrites: Math.max(0, state.pendingWrites - 1),
        error: action.payload.error,
        lastSyncedAt: action.payload.error ? state.lastSyncedAt : action.payload.at,
      };

    default:
      return state;
  }
}
