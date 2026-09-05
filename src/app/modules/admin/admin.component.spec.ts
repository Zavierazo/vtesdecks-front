import { TestBed } from '@angular/core/testing'
import { TranslocoService } from '@jsverse/transloco'
import { NgbModal } from '@ng-bootstrap/ng-bootstrap'
import { ApiDataService, ToastService } from '@services'
import { of } from 'rxjs'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AdminComponent } from './admin.component'

describe('AdminComponent', () => {
  afterEach(() => TestBed.resetTestingModule())

  function setup() {
    const api = {
      getAdminSchedulers: vi.fn(() =>
        of([{ key: 'deck-clean' }, { key: 'achievements' }]),
      ),
      runAdminScheduler: vi.fn(() => of(undefined)),
    }
    const modal = {
      open: vi.fn(() => ({ componentInstance: {}, closed: of(true) })),
    }
    const toast = { show: vi.fn() }
    TestBed.configureTestingModule({
      providers: [
        { provide: ApiDataService, useValue: api },
        { provide: NgbModal, useValue: modal },
        { provide: ToastService, useValue: toast },
        {
          provide: TranslocoService,
          useValue: { translate: (key: string) => key },
        },
      ],
    })
    const component = TestBed.runInInjectionContext(() => new AdminComponent())
    return { component, api, modal, toast }
  }

  it('loads the available manual schedulers', () => {
    const { component, api } = setup()

    component.ngOnInit()

    expect(api.getAdminSchedulers).toHaveBeenCalledOnce()
    expect(component.schedulers()).toEqual([
      { key: 'deck-clean' },
      { key: 'achievements' },
    ])
  })

  it('opens user management only after an explicit action', () => {
    const { component, modal } = setup()
    expect(modal.open).not.toHaveBeenCalled()
    component.userIdentifier.set('target@example.com')

    component.openUser()

    expect(modal.open).toHaveBeenCalledOnce()
    expect(modal.open.mock.results[0].value.componentInstance.identifier).toBe(
      'target@example.com',
    )
  })

  it('runs a scheduler after confirmation', () => {
    const { component, api, toast } = setup()

    component.runScheduler({ key: 'deck-clean' })

    expect(api.runAdminScheduler).toHaveBeenCalledWith('deck-clean')
    expect(component.runningScheduler()).toBeUndefined()
    expect(toast.show).toHaveBeenCalledWith(
      'admin.scheduler_completed',
      expect.objectContaining({ classname: 'bg-success text-light' }),
    )
  })
})
