export function createAccountLookupClient({ currentUser, call }) {
  async function check(name, data, key) {
    const user = currentUser();
    const result = await call(name, data);
    if (currentUser() !== user) {
      throw Object.assign(new Error("Your account changed. Please try again."), { code: "app/session-changed" });
    }
    if (typeof result?.data?.[key] !== "boolean") {
      throw Object.assign(new Error("Account check unavailable. Please try again."), { code: "app/invalid-account-check" });
    }
    return result.data[key];
  }
  return {
    isCurrentAccountBuyer() {
      if (!currentUser()?.uid || currentUser().isAnonymous) return Promise.resolve(false);
      return check("getBuyerAccountEligibilityV1", {}, "buyerAllowed");
    },
    canUseBuyerContactEmail(email) {
      return check("checkBuyerContactEmailV1", { email: String(email || "").trim().toLowerCase() }, "canUseEmail");
    },
    isBuyerUsernameAvailable(username) {
      return check("checkBuyerUsernameV1", { username }, "available");
    },
  };
}
