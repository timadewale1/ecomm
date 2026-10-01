// In-memory only: a crashed/restarted app must never inherit a stale marker.
export function createAuthProvisioning({ timeoutMs = 60000 } = {}) {
  let active = null;
  return {
    begin() {
      if (active) throw Object.assign(new Error("Sign-in is already in progress."), { code: "app/auth-in-progress" });
      let finish;
      const attempt = { uid: null, done: new Promise(resolve => { finish = resolve; }) };
      active = attempt;
      return {
        bind(uid) { attempt.uid = uid; },
        finish() {
          if (active === attempt) active = null;
          finish();
        },
      };
    },
    async wait(uid) {
      const attempt = active;
      if (!attempt || (attempt.uid && attempt.uid !== uid)) return;
      let timer;
      try {
        await Promise.race([
          attempt.done,
          new Promise((_, reject) => {
            timer = setTimeout(() => reject(Object.assign(
              new Error("Sign-in is still completing. Please retry."),
              { code: "app/profile-provisioning-timeout" },
            )), timeoutMs);
          }),
        ]);
      } finally { clearTimeout(timer); }
    },
  };
}

export const authProvisioning = createAuthProvisioning();
