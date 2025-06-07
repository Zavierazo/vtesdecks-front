export const environment = {
  appVersion: require('../../package.json').version,
  domain: 'localhost',
  apiDomain: 'localhost:8080',
  production: false,
  api: {
    baseUrl: 'http://localhost:8080/api/1.0',
  },
  recaptcha: {
    siteKey: '6Lfd9cAZAAAAAENUCZQzjo46pSVAobIuktoTzbDq',
  },
  googleAnalytics: {
    trackingId: 'G-0WW72ST9EZ',
  },
}
