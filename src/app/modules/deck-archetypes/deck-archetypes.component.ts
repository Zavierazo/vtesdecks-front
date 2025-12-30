import { AsyncPipe, CommonModule } from '@angular/common'
import { Component, inject, Input, OnInit } from '@angular/core'
import { FormControl, ReactiveFormsModule } from '@angular/forms'
import { TranslocoDirective } from '@jsverse/transloco'
import { ApiDeckArchetype, MetaType } from '@models'
import { NgbModal } from '@ng-bootstrap/ng-bootstrap'
import { DeckArchetypeCrudService } from '@services'
import { AuthQuery } from '@state/auth/auth.query'
import { Observable } from 'rxjs'
import { DeckArchetypeCardComponent } from './deck-archetype-card/deck-archetype-card.component'
import { DeckArchetypeModalComponent } from './deck-archetype-modal/deck-archetype-modal.component'

@Component({
  selector: 'app-deck-archetypes',
  templateUrl: './deck-archetypes.component.html',
  styleUrls: ['./deck-archetypes.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    TranslocoDirective,
    ReactiveFormsModule,
    AsyncPipe,
    DeckArchetypeCardComponent,
  ],
})
export class DeckArchetypesComponent implements OnInit {
  private readonly modalService = inject(NgbModal)
  private readonly crud = inject(DeckArchetypeCrudService)
  private readonly authQuery = inject(AuthQuery)

  /** Optional maximum number of archetypes to display (used by homepage) */
  @Input() limit?: number

  archetypes$!: Observable<ApiDeckArchetype[]>
  isMaintainer$ = this.authQuery.selectRole('maintainer')
  metaTypeControl = new FormControl<MetaType>('TOURNAMENT_90')

  ngOnInit() {
    this.archetypes$ = this.crud.selectAll()
    this.crud.loadAll(this.metaTypeControl.value!).subscribe()
    this.metaTypeControl.valueChanges.subscribe(() => this.onMetaTypeChange())
  }

  onMetaTypeChange() {
    this.crud.loadAll(this.metaTypeControl.value!).subscribe()
  }

  openModal() {
    const modalRef = this.modalService.open(DeckArchetypeModalComponent, {
      size: 'lg',
      centered: true,
    })
    modalRef.componentInstance.init()
  }
}
