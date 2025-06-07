export const environment = {
  appVersion: require('../../package.json').version,
  domain: 'vtesdecks.com',
  apiDomain: 'api.vtesdecks.com',
  production: true,
  api: {
    baseUrl: 'https://api.vtesdecks.com/1.0',
  },
  recaptcha: {
    siteKey: '6Lfd9cAZAAAAAENUCZQzjo46pSVAobIuktoTzbDq',
  },
  googleAnalytics: {
    trackingId: 'G-87D9C3V6CL',
  },
  googleAdSense: {
    clientId: 'ca-pub-7379021241824282',
  },
}
