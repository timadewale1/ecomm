import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../../firebase.config";

// Action Types
const FETCH_VENDORS_REQUEST = "vendors/FETCH_VENDORS_REQUEST";
const FETCH_VENDORS_SUCCESS = "vendors/FETCH_VENDORS_SUCCESS";
const FETCH_VENDORS_FAILURE = "vendors/FETCH_VENDORS_FAILURE";

// Initial State
const initialState = {
  local: [],
  online: [],
  isFetched: false,
  status: "idle", // idle, loading, succeeded, failed
  error: null,
};

// Action Creators
export const fetchVendorsRequest = () => ({
  type: FETCH_VENDORS_REQUEST,
});

export const fetchVendorsSuccess = (payload) => ({
  type: FETCH_VENDORS_SUCCESS,
  payload,
});

export const fetchVendorsFailure = (error) => ({
  type: FETCH_VENDORS_FAILURE,
  error,
});

// Async Thunk to Fetch Vendors
export const fetchVendors = () => async (dispatch) => {
  dispatch(fetchVendorsRequest());

  try {
    const localVendorQuery = query(
      collection(db, "vendors"),
      where("marketPlaceType", "==", "marketplace"),
      where("isDeactivated", "==", false),
      where("isApproved", "==", true)
    );
    const localVendorSnapshot = await getDocs(localVendorQuery);
    const localVendors = localVendorSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    const onlineVendorQuery = query(
      collection(db, "vendors"),
      where("marketPlaceType", "==", "virtual"),
      where("isDeactivated", "==", false),
      where("isApproved", "==", true)
    );
    const onlineVendorSnapshot = await getDocs(onlineVendorQuery);
    const onlineVendors = onlineVendorSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    dispatch(fetchVendorsSuccess({ localVendors, onlineVendors }));
  } catch (error) {
    dispatch(fetchVendorsFailure(error.message));
  }
};

// Reducer
const vendorReducer = (state = initialState, action) => {
  switch (action.type) {
    case FETCH_VENDORS_REQUEST:
      return { ...state, status: "loading", error: null };
    case FETCH_VENDORS_SUCCESS:
      return {
        ...state,
        local: action.payload.localVendors,
        online: action.payload.onlineVendors,
        isFetched: true,
        status: "succeeded",
        error: null,
      };
    case FETCH_VENDORS_FAILURE:
      return { ...state, status: "failed", error: action.error };
    default:
      return state;
  }
};

export default vendorReducer;
