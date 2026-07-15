import { GemIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  getCategoryIconSrc,
  getCurrencyIconSrc,
  getCurrencyInitials,
  getCurrencyKind,
  getItemIconSrc
} from "@/lib/market-display-policy";
import type { MarketItem } from "@/lib/market-data";
import type { Locale } from "@/lib/locale";
import { formatItemName, formatTag } from "@/lib/market-locale";
import { cn } from "@/lib/utils";

export function CurrencyMark({ name, className }: { name: string; className?: string }) {
  const iconSrc = getCurrencyIconSrc(name);

  return (
    <span
      aria-hidden="true"
      className={cn("currency-mark", className)}
      data-currency={getCurrencyKind(name)}
    >
      {iconSrc ? <img src={iconSrc} alt="" loading="lazy" /> : getCurrencyInitials(name)}
    </span>
  );
}

export function CurrencyName({
  name,
  locale,
  compact = false
}: {
  name: string;
  locale: Locale;
  compact?: boolean;
}) {
  return (
    <span className="inline-flex min-w-0 items-center gap-2">
      <CurrencyMark name={name} className={compact ? "size-7 text-[0.62rem]" : undefined} />
      <span className="truncate">{formatItemName({ name }, locale)}</span>
    </span>
  );
}

export function ItemIcon({ item, className }: { item: Pick<MarketItem, "iconUrl" | "name">; className?: string }) {
  const iconSrc = getItemIconSrc(item);

  return (
    <span
      aria-hidden="true"
      className={cn(
        "grid size-8 shrink-0 place-items-center overflow-hidden rounded-md border bg-muted/60 text-primary",
        className
      )}
    >
      {iconSrc ? (
        <img className="size-full object-cover" src={iconSrc} alt="" loading="lazy" />
      ) : (
        <GemIcon />
      )}
    </span>
  );
}

export function CategoryBadge({
  item,
  tag,
  locale
}: {
  item: Pick<MarketItem, "iconUrl" | "tagIconUrl" | "name">;
  tag: string | undefined;
  locale: Locale;
}) {
  const iconSrc = getCategoryIconSrc(item);

  return (
    <Badge variant="outline" className="bg-background/35">
      {iconSrc ? (
        <span aria-hidden="true" className="grid size-4 shrink-0 place-items-center overflow-hidden rounded-sm">
          <img className="size-full object-cover" src={iconSrc} alt="" loading="lazy" />
        </span>
      ) : (
        <GemIcon />
      )}
      {formatTag(tag, locale)}
    </Badge>
  );
}

export function CategoryIcon({
  item,
  className
}: {
  item: Pick<MarketItem, "iconUrl" | "tagIconUrl" | "name">;
  className?: string;
}) {
  const iconSrc = getCategoryIconSrc(item);

  if (!iconSrc) {
    return <GemIcon />;
  }

  return (
    <span
      aria-hidden="true"
      className={cn("grid size-4 shrink-0 place-items-center overflow-hidden rounded-sm", className)}
    >
      <img className="size-full object-cover" src={iconSrc} alt="" loading="lazy" />
    </span>
  );
}
