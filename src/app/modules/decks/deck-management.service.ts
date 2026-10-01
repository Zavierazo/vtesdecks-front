import { HttpErrorResponse } from '@angular/common/http'
import { ConfirmDialogComponent } from '@shared/components/confirm-dialog/confirm-dialog.component'
import { DestroyRef, inject, Injectable, signal } from '@angular/core'
import { takeUntilDestroyed } from '@angular/core/rxjs-interop'
import { ActivatedRoute } from '@angular/router'
import { TranslocoService } from '@jsverse/transloco'
import { NgbModal } from '@ng-bootstrap/ng-bootstrap'
import { ApiDeck } from '@models'
import { ApiDataService, ToastService } from '@services'
import { DeckShareService } from '../../services/deck-share.service'
import { DeleteDialogComponent } from '@shared/components/delete-dialog/delete-dialog.component'
import { AuthQuery } from '@state/auth/auth.query'
import { DeckStore } from '@state/deck/deck.store'
import { DecksStore } from '@state/decks/decks.store'
import { DecksService } from '@state/decks/decks.service'
import { environment } from '@environments/environment'
import {
  firstValueFrom,
  Observable,
  combineLatest,
  distinctUntilChanged,
  map,
} from 'rxjs'

export type DeckQuickAction = 'share' | 'visibility' | 'tracker' | 'delete'

@Injectable()
export class DeckManagementService {
  private readonly api = inject(ApiDataService)
  private readonly store = inject(DecksStore)
  private readonly detailStore = inject(DeckStore)
  private readonly decks = inject(DecksService)
  private readonly modal = inject(NgbModal)
  private readonly share = inject(DeckShareService)
  private readonly toast = inject(ToastService)
  private readonly t = inject(TranslocoService)
  private readonly route = inject(ActivatedRoute)
  private readonly auth = inject(AuthQuery)
  private readonly destroy = inject(DestroyRef)
  private generation = 0
  readonly pending = signal(new Set<string>())

  constructor() {
    combineLatest([
      this.route.queryParams,
      this.route.params,
      this.auth.selectUser(),
    ])
      .pipe(
        map(([query, params, user]) => JSON.stringify([query, params, user])),
        distinctUntilChanged(),
        takeUntilDestroyed(),
      )
      .subscribe(() => {
        this.generation++
      })
    this.destroy.onDestroy(() => {
      this.generation++
    })
  }

  async quickAction(deck: ApiDeck, action: DeckQuickAction): Promise<void> {
    if (!deck.owner || this.pending().has(deck.id)) {
      return
    }
    if (action === 'share') {
      await this.share.share(`https://${environment.domain}/deck/${deck.id}`)
      return
    }
    if (action === 'delete') {
      await this.delete(deck.id)
      return
    }
    const generation = this.generation
    const patch =
      action === 'visibility'
        ? { published: !deck.published }
        : { collection: !deck.collection }
    this.pending.update((ids) => new Set([...ids, deck.id]))
    try {
      if (action === 'visibility' && !deck.published) {
        const eligible = await this.request(this.api.canPublishDeck(deck.id))
        if (generation !== this.generation) {
          return
        }
        if (!eligible) {
          this.invalidPublication()
          return
        }
        const dialog = this.modal.open(ConfirmDialogComponent, {
          size: 'md',
          centered: true,
        })
        dialog.componentInstance.title = this.t.translate(
          'deck_management.publish',
        )
        dialog.componentInstance.message = this.t.translate(
          'deck_management.confirm_publish',
        )
        dialog.componentInstance.okLabel = 'deck_management.publish'
        const confirmed = await dialog.result.catch(() => false)
        if (!confirmed || generation !== this.generation) {
          return
        }
      }
      const success = await this.request(
        action === 'visibility'
          ? this.api.setDeckVisibility(deck.id, !deck.published)
          : this.api.updateCollectionTracker(deck.id, !deck.collection),
      )
      if (!success) {
        throw new Error('Deck update rejected')
      }
      if (generation === this.generation) {
        this.store.patchDeck(deck.id, patch)
        this.detailStore.update((state) =>
          state.deck?.id === deck.id
            ? { ...state, deck: { ...state.deck, ...patch } }
            : state,
        )
      }
    } catch (error) {
      if (
        action === 'visibility' &&
        !deck.published &&
        error instanceof HttpErrorResponse &&
        error.status === 422
      ) {
        this.invalidPublication()
      } else {
        this.error()
      }
    } finally {
      this.pending.update((ids) => {
        const next = new Set(ids)
        next.delete(deck.id)
        return next
      })
    }
  }

  private async delete(id: string): Promise<void> {
    const generation = this.generation
    this.pending.update((ids) => new Set([...ids, id]))
    try {
      const dialog = this.modal.open(DeleteDialogComponent, {
        size: 'md',
        centered: true,
      })
      dialog.componentInstance.titleLabel = 'deck_builder.delete_title'
      dialog.componentInstance.messageLabel = 'deck_builder.delete_message'
      const choice = await dialog.result.catch(() => false)
      if (!choice || generation !== this.generation) {
        return
      }
      const success = await this.request(
        this.api.deleteDeckBuilder(id, choice === 'PERMANENT'),
      )
      if (!success) {
        throw new Error('Deck deletion rejected')
      }
      if (generation === this.generation) {
        this.store.removeDecks([id])
        this.toast.show(this.t.translate('deck_builder.delete_successful'), {
          classname: 'bg-success text-light',
          delay: 5000,
        })
        await this.request(this.decks.refreshLoaded())
      }
    } catch {
      this.error()
    } finally {
      this.pending.update((ids) => {
        const next = new Set(ids)
        next.delete(id)
        return next
      })
    }
  }

  private request<T>(request: Observable<T>): Promise<T> {
    return firstValueFrom(request.pipe(takeUntilDestroyed(this.destroy)))
  }

  private invalidPublication(): void {
    this.toast.show(this.t.translate('deck_builder.invalid_public_deck'), {
      classname: 'bg-danger text-light',
      delay: 7000,
    })
  }

  private error(): void {
    this.toast.show(this.t.translate('shared.unexpected_error'), {
      classname: 'bg-danger text-light',
      delay: 5000,
    })
  }
}
