const { formatAmount } = require("./format");

function lineItem(label, cents) {
  return `${label}: ${formatAmount(cents)}`;
}

module.exports = { lineItem };
