export const environment = {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  appVersion: require('../../package.json').version,
  domain: 'localhost',
  apiDomain: 'localhost:8080',
  cdnDomain: 'https://cdn.vtesdecks.com',
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
  googleAdSense: {
    clientId: 'ca-pub-7379021241824282',
  },
}
