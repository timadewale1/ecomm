// No private bytes or bearer links are persisted in Redux, localStorage or URLs.
export function createPrivateMediaTransport({auth, endpoint, fetchImpl = fetch}) {
  return async function request(query, {file, signal} = {}) {
    const session = auth.currentUser;
    if (!session || (file && session.isAnonymous)) throw new Error("Please sign in to continue.");
    const controller = new AbortController();
    const abort = () => controller.abort();
    if (signal?.aborted) abort();
    signal?.addEventListener("abort", abort, {once: true});
    const timeout = setTimeout(abort, 60000);
    const unchanged = () => {
      if (auth.currentUser !== session) throw new Error("Your account changed. Please try again.");
    };
    try {
      const token = await session.getIdToken();
      unchanged();
      const response = await fetchImpl(`${endpoint}?${new URLSearchParams(query)}`, {
        method: file ? "POST" : "GET", credentials: "omit", cache: "no-store", signal: controller.signal,
        headers: {Authorization: `Bearer ${token}`, ...(file ? {"Content-Type": file.type} : {})},
        ...(file ? {body: file} : {}),
      });
      unchanged();
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || "We couldn’t load this image. Please try again.");
      }
      const result = file ? await response.json() : await response.blob();
      unchanged();
      if (!file && !["image/jpeg", "image/png", "image/webp", "image/gif"].includes(result.type)) {
        throw new Error("This image could not be displayed.");
      }
      return result;
    } catch (error) {
      if (signal?.aborted) throw error;
      if (error.name === "AbortError") throw new Error("This is taking longer than expected. Please try again.");
      if (error instanceof TypeError) throw new Error("Connection interrupted. Check your connection and try again.");
      throw error;
    } finally {
      clearTimeout(timeout);
      signal?.removeEventListener("abort", abort);
    }
  };
}
