interface ShopFilterableCard {
  id: number
  unreleased?: boolean
}

export function filterCardsByShopAvailability<T extends ShopFilterableCard>(
  cards: T[],
  platform?: string,
  inStockCardIds?: ReadonlySet<number>,
): T[] {
  if (!platform || !inStockCardIds) {
    return cards
  }
  return cards.filter(
    (card) => !card.unreleased && inStockCardIds.has(card.id),
  )
}
