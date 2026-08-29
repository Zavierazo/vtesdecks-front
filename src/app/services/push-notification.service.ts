import { computed, inject, Injectable, signal } from '@angular/core'
import { SwPush } from '@angular/service-worker'
import { ApiPushConfig, ApiPushSubscription } from '@models'
import { AuthQuery } from '@state/auth/auth.query'
import { distinctUntilChanged, filter, firstValueFrom } from 'rxjs'
import { ApiDataService } from './api.data.service'
import { LocalStorageService } from './local-storage.service'

export type PushNotificationStatus =
  | 'unsupported'
  | 'unavailable'
  | 'blocked'
  | 'disabled'
  | 'enabled'
  | 'processing'
  | 'error'

@Injectable({ providedIn: 'root' })
export class PushNotificationService {
  private static readonly OWNER_KEY = 'push_notifications_owner'
  private static readonly PROMPT_PREFIX = 'push_notifications_prompt_seen_'

  private readonly swPush = inject(SwPush)
  private readonly apiDataService = inject(ApiDataService)
  private readonly authQuery = inject(AuthQuery)
  private readonly localStorage = inject(LocalStorageService)

  private readonly configured = signal(false)
  private readonly active = signal(false)
  private readonly permission = signal<NotificationPermission>('default')
  private readonly busy = signal(false)
  private readonly failed = signal(false)
  private config: ApiPushConfig | null = null
  private initializedUser: string | undefined
  private initialization: Promise<void> | null = null

  readonly ready = signal(false)
  readonly enabled = computed(() => this.status() === 'enabled')
  readonly status = computed<PushNotificationStatus>(() => {
    if (this.busy()) return 'processing'
    if (!this.isBrowserSupported()) return 'unsupported'
    if (this.permission() === 'denied') return 'blocked'
    if (!this.configured()) return 'unavailable'
    if (this.failed()) return 'error'
    return this.active() ? 'enabled' : 'disabled'
  })
  readonly canToggle = computed(() =>
    ['enabled', 'disabled', 'error'].includes(this.status()),
  )

  constructor() {
    this.authQuery
      .selectUser()
      .pipe(filter(Boolean), distinctUntilChanged())
      .subscribe((user) => void this.initialize(user))

    if (this.swPush.isEnabled) {
      this.swPush.pushSubscriptionChanges.subscribe(
        ({ oldSubscription, newSubscription }) => {
          void this.synchronizeSubscriptionChange(
            oldSubscription,
            newSubscription,
          )
        },
      )
    }
  }

  initialize(user = this.authQuery.getUser()): Promise<void> {
    if (!user) {
      this.ready.set(true)
      return Promise.resolve()
    }
    if (this.initializedUser === user && this.ready()) {
      return Promise.resolve()
    }
    if (this.initialization && this.initializedUser === user) {
      return this.initialization
    }
    this.initializedUser = user
    this.ready.set(false)
    this.initialization = this.initializeForUser(user).finally(() => {
      this.ready.set(true)
      this.initialization = null
    })
    return this.initialization
  }

  /**
   * Reconciles the stored state with the browser and the backend. The backend
   * expires a subscription as soon as a push is rejected by the provider, so
   * the cached "enabled" state goes stale without any local event.
   */
  async refresh(): Promise<void> {
    await this.initialize()
    const user = this.authQuery.getUser()
    if (!user || !this.isBrowserSupported() || this.busy()) return
    this.syncPermission()
    if (this.permission() === 'denied') {
      this.active.set(false)
      return
    }
    if (!this.configured()) return
    this.busy.set(true)
    try {
      await this.reconcileSubscription(user)
    } finally {
      this.busy.set(false)
    }
  }

  async enable(): Promise<void> {
    const user = this.authQuery.getUser()
    if (!user || !this.isBrowserSupported()) return
    this.busy.set(true)
    this.failed.set(false)
    let subscription: PushSubscription | null = null
    try {
      await this.loadConfig()
      this.syncPermission()
      if (!this.config?.enabled || !this.config.publicKey) return
      subscription = await this.swPush.requestSubscription({
        serverPublicKey: this.config.publicKey,
      })
      await firstValueFrom(
        this.apiDataService.registerPushSubscription(
          this.toApiSubscription(subscription),
        ),
      )
      this.localStorage.setValue(PushNotificationService.OWNER_KEY, user)
      this.syncPermission()
      this.active.set(true)
    } catch {
      this.failed.set(true)
      if (subscription) {
        try {
          await this.swPush.unsubscribe()
        } catch {
          // The backend registration failed, so this orphan cannot receive pushes.
        }
      }
      this.active.set(false)
    } finally {
      this.busy.set(false)
    }
  }

