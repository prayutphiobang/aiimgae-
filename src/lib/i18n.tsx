"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

export type Lang = "th" | "en";

/**
 * Translation dictionary. Keys are stable ids; values are per-language strings.
 * Add new keys here and use them via the `t()` function from useI18n().
 * Missing keys fall back to Thai, then to the key itself.
 */
const DICT: Record<string, { th: string; en: string }> = {
  // nav
  "nav.studio": { th: "สร้างภาพ", en: "Create" },
  "nav.explore": { th: "สำรวจ", en: "Explore" },
  "nav.models": { th: "โมเดล", en: "Models" },
  "nav.gallery": { th: "แกลเลอรี", en: "Gallery" },
  "nav.wallet": { th: "กระเป๋าเงิน", en: "Wallet" },
  "nav.account": { th: "บัญชีของฉัน", en: "My account" },
  "nav.settings": { th: "การตั้งค่า", en: "Settings" },
  "nav.topup": { th: "เติมเงิน / ประวัติ", en: "Top up / History" },
  "nav.admin": { th: "ระบบหลังบ้าน", en: "Admin" },
  "nav.logout": { th: "ออกจากระบบ", en: "Log out" },
  "nav.login": { th: "เข้าสู่ระบบ", en: "Log in" },
  "nav.register": { th: "เริ่มใช้งานฟรี", en: "Start free" },
  "nav.topup_credit": { th: "เติม credit", en: "Top up credit" },

  // common
  "common.loading": { th: "กำลังโหลด...", en: "Loading..." },
  "common.save": { th: "บันทึก", en: "Save" },
  "common.cancel": { th: "ยกเลิก", en: "Cancel" },
  "common.delete": { th: "ลบ", en: "Delete" },
  "common.confirm": { th: "ยืนยัน", en: "Confirm" },
  "common.close": { th: "ปิด", en: "Close" },
  "common.search": { th: "ค้นหา", en: "Search" },
  "common.all": { th: "ทั้งหมด", en: "All" },
  "common.image": { th: "รูปภาพ", en: "Image" },
  "common.video": { th: "วิดีโอ", en: "Video" },
  "common.download": { th: "ดาวน์โหลด", en: "Download" },
  "common.credit": { th: "credit", en: "credit" },

  // studio
  "studio.positive": { th: "positive prompt", en: "positive prompt" },
  "studio.negative": { th: "negative prompt", en: "negative prompt" },
  "studio.gen": { th: "สร้างภาพ", en: "Generate" },
  "studio.settings": { th: "ตั้งค่า", en: "Settings" },
  "studio.seed": { th: "seed", en: "seed" },
  "studio.gallery": { th: "แกลเลอรี", en: "Gallery" },
  "studio.search_model": { th: "ค้นหาโมเดล", en: "Search models" },
  "studio.not_enough": { th: "credit ไม่พอ", en: "Not enough credit" },
  "studio.refund_note": { th: "สร้างไม่สำเร็จคืน credit อัตโนมัติ", en: "Failed generations are auto-refunded" },

  // gallery / viewer
  "gallery.mine": { th: "แกลเลอรีของฉัน", en: "My gallery" },
  "gallery.new": { th: "สร้างภาพใหม่", en: "New image" },
  "gallery.select": { th: "เลือก", en: "Select" },
  "gallery.make_private": { th: "เป็นส่วนตัว", en: "Make private" },
  "gallery.make_public": { th: "เปิดสาธารณะ", en: "Make public" },
  "gallery.related": { th: "ผลงานอื่นจากโมเดล", en: "More from model" },
  "gallery.copy_keywords": { th: "คัดลอก keywords", en: "Copy keywords" },

  // explore
  "explore.title": { th: "สำรวจผลงาน", en: "Explore" },
  "explore.filters": { th: "ตัวกรอง", en: "Filters" },
  "explore.load_more": { th: "โหลดเพิ่ม", en: "Load more" },

  // wallet
  "wallet.title": { th: "กระเป๋าเงิน", en: "Wallet" },
  "wallet.balance": { th: "Credit คงเหลือ", en: "Credit balance" },
  "wallet.packages": { th: "แพ็กเกจ", en: "Packages" },
  "wallet.buy": { th: "ซื้อเลย", en: "Buy now" },
  "wallet.history": { th: "ประวัติ", en: "History" },
};

interface Ctx {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string, fallback?: string) => string;
}

const I18nContext = createContext<Ctx>({
  lang: "th",
  setLang: () => {},
  t: (k) => k,
});

export const useI18n = () => useContext(I18nContext);

function readInitialLang(): Lang {
  if (typeof document === "undefined") return "th";
  const m = document.cookie.match(/(?:^|;\s*)lang=(th|en)/);
  if (m) return m[1] as Lang;
  try {
    const v = localStorage.getItem("lang");
    if (v === "th" || v === "en") return v;
  } catch {}
  return "th";
}

export default function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>("th");

  useEffect(() => {
    const l = readInitialLang();
    setLangState(l);
    document.documentElement.lang = l;
  }, []);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    document.documentElement.lang = l;
    try {
      localStorage.setItem("lang", l);
    } catch {}
    document.cookie = `lang=${l}; path=/; max-age=31536000; samesite=lax`;
  }, []);

  const t = useCallback(
    (key: string, fallback?: string) => {
      const entry = DICT[key];
      if (!entry) return fallback ?? key;
      return entry[lang] || entry.th || fallback || key;
    },
    [lang]
  );

  return <I18nContext.Provider value={{ lang, setLang, t }}>{children}</I18nContext.Provider>;
}
