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
import { SavedSearchPreset, SearchBrowserType, SearchParams } from '@models'
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
  browserType!: SearchBrowserType
  params: SearchParams = {}
  presetName = ''
  validationError = ''
  overwritePreset: SavedSearchPreset | null = null

  readonly activeModal = inject(NgbActiveModal)
  readonly ui = inject(SearchFeaturesUiService)
  private readonly searchFeatures = inject(SearchFeaturesService)
  private readonly toast = inject(ToastService)
  private readonly transloco = inject(TranslocoService)
  private readonly changeDetector = inject(ChangeDetectorRef)

  initialize(browserType: SearchBrowserType, params: SearchParams): void {
    this.browserType = browserType
    this.params = params
    this.changeDetector.markForCheck()
  }

  save(overwrite = false): void {
    this.validationError = ''
    const result = this.searchFeatures.savePreset(
      this.browserType,
      this.presetName,
      this.params,
      overwrite,
    )
    if (result.status === 'invalid-name') {
      this.validationError = this.transloco.translate(
        'search_features.name_required',
      )
      return
    }
    if (result.status === 'duplicate') {
      this.overwritePreset = result.preset
      return
    }
    this.toast.show(this.transloco.translate('search_features.preset_saved'), {
      classname: 'bg-success text-light',
    })
    this.activeModal.close(result.preset)
  }
}
