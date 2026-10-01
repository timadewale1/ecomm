import {
  doc,
  getDocFromServer,
  onSnapshot,
  runTransaction,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { auth, db } from "../firebase.config";
import {
  applyCartMutation,
  applyCartMutations,
  buildCartSetOptions,
  deriveGuestCartAdditions,
  normalizeCart,
  normalizePendingCartMutations,
} from "./cartPersistenceOperations";

export {
  applyCartMutation,
  applyCartMutations,
  buildCartSetOptions,
  deriveGuestCartAdditions,
  normalizeCart,
  normalizePendingCartMutations,
};

export const CART_CACHE_VERSION = 2;
export const GUEST_CART_OWNER = "guest";

const CACHE_PREFIX = "mythrift:cart:v2:";
const LEGACY_CART_KEY = "cart";
const DEVICE_KEY = "mythrift:cart-device:v1";
const writeQueues = new Map();
const hydrationPromises = new Map();
const hydrationResults = new Map();
const MAX_APPLIED_MUTATION_IDS = 200;

const makeId = (prefix = "cart") => {
  try {
    return `${prefix}_${window.crypto?.randomUUID?.() || `${Date.now()}_${Math.random().toString(16).slice(2)}`}`;
  } catch {
    return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  }
};

const storageGet = (key) => {
  try {
    return window.localStorage?.getItem(key) || null;
  } catch {
    return null;
  }
};

const storageSet = (key, value) => {
  try {
    window.localStorage?.setItem(key, value);
    return true;
  } catch {
    return false;
  }
};

const storageRemove = (key) => {
  try {
    window.localStorage?.removeItem(key);
  } catch {
    // Local storage is a cache. Firestore remains authoritative for users.
  }
};

const hasCartItems = (cart) =>
  Object.values(normalizeCart(cart)).some(
    (vendor) => Object.keys(vendor.products || {}).length > 0,
  );

export const cartOwnerKey = (uid) => (uid ? `user:${uid}` : GUEST_CART_OWNER);
const cacheKey = (ownerKey) => `${CACHE_PREFIX}${ownerKey}`;

const createEnvelope = (ownerKey, cart, overrides = {}) => ({
  version: CART_CACHE_VERSION,
  ownerKey,
  cart: normalizeCart(cart),
  dirty: false,
  revision: 0,
  updatedAt: Date.now(),
  guestImportId:
    ownerKey === GUEST_CART_OWNER ? makeId("guest") : null,
  ...overrides,
});

export const readCartEnvelope = (ownerKey) => {
  const raw = storageGet(cacheKey(ownerKey));
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (parsed?.version !== CART_CACHE_VERSION || parsed?.ownerKey !== ownerKey) {
      return null;
    }
    const legacyMutation = parsed.pendingMutation;
    const pendingMutations = normalizePendingCartMutations([
      ...(parsed.pendingMutations || []),
      ...(legacyMutation ? [legacyMutation] : []),
    ]);
    return {
      ...parsed,
      cachePersisted: true,
      cart: normalizeCart(parsed.cart),
      // A queued operation is authoritative local intent even if an older app
      // build (or an interrupted finalization) persisted `dirty: false`.
      dirty: Boolean(
        parsed.dirty ||
          pendingMutations.length > 0 ||
          parsed.pendingGuestImportId,
      ),
      revision: Number(parsed.revision || 0),
      pendingMutations,
    };
  } catch {
    return null;
  }
};

export const writeCartEnvelope = (ownerKey, cart, overrides = {}) => {
  const current = readCartEnvelope(ownerKey);
  const envelope = createEnvelope(ownerKey, cart, {
    ...current,
    ...overrides,
    ownerKey,
    version: CART_CACHE_VERSION,
    cart: normalizeCart(cart),
    updatedAt: Date.now(),
    guestImportId:
      ownerKey === GUEST_CART_OWNER
        ? overrides.guestImportId || current?.guestImportId || makeId("guest")
        : null,
  });
  const cachePersisted = storageSet(
    cacheKey(ownerKey),
    JSON.stringify(envelope),
  );
  return { ...envelope, cachePersisted };
};

export const removeCartEnvelope = (ownerKey) => storageRemove(cacheKey(ownerKey));

/**
 * Clear only the anonymous/device basket.
 *
 * The signed-in owner's cache and Firestore document deliberately remain
 * untouched. This is used when an authenticated session signs out so the
 * next anonymous session cannot inherit either the account basket or a guest
 * basket that was already handed into that account.
 */
export const clearGuestCartCache = () => {
  removeCartEnvelope(GUEST_CART_OWNER);
  storageRemove(LEGACY_CART_KEY);
};

/**
 * Preserve a Firebase anonymous user's cart before Firebase replaces that
 * temporary identity with an existing account. The next validated buyer
 * import treats this as a fresh guest generation, so Firestore cannot mistake
 * it for a guest import that was already acknowledged earlier.
 */
