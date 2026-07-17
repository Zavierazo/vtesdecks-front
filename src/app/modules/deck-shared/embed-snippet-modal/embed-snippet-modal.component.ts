import { Clipboard } from '@angular/cdk/clipboard'
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Input,
  OnDestroy,
  OnInit,
  ViewChild,
  computed,
  inject,
  signal,
} from '@angular/core'
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser'
import {
  TranslocoDirective,
  TranslocoPipe,
  TranslocoService,
} from '@jsverse/transloco'
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap'
import { ToastService } from '@services'
import { environment } from '@environments/environment'

export type EmbedTheme = 'auto' | 'dark' | 'light'

@Component({
  selector: 'app-embed-snippet-modal',
  templateUrl: './embed-snippet-modal.component.html',
  styleUrls: ['./embed-snippet-modal.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslocoDirective, TranslocoPipe],
})
export class EmbedSnippetModalComponent implements OnInit, OnDestroy {
  modal = inject(NgbActiveModal)
  private readonly sanitizer = inject(DomSanitizer)
  private readonly clipboard = inject(Clipboard)
  private readonly toastService = inject(ToastService)
  private readonly translocoService = inject(TranslocoService)

  @Input() deckId!: string
  @Input() deckName?: string

  @ViewChild('previewFrame')
  previewFrame?: ElementRef<HTMLIFrameElement>

  previewHeight = signal(420)

  readonly themes: EmbedTheme[] = ['auto', 'dark', 'light']

  theme = signal<EmbedTheme>('auto')
  stats = signal(true)
  crypt = signal(true)
  library = signal(true)
  widthAuto = signal(true)
  widthSize = signal('400px')
  heightAuto = signal(true)
  heightSize = signal('600px')

  private readonly baseUrl = `https://${environment.domain}`

  sections = computed(() =>
    [
      this.stats() && 'stats',
      this.crypt() && 'crypt',
      this.library() && 'library',
    ]
      .filter(Boolean)
      .join(','),
  )

  embedUrl = computed(
    () =>
      `${this.baseUrl}/deck/${this.deckId}/embed?theme=${this.theme()}&sections=${this.sections()}`,
  )

  // null → auto: 100% width, height following the widget's content
  width = computed(() =>
    this.widthAuto() ? null : this.sizeAttr(this.widthSize()),
  )
  height = computed(() =>
    this.heightAuto() ? null : this.sizeAttr(this.heightSize()),
  )

  jsSnippet = computed(() => {
    const width = this.width()
    const height = this.height()
    return (
      `<div class="vtesdecks-deck" data-deck-id="${this.deckId}" data-theme="${this.theme()}" data-sections="${this.sections()}"` +
      (width ? ` data-width="${width}"` : '') +
      (height ? ` data-height="${height}"` : '') +
      `></div>\n` +
      `<script async src="${this.baseUrl}/assets/js/embed.js"></script>`
    )
  })

  // Preview points at the current origin so it also works on localhost
  previewUrl = computed<SafeResourceUrl>(() =>
    this.sanitizer.bypassSecurityTrustResourceUrl(
      `${window.location.origin}/deck/${this.deckId}/embed?theme=${this.theme()}&sections=${this.sections()}`,
    ),
  )

  // Size the preview to its content using the same resize messages embed.js
  // consumes, so the preview shows exactly what an embedding site gets
  private readonly onPreviewMessage = (event: MessageEvent) => {
    if (
      event.origin !== window.location.origin ||
      event.data?.type !== 'vtesdecks-embed-resize' ||
      event.source !== this.previewFrame?.nativeElement.contentWindow
    ) {
      return
    }
    const height = Math.ceil(event.data.height)
    if (height > 0) {
      this.previewHeight.set(height)
    }
  }

  ngOnInit(): void {
    window.addEventListener('message', this.onPreviewMessage)
  }

  ngOnDestroy(): void {
    window.removeEventListener('message', this.onPreviewMessage)
  }

  // Any CSS size is accepted (px, rem, %, vw…); quotes are stripped so the
  // value stays a safe HTML attribute in the generated snippet
  private sizeAttr(value: string): string | null {
    const size = value.replace(/["']/g, '').trim()
    return size.length > 0 ? size : null
  }

  onCopy(snippet: string): void {
    this.clipboard.copy(snippet)
    this.toastService.show(this.translocoService.translate('embed.copied'), {
      classname: 'bg-success text-light',
      delay: 5000,
    })
  }
}
