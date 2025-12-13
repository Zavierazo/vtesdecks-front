import { AsyncPipe } from '@angular/common'
import { Component, inject, OnInit, signal } from '@angular/core'
import { NavigationEnd, Router, RouterLink } from '@angular/router'
import { TranslocoDirective } from '@jsverse/transloco'
import { NgbDropdownModule, NgbModal } from '@ng-bootstrap/ng-bootstrap'
import { TruncatePipe } from '@shared/pipes/truncate.pipe'
import { AuthQuery } from '@state/auth/auth.query'
import { VtesAiQuery } from '@state/vtes-ai/vtes-ai.query'
import { VtesAiService } from '@state/vtes-ai/vtes-ai.service'
import { filter } from 'rxjs'
import { VtesAiComponent } from '../../../modules/vtes-ai/vtes-ai.component'
import { LoginComponent } from '../login/login.component'

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
  private readonly modalService = inject(NgbModal)
  private readonly authQuery = inject(AuthQuery)

  isOpen = signal(false)
  isSelf = signal(false)

  chats$ = this.vtesAiQuery.selectEntities()
  activeChat$ = this.vtesAiQuery.selectActiveChat()

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
    if (!this.authQuery.isAuthenticated()) {
      this.modalService.open(LoginComponent)
      return
    }
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
