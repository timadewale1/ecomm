// One presentation-only transition shared by login pages, sheets and OAuth
// returns. Tokens prevent a late completion from hiding a newer transition.
const listeners = new Set();
let snapshot = null;
let sequence = 0;
let routeLoading = false;
const publish = (value) => {
  snapshot = value;
  listeners.forEach((listener) => listener());
};
export const authTransitionSnapshot = () => snapshot;
export const subscribeAuthTransition = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};
export const beginAuthTransition = (label = "Finishing sign-in…") => {
  const id = ++sequence;
  publish({ id, label, finishing: false, routeLoading, startedAt: Date.now() });
  return {
    finish() {
      if (snapshot?.id === id) publish({ ...snapshot, finishing: true });
    },
    cancel() {
      if (snapshot?.id === id) publish(null);
    },
  };
};
export const releaseAuthTransition = (id) => {
  if (snapshot?.id === id && snapshot.finishing && !routeLoading) publish(null);
};
export const setAuthRouteLoading = (loading) => {
  routeLoading = loading;
  if (snapshot && snapshot.routeLoading !== loading) publish({ ...snapshot, routeLoading });
};
