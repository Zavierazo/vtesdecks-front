import { DOCUMENT } from '@angular/common'
import { Inject, Injectable } from '@angular/core'
import { Router, NavigationEnd } from '@angular/router'

@Injectable({
  providedIn: 'root',
})
export class PreviousRouteService {
  private history: string[] = []

  constructor(
    private router: Router,
    @Inject(DOCUMENT) private _document: any,
  ) {
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
