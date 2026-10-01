import {httpsCallable} from "firebase/functions";
import {auth, functions} from "../firebase.config";
import {createChatParticipantClient} from "./chatParticipantClient.mjs";

export const getChatParticipantProfile = createChatParticipantClient({
  currentUser: () => auth.currentUser,
  call: data => httpsCallable(functions, "getChatParticipantProfileV1", {timeout: 15000})(data),
});
