import { Injectable } from '@angular/core'
import { catchError, finalize, Observable, of, tap } from 'rxjs'
import { ApiAiAskRequest } from '../../models/api-ai-ask-request'
import { ApiAiAskResponse } from '../../models/api-ai-ask-response'
import { ApiDataService } from './../../services/api.data.service'
import { VtesAiStore } from './vtes-ai.store'
@Injectable({
  providedIn: 'root',
})
export class VtesAiService {
  constructor(
    private readonly store: VtesAiStore,
    private readonly apiDataService: ApiDataService,
  ) {}

  init() {
    this.store.setLoading()
    const chats = this.store.getEntities()
    if (chats.length === 0 || chats[chats.length - 1].chat.length !== 0) {
      this.newChat()
    } else {
      this.store.setActiveChat(chats[chats.length - 1].id)
    }
  }

  newChat() {
    const chats = this.store.getEntities()
    const lastId = chats.length === 0 ? 0 : chats[chats.length - 1].id
    const newId = lastId + 1
    this.store.add({
      id: newId,
      title: new Date().toLocaleString(),
      chat: [],
    })
    this.store.setActiveChat(newId)
  }

  switchActiveChat(id: number) {
    this.store.setActiveChat(id)
  }

  ask(question: string): Observable<ApiAiAskResponse> {
    const chat = this.store.getActiveEntity()
    if (!chat) {
      return of()
    }
    const request: ApiAiAskRequest = {
      chatHistory:
        chat?.chat.filter(
          (c) =>
            c.type != 'AI' ||
            !c.content.startsWith('Quota exceeded') ||
            !c.content.startsWith('Unexpected error'),
        ) ?? [],
      question,
    }
    this.store.update(chat.id, (chat) => ({
      ...chat,
      title: chat.chat.length === 0 ? question : chat.title,
      chat: [...chat.chat, { type: 'HUMAN', content: question }],
    }))
    this.store.setLoading(true)
    return this.apiDataService.aiAsk(request).pipe(
      tap((response) => {
        this.store.update(chat.id, (chat) => ({
          ...chat,
          chat: [
            ...chat.chat,
            {
              type: 'AI',
              content: response.message,
            },
          ],
        }))
      }),
      catchError(() => {
        this.store.update(chat.id, (chat) => ({
          ...chat,
          chat: [
            ...chat.chat,
            {
              type: 'AI',
              content: 'Unexpected error. Please try again later.',
            },
          ],
        }))
        return of()
      }),
      finalize(() => this.store.setLoading()),
    )
  }
}
