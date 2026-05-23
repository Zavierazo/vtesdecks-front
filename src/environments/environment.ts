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
  googleAccounts: {
    clientId:
      '1086100732808-u9so7aubv3s53f3bp8l9d6s9beo05up7.apps.googleusercontent.com',
  },
}
