import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http'
import { inject, Injectable } from '@angular/core'
import {
  ApiAiAskAsyncRequest,
  ApiAiAskAsyncResponse,
  ApiAiAskStatusResponse,
  ApiCardInfo,
  ApiCardToday,
  ApiChangelog,
  ApiCollectionCardStats,
  ApiComment,
  ApiContact,
  ApiCrypt,
  ApiDeck,
  ApiDeckArchetype,
  ApiDeckBuilder,
  ApiDeckLimitedFormat,
  ApiDecks,
  ApiHistoricStatistic,
  ApiHome,
  ApiLibrary,
  ApiProxy,
  ApiProxyCardOption,
  ApiResetPassword,
  ApiResponse,
  ApiSet,
  ApiShop,
  ApiUser,
  ApiUserCountry,
  ApiUserNotification,
  ApiUserSettings,
  ApiYearStatistic,
} from '@models'
import { Observable, of } from 'rxjs'
import { environment } from '../../environments/environment'
import { SessionStorageService } from './session-storage.service'

@Injectable({
  providedIn: 'root',
})
export class ApiDataService {
  private httpClient = inject(HttpClient)
  private sessionStorageService = inject(SessionStorageService)

  private readonly loginPath = '/auth/login'
  private readonly loginOauthPath = '/auth/oauth/login'
  private readonly registerPath = '/auth/create'
  private readonly countryPath = '/auth/country'
  private readonly forgotPasswordPath = '/auth/forgot-password'
  private readonly userValidatePath = '/user/validate'
  private readonly userVerifyPath = '/user/verify'
  private readonly userRateDeckPath = '/user/decks/rating'
  private readonly userBookmarkDeckPath = '/user/decks/bookmark'
  private readonly userCommentsPath = '/user/comments'
  private readonly userSettingsPath = '/user/settings'
  private readonly userRefreshPath = '/user/refresh'
  private readonly userResetPasswordPath = '/user/reset-password'
  private readonly userDeckBuilderPath = '/user/decks/builder'
  private readonly decksPath = '/decks'
  private readonly deckDetailPath = '/decks/'
  private readonly deckTagsPath = '/decks/tags'
  private readonly deckHomePath = '/decks/home'
  private readonly limitedFormatsPath = '/limitedFormats'
  private readonly cardCryptPath = '/cards/crypt'
  private readonly cardCryptLastUpdatePath = '/cards/crypt/lastUpdate'
  private readonly cardCryptDetailPath = '/cards/crypt/'
  private readonly cardLibraryPath = '/cards/library'
  private readonly cardLibraryLastUpdatePath = '/cards/library/lastUpdate'
  private readonly cardLibraryDetailPath = '/cards/library/'
  private readonly cardTodayPath = '/vtesdle/todayCard'
  private readonly commentsDeckPath = '/comments/decks/'
  private readonly contactPath = '/contact'
  private readonly errorPath = '/error'
  private readonly changelogPath = '/changelog'
  private readonly setsPath = '/sets'
  private readonly userNotificationsPath = '/user/notifications'
  private readonly aiAskAsyncPath = '/ai/ask/async'
  private readonly proxyPath = '/proxy'
  private readonly proxyOptionsPath = '/proxy/options/'
  private readonly deckArchetype = '/deck-archetype'

  login(
    username: string,
    password: string,
    recaptcha: string,
  ): Observable<ApiUser> {
    const formData = new FormData()
    formData.append('username', username)
    formData.append('password', password)
    formData.append('g-recaptcha-response', recaptcha)
    return this.httpClient.post<ApiUser>(
      `${environment.api.baseUrl}${this.loginPath}`,
      formData,
    )
  }

  loginOauth(token: string): Observable<ApiUser> {
    const formData = new FormData()
    formData.append('token', token)
    return this.httpClient.post<ApiUser>(
      `${environment.api.baseUrl}${this.loginOauthPath}`,
      formData,
    )
  }

  register(
    username: string,
    email: string,
    password: string,
    confirmPassword: string,
    recaptcha: string,
  ): Observable<ApiResponse> {
    const formData = new FormData()
    formData.append('username', username)
    formData.append('email', email)
    formData.append('password', password)
    formData.append('confirmPassword', confirmPassword)
    formData.append('g-recaptcha-response', recaptcha)
    return this.httpClient.post<ApiResponse>(
      `${environment.api.baseUrl}${this.registerPath}`,
      formData,
    )
  }

  getUserCountry(): Observable<ApiUserCountry> {
    return this.httpClient.get<ApiUserCountry>(
      `${environment.api.baseUrl}${this.countryPath}`,
    )
  }

