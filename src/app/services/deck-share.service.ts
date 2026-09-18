import { Clipboard } from '@angular/cdk/clipboard'
import { Injectable, inject } from '@angular/core'
import { TranslocoService } from '@jsverse/transloco'
import { ToastService } from './toast.service'

@Injectable({ providedIn: 'root' })
export class DeckShareService {
  private readonly clipboard = inject(Clipboard)
  private readonly toast = inject(ToastService)
  private readonly transloco = inject(TranslocoService)

  async share(url: string): Promise<void> {
    if (navigator.share) {
      try {
        // Called before any await: the click's user activation is still active.
        await navigator.share({ url })
        return
      } catch (error) {
        if (
          error &&
          typeof error === 'object' &&
          'name' in error &&
          error.name === 'AbortError'
        ) {
          return
        }
      }
    }
    this.copy(url)
  }

  copy(text: string): void {
    try {
      if (this.clipboard.copy(text)) {
        this.toast.show(this.transloco.translate('snapshot.copied'), {
          classname: 'bg-success text-light',
          delay: 5000,
        })
        return
      }
    } catch {
      // Clipboard access can be unavailable or denied.
    }
    this.toast.show(this.transloco.translate('snapshot.copy_error'), {
      classname: 'bg-danger text-light',
      delay: 5000,
    })
  }
}
