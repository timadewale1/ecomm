import { SEARCH_SAVE_SNAPSHOT, SEARCH_CLEAR_SNAPSHOT } from "../actions/searchSnapshot";

const initialState = {
  snapshot: null,
};

export default function searchSnapshotReducer(state = initialState, action) {
  switch (action.type) {
    case SEARCH_SAVE_SNAPSHOT:
      return { ...state, snapshot: action.payload };
    case SEARCH_CLEAR_SNAPSHOT:
      return { ...state, snapshot: null };
    default:
      return state;
  }
}
