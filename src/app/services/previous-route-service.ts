import { DOCUMENT, Injectable, inject } from '@angular/core'
import { NavigationEnd, Router } from '@angular/router'

@Injectable({
  providedIn: 'root',
})
export class PreviousRouteService {
  private router = inject(Router)
  private _document = inject(DOCUMENT)

  private history: string[] = []

  constructor() {
    const router = this.router

    router.events.subscribe((event) => {
      if (event instanceof NavigationEnd) {
        this.history = [...this.history, event.urlAfterRedirects]
      }
    })
  }

  public getPreviousUrl() {
    return (
      this._document.referrer || this.history[this.history.length - 2] || '/'
    )
  }
}
