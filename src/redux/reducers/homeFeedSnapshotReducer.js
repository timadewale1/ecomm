// src/redux/reducers/homeFeedSnapshotReducer.js
import {
  SAVE_HOMEFEED_SNAPSHOT,
  CLEAR_HOMEFEED_SNAPSHOT,
} from "../actions/homeFeedSnapshot";

const initialState = {
  snapshot: null,
};

export default function homeFeedSnapshotReducer(state = initialState, action) {
  switch (action.type) {
    case SAVE_HOMEFEED_SNAPSHOT:
      return { ...state, snapshot: action.payload };
    case CLEAR_HOMEFEED_SNAPSHOT:
      return { ...state, snapshot: null };
    default:
      return state;
  }
}
