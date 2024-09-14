export class Shop {
  code: string
  name: string
  abbr: string

  constructor(code: string, name: string, abbr: string) {
    this.code = code
    this.name = name
    this.abbr = abbr
  }
}

export const SHOP_LIST = [
  new Shop('DTC', 'DriveThruCards', 'DTC'),
  new Shop('GP', 'GamePod', 'GP'),
]

export function getShop(code: string): Shop | undefined {
  return SHOP_LIST.find((c) => c.code === code)
}
