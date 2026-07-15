import type { Metadata } from "next";
import type { Locale } from "@/lib/locale";
import { LOCALE_ROUTES, SUPPORTED_LOCALES } from "@/lib/locale";

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://poe2marketdesk.com";
export const REPOSITORY_URL = "https://github.com/Ifan24/poe2-market-arbitrage-desk";
export const SITE_NAME = "POE2 Market Arbitrage Desk";
export const SITE_DESCRIPTION =
  "Compare Path of Exile 2 currency routes, integer trade lots, ROI, stock, and gold-cost efficiency in a fast market arbitrage dashboard.";
export const SITE_NAME_ZH_TW = "POE2 市場套利工作台";
export const SITE_DESCRIPTION_ZH_TW =
  "快速比較 Path of Exile 2 通貨路線、整數批量、ROI、庫存與金幣效率的市場套利工具。";
export const SITE_NAME_JA = "POE2 マーケット裁定デスク";
export const SITE_DESCRIPTION_JA =
  "Path of Exile 2 の通貨ルート、整数取引ロット、ROI、在庫、ゴールド効率をすばやく比較するマーケット裁定ダッシュボード。";
export const SITE_NAME_KO = "POE2 시장 차익거래 데스크";
export const SITE_DESCRIPTION_KO =
  "Path of Exile 2 화폐 경로, 정수 거래 묶음, ROI, 재고, 골드 효율을 빠르게 비교하는 시장 차익거래 대시보드입니다.";
export const SITE_NAME_RU = "Панель рыночного арбитража POE2";
export const SITE_DESCRIPTION_RU =
  "Сравнивайте валютные маршруты Path of Exile 2, лоты сделок, ROI, запасы и эффективность золота на панели арбитража.";
export const SITE_NAME_ZH_CN = "POE2 市场套利工作台";
export const SITE_DESCRIPTION_ZH_CN =
  "快速比较 Path of Exile 2 通货路线、整数批量、ROI、库存与金币效率的市场套利工具。";
export const SITE_NAME_PT = "Painel de Arbitragem de Mercado POE2";
export const SITE_DESCRIPTION_PT =
  "Compare rotas de moedas, lotes de negociação, ROI, estoque e eficiência de oro de Path of Exile 2 em um painel rápido.";
export const SITE_NAME_TH = "แผงควบคุมการเก็งกำไรในตลาด POE2";
export const SITE_DESCRIPTION_TH =
  "เปรียบเทียบเส้นทางเงินตราของ Path of Exile 2, ล็อตการซื้อขายในจำนวนเต็ม, ROI, คลังสินค้า และประสิทธิภาพค่าทองคำในแดชบอร์ดที่รวดเร็ว";
export const SITE_NAME_FR = "Tableau d'arbitrage de marché POE2";
export const SITE_DESCRIPTION_FR =
  "Comparez les routes de devises, les lots de transaction, le ROI, le stock et l'efficacité de l'or de Path of Exile 2.";
export const SITE_NAME_DE = "POE2-Marktarbitrage-Dashboard";
export const SITE_DESCRIPTION_DE =
  "Vergleichen Sie Währungsrouten, Handelslots, ROI, Lagerbestand und Goldeffizienz für Path of Exile 2.";
export const SITE_NAME_ES = "Panel de Arbitraje de Mercado POE2";
export const SITE_DESCRIPTION_ES =
  "Compare rutas de monedas, lotes comerciales, ROI, stock y eficiencia de oro de Path of Exile 2.";

export const SITE_KEYWORDS = [
  "Path of Exile 2",
  "POE2",
  "currency exchange",
  "arbitrage",
  "trade calculator",
  "Path of Exile 2 market",
  "POE2 currency calculator",
  "POE2 market prices"
];

export function getSiteUrl(path = "/") {
  return new URL(path, SITE_URL).toString();
}

export function getLocalizedSiteMetadata(locale: Locale) {
  return {
    ...PAGE_COPY.home[locale],
    path: LOCALE_ROUTES[locale].path
  };
}

export function getLanguageAlternates(formatPath: (localeRoute: (typeof LOCALE_ROUTES)[Locale]) => string = (localeRoute) => localeRoute.path) {
  const alternates: Record<string, string> = {};
  for (const locale of SUPPORTED_LOCALES) {
    alternates[LOCALE_ROUTES[locale].hreflang] = formatPath(LOCALE_ROUTES[locale]);
  }
  alternates["x-default"] = formatPath(LOCALE_ROUTES.en);
  return alternates;
}

export function getOpenGraphLocale(locale: Locale) {
  return LOCALE_ROUTES[locale].openGraphLocale;
}

export function getOpenGraphAlternateLocales(locale: Locale) {
  return SUPPORTED_LOCALES
    .filter((alternate) => alternate !== locale)
    .map(getOpenGraphLocale);
}

