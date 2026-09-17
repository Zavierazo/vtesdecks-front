import { createServer } from 'node:http'
import { readFile, mkdtemp, writeFile } from 'node:fs/promises'
import { join, extname, resolve } from 'node:path'
import { tmpdir } from 'node:os'
import { spawn } from 'node:child_process'
import assert from 'node:assert/strict'

// Run after npm run build. Uses an isolated Chrome profile and deterministic API/CDN fixtures.
const root = resolve('dist/vtesDecksFront')
const profile = await mkdtemp(join(tmpdir(), 'vtes-catalog-smoke-'))
const mime = {
  '.js': 'text/javascript',
  '.html': 'text/html',
  '.json': 'application/json',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.jpg': 'image/jpeg',
  '.png': 'image/png',
  '.woff2': 'font/woff2',
}
const server = createServer(async (req, res) => {
  const path = resolve(
    root,
    '.' + new URL(req.url, 'http://localhost').pathname,
  )
  if (!path.startsWith(root)) {
    res.writeHead(403).end()
    return
  }
  try {
    const body = await readFile(path)
    res
      .writeHead(200, {
        'Content-Type': mime[extname(path)] || 'application/octet-stream',
        'Cache-Control': 'no-cache',
      })
      .end(body)
  } catch {
    res
      .writeHead(200, {
        'Content-Type': 'text/html',
        'Cache-Control': 'no-cache',
      })
      .end(await readFile(join(root, 'index.html')))
  }
})
await new Promise((done) => server.listen(0, '127.0.0.1', done))
const origin = `http://127.0.0.1:${server.address().port}`
const chrome = spawn(
  process.env.CHROME_PATH ||
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
  [
    '--headless=new',
    '--no-first-run',
    '--no-default-browser-check',
    '--remote-debugging-port=0',
    `--user-data-dir=${profile}`,
    '--window-size=1440,1100',
    'about:blank',
  ],
  { windowsHide: true, stdio: 'ignore' },
)
let socket
const sleep = (ms) => new Promise((done) => setTimeout(done, ms))
async function until(fn, label, timeout = 45000) {
  const start = Date.now()
  while (Date.now() - start < timeout) {
    try {
      const result = await Promise.race([fn(), sleep(1500).then(() => false)])
      if (result) {
        return result
      }
    } catch {
      /* Wait for navigation or startup. */
    }
    await sleep(150)
  }
  console.error('Profile', profile)
  throw new Error(`Timed out: ${label}`)
}
try {
  const info = await until(
    async () =>
      (await readFile(join(profile, 'DevToolsActivePort'), 'utf8')).split('\n'),
    'Chrome startup',
  )
  socket = new WebSocket(`ws://127.0.0.1:${info[0]}${info[1]}`)
  await new Promise((done) =>
    socket.addEventListener('open', done, { once: true }),
  )
  let sequence = 0
  const pending = new Map()
  const listeners = []
  socket.addEventListener('message', (event) => {
    const message = JSON.parse(event.data)
    if (message.id) {
      const task = pending.get(message.id)
      pending.delete(message.id)
      if (message.error) {
        task.reject(new Error(JSON.stringify(message.error)))
      } else {
        task.resolve(message.result)
      }
    } else {
      for (const listener of listeners) {
        listener(message)
      }
    }
  })
  function send(method, params = {}, sessionId) {
    return new Promise((resolve, reject) => {
      const id = ++sequence
      pending.set(id, { resolve, reject })
      socket.send(JSON.stringify({ id, method, params, sessionId }))
    })
  }
  const { targetId } = await send('Target.createTarget', { url: 'about:blank' })
  const { sessionId } = await send('Target.attachToTarget', {
    targetId,
    flatten: true,
  })
  const command = (method, params) => send(method, params, sessionId)
  const evaluate = async (expression) => {
    const result = await command('Runtime.evaluate', {
      expression,
      awaitPromise: true,
      returnByValue: true,
    })
    if (result.exceptionDetails) {
      throw new Error(JSON.stringify(result.exceptionDetails))
    }
    return result.result.value
  }
  const errors = []
  let offline = false
  let revision = 1
  let imageRequests = 0
  const token = `eyJhbGciOiJub25lIn0.${Buffer.from(JSON.stringify({ exp: 4102444800 })).toString('base64url')}.fake`
  const user = {
    user: 'offline-test',
    displayName: 'Offline Test',
    email: 'test@example.invalid',
    token,
    roles: [],
    cardsDisplayMode: 'grid',
  }
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
  const crypt = {
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
  const library = {
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
  const jpeg = await readFile('src/assets/img/cardbackcrypt.jpg')
  listeners.push((message) => {
    if (
      message.method === 'Runtime.consoleAPICalled' &&
      ['trace', 'error', 'warn'].includes(message.params.type)
    ) {
      console.log(
        'Console',
        message.params.type,
        message.params.args.map((a) => a.description || a.value),
      )
    }
    if (message.method === 'Runtime.exceptionThrown') {
      errors.push(message.params.exceptionDetails)
      console.error('Runtime', JSON.stringify(message.params.exceptionDetails))
    }
    if (message.method !== 'Fetch.requestPaused') {
      return
    }
    void (async () => {
      const { requestId, request } = message.params
      const url = new URL(request.url)
      if (url.origin === origin) {
        await command('Fetch.continueRequest', { requestId })
        return
      }
      if (offline) {
        await command('Fetch.failRequest', {
          requestId,
          errorReason: 'InternetDisconnected',
        })
        return
      }
      let body = []
      let type = 'application/json'
      if (url.hostname === 'api.vtesdecks.com') {
        if (url.pathname.endsWith('/lastUpdate')) {
          body = { lastUpdate: `2026-09-${15 + revision}` }
        } else if (url.pathname.endsWith('/cards/crypt')) {
          body = [
            { ...crypt, name: revision === 1 ? crypt.name : 'Updated Vampire' },
          ]
        } else if (url.pathname.endsWith('/cards/library')) {
          body = [library]
        } else if (url.pathname.endsWith('/sets')) {
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
          url.pathname.includes('/auth/refresh') ||
          url.pathname.endsWith('/user/refresh')
        ) {
          body = user
        } else if (url.pathname.endsWith('/info')) {
          body = { shopList: [], preconstructedDecks: [], hasMoreShops: false }
        } else if (url.pathname.includes('country')) {
          body = { countryCode: 'ES' }
        }
      } else if (
        url.hostname === 'cdn.vtesdecks.com' &&
        url.pathname.includes('/img/cards/')
      ) {
        imageRequests++
        type = 'image/jpeg'
        body = jpeg
      } else {
        await command('Fetch.failRequest', {
          requestId,
          errorReason: 'Aborted',
        })
        return
      }
      await command('Fetch.fulfillRequest', {
        requestId,
        responseCode: 200,
        responseHeaders: [
          { name: 'Content-Type', value: type },
          { name: 'Access-Control-Allow-Origin', value: '*' },
          {
            name: 'Access-Control-Allow-Headers',
            value:
              'authorization,cache-control,pragma,expires,sentry-trace,baggage,content-type',
          },
          { name: 'Access-Control-Allow-Methods', value: 'GET,POST,OPTIONS' },
          { name: 'Cache-Control', value: 'no-cache' },
        ],
        body: (Buffer.isBuffer(body)
          ? body
          : Buffer.from(JSON.stringify(body))
        ).toString('base64'),
      })
    })().catch((error) => errors.push(String(error)))
  })
  await command('Runtime.enable')
  await command('Network.enable')
  await command('Network.setBypassServiceWorker', { bypass: true })
  await command('Page.enable')
  await command('Fetch.enable', { patterns: [{ urlPattern: '*' }] })
  await command('Page.addScriptToEvaluateOnNewDocument', {
    source: `if (location.origin === ${JSON.stringify(origin)}) { localStorage.setItem('auth', ${JSON.stringify(JSON.stringify(user))}); localStorage.setItem('translocoLang', 'en'); }`,
  })
  await command('Page.navigate', { url: `${origin}/user/settings` })
  await until(
    () => evaluate(`!!document.querySelector('#offline app-offline')`),
    'offline settings section',
  )
  assert.deepEqual(await evaluate(`Array.from(document.querySelectorAll('app-user-settings form button[type="submit"]')).map(button => button.textContent.trim())`), ['Save profile', 'Change password'])
  assert.equal(await evaluate(`document.querySelector('app-user-settings form button[type="submit"]').disabled`), true)
  assert.equal(await evaluate(`document.querySelector('#offline').closest('form') === null`), true)
  assert.equal(
    await evaluate(
      `document.querySelector('app-shell > div > .d-flex a[routerlink="/offline"]') !== null`,
    ),
    false,
  )
  assert.equal(
    await evaluate(
      `document.querySelector('#offline').textContent.includes('\uFFFD')`,
    ),
    false,
  )
  assert.equal(await evaluate(`!!document.querySelector('#offline a[href="/cards/crypt"], #offline a[href="/cards/library"]')`), false)
  assert.equal(await evaluate(`!!document.querySelector('#offline button.btn-outline-primary') && !!document.querySelector('#offline button.btn-outline-danger') && !document.querySelector('#offline details')`), true)
  assert.equal(await evaluate(`document.querySelector('app-connectivity-banner .is-visible') === null`), true)
  await command('Network.setBypassServiceWorker', { bypass: true })
  assert.equal(
    await evaluate(
      `document.querySelector('#offline').textContent.includes('Download / update catalogs')`,
    ),
    false,
  )
  await until(
    () =>
      evaluate(
        `indexedDB.databases().then(databases => databases.some(db => db.name === 'vtesdecks' && db.version === 2))`,
      ),
    'database created',
  )
  await until(
    () =>
      evaluate(
        `new Promise((resolve, reject) => { const request = indexedDB.open('vtesdecks', 2); request.onerror = () => reject(request.error); request.onsuccess = () => { const db = request.result; try { const r = db.transaction('crypt').objectStore('crypt').count(); r.onsuccess = () => resolve(r.result > 0); r.onerror = () => reject(r.error) } finally { db.close() } } })`,
      ),
    'persisted catalog',
  )
  await command('Network.setBypassServiceWorker', { bypass: true })
  await evaluate(
    `[...document.querySelectorAll('#offline button')].find(button => button.textContent.includes('Download all images')).click()`,
  )
  await until(
    () =>
      evaluate(
        `document.querySelector('#offline').textContent.includes('2 images saved')`,
      ),
    'image download',
  )
  await until(
    () =>
      evaluate(
        `navigator.serviceWorker.getRegistration().then(r => !!r?.active)`,
      ),
    'service worker activation',
  )
  await writeFile(
    join(profile, 'settings.png'),
    Buffer.from(
      (
        await command('Page.captureScreenshot', {
          format: 'png',
          captureBeyondViewport: true,
        })
      ).data,
      'base64',
    ),
  )
  await command('Network.setBypassServiceWorker', { bypass: false })
  offline = true
  await command('Network.emulateNetworkConditions', {
    offline: true,
    latency: 0,
    downloadThroughput: 0,
    uploadThroughput: 0,
  })
  for (const [route, name] of [
    ['crypt', 'Offline Vampire'],
    ['library', 'Offline Library'],
  ]) {
    await command('Page.navigate', { url: `${origin}/cards/${route}` })
    await until(
      () =>
        evaluate(
          `document.querySelector('app-${route}-section') && [...document.images].some(image => image.alt === ${JSON.stringify(name)} && image.src.startsWith('blob:') && image.naturalWidth > 0)`,
        ),
      `cold offline ${route} and cached image`,
    )
    assert.equal(await evaluate(`!!document.querySelector('app-connectivity-banner .is-visible:not(.is-online)')`), true)
    await command('Page.navigate', {
      url: `${origin}/cards/${route}?cardId=${route === 'crypt' ? 200001 : 100001}`,
    })
    await until(
      () =>
        evaluate(
          `!!document.querySelector('ngb-modal-window app-card-info') && document.querySelector('ngb-modal-window').textContent.includes('Offline card text.')`,
        ),
      `offline ${route} detail`,
    )
    await until(() => evaluate(`!!document.querySelector('ngb-modal-window img[src^="blob:"]')`), 'detail image ready')
    assert.equal(await evaluate(`!!document.querySelector('ngb-modal-window [routerlink="/decks"]')`), false)
    assert.equal(await evaluate(`document.querySelector('ngb-modal-window app-card-info').textContent.includes('Offline card text.')`), false)
    await until(() => evaluate(`getComputedStyle(document.querySelector('ngb-modal-window .card-text-overlay')).visibility === 'hidden'`), 'cached image hides automatic overlay')
  }
  await evaluate(`caches.delete('vtesdecks-card-images-v1')`)
  for (const route of ['crypt', 'library']) {
    await command('Page.navigate', { url: `${origin}/cards/${route}?cardId=${route === 'crypt' ? 200001 : 100001}` })
    await until(() => evaluate(`!!document.querySelector('ngb-modal-window .card-text-unavailable') && getComputedStyle(document.querySelector('ngb-modal-window .card-text-overlay')).visibility === 'visible'`), `missing ${route} image shows text overlay`)
  }
  await command('Page.navigate', {
    url: `${origin}/cards/crypt?shops=DTC&predefinedLimitedFormat=42`,
  })
  await until(
    () =>
      evaluate(
        `[...document.images].some(image => image.alt === 'Offline Vampire') && !!document.querySelector('app-crypt-builder-filter')`,
      ),
    'offline results ignore hidden remote filters',
  )
  assert.ok((await evaluate('location.search')).includes('shops='))
  assert.equal(
    await evaluate(
      `!!document.querySelector('#shopAvailability, #limitedFormatSelect')`,
    ),
    false,
  )
  assert.equal(
    await evaluate(
      `document.querySelector('app-filter-chips').textContent.includes('DriveThruCards')`,
    ),
    false,
  )
  assert.equal(
    await evaluate(
      `document.body.textContent.includes('These shop filters need')`,
    ),
    false,
  )
  await command('Page.navigate', { url: `${origin}/cards/crypt` })
  await until(
    () => evaluate(`!!document.querySelector('app-crypt-section')`),
    'crypt ready',
  )
  const before = imageRequests
  revision = 2
  offline = false
  await command('Network.setBypassServiceWorker', { bypass: true })
  await command('Network.emulateNetworkConditions', {
    offline: false,
    latency: 0,
    downloadThroughput: -1,
    uploadThroughput: -1,
  })
  await evaluate(`window.dispatchEvent(new Event('online'))`)
  await until(() => evaluate(`!!document.querySelector('app-connectivity-banner .is-visible.is-online')`), 'reconnection confirmation')
  await until(
    () =>
      evaluate(
        `[...document.images].some(image => image.alt === 'Updated Vampire')`,
      ),
    'catalog revalidation after reconnect',
  )
  await until(() => imageRequests > before, 'visible image revalidation')
  await until(() => evaluate(`!document.querySelector('app-connectivity-banner .is-visible')`), 'reconnection banner disappears')
  await command('Page.navigate', { url: `${origin}/cards/library?cardId=100001` })
  await until(() => evaluate(`!!document.querySelector('ngb-modal-window app-card-info')`), 'online card detail')
  assert.equal(await evaluate(`document.querySelector('ngb-modal-window').textContent.includes('require a connection')`), false)
  assert.equal(await evaluate(`document.body.textContent.includes('Image not downloaded')`), false)
  assert.deepEqual(errors, [], 'browser runtime exceptions')
  console.log(
    `PASS: settings integration, UTF-8, cached images, service worker cold offline routes/details, filter preservation and reconnect refresh. Screenshots: ${join(profile, 'settings.png')}`,
  )
} finally {
  socket?.close()
  chrome.kill()
  server.close()
}
