interface ShopFilterableCard {
  id: number
  unreleased?: boolean
}

export function filterCardsByShopAvailability<T extends ShopFilterableCard>(
  cards: T[],
  shops: readonly string[] = [],
  notShops: readonly string[] = [],
  availabilityByShop?: ReadonlyMap<string, ReadonlySet<number>>,
): T[] {
  const selectedShops = [...new Set([...shops, ...notShops])]
  if (selectedShops.length === 0) {
    return cards
  }

  // Keep the catalog stable while the currently selected availability is loading.
  if (
    !availabilityByShop ||
    selectedShops.some((shop) => !availabilityByShop.has(shop))
  ) {
    return cards
  }

  const includedIds = new Set<number>()
  shops.forEach((shop) =>
    availabilityByShop.get(shop)?.forEach((id) => includedIds.add(id)),
  )
  const excludedIds = new Set<number>()
  notShops.forEach((shop) =>
    availabilityByShop.get(shop)?.forEach((id) => excludedIds.add(id)),
  )

  return cards.filter(
    (card) =>
      (shops.length === 0 || (!card.unreleased && includedIds.has(card.id))) &&
      !excludedIds.has(card.id),
  )
}
