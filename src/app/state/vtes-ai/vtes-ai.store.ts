import { inject, Injectable, signal } from '@angular/core'
import { toObservable } from '@angular/core/rxjs-interop'
import { ApiAiMessage } from '@models'
import { LocalStorageService } from '@services'
import { map, Observable } from 'rxjs'

export interface AiChat {
  id: number
  sessionId: string
  title: string
  chat: ApiAiMessage[]
}

@Injectable({
  providedIn: 'root',
})
export class VtesAiStore {
  private readonly localStorage = inject(LocalStorageService)

  static readonly stateStoreName = 'vtes_ai_v1_state'
  static readonly chat_history_limit = 5
  private readonly state = signal<AiChat[]>([])
  private readonly state$ = toObservable(this.state)
  private readonly activeChat = signal<number>(0)
  private readonly activeChat$ = toObservable(this.activeChat)
  private readonly loading = signal<boolean>(false)
  private readonly loading$ = toObservable(this.loading)

  constructor() {
    const previousState = this.localStorage.getValue<AiChat[]>(
      VtesAiStore.stateStoreName,
    )
    if (previousState) {
      // Remove chats with messages
      this.set(previousState.filter((c) => c.chat.length > 0))
    }
  }

  selectLoading(): Observable<boolean> {
    return this.loading$
  }

  selectEntities(): Observable<AiChat[]> {
    return this.state$
  }

  selectEntity(id: number): Observable<AiChat | undefined> {
    return this.state$.pipe(map((chats) => chats.find((c) => c.id === id)))
  }

  selectActiveChat(): Observable<number> {
    return this.activeChat$
  }

  getEntities(): AiChat[] {
    return this.state()
  }

  getActiveEntity(): AiChat | undefined {
    const id = this.getActiveChat()
    return this.state().find((c) => c.id === id)
  }

  getLoading(): boolean {
    return this.loading()
  }

  getActiveChat(): number {
    return this.activeChat()
  }

  set(value: AiChat[]) {
    this.state.update(() => value)
    this.updateStorage()
  }

  update(id: number, updateFn: (value: AiChat) => AiChat) {
    this.state.update((chats) =>
      chats.map((c) => (c.id === id ? updateFn(c) : c)),
    )
    this.updateStorage()
  }

  add(chat: AiChat) {
    this.state.update((chats) => [...chats, chat])
    // Remove chats when reaching the limit
    const entities = this.getEntities()
    if (entities.length > VtesAiStore.chat_history_limit && entities[0]) {
      this.remove(entities[0].id)
    }
    this.updateStorage()
  }

  remove(id: number) {
    this.state.update((chats) => chats.filter((chat) => chat.id !== id))
    this.updateStorage()
  }

  setLoading(value = false) {
    this.loading.update(() => value)
  }

  setActiveChat(id: number) {
    this.activeChat.update(() => id)
  }

  private updateStorage(): void {
    const state = this.getEntities()
    if (state?.length > 0) {
      this.localStorage.setValue(VtesAiStore.stateStoreName, state)
    }
  }
}
