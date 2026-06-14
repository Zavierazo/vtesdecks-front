import { defineConfig } from 'cypress'

/**
 * Cypress configuration for the VTESDecks Angular PWA.
 *
 * The whole E2E suite lives under this `e2e/` folder but reuses the root
 * project's dependencies (Cypress is declared in the root package.json).
 *
 * The suite is intentionally *data-agnostic*: it never asserts on specific
 * records, counts, ids or text coming from the backend. Tests discover the data
 * that the API currently returns and validate behaviour relative to that.
 *
 * Environment overrides (set via `CYPRESS_*` env vars or `--env`):
 *   baseUrl   -> the Angular dev server (default http://localhost:4200)
 *   apiUrl    -> the backend API base   (default http://localhost:8080/api/1.0)
 *   username  -> demo account user      (default "demostration")
 *   password  -> demo account password  (default "Hola1234")
 */
export default defineConfig({
  e2e: {
    baseUrl: process.env.CYPRESS_BASE_URL ?? 'http://localhost:4200',
    // Paths are resolved relative to this config file (the e2e/ folder).
    specPattern: 'cypress/e2e/**/*.cy.ts',
    supportFile: 'cypress/support/e2e.ts',
    fixturesFolder: 'cypress/fixtures',
    viewportWidth: 1280,
    viewportHeight: 800,
    // The backend retries/queues are slow on cold start; give actions room.
    defaultCommandTimeout: 12000,
    requestTimeout: 15000,
    responseTimeout: 30000,
    // Datasets change between runs; retries absorb transient flakiness only.
    retries: {
      runMode: 2,
      openMode: 0,
    },
    video: false,
    screenshotOnRunFailure: true,
    experimentalRunAllSpecs: true,
    env: {
      apiUrl: process.env.CYPRESS_API_URL ?? 'http://localhost:8080/api/1.0',
      username: process.env.CYPRESS_USERNAME ?? 'demostration',
      password: process.env.CYPRESS_PASSWORD ?? 'Hola1234',
    },
    setupNodeEvents(on, _config) {
      // Lightweight task logger so specs can report skipped workflows to the
      // terminal without polluting the spec output with console noise.
      on('task', {
        log(message: string) {
          // eslint-disable-next-line no-console
          console.log(message)
          return null
        },
      })
    },
  },
})
