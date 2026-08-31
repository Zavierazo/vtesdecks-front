import { DatePipe } from '@angular/common'
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  inject,
} from '@angular/core'
import { takeUntilDestroyed } from '@angular/core/rxjs-interop'
import { FormsModule } from '@angular/forms'
import {
  TranslocoDirective,
  TranslocoPipe,
  TranslocoService,
} from '@jsverse/transloco'
import {
  RecentSearch,
  SavedSearchPreset,
  SearchPresetScope,
  SearchParams,
} from '@models'
import { NgbActiveOffcanvas } from '@ng-bootstrap/ng-bootstrap'
import {
  SearchFeaturesService,
  SearchFeaturesUiService,
  ToastService,
} from '@services'
import { AuthQuery } from '@state/auth/auth.query'
import { normalizeSearchParams } from '@utils'

@Component({
  selector: 'app-search-features-manager',
  templateUrl: './search-features-modal.component.html',
  styleUrls: ['./search-features-modal.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, TranslocoDirective, TranslocoPipe, DatePipe],
})
export class SearchFeaturesModalComponent {
  scope!: SearchPresetScope
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
  readonly authQuery = inject(AuthQuery)
  private readonly transloco = inject(TranslocoService)
  private readonly changeDetector = inject(ChangeDetectorRef)
  private readonly toast = inject(ToastService)
  private readonly destroyRef = inject(DestroyRef)

  initialize(
    scope: SearchPresetScope,
    applySearch: (params: SearchParams) => Promise<boolean>,
  ): void {
    this.scope = scope
    this.applySearch = applySearch
    this.changeDetector.markForCheck()
  }

  get presets(): SavedSearchPreset[] {
    return this.searchFeatures.getPresets(this.scope)
  }

  get history(): RecentSearch[] {
    return this.searchFeatures.getHistory(this.scope)
  }

  apply(params: SearchParams): void {
    void this.applySearch(normalizeSearchParams(this.scope, params)).then(() =>
      this.activeOffcanvas.close(),
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
    this.searchFeatures
      .renamePreset(preset.id, this.renameValue)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((result) => {
        if (result === 'duplicate') {
          this.validationError = this.transloco.translate(
            'search_features.duplicate_name',
          )
        } else if (result === 'invalid-name') {
          this.validationError = this.transloco.translate(
            'search_features.name_required',
          )
        } else if (result === 'error') {
          this.showSaveError()
        } else {
          this.cancelRename()
        }
        this.changeDetector.markForCheck()
      })
  }

  requestDeletePreset(id: string): void {
    this.cancelRename()
    this.pendingDeletePresetId = id
  }

  deletePreset(id: string): void {
    this.searchFeatures
      .deletePreset(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.pendingDeletePresetId = null
          this.changeDetector.markForCheck()
        },
        error: () => {
          this.showSaveError()
          this.changeDetector.markForCheck()
        },
      })
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
    this.searchFeatures.clearHistory(this.scope)
    this.pendingClearHistory = false
  }

  private showSaveError(): void {
    this.toast.show(this.transloco.translate('search_features.save_error'), {
      classname: 'bg-danger text-light',
    })
  }
}
