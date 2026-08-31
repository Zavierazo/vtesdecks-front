import { Injectable, computed, inject, signal } from '@angular/core'
import {
  RecentSearch,
  SavedSearchPreset,
  SearchBrowserType,
  SearchFeaturesStorageV1,
  SearchParams,
} from '@models'
import {
  hasMeaningfulSearchFilters,
  normalizeSearchParams,
  searchSignature,
} from '@utils'
import { LocalStorageService } from './local-storage.service'

export type SavePresetResult =
  | { status: 'saved'; preset: SavedSearchPreset }
  | { status: 'duplicate'; preset: SavedSearchPreset }
  | { status: 'invalid-name' }

export type RenamePresetResult = 'renamed' | 'duplicate' | 'invalid-name'

@Injectable({ providedIn: 'root' })
export class SearchFeaturesService {
  static readonly STORAGE_KEY = 'searchFeatures'
  static readonly HISTORY_LIMIT = 10

  private readonly localStorage = inject(LocalStorageService)
  private readonly state = signal<SearchFeaturesStorageV1>(this.load())
  /** Id of the history entry each browser is currently rewriting, if any. */
  private readonly drafts = new Map<SearchBrowserType, string>()

  readonly presets = computed(() => this.state().presets)
  readonly history = computed(() => this.state().history)

  getPresets(browserType: SearchBrowserType): SavedSearchPreset[] {
    return this.presets()
      .filter((preset) => preset.browserType === browserType)
      .sort((a, b) => a.name.localeCompare(b.name))
  }

  getHistory(browserType: SearchBrowserType): RecentSearch[] {
    return this.history()
      .filter((entry) => entry.browserType === browserType)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }

  savePreset(
    browserType: SearchBrowserType,
    name: string,
    params: SearchParams,
    overwrite = false,
  ): SavePresetResult {
    const normalizedName = name.trim()
    if (!normalizedName) return { status: 'invalid-name' }

    const existing = this.state().presets.find(
      (preset) =>
        preset.browserType === browserType &&
        preset.name.localeCompare(normalizedName, undefined, {
          sensitivity: 'accent',
        }) === 0,
    )
    if (existing && !overwrite) {
      return { status: 'duplicate', preset: existing }
    }

    const now = new Date().toISOString()
    const preset: SavedSearchPreset = existing
      ? {
          ...existing,
          name: normalizedName,
          params: normalizeSearchParams(browserType, params),
          updatedAt: now,
        }
      : {
          id: this.createId(),
          browserType,
          name: normalizedName,
          params: normalizeSearchParams(browserType, params),
          createdAt: now,
          updatedAt: now,
        }
    const presets = existing
      ? this.state().presets.map((item) =>
          item.id === existing.id ? preset : item,
        )
      : [...this.state().presets, preset]
    this.update({ ...this.state(), presets })
    return { status: 'saved', preset }
  }

  renamePreset(id: string, name: string): RenamePresetResult {
    const normalizedName = name.trim()
    if (!normalizedName) return 'invalid-name'
    const current = this.state().presets.find((preset) => preset.id === id)
    if (!current) return 'invalid-name'
    const duplicate = this.state().presets.some(
      (preset) =>
        preset.id !== id &&
        preset.browserType === current.browserType &&
        preset.name.localeCompare(normalizedName, undefined, {
          sensitivity: 'accent',
        }) === 0,
    )
    if (duplicate) return 'duplicate'
    this.update({
      ...this.state(),
      presets: this.state().presets.map((preset) =>
        preset.id === id
          ? {
              ...preset,
              name: normalizedName,
              updatedAt: new Date().toISOString(),
            }
          : preset,
      ),
    })
    return 'renamed'
  }

  deletePreset(id: string): void {
    this.update({
      ...this.state(),
      presets: this.state().presets.filter((preset) => preset.id !== id),
    })
  }

