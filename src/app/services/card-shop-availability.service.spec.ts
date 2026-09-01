import { TestBed } from '@angular/core/testing'
import { firstValueFrom, of } from 'rxjs'
import { describe, expect, it, vi } from 'vitest'
import { ApiDataService } from './api.data.service'
import { CardShopAvailabilityService } from './card-shop-availability.service'

describe('CardShopAvailabilityService', () => {
  const shop = {
    name: 'DTC',
    fullName: 'DriveThruCards',
  }

  const setup = () => {
    const api = {
      getInStockCardIds: vi.fn(() => of([1, 2, 2])),
    }
    TestBed.configureTestingModule({
      providers: [
        CardShopAvailabilityService,
        { provide: ApiDataService, useValue: api },
      ],
    })
    return { api, service: TestBed.inject(CardShopAvailabilityService) }
  }

  it('returns a set of current in-stock ids without caching availability', async () => {
    const { api, service } = setup()

    const first = await firstValueFrom(service.getInStock('DTC'))
    const second = await firstValueFrom(service.getInStock('DTC'))

    expect(first?.shop).toEqual(shop)
    expect([...first!.cardIds]).toEqual([1, 2])
    expect(second).toBeDefined()
    expect(api.getInStockCardIds).toHaveBeenCalledTimes(2)
  })

  it('does not request ids for an unknown platform', async () => {
    const { api, service } = setup()

    expect(await firstValueFrom(service.getInStock('UNKNOWN'))).toBeUndefined()
    expect(api.getInStockCardIds).not.toHaveBeenCalled()
  })
})
