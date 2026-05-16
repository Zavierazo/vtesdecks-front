import { Injectable, signal, TemplateRef } from '@angular/core'

@Injectable({
  providedIn: 'root',
})
export class ToastService {
  toasts = signal<any[]>([])

  show(textOrTpl: string | TemplateRef<any>, options: any = {}) {
    this.toasts.update((toasts) => [...toasts, { textOrTpl, ...options }])
  }

  remove(toast: any) {
    this.toasts.update((toasts) => toasts.filter((t) => t !== toast))
  }

  clear() {
    this.toasts.set([])
  }
}
