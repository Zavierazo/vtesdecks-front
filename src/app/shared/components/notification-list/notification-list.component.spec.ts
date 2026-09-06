import { TestBed } from '@angular/core/testing'
import { NgbActiveOffcanvas, NgbModal } from '@ng-bootstrap/ng-bootstrap'
import { TranslocoService } from '@jsverse/transloco'
import { AuthService } from '@state/auth/auth.service'
import { ApiDataService, PushNotificationService } from '@services'
import { Subject, of } from 'rxjs'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiUserNotification } from '@models'
import { NotificationListComponent } from './notification-list.component'

describe('NotificationListComponent', () => {
  const getNotifications = vi.fn()
  let component: NotificationListComponent

  beforeEach(async () => {
    getNotifications.mockReset()
    getNotifications.mockReturnValue(of([]))
    await TestBed.configureTestingModule({
      imports: [NotificationListComponent],
      providers: [
        { provide: ApiDataService, useValue: { getNotifications } },
        { provide: AuthService, useValue: {} },
        { provide: NgbActiveOffcanvas, useValue: {} },
        { provide: NgbModal, useValue: {} },
        { provide: TranslocoService, useValue: {} },
        {
          provide: PushNotificationService,
          useValue: {
            refresh: () => Promise.resolve(),
            shouldShowInitialPrompt: () => false,
          },
        },
      ],
    })
      .overrideComponent(NotificationListComponent, { set: { template: '' } })
      .compileComponents()
    const fixture = TestBed.createComponent(NotificationListComponent)
    component = fixture.componentInstance
  })

  it('loads pages, appends unique notifications, and stops after a short page', () => {
    const first = Array.from({ length: 50 }, (_, id) => ({
      id,
    })) as ApiUserNotification[]
    const second = [{ id: 49 }, { id: 50 }] as ApiUserNotification[]
    getNotifications
      .mockReturnValueOnce(of(first))
      .mockReturnValueOnce(of(second))

    component.ngOnInit()
    component.loadMore()

    expect(getNotifications).toHaveBeenNthCalledWith(1, 0, 50)
    expect(getNotifications).toHaveBeenNthCalledWith(2, 1, 50)
    expect(component.notifications().map(({ id }) => id)).toHaveLength(51)
    expect(component.hasMore()).toBe(false)
  })

  it('prevents concurrent loads and retries the same page after an error', () => {
    const pending = new Subject<ApiUserNotification[]>()
    getNotifications.mockReturnValueOnce(pending).mockReturnValueOnce(of([]))

    component.ngOnInit()
    component.loadMore()
    expect(getNotifications).toHaveBeenCalledTimes(1)

    pending.error(new Error('failed'))
    expect(component.loadError()).toBe(true)
    component.loadMore()

    expect(getNotifications).toHaveBeenNthCalledWith(2, 0, 50)
    expect(component.loadError()).toBe(false)
  })
})
