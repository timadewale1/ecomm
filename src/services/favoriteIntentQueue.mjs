const count = (value) => Math.max(0, Math.floor(Number(value) || 0));
export const favoriteCountVersion = (value) => {
  if (typeof value?.toMillis === "function") return value.toMillis();
  if (Number.isFinite(value?.seconds)) return value.seconds * 1000 + (value.nanoseconds || 0) / 1e6;
  return typeof value === "number" ? value : Date.parse(value || "") || 0;
};

function createFavoriteSessionId() {
  // Keep the native method call out of the parameter default: the production
  // optional-chain transform previously emitted an out-of-scope temporary there.
  const cryptoApi = globalThis.crypto;
  if (cryptoApi && typeof cryptoApi.randomUUID === "function") {
    try {
      return cryptoApi.randomUUID();
    } catch {
      // Session IDs order favorite requests; they are not authentication tokens.
    }
  }
  return `favorite-${Date.now()}-${Math.random()}`;
}

// One queue per account, shared by every product surface. The displayed count
// is always a server baseline plus ONE membership delta, never a sum of taps.
export function createFavoriteIntentQueue({
  save, readLiked, publish, onError, onCommit = () => {},
  delay = 350, now = Date.now, schedule = setTimeout, cancel = clearTimeout,
  sessionId = createFavoriteSessionId(),
}) {
  const entries = new Map();
  let owner;
  let generation = 0;
  let hydrated = false;
  let activeSessionId = sessionId;
  const emit = (entry) => publish({
    productId: entry.product.id,
    product: entry.product,
    liked: entry.desired,
    wishCount: count(entry.base + Number(entry.desired) - Number(entry.confirmed)),
    pending: Boolean(owner && (entry.dirty || entry.running)),
    // Persist just unsettled intentions; fresh server hydration owns idle state.
    intent: owner && (entry.dirty || entry.running) ? {
      product: entry.product, base: entry.base, confirmed: entry.confirmed,
      desired: entry.desired, revision: entry.revision, sessionId: entry.sessionId,
    } : null,
  });
  const live = (entry, epoch) => generation === epoch && entries.get(entry.product.id) === entry;

  function arm(entry, wait = delay) {
    if (entry.timer !== null) cancel(entry.timer);
    entry.timer = schedule(() => { entry.timer = null; void drain(entry); }, wait);
  }

  async function drain(entry) {
    if (!owner || !entry.dirty || entry.running) return;
    const epoch = generation;
    const requested = entry.desired;
    const revision = entry.revision;
    entry.running = true;
    try {
      const result = await save({
        productId: entry.product.id, liked: requested, uid: owner,
        clientSessionId: entry.sessionId, sequence: revision,
      });
      if (!live(entry, epoch)) return;
      entry.base = Number.isFinite(result.wishCount) ? count(result.wishCount) :
        count(entry.base + Number(requested) - Number(entry.confirmed));
      entry.confirmed = typeof result.liked === "boolean" ? result.liked : requested;
      entry.awaitingCloud = entry.cloudLiked !== entry.confirmed;
      entry.ackDeadline = now() + 15000;
      entry.version = result.favoriteCountUpdatedAtMs || now();
      entry.committed = true;
      entry.dirty = entry.desired !== entry.confirmed;
      if (entry.dirty && result.staleRequest) {
        entry.revision = Math.max(entry.revision, Number(result.clientSequence) || 0) + 1;
      }
      // Analytics must never turn a successful save into a failed favourite.
      if (result.changed) {
        try { onCommit({ product: entry.product, liked: entry.confirmed, context: entry.context }); } catch {}
      }
    } catch (error) {
      if (!live(entry, epoch)) return;
      if (typeof error.favoriteState?.liked === "boolean") {
        entry.confirmed = error.favoriteState.liked;
        if (Number.isFinite(error.favoriteState.wishCount)) entry.base = count(error.favoriteState.wishCount);
      }
      // A failure belonging to an older tap must not undo a newer intention.
      if (revision === entry.revision) {
        entry.desired = entry.confirmed;
        entry.dirty = false;
        onError(error);
      }
    } finally {
      if (live(entry, epoch)) {
        entry.running = false;
        emit(entry);
        if (entry.dirty) arm(entry, Math.max(0, delay - (now() - entry.lastTap)));
      }
    }
  }

  function observe(product) {
    const id = product?.id || product?.productId;
    if (!id) return null;
    let entry = entries.get(id);
    if (!entry) {
      entry = {
        product: { ...product, id }, base: count(product.wishCount),
        confirmed: readLiked(id), desired: readLiked(id), revision: 0,
        version: favoriteCountVersion(product.favoriteCountUpdatedAt),
        dirty: false, running: false, timer: null, committed: false,
        sessionId: activeSessionId, lastTap: 0,
      };
      entries.set(id, entry);
      emit(entry);
    } else {
      entry.product = { ...entry.product, ...product, id };
      const version = favoriteCountVersion(product.favoriteCountUpdatedAt);
      // Cached search/feed objects cannot overwrite a count returned by a save.
      if (!entry.dirty && !entry.running && Number.isFinite(product.wishCount) &&
          (version > entry.version || (!entry.committed && !entry.version && entry.revision === 0))) {
        entry.base = count(product.wishCount);
        entry.version = version;
        emit(entry);
      }
    }
    return entry;
  }

  return {
    setOwner(uid, restored = {}) {
      if (owner === uid) return;
      generation += 1;
      activeSessionId = `${sessionId}:${generation}`;
      for (const entry of entries.values()) if (entry.timer !== null) cancel(entry.timer);
      entries.clear();
      owner = uid;
      hydrated = false;
      if (!uid) return;
      for (const intent of Object.values(restored)) {
        if (!intent?.product?.id || typeof intent.desired !== "boolean") continue;
        const entry = {
          ...intent, base: count(intent.base), confirmed: Boolean(intent.confirmed),
          revision: Number(intent.revision) || 1, sessionId: intent.sessionId || activeSessionId,
          version: 0, dirty: true, running: false, committed: true,
          timer: null, lastTap: now(),
        };
        entries.set(entry.product.id, entry);
        emit(entry);
        arm(entry);
      }
    },
    observe,
    toggle(product, context) {
      const entry = observe(product);
      if (!entry) return null;
      entry.desired = !entry.desired;
      entry.revision += 1;
      entry.lastTap = now();
      entry.context = context;
      // Even a burst ending at its initial state sends a desired-state no-op:
      // the local membership cache may be older than the server's value.
      entry.dirty = Boolean(owner);
      emit(entry);
      if (owner) arm(entry);
      return entry.desired;
    },
    reconcile(ids, authoritative) {
      const cloudIds = new Set(ids);
      for (const entry of entries.values()) {
        if (authoritative) {
          entry.cloudLiked = cloudIds.has(entry.product.id);
          if (entry.cloudLiked === entry.confirmed || now() > entry.ackDeadline) entry.awaitingCloud = false;
        }
        if (!authoritative || entry.dirty || entry.running || entry.awaitingCloud) {
          if (entry.desired) cloudIds.add(entry.product.id);
          else cloudIds.delete(entry.product.id);
          continue;
        }
        if (!authoritative) continue;
        const liked = cloudIds.has(entry.product.id);
        if (liked !== entry.confirmed) {
          // First hydration tells us who already liked a fetched product; its
          // existing public count includes that relationship already.
          if (hydrated) entry.base = count(entry.base + Number(liked) - Number(entry.confirmed));
          entry.confirmed = liked;
          entry.desired = liked;
          emit(entry);
        }
      }
      if (authoritative) hydrated = true;
      return [...cloudIds];
    },
    flush() {
      for (const entry of entries.values()) {
        if (entry.timer !== null) cancel(entry.timer);
        entry.timer = null;
        void drain(entry);
      }
    },
    dispose() {
      generation += 1;
      for (const entry of entries.values()) if (entry.timer !== null) cancel(entry.timer);
      entries.clear();
      owner = undefined;
    },
  };
}
