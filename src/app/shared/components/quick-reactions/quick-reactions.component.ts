import { AsyncPipe, NgClass } from '@angular/common'
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  linkedSignal,
} from '@angular/core'
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco'
import { NgbModal, NgbPopover, NgbTooltip } from '@ng-bootstrap/ng-bootstrap'
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy'
import {
  ApiReactionSummary,
  CommentReactionKey,
  DeckReactionKey,
  ReactionKey,
} from '@models'
import { ApiDataService, ToastService } from '@services'
import { AuthQuery } from '@state/auth/auth.query'
import { LoginComponent } from '../login/login.component'

export const DECK_REACTION_EMOJIS: Record<DeckReactionKey, string> = {
  would_play: '🩸',
  tournament_worthy: '🏆',
  original_brew: '🎨',
  mind_blowing: '🤯',
  spicy: '🔥',
  too_greedy: '💀',
}

export const COMMENT_REACTION_EMOJIS: Record<CommentReactionKey, string> = {
  thumbs_up: '👍',
  thumbs_down: '👎',
  heart: '❤️',
  laugh: '😂',
  wow: '😮',
  thanks: '🙏',
  hundred: '💯',
}

interface ReactionChip extends ApiReactionSummary {
  emoji: string
}

@UntilDestroy()
@Component({
  selector: 'app-quick-reactions',
  templateUrl: './quick-reactions.component.html',
  styleUrls: ['./quick-reactions.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AsyncPipe, NgClass, TranslocoDirective, NgbTooltip, NgbPopover],
})
export class QuickReactionsComponent {
  private readonly apiDataService = inject(ApiDataService)
  private readonly toastService = inject(ToastService)
  private readonly translocoService = inject(TranslocoService)
  private readonly authQuery = inject(AuthQuery)
  private readonly modalService = inject(NgbModal)

  targetType = input.required<'deck' | 'comment'>()
  targetId = input.required<string | number>()
  reactions = input<ApiReactionSummary[]>()
  display = input<'full' | 'compact'>('compact')

  isAuthenticated$ = this.authQuery.selectAuthenticated()

  private readonly catalog = computed<Record<string, string>>(() =>
    this.targetType() === 'deck'
      ? DECK_REACTION_EMOJIS
      : COMMENT_REACTION_EMOJIS,
  )

  private readonly state = linkedSignal<ApiReactionSummary[]>(() => {
    const summaries = this.reactions() ?? []
    return Object.keys(this.catalog()).map(
      (key) =>
        summaries.find((summary) => summary.reaction === key) ?? {
          reaction: key as ReactionKey,
          count: 0,
          reacted: false,
        },
    )
  })

  readonly allChips = computed<ReactionChip[]>(() =>
    this.state().map((summary) => ({
      ...summary,
      emoji: this.catalog()[summary.reaction],
    })),
  )

  readonly visibleChips = computed<ReactionChip[]>(() =>
    this.display() === 'full'
      ? this.allChips()
      : this.allChips().filter((chip) => chip.count > 0 || chip.reacted),
  )

  toggle(reaction: ReactionKey, popover?: NgbPopover): void {
    popover?.close()
    if (!this.authQuery.isAuthenticated()) {
      this.modalService.open(LoginComponent)
      return
    }
    const previous = this.state()
    const active = !previous.find((entry) => entry.reaction === reaction)
      ?.reacted
    this.state.set(
      previous.map((entry) =>
        entry.reaction === reaction
          ? {
              ...entry,
              reacted: active,
              count: Math.max(0, entry.count + (active ? 1 : -1)),
            }
          : entry,
      ),
    )
    const request$ =
      this.targetType() === 'deck'
        ? this.apiDataService.reactDeck(String(this.targetId()), reaction, active)
        : this.apiDataService.reactComment(
            Number(this.targetId()),
            reaction,
            active,
          )
    request$.pipe(untilDestroyed(this)).subscribe({
      next: (success) => {
        if (!success) {
          this.rollback(previous)
        }
      },
      error: () => this.rollback(previous),
    })
  }

  private rollback(previous: ApiReactionSummary[]): void {
    this.state.set(previous)
    this.toastService.show(this.translocoService.translate('reactions.error'), {
      classname: 'bg-danger text-light',
      delay: 5000,
    })
  }
}
