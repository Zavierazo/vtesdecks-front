export const environment = {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  appVersion: require('../../package.json').version,
  domain: 'vtesdecks.com',
  apiDomain: 'api.vtesdecks.com',
  cdnDomain: 'https://cdn.vtesdecks.com',
  i18nCdnDomain: 'https://i18n-cdn.vtesdecks.com',
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
  googleAccounts: {
    clientId:
      '1086100732808-98o4m7f2dp9pjcsh3c3sosgrj97pa71n.apps.googleusercontent.com',
  },
}