export const stageAnonymousCartAsGuest = (anonymousUid) => {
  if (!anonymousUid) return { staged: false, reason: "missing-owner" };

  const anonymousOwnerKey = cartOwnerKey(anonymousUid);
  const anonymousEnvelope = readCartEnvelope(anonymousOwnerKey);
  if (!anonymousEnvelope || !hasCartItems(anonymousEnvelope.cart)) {
    return { staged: false, reason: "empty" };
  }

  // The handoff is intentionally idempotent. Auth observers and the login
  // action can both notice the same UID replacement; only the first should
  // create a new guest generation.
  if (anonymousEnvelope.anonymousHandoffGuestImportId) {
    return {
      staged: false,
      reason: "already-staged",
      guestImportId: anonymousEnvelope.anonymousHandoffGuestImportId,
    };
  }

  const currentGuest = readCartEnvelope(GUEST_CART_OWNER);
  const combined = mergeGuestCart(
    currentGuest?.cart || {},
    anonymousEnvelope.cart,
  ).merged;
  const guestImportId = makeId("guest");
  const stagedGuest = writeCartEnvelope(GUEST_CART_OWNER, combined, {
    dirty: false,
    revision: Number(currentGuest?.revision || 0) + 1,
    guestImportId,
    pendingMutation: null,
    pendingMutations: [],
    pendingGuestImportId: null,
    pendingGuestCart: null,
    pendingGuestBaseCart: null,
    pendingGuestRevision: null,
    anonymousSourceUid: anonymousUid,
  });

  if (!stagedGuest.cachePersisted) {
    const error = new Error("Anonymous cart could not be staged for sign-in");
    error.code = "cart/cache-write-failed";
    throw error;
  }

  // Keep the anonymous cart itself as a recovery copy. Marking it prevents a
  // second observer from summing the same basket into the guest owner twice.
  writeCartEnvelope(anonymousOwnerKey, anonymousEnvelope.cart, {
    ...anonymousEnvelope,
    anonymousHandoffGuestImportId: guestImportId,
    anonymousHandoffAt: Date.now(),
  });

  return { staged: true, guestImportId, cart: stagedGuest.cart };
};

const consumeGuestEnvelope = (expectedEnvelope) => {
  if (!expectedEnvelope?.guestImportId) {
    return { consumed: false, current: readCartEnvelope(GUEST_CART_OWNER) };
  }
  const current = readCartEnvelope(GUEST_CART_OWNER);
  if (!current || current.guestImportId !== expectedEnvelope.guestImportId) {
    return { consumed: false, current };
  }

  if (current.revision === expectedEnvelope.revision) {
    removeCartEnvelope(GUEST_CART_OWNER);
    return { consumed: true, current: null };
  }

  return { consumed: false, current };
};

// After a captured guest snapshot has definitely reached Firestore, retain
// only additions made concurrently to that same generation. Re-importing the
// full newer snapshot would double every line already committed.
const rollGuestEnvelopeAfterImport = (importedEnvelope) => {
  const outcome = consumeGuestEnvelope(importedEnvelope);
  if (outcome.consumed || !outcome.current) return null;
  if (outcome.current.guestImportId !== importedEnvelope?.guestImportId) {
    return outcome.current;
  }

  const delta = deriveGuestCartAdditions(
    outcome.current.cart,
    importedEnvelope.cart,
  );
  if (!hasCartItems(delta)) {
    removeCartEnvelope(GUEST_CART_OWNER);
    return null;
  }
  return writeCartEnvelope(GUEST_CART_OWNER, delta, {
    ...outcome.current,
    revision: Number(outcome.current.revision || 0) + 1,
    guestImportId: makeId("guest"),
  });
};

export const migrateLegacyCart = (ownerKey) => {
  const raw = storageGet(LEGACY_CART_KEY);
  if (!raw) return readCartEnvelope(ownerKey);

  let legacyCart = {};
  try {
    legacyCart = normalizeCart(JSON.parse(raw));
  } catch {
    storageRemove(LEGACY_CART_KEY);
    return readCartEnvelope(ownerKey);
  }

  const current = readCartEnvelope(ownerKey);
  if (!current && hasCartItems(legacyCart)) {
    const migrated = writeCartEnvelope(ownerKey, legacyCart, {
      dirty: ownerKey !== GUEST_CART_OWNER,
      legacy: true,
    });
    // Never delete the only durable basket when the destination cache could
    // not be written (for example quota/private-storage restrictions).
    if (!migrated.cachePersisted) return migrated;
  }
  storageRemove(LEGACY_CART_KEY);
  return readCartEnvelope(ownerKey);
};

const getDeviceId = () => {
  const existing = storageGet(DEVICE_KEY);
  if (existing) return existing;
  const deviceId = makeId("device");
  storageSet(DEVICE_KEY, deviceId);
  return deviceId;
};

export const itemIdentity = (item = {}) => {
  const pid = item.id ?? item.productId ?? "";
  const color = item.selectedColor ?? item.color ?? "";
  const size = item.selectedSize ?? item.size ?? "";
  const sub = item.subProductId ?? "";
  const variation = item.variation ?? item.variant ?? "";
  return [pid, color, size, sub, variation].join("|");
};

