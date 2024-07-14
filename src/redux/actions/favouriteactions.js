export const TOGGLE_FAVORITE = 'TOGGLE_FAVORITE';

export const toggleFavorite = (productId) => ({
  type: TOGGLE_FAVORITE,
  payload: productId,
});
