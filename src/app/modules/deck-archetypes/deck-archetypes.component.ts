import { AsyncPipe, CommonModule } from '@angular/common'
import { Component, inject, Input, OnInit } from '@angular/core'
import { FormControl, ReactiveFormsModule } from '@angular/forms'
import { TranslocoDirective } from '@jsverse/transloco'
import { ApiDeckArchetype, MetaType } from '@models'
import { NgbModal, NgbTooltip } from '@ng-bootstrap/ng-bootstrap'
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy'
import { DeckArchetypeCrudService } from '@services'
import { AuthQuery } from '@state/auth/auth.query'
import { Observable } from 'rxjs'
import { DeckArchetypeCardComponent } from './deck-archetype-card/deck-archetype-card.component'
import { DeckArchetypeModalComponent } from './deck-archetype-modal/deck-archetype-modal.component'

@UntilDestroy()
@Component({
  selector: 'app-deck-archetypes',
  templateUrl: './deck-archetypes.component.html',
  styleUrls: ['./deck-archetypes.component.scss'],
  imports: [
    CommonModule,
    TranslocoDirective,
    ReactiveFormsModule,
    AsyncPipe,
    DeckArchetypeCardComponent,
    NgbTooltip,
  ],
})
export class DeckArchetypesComponent implements OnInit {
  private readonly modalService = inject(NgbModal)
  private readonly crud = inject(DeckArchetypeCrudService)
  private readonly authQuery = inject(AuthQuery)

  /** Optional maximum number of archetypes to display (used by homepage) */
  @Input() limit?: number

  archetypes$!: Observable<ApiDeckArchetype[]>
  suggestions$ = this.crud.selectSuggestions()
  isMaintainer$ = this.authQuery.selectRole('maintainer')
  metaTypeControl = new FormControl<MetaType>('TOURNAMENT_180')

  ngOnInit() {
    this.archetypes$ = this.crud.selectAll()
    this.crud
      .loadAll(this.metaTypeControl.value!)
      .pipe(untilDestroyed(this))
      .subscribe()
    this.metaTypeControl.valueChanges.subscribe(() => this.onMetaTypeChange())
  }

  onMetaTypeChange() {
    this.crud
      .loadAll(this.metaTypeControl.value!)
      .pipe(untilDestroyed(this))
      .subscribe()
  }

  openModal() {
    const modalRef = this.modalService.open(DeckArchetypeModalComponent, {
      size: 'lg',
      centered: true,
    })
    modalRef.componentInstance.init()
  }
}
