import { Clipboard } from '@angular/cdk/clipboard'
import { AsyncPipe, NgClass, NgTemplateOutlet } from '@angular/common'
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  inject,
  OnInit,
  signal,
} from '@angular/core'
import { toObservable } from '@angular/core/rxjs-interop'
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms'
import { ActivatedRoute, Router, RouterLink } from '@angular/router'
import {
  TranslocoDirective,
  TranslocoPipe,
  TranslocoService,
} from '@jsverse/transloco'
import {
  ApiArchetypeKeyCard,
  ApiDeckBuilder,
  ApiDeckLimitedFormat,
  DeckCryptSortBy,
  DeckLibrarySortBy,
} from '@models'
import {
  NgbDropdown,
  NgbDropdownButtonItem,
  NgbDropdownItem,
  NgbDropdownMenu,
  NgbDropdownToggle,
  NgbModal,
  NgbTooltip,
} from '@ng-bootstrap/ng-bootstrap'
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy'
import { ApiDataService, SeoService, ToastService } from '@services'
import { DeleteDialogComponent } from '@shared/components/delete-dialog/delete-dialog.component'
import { MarkdownTextareaComponent } from '@shared/components/markdown-textarea/markdown-textarea.component'
import { ToggleIconComponent } from '@shared/components/toggle-icon/toggle-icon.component'
import { ComponentCanDeactivate } from '@shared/guards/can-deactivate-component.guard'
import { AuthQuery } from '@state/auth/auth.query'
import { AuthService } from '@state/auth/auth.service'
import { DeckBuilderQuery } from '@state/deck-builder/deck-builder.query'
import { DeckBuilderService } from '@state/deck-builder/deck-builder.service'
import { DecksService } from '@state/decks/decks.service'
import { getClanIcon, getDisciplineIcon } from '@utils'
import {
  catchError,
  debounceTime,
  distinctUntilChanged,
  EMPTY,
  filter,
  map,
  Observable,
  skip,
  switchMap,
  tap,
} from 'rxjs'
import { CryptGridCardComponent } from '../deck-shared/crypt-grid-card/crypt-grid-card.component'
import { CryptComponent } from '../deck-shared/crypt/crypt.component'
import { LibraryListComponent } from '../deck-shared/library-list/library-list.component'
import { PrintProxyModalComponent } from '../deck-shared/print-proxy-modal/print-proxy-modal.component'
import { ShoppingOptimizerModalComponent } from '../deck-shared/shopping-optimizer-modal/shopping-optimizer-modal.component'
import { environment } from './../../../environments/environment'
import { BuilderSuggestionsComponent } from './builder-suggestions/builder-suggestions.component'
import { CryptBuilderComponent } from './crypt-builder/crypt-builder.component'
import { DeckHistoryModalComponent } from './deck-history-modal/deck-history-modal.component'
import { DraftRecoveryModalComponent } from './draft-recovery-modal/draft-recovery-modal.component'
import { DrawCardsComponent } from './draw-cards/draw-cards.component'
import { ImportAmaranthComponent } from './import-amaranth/import-amaranth.component'
import { ImportRecentDecksModalComponent } from './import-recent-decks/import-recent-decks-modal.component'
import { ImportTextComponent } from './import-text/import-text.component'
import { ImportVdbComponent } from './import-vdb/import-vdb.component'
import { LibraryBuilderComponent } from './library-builder/library-builder.component'
import { LimitedFormatModalComponent } from './limited-format/limited-format-modal.component'
import { fromUrl } from './limited-format/limited-format-utils'