/**
 * Merge a one-time guest basket into an account basket. Quantities are summed
 * because these are distinct baskets. Idempotency is enforced by the persisted
 * guestImportId, not by weakening the user's quantities.
 */
export const mergeGuestCart = (accountCart = {}, guestCart = {}) => {
  const merged = normalizeCart(accountCart);
  const addedByVendor = {};
  const conflicts = [];

  for (const [vendorId, guestVendor] of Object.entries(normalizeCart(guestCart))) {
    const accountVendor = merged[vendorId] || {};
    const products = { ...(accountVendor.products || {}) };
    const identityToKey = new Map(
      Object.entries(products).map(([key, item]) => [itemIdentity(item), key]),
    );

    for (const [guestKey, guestItem] of Object.entries(guestVendor.products)) {
      const identity = itemIdentity(guestItem);
      const existingKey = identityToKey.get(identity);

      if (existingKey) {
        const existing = products[existingKey];
        products[existingKey] = {
          ...existing,
          quantity: Math.max(
            1,
            Number(existing.quantity || 0) + Number(guestItem.quantity || 0),
          ),
        };
        conflicts.push({
          vendorId,
          name: guestItem.name || existing.name || "Item",
          how: "quantity-summed",
        });
      } else {
        let productKey = guestKey;
        if (products[productKey]) productKey = `${guestKey}__${makeId("merge")}`;
        products[productKey] = guestItem;
        identityToKey.set(identity, productKey);
      }

      if (!addedByVendor[vendorId]) addedByVendor[vendorId] = [];
      addedByVendor[vendorId].push(guestItem.name || "Item");
    }

    merged[vendorId] = {
      ...guestVendor,
      ...accountVendor,
      vendorName: accountVendor.vendorName || guestVendor.vendorName,
      products,
    };
  }

  return { merged, addedByVendor, conflicts };
};

// Legacy caches may already mirror Firestore. Keeping the larger quantity is
// retry-safe and avoids the old sign-in-twice quantity inflation.
const mergeLegacyCart = (serverCart = {}, legacyCart = {}) => {
  const merged = normalizeCart(serverCart);
  for (const [vendorId, legacyVendor] of Object.entries(normalizeCart(legacyCart))) {
    const serverVendor = merged[vendorId] || {};
    const products = { ...(serverVendor.products || {}) };
    const identityToKey = new Map(
      Object.entries(products).map(([key, item]) => [itemIdentity(item), key]),
    );
    for (const [legacyKey, legacyItem] of Object.entries(legacyVendor.products)) {
      const existingKey = identityToKey.get(itemIdentity(legacyItem));
      if (existingKey) {
        const existing = products[existingKey];
        products[existingKey] = {
          ...existing,
          quantity: Math.max(
            1,
            Number(existing.quantity || 0),
            Number(legacyItem.quantity || 0),
          ),
        };
      } else {
        products[legacyKey] = legacyItem;
      }
    }
    merged[vendorId] = {
      ...legacyVendor,
      ...serverVendor,
      vendorName: serverVendor.vendorName || legacyVendor.vendorName,
      products,
    };
  }
  return merged;
};

const buildWritePayload = (cart, revision, mutation, extra = {}) => {
  const payload = {
    cart: normalizeCart(cart),
    cartSchemaVersion: CART_CACHE_VERSION,
    cartClientRevision: revision,
    cartUpdatedByDevice: getDeviceId(),
    cartClientUpdatedAt: Date.now(),
    cartUpdatedAt: serverTimestamp(),
    ...extra,
  };

  if (mutation) {
    const {type, vendorId, productKey, productId, mutationId} = mutation;
    payload.recommendationMutation = {
      type,
      vendorId: vendorId || null,
      productKey: productKey || null,
      productId: productId || null,
      mutationId: mutationId || makeId("mutation"),
      clientTs: Date.now(),
      updatedAt: serverTimestamp(),
    };
  }
  return payload;
};

/**
 * Firestore recursively merges nested maps when `merge: true` is used. A cart
 * deletion is represented by a missing product key, so a recursive merge would
 * keep that old key on the server and the realtime listener would resurrect it.
 *
 * A top-level merge field mask is create-safe like setDoc(..., { merge: true }),
 * but replaces the complete `cart` map while preserving unrelated document
 * fields. Keep this helper exported so the write contract can be unit-tested
 * without touching Firestore.
 */
