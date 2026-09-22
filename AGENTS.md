# AGENTS.md — Project Guidance for AI Assistants

> **Keep this file updated.** When the tech stack, architecture, or key conventions change, update the relevant section here before starting other work. Do not add changelogs — only general structural/architectural guidance.

---

## Project Overview

**VTESDecks** is an Angular PWA for the _Vampire: The Eternal Struggle_ (VTES) trading card game.
Live at **vtesdecks.com**. Backed by a separate Spring Boot API (`vtesdecks-back`).

Features: card browser, TWD deck browser, deck builder, collection manager, proxy generator, metagame stats, AI deck-building assistant, daily card game (Vtesdle), and multi-device Web Push notifications.

---

## Tech Stack

| Concern    | Tool/Version                                         |
| ---------- | ---------------------------------------------------- |
| Framework  | Angular 22 (standalone components)                   |
| Language   | TypeScript 6 (strict mode)                           |
| Styling    | SCSS + Bootstrap via `@ng-bootstrap/ng-bootstrap` 21 |
| i18n       | `@jsverse/transloco` 8                               |
| Auth       | JWT via `@auth0/angular-jwt`, Google OAuth           |
| State      | Custom Signal-based store (no NgRx)                  |
| Charts     | `ng2-charts` + `chart.js`                            |
| Markdown   | `marked` + DOMPurify                                 |
| Errors     | Sentry 10                                            |
| Analytics  | `ngx-google-analytics`                               |
| Testing    | Vitest                                               |
| Deployment | Cloudflare Workers (Wrangler 4)                      |
| PWA        | `@angular/service-worker`                            |
| Push       | Angular `SwPush` + VAPID Web Push backend            |

---

## Commands

```bash
npm start              # Dev server → http://localhost:4200
npm run build          # Production build
npm test               # Unit tests (Vitest)
npm run lint           # ESLint
npm run pretty         # Prettier format
npm run wrangler:dev   # Local Cloudflare Workers
npm run wrangler:deploy # Deploy to Cloudflare
```

Dev environment points to `http://localhost:8080/api/1.0`.

---

## Architecture

### Standalone Components + Lazy Routing

All feature modules are lazy-loaded via `loadChildren` in the router. No shared NgModule wrappers — components are standalone.

### State Pattern (Signal Store)

Each domain has three files in `src/app/state/<domain>/`:

- `*.store.ts` — `signal()`-based state container, persisted to LocalStorage/SessionStorage
- `*.service.ts` — business logic, API calls, store mutations
- `*.query.ts` — reactive selectors returning Observables

State domains: `auth`, `crypt`, `library`, `deck`, `deck-builder`, `deck-view`, `decks`, `comments`, `set`, `vtes-ai`.

### HTTP Interceptor

`http-monitor.interceptor.ts` — adds locale/version query params and cache-control headers to API requests. Transient-error retries (10 retries, 5 s delay) are limited to GET/HEAD and POST requests explicitly marked as safe to repeat with `RETRY_REPEATABLE_POST`. Additive creates, collection imports, email sends, tagged deck saves, and other POST requests that can duplicate effects must remain unmarked; ordinary saves may opt in when the deck already has an ID.

### Guards

- `CanActivateUser` — redirects unauthenticated users, opens login modal
- `CanDeactivateComponent` — unsaved-changes confirmation

### Advertising

The home sponsor slot resolves feature flags from one snapshot and waits for country lookup completion when targeting requires it before rendering custom advertising or its AdSense fallback. Pending decisions render no ad. Country readiness is session-only. This selection is local to the main home slot; the shared AdSense script loading and initialization remain independent of it.

### Push Notifications

`PushNotificationService` owns the browser subscription lifecycle, permission state, per-browser account ownership, and backend synchronization. Push is offered from the notification offcanvas and uses the Angular service worker; the authenticated API under `/user/notifications/push` stores one subscription per browser/device.

The production service worker prefetches all JavaScript bundles and core media during installation so every route is immediately offline-capable. Production builds retain hidden JavaScript sourcemaps for Sentry, while `src/.assetsignore` prevents Wrangler from publishing maps and `src/_headers` defines browser caching for fingerprinted assets.

### Reusable Browser Searches

Client-side Crypt and Library name searches share `matchesCardName` and `compareCardNames` in `card-name-search.utils.ts`, covering canonical names, translated names, and aliases with the same normalization, fuzzy, and regex matching. Autocomplete queries rank the complete matching catalog before limiting results; callers must use the same comparator when combining catalogs. Backend searches retain their own contracts.

