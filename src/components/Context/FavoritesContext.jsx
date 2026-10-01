import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useDispatch, useSelector, useStore } from "react-redux";
import { toast } from "react-toastify";
import { collection, onSnapshot } from "firebase/firestore";
import { auth, db } from "../../firebase.config";
import { useAuth } from "../../custom-hooks/useAuth";
import { mergeGuestFavorites, setFavoriteState, favoriteStateErrorMessage } from "../../services/favoriteState";
import { createFavoriteIntentQueue, favoriteCountVersion } from "../../services/favoriteIntentQueue.mjs";
import { track } from "../../services/signals";
import {
  favoriteAdded,
  favoriteRemoved,
  favoriteViewChanged,
  favoritesCloudSnapshotReceived,
  favoritesCloudSyncFailed,
  favoritesCloudSyncStarted,
  favoritesGuestMergeCompleted,
  favoritesGuestMergeFailed,
  favoritesSignedOut,
  selectFavoriteIds,
  selectFavoriteProducts,
  selectFavoritesOwnerUid,
  selectFavoritesPendingGuestMergeIds,
} from "../../redux/reducers/favoritesSlice";

const FavoritesContext = createContext();

export const FavoritesProvider = ({ children }) => {
  const dispatch = useDispatch();
  const store = useStore();
  const guestMergeRef = useRef(null);
  const queueRef = useRef(null);
  if (!queueRef.current) queueRef.current = createFavoriteIntentQueue({
    readLiked: (id) => store.getState().favorites.ids.includes(id),
    publish: (state) => dispatch(favoriteViewChanged(state)),
    save: async (request) => {
      // Finish importing guest items before an unlike can remove one of them.
      if (guestMergeRef.current) await guestMergeRef.current.catch(() => {});
      return setFavoriteState(request);
    },
    onError: (error) => {
      console.error("[favorites] save failed", { code: error?.code, message: error?.message });
      toast.error(favoriteStateErrorMessage(error), { toastId: "favorite-save-error" });
    },
    onCommit: ({ product, liked, context }) => {
      if (context?.surface !== "product_detail") return;
      track(liked ? "product_like" : "product_unlike", {
        surface: "product_detail", productId: product.id, vendorId: product.vendorId,
        ...(liked ? { priceShown: context.priceShown ?? product.price, currency: "NGN" } : {}),
      }, { surface: "product_detail" });
    },
  });
  const { currentUser, currentUserData, loading: authLoading } = useAuth();
  const favoriteIds = useSelector(selectFavoriteIds);
  const favorites = useSelector(selectFavoriteProducts);
  const ownerUid = useSelector(selectFavoritesOwnerUid);
  const pendingGuestMergeIds = useSelector(
    selectFavoritesPendingGuestMergeIds
  );
  const favoritesStateRef = useRef({
    ownerUid,
    favoriteIds,
    favorites,
    pendingGuestMergeIds,
  });
  const [syncGeneration, setSyncGeneration] = useState(0);

  favoritesStateRef.current = {
    ownerUid,
    favoriteIds,
    favorites,
    pendingGuestMergeIds,
  };

  const retryCloudSync = useCallback(() => {
    setSyncGeneration((generation) => generation + 1);
  }, []);

  useEffect(() => {
    if (authLoading) return undefined;

    const uid = currentUser?.isAnonymous ? null : currentUser?.uid || null;
    const isBuyer = currentUserData?.role === "user";

    // A temporarily unhydrated profile is not a sign-out.
    if (uid && !currentUserData?.role) return undefined;

    if (!uid || !isBuyer) {
      queueRef.current.setOwner(null);
      dispatch(favoritesSignedOut());
      return undefined;
    }

    const cached = favoritesStateRef.current;
    const preserveLocal = cached.ownerUid === null && cached.favoriteIds.length > 0;
    const guestIds = preserveLocal
      ? [...cached.favoriteIds]
      : cached.ownerUid === uid
        ? [...cached.pendingGuestMergeIds]
        : [];
    const guestProducts = new Map(
      cached.favorites.map((product) => [
        product?.id || product?.productId,
        product,
      ])
    );
    let disposed = false;

    dispatch(favoritesCloudSyncStarted({ uid, preserveLocal }));
    queueRef.current.setOwner(uid, store.getState().favorites.pendingIntents);

    const unsubscribe = onSnapshot(
      collection(db, "users", uid, "favorites"),
      { includeMetadataChanges: true },
      (snapshot) => {
        if (disposed) return;
        const ids = snapshot.docs
          .map((favoriteDoc) => ({
            id: favoriteDoc.id,
            createdAt:
              favoriteDoc.data()?.createdAt?.toMillis?.() || 0,
          }))
          .sort((first, second) => second.createdAt - first.createdAt)
          .map((favorite) => favorite.id);

        dispatch(
          favoritesCloudSnapshotReceived({
            uid,
            ids: queueRef.current.reconcile(
              [...new Set([...ids, ...store.getState().favorites.pendingGuestMergeIds])],
              !snapshot.metadata.fromCache,
            ),
            fromCache: snapshot.metadata.fromCache,
          })
        );
      },
      (error) => {
        if (disposed) return;
        console.error("[favorites] Cloud hydration failed:", error);
        dispatch(
          favoritesCloudSyncFailed({
            uid,
            message: error?.message || "Saved favourites could not be loaded.",
          })
        );
      }
    );

    if (guestIds.length > 0) {
      guestMergeRef.current = (async () => {
        try {
          // The server transaction owns membership and both public counters.
          // Bounded chunks keep the transaction comfortably below Firestore's
          // read/write limits while retries remain safe for an existing item.
          for (let start = 0; start < guestIds.length; start += 80) {
            const ids = guestIds.slice(start, start + 80);
            if (disposed) return;
            await mergeGuestFavorites(
              ids.map((productId) => ({
                ...(guestProducts.get(productId) || {}),
                id: productId,
              })),
              uid,
            );
          }

          if (!disposed) {
            dispatch(favoritesGuestMergeCompleted({ uid, ids: guestIds }));
          }
        } catch (error) {
          if (disposed) return;
          console.error("[favorites] Guest merge failed:", error);
          dispatch(
            favoritesGuestMergeFailed({
              uid,
              message:
                error?.message || "Saved favourites could not be synced.",
            })
          );
        }
      })();
    }

    return () => {
      disposed = true;
      unsubscribe();
    };
  }, [
    authLoading,
    currentUser?.uid,
    currentUser?.isAnonymous,
    currentUserData?.role,
    dispatch,
    syncGeneration,
    store,
  ]);

  useEffect(() => {
    const flush = () => queueRef.current.flush();
    window.addEventListener("pagehide", flush);
    const onVisibility = () => { if (document.hidden) flush(); };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("pagehide", flush);
      document.removeEventListener("visibilitychange", onVisibility);
      queueRef.current.dispose();
    };
  }, []);

  const observeFavorite = useCallback((product) => queueRef.current.observe(product), []);
  const toggleFavorite = useCallback((product, context) => {
    // Bind queued writes to the Firebase account that actually owns the tap.
    const uid = auth.currentUser && !auth.currentUser.isAnonymous ? auth.currentUser.uid : null;
    queueRef.current.setOwner(uid, store.getState().favorites.ownerUid === uid
      ? store.getState().favorites.pendingIntents : {});
    return queueRef.current.toggle(product, context);
  }, [store]);

  const addFavorite = useCallback((product) => {
    const productId = product?.id || product?.productId;
    if (!productId) return;

    dispatch(favoriteAdded({ ...product, id: productId }));
  }, [dispatch]);

  const removeFavorite = useCallback((productId) => {
    dispatch(favoriteRemoved(productId));
  }, [dispatch]);

  const isFavorite = useCallback(
    (productId) => Boolean(productId && favoriteIds.includes(productId)),
    [favoriteIds]
  );

  // Keep the old storage key current for older releases and web sessions that
  // have not migrated to the persisted Redux slice yet.
  useEffect(() => {
    try {
      window.localStorage?.setItem("favorites", JSON.stringify(favorites));
    } catch {
      // Some embedded browsers expose localStorage but block writes.
    }
  }, [favorites]);

  const value = useMemo(
    () => ({
      favorites,
      addFavorite,
      removeFavorite,
      isFavorite,
      retryCloudSync,
      toggleFavorite,
      observeFavorite,
    }),
    [favorites, addFavorite, removeFavorite, isFavorite, retryCloudSync, toggleFavorite, observeFavorite]
  );

  return (
    <FavoritesContext.Provider value={value}>
      {children}
    </FavoritesContext.Provider>
  );
};

export const useFavorites = () => useContext(FavoritesContext);

export const useProductFavorite = (product) => {
  const { observeFavorite, toggleFavorite } = useFavorites();
  const id = product?.id || product?.productId;
  const view = useSelector((state) => state.favorites.views?.[id]);
  const owner = useSelector(selectFavoritesOwnerUid);
  const liked = useSelector((state) => Boolean(id && state.favorites.ids.includes(id)));
  const productRef = useRef(product);
  productRef.current = product;
  const version = favoriteCountVersion(product?.favoriteCountUpdatedAt);
  useEffect(() => {
    if (id) observeFavorite(productRef.current);
  }, [id, product?.wishCount, version, owner, observeFavorite]);
  return {
    favorite: view?.liked ?? liked,
    wishCount: view?.wishCount ?? Math.max(0, Number(product?.wishCount) || 0),
    toggleFavorite: (context) => toggleFavorite(productRef.current, context),
  };
};
