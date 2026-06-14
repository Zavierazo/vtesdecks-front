# VTESDecks — Cypress E2E Suite

End-to-end tests for the VTESDecks Angular PWA. The suite is **data-agnostic**:
it never asserts on specific records, ids, counts or backend text. Every test
discovers whatever the API currently returns and validates *behaviour, state
changes and workflows* relative to that data. It is safe to run against any
environment whose dataset changes between runs.

---

## Layout

```
e2e/
  cypress.config.ts          # config (paths resolve relative to this folder)
  tsconfig.json              # TS config scoped to the E2E suite
  cypress/
    e2e/                     # the specs (numbered by area)
    pages/                   # Page Objects (DecksPage, …)
    support/
      commands.ts            # custom commands (login, openSearch, ifExists, …)
      e2e.ts                 # global hooks + 3rd-party error filtering
      selectors.ts           # single source of truth for selectors
    fixtures/                # (intentionally empty — no canned data)
```

## Running

Cypress is declared in the **root** `package.json` (shared dependencies). From
the project root:

```bash
npm install                # installs Cypress + start-server-and-test

# 1. Start the API (vtesdecks-back) on :8080 and the Angular app:
npm start                  # ng serve → http://localhost:4200

# 2a. Interactive runner:
npm run e2e:open

# 2b. Headless run:
npm run e2e

# 2c. One-shot CI: boots the dev server, waits for it, runs, tears down:
npm run e2e:ci
```

### Environment overrides

| Var                  | Default                          | Meaning                |
|----------------------|----------------------------------|------------------------|
| `CYPRESS_BASE_URL`   | `http://localhost:4200`          | Angular app under test |
| `CYPRESS_API_URL`    | `http://localhost:8080/api/1.0`  | Backend API base       |
| `CYPRESS_USERNAME`   | `demostration`                   | Demo account user      |
| `CYPRESS_PASSWORD`   | `Hola1234`                       | Demo account password  |

```bash
CYPRESS_BASE_URL=https://staging.vtesdecks.com npm run e2e
```

---

## Coverage

| Spec | Area |
|------|------|
| `01-app-loading` | App bootstrap, shell, reference-data load, SEO meta |
| `02-navigation` | All public routes, menus, dropdowns, active link, 404 |
| `03-decks-list` | Listing, pagination / infinite scroll, empty state |
| `04-deck-filters` | Type / name / author filters, reset, deep-linked filter |
| `05-deck-sorting` | Order control → re-query, order changes, alpha sort |
| `06-deck-detail` | Open deck, refresh persistence, payload shape, bad id |
| `07-search` | Search modal, structured results, navigation, debounce |
| `08-card-browser` | Crypt & library browsing + filter interaction |
| `09-authentication` | Login UI/validation, real login, session, logout |
| `10-auth-protected` | Route guards & permission-based nav (logged in/out) |
| `11-vtesdle` | Daily game load, guess workflow, mode toggle |
| `12-proxy-generator` | Tool load + print action |
| `13-static-pages-and-contact` | Terms/privacy/changelog + contact form validation |
| `14-statistics-metagame` | Charts render, type re-query, archetype payload |
| `15-responsive` | Mobile/tablet/desktop layout, burger menu |
| `16-error-and-loading` | Simulated slow/empty/failing API, recovery |
| `17-i18n-theme` | Language switch + persistence, theme toggle + persistence |
| `18-deck-builder` | Builder edit, import menu, **add-card relative change** |
| `19-user-settings` | Settings form load, edit, password validation |
| `20-persistence-deeplinks` | Query-param + route persistence, cold deep links |
| `21-collection` | Collection toolbar, add-card dialog, binders, multi-select, stats |
| `22-deck-interactions` | **Bookmark toggle relative change** (auth) + state restore |

**139 tests across 22 specs — all passing, zero skips against a populated backend.**

### Data-agnostic patterns used

- **Discover, then assert relatively.** Filters are validated by "result set
  does not grow" / "request carries the filter param", not by an exact count;
  sorting by "a different order returns a different head of the list" (compared
  against the API response, which sidesteps DOM timing and JS-vs-backend
  collation); bookmarking/adding cards by "the counter/icon changed".
- **Derive inputs from live data.** The name filter types a prefix taken from a
  currently-displayed deck; deck/search/card tests read a real id or card name
  from the API before asserting.
- **Wait for render, not just the response.** With zoneless change detection the
  DOM paints just after the API resolves, so the page objects wait for the
  cards to actually render (keyed off the response total) before counting —
  this is what eliminated the earlier false "empty dataset" skips.
- **Structural API validation.** Responses are checked for shape (`is an array`,
  `has property id/crypt/library`), never for specific values.
