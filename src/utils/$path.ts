export const pagesPath = {
  "collection": {
    $url: (url?: { hash?: string | undefined } | undefined) => ({ pathname: '/collection' as const, hash: url?.hash })
  },
  "collections": {
    $url: (url?: { hash?: string | undefined } | undefined) => ({ pathname: '/collections' as const, hash: url?.hash })
  },
  "create": {
    "collection": {
      $url: (url?: { hash?: string | undefined } | undefined) => ({ pathname: '/create/collection' as const, hash: url?.hash })
    },
    "nft": {
      $url: (url?: { hash?: string | undefined } | undefined) => ({ pathname: '/create/nft' as const, hash: url?.hash })
    }
  },
  "launchpad": {
    "collection": {
      $url: (url?: { hash?: string | undefined } | undefined) => ({ pathname: '/launchpad/collection' as const, hash: url?.hash })
    },
    $url: (url?: { hash?: string | undefined } | undefined) => ({ pathname: '/launchpad' as const, hash: url?.hash })
  },
  "marketplace": {
    $url: (url?: { hash?: string | undefined } | undefined) => ({ pathname: '/marketplace' as const, hash: url?.hash })
  },
  "nft": {
    $url: (url?: { hash?: string | undefined } | undefined) => ({ pathname: '/nft' as const, hash: url?.hash })
  },
  "profile": {
    $url: (url?: { hash?: string | undefined } | undefined) => ({ pathname: '/profile' as const, hash: url?.hash })
  },
  "stats": {
    "activity": {
      $url: (url?: { hash?: string | undefined } | undefined) => ({ pathname: '/stats/activity' as const, hash: url?.hash })
    },
    "ranking": {
      $url: (url?: { hash?: string | undefined } | undefined) => ({ pathname: '/stats/ranking' as const, hash: url?.hash })
    }
  },
  $url: (url?: { hash?: string | undefined } | undefined) => ({ pathname: '/' as const, hash: url?.hash })
};

export type PagesPath = typeof pagesPath;

export const staticPath = {
  android_chrome_192x192_png: '/android-chrome-192x192.png',
  android_chrome_512x512_png: '/android-chrome-512x512.png',
  apple_touch_icon_png: '/apple-touch-icon.png',
  collection1_jpg: '/collection1.jpg',
  eth_icon_svg: '/eth_icon.svg',
  favicon_16x16_png: '/favicon-16x16.png',
  favicon_32x32_png: '/favicon-32x32.png',
  favicon_ico: '/favicon.ico',
  flag_en_svg: '/flag_en.svg',
  locales: {
    cn: {
      common_json: '/locales/cn/common.json'
    },
    en: {
      common_json: '/locales/en/common.json'
    },
    ja: {
      common_json: '/locales/ja/common.json'
    }
  },
  logo_png: '/logo.png',
  logo_simple_png: '/logo_simple.png',
  metacinderalla_jpg: '/metacinderalla.jpg',
  metamask_png: '/metamask.png',
  paymentcards_png: '/paymentcards.png',
  polygon_icon_svg: '/polygon_icon.svg',
  site_webmanifest: '/site.webmanifest',
  usdt_icon_svg: '/usdt_icon.svg',
  walletconnect_png: '/walletconnect.png'
} as const;

export type StaticPath = typeof staticPath;
