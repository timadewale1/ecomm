// Action Types
export const SET_PROMO_IMAGES = "SET_PROMO_IMAGES";
export const SET_PROMO_LOADING = "SET_PROMO_LOADING";

// Action Creators
export const setPromoImages = (images) => ({
  type: SET_PROMO_IMAGES,
  payload: images,
});

export const setPromoLoading = (loading) => ({
  type: SET_PROMO_LOADING,
  payload: loading,
});
