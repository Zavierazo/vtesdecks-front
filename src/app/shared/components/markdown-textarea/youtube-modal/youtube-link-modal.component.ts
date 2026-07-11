import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
} from '@angular/core'
import { toSignal } from '@angular/core/rxjs-interop'
import { FormControl, ReactiveFormsModule } from '@angular/forms'
import { TranslocoDirective } from '@jsverse/transloco'
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap'
import { extractYoutubeId } from '@utils'

@Component({
  selector: 'app-youtube-link-modal',
  templateUrl: './youtube-link-modal.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslocoDirective, ReactiveFormsModule],
})
export class YoutubeLinkModalComponent {
  readonly activeModal = inject(NgbActiveModal)

  urlControl = new FormControl('', { nonNullable: true })

  private readonly url = toSignal(this.urlControl.valueChanges, {
    initialValue: '',
  })
  videoId = computed(() => extractYoutubeId(this.url()))

  onInsert(): void {
    const videoId = this.videoId()
    if (videoId) {
      this.activeModal.close(videoId)
    }
  }
}