const PAGE_COPY = {
  home: {
    en: {
      title: SITE_NAME,
      description: SITE_DESCRIPTION
    },
    "zh-TW": {
      title: SITE_NAME_ZH_TW,
      description: SITE_DESCRIPTION_ZH_TW
    },
    ja: {
      title: SITE_NAME_JA,
      description: SITE_DESCRIPTION_JA
    },
    ko: {
      title: SITE_NAME_KO,
      description: SITE_DESCRIPTION_KO
    },
    ru: {
      title: SITE_NAME_RU,
      description: SITE_DESCRIPTION_RU
    },
    "zh-CN": {
      title: SITE_NAME_ZH_CN,
      description: SITE_DESCRIPTION_ZH_CN
    },
    pt: {
      title: SITE_NAME_PT,
      description: SITE_DESCRIPTION_PT
    },
    th: {
      title: SITE_NAME_TH,
      description: SITE_DESCRIPTION_TH
    },
    fr: {
      title: SITE_NAME_FR,
      description: SITE_DESCRIPTION_FR
    },
    de: {
      title: SITE_NAME_DE,
      description: SITE_DESCRIPTION_DE
    },
    es: {
      title: SITE_NAME_ES,
      description: SITE_DESCRIPTION_ES
    }
  },
  trends: {
    en: {
      title: "Market Trends",
      description: "Rank current Path of Exile 2 market routes by recent profit persistence."
    },
    "zh-TW": {
      title: "市場趨勢",
      description: "依近期獲利穩定度排序 Path of Exile 2 目前市場路線。"
    },
    ja: {
      title: "マーケットトレンド",
      description: "Path of Exile 2 の現在のマーケットルートを、直近の利益持続性で順位付けします。"
    },
    ko: {
      title: "시장 추세",
      description: "Path of Exile 2 현재 시장 경로를 최근 수익 지속성 기준으로 순위화합니다."
    },
    ru: {
      title: "Рыночные тенденции",
      description: "Ранжируйте текущие рыночные маршруты Path of Exile 2 по стабильности прибыли."
    },
    "zh-CN": {
      title: "市场趋势",
      description: "依近期获利稳定度排序 Path of Exile 2 目前市场路线。"
    },
    pt: {
      title: "Tendências do Mercado",
      description: "Ranqueie as rotas de mercado atuais de Path of Exile 2 por persistência de lucro recente."
    },
    th: {
      title: "แนวโน้มตลาด",
      description: "จัดอันดับเส้นทางตลาดของ Path of Exile 2 ในปัจจุบันตามความต่อเนื่องของผลกำไรล่าสุด"
    },
    fr: {
      title: "Tendances du Marché",
      description: "Classez les routes de marché actuelles de Path of Exile 2 selon la persistance des bénéfices récents."
    },
    de: {
      title: "Markttrends",
      description: "Richten Sie die aktuellen Marktrouten von Path of Exile 2 nach der jüngsten Gewinnpersistenz aus."
    },
    es: {
      title: "Tendencias del Mercado",
      description: "Clasifique las rutas de mercado actuales de Path of Exile 2 según la persistencia de las ganancias recientes."
    }
  }
} satisfies Record<"home" | "trends", Record<Locale, { title: string; description: string }>>;

export function getLocalizedPageMetadata(locale: Locale, page: keyof typeof PAGE_COPY) {
  const path = page === "home" ? LOCALE_ROUTES[locale].path : `${LOCALE_ROUTES[locale].path}/${page}`;

  return {
    ...PAGE_COPY[page][locale],
    path,
    openGraphUrl: page === "home" ? path : getSiteUrl(path),
    alternates: getLanguageAlternates((localeRoute) => (page === "home" ? localeRoute.path : `${localeRoute.path}/${page}`)),
    openGraphLocale: getOpenGraphLocale(locale),
    openGraphAlternateLocales: getOpenGraphAlternateLocales(locale)
  };
}

export const ROOT_METADATA: Metadata = {
  metadataBase: new URL(SITE_URL),
  applicationName: SITE_NAME,
  title: {
    default: SITE_NAME,
    template: `%s · ${SITE_NAME}`
  },
  description: SITE_DESCRIPTION,
  keywords: SITE_KEYWORDS,
  authors: [{ name: SITE_NAME }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  alternates: {
    canonical: "/en",
    languages: getLanguageAlternates()
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1
    }
  },
  openGraph: {
    type: "website",
    url: "/",
    siteName: SITE_NAME,
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "POE2 Market Arbitrage Desk route dashboard"
      }
    ]
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    images: ["/og-image.png"]
  },
  icons: {
    icon: [
      { url: "/favicon.png", sizes: "192x192", type: "image/png" },
      { url: "/icon.svg", type: "image/svg+xml" }
    ],
    shortcut: "/favicon.png",
    apple: "/apple-icon.png"
  }
};