const writeCartDocument = async (
  uid,
  payload,
  mutations = [],
  guestCartToMerge = null,
) => {
  const cartRef = doc(db, "carts", uid);

  if (guestCartToMerge && hasCartItems(guestCartToMerge)) {
    return runTransaction(db, async (transaction) => {
      const snapshot = await transaction.get(cartRef);
      const remoteData = snapshot.exists() ? snapshot.data() || {} : {};
      if (
        payload.lastGuestCartImportId &&
        remoteData.lastGuestCartImportId === payload.lastGuestCartImportId
      ) {
        return {
          cart: normalizeCart(remoteData.cart),
          acknowledgedMutationIds: [],
        };
      }

      const committedCart = mergeGuestCart(
        remoteData.cart,
        guestCartToMerge,
      ).merged;
      const committedPayload = { ...payload, cart: committedCart };
      transaction.set(
        cartRef,
        committedPayload,
        buildCartSetOptions(committedPayload),
      );
      return { cart: committedCart, acknowledgedMutationIds: [] };
    });
  }

  // Transactions make independent device operations compose against the
  // latest server cart instead of allowing a stale whole-cart write to restore
  // a deleted item or erase a newly-added one. Failed/offline transactions are
  // still retained in the owner-scoped dirty cache and retried by the listener.
  const pendingMutations = normalizePendingCartMutations(mutations);
  if (pendingMutations.length > 0) {
    if (pendingMutations.length !== 1) {
      throw new Error("Cart mutations must be committed in sequence");
    }
    const [pendingMutation] = pendingMutations;
    return runTransaction(db, async (transaction) => {
      const snapshot = await transaction.get(cartRef);
      const remoteData = snapshot.exists() ? snapshot.data() || {} : {};
      const appliedIds = Array.isArray(remoteData.cartAppliedMutationIds)
        ? remoteData.cartAppliedMutationIds.filter((id) => typeof id === "string")
        : [];
      const appliedIdSet = new Set(appliedIds);
      const alreadyApplied = appliedIdSet.has(pendingMutation.mutationId);
      const unseenMutations = alreadyApplied ? [] : [pendingMutation];
      const committedCart = applyCartMutations(
        remoteData.cart,
        payload.cart,
        unseenMutations,
      );
      if (unseenMutations.length > 0) {
        const committedPayload = {
          ...payload,
          cart: committedCart,
          cartAppliedMutationIds: [
            ...appliedIds,
            ...unseenMutations.map((pending) => pending.mutationId),
          ].slice(-MAX_APPLIED_MUTATION_IDS),
        };
        transaction.set(
          cartRef,
          committedPayload,
          buildCartSetOptions(committedPayload),
        );
      }
      return {
        cart: committedCart,
        // IDs found on the cart document are acknowledged as well. Because
        // this outbox is committed strictly in sequence, a lost response is
        // retried before later local operations can evict its receipt.
        acknowledgedMutationIds: pendingMutations.map(
          (pending) => pending.mutationId,
        ),
      };
    });
  }

  await setDoc(cartRef, payload, buildCartSetOptions(payload));
  return { cart: payload.cart, acknowledgedMutationIds: [] };
};

const cartHydrationResult = (cart, source = "local-mutation", extra = {}) => ({
  mergedCart: normalizeCart(cart),
  addedByVendor: {},
  conflicts: [],
  source,
  degraded: false,
  ...extra,
});

export const cacheCartMutation = (
  cart,
  userId = auth.currentUser?.uid,
  pendingMutation = null,
) => {
  const ownerKey = cartOwnerKey(userId);
  const current = readCartEnvelope(ownerKey);
  const pendingMutations = userId
    ? normalizePendingCartMutations([
        ...(current?.pendingMutations || []),
        ...(pendingMutation ? [pendingMutation] : []),
      ])
    : [];
  const envelope = writeCartEnvelope(ownerKey, cart, {
    dirty: Boolean(userId),
    revision: Number(current?.revision || 0) + 1,
    pendingMutation: null,
    pendingMutations,
  });
  if (!userId && !envelope.cachePersisted) {
    const error = new Error("Guest cart storage is unavailable");
    error.code = "cart/cache-write-failed";
    throw error;
  }
  if (userId) {
    // A completed hydration result is only a snapshot. Never let a later cart
    // action reuse that stale object and restore a product that was just removed.
    hydrationResults.set(
      userId,
      cartHydrationResult(envelope.cart, "local-mutation"),
    );
  }
  return envelope;
};

