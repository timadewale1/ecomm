// Only older buyer summaries need the same profile lookup used by legacy chats.
// Current summaries include a complete photoURL (including an explicit removal).
export function legacyChatCustomerId(conversation, audience, viewerUid) {
  if (
    audience !== "vendor" ||
    !viewerUid ||
    conversation?.vendorId !== viewerUid ||
    conversation?.participantType === "guest" ||
    Number(conversation?.buyer?.avatarVersion || 0) >= 2
  ) return null;
  const buyerId = conversation?.buyerId;
  return typeof buyerId === "string" && buyerId.trim() && !buyerId.includes("/")
    ? buyerId
    : null;
}

export function conversationAvatarSource(conversation, audience, customerProfile) {
  const counterpart = audience === "vendor" ? conversation?.buyer : conversation?.vendor;
  if (audience === "vendor" && conversation?.participantType === "guest") return "";
  if (
    audience === "vendor" &&
    Number(counterpart?.avatarVersion || 0) < 2 &&
    customerProfile?.uid === conversation?.buyerId
  ) {
    // Do not slice data URIs: built-in avatars are much longer than photo URLs.
    // An empty saved photo means removed, not "fall back to an older picture".
    return customerProfile.photoURL || "";
  }
  return counterpart?.avatarUrl || "";
}