@UntilDestroy()
@Component({
  selector: 'app-builder',
  templateUrl: './builder.component.html',
  styleUrls: ['./builder.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    TranslocoDirective,
    ReactiveFormsModule,
    NgbDropdown,
    NgbDropdownToggle,
    NgbDropdownMenu,
    NgbDropdownButtonItem,
    NgbDropdownItem,
    RouterLink,
    NgbTooltip,
    NgClass,
    CryptComponent,
    LibraryListComponent,
    BuilderSuggestionsComponent,
    AsyncPipe,
    TranslocoPipe,
    MarkdownTextareaComponent,
    ToggleIconComponent,
    CryptGridCardComponent,
    NgTemplateOutlet,
  ],
})
export class BuilderComponent implements OnInit, ComponentCanDeactivate {
  private readonly router = inject(Router)
  private readonly route = inject(ActivatedRoute)
  private readonly authQuery = inject(AuthQuery)
  private readonly authService = inject(AuthService)
  private readonly deckBuilderQuery = inject(DeckBuilderQuery)
  private readonly deckBuilderService = inject(DeckBuilderService)
  private readonly decksService = inject(DecksService)
  private readonly toastService = inject(ToastService)
  private readonly seoService = inject(SeoService)
  private readonly modalService = inject(NgbModal)
  private readonly changeDetector = inject(ChangeDetectorRef)
  private readonly clipboard = inject(Clipboard)
  private readonly translocoService = inject(TranslocoService)
  private readonly apiDataService = inject(ApiDataService)

  form!: FormGroup
  tagLabelControl = new FormControl<string>('')
  cryptSearch = signal<string>('')
  librarySearch = signal<string>('')
  deckId$ = this.deckBuilderQuery.selectDeckId()
  cryptList$ = this.deckBuilderQuery.selectCryptFiltered(
    toObservable(this.cryptSearch),
  )
  cryptSortBy$ = this.deckBuilderQuery.selectCryptSortBy()
  cryptSize$ = this.deckBuilderQuery.selectCryptSize()
  cryptDisciplines$ = this.deckBuilderQuery.selectCryptDisciplines()
  minCrypt$ = this.deckBuilderQuery.selectMinCrypt()
  maxCrypt$ = this.deckBuilderQuery.selectMaxCrypt()
  avgCrypt$ = this.deckBuilderQuery.selectAvgCrypt()
  libraryList$ = this.deckBuilderQuery.selectLibraryFiltered(
    toObservable(this.librarySearch),
  )
  librarySortBy$ = this.deckBuilderQuery.selectLibrarySortBy()
  librarySize$ = this.deckBuilderQuery.selectLibrarySize()
  libraryPoolCost$ = this.deckBuilderQuery.selectLibraryPoolCost()
  libraryBloodCost$ = this.deckBuilderQuery.selectLibraryBloodCost()
  libraryClans$ = this.deckBuilderQuery.selectLibraryClans()
  libraryDisciplines$ = this.deckBuilderQuery.selectLibraryDisciplines()
  cryptErrors$ = this.deckBuilderQuery.selectCryptErrors()
  libraryErrors$ = this.deckBuilderQuery.selectLibraryErrors()
  saved$ = this.deckBuilderQuery.selectSaved()
  limitedFormat$ = this.deckBuilderQuery.selectLimitedFormat()
  collectionTracker$ = this.deckBuilderQuery.selectCollection()
  loading$ = this.deckBuilderQuery.selectLoading()
  isDeckEmpty$ = this.deckBuilderQuery
    .selectCards()
    .pipe(map((cards) => cards.every((card) => card.number <= 0)))

  suggestedCards$ = this.deckBuilderQuery.selectSuggestedCards()

  cryptRecommendations$ = this.suggestedCards$.pipe(
    map(
      (suggested) =>
        new Map<number, ApiArchetypeKeyCard>(
          (suggested?.keyCrypt ?? []).map((card) => [card.id, card]),
        ),
    ),
  )

  libraryRecommendations$ = this.suggestedCards$.pipe(
    map(
      (suggested) =>
        new Map<number, ApiArchetypeKeyCard>(
          (suggested?.keyLibrary ?? []).map((card) => [card.id, card]),
        ),
    ),
  )

  displayMode$ = this.authQuery.selectBuilderDisplayMode()
  displayModeOptions = [
    {
      option: 'grid',
      icon: 'grid-fill',
      label: 'shared.grid',
    },
    {
      option: 'list',
      icon: 'list',
      label: 'shared.list',
    },
  ]

