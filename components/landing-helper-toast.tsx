"use client";

import { CircleHelpIcon, RouteIcon, XIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { MarketGuideDialog } from "@/components/market-guide-dialog";
import {
  loadLandingHelperDismissed,
  saveLandingHelperDismissed
} from "@/lib/dashboard-preferences";
import type { Locale } from "@/lib/locale";
import type { UiText } from "@/lib/market-locale";

const LANDING_HELPER_TOAST_ID = "dashboard-landing-helper-v1";

function LandingHelperNotice({
  t,
  onDismiss,
  onOpenGuide
}: {
  t: UiText;
  onDismiss: () => void;
  onOpenGuide: () => void;
}) {
  return (
    <div
      className="market-panel pointer-events-auto w-[min(24rem,calc(100vw-2rem))] rounded-lg border bg-popover p-4 text-popover-foreground shadow-2xl"
      aria-labelledby="landing-helper-title"
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-md border bg-primary/10 text-primary">
          <RouteIcon className="size-4" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 id="landing-helper-title" className="text-sm font-semibold leading-5">
                {t.landingHelperTitle}
              </h2>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">{t.landingHelperDescription}</p>
            </div>
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              className="-mr-2 -mt-2 shrink-0 text-muted-foreground hover:text-foreground"
              aria-label={t.landingHelperDismiss}
              onClick={onDismiss}
            >
              <XIcon aria-hidden="true" />
            </Button>
          </div>
          <Button type="button" size="sm" variant="outline" className="mt-3" onClick={onOpenGuide}>
            <CircleHelpIcon data-icon="inline-start" />
            {t.landingHelperAction}
          </Button>
        </div>
      </div>
    </div>
  );
}

export function LandingHelperToast({ t, locale }: { t: UiText; locale: Locale }) {
  const [guideOpen, setGuideOpen] = useState(false);

  useEffect(() => {
    if (loadLandingHelperDismissed()) {
      toast.dismiss(LANDING_HELPER_TOAST_ID);
      return;
    }

    const markSeenAndDismiss = () => {
      saveLandingHelperDismissed();
      toast.dismiss(LANDING_HELPER_TOAST_ID);
    };
    const openGuide = () => {
      markSeenAndDismiss();
      setGuideOpen(true);
    };

    const showTimer = setTimeout(() => {
      toast.custom(
        () => <LandingHelperNotice t={t} onDismiss={markSeenAndDismiss} onOpenGuide={openGuide} />,
        {
          id: LANDING_HELPER_TOAST_ID,
          position: "bottom-right",
          duration: Infinity,
          dismissible: false
        }
      );
    }, 0);

    return () => {
      clearTimeout(showTimer);
      toast.dismiss(LANDING_HELPER_TOAST_ID);
    };
  }, [t]);

  return <MarketGuideDialog t={t} locale={locale} open={guideOpen} onOpenChange={setGuideOpen} />;
}
