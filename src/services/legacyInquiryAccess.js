import {httpsCallable} from "firebase/functions";
import {auth, functions} from "../firebase.config";
import {createScopedChatCallable} from "./chatRequestScope.mjs";
const call = createScopedChatCallable({getSession: () => auth.currentUser,
  invoke: (name, data) => httpsCallable(functions, name)(data)});
export const prepareLegacyInquiryView = inquiryId => call("prepareLegacyInquiryViewV1", {inquiryId});
export const updateLegacyInquiry = (inquiryId, action, details = {}) =>
  call("updateLegacyInquiryV1", {...details, inquiryId, action});
