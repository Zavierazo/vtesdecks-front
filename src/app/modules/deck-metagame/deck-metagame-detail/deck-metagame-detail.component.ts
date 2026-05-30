import { AsyncPipe, CurrencyPipe, DecimalPipe } from '@angular/common'
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnInit,
} from '@angular/core'
import { ActivatedRoute, RouterLink } from '@angular/router'
import { TranslocoDirective, TranslocoPipe } from '@jsverse/transloco'
import { ApiArchetypeKeyCard, ApiDeckArchetype } from '@models'
import {
  NgbCollapseModule,
  NgbModal,
  NgbTooltip,
} from '@ng-bootstrap/ng-bootstrap'
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy'
import { ApiDataService } from '@services'
import { AdSenseComponent } from '@shared/components/ad-sense/ad-sense.component'
import { MarkdownTextComponent } from '@shared/components/markdown-text/markdown-text.component'
import { CryptQuery } from '@state/crypt/crypt.query'
import { LibraryQuery } from '@state/library/library.query'
import { Observable } from 'rxjs'
import { CryptCardComponent } from '../../deck-shared/crypt-card/crypt-card.component'
import { CryptComponent } from '../../deck-shared/crypt/crypt.component'
import { LibraryCardComponent } from '../../deck-shared/library-card/library-card.component'
import { LibraryComponent } from '../../deck-shared/library/library.component'
import { ArchetypeCardStatsComponent } from './archetype-card-stats/archetype-card-stats.component'

@UntilDestroy()
@Component({
  selector: 'app-deck-metagame-detail',
  templateUrl: './deck-metagame-detail.component.html',
  styleUrls: ['./deck-metagame-detail.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    AsyncPipe,
    TranslocoDirective,
    TranslocoPipe,
    RouterLink,
    NgbCollapseModule,
    NgbTooltip,
    DecimalPipe,
    CurrencyPipe,
    MarkdownTextComponent,
    CryptComponent,
    LibraryComponent,
    ArchetypeCardStatsComponent,
    AdSenseComponent,
  ],
})
export class DeckMetagameDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute)
  private readonly apiDataService = inject(ApiDataService)
  private readonly modalService = inject(NgbModal)
  private readonly cryptQuery = inject(CryptQuery)
  private readonly libraryQuery = inject(LibraryQuery)

  archetype$!: Observable<ApiDeckArchetype>

  cryptSuggestionsCollapsed = true
  librarySuggestionsCollapsed = true

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'))
    this.archetype$ = this.apiDataService
      .getDeckArchetype(id)
      .pipe(untilDestroyed(this))
  }

  getCoreCrypt(archetype: ApiDeckArchetype): ApiArchetypeKeyCard[] {
    return (archetype.keyCrypt ?? []).filter((kc) => kc.appearanceRate >= 0.5)
  }

  getSuggestedCrypt(archetype: ApiDeckArchetype): ApiArchetypeKeyCard[] {
    return (archetype.keyCrypt ?? []).filter((kc) => kc.appearanceRate < 0.5)
  }

  getCoreLibrary(archetype: ApiDeckArchetype): ApiArchetypeKeyCard[] {
    return (archetype.keyLibrary ?? []).filter((kc) => kc.appearanceRate >= 0.5)
  }

  getSuggestedLibrary(archetype: ApiDeckArchetype): ApiArchetypeKeyCard[] {
    return (archetype.keyLibrary ?? []).filter((kc) => kc.appearanceRate < 0.5)
  }

  getCryptTotalCount(archetype: ApiDeckArchetype): number {
    return (archetype.keyCrypt ?? [])
      .filter((kc) => kc.appearanceRate >= 0.5)
      .reduce((acc, kc) => acc + kc.number, 0)
  }

  getLibraryTotalCount(archetype: ApiDeckArchetype): number {
    return (archetype.keyLibrary ?? [])
      .filter((kc) => kc.appearanceRate >= 0.5)
      .reduce((acc, kc) => acc + kc.number, 0)
  }

  getMetaPercentage(archetype: ApiDeckArchetype): number {
    if (!archetype || archetype.metaTotal === 0) return 0
    return (archetype.metaCount / archetype.metaTotal) * 100
  }

  openCryptCard(cardId: number, archetype: ApiDeckArchetype): void {
    if (!this.cryptQuery.getEntity(cardId)) {
      return
    }
    const allIds = (archetype.keyCrypt ?? []).map((kc) => kc.id)
    const modalRef = this.modalService.open(CryptCardComponent, {
      size: 'lg',
      centered: true,
      scrollable: true,
    })
    const cryptList = allIds
      .map((id) => this.cryptQuery.getEntity(id))
      .filter(Boolean)
    const current = cryptList.find((c) => c?.id === cardId)
    modalRef.componentInstance.cardList = cryptList
    modalRef.componentInstance.index = current ? cryptList.indexOf(current) : 0
  }

  openLibraryCard(cardId: number, archetype: ApiDeckArchetype): void {
    if (!this.libraryQuery.getEntity(cardId)) {
      return
    }
    const allIds = (archetype.keyLibrary ?? []).map((kc) => kc.id)
    const modalRef = this.modalService.open(LibraryCardComponent, {
      size: 'lg',
      centered: true,
      scrollable: true,
    })
    const libraryList = allIds
      .map((id) => this.libraryQuery.getEntity(id))
      .filter(Boolean)
    const current = libraryList.find((c) => c?.id === cardId)
    modalRef.componentInstance.cardList = libraryList
    modalRef.componentInstance.index = current
      ? libraryList.indexOf(current)
      : 0
  }
}
