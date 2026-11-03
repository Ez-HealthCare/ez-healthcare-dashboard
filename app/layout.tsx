import localFont from "next/font/local";
import type { Metadata } from "next";
import { AntdRegistry } from "@ant-design/nextjs-registry";
import { AppProviders } from "./providers";
import "./globals.css";

const beVietnamPro = localFont({
  src: [
    { path: "./fonts/BeVietnamPro-Regular.ttf", weight: "400", style: "normal" },
    { path: "./fonts/BeVietnamPro-Medium.ttf", weight: "500", style: "normal" },
    { path: "./fonts/BeVietnamPro-SemiBold.ttf", weight: "600", style: "normal" },
    { path: "./fonts/BeVietnamPro-Bold.ttf", weight: "700", style: "normal" },
    { path: "./fonts/BeVietnamPro-ExtraBold.ttf", weight: "800", style: "normal" },
    { path: "./fonts/BeVietnamPro-Black.ttf", weight: "900", style: "normal" },
  ],
  variable: "--font-be-vietnam-pro",
  preload: false,
  display: "swap",
});

export const metadata: Metadata = {
  title: "Ez-HealthCare",
  description: "Cổng quản lý hành trình khám bệnh Ez-HealthCare",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="vi" className={`${beVietnamPro.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <AntdRegistry>
          <AppProviders>{children}</AppProviders>
        </AntdRegistry>
      </body>
    </html>
  );
}