  async disable(): Promise<void> {
    if (!this.isBrowserSupported()) return
    this.busy.set(true)
    this.failed.set(false)
    try {
      this.syncPermission()
      const subscription = await firstValueFrom(this.swPush.subscription)
      if (subscription) {
        await firstValueFrom(
          this.apiDataService.unregisterPushSubscription(subscription.endpoint),
        )
        try {
          await this.swPush.unsubscribe()
        } finally {
          this.active.set(false)
          this.localStorage.clearValue(PushNotificationService.OWNER_KEY)
        }
      } else {
        this.active.set(false)
        this.localStorage.clearValue(PushNotificationService.OWNER_KEY)
      }
    } catch {
      this.failed.set(true)
    } finally {
      this.busy.set(false)
    }
  }

  shouldShowInitialPrompt(): boolean {
    const user = this.authQuery.getUser()
    return Boolean(
      user &&
      this.ready() &&
      this.status() === 'disabled' &&
      !this.localStorage.getValue<boolean>(this.promptKey(user)),
    )
  }

  markInitialPromptSeen(): void {
    const user = this.authQuery.getUser()
    if (user) {
      this.localStorage.setValue(this.promptKey(user), true)
    }
  }

  private async initializeForUser(user: string): Promise<void> {
    this.active.set(false)
    this.failed.set(false)
    if (!this.isBrowserSupported()) return
    this.syncPermission()
    try {
      await this.loadConfig()
      if (!this.config?.enabled) return
      await this.reconcileSubscription(user)
    } catch {
      this.failed.set(true)
    }
  }

  /**
   * Re-asserts the browser subscription against the backend. A subscription the
   * backend already expired is registered again, and one the browser no longer
   * holds (permission revoked, site data cleared) turns the toggle off.
   */
  private async reconcileSubscription(user: string): Promise<void> {
    let subscription = await firstValueFrom(this.swPush.subscription)
    const owner = this.localStorage.getValue<string>(
      PushNotificationService.OWNER_KEY,
    )
    if (subscription && owner !== user) {
      await this.swPush.unsubscribe()
      this.localStorage.clearValue(PushNotificationService.OWNER_KEY)
      subscription = null
    }
    if (!subscription) {
      this.localStorage.clearValue(PushNotificationService.OWNER_KEY)
      this.active.set(false)
      return
    }
    try {
      await firstValueFrom(
        this.apiDataService.registerPushSubscription(
          this.toApiSubscription(subscription),
        ),
      )
      this.failed.set(false)
      this.active.set(true)
    } catch (error) {
      if (this.isRejectedSubscription(error)) {
        await this.discardSubscription()
        return
      }
      throw error
    }
  }

  /** The endpoint is gone for good: drop it locally instead of showing it as active. */
  private async discardSubscription(): Promise<void> {
    try {
      await this.swPush.unsubscribe()
    } catch {
      // Nothing else to clean up, the browser already dropped the subscription.
    }
    this.localStorage.clearValue(PushNotificationService.OWNER_KEY)
    this.failed.set(false)
    this.active.set(false)
  }

  private isRejectedSubscription(error: unknown): boolean {
    const status = (error as { status?: number } | null)?.status
    return status === 404 || status === 410
  }

  private syncPermission(): void {
    this.permission.set(
      typeof globalThis.Notification === 'undefined'
        ? 'default'
        : globalThis.Notification.permission,
    )
  }

  private async loadConfig(): Promise<void> {
    if (!this.config) {
      this.config = await firstValueFrom(this.apiDataService.getPushConfig())
      this.configured.set(this.config.enabled && Boolean(this.config.publicKey))
    }
  }

  private async synchronizeSubscriptionChange(
    oldSubscription: PushSubscription | null,
    newSubscription: PushSubscription | null,
  ): Promise<void> {
    const user = this.authQuery.getUser()
    const owner = this.localStorage.getValue<string>(
      PushNotificationService.OWNER_KEY,
    )
    if (!user || owner !== user) return
    try {
      if (newSubscription) {
        await firstValueFrom(
          this.apiDataService.registerPushSubscription(
            this.toApiSubscription(newSubscription),
          ),
        )
      }
      if (
        oldSubscription &&
        oldSubscription.endpoint !== newSubscription?.endpoint
      ) {
        await firstValueFrom(
          this.apiDataService.unregisterPushSubscription(
            oldSubscription.endpoint,
          ),
        )
      }
      this.active.set(Boolean(newSubscription))
      if (!newSubscription) {
        this.localStorage.clearValue(PushNotificationService.OWNER_KEY)
      }
    } catch {
      this.failed.set(true)
    }
  }

  private toApiSubscription(
    subscription: PushSubscription,
  ): ApiPushSubscription {
    const json = subscription.toJSON()
    const p256dh = json.keys?.['p256dh']
    const auth = json.keys?.['auth']
    if (!p256dh || !auth) {
      throw new Error('Push subscription keys are missing')
    }
    return {
      endpoint: subscription.endpoint,
      expirationTime: subscription.expirationTime,
      keys: { p256dh, auth },
    }
  }

  private promptKey(user: string): string {
    return `${PushNotificationService.PROMPT_PREFIX}${user}`
  }

  private isBrowserSupported(): boolean {
    return (
      this.swPush.isEnabled && typeof globalThis.Notification !== 'undefined'
    )
  }
}
