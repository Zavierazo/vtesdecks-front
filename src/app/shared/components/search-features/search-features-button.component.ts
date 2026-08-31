import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  OnDestroy,
  OnInit,
} from '@angular/core'
import { ActivatedRoute, Router } from '@angular/router'
import { TranslocoDirective } from '@jsverse/transloco'
import {
  RecentSearch,
  SavedSearchPreset,
  SearchBrowserType,
  SearchParams,
} from '@models'
import {
  NgbDropdown,
  NgbDropdownButtonItem,
  NgbDropdownItem,
  NgbDropdownMenu,
  NgbDropdownToggle,
  NgbModal,
  NgbOffcanvas,
} from '@ng-bootstrap/ng-bootstrap'
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy'
import { SearchFeaturesService, SearchFeaturesUiService } from '@services'
import {
  hasMeaningfulSearchFilters,
  normalizeSearchParams,
  searchSignature,
} from '@utils'
import { debounceTime, distinctUntilChanged, map, tap } from 'rxjs'
import { SearchFeaturesModalComponent } from './search-features-modal.component'
import { SaveSearchPresetModalComponent } from './save-search-preset-modal.component'

@UntilDestroy()
@Component({
  selector: 'app-search-features-button',
  templateUrl: './search-features-button.component.html',
  styleUrls: ['./search-features-button.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    TranslocoDirective,
    NgbDropdown,
    NgbDropdownToggle,
    NgbDropdownMenu,
    NgbDropdownItem,
    NgbDropdownButtonItem,
  ],
})
export class SearchFeaturesButtonComponent implements OnInit, OnDestroy {
  readonly browserType = input.required<SearchBrowserType>()

  private readonly route = inject(ActivatedRoute)
  private readonly router = inject(Router)
  private readonly modal = inject(NgbModal)
  private readonly offcanvas = inject(NgbOffcanvas)
  private readonly searchFeatures = inject(SearchFeaturesService)
  readonly ui = inject(SearchFeaturesUiService)

  get currentParams(): SearchParams {
    return normalizeSearchParams(
      this.browserType(),
      this.route.snapshot.queryParams,
    )
  }

  get quickPresets(): SavedSearchPreset[] {
    return this.searchFeatures.getPresets(this.browserType()).slice(0, 2)
  }

  get currentPreset(): SavedSearchPreset | undefined {
    const signature = searchSignature(this.browserType(), this.currentParams)
    return this.searchFeatures
      .getPresets(this.browserType())
      .find(
        (preset) =>
          searchSignature(this.browserType(), preset.params) === signature,
      )
  }

  get quickHistory(): RecentSearch[] {
    return this.searchFeatures.getHistory(this.browserType()).slice(0, 2)
  }

  ngOnInit(): void {
    // A previous visit may have been interrupted before its search was closed:
    // do not let this visit keep rewriting that entry.
    this.searchFeatures.finalizeHistoryDraft(this.browserType())
    this.route.queryParams
      .pipe(
        untilDestroyed(this),
        map((params) => normalizeSearchParams(this.browserType(), params)),
        debounceTime(1000),
        distinctUntilChanged(
          (a, b) =>
            searchSignature(this.browserType(), a) ===
            searchSignature(this.browserType(), b),
        ),
        tap((params) => {
          if (!hasMeaningfulSearchFilters(this.browserType(), params)) {
            // Filters were reset: close the entry so the next search starts a
            // new one instead of overwriting it.
            this.searchFeatures.finalizeHistoryDraft(this.browserType())
            return
          }
          this.searchFeatures.recordHistory(this.browserType(), params)
        }),
      )
      .subscribe()
  }

  ngOnDestroy(): void {
    // Leaving the page closes the current search.
    this.searchFeatures.finalizeHistoryDraft(this.browserType())
  }

  copyLink(): void {
    void this.ui.copyLink(this.browserType(), this.currentParams)
  }

  openSave(): void {
    const modalRef = this.modal.open(SaveSearchPresetModalComponent, {
      centered: true,
      size: 'sm',
    })
    const component =
      modalRef.componentInstance as SaveSearchPresetModalComponent
    component.initialize(this.browserType(), this.currentParams)
  }

  apply(params: SearchParams): void {
    void this.navigate(params)
  }

  openManager(): void {
    const offcanvasRef = this.offcanvas.open(SearchFeaturesModalComponent, {
      position: 'end',
      panelClass: 'search-features-offcanvas',
      ariaLabelledBy: 'search-features-manager-title',
    })
    const component =
      offcanvasRef.componentInstance as SearchFeaturesModalComponent
    component.initialize(this.browserType(), (params) => this.navigate(params))
  }

  private navigate(params: SearchParams): Promise<boolean> {
    return this.router.navigate([], {
      relativeTo: this.route,
      queryParams: normalizeSearchParams(this.browserType(), params),
      queryParamsHandling: 'replace',
    })
  }
}
