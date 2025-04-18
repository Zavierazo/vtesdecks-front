import { Clipboard } from '@angular/cdk/clipboard'
import { AsyncPipe, NgClass, NgFor, NgIf } from '@angular/common'
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnInit,
} from '@angular/core'
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
  NgbDropdown,
  NgbDropdownButtonItem,
  NgbDropdownItem,
  NgbDropdownMenu,
  NgbDropdownToggle,
  NgbModal,
  NgbTooltip,
} from '@ng-bootstrap/ng-bootstrap'
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy'
import { debounceTime, filter, Observable, switchMap, tap, zip } from 'rxjs'
import { ApiCard } from '../../models/api-card'
import { ApiDisciplineStat } from '../../models/api-discipline-stat'
import { ToastService } from '../../services/toast.service'
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component'
import { ComponentCanDeactivate } from '../../shared/guards/can-deactivate-component.guard'
import { DeckBuilderService } from '../../state/deck-builder/deck-builder.service'
import { getClanIcon } from '../../utils/clans'
import { getDisciplineIcon } from '../../utils/disciplines'
import { CryptComponent } from '../deck-shared/crypt/crypt.component'
import { LibraryListComponent } from '../deck-shared/library-list/library-list.component'
import { environment } from './../../../environments/environment'
import { ApiClanStat } from './../../models/api-clan-stat'
import { CryptService } from './../../state/crypt/crypt.service'
import { DeckBuilderQuery } from './../../state/deck-builder/deck-builder.query'
import { LibraryService } from './../../state/library/library.service'
import { CryptBuilderComponent } from './crypt-builder/crypt-builder.component'
import { DrawCardsComponent } from './draw-cards/draw-cards.component'
import { ImportAmaranthComponent } from './import-amaranth/import-amaranth.component'
import { ImportVdbComponent } from './import-vdb/import-vdb.component'
import { LibraryBuilderComponent } from './library-builder/library-builder.component'

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
    NgIf,
    RouterLink,
    NgbTooltip,
    NgFor,
    NgClass,
    CryptComponent,
    LibraryListComponent,
    AsyncPipe,
    TranslocoPipe,
  ],
})
export class BuilderComponent implements OnInit, ComponentCanDeactivate {
  form!: FormGroup
  deckId$!: Observable<string | undefined>
  cryptList$!: Observable<ApiCard[]>
  cryptSize$!: Observable<number>
  cryptDisciplines$!: Observable<ApiDisciplineStat[]>
  minCrypt$!: Observable<number>
  maxCrypt$!: Observable<number>
  avgCrypt$!: Observable<number>
  libraryList$!: Observable<ApiCard[]>
  librarySize$!: Observable<number>
  libraryPoolCost$!: Observable<number | undefined>
  libraryBloodCost$!: Observable<number | undefined>
  libraryClans$!: Observable<ApiClanStat[]>
  libraryDisciplines$!: Observable<ApiDisciplineStat[]>
  cryptErrors$!: Observable<string[]>
  libraryErrors$!: Observable<string[]>
  saved$!: Observable<boolean>

  constructor(
    private readonly router: Router,
    private readonly route: ActivatedRoute,
    private readonly deckBuilderQuery: DeckBuilderQuery,
    private readonly deckBuilderService: DeckBuilderService,
    private readonly libraryService: LibraryService,
    private readonly cryptService: CryptService,
    private readonly toastService: ToastService,
    private readonly modalService: NgbModal,
    private readonly changeDetector: ChangeDetectorRef,
    private readonly clipboard: Clipboard,
    private readonly translocoService: TranslocoService,
  ) {}

