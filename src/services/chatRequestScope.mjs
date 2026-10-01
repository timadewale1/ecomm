export function captureChatSession(getSession) {
  const session = getSession();
  const assertCurrent = () => {
    if (!session?.uid || session.isAnonymous || getSession() !== session) {
      const error = new Error("Your account changed. Please reopen the conversation.");
      error.code = "auth/session-changed";
      throw error;
    }
  };
  assertCurrent();
  return {uid: session.uid, assertCurrent};
}

export function createScopedChatCallable({getSession, invoke}) {
  return async (name, payload) => {
    const scope = captureChatSession(getSession);
    const response = await invoke(name, payload);
    scope.assertCurrent();
    return response;
  };
}
