import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnInit,
  signal,
} from '@angular/core'
import { ActivatedRoute } from '@angular/router'
import { TranslocoDirective } from '@jsverse/transloco'
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy'
import { distinctUntilChanged, filter, map, switchMap, tap } from 'rxjs'
import { WishlistCardsListComponent } from '../wishlist-cards-list/wishlist-cards-list.component'
import { WishlistPublicService } from '../state/wishlist-public.service'
import { WishlistQuery } from '../state/wishlist.query'

@UntilDestroy()
@Component({
  selector: 'app-wishlist-public',
  templateUrl: './wishlist-public.component.html',
  styleUrls: ['./wishlist-public.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslocoDirective, WishlistCardsListComponent],
})
export class WishlistPublicComponent implements OnInit {
  private route = inject(ActivatedRoute)
  private wishlistService = inject(WishlistPublicService)
  private wishlistQuery = inject(WishlistQuery)

  username = signal<string>('')
  loading = signal<boolean>(true)
  available = signal<boolean>(false)

  ngOnInit() {
    this.route.params
      .pipe(
        untilDestroyed(this),
        map((params) => params['username'] as string | undefined),
        filter((username): username is string => !!username),
        tap((username) => {
          this.username.set(username)
          this.loading.set(true)
          // Reset the shared store and target this user before (re)fetching.
          this.wishlistService.initialize(username)
        }),
        // Re-fetch whenever the query (filters/sort/page) changes. A fresh inner
        // stream per username guarantees the first page loads even when two
        // profiles share the same default query.
        switchMap(() =>
          this.wishlistQuery.selectQuery().pipe(distinctUntilChanged()),
        ),
        switchMap(() => this.wishlistService.fetchCards()),
        tap((page) => {
          // null => user missing or wishlist private; a page (even empty) => public
          this.available.set(!!page)
          this.loading.set(false)
        }),
      )
      .subscribe()
  }
}