  forgotPassword(email: string, recaptcha: string): Observable<ApiResponse> {
    const formData = new FormData()
    formData.append('email', email)
    formData.append('g-recaptcha-response', recaptcha)
    return this.httpClient.post<ApiResponse>(
      `${environment.api.baseUrl}${this.forgotPasswordPath}`,
      formData,
    )
  }

  verifyAccount(token: string): Observable<boolean> {
    const headers = new HttpHeaders({
      Authorization: token,
    })
    return this.httpClient.post<boolean>(
      `${environment.api.baseUrl}${this.userVerifyPath}`,
      {},
      { headers },
    )
  }

  resetPassword(
    request: ApiResetPassword,
    token: string,
  ): Observable<ApiResponse> {
    const headers = new HttpHeaders({
      Authorization: token,
    })
    return this.httpClient.put<ApiResponse>(
      `${environment.api.baseUrl}${this.userResetPasswordPath}`,
      request,
      { headers },
    )
  }

  isAuthenticated(): Observable<boolean> {
    return this.httpClient.get<boolean>(
      `${environment.api.baseUrl}${this.userValidatePath}`,
    )
  }

  rateDeck(deck: string, rating: number): Observable<boolean> {
    return this.httpClient.post<boolean>(
      `${environment.api.baseUrl}${this.userRateDeckPath}`,
      {
        deck,
        rating,
      },
    )
  }

  bookmarkDeck(deck: string, bookmark: boolean): Observable<boolean> {
    return this.httpClient.post<boolean>(
      `${environment.api.baseUrl}${this.userBookmarkDeckPath}`,
      {
        deck,
        favorite: bookmark,
      },
    )
  }

  getDeck(id: string, collectionTracker?: boolean): Observable<ApiDeck> {
    let params = new HttpParams()
    if (collectionTracker !== undefined) {
      params = params.set('collectionTracker', collectionTracker)
    }
    return this.httpClient.get<ApiDeck>(
      `${environment.api.baseUrl}${this.deckDetailPath}${id}`,
      { params },
    )
  }

  deckView(id: string, source: string): Observable<boolean> {
    const deckViewId = `deck-view-${id}`
    const deckView = this.sessionStorageService.getValue(deckViewId)
    if (deckView) {
      return of(true)
    }
    this.sessionStorageService.setValue(deckViewId, true)
    return this.httpClient.post<boolean>(
      `${environment.api.baseUrl}${this.deckDetailPath}${id}/view`,
      { source },
    )
  }

  getDecks(
    offset: number,
    limit = 20,
    params?: { [key: string]: any },
  ): Observable<ApiDecks> {
    let httpParams = new HttpParams()
    httpParams = httpParams.set('offset', offset)
    httpParams = httpParams.set('limit', limit)
    if (params) {
      Object.keys(params).forEach((k) => {
        httpParams = httpParams.set(k, params[k])
      })
    }
    return this.httpClient.get<ApiDecks>(
      `${environment.api.baseUrl}${this.decksPath}`,
      { params: httpParams },
    )
  }

  getCrypt(id: number): Observable<ApiCrypt> {
    return this.httpClient.get<ApiCrypt>(
      `${environment.api.baseUrl}${this.cardCryptDetailPath}${id}`,
    )
  }

  getAllCrypt(): Observable<ApiCrypt[]> {
    return this.httpClient.get<ApiCrypt[]>(
      `${environment.api.baseUrl}${this.cardCryptPath}`,
    )
  }

  getCryptLastUpdate(): Observable<ApiCrypt> {
    return this.httpClient.get<ApiCrypt>(
      `${environment.api.baseUrl}${this.cardCryptLastUpdatePath}`,
    )
  }

  getLibrary(id: number): Observable<ApiLibrary> {
    return this.httpClient.get<ApiLibrary>(
      `${environment.api.baseUrl}${this.cardLibraryDetailPath}${id}`,
    )
  }

  getAllLibrary(): Observable<ApiLibrary[]> {
    return this.httpClient.get<ApiLibrary[]>(
      `${environment.api.baseUrl}${this.cardLibraryPath}`,
    )
  }

  getLibraryLastUpdate(): Observable<ApiLibrary> {
    return this.httpClient.get<ApiLibrary>(
      `${environment.api.baseUrl}${this.cardLibraryLastUpdatePath}`,
    )
  }

  getComments(deckId: string): Observable<ApiComment[]> {
    return this.httpClient.get<ApiComment[]>(
      `${environment.api.baseUrl}${this.commentsDeckPath}${deckId}`,
    )
  }

  addComment(comment: ApiComment): Observable<ApiComment> {
    return this.httpClient.post<ApiComment>(
      `${environment.api.baseUrl}${this.userCommentsPath}`,
      comment,
    )
  }

