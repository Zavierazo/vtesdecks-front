import { TestBed } from '@angular/core/testing'
import { TranslocoService } from '@jsverse/transloco'
import { NgbModal } from '@ng-bootstrap/ng-bootstrap'
import { firstValueFrom, Subject } from 'rxjs'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { CanDeactivateComponent } from './can-deactivate-component.guard'

describe('CanDeactivateComponent', () => {
  afterEach(() => TestBed.resetTestingModule())
  it('waits for a component decision instead of approving an Observable', async () => {
    const open = vi.fn()
    TestBed.configureTestingModule({
      providers: [
        { provide: NgbModal, useValue: { open } },
        { provide: TranslocoService, useValue: {} },
      ],
    })
    const decision = new Subject<boolean>()
    const result = TestBed.inject(CanDeactivateComponent).canDeactivate({
      canDeactivate: () => decision,
    })
    expect(result).toBe(decision)
    const resolved = firstValueFrom(decision)
    decision.next(false)
    expect(await resolved).toBe(false)
    expect(open).not.toHaveBeenCalled()
  })
})
