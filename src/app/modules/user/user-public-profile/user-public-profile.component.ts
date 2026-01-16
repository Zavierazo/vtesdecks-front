import { AsyncPipe, NgTemplateOutlet } from '@angular/common'
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core'
import { ActivatedRoute, RouterLink } from '@angular/router'
import {
  TranslocoDirective,
  TranslocoPipe,
  TranslocoService,
} from '@jsverse/transloco'
import { ApiCollection, ApiDeck, ApiPublicUser } from '@models'
import { NgbPopover } from '@ng-bootstrap/ng-bootstrap'
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy'
import { ApiDataService, ToastService } from '@services'
import { UserFollowButtonComponent } from '@shared/components/user-follow-button/user-follow-button.component'
import { DecksQuery } from '@state/decks/decks.query'
import { DecksService } from '@state/decks/decks.service'
import { isSupporter } from '@utils'
import { catchError, Observable, tap } from 'rxjs'
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
    UserFollowButtonComponent,
    NgbPopover,
    NgTemplateOutlet,
  ],
})
export class UserPublicProfileComponent implements OnInit {
  private route = inject(ActivatedRoute)
  private decksService = inject(DecksService)
  private decksQuery = inject(DecksQuery)
  private collectionApiService = inject(CollectionApiDataService)
  private apiDataService = inject(ApiDataService)
  private toastService = inject(ToastService)
  private translocoService = inject(TranslocoService)

  username = signal<string>('')
  user = signal<ApiPublicUser | undefined>(undefined)
  isSupporter = computed(() => isSupporter(this.user()?.roles))
  followersCount = computed(() => this.user()?.followers?.length || 0)
  followingCount = computed(() => this.user()?.following?.length || 0)
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
        this.loadUserData(username)
        this.loadUserDecks(username)
        this.loadUserBinders(username)
      }
    })
  }

  private loadUserData(username: string) {
    this.apiDataService
      .getPublicUser(username)
      .pipe(
        untilDestroyed(this),
        tap((user) => this.user.set(user)),
        catchError((error) => {
          this.toastService.show(
            this.translocoService.translate(
              'user_public_profile.user_not_found',
            ),
            { classname: 'bg-danger text-light', delay: 5000 },
          )
          throw error
        }),
      )
      .subscribe()
  }

  private loadUserDecks(username: string) {
    this.decksService.init({
      username,
      type: 'COMMUNITY',
      order: 'POPULAR',
    })
    this.decksService.getMore(6).pipe(untilDestroyed(this)).subscribe()
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