  editComment(comment: ApiComment): Observable<ApiComment> {
    return this.httpClient.put<ApiComment>(
      `${environment.api.baseUrl}${this.userCommentsPath}/${comment.id}`,
      comment,
    )
  }

  deleteComment(id: number): Observable<boolean> {
    return this.httpClient.delete<boolean>(
      `${environment.api.baseUrl}${this.userCommentsPath}/${id}`,
    )
  }

  contact(message: ApiContact): Observable<boolean> {
    return this.httpClient.post<boolean>(
      `${environment.api.baseUrl}${this.contactPath}`,
      message,
    )
  }

  updateSettings(settings: ApiUserSettings): Observable<ApiResponse> {
    return this.httpClient.put<ApiResponse>(
      `${environment.api.baseUrl}${this.userSettingsPath}`,
      settings,
    )
  }

  getDeckBuilder(id: string): Observable<ApiDeckBuilder> {
    return this.httpClient.get<ApiDeckBuilder>(
      `${environment.api.baseUrl}${this.userDeckBuilderPath}/${id}`,
    )
  }

  getDeckBuilderImport(type: string, url: string): Observable<ApiDeckBuilder> {
    return this.httpClient.post<ApiDeckBuilder>(
      `${environment.api.baseUrl}${this.userDeckBuilderPath}/${type}/import`,
      url,
    )
  }

  restoreDeckBuilder(id: string): Observable<boolean> {
    return this.httpClient.post<boolean>(
      `${environment.api.baseUrl}${this.userDeckBuilderPath}/${id}/restore`,
      {},
    )
  }

  saveDeckBuilder(deck: ApiDeckBuilder): Observable<ApiDeckBuilder> {
    return this.httpClient.post<ApiDeckBuilder>(
      `${environment.api.baseUrl}${this.userDeckBuilderPath}`,
      deck,
    )
  }

  updateCollectionTracker(
    id: string,
    collectionTracker: boolean,
  ): Observable<boolean> {
    return this.httpClient.patch<boolean>(
      `${environment.api.baseUrl}${this.userDeckBuilderPath}/${id}`,
      {},
      { params: { collectionTracker } },
    )
  }

  deleteDeckBuilder(id: string): Observable<boolean> {
    return this.httpClient.delete<boolean>(
      `${environment.api.baseUrl}${this.userDeckBuilderPath}/${id}`,
    )
  }

  sendError(message: string): Observable<boolean> {
    return this.httpClient.post<boolean>(
      `${environment.api.baseUrl}${this.errorPath}`,
      message,
    )
  }

  getCardToday(): Observable<ApiCardToday> {
    return this.httpClient.get<ApiCardToday>(
      `${environment.api.baseUrl}${this.cardTodayPath}`,
    )
  }

  getChangelog(): Observable<ApiChangelog[]> {
    return this.httpClient.get<ApiChangelog[]>(
      `${environment.api.baseUrl}${this.changelogPath}`,
    )
  }

  getSets(): Observable<ApiSet[]> {
    return this.httpClient.get<ApiSet[]>(
      `${environment.api.baseUrl}${this.setsPath}`,
    )
  }

  getSetLastUpdate(): Observable<ApiSet> {
    return this.httpClient.get<ApiSet>(
      `${environment.api.baseUrl}${this.setsPath}/lastUpdate`,
    )
  }

  getCardInfo(cardId: number): Observable<ApiCardInfo> {
    return this.httpClient.get<ApiCardInfo>(
      `${environment.api.baseUrl}/cards/${cardId}/info`,
    )
  }

  getCardShops(cardId: number, showAll: boolean): Observable<ApiShop[]> {
    const params = new HttpParams().set('showAll', showAll)
    return this.httpClient.get<ApiShop[]>(
      `${environment.api.baseUrl}/cards/${cardId}/shops`,
      { params },
    )
  }

  getDeckTags(): Observable<string[]> {
    return this.httpClient.get<string[]>(
      `${environment.api.baseUrl}${this.deckTagsPath}`,
    )
  }

  getDeckHome(): Observable<ApiHome> {
    return this.httpClient.get<ApiHome>(
      `${environment.api.baseUrl}${this.deckHomePath}`,
    )
  }

  getLimitedFormats(): Observable<ApiDeckLimitedFormat[]> {
    return this.httpClient.get<ApiDeckLimitedFormat[]>(
      `${environment.api.baseUrl}${this.limitedFormatsPath}`,
    )
  }

  getNotifications(): Observable<ApiUserNotification[]> {
    return this.httpClient.get<ApiUserNotification[]>(
      `${environment.api.baseUrl}${this.userNotificationsPath}`,
    )
  }

