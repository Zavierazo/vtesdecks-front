import { inject, Injectable } from '@angular/core'
import { CARD_SHOPS, CardShopOption } from '@utils'
import { catchError, forkJoin, map, Observable, of } from 'rxjs'
import { ApiDataService } from './api.data.service'

export interface CardShopAvailability {
  shop: CardShopOption
  cardIds: ReadonlySet<number>
}

export interface CardShopAvailabilityBatch {
  availabilityByShop: ReadonlyMap<string, ReadonlySet<number>>
  failedShops: string[]
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

  getInStockForShops(
    platforms: readonly string[],
  ): Observable<CardShopAvailabilityBatch> {
    const validPlatforms = [
      ...new Set(
        platforms.filter((platform) =>
          CARD_SHOPS.some((shop) => shop.name === platform),
        ),
      ),
    ]
    if (validPlatforms.length === 0) {
      return of({ availabilityByShop: new Map(), failedShops: [] })
    }

    return forkJoin(
      validPlatforms.map((platform) =>
        this.getInStock(platform).pipe(
          map((availability) => ({ platform, availability })),
          catchError(() => of({ platform, availability: undefined })),
        ),
      ),
    ).pipe(
      map((results) => ({
        availabilityByShop: new Map(
          results
            .filter((result) => result.availability !== undefined)
            .map((result) => [result.platform, result.availability!.cardIds]),
        ),
        failedShops: results
          .filter((result) => result.availability === undefined)
          .map((result) => result.platform),
      })),
    )
  }
}
