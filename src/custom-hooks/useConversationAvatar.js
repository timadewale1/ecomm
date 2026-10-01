import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useAuth } from "./useAuth";
import { fetchCustomerProfile } from "../redux/reducers/vendorChatSlice";
import { conversationAvatarSource, legacyChatCustomerId } from "../services/conversationAvatar.mjs";

export default function useConversationAvatar(conversation, audience) {
  const dispatch = useDispatch();
  const { currentUser, loading } = useAuth();
  const customerId = legacyChatCustomerId(
    conversation,
    audience,
    loading ? null : currentUser?.uid,
  );
  const customerProfile = useSelector((state) =>
    customerId && state.vendorChats.ownerUid === currentUser?.uid
      ? state.vendorChats.profiles[customerId] : null,
  );

  useEffect(() => {
    if (customerId && conversation?.id) void dispatch(fetchCustomerProfile({customerId, conversationId: conversation.id}));
    // The thunk deduplicates list/header reads and retains the cached photo.
    // Do not depend on request state: a failed read must not cause a retry loop.
  }, [customerId, conversation?.id, currentUser?.uid, dispatch]);

  return conversationAvatarSource(conversation, audience, customerProfile);
}
