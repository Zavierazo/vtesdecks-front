import { AsyncPipe } from '@angular/common'
import {
  AfterViewInit,
  Component,
  ElementRef,
  OnInit,
  QueryList,
  TemplateRef,
  ViewChildren,
  inject,
  viewChild,
} from '@angular/core'
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms'
import { TranslocoDirective } from '@jsverse/transloco'
import { NgbOffcanvas } from '@ng-bootstrap/ng-bootstrap'
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy'
import { MediaService } from '@services'
import { MarkdownPipe } from 'ngx-markdown'
import { LoadingComponent } from '../../shared/components/loading/loading.component'
import { VtesAiQuery } from '../../state/vtes-ai/vtes-ai.query'
import { VtesAiService } from '../../state/vtes-ai/vtes-ai.service'

@UntilDestroy()
@Component({
  selector: 'app-vtes-ai',
  templateUrl: './vtes-ai.component.html',
  styleUrls: ['./vtes-ai.component.scss'],
  imports: [
    TranslocoDirective,
    ReactiveFormsModule,
    AsyncPipe,
    LoadingComponent,
    MarkdownPipe,
  ],
})
export class VtesAiComponent implements OnInit, AfterViewInit {
  private readonly service = inject(VtesAiService)
  private readonly query = inject(VtesAiQuery)
  private readonly offcanvasService = inject(NgbOffcanvas)
  private readonly mediaService = inject(MediaService)

  chats$ = this.query.selectEntities()
  activeChat$ = this.query.selectActiveChat()
  loading$ = this.query.selectLoading()
  isMobileOrTablet$ = this.mediaService.observeMobileOrTablet()

  chatForm = new FormGroup({
    question: new FormControl('', Validators.minLength(3)),
  })

  readonly scrollFrame = viewChild.required<ElementRef>('scrollFrame')
  @ViewChildren('item') itemElements!: QueryList<any>
  private scrollContainer: any

  ngAfterViewInit() {
    this.scrollContainer = this.scrollFrame().nativeElement
    this.itemElements.changes.subscribe((_) => this.onItemElementsChanged())
  }
  private onItemElementsChanged(): void {
    this.scrollToBottom()
  }
  private scrollToBottom(): void {
    this.scrollContainer.scroll({
      top: this.scrollContainer.scrollHeight,
      left: 0,
      behavior: 'smooth',
    })
  }

  get question() {
    return this.chatForm.get('question')
  }

  ngOnInit() {
    this.service.init()
  }

  newChat() {
    this.service.newChat()
  }
  switchActiveChat(id: number) {
    this.service.switchActiveChat(id)
  }

  onAsk(question: string | null | undefined) {
    if (this.chatForm.valid && question) {
      this.chatForm.reset()
      this.service.ask(question).pipe(untilDestroyed(this)).subscribe()
    }
  }

  openHistory(content: TemplateRef<any>): void {
    this.offcanvasService.open(content, {
      ariaLabelledBy: 'offcanvas-basic-title',
    })
  }
}
