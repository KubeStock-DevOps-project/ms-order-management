export const computeTotals = async (items) => {
  const subtotal = (items || []).reduce(
    (sum, it) =>
      sum + (Number(it.unit_price) || 0) * (Number(it.quantity) || 0),
    0
  );
  const tax = 0;
  const shipping = 0;
  const discounts = 0;
  const grand_total = subtotal + tax + shipping - discounts;
  return { subtotal, tax, shipping, discounts, grand_total };
};
