// Firebase/browser adapters live at the boundary; this state machine can be
// exercised without creating live accounts or touching customer data.
export function createGoogleRedirectCoordinator(deps) {
  let completion;
  return () => completion ||= (async () => {
    let attempt = deps.readAttempt();
    if (!attempt) throw Object.assign(new Error("Sign-in request expired."), {code: "app/auth-session-expired"});
    if (attempt.phase === "start") {
      deps.updateAttempt(attempt.id, { phase: "awaiting-google" });
      await deps.startGoogle();
      return null;
    }
    await deps.authReady();
    const result = await deps.getResult();
    if (result?.user) {
      attempt = deps.updateAttempt(attempt.id, { phase: "authenticated", uid: result.user.uid });
    } else if (!attempt.uid || attempt.uid !== deps.currentUser()?.uid || deps.currentUser()?.isAnonymous) {
      deps.cancel(attempt);
      return null;
    }
    const authenticated = await deps.completeProfile(result || { user: deps.currentUser() });
    const assertOwner = () => {
      if (deps.currentUser()?.uid !== authenticated.user.uid) {
        throw Object.assign(new Error("Account changed during sign-in."), {code: "app/auth-session-expired"});
      }
    };
    assertOwner();
    await deps.importCart(attempt, authenticated.user);
    assertOwner();
    await deps.selectExperience();
    assertOwner();
    if (attempt.requiresCheckoutDetails && !authenticated.profile.profileComplete) {
      return { attempt, authenticated };
    }
    deps.finish(attempt, authenticated.user.uid);
    return null;
  })();
}
