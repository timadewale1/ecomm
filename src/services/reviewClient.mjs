export const reviewVersion = (review) => review.instanceId ||
  `legacy:${review.createdAt?.seconds ?? review.createdAt?._seconds ?? 0}:${review.createdAt?.nanoseconds ?? review.createdAt?._nanoseconds ?? 0}`;

export function createReviewClient({currentUser, call}) {
  return async function reviewRequest(name, payload, expectedUid) {
    const session = currentUser();
    if (!session?.uid || session.uid !== expectedUid) throw new Error("Please sign in again before managing your review.");
    const response = await call(name, payload);
    if (currentUser() !== session) throw new Error("Your account changed. Please reopen this page.");
    const result = response.data;
    if (!result || typeof result !== "object") throw new Error("Your review response could not be confirmed. Please retry.");
    if (result.review?.createdAt?._seconds !== undefined) {
      result.review.createdAt = {seconds: result.review.createdAt._seconds, nanoseconds: result.review.createdAt._nanoseconds || 0};
    }
    return result;
  };
}
