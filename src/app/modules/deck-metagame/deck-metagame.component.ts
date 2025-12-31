import { AsyncPipe, CommonModule } from '@angular/common'
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  Input,
  OnInit,
} from '@angular/core'
import { FormControl, ReactiveFormsModule } from '@angular/forms'
import { TranslocoDirective } from '@jsverse/transloco'
import { MetaType } from '@models'
import { NgbModal, NgbTooltip } from '@ng-bootstrap/ng-bootstrap'
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy'
import { DeckArchetypeCrudService } from '@services'
import { AuthQuery } from '@state/auth/auth.query'
import { DeckMetagameCardComponent } from './deck-metagame-card/deck-metagame-card.component'
import { DeckMetagameModalComponent } from './deck-metagame-modal/deck-metagame-modal.component'

@UntilDestroy()
@Component({
  selector: 'app-deck-metagame',
  templateUrl: './deck-metagame.component.html',
  styleUrls: ['./deck-metagame.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    TranslocoDirective,
    ReactiveFormsModule,
    AsyncPipe,
    DeckMetagameCardComponent,
    NgbTooltip,
  ],
})
export class DeckMetagameComponent implements OnInit {
  private readonly modalService = inject(NgbModal)
  private readonly crud = inject(DeckArchetypeCrudService)
  private readonly authQuery = inject(AuthQuery)

  /** Optional maximum number of archetypes to display (used by homepage) */
  @Input() limit?: number

  archetypes$ = this.crud.selectAll()
  suggestions$ = this.crud.selectSuggestions()
  isMaintainer$ = this.authQuery.selectRole('maintainer')
  metaTypeControl = new FormControl<MetaType>('TOURNAMENT_365')

  ngOnInit() {
    this.crud
      .loadAll(this.metaTypeControl.value!)
      .pipe(untilDestroyed(this))
      .subscribe()
    if (this.authQuery.isRole('maintainer')) {
      this.crud.loadSuggestions().pipe(untilDestroyed(this)).subscribe()
    }
    this.metaTypeControl.valueChanges.subscribe(() => this.onMetaTypeChange())
  }

  onMetaTypeChange() {
    this.crud
      .loadAll(this.metaTypeControl.value!)
      .pipe(untilDestroyed(this))
      .subscribe()
  }

  openModal() {
    const modalRef = this.modalService.open(DeckMetagameModalComponent, {
      size: 'lg',
      centered: true,
    })
    modalRef.componentInstance.init()
  }
}
