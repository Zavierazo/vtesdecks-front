import { DatePipe } from '@angular/common'
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  inject,
} from '@angular/core'
import { FormsModule } from '@angular/forms'
import {
  TranslocoDirective,
  TranslocoPipe,
  TranslocoService,
} from '@jsverse/transloco'
import {
  RecentSearch,
  SavedSearchPreset,
  SearchBrowserType,
  SearchParams,
} from '@models'
import { NgbActiveOffcanvas } from '@ng-bootstrap/ng-bootstrap'
import { SearchFeaturesService, SearchFeaturesUiService } from '@services'
import { normalizeSearchParams } from '@utils'

@Component({
  selector: 'app-search-features-manager',
  templateUrl: './search-features-modal.component.html',
  styleUrls: ['./search-features-modal.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, TranslocoDirective, TranslocoPipe, DatePipe],
})
export class SearchFeaturesModalComponent {
  browserType!: SearchBrowserType
  applySearch!: (params: SearchParams) => Promise<boolean>
  activeTab: 'presets' | 'history' = 'presets'
  editingPresetId: string | null = null
  pendingDeletePresetId: string | null = null
  pendingDeleteHistoryId: string | null = null
  pendingClearHistory = false
  renameValue = ''
  validationError = ''

  readonly activeOffcanvas = inject(NgbActiveOffcanvas)
  readonly searchFeatures = inject(SearchFeaturesService)
  readonly ui = inject(SearchFeaturesUiService)
  private readonly transloco = inject(TranslocoService)
  private readonly changeDetector = inject(ChangeDetectorRef)

  initialize(
    browserType: SearchBrowserType,
    applySearch: (params: SearchParams) => Promise<boolean>,
  ): void {
    this.browserType = browserType
    this.applySearch = applySearch
    this.changeDetector.markForCheck()
  }

  get presets(): SavedSearchPreset[] {
    return this.searchFeatures.getPresets(this.browserType)
  }

  get history(): RecentSearch[] {
    return this.searchFeatures.getHistory(this.browserType)
  }

  apply(params: SearchParams): void {
    void this.applySearch(normalizeSearchParams(this.browserType, params)).then(
      () => this.activeOffcanvas.close(),
    )
  }

  startRename(preset: SavedSearchPreset): void {
    this.editingPresetId = preset.id
    this.pendingDeletePresetId = null
    this.renameValue = preset.name
    this.validationError = ''
  }

  cancelRename(): void {
    this.editingPresetId = null
    this.validationError = ''
  }

  rename(preset: SavedSearchPreset): void {
    this.validationError = ''
    const result = this.searchFeatures.renamePreset(preset.id, this.renameValue)
    if (result === 'duplicate') {
      this.validationError = this.transloco.translate(
        'search_features.duplicate_name',
      )
    } else if (result === 'invalid-name') {
      this.validationError = this.transloco.translate(
        'search_features.name_required',
      )
    } else {
      this.cancelRename()
    }
  }

  requestDeletePreset(id: string): void {
    this.cancelRename()
    this.pendingDeletePresetId = id
  }

  deletePreset(id: string): void {
    this.searchFeatures.deletePreset(id)
    this.pendingDeletePresetId = null
  }

  requestDeleteHistory(id: string): void {
    this.pendingDeleteHistoryId = id
    this.pendingClearHistory = false
  }

  deleteHistory(id: string): void {
    this.searchFeatures.deleteHistory(id)
    this.pendingDeleteHistoryId = null
  }

  clearHistory(): void {
    this.searchFeatures.clearHistory(this.browserType)
    this.pendingClearHistory = false
  }
}
