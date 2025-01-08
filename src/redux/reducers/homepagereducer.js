const initialState = {
  products: [],
  approvedVendors: [],
  lastVisible: null,
  status: "idle", // idle, loading, succeeded, failed
  error: null,
};

const homepageReducer = (state = initialState, action) => {
  switch (action.type) {
    case "homepage/fetchHomepageData/fulfilled":
      const existingProductIds = new Set(state.products.map((p) => p.id));
      const newProducts = action.payload.products.filter(
        (product) => !existingProductIds.has(product.id)
      );

      return {
        ...state,
        products: [...state.products, ...newProducts], // Avoid duplicates
        lastVisible: action.payload.lastVisible,
        status: "succeeded",
      };

    default:
      return state;
  }
};


export const resetHomepageState = () => ({
  type: "RESET_HOMEPAGE_STATE",
});

export default homepageReducer;
