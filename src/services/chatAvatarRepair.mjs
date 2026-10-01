// Match functions/participantAvatars.js. Repairs never block rendering or emit
// messages; normal conversation snapshots deliver the repaired images.
const AVATAR_VERSION = 2;
const BATCH_SIZE = 10;
const RETRY_DELAY = 60_000;

export function createChatAvatarRepair({getUid, request, now = Date.now, onError = () => {}}) {
  let owner = null;
  let generation = 0;
  let runningGeneration = null;
  const pending = new Set();
  const attemptedAt = new Map();
  const reset = () => {
    generation += 1;
    owner = null;
    runningGeneration = null;
    pending.clear();
    attemptedAt.clear();
  };
  const drain = async () => {
    const token = generation;
    if (runningGeneration === token) return;
    runningGeneration = token;
    try {
      while (pending.size && generation === token && owner === getUid()) {
        const ids = [...pending].slice(0, BATCH_SIZE);
        ids.forEach((id) => pending.delete(id));
        try { await request(ids); }
        catch (error) {
          if (generation === token) onError(error);
          // Keep failed batches out of a tight retry loop. A later snapshot or
          // visit may retry after the cooldown; the last known UI remains usable.
        }
      }
    } finally {
      if (runningGeneration === token) runningGeneration = null;
    }
  };
  const enqueue = (conversations) => {
    const uid = getUid();
    if (owner !== uid) { reset(); owner = uid; }
    if (!uid) return;
    const timestamp = now();
    for (const [id, time] of attemptedAt) {
      if (timestamp - time >= RETRY_DELAY) attemptedAt.delete(id);
    }
    for (const conversation of conversations || []) {
      if (!conversation?.id ||
          (conversation.buyerId !== uid && conversation.vendorId !== uid) ||
          (conversation.buyer?.avatarVersion === AVATAR_VERSION && conversation.vendor?.avatarVersion === AVATAR_VERSION) ||
          attemptedAt.has(conversation.id)) continue;
      attemptedAt.set(conversation.id, timestamp);
      pending.add(conversation.id);
    }
    void drain();
  };
  return {enqueue, reset};
}
