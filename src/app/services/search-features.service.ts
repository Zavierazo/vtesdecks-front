import { computed, DestroyRef, inject, Injectable, signal } from '@angular/core'
import { takeUntilDestroyed } from '@angular/core/rxjs-interop'
import {
  ApiSearchPreset,
  RecentSearch,
  SavedSearchPreset,
  SearchPresetScope,
  SearchFeaturesStorageV1,
  SearchParams,
} from '@models'
import { AuthQuery } from '@state/auth/auth.query'
import {
  hasMeaningfulSearchFilters,
  normalizeSearchParams,
  searchSignature,
} from '@utils'
import {
  catchError,
  concatMap,
  defer,
  distinctUntilChanged,
  EMPTY,
  finalize,
  map,
  Observable,
  of,
  Subject,
  Subscriber,
  switchMap,
  tap,
  throwError,
} from 'rxjs'
import { LocalStorageService } from './local-storage.service'
import { SearchPresetApiDataService } from './search-preset-api.data.service'

export type SavePresetResult =
  | { status: 'saved'; preset: SavedSearchPreset }
  | { status: 'duplicate'; preset: SavedSearchPreset }
  | { status: 'invalid-name' }
  | { status: 'error' }

export type RenamePresetResult =
  'renamed' | 'duplicate' | 'invalid-name' | 'error'

interface RemoteTask<T> {
  operation: () => Observable<T>
  subscriber: Subscriber<T>
}

@Injectable({ providedIn: 'root' })
export class SearchFeaturesService {
  static readonly STORAGE_KEY = 'searchFeatures'
  static readonly USER_PRESETS_PREFIX = 'searchFeaturesPresets:'
  static readonly HISTORY_LIMIT = 10

  private readonly localStorage = inject(LocalStorageService)
  private readonly authQuery = inject(AuthQuery)
  private readonly api = inject(SearchPresetApiDataService)
  private readonly destroyRef = inject(DestroyRef)
  private readonly state = signal<SearchFeaturesStorageV1>(this.loadAnonymous())
  private readonly syncingState = signal(false)
  private readonly remoteAvailableState = signal(true)
  private readonly remoteQueue = new Subject<RemoteTask<unknown>>()
  private readonly drafts = new Map<SearchPresetScope, string>()
  private activeUser: string | undefined
  private mergedForUser: string | undefined
  private syncingOperations = 0

  readonly presets = computed(() => this.state().presets)
  readonly history = computed(() => this.state().history)
  readonly syncing = this.syncingState.asReadonly()
  readonly remoteAvailable = this.remoteAvailableState.asReadonly()

