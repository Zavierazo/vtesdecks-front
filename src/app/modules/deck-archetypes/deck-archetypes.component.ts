import { AsyncPipe, CommonModule } from '@angular/common'
import { Component, inject, OnInit } from '@angular/core'
import { RouterLink } from '@angular/router'
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco'
import { ApiDeckArchetype } from '@models'
import { NgbModal } from '@ng-bootstrap/ng-bootstrap'
import { DeckArchetypeCrudService, ToastService } from '@services'
import { ConfirmDialogComponent } from '@shared/components/confirm-dialog/confirm-dialog.component'
import { MarkdownTextComponent } from '@shared/components/markdown-text/markdown-text.component'
import { AuthQuery } from '@state/auth/auth.query'
import { Observable } from 'rxjs'
import { DeckArchetypeModalComponent } from './deck-archetype-modal.component'

@Component({
  selector: 'app-deck-archetypes',
  templateUrl: './deck-archetypes.component.html',
  styleUrls: ['./deck-archetypes.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    TranslocoDirective,
    AsyncPipe,
    RouterLink,
    MarkdownTextComponent,
  ],
})
export class DeckArchetypesComponent implements OnInit {
  private readonly modalService = inject(NgbModal)
  private readonly crud = inject(DeckArchetypeCrudService)
  private readonly authQuery = inject(AuthQuery)
  private readonly toastService = inject(ToastService)
  private readonly translocoService = inject(TranslocoService)

  archetypes$!: Observable<ApiDeckArchetype[]>
  isAdmin$!: Observable<boolean>

  ngOnInit() {
    this.archetypes$ = this.crud.selectAll()
    this.isAdmin$ = this.authQuery.selectAdmin()
    this.crud.loadAll().subscribe()
  }

  openModal(archetype?: ApiDeckArchetype) {
    const modalRef = this.modalService.open(DeckArchetypeModalComponent, {
      size: 'lg',
      centered: true,
    })
    modalRef.componentInstance.init(archetype)
  }

  delete(archetype: ApiDeckArchetype) {
    const modalRef = this.modalService.open(ConfirmDialogComponent)
    modalRef.componentInstance.title = 'shared.delete'
    modalRef.componentInstance.message = 'delete_modal_message'
    modalRef.result.then(() => {
      this.crud.delete(archetype.id).subscribe({
        error: (err) =>
          this.toastService.show(
            err?.message || this.translocoService.translate('error'),
            { classname: 'bg-danger text-light', delay: 5000 },
          ),
      })
    })
  }
}
