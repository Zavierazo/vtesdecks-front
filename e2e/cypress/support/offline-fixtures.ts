const common = {
  sets: ['Jyhad:C'],
  image: '/img/cards/test.jpg',
  text: 'Offline card text.',
  artist: 'Test Artist',
  disciplines: [],
  disciplineIcons: [],
  taints: [],
  lastUpdate: '2026-09-16',
  cardPopularity: 1,
  deckPopularity: 1,
  limitedFormats: [],
}
export const crypt = {
  ...common,
  id: 200001,
  name: 'Offline Vampire',
  type: 'Vampire',
  clan: 'Brujah',
  clanIcon: 'brujah',
  adv: false,
  group: 1,
  capacity: 5,
  votes: 0,
  superiorDisciplines: [],
  sect: 'Camarilla',
}
export const library = {
  ...common,
  id: 100001,
  image: '/img/cards/library-test.jpg',
  name: 'Offline Library',
  type: 'Master',
  typeIcons: ['master'],
  clans: [],
  clanIcons: [],
  sects: [],
  titles: [],
  bloodCost: 0,
  poolCost: 0,
  convictionCost: 0,
}

export const user = {
  user: 'offline-test',
  displayName: 'Offline Test',
  email: 'test@example.invalid',
  roles: [],
  token:
    btoa(JSON.stringify({ alg: 'none' })) +
    '.' +
    btoa(JSON.stringify({ exp: 4102444800 })) +
    '.fake',
}
export function mockCatalogs(delay = 0) {
  cy.intercept('**/api/1.0/**', (req) => {
    const path = new URL(req.url).pathname
    let body: unknown = []
    let delayMs = 0
    if (path.endsWith('/lastUpdate')) {
      body = { lastUpdate: '2026-09-16' }
    } else if (path.endsWith('/cards/crypt')) {
      body = [crypt]
      delayMs = delay
    } else if (path.endsWith('/cards/library')) {
      body = [library]
      delayMs = delay
    } else if (path.endsWith('/sets')) {
      body = [
        {
          id: 1,
          abbrev: 'Jyhad',
          fullName: 'Jyhad',
          releaseDate: '1994-08-01',
          lastUpdate: '2026-09-16',
        },
      ]
    } else if (
      path.includes('/auth/refresh') ||
      path.endsWith('/user/refresh')
    ) {
      body = user
    } else if (path.endsWith('/info')) {
      body = { shopList: [], preconstructedDecks: [], hasMoreShops: false }
    }
    req.reply({ body, delay: delayMs })
  })
}
export function authenticate(win: Window) {
  win.localStorage.setItem('auth', JSON.stringify(user))
  win.localStorage.setItem('translocoLang', 'en')
}