- **Official skips for genuinely-unavailable data.** When a workflow truly
  cannot run (e.g. an empty result set), tests use Mocha's `this.skip()` (the
  Cypress-supported mechanism) so they report as *pending*, never as a silent
  pass. Against a populated backend none of them skip.

---

## Authentication & reCAPTCHA in tests

Login is exercised through the **real UI** (header → modal → submit) against the
**real backend** (`/auth/login` returns a real JWT). Two things make this work
reliably in a headless run:

1. **reCAPTCHA v3 stub.** The Google reCAPTCHA widget cannot initialise in a
   headless browser (the dev origin isn't an authorised domain for the v3 key),
   so `grecaptcha.execute()` never resolves and the login POST would never be
   sent. `cy.stubRecaptcha()` + `installRecaptchaStub` (in `support/commands.ts`)
   serve a working stub so the real form submits end-to-end. This stubs only the
   un-runnable third-party widget — the login form, validation, network call and
   token handling are all the genuine app code. The backend ignores the token.
2. **Query-param-aware intercepts.** The app's `HttpMonitorInterceptor` appends
   `?locale=&version=` to every API request, so route patterns must end in a
   wildcard (`**/auth/login*`, not `**/auth/login`) to match.

`cy.login()` performs this real UI login once and caches it with `cy.session`
(reused across specs).

## Bugs found and fixed during suite development

The tests surfaced real defects, which were fixed in the app (not worked around):

- **Duplicate DOM id** — the language-selector button reused
  `id="navbarDropdownUser"`, colliding with the logged-in user menu (an
  accessibility/`aria-labelledby` correctness bug). Renamed to
  `navbarDropdownLanguage`. (`lang-selector.component.html`)
- **Missing test hooks** — added `data-cy` attributes to the auth-critical
  elements (login/sign-up buttons, user menu, logout, login form fields and
  tab-switch links) so the suite no longer depends on translated text or fragile
  structural selectors. (`header.component.html`, `login.component.html`)

## Assumptions

1. **Demo account** `demostration / Hola1234` exists and can log in.
2. The backend accepts the stubbed reCAPTCHA token (reCAPTCHA validation is
   disabled/ignored server-side in the test environment).
3. Third-party scripts (AdSense, GA, Sentry, Google Sign-In) may throw in a
   headless context; those specific errors are filtered in `support/e2e.ts`.
   Genuine app errors still fail tests.
4. The backend (`vtesdecks-back`) is reachable at the configured `apiUrl`.

## Cannot be reliably tested without backend control

- **Exact result counts / specific records** — by design (non-deterministic).
- **Email-dependent flows** — account verification, password reset, and the
  contact-email delivery only dispatch the request; the email side is external.
  (The contact submit is stubbed so repeated runs don't email the real inbox.)
- **Google OAuth login** — requires Google's real consent popup; only the
  username/password path is automated.
- **reCAPTCHA scoring** — the widget itself can't run headless; it is stubbed
  (see above), so bot-scoring behaviour is not under test.
- **File downloads/exports** (Lackey/JOL/TWD) — trigger native download/clipboard
  that Cypress cannot fully assert; covered structurally at best.
- **Vtesdle "win"** — the secret card is server-side, so only the guess workflow
  and state transitions are validated, never a correct answer.
- **Push/real-time notifications** and **PWA service-worker update** dialogs.

---

## Recommended testability improvements

The auth-critical elements now have `data-cy` hooks (added during this work).
The remaining selectors still rely on element ids, `routerLink`s and component
tag names; adding hooks to these would make the suite even more robust (see
inline `# add data-cy` notes in `support/selectors.ts`):

| Component | Suggested attribute | Status |
|-----------|---------------------|--------|
| Login / sign-up buttons, user menu, logout | `login-button`, `signup-button`, `user-menu`, `logout` | ✅ added |
| Login modal fields & tab links | `login-username`, `login-password`, `login-submit`, `goto-signup`, `goto-forgot-password` | ✅ added |
| Deck card (`app-deck-card`) | `data-cy="deck-card"` + `data-cy-deck-id` | ⬜ recommended |
| Decks type/order selects | `data-cy="deck-type-select \| deck-order-select"` | ⬜ recommended |
| Deck filter inputs | `data-cy="filter-name \| filter-author \| filter-reset"` | ⬜ recommended |
| Search input & results | `data-cy="search-input \| search-result"` | ⬜ recommended |
| Builder crypt/library counters & add buttons | `data-cy="crypt-count \| add-crypt"` | ⬜ recommended |
| Toasts | `data-cy="toast"` with a `data-cy-variant` for success/error | ⬜ recommended |

Also worth adding for testability: a documented empty-state container element,
and a way to disable reCAPTCHA in a non-production profile so the login UI does
not depend on the third-party widget at all.
