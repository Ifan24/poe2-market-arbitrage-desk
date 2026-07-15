import type { Locale } from "@/lib/locale";
import { REPOSITORY_URL, SITE_NAME } from "@/lib/site-metadata";

const FOOTER_COPY: Record<
  Locale,
  {
    data: string;
    disclaimer: string;
    license: string;
    local: string;
    repo: string;
  }
> = {
  en: {
    data: "Market data updates automatically.",
    disclaimer: "Unofficial fan project. Not affiliated with Grinding Gear Games or Path of Exile.",
    license: "MIT licensed.",
    local: "Favorites and preferences stay in your browser.",
    repo: "GitHub"
  },
  "zh-TW": {
    data: "市場資料會自動更新。",
    disclaimer: "非官方玩家專案，與 Grinding Gear Games 或 Path of Exile 無關。",
    license: "MIT 授權。",
    local: "收藏與偏好設定只保存在你的瀏覽器。",
    repo: "GitHub"
  },
  ja: {
    data: "マーケットデータは自動更新されます。",
    disclaimer: "非公式ファンプロジェクトです。Grinding Gear Games または Path of Exile とは関係ありません。",
    license: "MIT ライセンス。",
    local: "お気に入りと設定はブラウザ内に保存されます。",
    repo: "GitHub"
  },
  ko: {
    data: "시장 데이터는 자동으로 업데이트됩니다.",
    disclaimer: "비공식 팬 프로젝트입니다. Grinding Gear Games 또는 Path of Exile과 관련이 없습니다.",
    license: "MIT 라이선스.",
    local: "즐겨찾기와 설정은 브라우저에만 저장됩니다.",
    repo: "GitHub"
  },
  ru: {
    data: "Рыночные данные обновляются автоматически.",
    disclaimer: "Неофициальный фан-проект. Не связан с Grinding Gear Games или Path of Exile.",
    license: "Лицензия MIT.",
    local: "Избранное и настройки сохраняются в вашем браузере.",
    repo: "GitHub"
  },
  "zh-CN": {
    data: "市场数据会自动更新。",
    disclaimer: "非官方玩家项目，与 Grinding Gear Games 或 Path of Exile 无关。",
    license: "MIT 授权。",
    local: "收藏与偏好设置只保存在你的浏览器。",
    repo: "GitHub"
  },
  pt: {
    data: "Dados do mercado atualizam automaticamente.",
    disclaimer: "Projeto de fã não oficial. Não afiliado à Grinding Gear Games ou Path of Exile.",
    license: "Licenciado sob MIT.",
    local: "Favoritos e preferências permanecem no seu navegador.",
    repo: "GitHub"
  },
  th: {
    data: "ข้อมูลตลาดอัปเดตโดยอัตโนมัติ",
    disclaimer: "โปรเจกต์แฟนคลับที่ไม่เป็นทางการ ไม่เกี่ยวข้องกับ Grinding Gear Games หรือ Path of Exile",
    license: "สัญญาอนุญาต MIT",
    local: "รายการโปรดและการตั้งค่าจะถูกบันทึกไว้ในเบราว์เซอร์ของคุณเท่านั้น",
    repo: "GitHub"
  },
  fr: {
    data: "Les données du marché se mettent à jour automatiquement.",
    disclaimer: "Projet de fan non officiel. Non affilié à Grinding Gear Games ou Path of Exile.",
    license: "Sous licence MIT.",
    local: "Les favoris et préférences restent dans votre navigateur.",
    repo: "GitHub"
  },
  de: {
    data: "Marktdaten werden automatisch aktualisiert.",
    disclaimer: "Inoffizielles Fan-Projekt. Nicht verbunden mit Grinding Gear Games oder Path of Exile.",
    license: "MIT-lizensiert.",
    local: "Favoriten und Einstellungen verbleiben in Ihrem Browser.",
    repo: "GitHub"
  },
  es: {
    data: "Los datos de mercado se actualizan automáticamente.",
    disclaimer: "Proyecto no oficial de fans. No afiliado a Grinding Gear Games ni a Path of Exile.",
    license: "Licencia MIT.",
    local: "Los favoritos y preferencias se guardan en tu navegador.",
    repo: "GitHub"
  }
};

export function SiteFooter({ locale }: { locale: Locale }) {
  const copy = FOOTER_COPY[locale];

  return (
    <footer className="market-shell border-t bg-background/85">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-6 text-sm text-muted-foreground sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
        <div className="space-y-1">
          <p className="font-medium text-foreground">{SITE_NAME}</p>
          <p>{copy.disclaimer}</p>
        </div>
        <div className="flex flex-wrap gap-x-5 gap-y-2 lg:justify-end">
          <a className="text-foreground underline-offset-4 hover:underline" href={REPOSITORY_URL}>
            {copy.repo}
          </a>
          <span>{copy.data}</span>
          <span>{copy.local}</span>
          <span>{copy.license}</span>
        </div>
      </div>
    </footer>
  );
}
