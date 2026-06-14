/**
 * Centralised selector map — the single source of truth for the suite.
 *
 * The application currently ships **no** `data-cy` / `data-testid` attributes,
 * so we lean on the most stable thing available: element ids, `routerLink`
 * hrefs, `formControlName`s and component tag names (Angular renders custom
 * element selectors like `<app-deck-card>` verbatim in the DOM).
 *
 * Each entry is annotated with a `# add data-cy` note where a dedicated test
 * hook would make the selector far more robust. See the README for the full
 * list of recommended attributes.
 */
export const SEL = {
  // ---- Global chrome ---------------------------------------------------
  header: 'nav.navbar', // # add data-cy="app-header"
  headerBrand: 'nav.navbar a.navbar-brand',
  navHome: 'nav a.nav-link[routerLink="/"]',
  navLink: (href: string) => `nav a[routerLink="${href}"]`,
  navToggler: 'nav .navbar-toggler',
  loginButton: '[data-cy="login-button"]', // opens login modal (logged-out)
  signUpButton: '[data-cy="signup-button"]', // opens sign-up modal (logged-out)
  userMenuToggle: '[data-cy="user-menu"]', // visible only when logged in
  logoutLink: '[data-cy="logout"]',
  searchButtonDesktop: 'nav .search-button-desktop',
  langToggle: '[data-cy="lang-selector-toggle"]',
  decksDropdownToggle: '#navbarDropdownDecks',
  toolsDropdownToggle: '#navbarDropdownTools',
  footer: 'app-footer, footer', // # add data-cy="app-footer"

  // ---- Toasts / dialogs ------------------------------------------------
  toastContainer: 'ngb-toast, .toast', // # add data-cy="toast"
  modal: '.modal-content',
  modalClose: '.modal-header .btn-close',
  ngbDropdownMenu: '.dropdown-menu.show',

  // ---- Login / auth modal ---------------------------------------------
  login: {
    username: '[data-cy="login-username"]',
    password: '[data-cy="login-password"]',
    remember: '#loginCheck',
    submit: '[data-cy="login-submit"]',
    gotoSignup: '[data-cy="goto-signup"]',
    gotoForgot: '[data-cy="goto-forgot-password"]',
  },

  // ---- Decks list page (/decks) ---------------------------------------
  decks: {
    container: '#container',
    total: 'header span[innerHTML], header .col-auto span',
    typeSelect: '#deckType', // # add data-cy="deck-type-select"
    orderSelect: '#deckOrder', // # add data-cy="deck-order-select"
    card: 'app-deck-card', // # add data-cy="deck-card"
    // Bound [routerLink] renders as href with no routerLink attribute.
    cardLink: 'app-deck-card a[href^="/deck/"]',
    showMore: 'button:contains("more"), button:contains("más")',
    resetButtonMobile: 'button.btn-danger:contains("Reset"), button.btn-danger',
    filtersToggleMobile: 'button:contains("Filters"), button.btn-secondary',
    backToTop: 'button.back-to-top',
    newDeck: 'a[routerLink="/decks/builder"]',
  },

  // ---- Deck filters sidebar -------------------------------------------
  filters: {
    root: 'app-deck-filters',
    reset: 'app-deck-filters button.btn-danger',
    name: '#deckName',
    author: '#deckAuthor',
    cardText: '#deckCardText',
    limitedFormat: '#deckLimitedFormat',
    tags: '#deckTags',
    favorite: '#favoriteCheck',
    clanFilter: 'app-clan-filter',
    disciplineFilter: 'app-discipline-filter',
  },

  // ---- Deck detail (/deck/:id) ----------------------------------------
  deckDetail: {
    root: 'main[role="main"]',
    title: 'main h3',
    bookmarkToggle: 'main a[placement="top"] i.bi-bookmark-star, main a i[class*="bookmark"]',
    cardImage: 'app-card-image, img.lazyloaded',
  },

  // ---- Search modal ----------------------------------------------------
  search: {
    input: '.modal-content input[type="search"]', // # add data-cy="search-input"
    result: '.search-result-item', // # add data-cy="search-result"
    noResults: '.modal-content h5:contains("result"), .modal-content .text-primary',
  },

  // ---- Card browser (/cards/crypt, /cards/library) --------------------
  cards: {
    cryptFilter: 'app-crypt-builder-filter',
    libraryFilter: 'app-library-builder-filter',
    cardItem: 'app-card, app-crypt-card, app-library-card, .card-image, img',
  },

  // ---- Vtesdle ---------------------------------------------------------
  vtesdle: {
    title: 'h1.title',
    guessInput: '#crypt',
    typeaheadResult: 'ngb-typeahead-window button.dropdown-item',
    winAlert: '.alert-success',
  },

  // ---- Proxy generator -------------------------------------------------
  proxy: {
    root: 'app-print-proxy',
    printButton: 'button:contains("Print"), button:contains("Imprimir")',
  },

  // ---- Contact form ----------------------------------------------------
  contact: {
    name: '#name',
    email: '#emailAddress',
    subject: '#subject',
    message: '#message',
    submit: 'form button[type="submit"]',
  },

  // ---- Statistics ------------------------------------------------------
  statistics: {
    typeSelect: '#typeSelect',
    chart: 'app-line-chart, app-bar-chart, app-radar-chart, canvas',
  },

  // ---- Generic loading -------------------------------------------------
  loading: 'app-loading, .spinner-border, .spinner-grow, ngx-skeleton-loader',
} as const
