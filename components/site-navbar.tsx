"use client";

import {
  AccessibilityIcon,
  BarChart3Icon,
  ChevronDownIcon,
  CircleHelpIcon,
  ExternalLinkIcon,
  LanguagesIcon,
  LayoutDashboardIcon,
  MenuIcon,
  MessageSquarePlusIcon,
  RouteIcon,
  RotateCcwIcon,
  Settings2Icon,
  TrendingUpIcon
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { getLocaleFromRoute, getLocaleRoute, replaceLocaleInPath, type Locale } from "@/lib/locale";
import { LOCALE_OPTIONS, LOCALE_TRIGGER_LABELS, UI_TEXT } from "@/lib/market-locale";
import {
  applySitePreferences,
  DEFAULT_SITE_PREFERENCES,
  loadSitePreferences,
  saveSitePreferences,
  type SitePreferences
} from "@/lib/site-preferences";

const SOURCE_URL = "https://github.com/Ifan24/poe2-market-arbitrage-desk";
const FEATURE_REQUEST_URL = `${SOURCE_URL}/issues/new?template=feature_request.yml`;

type SettingsCopy = {
  settings: string;
  settingsDescription: string;
  browse: string;
  appearance: string;
  reduceMotion: string;
  reduceMotionHint: string;
  introduction: string;
  introductionHint: string;
  openGuide: string;
  feedback: string;
  requestFeature: string;
  requestFeatureHint: string;
  reset: string;
};

const SETTINGS_COPY: Record<Locale, SettingsCopy> = {
  en: { settings: "Settings", settingsDescription: "Adjust this browser's viewing preferences.", browse: "Browse", appearance: "Appearance", reduceMotion: "Reduce motion", reduceMotionHint: "Minimize interface animations and transitions.", introduction: "Introduction", introductionHint: "Review the four-step guide whenever you need it.", openGuide: "View introduction", feedback: "Feedback", requestFeature: "Request a feature", requestFeatureHint: "Share an idea using the guided GitHub issue form.", reset: "Reset local settings" },
  "zh-TW": { settings: "設定", settingsDescription: "調整這個瀏覽器的顯示偏好。", browse: "瀏覽", appearance: "顯示", reduceMotion: "減少動態效果", reduceMotionHint: "減少介面動畫與轉場。", introduction: "網站介紹", introductionHint: "需要時可再次查看四步驟指南。", openGuide: "重新查看介紹", feedback: "意見回饋", requestFeature: "提出功能建議", requestFeatureHint: "透過 GitHub 的引導表單分享你的想法。", reset: "重設本地設定" },
  ja: { settings: "設定", settingsDescription: "このブラウザの表示設定を調整します。", browse: "ページ", appearance: "表示", reduceMotion: "動きを減らす", reduceMotionHint: "アニメーションと画面遷移を減らします。", introduction: "はじめに", introductionHint: "4ステップのガイドをいつでも見直せます。", openGuide: "ガイドを見る", feedback: "フィードバック", requestFeature: "機能を提案", requestFeatureHint: "GitHubのガイド付きフォームでアイデアを共有します。", reset: "ローカル設定をリセット" },
  ko: { settings: "설정", settingsDescription: "이 브라우저의 보기 환경을 조정합니다.", browse: "둘러보기", appearance: "화면", reduceMotion: "동작 줄이기", reduceMotionHint: "애니메이션과 전환 효과를 줄입니다.", introduction: "소개", introductionHint: "4단계 안내를 언제든 다시 확인하세요.", openGuide: "소개 보기", feedback: "피드백", requestFeature: "기능 제안", requestFeatureHint: "GitHub 안내 양식으로 아이디어를 공유하세요.", reset: "로컬 설정 초기화" },
  ru: { settings: "Настройки", settingsDescription: "Настройте отображение в этом браузере.", browse: "Разделы", appearance: "Отображение", reduceMotion: "Меньше анимации", reduceMotionHint: "Сократить анимации и переходы интерфейса.", introduction: "Введение", introductionHint: "Повторно откройте руководство из четырёх шагов.", openGuide: "Открыть введение", feedback: "Обратная связь", requestFeature: "Предложить функцию", requestFeatureHint: "Поделитесь идеей через форму GitHub.", reset: "Сбросить локальные настройки" },
  "zh-CN": { settings: "设置", settingsDescription: "调整此浏览器的显示偏好。", browse: "浏览", appearance: "显示", reduceMotion: "减少动态效果", reduceMotionHint: "减少界面动画和过渡效果。", introduction: "网站介绍", introductionHint: "需要时可再次查看四步指南。", openGuide: "重新查看介绍", feedback: "意见反馈", requestFeature: "提出功能建议", requestFeatureHint: "通过 GitHub 引导表单分享你的想法。", reset: "重置本地设置" },
  pt: { settings: "Definições", settingsDescription: "Ajuste a visualização neste navegador.", browse: "Explorar", appearance: "Aparência", reduceMotion: "Reduzir movimento", reduceMotionHint: "Reduz animações e transições da interface.", introduction: "Introdução", introductionHint: "Reveja o guia de quatro passos quando quiser.", openGuide: "Ver introdução", feedback: "Feedback", requestFeature: "Sugerir funcionalidade", requestFeatureHint: "Partilhe uma ideia através do formulário do GitHub.", reset: "Repor definições locais" },
  th: { settings: "การตั้งค่า", settingsDescription: "ปรับการแสดงผลสำหรับเบราว์เซอร์นี้", browse: "สำรวจ", appearance: "การแสดงผล", reduceMotion: "ลดการเคลื่อนไหว", reduceMotionHint: "ลดแอนิเมชันและการเปลี่ยนหน้าจอ", introduction: "คำแนะนำ", introductionHint: "กลับมาดูคู่มือสี่ขั้นตอนได้ทุกเมื่อ", openGuide: "ดูคำแนะนำ", feedback: "ข้อเสนอแนะ", requestFeature: "เสนอฟีเจอร์", requestFeatureHint: "แบ่งปันไอเดียผ่านแบบฟอร์ม GitHub", reset: "รีเซ็ตการตั้งค่าในเครื่อง" },
  fr: { settings: "Réglages", settingsDescription: "Réglez l'affichage pour ce navigateur.", browse: "Explorer", appearance: "Affichage", reduceMotion: "Réduire les animations", reduceMotionHint: "Limite les animations et les transitions.", introduction: "Introduction", introductionHint: "Consultez à nouveau le guide en quatre étapes.", openGuide: "Voir l'introduction", feedback: "Commentaires", requestFeature: "Proposer une fonctionnalité", requestFeatureHint: "Partagez une idée avec le formulaire guidé GitHub.", reset: "Réinitialiser les réglages locaux" },
  de: { settings: "Einstellungen", settingsDescription: "Darstellung für diesen Browser anpassen.", browse: "Bereiche", appearance: "Darstellung", reduceMotion: "Bewegung reduzieren", reduceMotionHint: "Animationen und Übergänge reduzieren.", introduction: "Einführung", introductionHint: "Die Anleitung mit vier Schritten erneut ansehen.", openGuide: "Einführung ansehen", feedback: "Feedback", requestFeature: "Funktion vorschlagen", requestFeatureHint: "Teile deine Idee über das GitHub-Formular.", reset: "Lokale Einstellungen zurücksetzen" },
  es: { settings: "Ajustes", settingsDescription: "Ajusta la vista para este navegador.", browse: "Explorar", appearance: "Apariencia", reduceMotion: "Reducir movimiento", reduceMotionHint: "Reduce las animaciones y transiciones.", introduction: "Introducción", introductionHint: "Vuelve a consultar la guía de cuatro pasos.", openGuide: "Ver introducción", feedback: "Comentarios", requestFeature: "Proponer una función", requestFeatureHint: "Comparte una idea mediante el formulario de GitHub.", reset: "Restablecer ajustes locales" }
};

function getPathLocale(pathname: string, fallback: Locale) {
  return getLocaleFromRoute(pathname.split("/")[1]) || fallback;
}

function PreferenceRow({ icon: Icon, label, hint, checked, onCheckedChange }: { icon: typeof LayoutDashboardIcon; label: string; hint: string; checked: boolean; onCheckedChange: (checked: boolean) => void }) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-md border bg-muted/35 p-3">
      <div className="flex min-w-0 gap-3">
        <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-md border bg-background/55 text-primary"><Icon className="size-4" aria-hidden="true" /></span>
        <div><div className="text-sm font-medium">{label}</div><p className="mt-1 text-xs leading-5 text-muted-foreground">{hint}</p></div>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} aria-label={label} />
    </div>
  );
}

