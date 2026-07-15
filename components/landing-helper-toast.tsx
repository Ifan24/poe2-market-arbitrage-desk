"use client";

import { CircleHelpIcon, ExternalLinkIcon, RouteIcon, XIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import {
  loadLandingHelperDismissed,
  saveLandingHelperDismissed
} from "@/lib/dashboard-preferences";
import type { UiText } from "@/lib/market-locale";

const LANDING_HELPER_TOAST_ID = "dashboard-landing-helper-v1";
const SOURCE_URL = "https://github.com/Ifan24/poe2-market-arbitrage-desk";

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

export function LandingHelperToast({ t }: { t: UiText }) {
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

  const steps = [t.landingGuideScan, t.landingGuideFilter, t.landingGuidePlan, t.landingGuideVerify];

  return (
    <Dialog open={guideOpen} onOpenChange={setGuideOpen}>
      <DialogContent closeLabel={t.close} className="market-panel max-h-[min(92vh,760px)] overflow-y-auto bg-card text-card-foreground sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RouteIcon className="text-primary" aria-hidden="true" />
            {t.landingGuideTitle}
          </DialogTitle>
          <DialogDescription>{t.landingHelperDescription}</DialogDescription>
        </DialogHeader>

        <ol className="grid gap-3">
          {steps.map((step, index) => (
            <li key={step} className="grid grid-cols-[2rem_minmax(0,1fr)] items-start gap-3 rounded-md border bg-muted/45 p-3">
              <span
                className="grid size-8 place-items-center rounded-md border bg-background/55 text-sm font-semibold text-primary"
                aria-hidden="true"
              >
                {index + 1}
              </span>
              <p className="pt-1 text-sm leading-6">{step}</p>
            </li>
          ))}
        </ol>

        <div className="rounded-md border border-primary/25 bg-primary/10 p-3 text-sm leading-6">
          {t.landingGuideFreshness}
        </div>
        <p className="text-xs leading-5 text-muted-foreground">{t.landingGuideDisclaimer}</p>
        <div>
          <Button asChild variant="outline">
            <a href={SOURCE_URL} target="_blank" rel="noreferrer">
              <ExternalLinkIcon data-icon="inline-start" />
              {t.landingGuideSource}
            </a>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
