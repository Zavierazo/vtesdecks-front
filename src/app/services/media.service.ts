import { MediaMatcher } from '@angular/cdk/layout'
import { Injectable, NgZone, inject } from '@angular/core'
import { map, merge, Observable, Observer, startWith } from 'rxjs'

@Injectable({
  providedIn: 'root',
})
export class MediaService {
  private media = inject(MediaMatcher);
  private zone = inject(NgZone);

  private readonly mobileMediaQuery = '(max-width: 767px)'
  private readonly tabletMediaQuery = '(max-width: 1023px)'

  private mobileQuery!: MediaQueryList
  private tabletQuery!: MediaQueryList

  constructor() {
    this.mobileQuery = this.media.matchMedia(this.mobileMediaQuery)
    this.tabletQuery = this.media.matchMedia(this.tabletMediaQuery)
  }

  /**
   * Observe mobile resolution changes
   */
  observeMobile(): Observable<boolean> {
    return this.observe(this.mobileQuery)
  }

  /**
   * Observe tablet resolution changes
   */
  observeTablet(): Observable<boolean> {
    return this.observe(this.tabletQuery)
  }

  /**
   * Observe both mobile and tablet resolution changes
   */
  observeMobileOrTablet(): Observable<boolean> {
    return merge(this.observeMobile(), this.observeTablet())
  }

  private observe(mediaQuery: MediaQueryList): Observable<boolean> {
    return new Observable((observer: Observer<MediaQueryListEvent>) => {
      const handler = (e: MediaQueryListEvent): void =>
        this.zone.run(() => observer.next(e))
      mediaQuery.addEventListener('change', handler)
      return () => mediaQuery.removeEventListener('change', handler)
    }).pipe(
      startWith(mediaQuery),
      map(({ matches }) => matches),
    )
  }
}
