import { ApiCard } from '@models'

export interface CardQuantityDelta {
  id: number
  previousQuantity: number
  currentQuantity: number
  difference: number
}

export function compareCardQuantities(
  previous: readonly Readonly<Pick<ApiCard, 'id' | 'number'>>[],
  current: readonly Readonly<Pick<ApiCard, 'id' | 'number'>>[],
): CardQuantityDelta[] {
  const before = new Map(previous.map((card) => [card.id, card.number]))
  const after = new Map(current.map((card) => [card.id, card.number]))
  return [...new Set([...before.keys(), ...after.keys()])].flatMap((id) => {
    const previousQuantity = before.get(id) ?? 0
    const currentQuantity = after.get(id) ?? 0
    const difference = currentQuantity - previousQuantity
    return difference === 0
      ? []
      : [{ id, previousQuantity, currentQuantity, difference }]
  })
}
