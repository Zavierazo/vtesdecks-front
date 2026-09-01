export interface CardShopOption {
  name: string
  fullName: string
}

export const CARD_SHOPS: readonly CardShopOption[] = [
  { name: 'DTC', fullName: 'DriveThruCards' },
  { name: 'GP', fullName: 'GamePod' },
  { name: 'CGG', fullName: 'CardGameGeek' },
  { name: 'TCG_MKT', fullName: 'TCG Market' },
  { name: 'EBAY', fullName: 'Ebay' },
]

export const getCardShopName = (platform: string): string =>
  CARD_SHOPS.find((shop) => shop.name === platform)?.fullName ?? platform