  ngOnInit() {
    this.cryptList$ = this.deckBuilderQuery.selectCrypt()
    this.cryptSize$ = this.deckBuilderQuery.selectCryptSize()
    this.cryptDisciplines$ = this.deckBuilderQuery.selectCryptDisciplines()
    this.minCrypt$ = this.deckBuilderQuery.selectMinCrypt()
    this.maxCrypt$ = this.deckBuilderQuery.selectMaxCrypt()
    this.avgCrypt$ = this.deckBuilderQuery.selectAvgCrypt()
    this.libraryList$ = this.deckBuilderQuery.selectLibrary()
    this.librarySize$ = this.deckBuilderQuery.selectLibrarySize()
    this.libraryPoolCost$ = this.deckBuilderQuery.selectLibraryPoolCost()
    this.libraryBloodCost$ = this.deckBuilderQuery.selectLibraryBloodCost()
    this.libraryClans$ = this.deckBuilderQuery.selectLibraryClans()
    this.libraryDisciplines$ = this.deckBuilderQuery.selectLibraryDisciplines()
    this.cryptErrors$ = this.deckBuilderQuery.selectCryptErrors()
    this.libraryErrors$ = this.deckBuilderQuery.selectLibraryErrors()
    this.deckId$ = this.deckBuilderQuery.selectDeckId()
    this.saved$ = this.deckBuilderQuery.selectSaved()
    this.initForm()
    this.initCards()
      .pipe(
        untilDestroyed(this),
        switchMap(() => this.initDeck()),
      )
      .subscribe({
        error: () => {
          this.toastService.show(
            this.translocoService.translate('deck_builder.deck_not_exists'),
            { classname: 'bg-danger text-light', delay: 10000 },
          )
          this.changeDetector.markForCheck()
        },
      })
  }

  private initCards(): Observable<any> {
    return zip(
      this.cryptService.getCryptCards(),
      this.libraryService.getLibraryCards(),
    )
  }

  initDeck(): Observable<any> {
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
    if (
      this.deckBuilderQuery.getPublished() &&
      !this.deckBuilderQuery.isValidDeck()
    ) {
      this.toastService.show(
        this.translocoService.translate('deck_builder.invalid_public_deck'),
        { classname: 'bg-danger text-light', delay: 5000 },
      )
      return
    }
    this.deckBuilderService
      .saveDeck()
      .pipe(
        untilDestroyed(this),
        tap(() =>
          this.toastService.show(
            this.translocoService.translate('deck_builder.deck_saved'),
            { classname: 'bg-success text-light', delay: 5000 },
          ),
        ),
        tap(() => this.onDeckLoaded()),
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

  shareDeck() {
    const deckId = this.deckBuilderQuery.getDeckId()
    if (deckId) {
      this.clipboard.copy(`https://${environment.domain}/deck/${deckId}`)
      this.toastService.show(
        this.translocoService.translate('deck_builder.link_copied'),
        { classname: 'bg-success text-light', delay: 5000 },
      )
    }
  }

  deleteDeck() {
    const deckId = this.deckBuilderQuery.getDeckId()
    if (deckId) {
      const modalRef = this.modalService.open(ConfirmDialogComponent, {
        size: 'sm',
        centered: true,
      })
      modalRef.componentInstance.title = this.translocoService.translate(
        'deck_builder.delete_title',
      )
      modalRef.componentInstance.message = this.translocoService.translate(
        'deck_builder.delete_message',
      )
      modalRef.closed
        .pipe(
          untilDestroyed(this),
          filter((result) => result),
          switchMap(() =>
            this.deckBuilderService.deleteDeck(deckId).pipe(
              untilDestroyed(this),
              tap(() => {
                this.onDeckLoaded()
                this.toastService.show(
                  this.translocoService.translate(
                    'deck_builder.delete_successful',
                  ),
                  { classname: 'bg-success text-light', delay: 5000 },
                )
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

  openCryptBuilder() {
    this.modalService.open(CryptBuilderComponent, {
      size: 'xl',
      centered: true,
      scrollable: true,
    })
  }

  openLibraryBuilder() {
    this.modalService.open(LibraryBuilderComponent, {
      size: 'xl',
      centered: true,
      scrollable: true,
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

  trackByFn(_: number, item: ApiCard) {
    return item.id
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

  private initForm() {
    this.form = new FormGroup({
      name: new FormControl(undefined, Validators.required),
      description: new FormControl(undefined),
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
        filter((value) => value.length > 0),
        debounceTime(100),
        tap((value) => {
          this.deckBuilderService.updateDescription(value)
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
    this.form
      .get('name')
      ?.patchValue(this.deckBuilderQuery.getName(), { emitEvent: false })
    this.form
      .get('description')
      ?.patchValue(this.deckBuilderQuery.getDescription(), { emitEvent: false })
    this.form
      .get('published')
      ?.patchValue(this.deckBuilderQuery.getPublished(), { emitEvent: false })
    this.changeDetector.markForCheck()
  }
}
