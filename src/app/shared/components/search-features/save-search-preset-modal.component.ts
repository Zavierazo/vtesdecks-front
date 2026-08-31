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
import { SavedSearchPreset, SearchPresetScope, SearchParams } from '@models'
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap'
import {
  SearchFeaturesService,
  SearchFeaturesUiService,
  ToastService,
} from '@services'

@Component({
  selector: 'app-save-search-preset-modal',
  templateUrl: './save-search-preset-modal.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, TranslocoDirective, TranslocoPipe],
})
export class SaveSearchPresetModalComponent {
  scope!: SearchPresetScope
  params: SearchParams = {}
  presetName = ''
  validationError = ''
  overwritePreset: SavedSearchPreset | null = null
  saving = false

  readonly activeModal = inject(NgbActiveModal)
  readonly ui = inject(SearchFeaturesUiService)
  private readonly searchFeatures = inject(SearchFeaturesService)
  private readonly toast = inject(ToastService)
  private readonly transloco = inject(TranslocoService)
  private readonly changeDetector = inject(ChangeDetectorRef)
  private readonly destroyRef = inject(DestroyRef)

  initialize(scope: SearchPresetScope, params: SearchParams): void {
    this.scope = scope
    this.params = params
    this.changeDetector.markForCheck()
  }

  save(overwrite = false): void {
    this.validationError = ''
    this.saving = true
    this.searchFeatures
      .savePreset(this.scope, this.presetName, this.params, overwrite)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((result) => {
        this.saving = false
        if (result.status === 'invalid-name') {
          this.validationError = this.transloco.translate(
            'search_features.name_required',
          )
        } else if (result.status === 'duplicate') {
          this.overwritePreset = result.preset
        } else if (result.status === 'error') {
          this.toast.show(
            this.transloco.translate('search_features.save_error'),
            { classname: 'bg-danger text-light' },
          )
        } else {
          this.toast.show(
            this.transloco.translate('search_features.preset_saved'),
            { classname: 'bg-success text-light' },
          )
          this.activeModal.close(result.preset)
        }
        this.changeDetector.markForCheck()
      })
  }
}