Crypt, Library, and Deck browser URLs are normalized through `search-query.utils.ts`, which owns the supported query-parameter allowlists, defaults, and canonical ordering. `SearchFeaturesService` keeps recent filtered searches on-device, synchronizes named presets for authenticated users through `/user/search-presets`, and falls back to local persistence when that API is unavailable; browser components must keep Angular query parameters as their source of truth so copied links and restored searches remain interchangeable.

Crypt and Library shop filters use the fixed platform catalog in `card-shops.ts`, support per-shop include/exclude selection, and load current in-stock card IDs on demand through `/cards/shops/{platform}/in-stock-card-ids`. Multiple included shops use union semantics and excluded shops are subtracted; this volatile availability must stay in memory and must not be added to the IndexedDB-backed card catalogs.

### Offline card browsing

Crypt, Library and sets restore from IndexedDB before background refresh. Catalog data and locale/version metadata are committed atomically. Card catalog refreshes retain the current catalog while loading, then atomically replace it with the complete backend response, removing IDs no longer returned. Deck Builder initialization waits for both catalog refreshes to complete before validation; unavailable card metadata produces a validation error without discarding deck entries. Catalog updates are automatic, without settings controls. An offline section in authenticated `/user/settings` manages optional card-image downloads on this device; images use dedicated Cache Storage and IndexedDB metadata, with normal browser/CDN HTTP caching and decoded-image validation before replacement. Image fetches use the default cache mode so cache headers and CDN invalidation control freshness. CardImagePipe returns a URL string synchronously and owns one image subscription per view, replacing it only when the resolved card URL changes and releasing it on destruction. Views check Cache Storage first with a bounded read and image-decode validation. Cached copies stay stable on screen while viewed images are refreshed in the background once per application visit when online, including after reconnecting. Successful refreshes are reused for the rest of that visit; failures retain the cached copy and may retry on a later view. Updated images appear when a new view loads them. Cache misses, corrupt images, or unavailable storage fall back to the CDN URL online and save a validated copy in the background. Offline views may use the cached original printing or the card back. OfflineImagesService owns blob lifetimes through Observable teardown, without a global active-view registry. Explicit image updates remain available in offline settings. Angular's service worker owns app assets only. The shell shows a red connectivity banner while offline and a brief green confirmation only after reconnecting. Offline-only card notices must not appear during online loading. Connectivity distinguishes missing network from server failures; network-dependent filters are hidden and inactive offline while retaining their URL values for reconnection. Account data and server-saved deck loading remain online-only; new decks use automatic local drafts. Business API calls remain in ApiDataService; CDN requests belong to OfflineImagesService. Storage failures must be visible.

### Builder editing header

The builder has a non-sticky editing header with the name and compact save controls sharing a row when space permits, followed by an always-visible Markdown description editor and grouped actions. Draft status and a small Show changes link sit beneath Save within the compact save area, aligned as a group with the name input. Comparison totals and details appear below the primary row only when expanded. The builder sets --markdown-editor-min-height for a shorter empty, unfocused editor; focus or existing content restores the standard minimum height, and the shared Markdown editor continues to grow with content. Import, Export and Share retain their specific menus. The optional version-label input and Save button share an aligned input group; visibility sits beside it within one compact save area. Header action buttons use the blue primary palette, except Delete, which uses the danger palette. Existing save, draft, sharing and action eligibility contracts remain unchanged.

### Unsaved deck comparison

The builder keeps an session-only `baseline` containing a copied list of cards from the account load or last successful save. Draft/history restoration and imports into an existing deck retain that baseline; new decks and clones reset it. The inline comparison ignores metadata and considering-only changes and uses the shared quantity-difference utility. Only card quantities are compared. Baselines are never persisted in local drafts. Builder editing is disabled while an account save is pending.

### Card quantities

Deck and picker quantities use `CardQuantityComponent` to display a number until clicked, then an inline editor. List quantities keep their existing placement without a colored background. Grid editing uses neutral minus and plus buttons around the clickable quantity. Direct edits commit on Enter or blur, cancel on Escape, and accept nonnegative safe integers. Updates go through `DeckBuilderService.setCardQuantity` for validation and draft saving. Zero retains an existing considering card. Shared card displays opt in explicitly.

### Card-picker deck panel

