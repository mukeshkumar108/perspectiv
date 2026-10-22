/** The order of the deck, front card first. */
export type DeckOrder = number[];

export function initialOrder(count: number): DeckOrder {
  return Array.from({ length: count }, (_, i) => i);
}

/** The front card goes to the back; the next one comes forward. */
export function advance(order: DeckOrder): DeckOrder {
  return order.length < 2 ? order : [...order.slice(1), order[0]];
}

/** The front card comes back after being swiped away by mistake. */
export function goBack(order: DeckOrder): DeckOrder {
  return order.length < 2 ? order : [order[order.length - 1], ...order.slice(0, -1)];
}

/**
 * A random order whose new front card is never the one already in front, so a shuffle always visibly changes something.
 * `rng` is injectable so it can be tested.
 */
export function shuffle(order: DeckOrder, rng: () => number = Math.random): DeckOrder {
  if (order.length < 2) return order;
  const next = [...order];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  if (next[0] === order[0]) [next[0], next[1]] = [next[1], next[0]];
  return next;
}
