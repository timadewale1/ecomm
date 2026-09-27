import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  collection,
  doc,
  onSnapshot,
  serverTimestamp,
  writeBatch,
} from "firebase/firestore";
import { db } from "../../firebase.config";
import { useAuth } from "../../custom-hooks/useAuth";
import {
  favoriteAdded,
  favoriteRemoved,
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

    const uid = currentUser?.uid || null;
    const isBuyer = currentUserData?.role === "user";

    if (!uid || !isBuyer) {
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
      preserveLocal
        ? cached.favorites.map((product) => [
            product?.id || product?.productId,
            product,
          ])
        : []
    );
    let disposed = false;

    dispatch(favoritesCloudSyncStarted({ uid, preserveLocal }));

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
            ids,
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
      void (async () => {
        try {
          // Firestore batches support at most 500 writes. Stay below that
          // ceiling so a large long-lived guest list remains safe to migrate.
          for (let start = 0; start < guestIds.length; start += 400) {
            const ids = guestIds.slice(start, start + 400);
            const batch = writeBatch(db);
            ids.forEach((productId) => {
              const product = guestProducts.get(productId) || {};
              batch.set(
                doc(db, "users", uid, "favorites", productId),
                {
                  productId,
                  vendorId: product?.vendorId || null,
                  name: product?.name || "",
                  price: Number(product?.price || 0),
                  createdAt: serverTimestamp(),
                },
                { merge: true }
              );
            });
            await batch.commit();
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
    currentUserData?.role,
    dispatch,
    syncGeneration,
  ]);

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
    }),
    [favorites, addFavorite, removeFavorite, isFavorite, retryCloudSync]
  );

  return (
    <FavoritesContext.Provider value={value}>
      {children}
    </FavoritesContext.Provider>
  );
};

export const useFavorites = () => useContext(FavoritesContext);
