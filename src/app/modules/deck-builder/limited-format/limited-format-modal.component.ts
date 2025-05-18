import { Clipboard } from '@angular/cdk/clipboard'
import { CommonModule } from '@angular/common'
import { Component, OnInit, ViewChild } from '@angular/core'
import {
  FormBuilder,
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms'
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco'
import {
  NgbActiveModal,
  NgbHighlight,
  NgbPopover,
  NgbTypeahead,
  NgbTypeaheadSelectItemEvent,
} from '@ng-bootstrap/ng-bootstrap'
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy'
import {
  combineLatest,
  debounceTime,
  mergeMap,
  Observable,
  of,
  OperatorFunction,
  switchMap,
} from 'rxjs'
import { environment } from '../../../../environments/environment'
import { ApiCrypt } from '../../../models/api-crypt'
import { ApiDeckLimitedFormat } from '../../../models/api-deck-limited-format'
import { ApiDeckLimitedFormatFilter } from '../../../models/api-deck-limited-format-filter'
import { ApiLibrary } from '../../../models/api-library'
import { ApiSet } from '../../../models/api-set'
import { ApiDataService } from '../../../services/api.data.service'
import { MediaService } from '../../../services/media.service'
import { ToastService } from '../../../services/toast.service'
import { CryptQuery } from '../../../state/crypt/crypt.query'
import { LibraryQuery } from '../../../state/library/library.query'
import { CardFilterComponent } from '../../decks/filter/card-filter/card-filter.component'
import { toUrl } from './limited-format-utils'
import { PREDEFINED_LIMITED_FORMATS } from './limited-format.const'
@UntilDestroy()
@Component({
  selector: 'app-limited-format-modal',
  templateUrl: './limited-format-modal.component.html',
  styleUrls: ['./limited-format-modal.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    TranslocoDirective,
    NgbPopover,
    NgbTypeahead,
    NgbHighlight,
  ],
})
export class LimitedFormatModalComponent implements OnInit {
  previousFormat: ApiDeckLimitedFormat | null = null
  isMobile$ = this.mediaService.observeMobile()
  formatForm: FormGroup
  predefinedFormats = PREDEFINED_LIMITED_FORMATS
  selectedFormat: ApiDeckLimitedFormat | null = null
  isCustomFormat = false
  availableSets: ApiSet[] = []

  @ViewChild('allowedCryptFilter') allowedCryptFilter!: CardFilterComponent
  @ViewChild('bannedCryptFilter') bannedCryptFilter!: CardFilterComponent

  constructor(
    private readonly fb: FormBuilder,
    public readonly activeModal: NgbActiveModal,
    private readonly apiDataService: ApiDataService,
    private readonly cryptQuery: CryptQuery,
    private readonly libraryQuery: LibraryQuery,
    private readonly mediaService: MediaService,
    private readonly toastService: ToastService,
    private readonly translocoService: TranslocoService,
    private readonly clipboard: Clipboard,
  ) {
    this.formatForm = this.fb.group({
      name: ['', Validators.required],
      sets: this.fb.group({}),
      minCrypt: [12, [Validators.min(0)]],
      maxCrypt: [null, [Validators.min(0)]],
      minLibrary: [60, [Validators.min(0)]],
      maxLibrary: [90, [Validators.min(0)]],
      allowed: this.fb.group({
        crypt: this.fb.group({}),
        library: this.fb.group({}),
      }),
      banned: this.fb.group({
        crypt: this.fb.group({}),
        library: this.fb.group({}),
      }),
    })
  }

  ngOnInit(): void {
    this.initializePredefinedFormats()
    this.loadSets()
  }

  private loadSets(): void {
    this.apiDataService
      .getSets()
      .pipe(untilDestroyed(this))
      .subscribe((sets) => {
        this.availableSets = sets
          .filter((set) => !set.abbrev.startsWith('Promo-'))
          .sort(
            (a, b) =>
              new Date(b.releaseDate).getTime() -
              new Date(a.releaseDate).getTime(),
          )
        this.initializeSetControls()
        this.initializeWithFormat()
      })
  }

  private initializeWithFormat(): void {
    const format = this.previousFormat
    if (!format) {
      return
    }
    // Always initialize as custom format
    this.onCreateCustom()

    // Set basic form values
    this.formatForm.patchValue({
      name: format.name,
      minCrypt: format.minCrypt,
      maxCrypt: format.maxCrypt,
      minLibrary: format.minLibrary,
      maxLibrary: format.maxLibrary,
    })

    // Set sets values
    Object.entries(format.sets).forEach(([setAbbrev, isSelected]) => {
      const control = this.getSetControl(setAbbrev)
      if (control) {
        control.setValue(isSelected)
      }
    })

    // Load and set allowed crypt cards
    Object.entries(format.allowed.crypt).forEach(([cardId, isAllowed]) => {
      if (isAllowed) {
        this.cryptQuery.selectEntity(parseInt(cardId)).subscribe((card) => {
          if (card) {
            this.allowedCryptCards.addControl(cardId, this.fb.control(card))
          }
        })
      }
    })

    // Load and set allowed library cards
    Object.entries(format.allowed.library).forEach(([cardId, isAllowed]) => {
      if (isAllowed) {
        this.libraryQuery.selectEntity(parseInt(cardId)).subscribe((card) => {
          if (card) {
            this.allowedLibraryCards.addControl(cardId, this.fb.control(card))
          }
        })
      }
    })

    // Load and set banned crypt cards
    Object.entries(format.banned.crypt).forEach(([cardId, isBanned]) => {
      if (isBanned) {
        this.cryptQuery.selectEntity(parseInt(cardId)).subscribe((card) => {
          if (card) {
            this.bannedCryptCards.addControl(cardId, this.fb.control(card))
          }
        })
      }
    })

    // Load and set banned library cards
    Object.entries(format.banned.library).forEach(([cardId, isBanned]) => {
      if (isBanned) {
        this.libraryQuery.selectEntity(parseInt(cardId)).subscribe((card) => {
          if (card) {
            this.bannedLibraryCards.addControl(cardId, this.fb.control(card))
          }
        })
      }
    })
  }

  private initializePredefinedFormats(): void {
    this.selectedFormat = this.predefinedFormats[0]
  }

  getSetControl(setAbbrev: string): FormControl {
    return this.setsGroup.get(setAbbrev) as FormControl
  }

  get setsGroup(): FormGroup {
    return this.formatForm.get('sets') as FormGroup
  }

  private initializeSetControls(): void {
    this.availableSets.forEach((set) => {
      this.setsGroup.addControl(set.abbrev, this.fb.control(false))
    })
  }

  onFormatSelect(event: Event, formatId?: number): void {
    const input = event.target as HTMLInputElement
    const id = formatId?.toString() ?? input.value
    const format = this.predefinedFormats.find((f) => f.id?.toString() === id)
    if (format) {
      this.selectedFormat = format
      this.isCustomFormat = false
    }
  }

  searchCrypt: OperatorFunction<string, ApiCrypt[]> = (
    text$: Observable<string>,
  ) =>
    text$.pipe(
      debounceTime(200),
      mergeMap((term) => combineLatest([of(term)])),
      switchMap(([term]) => this.cryptQuery.selectByName(term, 10)),
    )

  searchLibrary: OperatorFunction<string, ApiLibrary[]> = (
    text$: Observable<string>,
  ) =>
    text$.pipe(
      debounceTime(200),
      mergeMap((term) => combineLatest([of(term)])),
      switchMap(([term]) => this.libraryQuery.selectByName(term, 10)),
    )

  formatter = (x: { name: string }) => x.name

  get allowedCryptCards(): FormGroup {
    return this.formatForm.get('allowed.crypt') as FormGroup
  }

  get allowedLibraryCards(): FormGroup {
    return this.formatForm.get('allowed.library') as FormGroup
  }

  get bannedCryptCards(): FormGroup {
    return this.formatForm.get('banned.crypt') as FormGroup
  }

  get bannedLibraryCards(): FormGroup {
    return this.formatForm.get('banned.library') as FormGroup
  }

  selectAllowedCryptItem(
    selectItemEvent: NgbTypeaheadSelectItemEvent<ApiCrypt>,
    input: any,
  ) {
    selectItemEvent.preventDefault()
    input.value = ''
    const item = selectItemEvent.item
    this.allowedCryptCards.addControl(item.id.toString(), this.fb.control(item))
  }

  selectAllowedLibraryItem(
    selectItemEvent: NgbTypeaheadSelectItemEvent<ApiLibrary>,
    input: any,
  ) {
    selectItemEvent.preventDefault()
    input.value = ''
    const item = selectItemEvent.item
    this.allowedLibraryCards.addControl(
      item.id.toString(),
      this.fb.control(item),
    )
  }

  removeAllowedCryptCard(id: string): void {
    this.allowedCryptCards.removeControl(id)
  }

  removeAllowedLibraryCard(id: string): void {
    this.allowedLibraryCards.removeControl(id)
  }

  selectBannedCryptItem(
    selectItemEvent: NgbTypeaheadSelectItemEvent<ApiCrypt>,
    input: any,
  ) {
    selectItemEvent.preventDefault()
    input.value = ''
    const item = selectItemEvent.item
    this.bannedCryptCards.addControl(item.id.toString(), this.fb.control(item))
  }

  selectBannedLibraryItem(
    selectItemEvent: NgbTypeaheadSelectItemEvent<ApiLibrary>,
    input: any,
  ) {
    selectItemEvent.preventDefault()
    input.value = ''
    const item = selectItemEvent.item
    this.bannedLibraryCards.addControl(
      item.id.toString(),
      this.fb.control(item),
    )
  }

  removeBannedCryptCard(id: string): void {
    this.bannedCryptCards.removeControl(id)
  }

  removeBannedLibraryCard(id: string): void {
    this.bannedLibraryCards.removeControl(id)
  }

  onCreateCustom(): void {
    this.isCustomFormat = true
    this.selectedFormat = null
    Object.keys(this.allowedCryptCards.controls).forEach((key) => {
      this.allowedCryptCards.removeControl(key)
    })
    Object.keys(this.allowedLibraryCards.controls).forEach((key) => {
      this.allowedLibraryCards.removeControl(key)
    })
    Object.keys(this.bannedCryptCards.controls).forEach((key) => {
      this.bannedCryptCards.removeControl(key)
    })
    Object.keys(this.bannedLibraryCards.controls).forEach((key) => {
      this.bannedLibraryCards.removeControl(key)
    })
    this.formatForm.reset({
      minCrypt: 12,
      maxCrypt: null,
      minLibrary: 60,
      maxLibrary: 90,
    })
  }

  onBackToPredefined(): void {
    this.isCustomFormat = false
    this.selectedFormat = this.predefinedFormats[0]
  }

  onSubmit(): void {
    if (this.selectedFormat) {
      this.activeModal.close(this.selectedFormat)
    } else if (this.formatForm.valid) {
      this.activeModal.close(this.convertToDeckLimitedFormat(this.formatForm))
    }
  }

  onExport(): void {
    if (this.formatForm.valid) {
      const format = this.convertToDeckLimitedFormat(this.formatForm)
      const jsonString = JSON.stringify(format, null, 2)
      const blob = new Blob([jsonString], { type: 'application/json' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${format.name?.toLowerCase().replace(/\s+/g, '-')}-format.json`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      this.toastService.show(
        this.translocoService.translate('deck_builder.export_success'),
        { classname: 'bg-success text-light', delay: 3000 },
      )
    }
  }

  onImport(event: Event): void {
    const input = event.target as HTMLInputElement
    if (input?.files?.[0]) {
      const file = input.files[0]
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const format = JSON.parse(
            e.target?.result as string,
          ) as ApiDeckLimitedFormat

          // Reset form and set basic values
          this.onCreateCustom()
          this.formatForm.patchValue({
            name: format.name,
            minCrypt: format.minCrypt,
            maxCrypt: format.maxCrypt,
            minLibrary: format.minLibrary,
            maxLibrary: format.maxLibrary,
          })

          // Set sets values
          Object.entries(format.sets).forEach(([setAbbrev, isSelected]) => {
            const control = this.getSetControl(setAbbrev)
            if (control) {
              control.setValue(isSelected)
            }
          })

          // Set allowed cards
          Object.entries(format.allowed.crypt).forEach(
            ([cardId, isAllowed]) => {
              if (isAllowed) {
                this.cryptQuery
                  .selectEntity(parseInt(cardId))
                  .subscribe((card) => {
                    if (card) {
                      this.allowedCryptCards.addControl(
                        cardId,
                        this.fb.control(card),
                      )
                    }
                  })
              }
            },
          )

          Object.entries(format.allowed.library).forEach(
            ([cardId, isAllowed]) => {
              if (isAllowed) {
                this.libraryQuery
                  .selectEntity(parseInt(cardId))
                  .subscribe((card) => {
                    if (card) {
                      this.allowedLibraryCards.addControl(
                        cardId,
                        this.fb.control(card),
                      )
                    }
                  })
              }
            },
          )

          // Set banned cards
          Object.entries(format.banned.crypt).forEach(([cardId, isBanned]) => {
            if (isBanned) {
              this.cryptQuery
                .selectEntity(parseInt(cardId))
                .subscribe((card) => {
                  if (card) {
                    this.bannedCryptCards.addControl(
                      cardId,
                      this.fb.control(card),
                    )
                  }
                })
            }
          })

          Object.entries(format.banned.library).forEach(
            ([cardId, isBanned]) => {
              if (isBanned) {
                this.libraryQuery
                  .selectEntity(parseInt(cardId))
                  .subscribe((card) => {
                    if (card) {
                      this.bannedLibraryCards.addControl(
                        cardId,
                        this.fb.control(card),
                      )
                    }
                  })
              }
            },
          )
          this.toastService.show(
            this.translocoService.translate('deck_builder.import_success'),
            { classname: 'bg-success text-light', delay: 3000 },
          )
        } catch (error) {
          console.error('Failed to import format:', error)
          this.toastService.show(
            this.translocoService.translate('deck_builder.import_error'),
            { classname: 'bg-danger text-light', delay: 3000 },
          )
        }
      }
      reader.readAsText(file)
    }
  }

  onCancel(): void {
    this.activeModal.dismiss()
  }

  onRemove(): void {
    this.activeModal.close(this.predefinedFormats[0])
  }

  private convertToDeckLimitedFormat(form: FormGroup): ApiDeckLimitedFormat {
    const formValue = form.value
    return {
      name: formValue.name,
      sets: this.convertToFilter(formValue.sets),
      minCrypt: formValue.minCrypt,
      maxCrypt: formValue.maxCrypt,
      minLibrary: formValue.minLibrary,
      maxLibrary: formValue.maxLibrary,
      allowed: {
        crypt: this.convertToFilter(formValue.allowed.crypt),
        library: this.convertToFilter(formValue.allowed.library),
      },
      banned: {
        crypt: this.convertToFilter(formValue.banned.crypt),
        library: this.convertToFilter(formValue.banned.library),
      },
    } as ApiDeckLimitedFormat
  }

  private convertToFilter(obj: {
    [key: string]: any
  }): ApiDeckLimitedFormatFilter {
    const filter: ApiDeckLimitedFormatFilter = {}
    Object.entries(obj).forEach(([key, value]) => {
      if (value) {
        filter[key] = true
      }
    })
    return filter
  }

  onCopyFormatUrl(): void {
    const format = this.convertToDeckLimitedFormat(this.formatForm)
    const formatJson = toUrl(format)
    const encodedFormat = encodeURIComponent(formatJson)
    const url = `https://${environment.domain}/decks/builder?limitedFormat=${encodedFormat}`
    if (window.navigator.share) {
      window.navigator.share({
        url: url,
      })
    } else {
      this.clipboard.copy(url)
      this.toastService.show(
        this.translocoService.translate('deck_builder.link_copied'),
        { classname: 'bg-success text-light', delay: 5000 },
      )
    }
  }
}