  constructor() {
    this.remoteQueue
      .pipe(
        concatMap((task) =>
          task.operation().pipe(
            tap((value) => task.subscriber.next(value)),
            catchError((error) => {
              task.subscriber.error(error)
              return EMPTY
            }),
            finalize(() => task.subscriber.complete()),
          ),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe()

    this.authQuery
      .selectUser()
      .pipe(distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe((user) => (user ? this.onLogin(user) : this.onLogout()))
  }

  getPresets(scope: SearchPresetScope): SavedSearchPreset[] {
    return this.presets()
      .filter((preset) => preset.scope === scope)
      .sort((a, b) => a.name.localeCompare(b.name))
  }

  getHistory(scope: SearchPresetScope): RecentSearch[] {
    return this.history()
      .filter((entry) => entry.scope === scope)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }

  savePreset(
    scope: SearchPresetScope,
    name: string,
    params: SearchParams,
    overwrite = false,
  ): Observable<SavePresetResult> {
    const local = this.buildSavePreset(scope, name, params, overwrite)
    if (local.status !== 'saved') return of(local)
    if (!this.useRemote()) {
      this.upsertLocal(local.preset)
      return of(local)
    }
    return this.withSyncing(
      this.enqueueRemote(() => {
        if (!this.useRemote()) return of(this.toApi(local.preset))
        const current = this.findCurrentPreset(local.preset)
        const preset = current?.remoteId
          ? { ...local.preset, remoteId: current.remoteId }
          : local.preset
        return preset.remoteId
          ? this.api.update(preset.remoteId, this.toApi(preset))
          : this.api.create(this.toApi(preset))
      }),
    ).pipe(
      tap((saved) => this.upsertLocal(this.fromApi(saved))),
      map(() => local),
      catchError((error) =>
        this.onRemoteError(error, () => this.upsertLocal(local.preset), local, {
          status: 'error',
        } as const),
      ),
    )
  }

  renamePreset(id: string, name: string): Observable<RenamePresetResult> {
    const normalizedName = name.trim()
    if (!normalizedName) return of('invalid-name')
    const current = this.state().presets.find((preset) => preset.id === id)
    if (!current) return of('invalid-name')
    const duplicate = this.state().presets.some(
      (preset) =>
        preset.id !== id &&
        preset.scope === current.scope &&
        this.sameName(preset.name, normalizedName),
    )
    if (duplicate) return of('duplicate')
    const renamed = {
      ...current,
      name: normalizedName,
      updatedAt: new Date().toISOString(),
    }
    if (!this.useRemote()) {
      this.upsertLocal(renamed)
      return of('renamed')
    }
    return this.withSyncing(
      this.enqueueRemote(() => {
        if (!this.useRemote()) return of(this.toApi(renamed))
        const currentPreset = this.findCurrentPreset(renamed)
        const preset = currentPreset?.remoteId
          ? { ...renamed, remoteId: currentPreset.remoteId }
          : renamed
        return preset.remoteId
          ? this.api.update(preset.remoteId, this.toApi(preset))
          : this.api.create(this.toApi(preset))
      }),
    ).pipe(
      tap((saved) => this.upsertLocal(this.fromApi(saved))),
      map(() => 'renamed' as const),
      catchError((error) =>
        this.onRemoteError(
          error,
          () => this.upsertLocal(renamed),
          'renamed' as const,
          'error' as const,
        ),
      ),
    )
  }

  deletePreset(id: string): Observable<void> {
    const current = this.state().presets.find((preset) => preset.id === id)
    if (!current) return of(undefined)
    const remove = () => this.removeLocal(id)
    if (!this.useRemote()) {
      remove()
      return of(undefined)
    }
    return this.withSyncing(
      this.enqueueRemote(() => {
        if (!this.useRemote()) return of(true)
        const currentPreset = this.findCurrentPreset(current)
        return currentPreset?.remoteId
          ? this.api.delete(currentPreset.remoteId)
          : of(true)
      }),
    ).pipe(
      tap(remove),
      map(() => undefined),
      catchError((error) => {
        if (this.handleAvailabilityError(error)) {
          remove()
          return of(undefined)
        }
        return throwError(() => error)
      }),
    )
  }

  recordHistory(scope: SearchPresetScope, params: SearchParams): void {
    const normalized = normalizeSearchParams(scope, params)
    if (!hasMeaningfulSearchFilters(scope, normalized)) return
    const signature = searchSignature(scope, normalized)
    const browserHistory = this.getHistory(scope)
    const draftId = this.drafts.get(scope)
    const draft = draftId
      ? browserHistory.find((entry) => entry.id === draftId)
      : undefined
    const entry: RecentSearch = {
      id: draft?.id ?? this.createId(),
      scope,
      params: normalized,
      createdAt: new Date().toISOString(),
    }
    if (
      draft &&
      searchSignature(scope, draft.params) === signature &&
      browserHistory[0]?.id === draft.id
    ) {
      return
    }
    this.drafts.set(scope, entry.id)
    const kept = browserHistory.filter(
      (item) =>
        item.id !== entry.id &&
        searchSignature(scope, item.params) !== signature,
    )
    const otherHistory = this.state().history.filter(
      (item) => item.scope !== scope,
    )
    const limited = [entry, ...kept].slice(
      0,
      SearchFeaturesService.HISTORY_LIMIT,
    )
    this.updateState({
      ...this.state(),
      history: [...otherHistory, ...limited],
    })
  }

  finalizeHistoryDraft(scope: SearchPresetScope): void {
    this.drafts.delete(scope)
  }

  deleteHistory(id: string): void {
    this.forgetDraft(id)
    this.updateState({
      ...this.state(),
      history: this.state().history.filter((entry) => entry.id !== id),
    })
  }

  clearHistory(scope: SearchPresetScope): void {
    this.drafts.delete(scope)
    this.updateState({
      ...this.state(),
      history: this.state().history.filter((entry) => entry.scope !== scope),
    })
  }

  private onLogin(user: string): void {
    if (this.mergedForUser === user) return
    this.activeUser = user
    this.remoteAvailableState.set(true)
    const anonymous = this.loadAnonymous()
    const cached = this.loadUserPresets(user)
    this.state.set({
      version: 1,
      presets: this.uniqueById([...cached, ...anonymous.presets]),
      history: anonymous.history,
    })
    this.withSyncing(
      this.enqueueRemote(() =>
        this.api
          .list()
          .pipe(
            switchMap((remote) =>
              this.mergeLocalPresets(this.state().presets, remote),
            ),
          ),
      ),
    )
      .pipe(
        tap((remote) => {
          if (this.activeUser !== user) return
          this.adoptRemote(user, remote)
          this.mergedForUser = user
        }),
        catchError(() => {
          if (this.activeUser === user) this.remoteAvailableState.set(false)
          return EMPTY
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe()
  }

  private onLogout(): void {
    const previousUser = this.activeUser
    if (previousUser) {
      this.localStorage.clearValue(this.userPresetsKey(previousUser))
    }
    this.activeUser = undefined
    this.mergedForUser = undefined
    this.remoteAvailableState.set(true)
    this.state.set(this.loadAnonymous())
  }

  private mergeLocalPresets(
    local: SavedSearchPreset[],
    remote: ApiSearchPreset[],
  ): Observable<ApiSearchPreset[]> {
    const pending = local.filter((preset) => !preset.remoteId)
    const signatures = new Set(
      remote.map((preset) => searchSignature(preset.scope, preset.params)),
    )
    const namesTaken = new Map<SearchPresetScope, string[]>([
      ['crypt', []],
      ['library', []],
      ['decks', []],
    ])
    remote.forEach((preset) => namesTaken.get(preset.scope)!.push(preset.name))
    const toUpload: ApiSearchPreset[] = []
    for (const preset of pending) {
      const signature = searchSignature(preset.scope, preset.params)
      if (signatures.has(signature)) continue
      const names = namesTaken.get(preset.scope)!
      let name = preset.name.trim()
      if (names.some((existing) => this.sameName(existing, name))) {
        const deduped = this.dedupeName(name, names)
        if (!deduped) continue
        name = deduped
      }
      toUpload.push({
        clientId: preset.id,
        scope: preset.scope,
        name,
        params: preset.params,
      })
      signatures.add(signature)
      names.push(name)
    }
    return toUpload.length ? this.api.merge(toUpload) : of(remote)
  }

  private buildSavePreset(
    scope: SearchPresetScope,
    name: string,
    params: SearchParams,
    overwrite: boolean,
  ): SavePresetResult {
    const normalizedName = name.trim()
    if (!normalizedName) return { status: 'invalid-name' }
    const existing = this.state().presets.find(
      (preset) =>
        preset.scope === scope && this.sameName(preset.name, normalizedName),
    )
    if (existing && !overwrite) return { status: 'duplicate', preset: existing }
    const now = new Date().toISOString()
    const preset: SavedSearchPreset = existing
      ? {
          ...existing,
          name: normalizedName,
          params: normalizeSearchParams(scope, params),
          updatedAt: now,
        }
      : {
          id: this.createId(),
          scope,
          name: normalizedName,
          params: normalizeSearchParams(scope, params),
          createdAt: now,
          updatedAt: now,
        }
    return { status: 'saved', preset }
  }

  private onRemoteError<T, E>(
    error: unknown,
    fallback: () => void,
    fallbackResult: T,
    errorResult: E,
  ): Observable<T | E> {
    if (this.handleAvailabilityError(error)) {
      fallback()
      return of(fallbackResult)
    }
    return of(errorResult)
  }

  private handleAvailabilityError(error: unknown): boolean {
    const status = (error as { status?: number } | null)?.status
    if (
      status === 0 ||
      status === 404 ||
      (status !== undefined && status >= 500)
    ) {
      this.remoteAvailableState.set(false)
      return true
    }
    return false
  }

  private useRemote(): boolean {
    return this.authQuery.isAuthenticated() && this.remoteAvailable()
  }

  private enqueueRemote<T>(operation: () => Observable<T>): Observable<T> {
    return new Observable<T>((subscriber) => {
      this.remoteQueue.next({ operation, subscriber } as RemoteTask<unknown>)
    })
  }

  private withSyncing<T>(observable: Observable<T>): Observable<T> {
    return defer(() => {
      this.syncingOperations++
      this.syncingState.set(true)
      return observable.pipe(
        finalize(() => {
          this.syncingOperations--
          this.syncingState.set(this.syncingOperations > 0)
        }),
      )
    })
  }

  private adoptRemote(user: string, remote: ApiSearchPreset[]): void {
    const presets = remote.map((preset) => this.fromApi(preset))
    this.state.set({ ...this.state(), presets })
    this.localStorage.setValue(this.userPresetsKey(user), presets)
    this.localStorage.setValue(SearchFeaturesService.STORAGE_KEY, {
      ...this.loadAnonymous(),
      presets: [],
      history: this.state().history,
    })
  }

  private upsertLocal(preset: SavedSearchPreset): void {
    const exists = this.state().presets.some((item) => item.id === preset.id)
    this.updateState({
      ...this.state(),
      presets: exists
        ? this.state().presets.map((item) =>
            item.id === preset.id ? preset : item,
          )
        : [...this.state().presets, preset],
    })
  }

  private removeLocal(id: string): void {
    this.updateState({
      ...this.state(),
      presets: this.state().presets.filter((preset) => preset.id !== id),
    })
  }

  private updateState(value: SearchFeaturesStorageV1): void {
    this.state.set(value)
    if (this.activeUser && this.authQuery.isAuthenticated()) {
      this.localStorage.setValue(
        this.userPresetsKey(this.activeUser),
        value.presets,
      )
      const anonymous = this.loadAnonymous()
      this.localStorage.setValue(SearchFeaturesService.STORAGE_KEY, {
        ...anonymous,
        history: value.history,
      })
    } else {
      this.localStorage.setValue(SearchFeaturesService.STORAGE_KEY, value)
    }
  }

  private loadAnonymous(): SearchFeaturesStorageV1 {
    return this.migrate(
      this.localStorage.getValue<unknown>(SearchFeaturesService.STORAGE_KEY),
    )
  }

  private loadUserPresets(user: string): SavedSearchPreset[] {
    const value = this.localStorage.getValue<unknown>(this.userPresetsKey(user))
    return Array.isArray(value)
      ? value
          .map((item) => this.normalizeStoredPreset(item))
          .filter((item): item is SavedSearchPreset => Boolean(item))
      : []
  }

  private migrate(value: unknown): SearchFeaturesStorageV1 {
    if (!this.isRecord(value) || value['version'] !== 1)
      return this.emptyState()
    const presets = Array.isArray(value['presets'])
      ? value['presets']
          .map((item) => this.normalizeStoredPreset(item))
          .filter((item): item is SavedSearchPreset => Boolean(item))
      : []
    const validHistory = Array.isArray(value['history'])
      ? value['history']
          .map((item) => this.normalizeStoredHistory(item))
          .filter((item): item is RecentSearch => Boolean(item))
      : []
    const history = (['crypt', 'library', 'decks'] as const).flatMap((scope) =>
      validHistory
        .filter((item) => item.scope === scope)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, SearchFeaturesService.HISTORY_LIMIT),
    )
    return { version: 1, presets, history }
  }

  private emptyState(): SearchFeaturesStorageV1 {
    return { version: 1, presets: [], history: [] }
  }

  private normalizeStoredPreset(value: unknown): SavedSearchPreset | undefined {
    if (!this.isRecord(value)) return undefined
    const scope = value['scope'] ?? value['browserType']
    if (
      typeof value['id'] !== 'string' ||
      (value['remoteId'] !== undefined &&
        typeof value['remoteId'] !== 'number') ||
      !this.isScope(scope) ||
      typeof value['name'] !== 'string' ||
      !this.isParams(value['params']) ||
      typeof value['createdAt'] !== 'string' ||
      typeof value['updatedAt'] !== 'string'
    ) {
      return undefined
    }
    return {
      id: value['id'],
      remoteId: value['remoteId'] as number | undefined,
      scope,
      name: value['name'],
      params: normalizeSearchParams(scope, value['params']),
      createdAt: value['createdAt'],
      updatedAt: value['updatedAt'],
    }
  }

  private normalizeStoredHistory(value: unknown): RecentSearch | undefined {
    if (!this.isRecord(value)) return undefined
    const scope = value['scope'] ?? value['browserType']
    if (
      typeof value['id'] !== 'string' ||
      !this.isScope(scope) ||
      !this.isParams(value['params']) ||
      typeof value['createdAt'] !== 'string'
    ) {
      return undefined
    }
    return {
      id: value['id'],
      scope,
      params: normalizeSearchParams(scope, value['params']),
      createdAt: value['createdAt'],
    }
  }

  private isScope(value: unknown): value is SearchPresetScope {
    return value === 'crypt' || value === 'library' || value === 'decks'
  }

  private isParams(value: unknown): value is SearchParams {
    return (
      this.isRecord(value) &&
      Object.values(value).every((item) => typeof item === 'string')
    )
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value)
  }

  private sameName(a: string, b: string): boolean {
    return a.localeCompare(b, undefined, { sensitivity: 'accent' }) === 0
  }

  private dedupeName(base: string, names: string[]): string | undefined {
    for (let suffix = 2; suffix <= 99; suffix++) {
      const candidate = `${base} (${suffix})`
      if (!names.some((name) => this.sameName(name, candidate)))
        return candidate
    }
    return undefined
  }

  private toApi(preset: SavedSearchPreset): ApiSearchPreset {
    return {
      id: preset.remoteId,
      clientId: preset.id.startsWith('remote-') ? undefined : preset.id,
      scope: preset.scope,
      name: preset.name,
      params: preset.params,
    }
  }

  private fromApi(preset: ApiSearchPreset): SavedSearchPreset {
    const now = new Date().toISOString()
    return {
      id: preset.clientId ?? `remote-${preset.id}`,
      remoteId: preset.id,
      scope: preset.scope,
      name: preset.name,
      params: normalizeSearchParams(preset.scope, preset.params),
      createdAt: preset.creationDate ?? now,
      updatedAt: preset.modificationDate ?? preset.creationDate ?? now,
    }
  }

  private uniqueById(presets: SavedSearchPreset[]): SavedSearchPreset[] {
    return [...new Map(presets.map((preset) => [preset.id, preset])).values()]
  }

  private findCurrentPreset(
    requested: SavedSearchPreset,
  ): SavedSearchPreset | undefined {
    return this.state().presets.find(
      (preset) =>
        preset.id === requested.id ||
        (preset.scope === requested.scope &&
          this.sameName(preset.name, requested.name)),
    )
  }

  private userPresetsKey(user: string): string {
    return `${SearchFeaturesService.USER_PRESETS_PREFIX}${user}`
  }

  private forgetDraft(id: string): void {
    for (const [scope, draftId] of this.drafts) {
      if (draftId === id) this.drafts.delete(scope)
    }
  }

  private createId(): string {
    return globalThis.crypto.randomUUID()
  }
}
