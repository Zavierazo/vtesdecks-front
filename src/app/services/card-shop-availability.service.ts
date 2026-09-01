import { inject, Injectable } from '@angular/core'
import { CARD_SHOPS, CardShopOption } from '@utils'
import { map, Observable, of } from 'rxjs'
import { ApiDataService } from './api.data.service'

export interface CardShopAvailability {
  shop: CardShopOption
  cardIds: ReadonlySet<number>
}

@Injectable({ providedIn: 'root' })
export class CardShopAvailabilityService {
  private readonly apiDataService = inject(ApiDataService)

  getInStock(platform: string): Observable<CardShopAvailability | undefined> {
    const shop = CARD_SHOPS.find((item) => item.name === platform)
    if (!shop) {
      return of(undefined)
    }
    return this.apiDataService
      .getInStockCardIds(platform)
      .pipe(map((cardIds) => ({ shop, cardIds: new Set(cardIds) })))
  }
}
