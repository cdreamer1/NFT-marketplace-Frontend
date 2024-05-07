const buildSuffix = (url?: {query?: Record<string, string>, hash?: string}) => {
  const query = url?.query;
  const hash = url?.hash;
  if (!query && !hash) return '';
  const search = query ? `?${new URLSearchParams(query)}` : '';
  return `${search}${hash ? `#${hash}` : ''}`;
};

export const pagesPath = {
  "collection_details": {
    $url: (url?: { hash?: string | undefined } | undefined) => ({ pathname: '/collection_details' as const, hash: url?.hash })
  },
  "collections": {
    $url: (url?: { hash?: string | undefined } | undefined) => ({ pathname: '/collections' as const, hash: url?.hash })
  },
  "create": {
    "collection": {
      $url: (url?: { hash?: string | undefined } | undefined) => ({ pathname: '/create/collection' as const, hash: url?.hash })
    }
  },
  "launchpad": {
    $url: (url?: { hash?: string | undefined } | undefined) => ({ pathname: '/launchpad' as const, hash: url?.hash })
  },
  "marketplace": {
    $url: (url?: { hash?: string | undefined } | undefined) => ({ pathname: '/marketplace' as const, hash: url?.hash })
  },
  "nft_details": {
    $url: (url?: { hash?: string | undefined } | undefined) => ({ pathname: '/nft_details' as const, hash: url?.hash })
  },
  "profile": {
    $url: (url?: { hash?: string | undefined } | undefined) => ({ pathname: '/profile' as const, hash: url?.hash })
  },
  "stats": {
    "activity": {
      $url: (url?: { hash?: string | undefined } | undefined) => ({ pathname: '/stats/activity' as const, hash: url?.hash })
    }
  },
  $url: (url?: { hash?: string | undefined } | undefined) => ({ pathname: '/' as const, hash: url?.hash })
};

export type PagesPath = typeof pagesPath;

export const staticPath = {
  collection1_jpg: '/collection1.jpg',
  eth_icon_svg: '/eth_icon.svg',
  polygon_icon_svg: '/polygon_icon.svg',
  usdt_icon_svg: '/usdt_icon.svg',
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
  walletconnect_png: '/walletconnect.png'
} as const;

export type StaticPath = typeof staticPath;