Crypt and Library list-row artwork uses the shared `CardArtBackgroundComponent` to clip canonical full-card images with CSS. It loads through `OfflineImagesService`, preserves the source-pixel crop rectangles and responsive background alignment, and hides unavailable artwork. List rows must not request separate `cropImage` assets.

Crypt and Library picker modals share a live deck panel using the existing Crypt and Library list components. A labeled show/hide button in the search toolbar controls its device-local split-view preference, independently of the Markdown editor. The panel is available only when the modal content is wide enough; the filters, catalog results and deck have separate scroll containers, and infinite scrolling must target the catalog container explicitly. The panel reads the builder state independently of catalog filters and changes quantities through the existing builder service.

Builder recommendation quantities refresh three seconds after deck edits. A single service-owned RxJS subscription debounces all refreshes by three seconds, then uses switchMap to replace the previous request. A previous response may update badges during the debounce pause. Crypt and Library pickers keep a snapshot of recommendation priority IDs and deck statistics for ranking, refreshed only on opening or search, filter, and sort changes. Infinite scrolling reuses that snapshot; live recommendation badges and quantity changes must not reorder results. Recommendation priority applies only to relevance sorting.

### Local drafts

The Deck Builder automatically saves each editing session to `LocalDeckDraftsService`, using the deck name as its draft label. Returning to the new-deck builder offers a picker to restore a draft with its selected public/private status, delete unwanted drafts, or start fresh; there is no dedicated draft-save menu. Drafts are device-local and do not expire automatically. Legacy recovery slots are migrated without deleting them until the new write succeeds. Leaving unsaved work offers keep draft, discard draft, or continue editing; the stored-draft message requires a successful write. `CanDeactivateComponent` must return a component's Observable decision rather than treating it as a truthy boolean. Successfully saving to the account removes the active local draft for both new and existing decks. Further edits automatically create a recovery draft linked to the saved deck ID. Storage failures are visible and must not replace the editor or remove a draft.

### Local builder drafts

Drafts of existing decks are linked to their saved deck ID and offered only when reopening that deck; the new-deck picker lists only drafts without a saved deck ID. Saving an existing deck clears its linked recovery draft. Restoring an existing-deck draft preserves its server identity and selected visibility.

### Deck Snapshots

`/deck/snapshot?name=...&author=...&description=...#id=quantity;id=quantity` opens a public, read-only deck snapshot with URL-encoded metadata in query parameters and ordered card pairs in the fragment. Legacy compressed `#v1=...` links are rejected. The query and fragment are bounded to 128 KiB, and decoded content to 256 KiB. Metadata is included in the HTTP request; card pairs remain in the fragment. Snapshots contain only name, author, description and card ID/quantity pairs (including zero quantities). They reuse `DeckComponent`, its HTML and styles through snapshot route data, with local state instead of the normal deck resolver/store. Social/view-tracking endpoints, exports and original-deck actions are disabled in snapshot mode. Card details and derived statistics come from the current catalogs. Sharing from the builder captures unsaved form values and all cards without saving the draft. Cloning creates a new private draft without an original deck ID. Snapshot metadata is centrally defined as noindex. Links are self-contained, not authenticated statements of authorship. Encoding and decoding use browser APIs without additional dependencies.

### Achievements

The backend owns the achievement catalog and permanently records earned tiers. Repeatable families store one occurrence and expose a multiplier; milestone families expose their highest earned tier. Public profiles load earned achievement families from `/public/user/{username}/achievements`; owners load the full catalog and progress from `/user/achievements`. `ApiPublicUser.achievementBadges` is the compact, server-prioritized top-three list used on the full deck view, not on deck cards. Frontend components must use stable family IDs for translations and presentation and must not independently decide whether an achievement has been earned.

### Admin User Management

The `/admin` dashboard centralizes user management, feature-flag mutation, and manual scheduler execution. Administrators can also open the user-management modal from the admin-only button on public profiles; the modal must fetch private data only after it is opened. All privileged operations use the `ADMIN`-secured `/admin/**` API, while the public `GET /feature-flag` contract remains unchanged. Manual jobs are cataloged by the backend and triggered with POST requests. Private account data must never be added to the public-user response. Role changes replace the complete assigned role set. Current database privileges are enforced on every authenticated request; role and admin-status changes preserve login sessions. Admin email changes are trusted immediately by the backend and do not require verification. Impersonation replaces the current browser authentication with the target user's token and navigates away from the admin area; there is no retained admin session to restore.

---

## Directory Map

