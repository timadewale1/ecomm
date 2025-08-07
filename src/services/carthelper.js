export function calculateCartTotalForVendor(cart, vendorId) {
  const vendorCart = cart[vendorId];
  if (!vendorCart || !vendorCart.products) return 0;

  return Object.values(vendorCart.products).reduce((sum, product) => {
    const price = Number(product.price) || 0;
    const qty   = Number(product.quantity) || 0;
    return sum + price * qty;
  }, 0);
}