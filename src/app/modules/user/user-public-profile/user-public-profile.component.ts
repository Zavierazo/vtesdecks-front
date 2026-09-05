import { AsyncPipe, DatePipe, NgTemplateOutlet } from '@angular/common'
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
import { ApiAchievementFamily, ApiCollection, ApiDeck, ApiPublicUser } from '@models'
import { NgbPopover } from '@ng-bootstrap/ng-bootstrap'
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy'
import { ApiDataService, ToastService } from '@services'
import { UserFollowButtonComponent } from '@shared/components/user-follow-button/user-follow-button.component'
import { DecksQuery } from '@state/decks/decks.query'
import { DecksService } from '@state/decks/decks.service'
import { AuthQuery } from '@state/auth/auth.query'
import { isSupporter } from '@utils'
import { catchError, Observable, of, tap } from 'rxjs'
import { CollectionApiDataService } from '../../collection/services/collection-api.data.service'
import { WishlistApiDataService } from '../../wishlist/services/wishlist-api.data.service'
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
    DatePipe,
  ],
})
export class UserPublicProfileComponent implements OnInit {
  private route = inject(ActivatedRoute)
  private decksService = inject(DecksService)
  private decksQuery = inject(DecksQuery)
  private collectionApiService = inject(CollectionApiDataService)
  private wishlistApiService = inject(WishlistApiDataService)
  private apiDataService = inject(ApiDataService)
  private toastService = inject(ToastService)
  private translocoService = inject(TranslocoService)
  private authQuery = inject(AuthQuery)

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
  wishlistAvailable = signal<boolean>(false)
  achievements = signal<ApiAchievementFamily[]>([])
  achievementsLoading = signal(false)
  achievementsExpanded = signal(false)
  isOwner = computed(() => this.authQuery.getUser() === this.username())
  displayedAchievements = computed(() => {
    const achievements = this.achievements()
    if (!this.isOwner()) return achievements
    return [
      ...achievements.filter((family) => family.tiers.some((tier) => tier.earned)),
      ...achievements.filter((family) => !family.tiers.some((tier) => tier.earned)),
    ]
  })
  additionalAchievementsCount = computed(() =>
    Math.max(0, this.displayedAchievements().length - 3),
  )

  ngOnInit() {
    this.loading$ = this.decksQuery.selectLoading()
    this.decks$ = this.decksQuery.selectAll()
    this.total$ = this.decksQuery.selectTotal()

    this.route.params.pipe(untilDestroyed(this)).subscribe((params) => {
      const username = params['username']
      if (username) {
        this.username.set(username)
        this.achievementsExpanded.set(false)
        this.loadUserData(username)
        this.loadUserDecks(username)
        this.loadUserBinders(username)
        this.loadUserWishlist(username)
        this.loadAchievements(username)
      }
    })
  }

  highestEarned(family: ApiAchievementFamily) {
    return family.tiers.filter((tier) => tier.earned).at(-1)
  }

  progressPercent(family: ApiAchievementFamily): number {
    if (!family.nextThreshold || family.progress === undefined) return 100
    const previous = this.highestEarned(family)?.threshold ?? 0
    return Math.min(100, Math.max(0, ((family.progress - previous) / (family.nextThreshold - previous)) * 100))
  }

  private loadAchievements(username: string) {
    this.achievementsLoading.set(true)
    const request = this.authQuery.getUser() === username
      ? this.apiDataService.getMyAchievements()
      : this.apiDataService.getPublicUserAchievements(username)
    request.pipe(untilDestroyed(this)).subscribe({
      next: (achievements) => {
        this.achievements.set(achievements)
        this.achievementsLoading.set(false)
      },
      error: () => this.achievementsLoading.set(false),
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

  private loadUserWishlist(username: string) {
    // Minimal probe (1 item) just to know whether a public wishlist exists.
    this.wishlistApiService
      .getUserPublicWishlist(username, {
        page: 0,
        pageSize: 1,
        sortBy: 'cardName',
        sortDirection: 'asc',
        filters: [],
      })
      .pipe(
        untilDestroyed(this),
        tap((page) =>
          this.wishlistAvailable.set((page?.totalElements ?? 0) > 0),
        ),
        catchError(() => {
          this.wishlistAvailable.set(false)
          return of(undefined)
        }),
      )
      .subscribe()
  }
}
