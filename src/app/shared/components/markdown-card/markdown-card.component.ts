import { AsyncPipe, NgClass } from '@angular/common'
import { Component, inject, input } from '@angular/core'
import { NgbPopover } from '@ng-bootstrap/ng-bootstrap'
import { MediaService } from '@services'
import { environment } from '../../../../environments/environment'

@Component({
  selector: 'app-markdown-card',
  templateUrl: './markdown-card.component.html',
  styleUrls: ['./markdown-card.component.scss'],
  imports: [NgbPopover, NgClass, AsyncPipe],
})
export class MarkdownCardComponent {
  private readonly mediaService = inject(MediaService)
  image = input.required<string>()
  name = input.required<string>()

  isMobile$ = this.mediaService.observeMobile()
  cdnDomain = environment.cdnDomain
}
