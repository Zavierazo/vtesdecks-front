import { AsyncPipe } from '@angular/common'
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core'
import { ActivatedRoute, RouterLink } from '@angular/router'
import { TranslocoDirective, TranslocoPipe } from '@jsverse/transloco'
import { ApiCollection, ApiDeck, ApiUser } from '@models'
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy'
import { DecksQuery } from '@state/decks/decks.query'
import { DecksService } from '@state/decks/decks.service'
import { isSupporter } from '@utils'
import { Observable, tap } from 'rxjs'
import { CollectionApiDataService } from '../../collection/services/collection-api.data.service'
import { DeckCardComponent } from '../../deck-card/deck-card.component'

@UntilDestroy()
@Component({
  selector: 'app-user-public-profile',
  templateUrl: './user-public-profile.component.html',
  styleUrls: ['./user-public-profile.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    TranslocoDirective,
    DeckCardComponent,
    AsyncPipe,
    RouterLink,
    TranslocoPipe,
  ],
})
export class UserPublicProfileComponent implements OnInit {
  private route = inject(ActivatedRoute)
  private decksService = inject(DecksService)
  private decksQuery = inject(DecksQuery)
  private collectionApiService = inject(CollectionApiDataService)

  username = signal<string>('')
  user = signal<ApiUser>({})
  isSupporter = computed(() => isSupporter(this.user().roles))
  decks$!: Observable<ApiDeck[]>
  total$!: Observable<number>
  loading$!: Observable<boolean>
  collection = signal<ApiCollection | undefined>(undefined)
  collectionLoading = signal<boolean>(false)

  ngOnInit() {
    this.loading$ = this.decksQuery.selectLoading()
    this.decks$ = this.decksQuery.selectAll()
    this.total$ = this.decksQuery.selectTotal()

    this.route.params.pipe(untilDestroyed(this)).subscribe((params) => {
      const username = params['username']
      if (username) {
        this.username.set(username)
        this.loadUserDecks(username)
        this.loadUserBinders(username)
      }
    })
  }

  private loadUserDecks(username: string) {
    this.decksService.init({
      author: username,
      exactAuthor: true,
      type: 'COMMUNITY',
      order: 'POPULAR',
    })
    this.decksService
      .getMore(6)
      .pipe(
        untilDestroyed(this),
        tap((decks) => {
          if (decks.decks) {
            this.user.set(decks.decks[0].user || {})
          }
        }),
      )
      .subscribe()
  }

  private loadUserBinders(username: string) {
    this.collectionLoading.set(true)
    this.collectionApiService
      .getUserPublicCollections(username)
      .pipe(
        untilDestroyed(this),
        tap((collection) => {
          this.collection.set(collection)
          this.collectionLoading.set(false)
        }),
      )
      .subscribe()
  }
}
