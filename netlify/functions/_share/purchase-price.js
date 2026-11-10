// Invert a canonical mortgage quote; callers own the loan/cost assumptions.
export function purchasePriceForPayment(target, quote, minimum = 100, maximum = 5000000) {
  if (!(target > 0) || minimum > maximum) return null;
  if (quote(minimum).monthlyHousing > target) return null;
  let low = minimum, high = maximum;
  for (let i = 0; i < 32; i++) {
    const middle = (low + high) / 2;
    if (quote(middle).monthlyHousing <= target) low = middle;
    else high = middle;
  }
  const price = Math.floor(low / 100) * 100;
  if (price < minimum) return null;
  const result = quote(price);
  return {price, ...result, capped: low >= maximum - 1};
}
