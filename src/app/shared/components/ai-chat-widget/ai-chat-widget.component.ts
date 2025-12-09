import { AsyncPipe } from '@angular/common'
import { Component, effect, inject, OnInit, signal } from '@angular/core'
import { NavigationEnd, Router, RouterLink } from '@angular/router'
import { TranslocoDirective } from '@jsverse/transloco'
import { NgbDropdownModule } from '@ng-bootstrap/ng-bootstrap'
import { TruncatePipe } from '@shared/pipes/truncate.pipe'
import { VtesAiQuery } from '@state/vtes-ai/vtes-ai.query'
import { VtesAiService } from '@state/vtes-ai/vtes-ai.service'
import { filter } from 'rxjs'
import { VtesAiComponent } from '../../../modules/vtes-ai/vtes-ai.component'

@Component({
  selector: 'app-ai-chat-widget',
  standalone: true,
  templateUrl: './ai-chat-widget.component.html',
  styleUrls: ['./ai-chat-widget.component.scss'],
  imports: [
    VtesAiComponent,
    RouterLink,
    NgbDropdownModule,
    AsyncPipe,
    TranslocoDirective,
    TruncatePipe,
  ],
})
export class AiChatWidgetComponent implements OnInit {
  private readonly router = inject(Router)
  private readonly vtesAiService = inject(VtesAiService)
  private readonly vtesAiQuery = inject(VtesAiQuery)

  isOpen = signal(false)
  isSelf = signal(false)

  chats$ = this.vtesAiQuery.selectEntities()
  activeChat$ = this.vtesAiQuery.selectActiveChat()

  constructor() {
    // Block body scroll when widget is open
    effect(() => {
      if (this.isOpen()) {
        document.body.style.overflow = 'hidden'
      } else {
        document.body.style.overflow = ''
      }
    })
  }

  ngOnInit() {
    // Check initial route
    this.isSelf.set(this.router.url === '/vtes-ai')

    // Subscribe to route changes
    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => {
        this.isSelf.set(event.url === '/vtes-ai')
        if (event.url === '/vtes-ai') {
          this.isOpen.set(false)
        }
      })
  }

  toggleWidget() {
    this.isOpen.set(!this.isOpen())
  }

  closeWidget() {
    this.isOpen.set(false)
  }

  newChat() {
    this.vtesAiService.newChat()
  }

  switchActiveChat(id: number) {
    this.vtesAiService.switchActiveChat(id)
  }
}
