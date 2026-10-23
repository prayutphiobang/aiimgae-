import type { Metadata, Viewport } from "next";
import "./globals.css";
import AuthProvider from "@/components/AuthProvider";
import I18nProvider from "@/lib/i18n";
import AutoTranslate from "@/components/AutoTranslate";
import { ToastProvider } from "@/components/ui";

export const metadata: Metadata = {
  title: {
    default: "AI Image Studio",
    template: "%s · AI Image Studio",
  },
  description: "สร้างภาพด้วย AI ในไม่กี่วินาที",
};

export const viewport: Viewport = {
  themeColor: "#0a0b10",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th">
      <body>
        <I18nProvider>
          <AutoTranslate />
          <AuthProvider>
            <ToastProvider>{children}</ToastProvider>
          </AuthProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
