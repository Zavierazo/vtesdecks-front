import { TestBed } from '@angular/core/testing'
import { SwPush } from '@angular/service-worker'
import { AuthQuery } from '@state/auth/auth.query'
import { BehaviorSubject, of, Subject, throwError } from 'rxjs'
import { ApiDataService } from './api.data.service'
import { LocalStorageService } from './local-storage.service'
import { PushNotificationService } from './push-notification.service'

describe('PushNotificationService', () => {
  const user = 'test-user'
  let service: PushNotificationService
  let subscription$: BehaviorSubject<PushSubscription | null>
  let changes$: Subject<{
    oldSubscription: PushSubscription | null
    newSubscription: PushSubscription | null
  }>
  let requestSubscription: ReturnType<typeof vi.fn>
  let unsubscribe: ReturnType<typeof vi.fn>
  let registerPushSubscription: ReturnType<typeof vi.fn>
  let unregisterPushSubscription: ReturnType<typeof vi.fn>
  let storage: Record<string, unknown>

  beforeEach(() => {
    vi.stubGlobal('Notification', { permission: 'default' })
    subscription$ = new BehaviorSubject<PushSubscription | null>(null)
    changes$ = new Subject()
    requestSubscription = vi.fn()
    unsubscribe = vi.fn(async () => subscription$.next(null))
    registerPushSubscription = vi.fn(() => of(undefined))
    unregisterPushSubscription = vi.fn(() => of(undefined))
    storage = {}

    TestBed.configureTestingModule({
      providers: [
        PushNotificationService,
        {
          provide: SwPush,
          useValue: {
            isEnabled: true,
            subscription: subscription$,
            pushSubscriptionChanges: changes$,
            requestSubscription,
            unsubscribe,
          },
        },
        {
          provide: ApiDataService,
          useValue: {
            getPushConfig: () =>
              of({ enabled: true, publicKey: 'vapid-public-key' }),
            registerPushSubscription,
            unregisterPushSubscription,
          },
        },
        {
          provide: AuthQuery,
          useValue: {
            selectUser: () => of(user),
            getUser: () => user,
          },
        },
        {
          provide: LocalStorageService,
          useValue: {
            getValue: (key: string) => storage[key] ?? null,
            setValue: (key: string, value: unknown) => (storage[key] = value),
            clearValue: (key: string) => delete storage[key],
          },
        },
      ],
    })
    service = TestBed.inject(PushNotificationService)
  })

  afterEach(() => vi.unstubAllGlobals())

  it('registers a browser subscription after explicit activation', async () => {
    const subscription = pushSubscription(
      'https://fcm.googleapis.com/fcm/send/one',
    )
    requestSubscription.mockResolvedValue(subscription)
    await service.initialize()

    await service.enable()

    expect(requestSubscription).toHaveBeenCalledWith({
      serverPublicKey: 'vapid-public-key',
    })
    expect(registerPushSubscription).toHaveBeenCalledWith({
      endpoint: subscription.endpoint,
      expirationTime: null,
      keys: { p256dh: 'AQID', auth: 'BAUG' },
    })
    expect(service.enabled()).toBe(true)
    expect(storage['push_notifications_owner']).toBe(user)
  })

  it('rolls back the browser subscription when backend registration fails', async () => {
    requestSubscription.mockResolvedValue(
      pushSubscription('https://fcm.googleapis.com/fcm/send/two'),
    )
    registerPushSubscription.mockReturnValue(
      throwError(() => new Error('backend unavailable')),
    )
    await service.initialize()

    await service.enable()

    expect(unsubscribe).toHaveBeenCalled()
    expect(service.enabled()).toBe(false)
    expect(service.status()).toBe('error')
  })

  it('deletes the current endpoint before unsubscribing locally', async () => {
    const subscription = pushSubscription(
      'https://fcm.googleapis.com/fcm/send/three',
    )
    subscription$.next(subscription)
    storage['push_notifications_owner'] = user
    await service.initialize()
    registerPushSubscription.mockClear()

    await service.disable()

    expect(unregisterPushSubscription).toHaveBeenCalledWith(
      subscription.endpoint,
    )
    expect(unsubscribe).toHaveBeenCalled()
    expect(service.enabled()).toBe(false)
  })

  it('cancels a subscription belonging to another account', async () => {
    subscription$.next(
      pushSubscription('https://fcm.googleapis.com/fcm/send/old-owner'),
    )
    storage['push_notifications_owner'] = 'another-user'

    await service.initialize('new-user')

    expect(unsubscribe).toHaveBeenCalled()
    expect(registerPushSubscription).not.toHaveBeenCalled()
    expect(service.enabled()).toBe(false)
  })

  it('offers the initial prompt only once per user', async () => {
    await service.initialize()

    expect(service.shouldShowInitialPrompt()).toBe(true)
    service.markInitialPromptSeen()
    expect(service.shouldShowInitialPrompt()).toBe(false)
  })

  function pushSubscription(endpoint: string): PushSubscription {
    return {
      endpoint,
      expirationTime: null,
      options: {} as PushSubscriptionOptions,
      getKey: vi.fn(),
      unsubscribe: vi.fn(),
      toJSON: () => ({
        endpoint,
        expirationTime: null,
        keys: { p256dh: 'AQID', auth: 'BAUG' },
      }),
    } as PushSubscription
  }
})
