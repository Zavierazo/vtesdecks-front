import { TestBed } from '@angular/core/testing'
import { ActivatedRoute, Params, Router } from '@angular/router'
import { TranslocoTestingModule } from '@jsverse/transloco'
import { NgbModal, NgbOffcanvas } from '@ng-bootstrap/ng-bootstrap'
import { SearchFeaturesService, SearchFeaturesUiService } from '@services'
import { BehaviorSubject } from 'rxjs'
import { SearchFeaturesButtonComponent } from './search-features-button.component'

describe('SearchFeaturesButtonComponent', () => {
  afterEach(() => TestBed.resetTestingModule())

  it('keeps Share search available for every deck type and hides it for card searches', async () => {
    const queryParams = new BehaviorSubject<Params>({ type: 'USER' })
    TestBed.configureTestingModule({
      imports: [
        SearchFeaturesButtonComponent,
        TranslocoTestingModule.forRoot({
          langs: { en: { search_features: { share_search: 'Share' } } },
          translocoConfig: { availableLangs: ['en'], defaultLang: 'en' },
          preloadLangs: true,
        }),
      ],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: {
            queryParams,
            snapshot: { queryParams: queryParams.value },
          },
        },
        { provide: Router, useValue: {} },
        { provide: NgbModal, useValue: {} },
        { provide: NgbOffcanvas, useValue: {} },
        {
          provide: SearchFeaturesService,
          useValue: {
            getPresets: () => [],
            getHistory: () => [],
            finalizeHistoryDraft: vi.fn(),
            recordHistory: vi.fn(),
          },
        },
        {
          provide: SearchFeaturesUiService,
          useValue: { summary: () => '', shareLink: vi.fn() },
        },
      ],
    })
    const fixture = TestBed.createComponent(SearchFeaturesButtonComponent)
    fixture.componentRef.setInput('scope', 'decks')
    await fixture.whenStable()
    const shareVisible = () =>
      fixture.nativeElement.textContent.includes('Share')
    expect(shareVisible()).toBe(true)
    for (const type of ['COMMUNITY', 'ALL', 'TOURNAMENT', 'PRECONSTRUCTED']) {
      queryParams.next({ type })
      await fixture.whenStable()
      expect(shareVisible()).toBe(true)
      queryParams.next({ type: 'USER' })
      await fixture.whenStable()
      expect(shareVisible()).toBe(true)
    }
    queryParams.next({})
    await fixture.whenStable()
    expect(shareVisible()).toBe(true)
    fixture.componentRef.setInput('scope', 'crypt')
    await fixture.whenStable()
    expect(shareVisible()).toBe(false)
  })
})
