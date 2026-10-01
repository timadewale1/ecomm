// This is presentation/routing only. Server handlers and Firestore rules are
// authoritative; local role preferences must never grant these permissions.
export function allowsRestrictedVendorFulfilment(profile) {
  return profile?.role === "vendor" &&
    profile?.accountRestriction?.active === true &&
    profile?.accountRestriction?.scope === "selling" &&
    profile?.accountRestriction?.fulfilmentOnly === true;
}

export function mustSignOutRestrictedAccount(profile) {
  return profile?.isDeactivated === true && !allowsRestrictedVendorFulfilment(profile);
}
