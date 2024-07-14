import { db } from "../../firebase.config";
import { doc, setDoc, deleteDoc, getDoc } from "firebase/firestore";
import { toast } from "react-toastify";

export const TOGGLE_FAVORITE = 'TOGGLE_FAVORITE';

export const toggleFavorite = (productId) => async (dispatch, getState) => {
  const { currentUser } = getState().auth;

  if (!currentUser) {
    toast.error("You need to be logged in to favorite items");
    return;
  }

  const favoriteRef = doc(db, "favorites", currentUser.uid, "products", productId);

  try {
    const favoriteDoc = await getDoc(favoriteRef);
    if (favoriteDoc.exists()) {
      await deleteDoc(favoriteRef);
      dispatch({ type: TOGGLE_FAVORITE, payload: productId });
      toast.info("Removed from favorites");
    } else {
      await setDoc(favoriteRef, { productId });
      dispatch({ type: TOGGLE_FAVORITE, payload: productId });
      toast.success("Added to favorites");
    }
  } catch (error) {
    toast.error("Error updating favorites: " + error.message);
  }
};