  readNotification(id: number): Observable<unknown> {
    return this.httpClient.post<unknown>(
      `${environment.api.baseUrl}${this.userNotificationsPath}/${id}/markAsRead`,
      {},
    )
  }

  readAllNotification(): Observable<unknown> {
    return this.httpClient.post<unknown>(
      `${environment.api.baseUrl}${this.userNotificationsPath}/markAsRead`,
      {},
    )
  }
  userRefresh(): Observable<ApiUser> {
    return this.httpClient.get<ApiUser>(
      `${environment.api.baseUrl}${this.userRefreshPath}`,
    )
  }

  getStatistics(year: number, type: string): Observable<ApiYearStatistic> {
    return this.httpClient.get<ApiYearStatistic>(
      `${environment.api.baseUrl}/statistics?year=${year}&type=${type}`,
    )
  }

  getHistoricTagStatistics(type: string): Observable<ApiHistoricStatistic[]> {
    return this.httpClient.get<ApiHistoricStatistic[]>(
      `${environment.api.baseUrl}/statistics/tags?type=${type}`,
    )
  }

  getHistoricDisciplineStatistics(
    type: string,
  ): Observable<ApiHistoricStatistic[]> {
    return this.httpClient.get<ApiHistoricStatistic[]>(
      `${environment.api.baseUrl}/statistics/disciplines?type=${type}`,
    )
  }

  getHistoricClanStatistics(type: string): Observable<ApiHistoricStatistic[]> {
    return this.httpClient.get<ApiHistoricStatistic[]>(
      `${environment.api.baseUrl}/statistics/clans?type=${type}`,
    )
  }

  getExportDeck(id: string, type: string): Observable<string> {
    return this.httpClient.get<string>(
      `${environment.api.baseUrl}${this.deckDetailPath}${id}/export?type=${type}`,
      { responseType: 'text' as 'json' },
    )
  }

  aiAskAsync(request: ApiAiAskAsyncRequest): Observable<ApiAiAskAsyncResponse> {
    return this.httpClient.post<ApiAiAskAsyncResponse>(
      `${environment.api.baseUrl}${this.aiAskAsyncPath}`,
      request,
    )
  }

  aiAskAsyncStatus(sessionId: string): Observable<ApiAiAskStatusResponse> {
    return this.httpClient.get<ApiAiAskStatusResponse>(
      `${environment.api.baseUrl}${this.aiAskAsyncPath}/${sessionId}`,
    )
  }

  generateProxy(request: ApiProxy): Observable<Blob> {
    return this.httpClient.post(
      `${environment.api.baseUrl}${this.proxyPath}`,
      request,
      { responseType: 'blob' },
    )
  }

  getProxyOptions(id: number): Observable<ApiProxyCardOption[]> {
    return this.httpClient.get<ApiProxyCardOption[]>(
      `${environment.api.baseUrl}${this.proxyOptionsPath}${id}`,
    )
  }

  getCardCollectionStats(
    id: number,
    summary: boolean,
  ): Observable<ApiCollectionCardStats> {
    return this.httpClient.get<ApiCollectionCardStats>(
      `${environment.api.baseUrl}/user/collections/cards/${id}/stats?summary=${summary}`,
    )
  }

  getAllDeckArchetypes(): Observable<ApiDeckArchetype[]> {
    return this.httpClient.get<ApiDeckArchetype[]>(
      `${environment.api.baseUrl}${this.deckArchetype}`,
    )
  }

  getDeckArchetype(id: number): Observable<ApiDeckArchetype> {
    return this.httpClient.get<ApiDeckArchetype>(
      `${environment.api.baseUrl}${this.deckArchetype}/${id}`,
    )
  }

  getDeckArchetypeByDeck(deckId: string): Observable<ApiDeckArchetype> {
    return this.httpClient.get<ApiDeckArchetype>(
      `${environment.api.baseUrl}${this.deckArchetype}/deck/${deckId}`,
    )
  }

  createDeckArchetype(
    archetype: ApiDeckArchetype,
  ): Observable<ApiDeckArchetype> {
    return this.httpClient.post<ApiDeckArchetype>(
      `${environment.api.baseUrl}${this.deckArchetype}`,
      archetype,
    )
  }

  updateDeckArchetype(
    archetype: ApiDeckArchetype,
  ): Observable<ApiDeckArchetype> {
    return this.httpClient.put<ApiDeckArchetype>(
      `${environment.api.baseUrl}${this.deckArchetype}/${archetype.id}`,
      archetype,
    )
  }

  deleteDeckArchetype(id: number): Observable<boolean> {
    return this.httpClient.delete<boolean>(
      `${environment.api.baseUrl}${this.deckArchetype}/${id}`,
    )
  }
}
