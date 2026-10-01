import {createSlice, createAsyncThunk} from "@reduxjs/toolkit";
import {auth} from "../../firebase.config";
import {getChatParticipantProfile} from "../../services/chatParticipantProfiles";

const PROFILE_CACHE_MS = 5 * 60 * 1000;
const PROFILE_RETRY_MS = 60 * 1000;
const loadCustomerProfile = createAsyncThunk(
  "vendorChats/fetchCustomerProfile",
  async (request, {rejectWithValue}) => {
    try { return await getChatParticipantProfile(request); }
    catch (error) { return rejectWithValue(error.message); }
  },
  {condition: ({customerId, conversationId, inquiryId, ownerUid}, {getState}) => {
    if (!ownerUid || auth.currentUser?.uid !== ownerUid || !customerId || !(conversationId || inquiryId)) return false;
    const state = getState().vendorChats;
    if (state.ownerUid !== ownerUid) return true;
    const request = state.profileRequests?.[customerId];
    if (request?.status === "loading") return false;
    const age = Date.now() - (request?.updatedAt || 0);
    return !(request?.status === "ready" && age < PROFILE_CACHE_MS) &&
      !(request?.status === "error" && age < PROFILE_RETRY_MS);
  }},
);

export const fetchCustomerProfile = request => dispatch => {
  const ownerUid = auth.currentUser?.uid;
  if (ownerUid) return dispatch(loadCustomerProfile({...request, ownerUid}));
};

const vendorChatSlice = createSlice({
  name: "vendorChats",
  initialState: {ownerUid: null, profiles: {}, profileRequests: {}, status: "idle", error: null},
  reducers: {},
  extraReducers: builder => builder
    .addCase(loadCustomerProfile.pending, (state, action) => {
      const {ownerUid, customerId} = action.meta.arg;
      if (state.ownerUid !== ownerUid) {
        state.ownerUid = ownerUid;
        state.profiles = {};
        state.profileRequests = {};
      }
      state.profileRequests[customerId] = {status: "loading", requestId: action.meta.requestId, updatedAt: Date.now()};
    })
    .addCase(loadCustomerProfile.fulfilled, (state, action) => {
      const {ownerUid, customerId} = action.meta.arg;
      const request = state.profileRequests[customerId];
      if (state.ownerUid !== ownerUid || request?.requestId !== action.meta.requestId) return;
      state.profiles[customerId] = action.payload;
      request.status = "ready";
      request.updatedAt = Date.now();
      state.error = null;
    })
    .addCase(loadCustomerProfile.rejected, (state, action) => {
      const {ownerUid, customerId} = action.meta.arg;
      const request = state.profileRequests[customerId];
      if (state.ownerUid !== ownerUid || request?.requestId !== action.meta.requestId) return;
      request.status = "error";
      request.updatedAt = Date.now();
      state.error = action.payload || "Could not load the chat profile.";
    }),
});
export default vendorChatSlice.reducer;