  /**
   * Records the current search as the most recent one. While the user keeps
   * tweaking filters on the same visit the entry is rewritten instead of
   * appended, so a single session leaves a single history entry. The entry is
   * closed by `finalizeHistoryDraft` (filters reset, leaving the page, or a new
   * visit taking over an interrupted one).
   */
  recordHistory(browserType: SearchBrowserType, params: SearchParams): void {
    const normalized = normalizeSearchParams(browserType, params)
    if (!hasMeaningfulSearchFilters(browserType, normalized)) return
    const signature = searchSignature(browserType, normalized)
    const browserHistory = this.getHistory(browserType)
    const draftId = this.drafts.get(browserType)
    const draft = draftId
      ? browserHistory.find((entry) => entry.id === draftId)
      : undefined
    const entry: RecentSearch = {
      id: draft?.id ?? this.createId(),
      browserType,
      params: normalized,
      createdAt: new Date().toISOString(),
    }
    if (
      draft &&
      searchSignature(browserType, draft.params) === signature &&
      browserHistory[0]?.id === draft.id
    ) {
      return
    }
    this.drafts.set(browserType, entry.id)
    const kept = browserHistory.filter(
      (item) =>
        item.id !== entry.id &&
        searchSignature(browserType, item.params) !== signature,
    )
    const otherHistory = this.state().history.filter(
      (item) => item.browserType !== browserType,
    )
    const limited = [entry, ...kept].slice(
      0,
      SearchFeaturesService.HISTORY_LIMIT,
    )
    this.update({ ...this.state(), history: [...otherHistory, ...limited] })
  }

  /**
   * Closes the entry `recordHistory` is currently rewriting, so the next search
   * starts a new one.
   */
  finalizeHistoryDraft(browserType: SearchBrowserType): void {
    this.drafts.delete(browserType)
  }

  deleteHistory(id: string): void {
    this.forgetDraft(id)
    this.update({
      ...this.state(),
      history: this.state().history.filter((entry) => entry.id !== id),
    })
  }

  clearHistory(browserType: SearchBrowserType): void {
    this.drafts.delete(browserType)
    this.update({
      ...this.state(),
      history: this.state().history.filter(
        (entry) => entry.browserType !== browserType,
      ),
    })
  }

  private forgetDraft(id: string): void {
    for (const [browserType, draftId] of this.drafts) {
      if (draftId === id) this.drafts.delete(browserType)
    }
  }

  private load(): SearchFeaturesStorageV1 {
    const stored = this.localStorage.getValue<unknown>(
      SearchFeaturesService.STORAGE_KEY,
    )
    return this.migrate(stored)
  }

  private migrate(value: unknown): SearchFeaturesStorageV1 {
    if (!this.isRecord(value) || value['version'] !== 1)
      return this.emptyState()
    const presets = Array.isArray(value['presets'])
      ? value['presets']
          .filter((item): item is SavedSearchPreset => this.isPreset(item))
          .map((item) => ({
            ...item,
            params: normalizeSearchParams(item.browserType, item.params),
          }))
      : []
    const validHistory = Array.isArray(value['history'])
      ? value['history']
          .filter((item): item is RecentSearch => this.isHistory(item))
          .map((item) => ({
            ...item,
            params: normalizeSearchParams(item.browserType, item.params),
          }))
      : []
    const history = (['crypt', 'library', 'decks'] as const).flatMap(
      (browserType) =>
        validHistory
          .filter((item) => item.browserType === browserType)
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
          .slice(0, SearchFeaturesService.HISTORY_LIMIT),
    )
    return { version: 1, presets, history }
  }

  private emptyState(): SearchFeaturesStorageV1 {
    return { version: 1, presets: [], history: [] }
  }

  private isPreset(value: unknown): value is SavedSearchPreset {
    return (
      this.isRecord(value) &&
      typeof value['id'] === 'string' &&
      this.isBrowserType(value['browserType']) &&
      typeof value['name'] === 'string' &&
      this.isParams(value['params']) &&
      typeof value['createdAt'] === 'string' &&
      typeof value['updatedAt'] === 'string'
    )
  }

  private isHistory(value: unknown): value is RecentSearch {
    return (
      this.isRecord(value) &&
      typeof value['id'] === 'string' &&
      this.isBrowserType(value['browserType']) &&
      this.isParams(value['params']) &&
      typeof value['createdAt'] === 'string'
    )
  }

  private isBrowserType(value: unknown): value is SearchBrowserType {
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

  private createId(): string {
    return globalThis.crypto.randomUUID()
  }

  private update(value: SearchFeaturesStorageV1): void {
    this.state.set(value)
    this.localStorage.setValue(SearchFeaturesService.STORAGE_KEY, value)
  }
}
