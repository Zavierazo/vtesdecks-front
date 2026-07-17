# AGENTS.md — Project Guidance for AI Assistants

> **Keep this file updated.** When the tech stack, architecture, or key conventions change, update the relevant section here before starting other work. Do not add changelogs — only general structural/architectural guidance.

---

## Project Overview

**VTESDecks** is an Angular PWA for the *Vampire: The Eternal Struggle* (VTES) trading card game.
Live at **vtesdecks.com**. Backed by a separate Spring Boot API (`vtesdecks-back`).

Features: card browser, TWD deck browser, deck builder, collection manager, proxy generator, metagame stats, AI deck-building assistant, daily card game (Vtesdle).

---

## Tech Stack

| Concern | Tool/Version |
|---|---|
| Framework | Angular 21 (standalone components) |
| Language | TypeScript 5.9 (strict mode) |
| Styling | SCSS + Bootstrap via `@ng-bootstrap/ng-bootstrap` 20 |
| i18n | `@jsverse/transloco` 8 |
| Auth | JWT via `@auth0/angular-jwt`, Google OAuth |
| State | Custom Signal-based store (no NgRx) |
| Charts | `ng2-charts` + `chart.js` |
| Markdown | `ngx-markdown` + `marked` |
| Errors | Sentry 10 |
| Analytics | `ngx-google-analytics` |
| Testing | Karma + Jasmine |
| Deployment | Cloudflare Workers (Wrangler 4) |
| PWA | `@angular/service-worker` |

---

## Commands

```bash
npm start              # Dev server → http://localhost:4200
npm run build          # Production build
npm test               # Unit tests (Karma)
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
`http-monitor.interceptor.ts` — adds locale/version query params, cache-control headers, retry logic (10 retries, 5 s delay). Only applies to API requests.

### Guards
- `CanActivateUser` — redirects unauthenticated users, opens login modal
- `CanDeactivateComponent` — unsaved-changes confirmation

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

- **Change detection**: `OnPush` everywhere.
- **Subscriptions**: cleaned up with `@ngneat/until-destroy`.
- **API calls**: go through `ApiDataService` only.
- **Translations**: `transloco` pipe in templates; `TranslocoService.translate()` in code.
- **Images**: lazy-loaded via `ng-lazyload-image`; URLs built by `card-image.pipe`.
- **Auth tokens**: stored in LocalStorage (remember me) or SessionStorage (session only).
- **SEO**: `SeoService` sets canonical URL and meta tags per route.
- **Resolvers**: data pre-fetched via route `resolve` before component render.

---

## Supported Languages
English (en), Español (es), Français (fr), Português (pt).

---

## API Base
- Dev: `http://localhost:8080/api/1.0`
- Prod: `https://api.vtesdecks.com/1.0`

Main resource groups: `/auth`, `/user`, `/decks`, `/cards/crypt`, `/cards/library`, `/comments`, `/proxy`, `/ai/ask/async`, `/sets`, `/deck-archetype`, `/vtesdle`.