export const persistCart = ({
  userId,
  cart,
  mutation = null,
  documentMetadata = null,
  guestCartToMerge = null,
  replayPending = false,
}) => {
  const uid = userId || null;
  const ownerKey = cartOwnerKey(uid);
  const preparedMutation = mutation
    ? { ...mutation, mutationId: mutation.mutationId || makeId("mutation") }
    : null;
  const existingEnvelope = uid ? readCartEnvelope(ownerKey) : null;
  const initialEnvelope =
    replayPending && existingEnvelope
      ? existingEnvelope
      : cacheCartMutation(cart, uid, preparedMutation);
  if (!uid) {
    return Promise.resolve({ cart: initialEnvelope.cart, localOnly: true });
  }

  const previous = writeQueues.get(uid) || Promise.resolve();
  const write = previous
    .catch(() => undefined)
    .then(async () => {
      let lastCommittedCart = initialEnvelope.cart;
      let wroteToServer = false;

      const settleWrite = (
        writeEnvelope,
        writeResult,
        { guestImportCompleted = false } = {},
      ) => {
        const acknowledgedIds = new Set(
          writeResult.acknowledgedMutationIds || [],
        );
        const latest = readCartEnvelope(ownerKey) || writeEnvelope;
        const remainingMutations = normalizePendingCartMutations(
          (latest.pendingMutations || []).filter(
            (pending) => !acknowledgedIds.has(pending.mutationId),
          ),
        );
        const sameRevision = latest.revision === writeEnvelope.revision;
        const hasPendingGuestImport = Boolean(
          !guestImportCompleted && latest.pendingGuestImportId,
        );
        const clean =
          remainingMutations.length === 0 && !hasPendingGuestImport;
        const nextCart =
          sameRevision && clean ? writeResult.cart : latest.cart;
        const nextEnvelope = writeCartEnvelope(ownerKey, nextCart, {
          ...latest,
          dirty: !clean,
          pendingMutation: null,
          pendingMutations: remainingMutations,
          ...(guestImportCompleted
            ? {
                pendingGuestImportId: null,
                pendingGuestCart: null,
                pendingGuestBaseCart: null,
                pendingGuestRevision: null,
              }
            : {}),
          lastSyncedAt: Date.now(),
        });

        if (clean) {
          hydrationResults.set(
            uid,
            cartHydrationResult(nextEnvelope.cart, "local-write"),
          );
        }
        return nextEnvelope;
      };

      // Resume a guest import from durable account-envelope data. This keeps
      // sign-in migration idempotent even if the app closes after Firestore
      // commits but before the client receives the response.
      let activeEnvelope = readCartEnvelope(ownerKey) || initialEnvelope;
      const cachedGuestEnvelope = readCartEnvelope(GUEST_CART_OWNER);
      const requestedGuestImportId =
        documentMetadata?.lastGuestCartImportId ||
        activeEnvelope.pendingGuestImportId ||
        null;
      const cachedGuestMatches =
        requestedGuestImportId &&
        cachedGuestEnvelope?.guestImportId === requestedGuestImportId;
      const resumableGuestCart =
        guestCartToMerge ||
        activeEnvelope.pendingGuestCart ||
        (cachedGuestMatches ? cachedGuestEnvelope.cart : null);

      if (requestedGuestImportId && hasCartItems(resumableGuestCart)) {
        const guestPayload = buildWritePayload(
          activeEnvelope.cart,
          activeEnvelope.revision,
          null,
          {
            ...(documentMetadata || {}),
            lastGuestCartImportId: requestedGuestImportId,
            guestCartImportedAt:
              documentMetadata?.guestCartImportedAt || serverTimestamp(),
          },
        );
        const guestResult = await writeCartDocument(
          uid,
          guestPayload,
          [],
          resumableGuestCart,
        );
        wroteToServer = true;
        lastCommittedCart = guestResult.cart;
        activeEnvelope = settleWrite(activeEnvelope, guestResult, {
          guestImportCompleted: true,
        });
      } else if (activeEnvelope.pendingGuestImportId) {
        // Never turn an incomplete guest import into a stale whole-cart write.
        // Keeping the envelope dirty is safer than duplicating or erasing cart
        // lines; hydration can retry when its guest snapshot is available.
        throw new Error("Cart guest import could not be resumed safely");
      }

      // Apply one operation per transaction. Besides preserving the order of
      // same-item edits, this ensures every recommendation mutation is emitted
      // once and keeps the 200-ID server receipt window safe for lost-response
      // retries, even when the local outbox is much larger.
      while (true) {
        activeEnvelope = readCartEnvelope(ownerKey) || activeEnvelope;
        const [nextMutation] = normalizePendingCartMutations(
          activeEnvelope.pendingMutations || [],
        );
        if (!nextMutation) break;

        const payload = buildWritePayload(
          activeEnvelope.cart,
          activeEnvelope.revision,
          nextMutation,
        );
        const writeResult = await writeCartDocument(
          uid,
          payload,
          [nextMutation],
        );
        wroteToServer = true;
        lastCommittedCart = writeResult.cart;
        activeEnvelope = settleWrite(activeEnvelope, writeResult);
      }

      // Backward compatibility for a pre-outbox dirty cache. Modern cart
      // actions always carry a mutation and never enter this path.
      activeEnvelope = readCartEnvelope(ownerKey) || activeEnvelope;
      if (!wroteToServer && activeEnvelope.dirty && activeEnvelope.legacy) {
        const payload = buildWritePayload(
          activeEnvelope.cart,
          activeEnvelope.revision,
          null,
        );
        const writeResult = await writeCartDocument(uid, payload);
        wroteToServer = true;
        lastCommittedCart = writeResult.cart;
        activeEnvelope = settleWrite(activeEnvelope, writeResult);
      }

      const finalEnvelope = readCartEnvelope(ownerKey) || activeEnvelope;
      const isLatest =
        !finalEnvelope.dirty &&
        !finalEnvelope.pendingGuestImportId &&
        (finalEnvelope.pendingMutations || []).length === 0;
      return {
        cart: isLatest ? finalEnvelope.cart : lastCommittedCart,
        localOnly: false,
        isLatest,
      };
    });

  const tracked = write
    .catch((error) => {
      const latest = readCartEnvelope(ownerKey);
      hydrationResults.set(
        uid,
        cartHydrationResult(latest?.cart || initialEnvelope.cart, "offline-cache", {
          degraded: true,
          error,
        }),
      );
      throw error;
    })
    .finally(() => {
      if (writeQueues.get(uid) === tracked) writeQueues.delete(uid);
    });
  writeQueues.set(uid, tracked);
  return tracked;
};