```
src/app/
  models/          # ~60 TypeScript interfaces (ApiDeck, ApiCrypt, ApiLibrary, …)
  modules/         # Feature modules (home, decks, deck, deck-builder, collection,
                   #   proxy-generator, vtes-ai, vtesdle, statistics, user, …)
  services/        # ApiDataService (all HTTP), AuthService, SeoService, ToastService, …
  shared/
    components/    # header, footer, login modal, search-bar, ai-chat-widget, …
    directives/    # is-logged, is-supporter, lazy-render, auto-focus
    pipes/         # card-image, card-text, date-ago, markdown-sanitize, truncate, …
    guards/        # CanActivateUser, CanDeactivateComponent
  state/           # Signal stores per domain (see above)
  utils/           # Utility functions
src/assets/
  i18n/            # Translation JSON files (en, es, fr, pt)
  changelog.json   # Version history
src/environments/  # environment.ts (dev) / environment.prod.ts (prod)
```

SEO must not introduce a visible breadcrumb bar. The centralized structured data describes the site and public pages; it does not emit BreadcrumbList markup without corresponding visible navigation.

Do not add SEO-only headings to the Deck, Crypt, or Library browsers, including visually hidden headings. Keep their existing layout and provide page titles and descriptions through centralized metadata.

SEO titles receive the `VTES Decks - ` prefix from `SeoService`. Translated page titles must omit repeated VTES branding and use `-` for any additional separator. Preserve entity names and distinct product names such as VTESDLE verbatim.

### Path Aliases (tsconfig)

```
@models           → src/app/models/index.ts
@services         → src/app/services/index.ts
@utils            → src/app/utils/index.ts
@shared/components/*
@shared/guards/*
@shared/directives/*
@shared/pipes/*
@state/*          → src/app/state/*/
@advent/*         → src/app/modules/advent/*
```

---

## Key Conventions

- **Markdown**: `MarkdownService` parses first and sanitizes generated HTML with an explicit DOMPurify tag, attribute, and URL allowlist. Only this service may mark sanitized Markdown as trusted for Angular, preserving the card custom element and validated YouTube embeds. Custom renderers must HTML-encode interpolated values and accept only validated YouTube video IDs.
- **Change detection**: `OnPush` everywhere.
- **Component templates**: Keep production HTML in a separate `.html` file referenced with `templateUrl`. Test-only components may use inline templates.
- **Subscriptions**: cleaned up with `@ngneat/until-destroy`.
- **API calls**: go through `ApiDataService` only.
- **Translations**: `transloco` pipe in templates; `TranslocoService.translate()` in code.
- **Images**: lazy-loaded via `ng-lazyload-image`; URLs built by `card-image.pipe`.
- **Auth tokens**: login JWTs are stored in LocalStorage (remember me) or SessionStorage (session only). The backend checks account versions and current privileges on every authenticated request. Password changes return replacement credentials for the initiating browser and revoke older tokens. Email verification and recovery use single-use opaque tokens, kept only in component memory and submitted in request bodies to `/auth/verify` and `/auth/reset-password`. The verification page submits its token automatically on initialization and offers the existing sign-in modal. The forms remove tokens from the URL after reading them; analytics and JavaScript libraries remain unchanged. Never persist email-action tokens or send them as authorization headers.
- **SEO**: `SeoTitleStrategy` and `SeoService` own route metadata, canonical URLs, robots directives, active-language metadata, and JSON-LD. Route defaults and resolver data are centralized in `seo-route.config.ts`; asynchronously loaded public binders and wishlists supply visibility-aware overrides tied to their canonical path. Metadata translations live under `seo` in all four locale files. Components must not write independent title or robots tags. The app remains client-rendered with unchanged URLs; filter parameters are excluded from canonicals, and there are no hreflang variants or pagination URLs. Public resources may be indexed only after their availability is established.
- **Resolvers**: data pre-fetched via route `resolve` before component render. Detail routes for decks, public users, and archetypes render the shared not-found page for HTTP 404 responses while preserving the requested URL; other request failures propagate normally.

---

## Supported Languages

English (en), Español (es), Français (fr), Português (pt).

---

## API Base

- Dev: `http://localhost:8080/api/1.0`
- Prod: `https://api.vtesdecks.com/1.0`

Main resource groups: `/auth`, `/user`, `/decks`, `/cards/crypt`, `/cards/library`, `/comments`, `/proxy`, `/ai/ask/async`, `/sets`, `/deck-archetype`, `/vtesdle`.
