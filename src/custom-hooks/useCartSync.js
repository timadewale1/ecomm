import { useEffect } from "react";
import { useDispatch } from "react-redux";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../firebase.config";
import { setCart } from "../redux/actions/action";
import {
  cartCacheReady,
  cartOwnerChanged,
  cartSyncDegraded,
  cartSyncReady,
} from "../redux/reducers/cartSyncSlice";
import {
  GUEST_CART_OWNER,
  cartOwnerKey,
  clearCartHydrationSession,
  hydrateAuthenticatedCart,
  mergeGuestCart,
  migrateLegacyCart,
  readCartEnvelope,
  stageAnonymousCartAsGuest,
  subscribeToAuthenticatedCart,
} from "../services/cartPersistence";

/** Owns the cart for the authenticated Firebase identity across every login UI. */
export default function useCartSync({ enabled = true } = {}) {
  const dispatch = useDispatch();

  useEffect(() => {
    if (!enabled) return undefined;

    let generation = 0;
    let unsubscribeCart = null;
    let previousIdentity = null;

    const previewGuestCart = (accountCart = {}) => {
      const guestEnvelope = readCartEnvelope(GUEST_CART_OWNER);
      const hasGuestItems = Object.values(guestEnvelope?.cart || {}).some(
        (vendor) => Object.keys(vendor?.products || {}).length > 0,
      );
      return hasGuestItems
        ? mergeGuestCart(accountCart, guestEnvelope.cart).merged
        : accountCart;
    };

    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      const run = ++generation;
      unsubscribeCart?.();
      unsubscribeCart = null;

      const previousUid = previousIdentity?.uid || null;
      const nextUid = user?.uid || null;

      // Quick checkout can own its cart under a temporary anonymous Firebase
      // UID. Before Firebase replaces that principal with an existing account
      // (or signs it out), move the local recovery copy back to a fresh guest
      // generation so the validated buyer-login flow can import it once.
      if (
        previousIdentity?.isAnonymous &&
        previousUid &&
        previousUid !== nextUid
      ) {
        try {
          stageAnonymousCartAsGuest(previousUid);
        } catch (error) {
          console.error("Anonymous cart handoff failed:", error);
        }
      }

      if (previousUid && previousUid !== nextUid) {
        clearCartHydrationSession(previousUid);
      }
      previousIdentity = user
        ? { uid: user.uid, isAnonymous: Boolean(user.isAnonymous) }
        : null;

      const ownerKey = cartOwnerKey(nextUid);
      dispatch(cartOwnerChanged(ownerKey));

      if (!nextUid) {
        // Raw auth changes are not proof of an intentional customer logout.
        // Vendor rejection, email-verification rejection and deactivation
        // must not erase this device's basket. Explicit logout owns clearing.
        const guest = migrateLegacyCart(GUEST_CART_OWNER);
        dispatch(setCart(guest?.cart || {}));
        dispatch(cartSyncReady(GUEST_CART_OWNER, guest ? "cache" : "empty"));
        return;
      }

      const cached = migrateLegacyCart(ownerKey) || readCartEnvelope(ownerKey);
      // Keep both baskets visible while the transactional import runs. This
      // avoids the account cache briefly replacing (and appearing to lose)
      // items the customer added before signing in.
      const optimisticCart = previewGuestCart(cached?.cart || {});
      if (optimisticCart) {
        dispatch(setCart(optimisticCart));
        dispatch(cartCacheReady(ownerKey, "cache"));
      }

      try {
        const result = await hydrateAuthenticatedCart(user.uid, {
          importGuest: false,
        });
        if (run !== generation || auth.currentUser?.uid !== user.uid) return;
        dispatch(setCart(previewGuestCart(result?.mergedCart || {})));
        if (result?.degraded) {
          dispatch(cartSyncDegraded(ownerKey, result.error));
        } else {
          dispatch(cartSyncReady(ownerKey, result?.source || "server"));
        }

        unsubscribeCart = subscribeToAuthenticatedCart(
          user.uid,
          (cart) => {
            if (run !== generation || auth.currentUser?.uid !== user.uid) return;
            dispatch(setCart(previewGuestCart(cart)));
            dispatch(cartSyncReady(ownerKey, "realtime"));
          },
          (error) => {
            if (run === generation) dispatch(cartSyncDegraded(ownerKey, error));
          },
          { importGuest: false },
        );
      } catch (error) {
        if (run !== generation || auth.currentUser?.uid !== user.uid) return;
        // Hydration can stage the guest basket into the account envelope
        // before a network write fails. Read that newest envelope here rather
        // than restoring the pre-hydration account cache, otherwise guest
        // items briefly disappear (or look lost) after an offline sign-in.
        const latestOwnerEnvelope = readCartEnvelope(ownerKey) || cached;
        dispatch(
          setCart(
            previewGuestCart(
              latestOwnerEnvelope?.cart || optimisticCart || {},
            ),
          ),
        );
        dispatch(
          cartSyncDegraded(ownerKey, error, Boolean(latestOwnerEnvelope)),
        );
        // A listener also acts as recovery: once Firestore reconnects it
        // supplies the authoritative cart and transitions this owner to ready.
        unsubscribeCart = subscribeToAuthenticatedCart(
          user.uid,
          (cart) => {
            if (run !== generation || auth.currentUser?.uid !== user.uid) return;
            dispatch(setCart(previewGuestCart(cart)));
            dispatch(cartSyncReady(ownerKey, "realtime"));
          },
          (listenerError) => {
            if (run === generation) {
              dispatch(
                cartSyncDegraded(ownerKey, listenerError, Boolean(cached)),
              );
            }
          },
          { importGuest: false },
        );
      }
    });

    return () => {
      generation += 1;
      unsubscribeAuth();
      unsubscribeCart?.();
    };
  }, [dispatch, enabled]);
}
