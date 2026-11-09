export function applyProductDiscount(amountTomans: number, discountPercent: number | null | undefined) {
  const percent = Number.isInteger(discountPercent) && (discountPercent ?? 0) > 0 && (discountPercent ?? 0) <= 90
    ? discountPercent!
    : 0;
  return percent ? Math.round(amountTomans * (100 - percent) / 100) : amountTomans;
}
