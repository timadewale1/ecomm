export function createChatParticipantClient({currentUser, call}) {
  return async ({conversationId, inquiryId, customerId}) => {
    const session = currentUser();
    if (!session?.uid) throw new Error("Sign in to load this chat.");
    const response = await call(conversationId ? {conversationId} : {inquiryId});
    if (currentUser() !== session) throw new Error("Your account changed. Please reopen this chat.");
    const profile = response.data?.profile;
    if (!profile || (customerId && profile.uid !== customerId)) {
      throw new Error("The chat profile could not be confirmed.");
    }
    // Explicit shape: never put arbitrary server fields into the Redux cache.
    return {uid: profile.uid, displayName: profile.displayName, photoURL: profile.photoURL};
  };
}
