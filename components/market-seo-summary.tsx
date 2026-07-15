import type { Locale } from "@/lib/locale";
import type { MarketSeoSummary } from "@/lib/market-seo-summary";
import {
  UI_TEXT,
  formatDate,
  formatItemName,
  formatMessage,
  formatNumber,
  formatPercent,
  formatTag
} from "@/lib/market-locale";

type MarketSeoSummaryProps = {
  summary: MarketSeoSummary;
  locale: Locale;
};

export function MarketSeoSummary({ summary, locale }: MarketSeoSummaryProps) {
  const t = UI_TEXT[locale];

  if (!summary.topRoutes.length) {
    return null;
  }

  return (
    <section className="border-t bg-background" aria-labelledby="market-overview-heading">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-8 sm:px-6 lg:px-8">
        <div className="max-w-3xl">
          <p className="text-xs font-medium uppercase tracking-normal text-muted-foreground">
            {summary.league.name} · {formatDate(summary.generatedAt, locale, t)}
          </p>
          <h2 id="market-overview-heading" className="mt-2 text-xl font-semibold tracking-normal">
            {t.marketOverview}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {t.marketOverviewDescription}{" "}
            {formatMessage(t.targetsIndexed, {
              count: formatNumber(summary.targetCount, 0, locale)
            })}
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(260px,0.42fr)]">
          <div>
            <h3 className="text-sm font-medium">{t.topRoutes}</h3>
            <ul className="mt-3 grid gap-2 sm:grid-cols-2">
              {summary.topRoutes.slice(0, 6).map((route) => (
                <li
                  key={`${route.targetName}|${route.buyCurrency}|${route.sellCurrency}`}
                  className="rounded-md border bg-card px-3 py-2 text-sm"
                >
                  <div className="font-medium">
                    {formatItemName({ name: route.targetName }, locale)}
                  </div>
                  <div className="mt-1 text-muted-foreground">
                    {formatMessage(t.routeTo, {
                      buy: route.buyCurrency,
                      sell: route.sellCurrency
                    })}{" "}
                    · {formatPercent(route.roiPercent, locale)}
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-medium">{t.topCategories}</h3>
            <ul className="mt-3 flex flex-wrap gap-2 text-sm text-muted-foreground">
              {summary.topCategories.slice(0, 8).map((category) => (
                <li key={category.name} className="rounded-md border bg-card px-3 py-1.5">
                  {formatTag(category.name, locale)} · {formatNumber(category.targetCount, 0, locale)}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