  ngOnInit() {
    this.seoService.update({
      title: 'Deck Builder',
      description:
        'Build and publish your own VTES deck. Add crypt and library cards, manage quantities, and share with the community.',
      canonicalUrl: 'https://vtesdecks.com/decks/builder',
    })
    this.initForm()
    this.initDeck()
      .pipe(untilDestroyed(this))
      .subscribe({
        error: () => {
          this.toastService.show(
            this.translocoService.translate('deck_builder.deck_not_exists'),
            { classname: 'bg-danger text-light', delay: 10000 },
          )
          this.changeDetector.markForCheck()
        },
      })

    this.deckBuilderQuery
      .selectCards()
      .pipe(
        untilDestroyed(this),
        map((cards) => cards.map((c) => `${c.id}:${c.number}`).join(',')),
        distinctUntilChanged(),
        debounceTime(5000),
        skip(1),
        tap(() => this.deckBuilderService.fetchSuggestedCards()),
      )
      .subscribe()
  }

  onChangeDisplayMode(displayMode: string) {
    const displayModeValue = displayMode as 'list' | 'grid'
    this.authService.updateBuilderDisplayMode(displayModeValue)
  }

  initDeck(): Observable<ApiDeckBuilder> {
    const id = this.route.snapshot.queryParams['id']
    const cloneDeck = history.state?.deck
    return this.deckBuilderService
      .init(id, cloneDeck)
      .pipe(tap(() => this.onDeckLoaded()))
  }

  saveDeck() {
    if (this.deckBuilderQuery.getSaved()) {
      this.toastService.show(
        this.translocoService.translate('deck_builder.already_saved'),
        { classname: 'bg-danger text-light', delay: 3000 },
      )
      return
    }
    if (
      !this.deckBuilderQuery.getName() ||
      this.deckBuilderQuery.getName() === ''
    ) {
      this.toastService.show(
        this.translocoService.translate('deck_builder.name_required'),
        { classname: 'bg-danger text-light', delay: 3000 },
      )
      return
    }
    this.deckBuilderService.validateDeck()
    const validation = this.deckBuilderQuery.getValidation()
    if (validation) {
      const errors = validation(this.deckBuilderQuery)
      if (errors.length > 0) {
        this.toastService.show(
          this.translocoService.translate('deck_builder.validation_errors', {
            errors: errors.join(', '),
          }),
          { classname: 'bg-danger text-light', delay: 10000 },
        )
        return
      }
    }

    if (
      this.deckBuilderQuery.getPublished() &&
      !this.deckBuilderQuery.isValidDeck() &&
      !this.deckBuilderQuery.isPreconstructedDeck()
    ) {
      this.toastService.show(
        this.translocoService.translate('deck_builder.invalid_public_deck'),
        { classname: 'bg-danger text-light', delay: 5000 },
      )
      return
    }
    this.deckBuilderService
      .saveDeck(this.tagLabelControl.value || undefined)
      .pipe(
        untilDestroyed(this),
        tap(() => {
          this.tagLabelControl.reset('')
          this.toastService.show(
            this.translocoService.translate('deck_builder.deck_saved'),
            { classname: 'bg-success text-light', delay: 5000 },
          )
          this.decksService.reset()
          this.onDeckLoaded()
        }),
      )
      .subscribe({
        error: (error) => {
          if (error.message) {
            this.toastService.show(
              this.translocoService.translate(
                'shared.unexpected_error_with_message',
                { message: error.message },
              ),
              { classname: 'bg-danger text-light', delay: 10000 },
            )
          } else {
            this.toastService.show(
              this.translocoService.translate('shared.unexpected_error'),
              { classname: 'bg-danger text-light', delay: 10000 },
            )
          }
        },
      })
  }

