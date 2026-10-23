/**
 * Pricing helpers.
 * Sell price (credits) = ceil(cost_coin * (1 + profit_percent/100))
 */
export function computeSellPrice(costCoin: number, profitPercent: number): number {
  const price = costCoin * (1 + profitPercent / 100);
  return Math.max(1, Math.ceil(price));
}

/** Estimated profit (THB) for one generation. */
export function profitPerGenThb(
  sellCredit: number,
  costCoin: number,
  thbPerCredit: number,
  coinCostThb: number
) {
  const revenue = sellCredit * thbPerCredit;
  const cost = costCoin * coinCostThb;
  return { revenue, cost, profit: revenue - cost };
}
