export const environment = {
  appVersion: require('../../package.json').version + '-dev',
  domain: 'localhost',
  apiDomain: 'api.vtesdecks.com',
  production: false,
  api: {
    baseUrl: 'https://api.vtesdecks.com/1.0',
  },
  recaptcha: {
    siteKey: '6Lfd9cAZAAAAAENUCZQzjo46pSVAobIuktoTzbDq',
  },
  googleAnalytics: {
    trackingId: 'G-0WW72ST9EZ',
  },
};