export const flushCartWrites = async (uid, timeoutMs = 2500) => {
  if (!uid) return true;

  const deadline = Date.now() + timeoutMs;
  const waitBeforeDeadline = async (promise) => {
    const remaining = deadline - Date.now();
    if (remaining <= 0) throw new Error("Cart sync timed out");

    let timer;
    try {
      return await Promise.race([
        promise,
        new Promise((_, reject) => {
          timer = setTimeout(
            () => reject(new Error("Cart sync timed out")),
            remaining,
          );
        }),
      ]);
    } finally {
      clearTimeout(timer);
    }
  };

  // A failed request deliberately leaves a durable outbox in the account
  // envelope. Waiting only for the in-memory promise would miss that state
  // after its `finally` removed the queue entry, so replay until both layers
  // agree that the cart is clean.
  while (true) {
    const pending = writeQueues.get(uid);
    if (pending) {
      await waitBeforeDeadline(pending);
      continue;
    }

    const envelope = readCartEnvelope(cartOwnerKey(uid));
    const needsReplay = Boolean(
      envelope?.dirty ||
        envelope?.pendingGuestImportId ||
        envelope?.pendingMutations?.length,
    );
    if (!needsReplay) return true;

    await waitBeforeDeadline(
      persistCart({
        userId: uid,
        cart: envelope.cart,
        replayPending: true,
      }),
    );
  }
};

