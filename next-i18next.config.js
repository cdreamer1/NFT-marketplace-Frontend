/** @type {import('next-i18next').UserConfig} */
module.exports = {
  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'ja', 'cn'],
    localePath: './public/locales',
  },
  localePath:
    typeof window === 'undefined'
      ? require('path').resolve('./locales')
      : '/public/locales',
  react: { useSuspense: false },
};