import { Component, inject } from '@angular/core'
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap'
import { MarkdownCardComponent } from './../markdown-card/markdown-card.component'

@Component({
  selector: 'app-markdown-help-modal',
  templateUrl: './markdown-help-modal.component.html',
  styleUrls: ['./markdown-help-modal.component.scss'],
  imports: [MarkdownCardComponent],
})
export class MarkdownHelpModalComponent {
  readonly activeModal = inject(NgbActiveModal)
}
