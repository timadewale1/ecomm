const initialState = {
  products: [],
  lastVisible: null,
  status: "idle", // idle, loading, succeeded, failed
  error: null,
};

const homepageReducer = (state = initialState, action) => {
  switch (action.type) {
    case "homepage/fetchHomepageData/pending":
      console.log("Fetching homepage data: pending");
      return {
        ...state,
        status: "loading",
      };
    case "homepage/fetchHomepageData/fulfilled":
      console.log("Fetching homepage data: succeeded", action.payload);
      return {
        ...state,
        products: [...state.products, ...action.payload.products],
        lastVisible: action.payload.lastVisible,
        status: "succeeded",
      };
    case "homepage/fetchHomepageData/rejected":
      console.error("Fetching homepage data: failed", action.payload);
      return {
        ...state,
        status: "failed",
        error: action.payload,
      };
    case "RESET_HOMEPAGE_STATE":
      console.log("Resetting homepage state");
      return initialState;
    default:
      return state;
  }
};

export const resetHomepageState = () => ({
  type: "RESET_HOMEPAGE_STATE",
});

export default homepageReducer;
