export function createVendorDeliveryLocationCheck({currentUser, call}) {
  return async vendorId => {
    const user = currentUser();
    if (!vendorId || !user || user.uid !== vendorId) throw new Error("account-changed");
    const response = await call({});
    if (currentUser() !== user) throw new Error("account-changed");
    if (typeof response?.data?.needsSupport !== "boolean") throw new Error("invalid-response");
    return response.data.needsSupport;
  };
}