  shareDeck() {
    const deckId = this.deckBuilderQuery.getDeckId()
    if (deckId) {
      const url = `https://${environment.domain}/deck/${deckId}`
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

  deleteDeck() {
    const deckId = this.deckBuilderQuery.getDeckId()
    if (deckId) {
      const modalRef = this.modalService.open(DeleteDialogComponent, {
        size: 'md',
        centered: true,
      })
      modalRef.componentInstance.titleLabel = 'deck_builder.delete_title'
      modalRef.componentInstance.messageLabel = 'deck_builder.delete_message'
      modalRef.closed
        .pipe(
          untilDestroyed(this),
          filter((result) => result),
          switchMap((result) =>
            this.deckBuilderService
              .deleteDeck(deckId, result === 'PERMANENT')
              .pipe(
                untilDestroyed(this),
                tap(() => {
                  this.onDeckLoaded()
                  this.toastService.show(
                    this.translocoService.translate(
                      'deck_builder.delete_successful',
                    ),
                    { classname: 'bg-success text-light', delay: 5000 },
                  )
                  this.decksService.reset()
                  this.router.navigate(['/decks'], {
                    queryParams: { type: 'USER' },
                  })
                }),
              ),
          ),
        )
        .subscribe({
          error: () => {
            this.toastService.show(
              this.translocoService.translate('shared.unexpected_error'),
              { classname: 'bg-danger text-light', delay: 10000 },
            )
          },
        })
    }
  }

  canDeactivate(): boolean {
    return this.deckBuilderQuery.getSaved()
  }

  addCard(id: number) {
    this.deckBuilderService.addCard(id)
    this.changeDetector.markForCheck()
  }

  removeCard(id: number) {
    this.deckBuilderService.removeCard(id)
    this.changeDetector.markForCheck()
  }

  openHistory(): void {
    const deckId = this.deckBuilderQuery.getDeckId()
    if (!deckId) return
    const modalRef = this.modalService.open(DeckHistoryModalComponent, {
      size: 'lg',
      centered: true,
      scrollable: true,
    })
    modalRef.componentInstance.deckId = deckId
    modalRef.closed.pipe(untilDestroyed(this)).subscribe((cards) => {
      if (cards) {
        this.deckBuilderService.restoreFromHistory(cards)
        this.onDeckLoaded()
      }
    })
  }

  openImportText(): void {
    this.modalService
      .open(ImportTextComponent, {
        size: 'lg',
        centered: true,
        scrollable: true,
      })
      .closed.pipe(
        untilDestroyed(this),
        switchMap((result) =>
          this.deckBuilderService.applyImportedDeck(result),
        ),
        tap(() => this.onDeckLoaded()),
      )
      .subscribe({
        error: () => {
          this.toastService.show(
            this.translocoService.translate('shared.unexpected_error'),
            { classname: 'bg-danger text-light', delay: 10000 },
          )
          this.changeDetector.markForCheck()
        },
      })
  }

  openCryptBuilder() {
    const modalRef = this.modalService.open(CryptBuilderComponent, {
      fullscreen: true,
      centered: true,
      scrollable: true,
    })
    const suggested = this.deckBuilderQuery.getValue().suggestedCards
    if (suggested?.keyCrypt) {
      modalRef.componentInstance.suggestedCardIds = [...suggested.keyCrypt].map(
        (c) => c.id,
      )
    }
  }

  openLibraryBuilder() {
    const modalRef = this.modalService.open(LibraryBuilderComponent, {
      fullscreen: true,
      centered: true,
      scrollable: true,
    })
    const suggested = this.deckBuilderQuery.getValue().suggestedCards
    if (suggested?.keyLibrary) {
      modalRef.componentInstance.suggestedCardIds = [
        ...suggested.keyLibrary,
      ].map((c) => c.id)
    }
  }

  openImportRecentDecks(): void {
    const modalRef = this.modalService.open(ImportRecentDecksModalComponent, {
      centered: true,
      scrollable: true,
    })
    modalRef.closed
      .pipe(
        untilDestroyed(this),
        switchMap((deckId: string) =>
          this.apiDataService.getDeckBuilder(deckId),
        ),
      )
      .subscribe((deck) => {
        this.deckBuilderService.cloneFrom(deck)
        this.onDeckLoaded()
        this.changeDetector.markForCheck()
      })
  }

  openImportAmaranth() {
    this.modalService
      .open(ImportAmaranthComponent, { centered: true })
      .closed.pipe(
        untilDestroyed(this),
        switchMap((result) =>
          this.deckBuilderService.importDeck('AMARANTH', result),
        ),
        tap(() => this.onDeckLoaded()),
      )
      .subscribe({
        error: () => {
          this.toastService.show(
            this.translocoService.translate('shared.unexpected_error'),
            { classname: 'bg-danger text-light', delay: 10000 },
          )
          this.changeDetector.markForCheck()
        },
      })
  }

  openImportVdb() {
    this.modalService
      .open(ImportVdbComponent, { centered: true })
      .closed.pipe(
        untilDestroyed(this),
        switchMap((result) =>
          this.deckBuilderService.importDeck('VDB', result),
        ),
        tap(() => this.onDeckLoaded()),
      )
      .subscribe({
        error: () => {
          this.toastService.show(
            this.translocoService.translate('shared.unexpected_error'),
            { classname: 'bg-danger text-light', delay: 10000 },
          )
          this.changeDetector.markForCheck()
        },
      })
  }

  getClanIcon(clan: string): string | undefined {
    return getClanIcon(clan)
  }

  getDisciplineIcon(discipline: string, superior: boolean): string | undefined {
    return getDisciplineIcon(discipline, superior)
  }

  onOpenInBuilder(): void {
    this.deckBuilderService.clone()
    this.onDeckLoaded()
  }

  onDraw(): void {
    const modalRef = this.modalService.open(DrawCardsComponent, {
      size: 'xl',
      centered: true,
      scrollable: true,
    })
    modalRef.componentInstance.cards = this.deckBuilderQuery.getValue().cards
  }

  onPrint(): void {
    const modalRef = this.modalService.open(PrintProxyModalComponent, {
      size: 'xl',
      centered: true,
      scrollable: true,
    })
    modalRef.componentInstance.title = this.deckBuilderQuery.getValue().name
    modalRef.componentInstance.cards = this.deckBuilderQuery.getValue().cards
  }

  async onAddMissingToWishlist(): Promise<void> {
    const cards = this.deckBuilderQuery
      .getValue()
      .cards.filter((card) => card.number > 0)
    if (cards.length === 0) {
      return
    }
    // Lazy import to keep the wishlist modal out of the builder chunk
    const { AddMissingToWishlistModalComponent } = await import(
      '../wishlist/add-missing-to-wishlist-modal/add-missing-to-wishlist-modal.component'
    )
    const modalRef = this.modalService.open(
      AddMissingToWishlistModalComponent,
      {
        size: 'lg',
        centered: true,
        scrollable: true,
      },
    )
    modalRef.componentInstance.init(
      cards.map((card) => ({ cardId: card.id, number: card.number })),
    )
  }

  onHowToBuy(): void {
    const cards = this.deckBuilderQuery
      .getValue()
      .cards.filter((card) => card.number > 0)
    if (cards.length === 0) {
      return
    }
    const modalRef = this.modalService.open(ShoppingOptimizerModalComponent, {
      size: 'xl',
      centered: true,
      scrollable: true,
    })
    modalRef.componentInstance.title = this.deckBuilderQuery.getValue().name
    modalRef.componentInstance.cards = cards
    modalRef.componentInstance.allowExcludeOwned = true
  }

  onCopyToClipboard(type: string): void {
    this.apiDataService
      .getExportDeck(this.deckBuilderQuery.getDeckId()!, type)
      .pipe(
        catchError(() => {
          this.toastService.show(
            this.translocoService.translate('deck_builder.export_error'),
            { classname: 'bg-danger text-light', delay: 5000 },
          )
          return EMPTY
        }),
      )
      .subscribe((data) => {
        this.clipboard.copy(data)
        this.toastService.show(
          this.translocoService.translate('deck_builder.deck_copied'),
          { classname: 'bg-success text-light', delay: 5000 },
        )
      })
  }

  onExportFile(type: string): void {
    const deckId = this.deckBuilderQuery.getDeckId()!
    this.apiDataService
      .getExportDeck(deckId, type)
      .pipe(
        catchError(() => {
          this.toastService.show(
            this.translocoService.translate('deck_builder.export_error'),
            { classname: 'bg-danger text-light', delay: 5000 },
          )
          return EMPTY
        }),
      )
      .subscribe((data) => {
        const blob = new Blob([data], { type: 'text/plain' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `deck_${deckId}_${type.toLowerCase()}.txt`
        a.click()
        URL.revokeObjectURL(url)
      })
  }

  get descriptionControl(): FormControl<string> {
    return this.form.get('description') as FormControl<string>
  }

  private initForm() {
    this.form = new FormGroup({
      name: new FormControl(undefined, Validators.required),
      description: new FormControl<string>(''),
      published: new FormControl(true),
    })
    this.form
      .get('name')
      ?.valueChanges.pipe(
        untilDestroyed(this),
        filter((value) => value.length > 0),
        debounceTime(100),
        tap((value) => {
          this.deckBuilderService.updateName(value)
        }),
      )
      .subscribe()
    this.form
      .get('description')
      ?.valueChanges.pipe(
        untilDestroyed(this),
        debounceTime(100),
        tap((value) => {
          this.deckBuilderService.updateDescription(value ?? '')
        }),
      )
      .subscribe()
    this.form
      .get('published')
      ?.valueChanges.pipe(
        untilDestroyed(this),
        tap((value) => {
          this.deckBuilderService.updatePublished(value)
        }),
      )
      .subscribe()
  }

  private onDeckLoaded() {
    const { advent, day } = history.state
    if (advent && day) {
      this.deckBuilderService.initAdventRules(advent.toString(), day.toString())
      this.deckBuilderService.validateDeck()
    }
    this.form
      .get('name')
      ?.patchValue(this.deckBuilderQuery.getName(), { emitEvent: false })
    this.form
      .get('description')
      ?.patchValue(this.deckBuilderQuery.getDescription(), { emitEvent: false })
    this.form
      .get('published')
      ?.patchValue(this.deckBuilderQuery.getPublished(), { emitEvent: false })
    const limitedFormat = this.route.snapshot.queryParams['limitedFormat']
    if (limitedFormat) {
      this.deckBuilderService.setLimitedFormat(fromUrl(limitedFormat))
      this.deckBuilderService.validateDeck()
    }
    this.changeDetector.markForCheck()
    this.deckBuilderService.fetchSuggestedCards()

    // Draft recovery check
    const deckId = this.deckBuilderQuery.getDeckId()
    const draft = this.deckBuilderService.loadDraft(deckId)
    if (draft?.cards && draft.cards.length > 0) {
      const currentCards = this.deckBuilderQuery.getValue().cards
      const toFingerprint = (cards: { id: number; number: number }[]) =>
        cards
          .map((c) => `${c.id}:${c.number}`)
          .sort()
          .join(',')
      if (toFingerprint(draft.cards) !== toFingerprint(currentCards)) {
        const modalRef = this.modalService.open(DraftRecoveryModalComponent, {
          centered: true,
        })
        modalRef.closed.pipe(untilDestroyed(this)).subscribe((restore) => {
          if (restore) {
            this.deckBuilderService.restoreFromDraft(draft)
            this.form
              .get('name')
              ?.patchValue(draft.name ?? this.deckBuilderQuery.getName(), {
                emitEvent: false,
              })
            this.form
              .get('description')
              ?.patchValue(
                draft.description ?? this.deckBuilderQuery.getDescription(),
                { emitEvent: false },
              )
          } else {
            this.deckBuilderService.clearDraft(deckId)
          }
          this.changeDetector.markForCheck()
        })
      }
    }
  }

  openLimitedFormatModal(): void {
    const currentFormat = this.deckBuilderQuery.getLimitedFormat()
    const modalRef = this.modalService.open(LimitedFormatModalComponent, {
      size: 'lg',
      centered: true,
    })
    modalRef.componentInstance.previousFormat = currentFormat
    modalRef.closed.subscribe((result: ApiDeckLimitedFormat | undefined) => {
      if (result) {
        if (
          Object.keys(result.sets).length > 0 ||
          Object.keys(result.allowed.crypt).length > 0 ||
          Object.keys(result.allowed.library).length > 0 ||
          Object.keys(result.banned.crypt).length > 0 ||
          Object.keys(result.banned.library).length > 0
        ) {
          this.deckBuilderService.setLimitedFormat(result)
        } else {
          this.deckBuilderService.setLimitedFormat()
        }
      }
    })
  }

  onCollectionTracker(): void {
    this.deckBuilderService
      .updateCollection(!this.deckBuilderQuery.getCollection())
      .pipe(untilDestroyed(this))
      .subscribe()
  }

  onChangeSortByLibrary(sortBy: DeckLibrarySortBy): void {
    this.deckBuilderService.setLibrarySortBy(sortBy)
  }

  onChangeSortByCrypt(sortBy: DeckCryptSortBy): void {
    this.deckBuilderService.setCryptSortBy(sortBy)
  }
}