export function SiteNavbar({ initialLocale }: { initialLocale: Locale }) {
  const pathname = usePathname();
  const router = useRouter();
  const locale = getPathLocale(pathname, initialLocale);
  const localeRoute = getLocaleRoute(locale);
  const t = UI_TEXT[locale];
  const copy = SETTINGS_COPY[locale];
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [preferences, setPreferences] = useState<SitePreferences>(DEFAULT_SITE_PREFERENCES);

  const navItems = useMemo(() => [
    { href: `/${localeRoute}`, label: t.scanner, icon: LayoutDashboardIcon, active: pathname === `/${localeRoute}` },
    { href: `/${localeRoute}/trends`, label: t.trends, icon: BarChart3Icon, active: pathname.startsWith(`/${localeRoute}/trends`) || pathname.startsWith(`/${localeRoute}/routes/`) },
    { href: `/${localeRoute}/store-value`, label: t.storeValue, icon: TrendingUpIcon, active: pathname.startsWith(`/${localeRoute}/store-value`) }
  ], [localeRoute, pathname, t.scanner, t.storeValue, t.trends]);

  useEffect(() => {
    const saved = loadSitePreferences();
    setPreferences(saved);
    applySitePreferences(saved);
  }, []);

  function updatePreferences(next: SitePreferences) {
    setPreferences(next);
    saveSitePreferences(next);
    applySitePreferences(next);
  }

  function switchLocale(nextLocale: Locale) {
    router.push(replaceLocaleInPath(pathname, nextLocale));
  }

  function resetPreferences() {
    updatePreferences(DEFAULT_SITE_PREFERENCES);
  }

  const guideSteps = [t.landingGuideScan, t.landingGuideFilter, t.landingGuidePlan, t.landingGuideVerify];

  return (
    <>
      <nav className="sticky top-0 z-40 border-b border-primary/15 bg-background/92 shadow-[0_8px_30px_oklch(0.08_0.02_65/35%)] backdrop-blur-xl" aria-label={copy.browse}>
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center gap-3 px-4 sm:px-6 lg:px-8">
          <Link href={`/${localeRoute}`} className="group mr-auto flex min-w-0 items-center gap-3">
            <span className="relative grid size-9 shrink-0 place-items-center overflow-hidden rounded-md border border-primary/35 bg-primary/10 text-primary shadow-[inset_0_1px_0_oklch(1_0_0/12%)]">
              <RouteIcon className="size-4 transition-transform group-hover:rotate-12" aria-hidden="true" />
              <span className="absolute inset-x-1 bottom-1 h-px bg-primary/50" aria-hidden="true" />
            </span>
            <span className="hidden min-w-0 leading-none sm:block">
              <span className="block truncate text-sm font-semibold tracking-[0.08em] text-foreground">POE2 MARKET</span>
              <span className="mt-1 block text-[0.62rem] font-medium uppercase tracking-[0.2em] text-primary/80">Arbitrage desk</span>
            </span>
          </Link>

          <div className="hidden items-center gap-1 rounded-lg border bg-card/55 p-1 md:flex">
            {navItems.map((item) => (
              <Button key={item.href} asChild size="sm" variant="ghost" className={cn("text-muted-foreground", item.active && "bg-primary/12 text-primary hover:bg-primary/16 hover:text-primary")}>
                <Link href={item.href} aria-current={item.active ? "page" : undefined}><item.icon />{item.label}</Link>
              </Button>
            ))}
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="md:hidden"><MenuIcon />{copy.browse}<ChevronDownIcon className="opacity-60" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuLabel>{copy.browse}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {navItems.map((item) => (
                <DropdownMenuItem key={item.href} asChild className={cn(item.active && "bg-primary/10 text-primary")}>
                  <Link href={item.href}><item.icon />{item.label}</Link>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <Select value={locale} onValueChange={(value) => switchLocale(value as Locale)}>
            <SelectTrigger
              aria-label={`${t.language}: ${LOCALE_OPTIONS.find((option) => option.value === locale)?.label ?? locale}`}
              className="w-[4.75rem] justify-start sm:w-24"
            >
              <LanguagesIcon />
              <span>{LOCALE_TRIGGER_LABELS[locale]}</span>
            </SelectTrigger>
            <SelectContent position="popper" align="end">
              <SelectGroup>
                <SelectLabel>{t.language}</SelectLabel>
                {LOCALE_OPTIONS.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
              </SelectGroup>
            </SelectContent>
          </Select>

          <Button type="button" variant="outline" size="icon" aria-label={copy.settings} title={copy.settings} onClick={() => setSettingsOpen(true)}>
            <Settings2Icon aria-hidden="true" />
          </Button>
        </div>
      </nav>

      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent closeLabel={t.close} className="market-panel max-h-[min(92vh,760px)] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Settings2Icon className="text-primary" />{copy.settings}</DialogTitle>
            <DialogDescription>{copy.settingsDescription}</DialogDescription>
          </DialogHeader>

          <section className="grid gap-3">
            <div className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">{copy.appearance}</div>
            <PreferenceRow icon={AccessibilityIcon} label={copy.reduceMotion} hint={copy.reduceMotionHint} checked={preferences.reduceMotion} onCheckedChange={(checked) => updatePreferences({ ...preferences, reduceMotion: checked })} />
          </section>

          <section className="grid gap-3 border-t pt-4">
            <div className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">{copy.introduction}</div>
            <div className="flex flex-col gap-3 rounded-md border border-primary/25 bg-primary/8 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div><div className="flex items-center gap-2 text-sm font-medium"><CircleHelpIcon className="size-4 text-primary" />{t.landingGuideTitle}</div><p className="mt-1 text-xs leading-5 text-muted-foreground">{copy.introductionHint}</p></div>
              <Button type="button" variant="outline" className="shrink-0" onClick={() => { setSettingsOpen(false); setGuideOpen(true); }}><CircleHelpIcon />{copy.openGuide}</Button>
            </div>
          </section>

          <section className="grid gap-3 border-t pt-4">
            <div className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">{copy.feedback}</div>
            <div className="flex flex-col gap-3 rounded-md border bg-muted/35 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-2 text-sm font-medium"><MessageSquarePlusIcon className="size-4 text-primary" />{copy.requestFeature}</div>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">{copy.requestFeatureHint}</p>
              </div>
              <Button asChild variant="outline" className="shrink-0">
                <a href={FEATURE_REQUEST_URL} target="_blank" rel="noreferrer"><MessageSquarePlusIcon />{copy.requestFeature}<ExternalLinkIcon className="opacity-60" /></a>
              </Button>
            </div>
          </section>

          <div className="border-t pt-4">
            <Button type="button" variant="ghost" className="text-muted-foreground" onClick={resetPreferences}><RotateCcwIcon />{copy.reset}</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={guideOpen} onOpenChange={setGuideOpen}>
        <DialogContent closeLabel={t.close} className="market-panel max-h-[min(92vh,760px)] overflow-y-auto sm:max-w-lg">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><RouteIcon className="text-primary" />{t.landingGuideTitle}</DialogTitle><DialogDescription>{t.landingHelperDescription}</DialogDescription></DialogHeader>
          <ol className="grid gap-3">{guideSteps.map((step, index) => <li key={step} className="grid grid-cols-[2rem_minmax(0,1fr)] items-start gap-3 rounded-md border bg-muted/45 p-3"><span className="grid size-8 place-items-center rounded-md border bg-background/55 text-sm font-semibold text-primary">{index + 1}</span><p className="pt-1 text-sm leading-6">{step}</p></li>)}</ol>
          <div className="rounded-md border border-primary/25 bg-primary/10 p-3 text-sm leading-6">{t.landingGuideFreshness}</div>
          <p className="text-xs leading-5 text-muted-foreground">{t.landingGuideDisclaimer}</p>
          <div><Button asChild variant="outline"><a href={SOURCE_URL} target="_blank" rel="noreferrer"><ExternalLinkIcon />{t.landingGuideSource}</a></Button></div>
        </DialogContent>
      </Dialog>
    </>
  );
}
