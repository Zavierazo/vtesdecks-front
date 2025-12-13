import { inject, Injectable } from '@angular/core'
import { ApiAiAskAsyncRequest } from '@models'
import { ApiDataService } from '@services'
import {
  catchError,
  EMPTY,
  Observable,
  of,
  switchMap,
  takeWhile,
  tap,
  throwError,
  timer,
} from 'rxjs'
import { v4 as uuidv4 } from 'uuid'
import { AiChat, VtesAiStore } from './vtes-ai.store'
@Injectable({
  providedIn: 'root',
})
export class VtesAiService {
  private readonly store = inject(VtesAiStore)
  private readonly apiDataService = inject(ApiDataService)
  private readonly POLL_INTERVAL_MS = 3000 // 3 seconds
  private readonly TIMEOUT_MS = 5 * 60 * 1000 // 5 minutes
  private pollingSubscriptions = new Map<number, () => void>()

  init() {
    this.store.setLoading()
    const chats = this.store.getEntities()
    const activeChat = this.store.getActiveEntity()

    // If there's already an active chat, keep it
    if (activeChat) {
      this.resumePollingIfNeeded(activeChat)
      return
    }

    // Otherwise, create a new chat if needed
    if (chats.length === 0 || chats[chats.length - 1].chat.length !== 0) {
      this.newChat()
    } else {
      this.store.setActiveChat(chats[chats.length - 1].id)
      const lastChat = chats[chats.length - 1]
      if (lastChat) {
        this.resumePollingIfNeeded(lastChat)
      }
    }
  }

  private resumePollingIfNeeded(chat: AiChat) {
    // Resume polling if there's an active task session
    if (chat.taskId && chat.taskStatus) {
      if (chat.taskStatus === 'PENDING' || chat.taskStatus === 'PROCESSING') {
        console.log('Resuming polling for task session:', chat.taskId)
        this.pollTaskStatus(chat.id, chat.taskId)
      } else {
        console.log(
          'Task already completed or errored, status:',
          chat.taskStatus,
        )
      }
    } else {
      console.log('No active task session to resume')
    }
  }

  newChat() {
    const chats = this.store.getEntities()
    const lastId = chats.length === 0 ? 0 : chats[chats.length - 1].id
    const newId = lastId + 1
    this.store.add({
      id: newId,
      sessionId: uuidv4(),
      title: new Date().toLocaleString(),
      chat: [],
    })
    this.store.setActiveChat(newId)
  }

  switchActiveChat(id: number) {
    // Cancel polling on current chat before switching
    const currentChat = this.store.getActiveEntity()
    if (currentChat && currentChat.isPolling) {
      this.cancelPolling(currentChat.id)
    }

    this.store.setActiveChat(id)

    // Resume polling on new chat if needed
    const newChat = this.store.getActiveEntity()
    if (newChat) {
      this.resumePollingIfNeeded(newChat)
    }
  }

  ask(question: string): Observable<void> {
    const chat = this.store.getActiveEntity()
    if (!chat) {
      return of()
    }

    const request: ApiAiAskAsyncRequest = {
      sessionId: chat.sessionId,
      question,
    }

    // Add human message to chat
    this.store.update(chat.id, (chat) => ({
      ...chat,
      title: chat.chat.length === 0 ? question : chat.title,
      chat: [...chat.chat, { type: 'HUMAN', content: question }],
    }))

    this.store.setLoading(true)
    this.store.updateTaskStatus(chat.id, 'PENDING')

    // Submit task
    return this.apiDataService.aiAskAsync(request).pipe(
      tap((response) => {
        if (response.error) {
          this.handleError(chat.id, response.error)
        } else {
          // Start polling
          this.store.updateTaskId(chat.id, response.taskId)
          this.pollTaskStatus(chat.id, response.taskId)
        }
      }),
      catchError(() => {
        this.handleError(
          chat.id,
          'Failed to submit question. Please try again.',
        )
        return EMPTY
      }),
      switchMap(() => EMPTY),
    )
  }

  private pollTaskStatus(chatId: number, taskSessionId: string): void {
    // Cancel any existing polling for this chat
    if (this.pollingSubscriptions.get(chatId)) {
      this.cancelPolling(chatId)
    }

    const startTime = Date.now()
    this.store.updatePollingState(chatId, true)
    this.store.setLoading(true)

    const subscription = timer(0, this.POLL_INTERVAL_MS)
      .pipe(
        switchMap(() => {
          // Check timeout
          if (Date.now() - startTime > this.TIMEOUT_MS) {
            this.handleError(
              chatId,
              'Request timed out after 5 minutes. Please try again.',
            )
            return throwError(() => new Error('Timeout'))
          }

          return this.apiDataService.aiAskAsyncStatus(taskSessionId)
        }),
        tap((response) => {
          this.store.updateTaskStatus(chatId, response.status)

          if (response.status === 'COMPLETED' && response.message) {
            this.handleSuccess(chatId, response.message)
            this.cancelPolling(chatId)
          } else if (response.status === 'ERROR') {
            this.handleError(
              chatId,
              response.error ||
                'An error occurred while processing your request.',
            )
            this.cancelPolling(chatId)
          }
        }),
        catchError((err) => {
          if (err.message !== 'Timeout') {
            this.handleError(
              chatId,
              'Network error. Please check your connection.',
            )
          }
          this.cancelPolling(chatId)
          return EMPTY
        }),
        takeWhile(
          (response) =>
            response.status === 'PENDING' || response.status === 'PROCESSING',
          true,
        ),
      )
      .subscribe()

    // Store cleanup function
    this.pollingSubscriptions.set(chatId, () => {
      subscription.unsubscribe()
      this.store.updatePollingState(chatId, false)
    })
  }

  cancelPolling(chatId?: number): void {
    if (chatId !== undefined) {
      const cleanup = this.pollingSubscriptions.get(chatId)
      if (cleanup) {
        cleanup()
        this.pollingSubscriptions.delete(chatId)
      }
      this.store.updateTaskId(chatId)
      this.store.updatePollingState(chatId, false)
      this.store.setLoading(false)
    } else {
      // Cancel all polling
      this.pollingSubscriptions.forEach((cleanup) => cleanup())
      this.pollingSubscriptions.clear()
      this.store.setLoading(false)
    }
  }

  private handleSuccess(chatId: number, message: string): void {
    this.store.update(chatId, (chat) => ({
      ...chat,
      chat: [
        ...chat.chat,
        {
          type: 'AI',
          content: message,
        },
      ],
    }))
    this.store.updateTaskId(chatId)
    this.store.setLoading(false)
  }

  private handleError(chatId: number, errorMessage: string): void {
    this.store.update(chatId, (chat) => ({
      ...chat,
      chat: [
        ...chat.chat,
        {
          type: 'AI',
          content: errorMessage,
        },
      ],
    }))
    this.store.updateTaskId(chatId)
    this.store.updateTaskStatus(chatId, 'ERROR')
    this.store.setLoading(false)
  }
}