const hydrateUser = async (uid, { importGuest = false } = {}) => {
  const ownerKey = cartOwnerKey(uid);
  const assertCurrentOwner = () => {
    if (auth.currentUser?.uid !== uid) {
      const error = new Error("Cart hydration was superseded by another owner");
      error.code = "cart/stale-owner";
      throw error;
    }
  };
  assertCurrentOwner();

  const accountEnvelope = migrateLegacyCart(ownerKey);
  const hydrationStartedRevision = Number(accountEnvelope?.revision || 0);
  // Passive hydration (auth listeners, reloads and cart actions) must never
  // consume device/guest state. Only a validated buyer-login boundary opts in
  // to the one-time guest import.
  let guestEnvelope = importGuest
    ? readCartEnvelope(GUEST_CART_OWNER)
    : null;
  let snapshot;

  try {
    // Never finalize an SDK cache snapshot as the authoritative account cart.
    // Offline/server failures belong in the recovery branch below, which
    // preserves the owner envelope and any staged guest import until the
    // realtime listener can reconnect.
    snapshot = await getDocFromServer(doc(db, "carts", uid));
  } catch (error) {
    assertCurrentOwner();
    // A transient native/network failure during sign-in must not hide the
    // guest basket. Stage the import durably in the account envelope; the
    // realtime recovery path will later merge it transactionally with the
    // authoritative remote cart. The account envelope owns the pending import
    // before the anonymous envelope is consumed, so termination is safe.
    if (guestEnvelope && hasCartItems(guestEnvelope.cart)) {
      const accountBase = accountEnvelope?.cart || {};
      const guestMerge = mergeGuestCart(accountBase, guestEnvelope.cart);
      const stagedAccountEnvelope = writeCartEnvelope(
        ownerKey,
        guestMerge.merged,
        {
        dirty: true,
        revision: Number(accountEnvelope?.revision || 0) + 1,
        pendingGuestImportId: guestEnvelope.guestImportId,
        pendingGuestCart: guestEnvelope.cart,
        pendingGuestBaseCart: accountBase,
        pendingGuestRevision: guestEnvelope.revision,
        },
      );

      if (!stagedAccountEnvelope.cachePersisted) {
        // The anonymous envelope remains the durable owner. Do not consume it
        // unless the account-side handoff can survive app termination.
        return {
          mergedCart: guestMerge.merged,
          addedByVendor: guestMerge.addedByVendor,
          conflicts: guestMerge.conflicts,
          source: "guest-cache",
          degraded: true,
          error,
        };
      }

      // The account envelope above now owns a durable copy of the pending
      // guest import. Remove the anonymous copy immediately: this is a
      // transfer, not a copy. `persistCart` will replay the staged import when
      // connectivity returns without exposing these lines after sign-out.
      consumeGuestEnvelope(guestEnvelope);
      return {
        mergedCart: guestMerge.merged,
        addedByVendor: guestMerge.addedByVendor,
        conflicts: guestMerge.conflicts,
        source: "guest-merge",
        degraded: true,
        error,
      };
    }
    if (accountEnvelope) {
      return {
        mergedCart: accountEnvelope.cart,
        addedByVendor: {},
        conflicts: [],
        source: "cache",
        degraded: true,
        error,
      };
    }
    throw error;
  }

  assertCurrentOwner();

  const remoteData = snapshot.exists() ? snapshot.data() || {} : {};
  let cart = normalizeCart(remoteData.cart);
  let source = "server";
  let addedByVendor = {};
  let conflicts = [];
  let resolvedRevision = hydrationStartedRevision;

  // The UI can render an owner-bound cache while this network read is in
  // flight. If a cart action advanced that cache, it is newer than the remote
  // snapshot captured by this hydration and must win.
  const latestAfterRead = readCartEnvelope(ownerKey);
  if (
    latestAfterRead &&
    Number(latestAfterRead.revision || 0) > hydrationStartedRevision
  ) {
    cart = latestAfterRead.cart;
    resolvedRevision = Number(latestAfterRead.revision || 0);
    source = latestAfterRead.dirty ? "local-mutation" : "local-write";
  } else if (accountEnvelope?.dirty) {
    assertCurrentOwner();
    cart = accountEnvelope.legacy
      ? mergeLegacyCart(cart, accountEnvelope.cart)
      : accountEnvelope.cart;
    source = accountEnvelope.legacy ? "legacy-merge" : "offline-cache";
    const replayResult = await persistCart({
      userId: uid,
      cart,
      replayPending: true,
    });
    assertCurrentOwner();
    const replayedEnvelope = readCartEnvelope(ownerKey);
    cart = replayedEnvelope?.cart || replayResult.cart;
    resolvedRevision = Number(replayedEnvelope?.revision || 0);
    if (
      accountEnvelope.pendingGuestImportId &&
      !replayedEnvelope?.pendingGuestImportId
    ) {
      const importedGuestSnapshot = {
        guestImportId: accountEnvelope.pendingGuestImportId,
        cart:
          accountEnvelope.pendingGuestCart ||
          (guestEnvelope?.guestImportId === accountEnvelope.pendingGuestImportId
            ? guestEnvelope.cart
            : {}),
        revision: Number(
          accountEnvelope.pendingGuestRevision ?? guestEnvelope?.revision ?? 0,
        ),
      };
      if (
        guestEnvelope?.guestImportId === accountEnvelope.pendingGuestImportId
      ) {
        guestEnvelope = rollGuestEnvelopeAfterImport(importedGuestSnapshot);
      }
      source = "guest-merge";
    }
  }

  if (guestEnvelope && hasCartItems(guestEnvelope.cart)) {
    if (
      guestEnvelope.guestImportId &&
      remoteData.lastGuestCartImportId === guestEnvelope.guestImportId
    ) {
      assertCurrentOwner();
      guestEnvelope = rollGuestEnvelopeAfterImport(guestEnvelope);
      source = "guest-merge";
    }

    if (guestEnvelope && hasCartItems(guestEnvelope.cart)) {
      const accountCartBeforeImport = cart;
      let stagedGuest = guestEnvelope;
      let result = null;
      let staged = false;

      // Local-storage writes are synchronous, so this normally succeeds on
      // the first pass. Retrying handles a second browser context changing the
      // guest basket during the handoff without importing any shared line
      // twice.
      for (let attempt = 0; attempt < 8; attempt += 1) {
        assertCurrentOwner();
        result = mergeGuestCart(accountCartBeforeImport, stagedGuest.cart);
        const current = readCartEnvelope(ownerKey);
        const revision = Number(current?.revision || 0) + 1;
        const stagedAccountEnvelope = writeCartEnvelope(
          ownerKey,
          result.merged,
          {
          dirty: true,
          revision,
          pendingGuestImportId: stagedGuest.guestImportId,
          pendingGuestCart: stagedGuest.cart,
          pendingGuestBaseCart: accountCartBeforeImport,
          pendingGuestRevision: stagedGuest.revision,
          },
        );

        if (!stagedAccountEnvelope.cachePersisted) {
          const cacheError = new Error(
            "Guest cart could not be staged for account import",
          );
          cacheError.code = "cart/cache-write-failed";
          throw cacheError;
        }

        const consumption = consumeGuestEnvelope(stagedGuest);
        if (consumption.consumed) {
          staged = true;
          break;
        }
        if (
          consumption.current?.guestImportId === stagedGuest.guestImportId
        ) {
          stagedGuest = consumption.current;
          continue;
        }
        // A different generation is already present. Leave it untouched and
        // finish the captured generation from its durable account snapshot.
        staged = true;
        break;
      }

      if (!staged || !result) {
        throw new Error("Guest cart changed repeatedly during sign-in");
      }

      cart = result.merged;
      addedByVendor = result.addedByVendor;
      conflicts = result.conflicts;
      assertCurrentOwner();
      const guestWrite = await persistCart({
        userId: uid,
        cart,
        guestCartToMerge: stagedGuest.cart,
        documentMetadata: {
          lastGuestCartImportId: stagedGuest.guestImportId,
          guestCartImportedAt: serverTimestamp(),
        },
      });
      assertCurrentOwner();
      cart = guestWrite.cart;
      resolvedRevision = Number(readCartEnvelope(ownerKey)?.revision || 0);
      guestEnvelope = rollGuestEnvelopeAfterImport(stagedGuest);
      source = "guest-merge";
    }
  }

  assertCurrentOwner();
  const latestBeforeFinalize = readCartEnvelope(ownerKey);
  const latestHasPendingMutations = Boolean(
    latestBeforeFinalize?.pendingMutations?.length,
  );
  if (
    latestBeforeFinalize &&
    (Number(latestBeforeFinalize.revision || 0) > resolvedRevision ||
      latestBeforeFinalize.dirty ||
      latestHasPendingMutations)
  ) {
    // A mutation landed during hydration/finalization, or an earlier replay is
    // still queued. Never mark that envelope clean or replace its optimistic
    // cart with the older server snapshot.
    cart = latestBeforeFinalize.cart;
    source = latestBeforeFinalize.dirty ? "local-mutation" : "local-write";
  } else {
    writeCartEnvelope(ownerKey, cart, {
      dirty: false,
      legacy: false,
      pendingGuestImportId: null,
      pendingGuestCart: null,
      pendingGuestBaseCart: null,
      pendingGuestRevision: null,
      lastSyncedAt: Date.now(),
    });
  }

  return { mergedCart: cart, addedByVendor, conflicts, source, degraded: false };
};

