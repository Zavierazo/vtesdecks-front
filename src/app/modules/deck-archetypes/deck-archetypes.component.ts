import { AsyncPipe, CommonModule } from '@angular/common'
import { Component, inject, OnInit } from '@angular/core'
import { TranslocoDirective } from '@jsverse/transloco'
import { ApiDeckArchetype } from '@models'
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
    AsyncPipe,
    DeckArchetypeCardComponent,
  ],
})
export class DeckArchetypesComponent implements OnInit {
  private readonly modalService = inject(NgbModal)
  private readonly crud = inject(DeckArchetypeCrudService)
  private readonly authQuery = inject(AuthQuery)

  archetypes$!: Observable<ApiDeckArchetype[]>
  isMaintainer$ = this.authQuery.selectRole('maintainer')

  ngOnInit() {
    this.archetypes$ = this.crud.selectAll()
    this.crud.loadAll().subscribe()
  }

  openModal() {
    const modalRef = this.modalService.open(DeckArchetypeModalComponent, {
      size: 'lg',
      centered: true,
    })
    modalRef.componentInstance.init()
  }
}
