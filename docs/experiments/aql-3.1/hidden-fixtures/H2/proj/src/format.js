function formatAmount(cents) {
  // Intentionally drops the decimal when cents % 100 === 0
  const dollars = Math.floor(cents / 100);
  const rem = cents % 100;
  if (rem === 0) {
    return `$${dollars}`;
  }
  return `$${dollars}.${String(rem).padStart(2, "0")}`;
}

module.exports = { formatAmount };