export const hydrateAuthenticatedCart = (
  uid,
  { force = false, importGuest = false } = {},
) => {
  if (!uid) return Promise.resolve(null);
  const shouldImportGuest = Boolean(importGuest);
  if (force || shouldImportGuest) hydrationResults.delete(uid);
  if (!force && !shouldImportGuest && hydrationResults.has(uid)) {
    return Promise.resolve(hydrationResults.get(uid));
  }

  const activeHydration = hydrationPromises.get(uid);
  if (activeHydration) {
    if (!shouldImportGuest || activeHydration.importGuest) {
      return activeHydration.promise;
    }

    // A validated login arrived while passive auth hydration was still in
    // flight. Serialize the two reads, then force the explicit guest import;
    // returning the passive promise here would silently strand the guest cart.
    return activeHydration.promise
      .catch(() => undefined)
      .then(() =>
        hydrateAuthenticatedCart(uid, {
          force: true,
          importGuest: true,
        }),
      );
  }

  let promise;
  promise = hydrateUser(uid, { importGuest: shouldImportGuest })
    .then((result) => {
      hydrationResults.set(uid, result);
      return result;
    })
    .finally(() => {
      if (hydrationPromises.get(uid)?.promise === promise) {
        hydrationPromises.delete(uid);
      }
    });
  hydrationPromises.set(uid, {
    promise,
    importGuest: shouldImportGuest,
  });
  return promise;
};

export const clearCartHydrationSession = (uid) => {
  if (uid) hydrationResults.delete(uid);
};

export const subscribeToAuthenticatedCart = (
  uid,
  onCart,
  onError,
  { importGuest = false } = {},
) => {
  if (!uid) return () => {};
  const ownerKey = cartOwnerKey(uid);
  return onSnapshot(
    doc(db, "carts", uid),
    { includeMetadataChanges: true },
    (snapshot) => {
      const envelope = readCartEnvelope(ownerKey);
      // An empty Firestore memory-cache event is not proof that a user's
      // server cart is empty. Wait for a server-backed snapshot instead of
      // flashing or persisting a false empty state on a cold native launch.
      if (
        snapshot.metadata.fromCache &&
        ((!snapshot.exists() && !envelope) || envelope?.lastSyncedAt)
      ) {
        return;
      }
      // Do not let a delayed snapshot roll back an optimistic/offline write.
      // When connectivity returns, retry the owner-bound local state first.
      if (envelope?.dirty || writeQueues.has(uid)) {
        if (envelope?.dirty && !writeQueues.has(uid)) {
          persistCart({
            userId: uid,
            cart: envelope.cart,
            replayPending: true,
          })
            .then((result) => {
              // A newer optimistic mutation may have been queued while this
              // replay transaction was in flight. Its Redux state must win.
              if (result?.isLatest) onCart?.(result.cart);
            })
            .catch((error) => onError?.(error));
        }
        return;
      }

      const remoteData = snapshot.exists() ? snapshot.data() || {} : {};
      const remoteRevision = Number(remoteData.cartClientRevision || 0);
      const remoteDevice = remoteData.cartUpdatedByDevice || null;
      if (
        envelope &&
        remoteDevice === getDeviceId() &&
        remoteRevision < Number(envelope.revision || 0)
      ) {
        // Ignore an out-of-order acknowledgement/snapshot from this device.
        return;
      }

      const guestEnvelope = readCartEnvelope(GUEST_CART_OWNER);
      if (
        importGuest &&
        guestEnvelope &&
        hasCartItems(guestEnvelope.cart)
      ) {
        hydrateAuthenticatedCart(uid, {
          force: true,
          importGuest: true,
        })
          .then((result) => onCart?.(result?.mergedCart || {}))
          .catch((error) => onError?.(error));
        return;
      }
      const cart = normalizeCart(remoteData.cart);
      writeCartEnvelope(ownerKey, cart, {
        dirty: false,
        lastSyncedAt: Date.now(),
      });
      hydrationResults.set(uid, {
        mergedCart: cart,
        addedByVendor: {},
        conflicts: [],
        source: "realtime",
        degraded: false,
      });
      onCart?.(cart);
    },
    (error) => onError?.(error),
  );
};
